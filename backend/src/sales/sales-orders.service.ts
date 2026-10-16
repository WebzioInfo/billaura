import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  SalesOrderQueryDto,
} from './dto/sales-order.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SalesOrderQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const { skip, take } = getPagination(query);

    const where: Prisma.SalesOrderWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status && query.status !== 'ALL' ? { status: query.status as DocumentStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNo: { contains: query.search, mode: 'insensitive' } },
              { businessPartner: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take,
        include: {
          businessPartner: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    const mappedData = data.map((order) => {
      const meta =
        typeof order.gstBreakup === 'string'
          ? (() => {
              try {
                return JSON.parse(order.gstBreakup);
              } catch {
                return {};
              }
            })()
          : (order.gstBreakup as any) || {};

      return {
        ...order,
        salesperson: meta.salesperson,
        salespersonId: meta.salespersonId,
        referenceNo: meta.referenceNo,
        orderNumber: meta.orderNumber,
        subject: meta.subject,
        paymentTerms: meta.paymentTerms,
        expectedShipmentDate: meta.expectedShipmentDate,
        deliveryMethod: meta.deliveryMethod,
        adjustment: meta.adjustment,
        notes: meta.notes,
        termsConditions: meta.termsConditions,
        templateId: meta.templateId,
        currency: meta.currency,
        dueDate: meta.dueDate,
      };
    });

    return toPaginatedResult(mappedData, total, query);
  }

  async getNextOrderNumber() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const sequence = await this.prisma.documentSequence.findFirst({
      where: { companyId, documentType: 'SALES_ORDER' },
    });

    if (!sequence) {
      const lastOrder = await this.prisma.salesOrder.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });

      if (lastOrder?.orderNo) {
        const match = lastOrder.orderNo.match(/(\d+)$/);
        if (match) {
          const nextCount = parseInt(match[1], 10) + 1;
          const prefix = lastOrder.orderNo.replace(/\d+$/, '');
          return { nextNumber: `${prefix}${String(nextCount).padStart(5, '0')}` };
        }
      }

      return { nextNumber: 'SO-00001' };
    }

    const nextNum = sequence.currentNumber + 1;
    let prefix = sequence.prefix || 'SO-';
    if (!prefix.endsWith('-') && !prefix.endsWith('/')) {
      prefix = `${prefix}-`;
    }
    return { nextNumber: `${prefix}${String(nextNum).padStart(sequence.padding || 5, '0')}` };
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        businessPartner: true,
        items: {
          include: { product: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Sales Order not found');

    const meta =
      typeof order.gstBreakup === 'string'
        ? (() => {
            try {
              return JSON.parse(order.gstBreakup);
            } catch {
              return {};
            }
          })()
        : (order.gstBreakup as any) || {};

    return {
      ...order,
      salesperson: meta.salesperson,
      salespersonId: meta.salespersonId,
      referenceNo: meta.referenceNo,
      orderNumber: meta.orderNumber,
      subject: meta.subject,
      paymentTerms: meta.paymentTerms,
      expectedShipmentDate: meta.expectedShipmentDate,
      deliveryMethod: meta.deliveryMethod,
      adjustment: meta.adjustment,
      notes: meta.notes,
      termsConditions: meta.termsConditions,
      templateId: meta.templateId,
      currency: meta.currency,
      dueDate: meta.dueDate,
    };
  }

  async create(dto: CreateSalesOrderDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const partnerId = dto.businessPartnerId || dto.customerId;
    if (!partnerId) {
      throw new BadRequestException('Customer / Business partner is required');
    }

    let orderNo = dto.orderNo || dto.invoiceNo || dto.documentNo;
    if (!orderNo) {
      const nextObj = await this.getNextOrderNumber();
      orderNo = nextObj.nextNumber;
    }

    const existing = await this.prisma.salesOrder.findFirst({
      where: { companyId, orderNo },
    });
    if (existing) throw new ConflictException(`Sales order number ${orderNo} already exists`);

    // Verify customer exists and belongs to this tenant
    const partner = await this.prisma.businessPartner.findFirst({
      where: { id: partnerId, companyId },
    });
    if (!partner) throw new NotFoundException('Customer not found for this tenant');

    const subTotal = dto.items.reduce(
      (sum, item) => sum + Number(item.qty) * Number(item.rate),
      0
    );
    const taxTotal = dto.items.reduce((sum, item) => {
      const lineTax = (Number(item.qty) * Number(item.rate) * Number(item.taxPercent || 0)) / 100;
      return sum + lineTax;
    }, 0);
    const grandTotal = Math.max(
      0,
      Number((subTotal + taxTotal + Number(dto.adjustment || 0)).toFixed(2))
    );

    const gstBreakup = {
      salesperson: dto.salesperson,
      salespersonId: dto.salespersonId,
      orderNumber: dto.orderNumber,
      referenceNo: dto.referenceNo,
      subject: dto.subject,
      paymentTerms: dto.paymentTerms,
      expectedShipmentDate: dto.expectedShipmentDate,
      deliveryMethod: dto.deliveryMethod,
      adjustment: dto.adjustment,
      notes: dto.notes,
      termsConditions: dto.termsConditions,
      templateId: dto.templateId,
      currency: dto.currency || 'INR',
      dueDate: dto.dueDate,
    };

    const order = await this.prisma.salesOrder.create({
      data: {
        companyId,
        businessPartnerId: partnerId,
        orderNo,
        date: new Date(dto.date),
        taxMode: dto.taxMode || 'CGST_SGST',
        placeOfSupply: dto.placeOfSupply || partner.placeOfSupply || partner.state,
        status: dto.status || DocumentStatus.DRAFT,
        subTotal,
        taxTotal,
        totalTaxAmount: taxTotal,
        grandTotal,
        gstBreakup,
        items: {
          create: dto.items.map((item) => {
            const qty = Number(item.qty);
            const rate = Number(item.rate);
            const taxPercent = Number(item.taxPercent || 0);
            const taxAmount = Number(((qty * rate * taxPercent) / 100).toFixed(2));
            const total = Number((qty * rate + taxAmount).toFixed(2));

            return {
              productId: item.productId || null,
              description: item.description || 'Item',
              qty,
              rate,
              taxPercent,
              taxAmount,
              total,
            };
          }),
        },
      },
      include: {
        businessPartner: true,
        items: {
          include: { product: true },
        },
      },
    });

    return order;
  }

  async update(id: string, dto: UpdateSalesOrderDto) {
    try {
      const companyId = CompanyContext.getCompanyId();
      if (!companyId) throw new ConflictException('Company context required');

    const existing = await this.findOne(id);

    const partnerId = dto.businessPartnerId || dto.customerId || existing.businessPartnerId;
    const orderNo = dto.orderNo || dto.invoiceNo || dto.documentNo || existing.orderNo;

    if (orderNo !== existing.orderNo) {
      const dup = await this.prisma.salesOrder.findFirst({
        where: { companyId, orderNo, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Sales order number ${orderNo} already exists`);
    }

    const existingMeta =
      typeof existing.gstBreakup === 'string'
        ? (() => {
            try {
              return JSON.parse(existing.gstBreakup as string);
            } catch {
              return {};
            }
          })()
        : (existing.gstBreakup as any) || {};

    const updatedGstBreakup = {
      ...existingMeta,
      ...(dto.salesperson !== undefined && { salesperson: dto.salesperson }),
      ...(dto.salespersonId !== undefined && { salespersonId: dto.salespersonId }),
      ...(dto.orderNumber !== undefined && { orderNumber: dto.orderNumber }),
      ...(dto.referenceNo !== undefined && { referenceNo: dto.referenceNo }),
      ...(dto.subject !== undefined && { subject: dto.subject }),
      ...(dto.paymentTerms !== undefined && { paymentTerms: dto.paymentTerms }),
      ...(dto.expectedShipmentDate !== undefined && { expectedShipmentDate: dto.expectedShipmentDate }),
      ...(dto.deliveryMethod !== undefined && { deliveryMethod: dto.deliveryMethod }),
      ...(dto.adjustment !== undefined && { adjustment: dto.adjustment }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.termsConditions !== undefined && { termsConditions: dto.termsConditions }),
      ...(dto.templateId !== undefined && { templateId: dto.templateId }),
      ...(dto.dueDate !== undefined && { dueDate: dto.dueDate }),
    };

    let subTotal = Number(existing.subTotal);
    let taxTotal = Number(existing.taxTotal);
    let grandTotal = Number(existing.grandTotal);

    if (dto.items && dto.items.length > 0) {
      subTotal = dto.items.reduce(
        (sum, item) => sum + Number(item.qty) * Number(item.rate),
        0
      );
      taxTotal = dto.items.reduce((sum, item) => {
        const lineTax = (Number(item.qty) * Number(item.rate) * Number(item.taxPercent || 0)) / 100;
        return sum + lineTax;
      }, 0);
      grandTotal = Math.max(
        0,
        Number(
          (
            subTotal +
            taxTotal +
            Number(dto.adjustment ?? existingMeta.adjustment ?? 0)
          ).toFixed(2)
        )
      );

      await this.prisma.salesOrderItem.deleteMany({ where: { orderId: id } });
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: {
        businessPartnerId: partnerId,
        orderNo,
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.status && { status: dto.status }),
        ...(dto.placeOfSupply && { placeOfSupply: dto.placeOfSupply }),
        subTotal,
        taxTotal,
        totalTaxAmount: taxTotal,
        grandTotal,
        gstBreakup: updatedGstBreakup,
        ...(dto.items &&
          dto.items.length > 0 && {
            items: {
              create: dto.items.map((item) => {
                const qty = Number(item.qty);
                const rate = Number(item.rate);
                const taxPercent = Number(item.taxPercent || 0);
                const taxAmount = Number(((qty * rate * taxPercent) / 100).toFixed(2));
                const total = Number((qty * rate + taxAmount).toFixed(2));

                return {
                  productId: item.productId || null,
                  description: item.description || 'Item',
                  qty,
                  rate,
                  taxPercent,
                  taxAmount,
                  total,
                };
              }),
            },
          }),
      },
      include: {
        businessPartner: true,
        items: {
          include: { product: true },
        },
      },
    });

    return updated;
  } catch (err: any) {
    console.error('Error in salesOrdersService.update:', err);
    throw err;
  }
}

  async remove(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');
    await this.findOne(id);
    await this.prisma.salesOrderItem.deleteMany({ where: { orderId: id } });
    return this.prisma.salesOrder.delete({
      where: { id },
    });
  }
}
