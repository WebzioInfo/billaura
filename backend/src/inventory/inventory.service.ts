import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StockAdjustDto, StockAdjustmentType, StockQueryDto } from './dto/stock-adjust.dto';
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

    if (!dto.productId) {
      throw new BadRequestException('Product ID is required');
    }
    if (!dto.warehouseId) {
      throw new BadRequestException('Warehouse ID is required');
    }

    // Check product exists and belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    // Check warehouse exists and belongs to company
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId, deletedAt: null },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${dto.warehouseId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Find existing stock entry
      const existingStock = await tx.stock.findFirst({
        where: { companyId, productId: dto.productId, warehouseId: dto.warehouseId, deletedAt: null },
      });

      const qtyBefore = existingStock ? Number(existingStock.quantity) : 0;
      let qtyChange = 0;

      // Handle explicit adjustment types
      if (dto.adjustmentType === StockAdjustmentType.ADD) {
        const addQty = Math.abs(dto.adjustmentQuantity ?? dto.quantityChange ?? 0);
        if (addQty <= 0) {
          throw new BadRequestException('Adjustment quantity must be greater than zero for Add Stock');
        }
        qtyChange = addQty;
      } else if (dto.adjustmentType === StockAdjustmentType.REMOVE) {
        const removeQty = Math.abs(dto.adjustmentQuantity ?? dto.quantityChange ?? 0);
        if (removeQty <= 0) {
          throw new BadRequestException('Adjustment quantity must be greater than zero for Remove Stock');
        }
        qtyChange = -removeQty;
      } else if (dto.adjustmentType === StockAdjustmentType.SET_ACTUAL) {
        const targetQty = dto.targetQuantity !== undefined ? Number(dto.targetQuantity) : Number(dto.adjustmentQuantity ?? 0);
        if (targetQty < 0) {
          throw new BadRequestException('Final physical stock count cannot be negative');
        }
        qtyChange = targetQty - qtyBefore;
      } else {
        // Fallback to direct quantityChange if adjustmentType is not specified
        qtyChange = Number(dto.quantityChange ?? 0);
        if (isNaN(qtyChange)) {
          throw new BadRequestException('Invalid quantity change specified');
        }
      }

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
          include: { product: true, warehouse: true },
        });
      } else {
        stock = await tx.stock.create({
          data: {
            companyId,
            productId: dto.productId,
            warehouseId: dto.warehouseId,
            quantity: qtyAfter,
            availableQuantity: qtyAfter,
            averageCost: Number(product.purchasePrice || 0),
          },
          include: { product: true, warehouse: true },
        });
      }

      const reasonHeader = dto.reason?.trim() || (dto.adjustmentType ? `Manual Stock ${dto.adjustmentType}` : 'Manual Adjustment');
      const notesDetails = dto.notes?.trim() || dto.reference?.trim() || '';
      const formattedNotes = notesDetails ? `[Reason: ${reasonHeader}] ${notesDetails}` : `[Reason: ${reasonHeader}]`;

      // Log auditable StockLedger entry
      await tx.stockLedger.create({
        data: {
          companyId,
          productId: dto.productId,
          type: 'ADJUSTMENT',
          quantityBefore: qtyBefore,
          quantityChange: qtyChange,
          quantityAfter: qtyAfter,
          averageCost: existingStock?.averageCost ?? product.purchasePrice ?? 0,
          referenceId: dto.warehouseId,
          referenceType: 'STOCK_ADJUSTMENT',
          notes: formattedNotes,
          date: new Date(),
        },
      });

      return stock;
    });
  }

  async getStocks(query: StockQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // 1. Ensure at least one default warehouse exists for the company
    let defaultWh = await this.prisma.warehouse.findFirst({
      where: { companyId, isDefault: true, deletedAt: null },
    });
    if (!defaultWh) {
      defaultWh = await this.prisma.warehouse.findFirst({
        where: { companyId, deletedAt: null },
      });
    }
    if (!defaultWh) {
      defaultWh = await this.prisma.warehouse.create({
        data: { companyId, name: 'Main Warehouse', isDefault: true },
      });
      // Link any orphaned stocks with null warehouseId
      await this.prisma.stock.updateMany({
        where: { companyId, warehouseId: null },
        data: { warehouseId: defaultWh.id },
      });
    }

    // 2. Fetch all active warehouses for this company
    const allWarehouses = await this.prisma.warehouse.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    const warehouseMap = new Map(allWarehouses.map((w) => [w.id, w]));

    const { skip, take } = getPagination(query);

    const search = query.search?.trim();
    const categoryId = query.categoryId && query.categoryId !== 'ALL' ? query.categoryId : undefined;
    const targetWarehouseId = query.warehouseId && query.warehouseId !== 'ALL' ? query.warehouseId : undefined;

    // Base product query condition (catalog items belonging to tenant)
    const productWhere: Prisma.ProductWhereInput = {
      companyId,
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (targetWarehouseId) {
      // Specific warehouse requested:
      // Every eligible product is shown with its stock in that warehouse (or 0 if not present)
      const [products, total] = await this.prisma.$transaction([
        this.prisma.product.findMany({
          where: productWhere,
          skip,
          take,
          include: {
            category: true,
            brand: true,
            stocks: {
              where: { warehouseId: targetWarehouseId, deletedAt: null },
            },
          },
          orderBy: { name: 'asc' },
        }),
        this.prisma.product.count({ where: productWhere }),
      ]);

      const targetWh = warehouseMap.get(targetWarehouseId) || defaultWh;

      const rows = products.map((prod) => {
        const stock = prod.stocks[0];
        const quantity = stock ? Number(stock.quantity) : 0;
        const averageCost = stock && Number(stock.averageCost) > 0 ? Number(stock.averageCost) : Number(prod.purchasePrice || 0);
        const stockValue = quantity > 0 ? quantity * averageCost : 0;

        return {
          id: stock ? stock.id : `virtual-${prod.id}-${targetWarehouseId}`,
          productId: prod.id,
          warehouseId: targetWarehouseId,
          quantity,
          averageCost,
          stockValue,
          unit: prod.unit || 'PCS',
          product: {
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            barcode: prod.barcode,
            unit: prod.unit || 'PCS',
            purchasePrice: Number(prod.purchasePrice || 0),
            sellingPrice: Number(prod.sellingPrice || 0),
            reorderLevel: Number(prod.reorderLevel || 0),
            category: prod.category ? { id: prod.category.id, name: prod.category.categoryName } : null,
            brand: prod.brand ? { id: prod.brand.id, name: prod.brand.brandName } : null,
          },
          warehouse: {
            id: targetWh.id,
            name: targetWh.name,
            location: targetWh.location,
            isDefault: targetWh.isDefault,
          },
          isVirtual: !stock,
        };
      });

      return toPaginatedResult(rows, total, query);
    }

    // ALL Warehouses (or no warehouse filter specified):
    // Show all products. If a product has stock records across warehouses, show each warehouse record.
    // If a product has no stock record in any warehouse, show it under defaultWh with 0 stock.
    const [products, totalProducts] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: productWhere,
        skip,
        take,
        include: {
          category: true,
          brand: true,
          stocks: {
            where: { deletedAt: null },
            include: { warehouse: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where: productWhere }),
    ]);

    const rows: any[] = [];
    for (const prod of products) {
      if (prod.stocks.length === 0) {
        const averageCost = Number(prod.purchasePrice || 0);
        rows.push({
          id: `virtual-${prod.id}-${defaultWh.id}`,
          productId: prod.id,
          warehouseId: defaultWh.id,
          quantity: 0,
          averageCost,
          stockValue: 0,
          unit: prod.unit || 'PCS',
          product: {
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            barcode: prod.barcode,
            unit: prod.unit || 'PCS',
            purchasePrice: Number(prod.purchasePrice || 0),
            sellingPrice: Number(prod.sellingPrice || 0),
            reorderLevel: Number(prod.reorderLevel || 0),
            category: prod.category ? { id: prod.category.id, name: prod.category.categoryName } : null,
            brand: prod.brand ? { id: prod.brand.id, name: prod.brand.brandName } : null,
          },
          warehouse: {
            id: defaultWh.id,
            name: defaultWh.name,
            location: defaultWh.location,
            isDefault: defaultWh.isDefault,
          },
          isVirtual: true,
        });
      } else {
        for (const stock of prod.stocks) {
          const wh = stock.warehouse || (stock.warehouseId ? warehouseMap.get(stock.warehouseId) : null) || defaultWh;
          const quantity = Number(stock.quantity);
          const averageCost = Number(stock.averageCost) > 0 ? Number(stock.averageCost) : Number(prod.purchasePrice || 0);
          const stockValue = quantity > 0 ? quantity * averageCost : 0;

          rows.push({
            id: stock.id,
            productId: prod.id,
            warehouseId: wh.id,
            quantity,
            averageCost,
            stockValue,
            unit: prod.unit || 'PCS',
            product: {
              id: prod.id,
              name: prod.name,
              sku: prod.sku,
              barcode: prod.barcode,
              unit: prod.unit || 'PCS',
              purchasePrice: Number(prod.purchasePrice || 0),
              sellingPrice: Number(prod.sellingPrice || 0),
              reorderLevel: Number(prod.reorderLevel || 0),
              category: prod.category ? { id: prod.category.id, name: prod.category.categoryName } : null,
              brand: prod.brand ? { id: prod.brand.id, name: prod.brand.brandName } : null,
            },
            warehouse: {
              id: wh.id,
              name: wh.name,
              location: wh.location,
              isDefault: wh.isDefault,
            },
            isVirtual: false,
          });
        }
      }
    }

    return toPaginatedResult(rows, totalProducts, query);
  }

  async getTransactions(productId?: string, warehouseId?: string, query?: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query || ({} as any));

    const where: Prisma.StockLedgerWhereInput = {
      companyId,
      deletedAt: null,
      ...(productId ? { productId } : {}),
      ...(warehouseId ? { referenceId: warehouseId } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockLedger.findMany({
        where,
        skip,
        take,
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true, purchasePrice: true },
          },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.stockLedger.count({ where }),
    ]);

    return toPaginatedResult(data, total, query || ({} as any));
  }
}
