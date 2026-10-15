import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../database/prisma.service';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { CommissionsService } from '../commissions/commissions.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { PdfEngineService } from './pdf-engine.service';
import { CompanyContext } from '../common/context/company-context';
import { BadRequestException } from '@nestjs/common';

describe('Invoice Stock Deduction & Inventory Integration Test Suite', () => {
  let service: InvoicesService;

  const mockCompanyId = 'cmp-tenant-alpha';
  const mockWarehouseId = 'wh-main-01';

  const mockCustomer = {
    id: 'cust-101',
    companyId: mockCompanyId,
    name: 'MegaCorp Retail',
    state: '27',
    taxPreference: 'TAXABLE',
    status: 'ACTIVE',
    receivableBalance: 0,
  };

  const mockCompany = {
    id: mockCompanyId,
    companyName: 'Bill Aura Corp',
    state: '27',
  };

  const mockTrackedProductA = {
    id: 'prod-water-01',
    companyId: mockCompanyId,
    name: 'Bottled Water 1L',
    gstRate: 18,
    isService: false,
    isInventoryItem: true,
    isTrackStock: true,
    taxPreference: 'TAXABLE',
  };

  const mockTrackedProductB = {
    id: 'prod-soda-02',
    companyId: mockCompanyId,
    name: 'Sparkling Soda 500ml',
    gstRate: 18,
    isService: false,
    isInventoryItem: true,
    isTrackStock: true,
    taxPreference: 'TAXABLE',
  };

  const mockServiceProduct = {
    id: 'prod-consulting-03',
    companyId: mockCompanyId,
    name: 'Consulting Service',
    gstRate: 18,
    isService: true,
    isInventoryItem: false,
    isTrackStock: false,
    taxPreference: 'TAXABLE',
  };

  let mockStocks: any[] = [];
  let mockStockLedgers: any[] = [];
  let mockInvoices: any[] = [];
  let invoiceCounter = 0;

  beforeEach(async () => {
    invoiceCounter = 0;
    mockStocks = [
      {
        id: 'stock-water-01',
        companyId: mockCompanyId,
        productId: mockTrackedProductA.id,
        warehouseId: mockWarehouseId,
        quantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0,
      },
      {
        id: 'stock-soda-02',
        companyId: mockCompanyId,
        productId: mockTrackedProductB.id,
        warehouseId: mockWarehouseId,
        quantity: 50,
        availableQuantity: 50,
        reservedQuantity: 0,
      },
    ];
    mockStockLedgers = [];
    mockInvoices = [];

    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);

    const mockTx: any = {
      product: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.companyId !== mockCompanyId) return Promise.resolve(null);
          if (where.id === mockTrackedProductA.id) return Promise.resolve(mockTrackedProductA);
          if (where.id === mockTrackedProductB.id) return Promise.resolve(mockTrackedProductB);
          if (where.id === mockServiceProduct.id) return Promise.resolve(mockServiceProduct);
          return Promise.resolve(null);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockTrackedProductA.id) return Promise.resolve(mockTrackedProductA);
          if (where.id === mockTrackedProductB.id) return Promise.resolve(mockTrackedProductB);
          if (where.id === mockServiceProduct.id) return Promise.resolve(mockServiceProduct);
          return Promise.resolve(null);
        }),
      },
      warehouse: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.companyId !== mockCompanyId) return Promise.resolve(null);
          return Promise.resolve({ id: mockWarehouseId, name: 'Main Warehouse', isDefault: true });
        }),
        create: jest.fn().mockResolvedValue({ id: mockWarehouseId, name: 'Main Warehouse', isDefault: true }),
      },
      stock: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.companyId !== mockCompanyId) return Promise.resolve(null);
          return Promise.resolve(
            mockStocks.find(
              (s) => s.productId === where.productId && (!where.warehouseId || s.warehouseId === where.warehouseId)
            ) || null
          );
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(mockStocks.find((s) => s.id === where.id) || null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const s = mockStocks.find((stock) => stock.id === where.id);
          if (s) {
            if (data.quantity?.increment !== undefined) {
              s.quantity += data.quantity.increment;
              s.availableQuantity += data.quantity.increment;
            } else if (data.quantity?.decrement !== undefined) {
              s.quantity -= data.quantity.decrement;
              s.availableQuantity -= data.quantity.decrement;
            } else if (typeof data.quantity === 'number') {
              s.quantity = data.quantity;
              s.availableQuantity = data.availableQuantity;
            }
            return Promise.resolve({ ...s });
          }
          return Promise.resolve(null);
        }),
        updateMany: jest.fn().mockImplementation(({ where, data }) => {
          const s = mockStocks.find((stock) => stock.id === where.id);
          if (!s) return Promise.resolve({ count: 0 });

          // Check conditional constraints for atomic deduction
          if (where.quantity?.gte !== undefined && s.quantity < where.quantity.gte) {
            return Promise.resolve({ count: 0 });
          }
          if (where.availableQuantity?.gte !== undefined && s.availableQuantity < where.availableQuantity.gte) {
            return Promise.resolve({ count: 0 });
          }

          if (data.quantity?.decrement !== undefined) {
            s.quantity -= data.quantity.decrement;
            s.availableQuantity -= data.quantity.decrement;
          }
          return Promise.resolve({ count: 1 });
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newStock = { id: `stock-${Date.now()}`, ...data };
          mockStocks.push(newStock);
          return Promise.resolve(newStock);
        }),
      },
      stockLedger: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            mockStockLedgers.find(
              (l) => l.referenceId === where.referenceId && l.type === where.type
            ) || null
          );
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            mockStockLedgers.filter((l) => {
              if (where.referenceId && l.referenceId !== where.referenceId) return false;
              if (where.referenceType) {
                if (typeof where.referenceType === 'string') return l.referenceType === where.referenceType;
                if (where.referenceType.in) return where.referenceType.in.includes(l.referenceType);
              }
              return true;
            })
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newLedger = { id: `ledger-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
          mockStockLedgers.push(newLedger);
          return Promise.resolve(newLedger);
        }),
        deleteMany: jest.fn().mockImplementation(({ where }) => {
          mockStockLedgers = mockStockLedgers.filter((l) => l.referenceId !== where.referenceId);
          return Promise.resolve({ count: 1 });
        }),
      },
      invoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => {
          invoiceCounter++;
          const inv = { id: `inv-${invoiceCounter}`, ...data };
          mockInvoices.push(inv);
          return Promise.resolve(inv);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const inv = mockInvoices.find((i) => i.id === where.id);
          if (inv) Object.assign(inv, data);
          return Promise.resolve(inv);
        }),
      },
      invoiceItem: {
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
      businessPartner: {
        findFirst: jest.fn().mockResolvedValue(mockCustomer),
        findUnique: jest.fn().mockResolvedValue(mockCustomer),
        update: jest.fn().mockResolvedValue(mockCustomer),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue(mockCompany),
      },
      account: {
        findFirst: jest.fn().mockResolvedValue({ id: 'acc-1', name: 'Test' }),
        create: jest.fn().mockResolvedValue({ id: 'acc-new', name: 'Test' }),
        update: jest.fn().mockResolvedValue({}),
      },
      customerStatement: {
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      receiptAllocation: {
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({}),
      },
      journalEntry: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue({}),
      },
      journalLine: {
        deleteMany: jest.fn().mockResolvedValue({}),
      },
    };

    const mockPrisma: any = {
      ...mockTx,
      $transaction: jest.fn().mockImplementation(async (cb: any) => {
        if (typeof cb === 'function') {
          return cb(mockTx);
        }
        return Promise.all(cb);
      }),
    };

    const mockAccountingEngine = {
      postTransaction: jest.fn().mockResolvedValue({}),
      reverseTransaction: jest.fn().mockResolvedValue({}),
    };

    const mockCommissionsService = {
      evaluateCommission: jest.fn().mockResolvedValue(null),
    };

    const mockSequenceService = {
      generateUniversalSequence: jest.fn().mockResolvedValue('INV-2026-0001'),
    };

    const mockPdfEngine = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountingEngineService, useValue: mockAccountingEngine },
        { provide: CommissionsService, useValue: mockCommissionsService },
        { provide: SequenceService, useValue: mockSequenceService },
        { provide: PdfEngineService, useValue: mockPdfEngine },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section 9 Verification Matrix', () => {
    it('1 & 2: Saving a draft does not change stock or create stock ledgers', async () => {
      const draftDto: any = {
        customerId: mockCustomer.id,
        date: new Date().toISOString(),
        status: 'DRAFT',
        items: [
          {
            productId: mockTrackedProductA.id,
            qty: 15,
            rate: 20,
            taxPercent: 18,
          },
        ],
      };

      const result = await service.create(draftDto);
      expect(result).toBeDefined();

      const waterStock = mockStocks.find((s) => s.productId === mockTrackedProductA.id);
      expect(waterStock.quantity).toBe(100);
      expect(waterStock.availableQuantity).toBe(100);
      expect(mockStockLedgers.length).toBe(0);
    });

    it('3: Issuing an invoice deducts the correct quantity and records StockLedger SALE', async () => {
      const issueDto: any = {
        customerId: mockCustomer.id,
        date: new Date().toISOString(),
        status: 'SENT',
        items: [
          {
            productId: mockTrackedProductA.id,
            qty: 15,
            rate: 20,
            taxPercent: 18,
          },
        ],
      };

      const result = await service.create(issueDto);
      expect(result).toBeDefined();

      // Product: Bottled Water 1L, Initial: 100, Invoiced: 15, Expected: 85
      const waterStock = mockStocks.find((s) => s.productId === mockTrackedProductA.id);
      expect(waterStock.quantity).toBe(85);
      expect(waterStock.availableQuantity).toBe(85);

      // Verify StockLedger audit entry
      expect(mockStockLedgers.length).toBe(1);
      const ledger = mockStockLedgers[0];
      expect(ledger.productId).toBe(mockTrackedProductA.id);
      expect(ledger.type).toBe('SALE');
      expect(ledger.quantityBefore).toBe(100);
      expect(ledger.quantityChange).toBe(-15);
      expect(ledger.quantityAfter).toBe(85);
      expect(ledger.referenceId).toBe(result.id);
      expect(ledger.referenceType).toBe('INVOICE');
    });

    it('4: Multiple products deduct their respective quantities atomically', async () => {
      const multiItemDto: any = {
        customerId: mockCustomer.id,
        date: new Date().toISOString(),
        status: 'SENT',
        items: [
          {
            productId: mockTrackedProductA.id,
            qty: 25,
            rate: 20,
            taxPercent: 18,
          },
          {
            productId: mockTrackedProductB.id,
            qty: 10,
            rate: 35,
            taxPercent: 18,
          },
        ],
      };

      await service.create(multiItemDto);

      const waterStock = mockStocks.find((s) => s.productId === mockTrackedProductA.id);
      const sodaStock = mockStocks.find((s) => s.productId === mockTrackedProductB.id);

      expect(waterStock.quantity).toBe(75);
      expect(sodaStock.quantity).toBe(40);

      expect(mockStockLedgers.length).toBe(2);
      expect(mockStockLedgers.some((l) => l.productId === mockTrackedProductA.id && l.quantityChange === -25)).toBe(true);
      expect(mockStockLedgers.some((l) => l.productId === mockTrackedProductB.id && l.quantityChange === -10)).toBe(true);
    });

    it('5: Service items do not affect physical inventory in mixed invoices', async () => {
      const mixedDto: any = {
        customerId: mockCustomer.id,
        date: new Date().toISOString(),
        status: 'SENT',
        items: [
          {
            productId: mockTrackedProductA.id,
            qty: 5,
            rate: 20,
            taxPercent: 18,
          },
          {
            productId: mockServiceProduct.id,
            qty: 2,
            rate: 5000,
            taxPercent: 18,
          },
        ],
      };

      await service.create(mixedDto);

      const waterStock = mockStocks.find((s) => s.productId === mockTrackedProductA.id);
      expect(waterStock.quantity).toBe(95);

      // Only 1 ledger entry created (for the physical product, service strictly bypassed)
      expect(mockStockLedgers.length).toBe(1);
      expect(mockStockLedgers[0].productId).toBe(mockTrackedProductA.id);
    });

    it('6: Insufficient stock prevents issuance and throws clear descriptive error', async () => {
      const excessiveDto: any = {
        customerId: mockCustomer.id,
        date: new Date().toISOString(),
        status: 'SENT',
        items: [
          {
            productId: mockTrackedProductB.id,
            qty: 999, // Available is only 50
            rate: 35,
            taxPercent: 18,
          },
        ],
      };

      await expect(service.create(excessiveDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(excessiveDto)).rejects.toThrow(
        /Insufficient stock for product "Sparkling Soda 500ml"/
      );

      // Verify stock was not touched
      const sodaStock = mockStocks.find((s) => s.productId === mockTrackedProductB.id);
      expect(sodaStock.quantity).toBe(50);
      expect(mockStockLedgers.length).toBe(0);
    });

    it('7: Repeated submissions (idempotency) do not cause duplicate deductions', async () => {
      const issueDto: any = {
        customerId: mockCustomer.id,
        date: new Date().toISOString(),
        status: 'SENT',
        items: [
          {
            productId: mockTrackedProductA.id,
            qty: 10,
            rate: 20,
            taxPercent: 18,
          },
        ],
      };

      const inv = await service.create(issueDto);

      const waterStock = mockStocks.find((s) => s.productId === mockTrackedProductA.id);
      expect(waterStock.quantity).toBe(90);
      expect(mockStockLedgers.length).toBe(1);

      // Attempting to call deductInventoryStock on the same invoice again
      await (service as any).deductInventoryStock(
        (service as any).prisma,
        mockCompanyId,
        inv,
        issueDto.items,
        'TAX_INVOICE',
        false
      );

      // Stock remains 90, no second ledger created
      expect(waterStock.quantity).toBe(90);
      expect(mockStockLedgers.length).toBe(1);
    });

    it('8: Concurrency protection rejects transactions that would overdraw stock', async () => {
      // Set stock to 10
      const waterStock = mockStocks.find((s) => s.productId === mockTrackedProductA.id);
      waterStock.quantity = 10;
      waterStock.availableQuantity = 10;

      const issue7Dto: any = {
        customerId: mockCustomer.id,
        date: new Date().toISOString(),
        status: 'SENT',
        items: [{ productId: mockTrackedProductA.id, qty: 7, rate: 20, taxPercent: 18 }],
      };

      // First transaction succeeds
      await service.create(issue7Dto);
      expect(waterStock.quantity).toBe(3);

      // Second transaction for 7 units fails because only 3 remain
      await expect(service.create(issue7Dto)).rejects.toThrow(BadRequestException);
      expect(waterStock.quantity).toBe(3);
    });

    it('10: Cancelling an issued invoice cleanly reverses stock and records INVOICE_CANCELLATION', async () => {
      const issueDto: any = {
        customerId: mockCustomer.id,
        date: new Date().toISOString(),
        status: 'SENT',
        items: [{ productId: mockTrackedProductA.id, qty: 20, rate: 20, taxPercent: 18 }],
      };

      const inv = await service.create(issueDto);
      const waterStock = mockStocks.find((s) => s.productId === mockTrackedProductA.id);
      expect(waterStock.quantity).toBe(80);

      // Mock findOne to return the invoice with relations for cancel()
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...inv,
        status: 'SENT',
        grandTotal: 400,
        amountPaid: 0,
        invoiceNo: 'INV-2026-0001',
        companyId: mockCompanyId,
        businessPartnerId: mockCustomer.id,
      } as any);

      await service.cancel(inv.id, { reason: 'Customer returned order' });

      // Stock must be restored to 100
      expect(waterStock.quantity).toBe(100);

      // Verify cancellation ledger
      const cancelLedger = mockStockLedgers.find((l) => l.referenceType === 'INVOICE_CANCELLATION');
      expect(cancelLedger).toBeDefined();
      expect(cancelLedger.quantityChange).toBe(20);
      expect(cancelLedger.quantityAfter).toBe(100);
    });

    it('11: Quotations do not affect physical stock', async () => {
      const quoteDto: any = {
        customerId: mockCustomer.id,
        date: new Date().toISOString(),
        documentType: 'QUOTATION',
        items: [{ productId: mockTrackedProductA.id, qty: 40, rate: 20, taxPercent: 18 }],
      };

      await service.create(quoteDto);

      const waterStock = mockStocks.find((s) => s.productId === mockTrackedProductA.id);
      expect(waterStock.quantity).toBe(100);
      expect(mockStockLedgers.length).toBe(0);
    });

    it('14: Tenant isolation rejects cross-tenant operations', async () => {
      jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue('cmp-other-tenant');

      const crossTenantDto: any = {
        customerId: mockCustomer.id,
        date: new Date().toISOString(),
        status: 'SENT',
        items: [{ productId: mockTrackedProductA.id, qty: 5, rate: 20, taxPercent: 18 }],
      };

      // Customer check fails because customer belongs to mockCompanyId, not cmp-other-tenant
      await expect(service.create(crossTenantDto)).rejects.toThrow();
    });
  });
});
