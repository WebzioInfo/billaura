import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma, TaxCategory } from '@prisma/client';

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
        include: { stocks: true, category: true, brand: true },
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
      include: { stocks: true, category: true, brand: true },
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

    let finalGstRate: number | undefined = gstRate;
    let finalHsnCode = dto.hsnCode || null;
    let finalTaxCategory: TaxCategory | undefined = dto.taxCategory || 'TAXABLE';
    let finalTaxGroupId = dto.taxGroupId || null;

    let finalTaxType = dto.taxType || null;

    if (dto.isTaxable === false) {
      finalGstRate = undefined;
      finalHsnCode = null;
      finalTaxCategory = undefined;
      finalTaxGroupId = null;
      finalTaxType = null;
    }

    let finalMinStock = dto.minStock || 0;
    let finalMaxStock = dto.maxStock || 0;
    let finalReorderLevel = dto.reorderLevel || 0;
    let finalValuationMethod = dto.valuationMethod || 'AVERAGE';

    if (dto.isService === true || dto.isInventoryItem === false) {
      finalMinStock = 0;
      finalMaxStock = 0;
      finalReorderLevel = 0;
      finalValuationMethod = 'NONE';
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name,
          categoryId: dto.categoryId || null,
          brandId: dto.brandId || null,
          unit: dto.unit || 'PCS',
          taxGroupId: finalTaxGroupId,
          sku: finalSku,
          alias: dto.alias || null,
          barcode: dto.barcode || null,
          hsnCode: finalHsnCode,
          eInvoiceHsn: dto.eInvoiceHsn || null,
          scheduleNo: dto.scheduleNo || null,
          itemType: dto.itemType || 'FINISHED_GOOD',
          weight: dto.weight || null,
          weightType: dto.weightType || null,
          taxRate: finalGstRate,
          gstRate: finalGstRate,
          taxType: finalTaxType,
          taxCategory: finalTaxCategory,
          isExempt: dto.isExempt || false,
          isNilRated: dto.isNilRated || false,
          isNonGst: dto.isNonGst || false,
          purchasePrice: dto.purchasePrice || 0,
          sellingPrice: dto.sellingPrice || 0,
          minStock: finalMinStock,
          maxStock: finalMaxStock,
          reorderLevel: finalReorderLevel,
          pluNo: dto.pluNo || null,
          valuationMethod: finalValuationMethod,
          salesAccountId: dto.salesAccountId || null,
          purchaseAccountId: dto.purchaseAccountId || null,
          inventoryAccountId: dto.inventoryAccountId || null,
          isPurchasable: dto.isPurchasable !== undefined ? dto.isPurchasable : true,
          isSellable: dto.isSellable !== undefined ? dto.isSellable : true,
          isInventoryItem: dto.isInventoryItem !== undefined ? dto.isInventoryItem : true,
          isTaxable: dto.isTaxable !== undefined ? dto.isTaxable : true,
          isTrackStock: dto.isTrackStock !== undefined ? dto.isTrackStock : true,
          isTrackBatch: dto.isTrackBatch || false,
          isTrackSerial: dto.isTrackSerial || false,
          isManufactured: dto.isManufactured || false,
          isService: dto.isService || false,
          isDigital: dto.isDigital || false,
          isAsset: dto.isAsset || false,
          isExpense: dto.isExpense || false,
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

    let finalGstRate: typeof gstRate | undefined = gstRate;
    let finalHsnCode = dto.hsnCode !== undefined ? dto.hsnCode : product.hsnCode;
    let finalTaxCategory: TaxCategory | undefined | null = dto.taxCategory !== undefined ? dto.taxCategory : product.taxCategory;
    let finalTaxGroupId = dto.taxGroupId !== undefined ? dto.taxGroupId : product.taxGroupId;

    let isTaxable = dto.isTaxable !== undefined ? dto.isTaxable : product.isTaxable;

    let finalTaxType = dto.taxType !== undefined ? dto.taxType : product.taxType;

    if (isTaxable === false) {
      finalGstRate = undefined;
      finalHsnCode = null;
      finalTaxCategory = undefined;
      finalTaxGroupId = null;
      finalTaxType = null;
    }

    let finalMinStock = dto.minStock !== undefined ? dto.minStock : product.minStock;
    let finalMaxStock = dto.maxStock !== undefined ? dto.maxStock : product.maxStock;
    let finalReorderLevel = dto.reorderLevel !== undefined ? dto.reorderLevel : product.reorderLevel;
    let finalValuationMethod = dto.valuationMethod !== undefined ? dto.valuationMethod : product.valuationMethod;

    let isService = dto.isService !== undefined ? dto.isService : product.isService;
    let isInventoryItem = dto.isInventoryItem !== undefined ? dto.isInventoryItem : product.isInventoryItem;

    if (isService === true || isInventoryItem === false) {
      finalMinStock = 0;
      finalMaxStock = 0;
      finalReorderLevel = 0;
      finalValuationMethod = 'NONE';
    }

    const dataToUpdate = {
      ...dto,
      sku: finalSku,
      gstRate: finalGstRate,
      taxRate: finalGstRate,
      hsnCode: finalHsnCode,
      taxCategory: finalTaxCategory,
      taxGroupId: finalTaxGroupId,
      taxType: finalTaxType,
      minStock: finalMinStock,
      maxStock: finalMaxStock,
      reorderLevel: finalReorderLevel,
      valuationMethod: finalValuationMethod,
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
