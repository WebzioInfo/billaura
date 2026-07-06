import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const { skip, take } = getPagination(query);

    const where: Prisma.PurchaseOrderWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { orderNo: { contains: query.search } },
        { businessPartner: { name: { contains: query.search } } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.vendorId) {
      where.businessPartnerId = query.vendorId;
    }

    if (query.startDate || query.endDate) {
      where.date = {
        ...(query.startDate && { gte: new Date(query.startDate) }),
        ...(query.endDate && { lte: new Date(query.endDate) }),
      };
    }

    if (query.amountMin || query.amountMax) {
      where.grandTotal = {
        ...(query.amountMin && { gte: Number(query.amountMin) }),
        ...(query.amountMax && { lte: Number(query.amountMax) }),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true, items: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    // Memory filter for warehouseId if specified
    let filteredData = data;
    if (query.warehouseId) {
      filteredData = data.filter(po => {
        const metadata = po.gstBreakup as any;
        return metadata?.warehouseId === query.warehouseId;
      });
    }

    return toPaginatedResult(filteredData, total, query);
  }

  async getNextNumber() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    let sequence = await this.prisma.documentSequence.findFirst({
      where: { companyId, documentType: 'PURCHASE_ORDER' },
    });

    if (!sequence) {
      return { nextNumber: 'PO-00001' };
    }

    const nextNum = sequence.currentNumber + 1;
    return { nextNumber: `PO-${String(nextNum).padStart(5, '0')}` };
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: { businessPartner: true, items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Purchase Order not found');
    return order;
  }

  async create(dto: CreatePurchaseOrderDto, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    let orderNo = dto.orderNo;
    if (orderNo) {
      const existing = await this.prisma.purchaseOrder.findFirst({
        where: { companyId, orderNo },
      });
      if (existing) throw new ConflictException('Purchase Order number already in use');

      // Sync sequence if matches expected auto format
      let sequence = await this.prisma.documentSequence.findFirst({
        where: { companyId, documentType: 'PURCHASE_ORDER' },
      });
      if (!sequence) {
        sequence = await this.prisma.documentSequence.create({
          data: { companyId, documentType: 'PURCHASE_ORDER', currentNumber: 0 },
        });
      }
      const nextNum = sequence.currentNumber + 1;
      const expectedAuto = `PO-${String(nextNum).padStart(5, '0')}`;
      if (orderNo === expectedAuto) {
        await this.prisma.documentSequence.update({
          where: { id: sequence.id },
          data: { currentNumber: nextNum },
        });
      }
    } else {
      // Auto-generate order number
      let sequence = await this.prisma.documentSequence.findFirst({
        where: { companyId, documentType: 'PURCHASE_ORDER' },
      });
      if (!sequence) {
        sequence = await this.prisma.documentSequence.create({
          data: { companyId, documentType: 'PURCHASE_ORDER', currentNumber: 0 },
        });
      }
      const nextNum = sequence.currentNumber + 1;
      await this.prisma.documentSequence.update({
        where: { id: sequence.id },
        data: { currentNumber: nextNum },
      });
      orderNo = `PO-${String(nextNum).padStart(5, '0')}`;
    }

    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;

    const subTotal = dto.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const taxTotal = dto.items.reduce((sum, item) => sum + ((item.qty * item.rate * item.taxPercent) / 100), 0);
    const grandTotal = subTotal + taxTotal;

    const metadata = {
      expectedDeliveryDate: dto.expectedDeliveryDate,
      warehouseId: dto.warehouseId,
      buyer: dto.buyer,
      notes: dto.notes,
      referenceNo: dto.referenceNo,
      createdByName: user?.name || user?.email || 'System Admin',
      receivedQty: {}
    };

    const po = await this.prisma.purchaseOrder.create({
      data: {
        companyId,
        businessPartnerId: dto.businessPartnerId,
        orderNo,
        date: new Date(dto.date),
        taxMode: dto.taxMode || 'CGST_SGST',
        placeOfSupply: dto.placeOfSupply,
        billingAddress: dto.billingAddress,
        shippingAddress: dto.shippingAddress,
        subTotal,
        taxTotal,
        totalTaxAmount: taxTotal,
        grandTotal,
        status: dto.status || 'DRAFT',
        gstBreakup: metadata as any,
        items: {
          create: dto.items.map(item => ({
            productId: item.productId,
            description: item.description,
            qty: item.qty,
            rate: item.rate,
            taxPercent: item.taxPercent,
            taxAmount: (item.qty * item.rate * item.taxPercent) / 100,
            total: (item.qty * item.rate) + ((item.qty * item.rate * item.taxPercent) / 100),
          })),
        },
      },
      include: { items: true, businessPartner: true },
    });

    if (userId) {
      await this.logAudit(companyId, userId, 'CREATE', 'PurchaseOrder', null, po);
    }

    return po;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    const oldPo = JSON.parse(JSON.stringify(po));

    // Handle full updates of items
    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.billingAddress) updateData.billingAddress = dto.billingAddress;
    if (dto.shippingAddress) updateData.shippingAddress = dto.shippingAddress;

    // Load existing metadata from gstBreakup
    const existingMeta = (po.gstBreakup as any) || {};
    const newMeta = {
      ...existingMeta,
      ...(dto.expectedDeliveryDate && { expectedDeliveryDate: dto.expectedDeliveryDate }),
      ...(dto.warehouseId && { warehouseId: dto.warehouseId }),
      ...(dto.buyer && { buyer: dto.buyer }),
      ...(dto.notes && { notes: dto.notes }),
      ...(dto.referenceNo && { referenceNo: dto.referenceNo }),
    };
    updateData.gstBreakup = newMeta;

    if (dto.items) {
      const subTotal = dto.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
      const taxTotal = dto.items.reduce((sum, item) => sum + ((item.qty * item.rate * item.taxPercent) / 100), 0);
      const grandTotal = subTotal + taxTotal;

      updateData.subTotal = subTotal;
      updateData.taxTotal = taxTotal;
      updateData.totalTaxAmount = taxTotal;
      updateData.grandTotal = grandTotal;

      // Wipe existing items and recreate
      await this.prisma.purchaseOrderItem.deleteMany({
        where: { orderId: id },
      });

      updateData.items = {
        create: dto.items.map(item => ({
          productId: item.productId,
          description: item.description,
          qty: item.qty,
          rate: item.rate,
          taxPercent: item.taxPercent,
          taxAmount: (item.qty * item.rate * item.taxPercent) / 100,
          total: (item.qty * item.rate) + ((item.qty * item.rate * item.taxPercent) / 100),
        })),
      };
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { items: true, businessPartner: true },
    });

    if (userId) {
      await this.logAudit(companyId, userId, 'UPDATE', 'PurchaseOrder', oldPo, updated);
    }

    return updated;
  }

  async remove(id: string, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const po = await this.findOne(id);
    const deleted = await this.prisma.purchaseOrder.delete({
      where: { id },
    });

    if (userId) {
      await this.logAudit(companyId, userId, 'DELETE', 'PurchaseOrder', po, null);
    }

    return deleted;
  }

  async getAuditTrail(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const logs = await this.prisma.auditLog.findMany({
      where: { companyId, tableName: 'PurchaseOrder' },
      orderBy: { createdAt: 'desc' },
    });

    return logs.filter(log => {
      const oldVal = JSON.stringify(log.oldValues || {});
      const newVal = JSON.stringify(log.newValues || {});
      return oldVal.includes(id) || newVal.includes(id);
    });
  }

  async logAudit(companyId: string, userId: string, action: string, tableName: string, oldValues?: any, newValues?: any) {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          userId,
          action,
          tableName,
          oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
          newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        }
      });
    } catch (e) {
      console.error('AuditLog creation failed:', e);
    }
  }
}
