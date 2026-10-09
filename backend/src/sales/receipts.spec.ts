import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { InvoicesService } from './invoices.service';
import { PurchasesService } from '../purchases/purchases.service';
import { PurchasePaymentsService } from '../purchases/purchase-payments.service';
import { ExpensesService } from '../expenses/expenses.service';
import { PdfEngineService } from './pdf-engine.service';
import { PrismaService } from '../database/prisma.service';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { CompanyContext } from '../common/context/company-context';

describe('Receipts Module - Production Test Suite', () => {
  let controller: ReceiptsController;
  let service: ReceiptsService;

  const mockCompanyId = 'cmp-tenant-999';
  const mockUserId = 'usr-admin-888';

  const mockCustomer = {
    id: 'cust-101',
    companyId: mockCompanyId,
    name: 'Test Customer',
    receivableBalance: 5000,
  };

  const mockInvoice = {
    id: 'inv-201',
    companyId: mockCompanyId,
    businessPartnerId: mockCustomer.id,
    invoiceNo: 'B2BF/68/26-27',
    grandTotal: 1000,
    amountPaid: 0,
    status: 'SENT',
  };

  const mockAccount = {
    id: 'acc-cash-1',
    companyId: mockCompanyId,
    name: 'Cash',
    balance: 0,
  };

  const mockBankAccount = {
    id: 'bank-acc-1',
    companyId: mockCompanyId,
    name: 'HDFC Current Account',
    bankName: 'HDFC Bank',
    accountNumber: '1234567890',
    accountId: 'acc-hdfc-ledger-1',
  };

  const mockHdfcLedgerAccount = {
    id: 'acc-hdfc-ledger-1',
    companyId: mockCompanyId,
    name: 'HDFC Bank',
    balance: 0,
  };

  let mockPrisma: any;
  let mockAccountingEngine: any;
  let mockSequenceService: any;
  let mockPdfEngine: any;

  beforeEach(async () => {
    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);

    const invoicesList = [{ ...mockInvoice }];
    const accountsList = [{ ...mockAccount }, { ...mockHdfcLedgerAccount }];
    const bankAccountsList = [{ ...mockBankAccount }];
    const receiptsList: any[] = [];
    const journalEntries: any[] = [];

    const mockTx: any = {
      invoice: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const found = invoicesList.find(i => i.id === where.id && i.companyId === where.companyId);
          return Promise.resolve(found ? { ...found } : null);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(invoicesList.filter(i => i.businessPartnerId === where.businessPartnerId && i.companyId === where.companyId));
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const inv = invoicesList.find(i => i.id === where.id);
          if (inv) {
            Object.assign(inv, data);
            return Promise.resolve({ ...inv });
          }
          return Promise.resolve(null);
        }),
      },
      receipt: {
        create: jest.fn().mockImplementation(({ data }) => {
          const rec = { id: `rec-${Date.now()}`, ...data };
          receiptsList.push(rec);
          return Promise.resolve(rec);
        }),
      },
      receiptAllocation: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'alloc-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({ id: 'alloc-1' }),
      },
      businessPartner: {
        update: jest.fn().mockResolvedValue(mockCustomer),
      },
      account: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id) return Promise.resolve(accountsList.find(a => a.id === where.id && a.companyId === where.companyId) || null);
          if (where.name) return Promise.resolve(accountsList.find(a => a.name === where.name && a.companyId === where.companyId) || null);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const created = { id: `acc-${Date.now()}`, ...data };
          accountsList.push(created);
          return Promise.resolve(created);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const acc = accountsList.find(a => a.id === where.id);
          if (acc && data.balance?.increment) {
            acc.balance += Number(data.balance.increment);
          }
          return Promise.resolve(acc);
        }),
      },
      customerStatement: {
        create: jest.fn().mockResolvedValue({ id: 'stmt-1' }),
      },
      receiptAudit: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        if (typeof callback === 'function') {
          return callback(mockTx);
        }
        return Promise.all(callback);
      }),
      businessPartner: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockCustomer.id && where.companyId === mockCompanyId) {
            return Promise.resolve(mockCustomer);
          }
          return Promise.resolve(null);
        }),
      },
      invoice: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(invoicesList.filter(i => i.businessPartnerId === where.businessPartnerId && i.companyId === where.companyId));
        }),
      },
      account: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id) return Promise.resolve(accountsList.find(a => a.id === where.id && a.companyId === where.companyId) || null);
          if (where.name) return Promise.resolve(accountsList.find(a => a.name === where.name && a.companyId === where.companyId) || null);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const created = { id: `acc-${Date.now()}`, ...data };
          accountsList.push(created);
          return Promise.resolve(created);
        }),
      },
      bankAccount: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(bankAccountsList.find(b => b.id === where.id && b.companyId === where.companyId) || null);
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      receipt: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rec-1', receiptNo: 'REC/01/26-27' }),
      },
      receiptAllocation: {
        findUnique: jest.fn(),
      },
    };

    mockAccountingEngine = {
      postTransaction: jest.fn().mockImplementation((entry: any) => {
        journalEntries.push(entry);
        return Promise.resolve({ id: 'entry-1', ...entry });
      }),
      reverseTransaction: jest.fn().mockResolvedValue({ id: 'rev-entry-1' }),
    };

    mockSequenceService = {
      generateNextSequence: jest.fn().mockResolvedValue('REC/01/26-27'),
    };

    mockPdfEngine = {
      generateReceiptPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock pdf content')),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptsController],
      providers: [
        ReceiptsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InvoicesService, useValue: {} },
        { provide: PurchasesService, useValue: {} },
        { provide: PurchasePaymentsService, useValue: {} },
        { provide: ExpensesService, useValue: {} },
        { provide: AccountingEngineService, useValue: mockAccountingEngine },
        { provide: SequenceService, useValue: mockSequenceService },
        { provide: PdfEngineService, useValue: mockPdfEngine },
      ],
    }).compile();

    controller = module.get<ReceiptsController>(ReceiptsController);
    service = module.get<ReceiptsService>(ReceiptsService);
  });

  describe('Route Registration & Metadata', () => {
    it('1. Controller is decorated with both sales/receipts and receipts route paths', () => {
      const paths = Reflect.getMetadata(PATH_METADATA, ReceiptsController);
      expect(paths).toEqual(['sales/receipts', 'receipts']);
    });

    it('2. POST / handler is registered on create method', () => {
      const httpMethod = Reflect.getMetadata(METHOD_METADATA, ReceiptsController.prototype.create);
      expect(httpMethod).toBe(RequestMethod.POST);
    });
  });

  describe('Tenant Isolation & Validation', () => {
    it('3. Rejects payment when companyId is missing from context', async () => {
      jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(null);
      await expect(
        service.create({
          date: '2026-10-09',
          businessPartnerId: mockCustomer.id,
          amount: 500,
        } as any, mockUserId)
      ).rejects.toThrow(ConflictException);
    });

    it('4. Rejects payment for customer not belonging to tenant', async () => {
      await expect(
        service.create({
          date: '2026-10-09',
          businessPartnerId: 'cust-foreign-tenant',
          amount: 500,
        } as any, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('5. Rejects payment amount that exceeds total customer outstanding balance', async () => {
      await expect(
        service.create({
          date: '2026-10-09',
          businessPartnerId: mockCustomer.id,
          amount: 2500, // outstanding is 1000
        } as any, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('6. Rejects split payments where sum of splits does not equal total amount', async () => {
      await expect(
        service.create({
          date: '2026-10-09',
          businessPartnerId: mockCustomer.id,
          amount: 1000,
          splitPayments: [
            { paymentMethod: 'CASH', amount: 400 },
            { paymentMethod: 'BANK_TRANSFER', amount: 500 }, // sum 900 != 1000
          ],
        } as any, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Accounting Execution & Allocation', () => {
    it('7. Processes valid single payment and allocates to invoice', async () => {
      const result = await controller.create(
        {
          date: '2026-10-09',
          businessPartnerId: mockCustomer.id,
          amount: 1000,
          notes: 'Full payment for B2BF/68/26-27',
          allocations: [{ invoiceId: mockInvoice.id, amount: 1000 }],
          splitPayments: [
            {
              paymentMethod: 'CASH',
              amount: 1000,
              accountId: mockAccount.id,
            },
          ],
        },
        { user: { userId: mockUserId, companyId: mockCompanyId } }
      );

      expect(result).toBeDefined();
      expect((result as any).receiptNo).toBe('REC/01/26-27');
      expect((result as any).amount).toBe(1000);
      expect(mockAccountingEngine.postTransaction).toHaveBeenCalled();
    });

    it('8. Processes multiple payment splits and balances double-entry posting', async () => {
      const result = await controller.create(
        {
          date: '2026-10-09',
          businessPartnerId: mockCustomer.id,
          amount: 1000,
          notes: 'Split payment: 400 Cash + 600 Bank',
          allocations: [{ invoiceId: mockInvoice.id, amount: 1000 }],
          splitPayments: [
            { paymentMethod: 'CASH', amount: 400, accountId: mockAccount.id },
            { paymentMethod: 'BANK_TRANSFER', amount: 600, accountId: mockHdfcLedgerAccount.id },
          ],
        },
        { user: { userId: mockUserId, companyId: mockCompanyId } }
      );

      expect(result).toBeDefined();
      expect(mockAccountingEngine.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: mockCompanyId,
          reference: 'REC/01/26-27',
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: mockAccount.id, debit: 400 }),
            expect.objectContaining({ accountId: mockHdfcLedgerAccount.id, debit: 600 }),
            expect.objectContaining({ credit: 1000 }), // AR credit
          ]),
        }),
        expect.anything()
      );
    });

    it('9. Resolves BankAccount id gracefully to underlying ledger account', async () => {
      const result = await controller.create(
        {
          date: '2026-10-09',
          businessPartnerId: mockCustomer.id,
          amount: 1000,
          allocations: [{ invoiceId: mockInvoice.id, amount: 1000 }],
          splitPayments: [
            {
              paymentMethod: 'BANK_TRANSFER',
              amount: 1000,
              accountId: mockBankAccount.id, // BankAccount ID passed from dropdown
            },
          ],
        },
        { user: { userId: mockUserId, companyId: mockCompanyId } }
      );

      expect(result).toBeDefined();
      expect(mockAccountingEngine.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: mockHdfcLedgerAccount.id, debit: 1000 }),
          ]),
        }),
        expect.anything()
      );
    });

    it('10. Rejects allocation amount exceeding invoice unpaid balance', async () => {
      await expect(
        service.create({
          date: '2026-10-09',
          businessPartnerId: mockCustomer.id,
          amount: 500,
          allocations: [{ invoiceId: mockInvoice.id, amount: 1500 }], // unpaid is 1000
        } as any, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('11. Removes one allocation from a receipt shared across invoices, preserving receipt and other allocations', async () => {
      const targetAllocation = {
        id: 'alloc-target-1',
        receiptId: 'rec-shared-1',
        invoiceId: mockInvoice.id,
        amount: 400,
        invoice: {
          id: mockInvoice.id,
          companyId: mockCompanyId,
          grandTotal: 1000,
          amountPaid: 1000,
          invoiceNo: 'B2BF/69/26-27',
        },
        receipt: {
          id: 'rec-shared-1',
          receiptNo: 'REC-00001',
          amount: 1000,
          allocations: [
            { id: 'alloc-target-1', invoiceId: mockInvoice.id, amount: 400 },
            { id: 'alloc-other-2', invoiceId: 'inv-other-99', amount: 600 },
          ],
        },
      };

      mockPrisma.receiptAllocation.findUnique.mockResolvedValueOnce(targetAllocation);

      const result = await service.removeAllocation(targetAllocation.id, { deleteReceipt: false }, mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment allocation removed. The receipt remains available for other invoices.');
      expect(result.data.amountRemoved).toBe(400);
      expect(result.data.receiptDeleted).toBe(false);
    });

    it('12. Prevents deleting entire shared receipt when it has allocations linked to other invoices', async () => {
      const sharedAllocation = {
        id: 'alloc-shared-attempt',
        receiptId: 'rec-shared-multi',
        invoiceId: mockInvoice.id,
        amount: 500,
        invoice: {
          id: mockInvoice.id,
          companyId: mockCompanyId,
          grandTotal: 1000,
        },
        receipt: {
          id: 'rec-shared-multi',
          receiptNo: 'REC-MULTI',
          allocations: [
            { id: 'alloc-shared-attempt', invoiceId: mockInvoice.id, amount: 500 },
            { id: 'alloc-other-inv', invoiceId: 'inv-unrelated-2', amount: 500 },
          ],
        },
      };

      mockPrisma.receiptAllocation.findUnique.mockResolvedValueOnce(sharedAllocation);

      await expect(
        service.removeAllocation(sharedAllocation.id, { deleteReceipt: true }, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('13. Corrects entire mistakenly recorded receipt when deleteReceipt is true', async () => {
      const singleAllocation = {
        id: 'alloc-mistake-1',
        receiptId: 'rec-mistake-1',
        invoiceId: mockInvoice.id,
        amount: 5000,
        invoice: {
          id: mockInvoice.id,
          companyId: mockCompanyId,
          grandTotal: 17653,
          amountPaid: 5000,
        },
        receipt: {
          id: 'rec-mistake-1',
          companyId: mockCompanyId,
          receiptNo: 'REC-MISTAKE',
          amount: 5000,
          allocations: [
            { id: 'alloc-mistake-1', invoiceId: mockInvoice.id, amount: 5000 },
          ],
          payments: [
            { id: 'pay-1', accountId: mockHdfcLedgerAccount.id, amount: 5000 },
          ],
          businessPartnerId: mockCustomer.id,
          businessPartner: mockCustomer,
        },
      };

      mockPrisma.receiptAllocation.findUnique.mockResolvedValueOnce(singleAllocation);
      jest.spyOn(service, 'remove').mockResolvedValueOnce({ success: true } as any);

      const result = await service.removeAllocation(singleAllocation.id, { deleteReceipt: true }, mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment record removed and balances updated.');
      expect(result.data.receiptDeleted).toBe(true);
      expect(service.remove).toHaveBeenCalledWith(singleAllocation.receiptId, mockUserId);
    });

    it('14. Blocks cross-tenant allocation removal', async () => {
      const foreignAllocation = {
        id: 'alloc-foreign',
        invoice: {
          id: 'inv-foreign',
          companyId: 'cmp-other-tenant',
        },
      };

      mockPrisma.receiptAllocation.findUnique.mockResolvedValueOnce(foreignAllocation);

      await expect(
        service.removeAllocation(foreignAllocation.id, { deleteReceipt: false }, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
