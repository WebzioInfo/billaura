import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StockAdjustDto } from './dto/stock-adjust.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async adjustStock(dto: StockAdjustDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Check product and warehouse exist
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${dto.warehouseId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Find existing stock entry
      const existingStock = await tx.stock.findFirst({
        where: { companyId, productId: dto.productId, warehouseId: dto.warehouseId },
      });

      const qtyBefore = existingStock ? Number(existingStock.quantity) : 0;
      const qtyChange = Number(dto.quantityChange);
      const qtyAfter = qtyBefore + qtyChange;

      if (qtyAfter < 0) {
        throw new ConflictException(`Adjustment results in negative stock (${qtyAfter}) in warehouse '${warehouse.name}'`);
      }

      let stock;
      if (existingStock) {
        stock = await tx.stock.update({
          where: { id: existingStock.id },
          data: {
            quantity: qtyAfter,
            availableQuantity: qtyAfter,
          },
        });
      } else {
        stock = await tx.stock.create({
          data: {
            companyId,
            productId: dto.productId,
            warehouseId: dto.warehouseId,
            quantity: qtyAfter,
            availableQuantity: qtyAfter,
          },
        });
      }

      // Log stock movement
      await tx.stockMovement.create({
        data: {
          companyId,
          productId: dto.productId,
          type: 'ADJUSTMENT',
          quantity: Math.abs(qtyChange),
          referenceId: null,
        },
      });

      // Log stock audit log
      await tx.stockLog.create({
        data: {
          companyId,
          productId: dto.productId,
          type: 'ADJUSTMENT',
          quantityBefore: qtyBefore,
          quantityChange: qtyChange,
          quantityAfter: qtyAfter,
          notes: dto.notes || 'Manual inventory adjustment',
        },
      });

      return stock;
    });
  }

  async getStocks(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.StockWhereInput = {
      companyId,
      product: {
        deletedAt: null,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search } },
                { sku: { contains: query.search } },
              ],
            }
          : {}),
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.stock.findMany({
        where,
        skip,
        take,
        include: { product: true, warehouse: true },
      }),
      this.prisma.stock.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }
}
