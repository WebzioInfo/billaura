import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { StockAdjustmentType } from './dto/stock-adjust.dto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;

  const mockCompanyId = 'comp-tenant-001';
  const otherCompanyId = 'comp-tenant-002';

  const mockWarehouse = {
    id: 'wh-001',
    companyId: mockCompanyId,
    name: 'Main Warehouse',
    location: 'Building A',
    isDefault: true,
    deletedAt: null,
  };

  const mockProduct = {
    id: 'prod-001',
    companyId: mockCompanyId,
    name: 'Widget Pro',
    sku: 'WDG-001',
    unit: 'PCS',
    purchasePrice: 100,
    sellingPrice: 150,
    reorderLevel: 10,
    deletedAt: null,
    category: { id: 'cat-001', name: 'Electronics' },
    brand: null,
    stocks: [],
  };

  beforeEach(async () => {
    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);

    prisma = {
      warehouse: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      stock: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      stockLedger: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((cbOrArray) => {
        if (typeof cbOrArray === 'function') {
          return cbOrArray(prisma);
        }
        return Promise.all(cbOrArray);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('adjustStock', () => {
    it('1. Successfully adds stock to existing stock and records StockLedger', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);

      const existingStock = {
        id: 'stock-001',
        companyId: mockCompanyId,
        productId: mockProduct.id,
        warehouseId: mockWarehouse.id,
        quantity: 50,
        availableQuantity: 50,
        averageCost: 100,
      };
      prisma.stock.findFirst.mockResolvedValue(existingStock);
      prisma.stock.update.mockResolvedValue({ ...existingStock, quantity: 70, availableQuantity: 70 });
      prisma.stockLedger.create.mockResolvedValue({ id: 'ledger-001' });

      const result = await service.adjustStock({
        productId: mockProduct.id,
        warehouseId: mockWarehouse.id,
        adjustmentType: StockAdjustmentType.ADD,
        adjustmentQuantity: 20,
        reason: 'Restocking',
        notes: 'Invoice #1234',
      });

      expect(prisma.stock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingStock.id },
          data: { quantity: 70, availableQuantity: 70 },
        }),
      );

      expect(prisma.stockLedger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          productId: mockProduct.id,
          type: 'ADJUSTMENT',
          quantityBefore: 50,
          quantityChange: 20,
          quantityAfter: 70,
          referenceId: mockWarehouse.id,
          referenceType: 'STOCK_ADJUSTMENT',
          notes: expect.stringContaining('Restocking'),
        }),
      });

      expect(result.quantity).toBe(70);
    });

    it('2. Successfully removes stock when sufficient quantity exists', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);

      const existingStock = {
        id: 'stock-001',
        companyId: mockCompanyId,
        productId: mockProduct.id,
        warehouseId: mockWarehouse.id,
        quantity: 50,
        availableQuantity: 50,
        averageCost: 100,
      };
      prisma.stock.findFirst.mockResolvedValue(existingStock);
      prisma.stock.update.mockResolvedValue({ ...existingStock, quantity: 35, availableQuantity: 35 });
      prisma.stockLedger.create.mockResolvedValue({ id: 'ledger-002' });

      const result = await service.adjustStock({
        productId: mockProduct.id,
        warehouseId: mockWarehouse.id,
        adjustmentType: StockAdjustmentType.REMOVE,
        adjustmentQuantity: 15,
        reason: 'Damaged Goods Write-off',
      });

      expect(prisma.stock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { quantity: 35, availableQuantity: 35 },
        }),
      );
      expect(prisma.stockLedger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantityBefore: 50,
          quantityChange: -15,
          quantityAfter: 35,
        }),
      });
      expect(result.quantity).toBe(35);
    });

    it('3. Rejects removal if it results in negative stock', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);

      const existingStock = {
        id: 'stock-001',
        companyId: mockCompanyId,
        productId: mockProduct.id,
        warehouseId: mockWarehouse.id,
        quantity: 10,
        availableQuantity: 10,
      };
      prisma.stock.findFirst.mockResolvedValue(existingStock);

      await expect(
        service.adjustStock({
          productId: mockProduct.id,
          warehouseId: mockWarehouse.id,
          adjustmentType: StockAdjustmentType.REMOVE,
          adjustmentQuantity: 25,
          reason: 'Excess removal',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.stock.update).not.toHaveBeenCalled();
      expect(prisma.stockLedger.create).not.toHaveBeenCalled();
    });

    it('4. Successfully sets actual stock based on physical count variance', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);

      const existingStock = {
        id: 'stock-001',
        companyId: mockCompanyId,
        productId: mockProduct.id,
        warehouseId: mockWarehouse.id,
        quantity: 100,
        availableQuantity: 100,
      };
      prisma.stock.findFirst.mockResolvedValue(existingStock);
      prisma.stock.update.mockResolvedValue({ ...existingStock, quantity: 92, availableQuantity: 92 });

      await service.adjustStock({
        productId: mockProduct.id,
        warehouseId: mockWarehouse.id,
        adjustmentType: StockAdjustmentType.SET_ACTUAL,
        targetQuantity: 92,
        reason: 'Physical Audit Variance',
      });

      expect(prisma.stock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { quantity: 92, availableQuantity: 92 },
        }),
      );
      expect(prisma.stockLedger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantityBefore: 100,
          quantityChange: -8,
          quantityAfter: 92,
        }),
      });
    });

    it('5. Creates new stock record if product had no stock record in warehouse yet', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      prisma.stock.findFirst.mockResolvedValue(null);
      prisma.stock.create.mockResolvedValue({
        id: 'new-stock-001',
        companyId: mockCompanyId,
        productId: mockProduct.id,
        warehouseId: mockWarehouse.id,
        quantity: 25,
        availableQuantity: 25,
      });

      const result = await service.adjustStock({
        productId: mockProduct.id,
        warehouseId: mockWarehouse.id,
        adjustmentType: StockAdjustmentType.ADD,
        adjustmentQuantity: 25,
        reason: 'Initial stock intake',
      });

      expect(prisma.stock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: mockCompanyId,
            productId: mockProduct.id,
            warehouseId: mockWarehouse.id,
            quantity: 25,
          }),
        }),
      );
      expect(prisma.stockLedger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantityBefore: 0,
          quantityChange: 25,
          quantityAfter: 25,
        }),
      });
      expect(result.quantity).toBe(25);
    });

    it('6. Rejects negative target quantity in Set Actual Stock', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);

      await expect(
        service.adjustStock({
          productId: mockProduct.id,
          warehouseId: mockWarehouse.id,
          adjustmentType: StockAdjustmentType.SET_ACTUAL,
          targetQuantity: -5,
          reason: 'Invalid count',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStocks', () => {
    it('1. Returns all eligible products and synthesizes 0 stock for items without a stock row', async () => {
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      prisma.warehouse.findMany.mockResolvedValue([mockWarehouse]);

      const productWithoutStock = {
        ...mockProduct,
        id: 'prod-no-stock',
        name: 'Item With No Stock Row',
        stocks: [],
      };

      prisma.product.findMany.mockResolvedValue([productWithoutStock]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.getStocks({ warehouseId: mockWarehouse.id } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].product.name).toBe('Item With No Stock Row');
      expect(result.data[0].quantity).toBe(0);
      expect(result.data[0].warehouse.name).toBe(mockWarehouse.name);
      expect(result.data[0].isVirtual).toBe(true);
      expect(result.meta.total).toBe(1);
    });

    it('2. Returns warehouse stock record if product already has a stock row in that warehouse', async () => {
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      prisma.warehouse.findMany.mockResolvedValue([mockWarehouse]);

      const productWithStock = {
        ...mockProduct,
        stocks: [
          {
            id: 'stock-real-001',
            quantity: 42,
            availableQuantity: 42,
            averageCost: 110,
            warehouseId: mockWarehouse.id,
            warehouse: mockWarehouse,
          },
        ],
      };

      prisma.product.findMany.mockResolvedValue([productWithStock]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.getStocks({ warehouseId: mockWarehouse.id } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].quantity).toBe(42);
      expect(result.data[0].averageCost).toBe(110);
      expect(result.data[0].stockValue).toBe(42 * 110);
      expect(result.data[0].isVirtual).toBe(false);
    });
  });

  describe('getTransactions', () => {
    it('1. Returns paginated stock ledgers for a product', async () => {
      const mockLedger = {
        id: 'ledger-001',
        companyId: mockCompanyId,
        productId: mockProduct.id,
        type: 'ADJUSTMENT',
        quantityBefore: 0,
        quantityChange: 10,
        quantityAfter: 10,
        notes: '[Reason: Initial Stock]',
        date: new Date(),
        product: { id: mockProduct.id, name: mockProduct.name, sku: mockProduct.sku, unit: 'PCS' },
      };

      prisma.stockLedger.findMany.mockResolvedValue([mockLedger]);
      prisma.stockLedger.count.mockResolvedValue(1);

      const result = await service.getTransactions(mockProduct.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].quantityChange).toBe(10);
      expect(result.meta.total).toBe(1);
    });
  });
});
