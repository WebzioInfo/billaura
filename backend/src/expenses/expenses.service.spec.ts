import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../database/prisma.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { CompanyContext } from '../common/context/company-context';
import { CreateExpenseDto } from './dto/expense.dto';

describe('ExpensesService - Zoho Record Expense Integrity', () => {
  let service: ExpensesService;
  let prisma: any;
  let accountingEngine: any;
  let sequenceService: any;

  const mockCompanyId = 'cmp-expense-test-101';
  let expensesStore: any[] = [];
  let expenseCategoriesStore: any[] = [];
  let accountsStore: any[] = [];
  let bankAccountsStore: any[] = [];
  let cashAccountsStore: any[] = [];
  let postedJournalLines: any[] = [];

  beforeEach(async () => {
    expensesStore = [];
    expenseCategoriesStore = [];
    accountsStore = [];
    bankAccountsStore = [];
    cashAccountsStore = [];
    postedJournalLines = [];

    // Seed test accounts and categories
    const expenseLedger = {
      id: 'acc-exp-office',
      companyId: mockCompanyId,
      name: 'Office Supplies',
      code: '5001',
      category: 'EXPENSE',
    };
    accountsStore.push(expenseLedger);

    const bankLedger = {
      id: 'acc-bank-hdfc',
      companyId: mockCompanyId,
      name: 'HDFC Bank Account',
      code: '1001',
      category: 'ASSET',
    };
    accountsStore.push(bankLedger);

    const inputCgstLedger = {
      id: 'acc-tax-cgst',
      companyId: mockCompanyId,
      name: 'Input CGST',
      code: '1301',
      category: 'ASSET',
    };
    const inputSgstLedger = {
      id: 'acc-tax-sgst',
      companyId: mockCompanyId,
      name: 'Input SGST',
      code: '1302',
      category: 'ASSET',
    };
    const inputIgstLedger = {
      id: 'acc-tax-igst',
      companyId: mockCompanyId,
      name: 'Input IGST',
      code: '1303',
      category: 'ASSET',
    };
    accountsStore.push(inputCgstLedger, inputSgstLedger, inputIgstLedger);

    const bankAccount = {
      id: 'bank-1',
      companyId: mockCompanyId,
      name: 'HDFC Bank',
      accountId: bankLedger.id,
      deletedAt: null,
      account: bankLedger,
    };
    bankAccountsStore.push(bankAccount);

    const category = {
      id: 'cat-office',
      companyId: mockCompanyId,
      name: 'Office Supplies',
      accountId: expenseLedger.id,
      isActive: true,
      account: expenseLedger,
    };
    expenseCategoriesStore.push(category);

    const mockTx = {
      expense: {
        create: jest.fn().mockImplementation(({ data }) => {
          const item = { id: `exp-${Date.now()}-${Math.random()}`, ...data };
          expensesStore.push(item);
          return Promise.resolve(item);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            expensesStore.find((e) => {
              if (where.id && e.id !== where.id) return false;
              if (where.companyId && e.companyId !== where.companyId) return false;
              return true;
            }) || null
          );
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            expensesStore.filter((e) => !where?.companyId || e.companyId === where.companyId)
          );
        }),
        count: jest.fn().mockImplementation(() => Promise.resolve(expensesStore.length)),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const item = expensesStore.find((e) => e.id === where.id);
          if (item) Object.assign(item, data);
          return Promise.resolve(item || { id: where.id, ...data });
        }),
      },
      expenseCategory: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            expenseCategoriesStore.find((c) => {
              if (where.id && c.id !== where.id) return false;
              if (where.accountId && c.accountId !== where.accountId) return false;
              if (where.companyId && c.companyId !== where.companyId) return false;
              if (where.isActive !== undefined && c.isActive !== where.isActive) return false;
              return true;
            }) || null
          );
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(expenseCategoriesStore.find((c) => c.id === where.id) || null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const item = { id: `cat-${Date.now()}`, ...data };
          expenseCategoriesStore.push(item);
          return Promise.resolve(item);
        }),
      },
      account: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            accountsStore.find((a) => {
              if (where.id && a.id !== where.id) return false;
              if (where.companyId && a.companyId !== where.companyId) return false;
              if (where.name?.contains && !a.name.includes(where.name.contains)) return false;
              return true;
            }) || null
          );
        }),
      },
      bankAccount: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            bankAccountsStore.find((b) => {
              if (where.id && b.id !== where.id) return false;
              if (where.companyId && b.companyId !== where.companyId) return false;
              return true;
            }) || null
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const item = { id: `bank-${Date.now()}`, ...data };
          bankAccountsStore.push(item);
          return Promise.resolve(item);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const item = bankAccountsStore.find((b) => b.id === where.id);
          if (item) Object.assign(item, data);
          return Promise.resolve(item);
        }),
      },
      cashAccount: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            cashAccountsStore.find((c) => {
              if (where.id && c.id !== where.id) return false;
              if (where.companyId && c.companyId !== where.companyId) return false;
              return true;
            }) || null
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const item = { id: `cash-${Date.now()}`, ...data };
          cashAccountsStore.push(item);
          return Promise.resolve(item);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const item = cashAccountsStore.find((c) => c.id === where.id);
          if (item) Object.assign(item, data);
          return Promise.resolve(item);
        }),
      },
      department: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      companySettings: {
        findUnique: jest.fn().mockResolvedValue({
          companyId: mockCompanyId,
          defaultAccounts: {
            inputCgstAccountId: 'acc-tax-cgst',
            inputSgstAccountId: 'acc-tax-sgst',
            inputIgstAccountId: 'acc-tax-igst',
          },
        }),
      },
      expenseAttachment: {
        create: jest.fn().mockResolvedValue({ id: 'att-1' }),
      },
      expenseComment: {
        create: jest.fn().mockResolvedValue({ id: 'comment-1' }),
      },
      expenseHistory: {
        create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
      },
    };

    prisma = {
      ...mockTx,
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        if (typeof callback === 'function') {
          return callback(mockTx);
        }
        return Promise.all(callback);
      }),
    };

    sequenceService = {
      generateNextSequence: jest.fn().mockResolvedValue('EXP-2026-0001'),
    };

    accountingEngine = {
      postTransaction: jest.fn().mockImplementation(async ({ lines }) => {
        postedJournalLines.push(...lines);
        return { id: 'je-1', lines };
      }),
      reverseTransaction: jest.fn().mockResolvedValue({ id: 'je-rev-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
        { provide: SequenceService, useValue: sequenceService },
        { provide: AccountingEngineService, useValue: accountingEngine },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Zoho Books Form Layout & Tax Calculations', () => {
    it('1. should create expense with minimum valid fields and auto-resolve category', async () => {
      const dto: CreateExpenseDto = {
        date: '2026-10-16',
        amount: 500,
        paidThroughAccountId: 'bank-1',
      };

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.expenseNo).toBe('EXP-2026-0001');
      expect(Number(result.amount)).toBe(500);
      expect(Number(result.totalAmount)).toBe(500);
      expect(result.categoryId).toBe('cat-office');
      expect(result.bankAccountId).toBe('bank-1');
      expect(result.status).toBe('PAID');
      expect(result.approvalStatus).toBe('APPROVED');
    });

    it('2. should accurately calculate TAX_EXCLUSIVE GST (1000 + 18% = 1180 total, 180 tax)', async () => {
      const dto: CreateExpenseDto = {
        date: '2026-10-16',
        amount: 1000,
        gstRate: 18,
        amountIs: 'TAX_EXCLUSIVE',
        paidThroughAccountId: 'bank-1',
        sourceOfSupply: 'Kerala',
        destinationOfSupply: 'Kerala', // Intra-state -> CGST (9%) + SGST (9%)
      };

      const result = await service.create(dto);

      expect(Number(result.taxableAmount)).toBe(1000);
      expect(Number(result.taxAmount)).toBe(180);
      expect(Number(result.totalAmount)).toBe(1180);
      expect(Number(result.cgstAmount)).toBe(90);
      expect(Number(result.sgstAmount)).toBe(90);
      expect(Number(result.igstAmount)).toBe(0);
      expect(result.taxType).toBe('GST');
    });

    it('3. should accurately calculate TAX_INCLUSIVE GST (1180 total includes 180 tax, 1000 taxable base)', async () => {
      const dto: CreateExpenseDto = {
        date: '2026-10-16',
        amount: 1180,
        gstRate: 18,
        amountIs: 'TAX_INCLUSIVE',
        paidThroughAccountId: 'bank-1',
        sourceOfSupply: 'Kerala',
        destinationOfSupply: 'Kerala',
      };

      const result = await service.create(dto);

      expect(Number(result.totalAmount)).toBe(1180);
      expect(Number(result.taxAmount)).toBe(180);
      expect(Number(result.taxableAmount)).toBe(1000);
      expect(Number(result.cgstAmount)).toBe(90);
      expect(Number(result.sgstAmount)).toBe(90);
    });

    it('4. should handle inter-state supply by computing IGST instead of CGST/SGST', async () => {
      const dto: CreateExpenseDto = {
        date: '2026-10-16',
        amount: 2000,
        gstRate: 18,
        amountIs: 'TAX_EXCLUSIVE',
        paidThroughAccountId: 'bank-1',
        sourceOfSupply: 'Maharashtra',
        destinationOfSupply: 'Karnataka', // Inter-state
      };

      const result = await service.create(dto);

      expect(Number(result.taxableAmount)).toBe(2000);
      expect(Number(result.taxAmount)).toBe(360);
      expect(Number(result.totalAmount)).toBe(2360);
      expect(Number(result.igstAmount)).toBe(360);
      expect(Number(result.cgstAmount)).toBe(0);
      expect(Number(result.sgstAmount)).toBe(0);
      expect(result.taxType).toBe('IGST');
    });

    it('5. should post balanced General Ledger journal entries (Debits === Credits)', async () => {
      const dto: CreateExpenseDto = {
        date: '2026-10-16',
        amount: 1000,
        gstRate: 18,
        amountIs: 'TAX_EXCLUSIVE',
        paidThroughAccountId: 'bank-1',
        sourceOfSupply: 'Kerala',
        destinationOfSupply: 'Kerala',
        autoApprove: true,
      };

      await service.create(dto);

      expect(accountingEngine.postTransaction).toHaveBeenCalled();
      expect(postedJournalLines.length).toBeGreaterThanOrEqual(2);

      const totalDebits = postedJournalLines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredits = postedJournalLines.reduce((sum, l) => sum + (l.credit || 0), 0);

      // Debits: 1000 (Expense) + 90 (CGST) + 90 (SGST) = 1180
      // Credits: 1180 (Bank)
      expect(totalDebits).toBe(1180);
      expect(totalCredits).toBe(1180);
      expect(totalDebits).toEqual(totalCredits);
    });

    it('6. should serialize and deserialize extended Zoho metadata in notes', async () => {
      const dto: CreateExpenseDto = {
        date: '2026-10-16',
        amount: 750,
        paidThroughAccountId: 'bank-1',
        expenseType: 'SERVICES',
        hsnSac: '998311',
        gstTreatment: 'REGULAR',
        sourceOfSupply: 'Kerala',
        destinationOfSupply: 'Kerala',
        reverseCharge: true,
        invoiceNumber: 'INV-ZOHO-999',
        customerName: 'Acme Corporation',
        customerId: 'cust-123',
        isBillable: true,
        reportingTags: ['Tag-Project-A', 'Tag-Marketing'],
        receiptUrls: ['https://cloudinary.com/receipt-1.jpg'],
        notes: 'Monthly cloud hosting fee',
      };

      const result = await service.create(dto);

      expect(result.expenseType).toBe('SERVICES');
      expect(result.hsnSac).toBe('998311');
      expect(result.gstTreatment).toBe('REGULAR');
      expect(result.reverseCharge).toBe(true);
      expect(result.invoiceNumber).toBe('INV-ZOHO-999');
      expect(result.customerName).toBe('Acme Corporation');
      expect(result.customerId).toBe('cust-123');
      expect(result.isBillable).toBe(true);
      expect(result.reportingTags).toEqual(['Tag-Project-A', 'Tag-Marketing']);
      expect(result.receiptUrls).toEqual(['https://cloudinary.com/receipt-1.jpg']);
      expect(result.notes).toBe('Monthly cloud hosting fee');
    });

    it('7. should resolve Chart of Accounts expense ledger accountId seamlessly', async () => {
      const dto: CreateExpenseDto = {
        date: '2026-10-16',
        amount: 300,
        accountId: 'acc-exp-office', // Selected direct account
        paidThroughAccountId: 'bank-1',
      };

      const result = await service.create(dto);

      expect(result.categoryId).toBe('cat-office');
      expect(Number(result.amount)).toBe(300);
    });
  });
});
