import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateQuotationDto, UpdateQuotationDto, QuotationQueryDto } from './dto/quotation.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import { GSTEngine } from '../common/utils/gst-engine.util';
import type { Prisma } from '@prisma/client';
import { DocumentStatus } from '@prisma/client';
import { SequenceService } from '../shared/sequence/sequence.service';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService
  ) {}

  async findAll(query: QuotationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.QuotationWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { quotationNo: { contains: query.search, mode: 'insensitive' } },
              { businessPartner: { name: { contains: query.search, mode: 'insensitive' } } },
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

  async getSummary() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const whereBase: Prisma.QuotationWhereInput = {
      companyId,
      deletedAt: null,
    };

    const [total, draft, sent, accepted, rejected] = await Promise.all([
      this.prisma.quotation.count({ where: whereBase }),
      this.prisma.quotation.count({ where: { ...whereBase, status: DocumentStatus.DRAFT } }),
      this.prisma.quotation.count({ where: { ...whereBase, status: DocumentStatus.SENT } }),
      this.prisma.quotation.count({ where: { ...whereBase, status: DocumentStatus.ACCEPTED } }),
      this.prisma.quotation.count({ where: { ...whereBase, status: DocumentStatus.REJECTED } }),
    ]);

    return {
      total,
      draft,
      sent,
      accepted,
      rejected,
    };
  }

  async getNextQuotationNumber() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const sequence = await this.prisma.documentSequence.findFirst({
      where: { companyId, documentType: 'QUOTATION' },
    });

    if (!sequence) {
      const lastQuotation = await this.prisma.quotation.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });

      if (lastQuotation?.quotationNo) {
        const match = lastQuotation.quotationNo.match(/(\d+)$/);
        if (match) {
          const nextCount = parseInt(match[1], 10) + 1;
          const prefix = lastQuotation.quotationNo.replace(/\d+$/, '');
          return { nextNumber: `${prefix}${String(nextCount).padStart(5, '0')}` };
        }
      }

      return { nextNumber: 'QT-00001' };
    }

    const nextNum = sequence.currentNumber + 1;
    let prefix = sequence.prefix || 'QT-';
    if (!prefix.endsWith('-') && !prefix.endsWith('/')) {
      prefix = `${prefix}-`;
    }
    return { nextNumber: `${prefix}${String(nextNum).padStart(sequence.padding || 5, '0')}` };
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const quotation = await this.prisma.quotation.findFirst({
      where: { id, companyId, deletedAt: null },
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

    const customerId = (dto.customerId || dto.businessPartnerId) as string;
    if (!customerId) {
      throw new BadRequestException('Customer / Business Partner ID is required');
    }

    const customer = await this.prisma.businessPartner.findFirst({
      where: { id: customerId, companyId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Generate quotation number
      let quotationNo = (dto.quotationNo || dto.documentNo || dto.docNo)?.trim();
      if (!quotationNo) {
        quotationNo = await this.sequenceService.generateUniversalSequence(companyId, 'QUOTATION', {}, tx);
      } else {
        const existing = await tx.quotation.findFirst({
          where: { companyId, quotationNo, deletedAt: null },
        });
        if (existing) {
          quotationNo = await this.sequenceService.generateUniversalSequence(companyId, 'QUOTATION', {}, tx);
        }
      }

      const company = await tx.company.findUnique({
        where: { id: companyId },
      });
      const companyState = company?.state?.trim().toLowerCase() || '';
      const supplyState = (dto.placeOfSupply || customer.state)?.trim().toLowerCase() || companyState;
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
        
        const taxRate = item.taxPercent !== undefined ? Number(item.taxPercent) : Number(product.gstRate || 18);
        
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
      const quotationStatus = dto.status === 'DRAFT' ? 'DRAFT' : 'SENT';

      return tx.quotation.create({
        data: {
          companyId,
          businessPartnerId: customerId,
          quotationNo,
          date: new Date(dto.date),
          status: quotationStatus as any,
          placeOfSupply: dto.placeOfSupply || customer.state || null,
          companyStateCode: companyState || null,
          customerStateCode: supplyState || null,
          subTotal,
          taxTotal,
          grandTotal,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          cessAmount: 0,
          totalTaxAmount: taxTotal,
          gstBreakup: {
            notes: dto.notes || '',
            termsConditions: dto.termsConditions || '',
            invoiceCategoryId: dto.invoiceCategoryId || null,
          },
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: { include: { product: true } }, businessPartner: true },
      });
    });
  }

  async update(id: string, dto: UpdateQuotationDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const quotation = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // If items are being updated:
      if (dto.items && dto.items.length > 0) {
        const customerId = (dto.customerId || dto.businessPartnerId || quotation.businessPartnerId) as string;
        const customer = await tx.businessPartner.findFirst({
          where: { id: customerId, companyId },
        });
        if (!customer) {
          throw new NotFoundException(`Customer not found`);
        }

        const company = await tx.company.findUnique({
          where: { id: companyId },
        });
        const companyState = company?.state?.trim().toLowerCase() || '';
        const supplyState = (dto.placeOfSupply || customer.state)?.trim().toLowerCase() || companyState;
        const bpTaxPreference = customer.taxPreference || 'TAXABLE';

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
          const taxRate = item.taxPercent !== undefined ? Number(item.taxPercent) : Number(product.gstRate || 18);

          const gstResult = GSTEngine.calculate({
            taxableAmount: lineTotal,
            gstRate: taxRate,
            taxPreference: bpTaxPreference as any,
            companyStateCode: companyState,
            customerStateCode: supplyState,
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

        // Delete existing items
        await tx.quotationItem.deleteMany({
          where: { quotationId: id },
        });

        return tx.quotation.update({
          where: { id },
          data: {
            businessPartnerId: customerId,
            ...(dto.date && { date: new Date(dto.date) }),
            ...(dto.status && { status: dto.status as any }),
            ...(dto.placeOfSupply && { placeOfSupply: dto.placeOfSupply }),
            subTotal,
            taxTotal,
            grandTotal: subTotal + taxTotal,
            cgstAmount: totalCgst,
            sgstAmount: totalSgst,
            igstAmount: totalIgst,
            totalTaxAmount: taxTotal,
            gstBreakup: {
              notes: dto.notes || '',
              termsConditions: dto.termsConditions || '',
              invoiceCategoryId: dto.invoiceCategoryId || null,
            },
            items: {
              create: itemsToCreate,
            },
          },
          include: { items: { include: { product: true } }, businessPartner: true },
        });
      }

      // If only metadata / status updated
      return tx.quotation.update({
        where: { id },
        data: {
          ...(dto.status && { status: dto.status as any }),
          ...(dto.date && { date: new Date(dto.date) }),
          ...(dto.placeOfSupply && { placeOfSupply: dto.placeOfSupply }),
          ...(dto.customerId && { businessPartnerId: dto.customerId }),
          ...(dto.businessPartnerId && { businessPartnerId: dto.businessPartnerId }),
        },
        include: { items: { include: { product: true } }, businessPartner: true },
      });
    });
  }

  async updateStatus(id: string, status: DocumentStatus) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    await this.findOne(id);

    return this.prisma.quotation.update({
      where: { id },
      data: { status },
      include: { businessPartner: true, items: { include: { product: true } } },
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
