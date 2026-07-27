import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from './dto/sales-order.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const { skip, take } = getPagination(query);

    const where: Prisma.SalesOrderWhereInput = {
      companyId,
      ...(query.search ? { orderNo: { contains: query.search } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');
    const order = await this.prisma.salesOrder.findFirst({
      where: { id },
      include: { businessPartner: true, items: true },
    });
    if (!order) throw new NotFoundException('Sales Order not found');
    return order;
  }

  async create(dto: CreateSalesOrderDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const existing = await this.prisma.salesOrder.findFirst({
      where: { companyId, orderNo: dto.orderNo },
    });
    if (existing) throw new ConflictException('Order number already exists');

    // Simplified calculation for demo purposes. 
    // In production, reuse taxes.service or a shared calculator
    const subTotal = dto.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const taxTotal = dto.items.reduce((sum, item) => sum + ((item.qty * item.rate * item.taxPercent) / 100), 0);
    const grandTotal = subTotal + taxTotal;

    return this.prisma.salesOrder.create({
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

  async update(id: string, dto: UpdateSalesOrderDto) {
    const _companyId = CompanyContext.getCompanyId();
    await this.findOne(id); // verify exists
    
    return this.prisma.salesOrder.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.date && { date: new Date(dto.date) }),
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.salesOrder.delete({
      where: { id },
    });
  }
}
