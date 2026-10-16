import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../database/prisma.service';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { CompanyContext } from '../common/context/company-context';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('PurchasesService - Bills Module Functionality', () => {
  let service: PurchasesService;
  let prisma: any;
  let accountingEngine: any;
  let sequenceService: any;

  const mockCompanyId = 'comp-test-123';

  beforeEach(async () => {
    prisma = {
      purchase: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      businessPartner: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      account: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      warehouse: {
        findFirst: jest.fn(),
      },
      stock: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      stockLedger: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: mockCompanyId, state: 'MH' }),
      },
      companySettings: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      documentSequence: {
        findUnique: jest.fn(),
      },
      purchaseAttachment: {
        updateMany: jest.fn(),
      },
      purchaseItem: {
        deleteMany: jest.fn(),
      },
      journalEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      journalLine: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return Promise.all(callback);
      }),
    };

    accountingEngine = {
      postTransaction: jest.fn().mockResolvedValue({ id: 'je-101' }),
      reverseTransaction: jest.fn().mockResolvedValue(true),
    };

    sequenceService = {
      generateNextSequence: jest.fn().mockResolvedValue('BILL-00001'),
      previewNextSequence: jest.fn().mockResolvedValue('BILL-00002'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountingEngineService, useValue: accountingEngine },
        { provide: SequenceService, useValue: sequenceService },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);

    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Numbering and Uniqueness', () => {
    it('should preview next bill number using sequence service', async () => {
      const res = await service.getNextNumber();
      expect(res.nextNumber).toBe('BILL-00002');
      expect(sequenceService.previewNextSequence).toHaveBeenCalledWith(mockCompanyId, 'BILL');
    });

    it('should reject creating a bill if purchaseNo already exists for the company', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue({
        id: 'ven-1',
        name: 'Alpha Traders',
        taxPreference: 'TAXABLE',
        state: 'MH',
      });

      prisma.purchase.findFirst.mockResolvedValue({
        id: 'existing-bill-1',
        purchaseNo: 'BILL-100',
      });

      await expect(
        service.create({
          vendorId: 'ven-1',
          purchaseNo: 'BILL-100',
          date: '2026-06-18',
          items: [{ qty: 1, rate: 500 }],
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. Draft Lifecycle Protection', () => {
    it('should save as DRAFT without posting to vendor payable, stock, or general ledger', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue({
        id: 'ven-1',
        name: 'Beta Suppliers',
        taxPreference: 'TAXABLE',
        state: 'MH',
      });
      prisma.purchase.findFirst.mockResolvedValue(null);
      prisma.purchase.create.mockImplementation(({ data }: any) => ({
        id: 'bill-draft-1',
        ...data,
      }));

      const result = await service.create({
        vendorId: 'ven-1',
        purchaseNo: 'BILL-DRAFT-01',
        status: 'DRAFT',
        date: '2026-06-18',
        items: [{ qty: 2, rate: 1000, taxPercent: 18 }],
      });

      expect(result.status).toBe('DRAFT');
      expect(prisma.businessPartner.update).not.toHaveBeenCalled();
      expect(prisma.stock.update).not.toHaveBeenCalled();
      expect(accountingEngine.postTransaction).not.toHaveBeenCalled();
    });

    it('should save as OPEN and execute accounting posting & payable increment', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue({
        id: 'ven-1',
        name: 'Beta Suppliers',
        taxPreference: 'TAXABLE',
        state: 'MH',
      });
      prisma.purchase.findFirst.mockResolvedValue(null);
      prisma.account.findFirst.mockResolvedValue({ id: 'acc-ap', name: 'Accounts Payable' });
      prisma.purchase.create.mockImplementation(({ data }: any) => ({
        id: 'bill-open-1',
        ...data,
      }));

      const result = await service.create({
        vendorId: 'ven-1',
        purchaseNo: 'BILL-OPEN-01',
        status: 'OPEN',
        date: '2026-06-18',
        items: [{ qty: 2, rate: 1000, taxPercent: 18 }],
      });

      expect(result.status).toBe('SENT');
      expect(prisma.businessPartner.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ven-1' },
          data: { payableBalance: { increment: 2360 } },
        })
      );
      expect(accountingEngine.postTransaction).toHaveBeenCalled();
    });
  });

  describe('3. TDS and TCS Calculations', () => {
    it('should accurately calculate TDS deduction and credit TDS Payable', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue({
        id: 'ven-1',
        name: 'Gamma Corp',
        taxPreference: 'TAXABLE',
        state: 'MH',
      });
      prisma.purchase.findFirst.mockResolvedValue(null);
      prisma.account.findFirst.mockResolvedValue({ id: 'acc-1', name: 'Direct Expenses' });
      prisma.purchase.create.mockImplementation(({ data }: any) => ({
        id: 'bill-tds-1',
        ...data,
      }));

      // Subtotal: 10000, 18% Tax = 1800. TDS 10% = 1000. Grand Total = 10000 + 1800 - 1000 = 10800.
      const result = await service.create({
        vendorId: 'ven-1',
        status: 'OPEN',
        date: '2026-06-18',
        tdsTcsType: 'TDS',
        tdsTcsRate: 10,
        items: [{ qty: 10, rate: 1000, taxPercent: 18 }],
      });

      expect(result.grandTotal).toBe(10800);
      expect(result.tdsAmount).toBe(1000);
      expect(result.tcsAmount).toBe(0);

      // Verify journal entry lines include TDS Payable credit
      expect(accountingEngine.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ debit: 0, credit: 1000 }), // TDS credit
            expect.objectContaining({ debit: 0, credit: 10800 }), // AP credit
          ]),
        }),
        expect.anything()
      );
    });

    it('should accurately calculate TCS addition and debit TCS Receivable', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue({
        id: 'ven-1',
        name: 'Delta Corp',
        taxPreference: 'TAXABLE',
        state: 'MH',
      });
      prisma.purchase.findFirst.mockResolvedValue(null);
      prisma.account.findFirst.mockResolvedValue({ id: 'acc-1', name: 'Direct Expenses' });
      prisma.purchase.create.mockImplementation(({ data }: any) => ({
        id: 'bill-tcs-1',
        ...data,
      }));

      // Subtotal: 10000, 18% Tax = 1800. TCS 1% = 100. Grand Total = 10000 + 1800 + 100 = 11900.
      const result = await service.create({
        vendorId: 'ven-1',
        status: 'OPEN',
        date: '2026-06-18',
        tdsTcsType: 'TCS',
        tdsTcsRate: 1,
        items: [{ qty: 10, rate: 1000, taxPercent: 18 }],
      });

      expect(result.grandTotal).toBe(11900);
      expect(result.tcsAmount).toBe(100);
      expect(result.tdsAmount).toBe(0);

      // Verify journal entry lines include TCS Receivable debit
      expect(accountingEngine.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ debit: 100, credit: 0 }), // TCS debit
            expect.objectContaining({ debit: 0, credit: 11900 }), // AP credit
          ]),
        }),
        expect.anything()
      );
    });
  });

  describe('4. Dynamic Payment Terms Management', () => {
    it('should return configured and default payment terms', async () => {
      const terms = await service.getPaymentTerms();
      expect(terms.length).toBeGreaterThanOrEqual(5);
      expect(terms.some((t) => t.name === 'Due on Receipt')).toBe(true);
      expect(terms.some((t) => t.name === 'Net 30')).toBe(true);
    });

    it('should create a new payment term and persist in tenant settings', async () => {
      prisma.companySettings.findUnique.mockResolvedValue({
        id: 'set-1',
        companyId: mockCompanyId,
        invoiceSettings: { paymentTerms: [{ name: 'Net 10', days: 10 }] },
      });

      const newTerm = await service.createPaymentTerm({
        termName: 'Net 25 Custom',
        dueAfter: 25,
      });

      expect(newTerm).toEqual({ name: 'Net 25 Custom', days: 25 });
      expect(prisma.companySettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'set-1' },
          data: {
            invoiceSettings: expect.objectContaining({
              paymentTerms: expect.arrayContaining([{ name: 'Net 25 Custom', days: 25 }]),
            }),
          },
        })
      );
    });
  });
});
