import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../database/prisma.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { CompanyContext } from '../common/context/company-context';
import { AccountCategory } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('ProductsService & Accounting Integration', () => {
  let service: ProductsService;
  let prisma: any;
  let sequenceService: any;

  const mockCompanyId = 'comp-tenant-001';
  const otherCompanyId = 'comp-tenant-002';

  const mockSalesAccount = {
    id: 'acc-sales-1',
    companyId: mockCompanyId,
    name: 'Sales Revenue',
    category: AccountCategory.REVENUE,
    isGroup: false,
    deletedAt: null,
  };

  const mockPurchaseAccount = {
    id: 'acc-cogs-1',
    companyId: mockCompanyId,
    name: 'Cost of Goods Sold',
    category: AccountCategory.EXPENSE,
    isGroup: false,
    deletedAt: null,
  };

  const mockInventoryAssetAccount = {
    id: 'acc-inv-1',
    companyId: mockCompanyId,
    name: 'Inventory Asset',
    category: AccountCategory.ASSET,
    isGroup: false,
    deletedAt: null,
  };

  const mockGroupAccount = {
    id: 'acc-group-1',
    companyId: mockCompanyId,
    name: 'Current Assets Group',
    category: AccountCategory.ASSET,
    isGroup: true,
    deletedAt: null,
  };

  const mockCrossTenantAccount = {
    id: 'acc-other-tenant',
    companyId: otherCompanyId,
    name: 'Other Tenant Revenue',
    category: AccountCategory.REVENUE,
    isGroup: false,
    deletedAt: null,
  };

  const mockDeletedAccount = {
    id: 'acc-deleted',
    companyId: mockCompanyId,
    name: 'Archived Revenue',
    category: AccountCategory.REVENUE,
    isGroup: false,
    deletedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      account: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      warehouse: {
        findFirst: jest.fn(),
      },
      stock: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cbOrArray) => {
        if (typeof cbOrArray === 'function') {
          return cbOrArray(prisma);
        }
        return Promise.all(cbOrArray);
      }),
    };

    sequenceService = {
      generateNextSequence: jest.fn().mockResolvedValue('SKU-000100'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SequenceService, useValue: sequenceService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Account Eligibility Validation', () => {
    it('1. Rejects non-existent or wrong company account IDs', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'Premium Widget',
          salesAccountId: 'acc-non-existent',
        } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('2. Rejects cross-tenant account IDs', async () => {
      prisma.account.findFirst.mockImplementation(({ where }: any) => {
        if (where.companyId === mockCompanyId && where.id === mockCrossTenantAccount.id) {
          return null; // Tenant isolation enforces not found for current companyId
        }
        return null;
      });

      await expect(
        service.create({
          name: 'Cross Tenant Widget',
          salesAccountId: mockCrossTenantAccount.id,
        } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('3. Rejects group accounts from posting ledger mapping', async () => {
      prisma.account.findFirst.mockResolvedValue(mockGroupAccount);

      await expect(
        service.create({
          name: 'Group Asset Product',
          inventoryAccountId: mockGroupAccount.id,
        } as any)
      ).rejects.toThrow(/group account/);
    });

    it('4. Rejects accounts with mismatched category types', async () => {
      // Trying to assign an ASSET account as a Sales (REVENUE) account
      prisma.account.findFirst.mockResolvedValue(mockInventoryAssetAccount);

      await expect(
        service.create({
          name: 'Wrong Category Product',
          salesAccountId: mockInventoryAssetAccount.id,
        } as any)
      ).rejects.toThrow(/not eligible for Sales Account/);
    });

    it('5. Allows valid REVENUE, EXPENSE, and ASSET accounts', async () => {
      prisma.account.findFirst.mockImplementation(({ where }: any) => {
        if (where.id === mockSalesAccount.id) return mockSalesAccount;
        if (where.id === mockPurchaseAccount.id) return mockPurchaseAccount;
        if (where.id === mockInventoryAssetAccount.id) return mockInventoryAssetAccount;
        return null;
      });

      prisma.product.findFirst.mockResolvedValue(null); // No existing SKU
      const createdRecord = {
        id: 'prod-new-1',
        name: 'Valid Product',
        sku: 'SKU-000100',
        companyId: mockCompanyId,
        salesAccountId: mockSalesAccount.id,
        purchaseAccountId: mockPurchaseAccount.id,
        inventoryAccountId: mockInventoryAssetAccount.id,
      };
      prisma.product.create.mockResolvedValue(createdRecord);
      prisma.product.findUnique.mockResolvedValue({
        ...createdRecord,
        stocks: [],
        category: null,
        brand: null,
      });

      const res = await service.create({
        name: 'Valid Product',
        salesAccountId: mockSalesAccount.id,
        purchaseAccountId: mockPurchaseAccount.id,
        inventoryAccountId: mockInventoryAssetAccount.id,
      } as any);

      expect(res.id).toBe('prod-new-1');
      expect(res.salesAccountId).toBe(mockSalesAccount.id);
      expect(res.purchaseAccountId).toBe(mockPurchaseAccount.id);
      expect(res.inventoryAccountId).toBe(mockInventoryAssetAccount.id);
    });
  });

  describe('Product Creation and Catalog Visibility', () => {
    it('6. Successfully creates product and sets stock for default warehouse', async () => {
      prisma.account.findFirst.mockResolvedValue(null);
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-main', companyId: mockCompanyId });
      const createdRecord = {
        id: 'prod-100',
        name: 'Industrial Valve',
        sku: 'SKU-000100',
        companyId: mockCompanyId,
      };
      prisma.product.create.mockResolvedValue(createdRecord);
      prisma.product.findUnique.mockResolvedValue({
        ...createdRecord,
        stocks: [{ warehouseId: 'wh-main', quantity: 0 }],
        category: null,
        brand: null,
      });

      const res = await service.create({
        name: 'Industrial Valve',
      } as any);

      expect(res.id).toBe('prod-100');
      expect(prisma.stock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: mockCompanyId,
            productId: 'prod-100',
            warehouseId: 'wh-main',
          }),
        })
      );
    });

    it('7. Returns all products unpaginated ordered by createdAt desc by default', async () => {
      const mockProducts = [
        { id: 'p2', name: 'Zebra Product', createdAt: new Date('2026-10-12T10:00:00Z') },
        { id: 'p1', name: 'Alpha Product', createdAt: new Date('2026-10-10T10:00:00Z') },
      ];
      prisma.product.findMany.mockResolvedValue(mockProducts);
      prisma.product.count.mockResolvedValue(2);

      const res = await service.findAll({});

      expect(res.data).toHaveLength(2);
      expect(res.data[0].id).toBe('p2'); // Newly created product at the top
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: mockCompanyId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        })
      );
    });

    it('8. Supports explicit server-side pagination when page or limit is provided', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Product 1' }]);
      prisma.product.count.mockResolvedValue(50);

      const res = await service.findAll({ page: 2, limit: 10 });

      expect(res.meta.page).toBe(2);
      expect(res.meta.limit).toBe(10);
      expect(res.meta.total).toBe(50);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('9. Preserves correct accounting for service items (valuationMethod NONE)', async () => {
      const createdRecord = {
        id: 'serv-1',
        name: 'Consulting Service',
        isService: true,
        valuationMethod: 'NONE',
        minStock: 0,
        maxStock: 0,
      };
      prisma.product.create.mockResolvedValue(createdRecord);
      prisma.product.findUnique.mockResolvedValue(createdRecord);

      const res = await service.create({
        name: 'Consulting Service',
        isService: true,
        minStock: 50, // Should be overridden to 0 for service
        valuationMethod: 'FIFO', // Should be overridden to NONE for service
      } as any);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valuationMethod: 'NONE',
            minStock: 0,
            maxStock: 0,
            reorderLevel: 0,
          }),
        })
      );
    });

    it('10. Validates account updates on product modification', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: 'prod-existing',
        companyId: mockCompanyId,
        sku: 'SKU-001',
      });
      prisma.account.findFirst.mockResolvedValue(null); // Invalid account

      await expect(
        service.update('prod-existing', {
          salesAccountId: 'invalid-acc-id',
        } as any)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
