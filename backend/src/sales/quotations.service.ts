import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateQuotationDto } from './dto/quotation.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import { GSTEngine } from '../common/utils/gst-engine.util';
import type { Prisma } from '@prisma/client';
import { SequenceService } from '../shared/sequence/sequence.service';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService
  ) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.QuotationWhereInput = {
      companyId,
      ...(query.search
        ? {
            OR: [
              { quotationNo: { contains: query.search } },
              { businessPartner: { name: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.quotation.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true, items: { include: { product: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const quotation = await this.prisma.quotation.findFirst({
      where: { id },
      include: { businessPartner: true, items: { include: { product: true } } },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    return quotation;
  }

  async create(dto: CreateQuotationDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const customer = await this.prisma.businessPartner.findFirst({
      where: { id: dto.customerId, companyId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Generate quotation number
      const quotationNo = await this.sequenceService.generateNextSequence(companyId, 'QUOTATION', tx);

      const company = await tx.company.findUnique({
        where: { id: companyId },
      });
      const companyState = company?.state?.trim().toLowerCase() || '';
      const supplyState = customer.state?.trim().toLowerCase() || '';
      const bpTaxPreference = customer.taxPreference || 'TAXABLE';

      // 2. Fetch items and calculate subtotal
      let subTotal = 0;
      let taxTotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      const itemsToCreate = [];

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, companyId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const rate = Number(item.rate);
        const qty = Number(item.qty);
        const lineTotal = rate * qty;
        
        const taxRate = (item as any).taxPercent !== undefined ? Number((item as any).taxPercent) : Number(product.gstRate || 18);
        
        const gstResult = GSTEngine.calculate({
           taxableAmount: lineTotal,
           gstRate: taxRate,
           taxPreference: bpTaxPreference as any,
           companyStateCode: companyState,
           customerStateCode: supplyState
        });

        subTotal += gstResult.taxableAmount;
        taxTotal += gstResult.totalTax;
        totalCgst += gstResult.cgstAmount;
        totalSgst += gstResult.sgstAmount;
        totalIgst += gstResult.igstAmount;

        itemsToCreate.push({
          productId: product.id,
          description: item.description || product.name,
          qty,
          rate,
          taxPercent: taxRate,
          taxAmount: gstResult.totalTax,
          total: gstResult.grandTotal,
          cgstAmount: gstResult.cgstAmount,
          sgstAmount: gstResult.sgstAmount,
          igstAmount: gstResult.igstAmount,
        });
      }

      const grandTotal = subTotal + taxTotal;

      return tx.quotation.create({
        data: {
          companyId,
          businessPartnerId: dto.customerId,
          quotationNo,
          date: new Date(dto.date),
          status: 'SENT',
          subTotal,
          taxTotal,
          grandTotal,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          cessAmount: 0,
          totalTaxAmount: taxTotal,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
