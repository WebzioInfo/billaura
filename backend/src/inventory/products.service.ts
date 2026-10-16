import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import { AccountCategory } from '@prisma/client';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService
  ) { }

  private async validateAccountEligibility(
    companyId: string,
    accountId: string | null | undefined,
    field: string,
    allowedCategories: AccountCategory[]
  ): Promise<string | null> {
    if (!accountId || accountId.trim() === '') return null;
    const trimmedId = accountId.trim();
    const account = await this.prisma.account.findFirst({
      where: { id: trimmedId, companyId, deletedAt: null },
    });
    if (!account) {
      throw new BadRequestException(`Account specified for ${field} was not found or does not belong to active company.`);
    }
    if (account.isGroup) {
      throw new BadRequestException(`Account specified for ${field} is a group account. Please select a posting ledger account.`);
    }
    if (!allowedCategories.includes(account.category)) {
      throw new BadRequestException(`Account '${account.name}' (${account.category}) is not eligible for ${field}. Expected ${allowedCategories.join(' or ')}.`);
    }
    return account.id;
  }

  async findAll(query?: ProductQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const search = query?.search?.trim();
    const where: Prisma.ProductWhereInput = {
      companyId,
      deletedAt: null,
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

    const allowedSortFields = ['name', 'sku', 'sellingPrice', 'purchasePrice', 'createdAt', 'updatedAt'];
    const sortBy = query?.sortBy && allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';
    const orderBy: Prisma.ProductOrderByWithRelationInput = { [sortBy]: sortOrder };

    const isPaginated = query?.page !== undefined || query?.limit !== undefined;

    if (!isPaginated) {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.product.findMany({
          where,
          include: { stocks: true, category: true, brand: true },
          orderBy,
          take: 1000,
        }),
        this.prisma.product.count({ where }),
      ]);

      return toPaginatedResult(data, total, { page: 1, limit: total > 0 ? total : 25 } as any);
    }

    const { skip, take } = getPagination(query as any);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: { stocks: true, category: true, brand: true },
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return toPaginatedResult(data, total, query as any);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
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
    if (finalSku && finalSku.trim() !== '') {
      const existing = await this.prisma.product.findFirst({
        where: { companyId, sku: finalSku, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Product with SKU '${finalSku}' already exists`);
      }
    } else {
      finalSku = await this.sequenceService.generateNextSequence(companyId, 'SKU');
    }

    let finalGstRate = dto.gstRate || 0;
    const finalHsnCode = dto.hsnCode || null;
    let finalTaxPreference = dto.taxPreference || 'TAXABLE';

    if (dto.isTaxable === false || finalTaxPreference !== 'TAXABLE') {
      finalGstRate = 0;
      if (dto.isTaxable === false) finalTaxPreference = 'NON_GST';
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

    const validatedSalesAccountId = await this.validateAccountEligibility(
      companyId,
      dto.salesAccountId,
      'Sales Account',
      [AccountCategory.REVENUE]
    );

    const validatedPurchaseAccountId = await this.validateAccountEligibility(
      companyId,
      dto.purchaseAccountId,
      'Purchase Account',
      [AccountCategory.EXPENSE, AccountCategory.ASSET]
    );

    const validatedInventoryAccountId = await this.validateAccountEligibility(
      companyId,
      dto.inventoryAccountId,
      'Inventory Asset Account',
      [AccountCategory.ASSET]
    );

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name,
          description: dto.description || null,
          purchaseDescription: dto.purchaseDescription || null,
          categoryId: dto.categoryId || null,
          brandId: dto.brandId || null,
          unit: dto.unit || 'NOS',
          sku: finalSku,
          alias: dto.alias || null,
          barcode: dto.barcode || null,
          hsnCode: finalHsnCode,
          eInvoiceHsn: dto.eInvoiceHsn || null,
          scheduleNo: dto.scheduleNo || null,
          itemType: dto.itemType || 'FINISHED_GOOD',
          weight: dto.weight || null,
          weightType: dto.weightType || null,
          gstRate: finalGstRate,
          taxPreference: finalTaxPreference,
          purchasePrice: dto.purchasePrice || 0,
          sellingPrice: dto.sellingPrice || 0,
          minStock: finalMinStock,
          maxStock: finalMaxStock,
          reorderLevel: finalReorderLevel,
          pluNo: dto.pluNo || null,
          valuationMethod: finalValuationMethod,
          salesAccountId: validatedSalesAccountId,
          purchaseAccountId: validatedPurchaseAccountId,
          inventoryAccountId: validatedInventoryAccountId,
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

      // Handle Inventory Tracking & Opening Stock initialization
      const isTrackStock = dto.isTrackStock !== false && dto.isInventoryItem !== false && dto.isService !== true;

      if (isTrackStock) {
        // Find or ensure default warehouse
        let defaultWh = await tx.warehouse.findFirst({
          where: { companyId, isDefault: true },
        });

        if (!defaultWh) {
          defaultWh = await tx.warehouse.findFirst({
            where: { companyId },
          });
        }

        const openingQty = Number(dto.openingStock) || 0;
        const openingRate = Number(dto.openingStockRate) || Number(dto.purchasePrice) || 0;

        if (defaultWh) {
          await tx.stock.create({
            data: {
              companyId,
              productId: product.id,
              warehouseId: defaultWh.id,
              quantity: openingQty,
              availableQuantity: openingQty,
              averageCost: openingRate,
            },
          });

          // If positive opening stock, create auditable StockLedger entry
          if (openingQty > 0) {
            await tx.stockLedger.create({
              data: {
                companyId,
                productId: product.id,
                type: 'OPENING_STOCK',
                quantityBefore: 0,
                quantityChange: openingQty,
                quantityAfter: openingQty,
                averageCost: openingRate,
                referenceType: 'OPENING_STOCK',
                referenceId: product.id,
                notes: 'Initial opening stock balance',
                date: new Date(),
              },
            });
          }
        }
      }

      const fullProduct = await tx.product.findUnique({
        where: { id: product.id },
        include: { stocks: true, category: true, brand: true },
      });

      return fullProduct || product;
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Preserve existing SKU unless explicitly updated
    let finalSku = product.sku;
    if (dto.sku !== undefined) {
      if (dto.sku && dto.sku.trim() !== '') {
        const trimmedSku = dto.sku.trim();
        if (trimmedSku !== product.sku) {
          const existing = await this.prisma.product.findFirst({
            where: { companyId, sku: trimmedSku, NOT: { id }, deletedAt: null },
          });
          if (existing) {
            throw new ConflictException(`Product with SKU '${trimmedSku}' already exists`);
          }
          finalSku = trimmedSku;
        }
      }
    }

    let finalGstRate = dto.gstRate !== undefined ? dto.gstRate : Number(product.gstRate || 0);
    const finalHsnCode = dto.hsnCode !== undefined ? (dto.hsnCode || null) : product.hsnCode;
    let finalTaxPreference = dto.taxPreference !== undefined ? dto.taxPreference : product.taxPreference;

    const isTaxable = dto.isTaxable !== undefined ? dto.isTaxable : product.isTaxable;

    if (isTaxable === false || finalTaxPreference !== 'TAXABLE') {
      finalGstRate = 0;
      if (isTaxable === false) finalTaxPreference = 'NON_GST';
    }

    let finalMinStock = dto.minStock !== undefined ? dto.minStock : Number(product.minStock || 0);
    let finalMaxStock = dto.maxStock !== undefined ? dto.maxStock : Number(product.maxStock || 0);
    let finalReorderLevel = dto.reorderLevel !== undefined ? dto.reorderLevel : Number(product.reorderLevel || 0);
    let finalValuationMethod = dto.valuationMethod !== undefined ? dto.valuationMethod : product.valuationMethod;

    const isService = dto.isService !== undefined ? dto.isService : product.isService;
    const isInventoryItem = dto.isInventoryItem !== undefined ? dto.isInventoryItem : product.isInventoryItem;

    if (isService === true || isInventoryItem === false) {
      finalMinStock = 0;
      finalMaxStock = 0;
      finalReorderLevel = 0;
      finalValuationMethod = 'NONE';
    }

    let validatedSalesAccountId: string | null | undefined = undefined;
    if (dto.salesAccountId !== undefined) {
      validatedSalesAccountId = await this.validateAccountEligibility(
        companyId,
        dto.salesAccountId,
        'Sales Account',
        [AccountCategory.REVENUE]
      );
    }

    let validatedPurchaseAccountId: string | null | undefined = undefined;
    if (dto.purchaseAccountId !== undefined) {
      validatedPurchaseAccountId = await this.validateAccountEligibility(
        companyId,
        dto.purchaseAccountId,
        'Purchase Account',
        [AccountCategory.EXPENSE, AccountCategory.ASSET]
      );
    }

    let validatedInventoryAccountId: string | null | undefined = undefined;
    if (dto.inventoryAccountId !== undefined) {
      validatedInventoryAccountId = await this.validateAccountEligibility(
        companyId,
        dto.inventoryAccountId,
        'Inventory Asset Account',
        [AccountCategory.ASSET]
      );
    }

    if (dto.isTrackStock !== undefined && dto.isTrackStock !== product.isTrackStock) {
      const hasTransactions = await this.prisma.stockLedger.findFirst({
        where: { companyId, productId: id },
      });
      if (hasTransactions) {
        throw new BadRequestException("You cannot change inventory tracking once transactions exist for this item");
      }
    }

    const dataToUpdate: Prisma.ProductUncheckedUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description || null }),
      ...(dto.purchaseDescription !== undefined && { purchaseDescription: dto.purchaseDescription || null }),
      ...(dto.alias !== undefined && { alias: dto.alias || null }),
      ...(dto.unit !== undefined && { unit: dto.unit }),
      ...(dto.barcode !== undefined && { barcode: dto.barcode || null }),
      ...(dto.eInvoiceHsn !== undefined && { eInvoiceHsn: dto.eInvoiceHsn || null }),
      ...(dto.scheduleNo !== undefined && { scheduleNo: dto.scheduleNo || null }),
      ...(dto.itemType !== undefined && { itemType: dto.itemType }),
      ...(dto.weight !== undefined && { weight: dto.weight || null }),
      ...(dto.weightType !== undefined && { weightType: dto.weightType || null }),
      ...(dto.purchasePrice !== undefined && { purchasePrice: dto.purchasePrice }),
      ...(dto.sellingPrice !== undefined && { sellingPrice: dto.sellingPrice }),
      ...(dto.pluNo !== undefined && { pluNo: dto.pluNo || null }),
      ...(dto.salesAccountId !== undefined && { salesAccountId: validatedSalesAccountId }),
      ...(dto.purchaseAccountId !== undefined && { purchaseAccountId: validatedPurchaseAccountId }),
      ...(dto.inventoryAccountId !== undefined && { inventoryAccountId: validatedInventoryAccountId }),
      ...(dto.isPurchasable !== undefined && { isPurchasable: dto.isPurchasable }),
      ...(dto.isSellable !== undefined && { isSellable: dto.isSellable }),
      ...(dto.isInventoryItem !== undefined && { isInventoryItem: dto.isInventoryItem }),
      ...(dto.isTaxable !== undefined && { isTaxable: dto.isTaxable }),
      ...(dto.isTrackStock !== undefined && { isTrackStock: dto.isTrackStock }),
      ...(dto.isTrackBatch !== undefined && { isTrackBatch: dto.isTrackBatch }),
      ...(dto.isTrackSerial !== undefined && { isTrackSerial: dto.isTrackSerial }),
      ...(dto.isManufactured !== undefined && { isManufactured: dto.isManufactured }),
      ...(dto.isService !== undefined && { isService: dto.isService }),
      ...(dto.isDigital !== undefined && { isDigital: dto.isDigital }),
      ...(dto.isAsset !== undefined && { isAsset: dto.isAsset }),
      ...(dto.isExpense !== undefined && { isExpense: dto.isExpense }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),

      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId || null }),
      ...(dto.brandId !== undefined && { brandId: dto.brandId || null }),

      sku: finalSku,
      gstRate: finalGstRate,
      hsnCode: finalHsnCode,
      taxPreference: finalTaxPreference,
      minStock: finalMinStock,
      maxStock: finalMaxStock,
      reorderLevel: finalReorderLevel,
      valuationMethod: finalValuationMethod,
    };

    return this.prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: { category: true, brand: true, stocks: true },
    });
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    const [invoiceCount, purchaseCount] = await Promise.all([
      this.prisma.invoiceItem.count({ where: { productId: id } }),
      this.prisma.purchaseItem.count({ where: { productId: id } }),
    ]);

    if (invoiceCount > 0 || purchaseCount > 0) {
      throw new ConflictException(
        `Cannot delete product "${product.name}" because it is referenced in historical sales invoices (${invoiceCount}) or purchase bills (${purchaseCount}).`
      );
    }

    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getIntelligence(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        category: true,
        brand: true,
        stocks: true,
        stockLedgers: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const sellingPrice = Number(product.sellingPrice || 0);
    const purchasePrice = Number(product.purchasePrice || 0);
    const grossProfit = sellingPrice - purchasePrice;
    const marginPercentage = sellingPrice > 0 ? ((grossProfit / sellingPrice) * 100).toFixed(2) : '0.00';

    const totalStock = product.stocks.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
    const availableStock = product.stocks.reduce((acc, curr) => acc + Number(curr.availableQuantity || 0), 0);
    const reservedStock = product.stocks.reduce((acc, curr) => acc + Number(curr.reservedQuantity || 0), 0);

    const reorderLevel = Number(product.reorderLevel || 0);
    let stockStatus = 'IN_STOCK';
    if (totalStock === 0) stockStatus = 'OUT_OF_STOCK';
    else if (totalStock <= reorderLevel) stockStatus = 'LOW_STOCK';

    return {
      product,
      metrics: {
        sellingPrice,
        purchasePrice,
        grossProfit,
        marginPercentage: Number(marginPercentage),
        totalStock,
        availableStock,
        reservedStock,
        reorderLevel,
        stockStatus,
        stockValuation: totalStock * purchasePrice,
      },
      warehouseStock: product.stocks,
      recentMovements: product.stockLedgers,
    };
  }
}
