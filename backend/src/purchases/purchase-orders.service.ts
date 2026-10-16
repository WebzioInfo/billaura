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

    const allPos = await this.prisma.purchaseOrder.findMany({
      where: { companyId, orderNo: { startsWith: 'PO-' } },
      select: { orderNo: true },
    });
    let maxNum = 0;
    for (const p of allPos) {
      const match = p.orderNo.match(/PO-(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }
    return { nextNumber: `PO-${String(maxNum + 1).padStart(5, '0')}` };
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

    // Augment items with unit, account, and discount if preserved in metadata
    const augmentedItems = order.items.map((item, idx) => {
      const metaItem = itemsMeta[idx] || itemsMeta.find((m: any) => m.productId === item.productId && m.description === item.description);
      return {
        ...item,
        unit: item.product?.unit || metaItem?.unit || 'Pcs',
        discount: metaItem?.discount || 0,
        accountId: metaItem?.accountId || '',
      };
    });

    return {
      ...order,
      ...metadata,
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
      let orderNo = dto.orderNo?.trim();
      if (orderNo) {
        const existing = await tx.purchaseOrder.findFirst({
          where: { companyId, orderNo },
        });
        if (existing) {
          const next = await this.getNextNumber();
          if (next.nextNumber && next.nextNumber !== orderNo) {
            const check = await tx.purchaseOrder.findFirst({ where: { companyId, orderNo: next.nextNumber } });
            orderNo = check ? `PO-${Date.now().toString().slice(-5)}` : next.nextNumber;
          } else {
            throw new ConflictException(`Purchase Order number "${orderNo}" is already in use`);
          }
        }
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
          description: item.description?.trim() || 'Line Item',
          qty,
          rate,
          taxPercent,
          taxAmount,
          total,
          discount,
          unit: item.unit || 'Pcs',
          accountId: (item as any).accountId || null,
          taxable,
          gross,
          discAmt,
        };
      });

      const subTotal = processedItems.reduce((sum, item) => sum + item.gross, 0);
      const totalDiscount = processedItems.reduce((sum, item) => sum + item.discAmt, 0);
      const taxableTotal = subTotal - totalDiscount;
      const taxTotal = processedItems.reduce((sum, item) => sum + item.taxAmount, 0);
      
      let grandTotal = taxableTotal + taxTotal + Number(dto.adjustment || 0);
      if (dto.discountAmount) {
        grandTotal -= Number(dto.discountAmount);
      }
      if (dto.tdsTcsType === 'TDS') {
        grandTotal -= Number(dto.tdsTcsAmount || 0);
      } else if (dto.tdsTcsType === 'TCS') {
        grandTotal += Number(dto.tdsTcsAmount || 0);
      }
      grandTotal = Math.max(0, Math.round(grandTotal));

      const metadata = {
        expectedDeliveryDate: dto.expectedDeliveryDate,
        warehouseId: dto.warehouseId,
        buyer: dto.buyer,
        notes: dto.notes,
        referenceNo: dto.referenceNo,
        deliveryAddressType: dto.deliveryAddressType || 'ORGANIZATION',
        deliveryCustomerId: dto.deliveryCustomerId,
        deliveryCustomerName: dto.deliveryCustomerName,
        deliveryCustomerAddress: dto.deliveryCustomerAddress,
        paymentTerms: dto.paymentTerms,
        shipmentPreference: dto.shipmentPreference,
        isRcm: Boolean(dto.isRcm),
        termsConditions: dto.termsConditions,
        discount: Number(dto.discount || 0),
        discountType: dto.discountType || '%',
        discountAmount: Number(dto.discountAmount || 0),
        adjustment: Number(dto.adjustment || 0),
        tdsTcsType: dto.tdsTcsType || 'NONE',
        tdsTcsRate: Number(dto.tdsTcsRate || 0),
        tdsTcsAmount: Number(dto.tdsTcsAmount || 0),
        tdsTcsTaxId: dto.tdsTcsTaxId,
        attachedFiles: dto.attachedFiles || [],
        createdByName: user?.name || user?.email || 'System Admin',
        receivedQty: {},
        itemsMeta: processedItems.map(p => ({
          productId: p.productId,
          description: p.description,
          discount: p.discount,
          unit: p.unit,
          accountId: p.accountId,
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
          status: (dto.status as string) === 'ISSUED' ? 'SENT' : (dto.status || 'DRAFT'),
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

      const poMeta = (po.gstBreakup as any) || {};
      return {
        ...po,
        ...poMeta,
      };
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
    if (dto.status) {
      updateData.status = (dto.status as any) === 'ISSUED' ? 'SENT' : dto.status;
    }
    if (dto.businessPartnerId) updateData.businessPartnerId = dto.businessPartnerId;
    if (dto.orderNo) updateData.orderNo = dto.orderNo;
    if (dto.taxMode) updateData.taxMode = dto.taxMode;
    if (dto.placeOfSupply !== undefined) updateData.placeOfSupply = dto.placeOfSupply;
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.billingAddress !== undefined) updateData.billingAddress = dto.billingAddress;
    if (dto.shippingAddress !== undefined) updateData.shippingAddress = dto.shippingAddress;

    const newMeta = {
      ...existingMeta,
      ...(dto.expectedDeliveryDate !== undefined && { expectedDeliveryDate: dto.expectedDeliveryDate }),
      ...(dto.warehouseId !== undefined && { warehouseId: dto.warehouseId }),
      ...(dto.buyer !== undefined && { buyer: dto.buyer }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.referenceNo !== undefined && { referenceNo: dto.referenceNo }),
      ...(dto.deliveryAddressType !== undefined && { deliveryAddressType: dto.deliveryAddressType }),
      ...(dto.deliveryCustomerId !== undefined && { deliveryCustomerId: dto.deliveryCustomerId }),
      ...(dto.deliveryCustomerName !== undefined && { deliveryCustomerName: dto.deliveryCustomerName }),
      ...(dto.deliveryCustomerAddress !== undefined && { deliveryCustomerAddress: dto.deliveryCustomerAddress }),
      ...(dto.paymentTerms !== undefined && { paymentTerms: dto.paymentTerms }),
      ...(dto.shipmentPreference !== undefined && { shipmentPreference: dto.shipmentPreference }),
      ...(dto.isRcm !== undefined && { isRcm: Boolean(dto.isRcm) }),
      ...(dto.termsConditions !== undefined && { termsConditions: dto.termsConditions }),
      ...(dto.discount !== undefined && { discount: Number(dto.discount) }),
      ...(dto.discountType !== undefined && { discountType: dto.discountType }),
      ...(dto.discountAmount !== undefined && { discountAmount: Number(dto.discountAmount) }),
      ...(dto.adjustment !== undefined && { adjustment: Number(dto.adjustment) }),
      ...(dto.tdsTcsType !== undefined && { tdsTcsType: dto.tdsTcsType }),
      ...(dto.tdsTcsRate !== undefined && { tdsTcsRate: Number(dto.tdsTcsRate) }),
      ...(dto.tdsTcsAmount !== undefined && { tdsTcsAmount: Number(dto.tdsTcsAmount) }),
      ...(dto.tdsTcsTaxId !== undefined && { tdsTcsTaxId: dto.tdsTcsTaxId }),
      ...(dto.attachedFiles !== undefined && { attachedFiles: dto.attachedFiles }),
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
          description: item.description?.trim() || 'Line Item',
          qty,
          rate,
          taxPercent,
          taxAmount,
          total,
          discount,
          unit: item.unit || 'Pcs',
          accountId: (item as any).accountId || null,
          taxable,
          gross,
          discAmt,
        };
      });

      const subTotal = processedItems.reduce((sum, item) => sum + item.gross, 0);
      const totalDiscount = processedItems.reduce((sum, item) => sum + item.discAmt, 0);
      const taxableTotal = subTotal - totalDiscount;
      const taxTotal = processedItems.reduce((sum, item) => sum + item.taxAmount, 0);

      let grandTotal = taxableTotal + taxTotal + Number(dto.adjustment ?? newMeta.adjustment ?? 0);
      const discAmt = dto.discountAmount ?? newMeta.discountAmount ?? 0;
      if (discAmt) grandTotal -= Number(discAmt);
      const ttType = dto.tdsTcsType ?? newMeta.tdsTcsType ?? 'NONE';
      const ttAmt = dto.tdsTcsAmount ?? newMeta.tdsTcsAmount ?? 0;
      if (ttType === 'TDS') grandTotal -= Number(ttAmt);
      else if (ttType === 'TCS') grandTotal += Number(ttAmt);
      grandTotal = Math.max(0, Math.round(grandTotal));

      updateData.subTotal = subTotal;
      updateData.taxTotal = taxTotal;
      updateData.totalTaxAmount = taxTotal;
      updateData.grandTotal = grandTotal;

      newMeta.itemsMeta = processedItems.map(p => ({
        productId: p.productId,
        description: p.description,
        discount: p.discount,
        unit: p.unit,
        accountId: p.accountId,
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

    return this.findOne(id);
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
