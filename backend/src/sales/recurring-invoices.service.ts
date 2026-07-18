import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class RecurringInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const { skip, take } = getPagination(query);

    const where: Prisma.RecurringInvoiceWhereInput = {
      companyId: companyId!,
      deletedAt: null,
      ...(query.search
        ? {
            businessPartner: { name: { contains: query.search } },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.recurringInvoice.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true, items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recurringInvoice.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    const invoice = await this.prisma.recurringInvoice.findFirst({
      where: { id, companyId: companyId!, deletedAt: null },
      include: { businessPartner: true, items: true },
    });

    if (!invoice) throw new NotFoundException(`Recurring Invoice with ID ${id} not found`);
    return invoice;
  }

  async create(dto: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    return this.prisma.$transaction(async (tx) => {
      let subTotal = 0;
      let taxTotal = 0;
      const itemsToCreate = [];

      for (const item of dto.items) {
        const rate = Number(item.rate);
        const qty = Number(item.qty);
        const total = rate * qty;
        subTotal += total;
        
        itemsToCreate.push({
          description: item.description,
          qty,
          rate,
        });
      }

      const grandTotal = subTotal + taxTotal;

      const newInvoice = await tx.recurringInvoice.create({
        data: {
          companyId: companyId!,
          businessPartnerId: dto.customerId,
          frequency: dto.frequency || 'MONTHLY',
          nextRunDate: new Date(dto.nextRunDate),
          status: 'ACTIVE',
          subTotal,
          taxTotal,
          grandTotal,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });

      return newInvoice;
    });
  }

  async update(id: string, dto: any) {
    const companyId = CompanyContext.getCompanyId();
    const existing = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.recurringInvoiceItem.deleteMany({
        where: { recurringInvoiceId: id },
      });

      let subTotal = 0;
      let taxTotal = 0;
      const itemsToCreate = [];

      for (const item of dto.items) {
        const rate = Number(item.rate);
        const qty = Number(item.qty);
        const total = rate * qty;
        subTotal += total;
        itemsToCreate.push({
          description: item.description,
          qty,
          rate,
        });
      }

      const grandTotal = subTotal + taxTotal;

      return tx.recurringInvoice.update({
        where: { id },
        data: {
          businessPartnerId: dto.customerId,
          frequency: dto.frequency,
          nextRunDate: new Date(dto.nextRunDate),
          subTotal,
          taxTotal,
          grandTotal,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });
    });
  }

  async remove(id: string) {
    const companyId = CompanyContext.getCompanyId();
    const existing = await this.findOne(id);

    return this.prisma.recurringInvoice.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'SUSPENDED' },
    });
  }
}
