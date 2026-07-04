import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { companyId, sku: dto.sku },
      });
      if (existing) {
        throw new ConflictException(`Product with SKU '${dto.sku}' already exists`);
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
          sku: dto.sku || null,
          alias: dto.alias || null,
          barcode: dto.barcode || null,
          hsnCode: dto.hsnCode || null,
          eInvoiceHsn: dto.eInvoiceHsn || null,
          scheduleNo: dto.scheduleNo || null,
          itemType: dto.itemType || 'FINISHED_GOOD',
          weight: dto.weight || null,
          weightType: dto.weightType || null,
          taxRate: dto.taxRate || 0,
          gstRate: dto.gstRate || 0,
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

    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { companyId, sku: dto.sku, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Product with SKU '${dto.sku}' already exists`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto as any,
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
