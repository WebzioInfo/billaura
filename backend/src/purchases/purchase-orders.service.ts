import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';
import { SequenceService } from '../shared/sequence/sequence.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService
  ) {}

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
        skip: Number(skip),
        take: Number(take),
        include: { businessPartner: true, items: { include: { product: true } } },
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

    const config = await this.sequenceService.getConfig(companyId, 'PURCHASE_ORDER');
    if (config) {
      const nextNum = config.currentNumber + 1;
      return { nextNumber: `${config.prefix || 'PO-'}${String(nextNum).padStart(config.padding || 5, '0')}` };
    }
    return { nextNumber: 'PO-00001' };
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: { businessPartner: true, items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Purchase Order not found');

    const metadata = (order.gstBreakup as any) || {};
    const itemsMeta = metadata.itemsMeta || [];

    // Augment items with unit and discount if preserved in metadata
    const augmentedItems = order.items.map((item, idx) => {
      const metaItem = itemsMeta[idx] || itemsMeta.find((m: any) => m.productId === item.productId && m.description === item.description);
      return {
        ...item,
        unit: item.product?.unit || metaItem?.unit || 'Pcs',
        discount: metaItem?.discount || 0,
      };
    });

    return {
      ...order,
      items: augmentedItems,
    };
  }

  async create(dto: CreatePurchaseOrderDto, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required in the Purchase Order');
    }

    return this.prisma.$transaction(async (tx) => {
      let orderNo = dto.orderNo;
      if (orderNo) {
        const existing = await tx.purchaseOrder.findFirst({
          where: { companyId, orderNo },
        });
        if (existing) throw new ConflictException(`Purchase Order number "${orderNo}" is already in use`);
      } else {
        orderNo = await this.sequenceService.generateNextSequence(companyId, 'PURCHASE_ORDER', tx);
      }

      const user = userId ? await tx.user.findUnique({ where: { id: userId } }) : null;

      // Process line items with discount, tax, and precision calculations
      const processedItems = dto.items.map(item => {
        const qty = Number(item.qty);
        const rate = Number(item.rate);
        const discount = Number(item.discount || 0);
        const taxPercent = Number(item.taxPercent || 0);

        const gross = qty * rate;
        const discAmt = gross * (discount / 100);
        const taxable = gross - discAmt;
        const taxAmount = Number(((taxable * taxPercent) / 100).toFixed(2));
        const total = Number((taxable + taxAmount).toFixed(2));

        return {
          productId: item.productId || null,
          description: item.description,
          qty,
          rate,
          taxPercent,
          taxAmount,
          total,
          discount,
          unit: item.unit || 'Pcs',
          taxable,
          gross,
          discAmt,
        };
      });

      const subTotal = processedItems.reduce((sum, item) => sum + item.gross, 0);
      const totalDiscount = processedItems.reduce((sum, item) => sum + item.discAmt, 0);
      const taxableTotal = subTotal - totalDiscount;
      const taxTotal = processedItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const grandTotal = Math.round(taxableTotal + taxTotal);

      const metadata = {
        expectedDeliveryDate: dto.expectedDeliveryDate,
        warehouseId: dto.warehouseId,
        buyer: dto.buyer,
        notes: dto.notes,
        referenceNo: dto.referenceNo,
        createdByName: user?.name || user?.email || 'System Admin',
        receivedQty: {},
        itemsMeta: processedItems.map(p => ({
          productId: p.productId,
          description: p.description,
          discount: p.discount,
          unit: p.unit,
        })),
      };

      const po = await tx.purchaseOrder.create({
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
            create: processedItems.map(item => ({
              productId: item.productId,
              description: item.description,
              qty: item.qty,
              rate: item.rate,
              taxPercent: item.taxPercent,
              taxAmount: item.taxAmount,
              total: item.total,
            })),
          },
        },
        include: { items: { include: { product: true } }, businessPartner: true },
      });

      if (userId) {
        await this.logAudit(companyId, userId, 'CREATE', 'PurchaseOrder', null, po);
      }

      return po;
    });
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
    const existingMeta = (po.gstBreakup as any) || {};
    const receivedMap = existingMeta.receivedQty || {};

    // Validate cancellation
    if (dto.status === 'CANCELLED') {
      const anyReceived = Object.values(receivedMap).some((qty: any) => Number(qty) > 0);
      if (anyReceived) {
        throw new ConflictException('Cannot cancel a Purchase Order that has received goods. Revert goods receipts first or handle via purchase return.');
      }
    }

    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.billingAddress) updateData.billingAddress = dto.billingAddress;
    if (dto.shippingAddress) updateData.shippingAddress = dto.shippingAddress;

    const newMeta = {
      ...existingMeta,
      ...(dto.expectedDeliveryDate && { expectedDeliveryDate: dto.expectedDeliveryDate }),
      ...(dto.warehouseId && { warehouseId: dto.warehouseId }),
      ...(dto.buyer && { buyer: dto.buyer }),
      ...(dto.notes && { notes: dto.notes }),
      ...(dto.referenceNo && { referenceNo: dto.referenceNo }),
    };

    if (dto.items) {
      if (po.status === 'CONVERTED') {
        throw new ConflictException('Cannot modify items of a fully received Purchase Order');
      }

      // Verify that no line with already received goods has ordered qty reduced below received qty
      for (const oldItem of po.items) {
        const received = Number(receivedMap[oldItem.id] || 0);
        if (received > 0) {
          const matchedNew = dto.items.find(i => (i as any).id === oldItem.id || i.productId === oldItem.productId);
          if (!matchedNew) {
            throw new ConflictException(`Cannot remove item "${oldItem.description}" because ${received} units have already been received`);
          }
          if (Number(matchedNew.qty) < received) {
            throw new ConflictException(`Ordered quantity for "${oldItem.description}" cannot be reduced below received quantity (${received})`);
          }
        }
      }

      const processedItems = dto.items.map(item => {
        const qty = Number(item.qty);
        const rate = Number(item.rate);
        const discount = Number(item.discount || 0);
        const taxPercent = Number(item.taxPercent || 0);

        const gross = qty * rate;
        const discAmt = gross * (discount / 100);
        const taxable = gross - discAmt;
        const taxAmount = Number(((taxable * taxPercent) / 100).toFixed(2));
        const total = Number((taxable + taxAmount).toFixed(2));

        return {
          productId: item.productId || null,
          description: item.description,
          qty,
          rate,
          taxPercent,
          taxAmount,
          total,
          discount,
          unit: item.unit || 'Pcs',
          taxable,
          gross,
          discAmt,
        };
      });

      const subTotal = processedItems.reduce((sum, item) => sum + item.gross, 0);
      const totalDiscount = processedItems.reduce((sum, item) => sum + item.discAmt, 0);
      const taxableTotal = subTotal - totalDiscount;
      const taxTotal = processedItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const grandTotal = Math.round(taxableTotal + taxTotal);

      updateData.subTotal = subTotal;
      updateData.taxTotal = taxTotal;
      updateData.totalTaxAmount = taxTotal;
      updateData.grandTotal = grandTotal;

      newMeta.itemsMeta = processedItems.map(p => ({
        productId: p.productId,
        description: p.description,
        discount: p.discount,
        unit: p.unit,
      }));

      // Delete existing and recreate
      await this.prisma.purchaseOrderItem.deleteMany({
        where: { orderId: id },
      });

      updateData.items = {
        create: processedItems.map(item => ({
          productId: item.productId,
          description: item.description,
          qty: item.qty,
          rate: item.rate,
          taxPercent: item.taxPercent,
          taxAmount: item.taxAmount,
          total: item.total,
        })),
      };
    }

    updateData.gstBreakup = newMeta;

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { items: { include: { product: true } }, businessPartner: true },
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
    const metadata = (po.gstBreakup as any) || {};
    const receivedMap = metadata.receivedQty || {};
    const anyReceived = Object.values(receivedMap).some((qty: any) => Number(qty) > 0);

    if (anyReceived) {
      throw new ConflictException('Cannot delete a Purchase Order that has received inventory. Please revert goods receipts first.');
    }

    const linkedReceipts = await this.prisma.goodsReceipt.count({
      where: { companyId, purchaseOrderId: id },
    });
    if (linkedReceipts > 0) {
      throw new ConflictException('Cannot delete a Purchase Order with linked Goods Receipts. Delete the receipts first.');
    }

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
