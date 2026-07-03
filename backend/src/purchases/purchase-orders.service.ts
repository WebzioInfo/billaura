import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const { skip, take } = getPagination(query);

    const where: Prisma.PurchaseOrderWhereInput = {
      companyId,
      ...(query.search ? { orderNo: { contains: query.search } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: { businessPartner: true, items: true },
    });
    if (!order) throw new NotFoundException('Purchase Order not found');
    return order;
  }

  async create(dto: CreatePurchaseOrderDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { companyId, orderNo: dto.orderNo },
    });
    if (existing) throw new ConflictException('Order number already exists');

    const subTotal = dto.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const taxTotal = dto.items.reduce((sum, item) => sum + ((item.qty * item.rate * item.taxPercent) / 100), 0);
    const grandTotal = subTotal + taxTotal;

    return this.prisma.purchaseOrder.create({
      data: {
        companyId,
        businessPartnerId: dto.businessPartnerId,
        orderNo: dto.orderNo,
        date: new Date(dto.date),
        taxMode: dto.taxMode || 'CGST_SGST',
        placeOfSupply: dto.placeOfSupply,
        subTotal,
        taxTotal,
        totalTaxAmount: taxTotal,
        grandTotal,
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
      include: { items: true },
    });
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const companyId = CompanyContext.getCompanyId();
    await this.findOne(id); // verify exists
    
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.date && { date: new Date(dto.date) }),
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.purchaseOrder.delete({
      where: { id },
    });
  }
}
