import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
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

    const where: Prisma.ProductWhereInput = {
      companyId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { sku: { contains: query.search } },
              { barcode: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: { stocks: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const product = await this.prisma.product.findFirst({
      where: { id },
      include: { stocks: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Check SKU uniqueness
    let finalSku = dto.sku;
    if (finalSku) {
      const existing = await this.prisma.product.findFirst({
        where: { companyId, sku: finalSku },
      });
      if (existing) {
        throw new ConflictException(`Product with SKU '${finalSku}' already exists`);
      }
    } else {
      finalSku = await this.sequenceService.generateNextSequence(companyId, 'SKU');
    }

    // Determine GST Rate from TaxGroup if provided
    let gstRate = dto.gstRate || 0;
    if (dto.taxGroupId) {
      const taxGroup = await this.prisma.taxGroup.findUnique({ where: { id: dto.taxGroupId } });
      if (taxGroup) {
        gstRate = Number(taxGroup.totalRate);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name,
          category: dto.category || null,
          brand: dto.brand || null,
          unit: dto.unit || 'PCS',
          taxGroupId: dto.taxGroupId || null,
          sku: finalSku,
          alias: dto.alias || null,
          barcode: dto.barcode || null,
          hsnCode: dto.hsnCode || null,
          eInvoiceHsn: dto.eInvoiceHsn || null,
          scheduleNo: dto.scheduleNo || null,
          itemType: dto.itemType || 'FINISHED_GOOD',
          weight: dto.weight || null,
          weightType: dto.weightType || null,
          taxRate: gstRate,
          gstRate: gstRate,
          taxType: dto.taxType || null,
          taxCategory: dto.taxCategory || 'TAXABLE',
          isExempt: dto.isExempt || false,
          isNilRated: dto.isNilRated || false,
          isNonGst: dto.isNonGst || false,
          purchasePrice: dto.purchasePrice || 0,
          sellingPrice: dto.sellingPrice || 0,
          minStock: dto.minStock || 0,
          maxStock: dto.maxStock || 0,
          reorderLevel: dto.reorderLevel || 0,
          pluNo: dto.pluNo || null,
          valuationMethod: dto.valuationMethod || 'AVERAGE',
          salesAccountId: dto.salesAccountId || null,
          purchaseAccountId: dto.purchaseAccountId || null,
          inventoryAccountId: dto.inventoryAccountId || null,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          imageUrl: dto.imageUrl || null,
          companyId,
        },
      });

      // Find default warehouse to initialize stock mapping
      const defaultWh = await tx.warehouse.findFirst({
        where: { companyId, isDefault: true },
      });

      if (defaultWh) {
        await tx.stock.create({
          data: {
            companyId,
            productId: product.id,
            warehouseId: defaultWh.id,
            quantity: 0,
            availableQuantity: 0,
          },
        });
      }

      return product;
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const product = await this.prisma.product.findFirst({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    let finalSku = dto.sku;
    if (finalSku && finalSku !== product.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { companyId, sku: finalSku, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Product with SKU '${finalSku}' already exists`);
      }
    } else if (!finalSku) {
       finalSku = await this.sequenceService.generateNextSequence(companyId, 'SKU');
    }

    let gstRate = dto.gstRate !== undefined ? dto.gstRate : product.gstRate;
    if (dto.taxGroupId) {
      const taxGroup = await this.prisma.taxGroup.findUnique({ where: { id: dto.taxGroupId } });
      if (taxGroup) {
        gstRate = Number(taxGroup.totalRate);
      }
    }

    const dataToUpdate = {
      ...dto,
      sku: finalSku,
      gstRate: gstRate,
      taxRate: gstRate
    };

    return this.prisma.product.update({
      where: { id },
      data: dataToUpdate as any,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
