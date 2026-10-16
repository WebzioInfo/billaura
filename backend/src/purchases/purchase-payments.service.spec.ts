import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PurchasePaymentsService } from './purchase-payments.service';
import { PrismaService } from '../database/prisma.service';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { CompanyContext } from '../common/context/company-context';
import { PaymentMethod } from '@prisma/client';

describe('PurchasePaymentsService - Payments Made & Vendor Advance', () => {
  let service: PurchasePaymentsService;
  let prisma: any;
  let accountingEngine: any;
  let sequenceService: any;

  const mockCompanyId = 'comp-test-123';
  const mockVendorId = 'vendor-456';
  const mockBankAccountId = 'bank-789';
  const mockLedgerId = 'ledger-bank-789';

  const mockVendor = {
    id: mockVendorId,
    companyId: mockCompanyId,
    name: 'A.S. Enterprises',
    payableBalance: 15000,
    gstin: '29ADXPK0824E1ZC',
    state: 'Karnataka',
  };

  const mockBankAccount = {
    id: mockBankAccountId,
    companyId: mockCompanyId,
    name: 'Petty Cash',
    accountId: mockLedgerId,
    currentBalance: 50000,
  };

  const mockLedger = {
    id: mockLedgerId,
    companyId: mockCompanyId,
    name: 'Petty Cash',
    category: 'ASSET',
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(prisma);
        }
        return Promise.all(cb);
      }),
      businessPartner: {
        findFirst: jest.fn().mockResolvedValue(mockVendor),
        update: jest.fn().mockResolvedValue(mockVendor),
      },
      bankAccount: {
        findFirst: jest.fn().mockResolvedValue(mockBankAccount),
        create: jest.fn().mockResolvedValue(mockBankAccount),
        update: jest.fn().mockResolvedValue(mockBankAccount),
      },
      account: {
        findFirst: jest.fn().mockResolvedValue(mockLedger),
        create: jest.fn().mockResolvedValue(mockLedger),
      },
      purchase: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      transactionPayment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      paymentAllocation: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      journalEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    accountingEngine = {
      postTransaction: jest.fn().mockResolvedValue({ id: 'je-123' }),
      reverseTransaction: jest.fn().mockResolvedValue({ id: 'je-rev-123' }),
    };

    sequenceService = {
      generateNextSequence: jest.fn().mockResolvedValue('PAY-00001'),
      previewNextSequence: jest.fn().mockResolvedValue('PAY-00001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasePaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountingEngineService, useValue: accountingEngine },
        { provide: SequenceService, useValue: sequenceService },
      ],
    }).compile();

    service = module.get<PurchasePaymentsService>(PurchasePaymentsService);
    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Sequence & Numbering Controls', () => {
    it('should preview next payment sequence without advancing', async () => {
      const res = await service.getNextNumber();
      expect(sequenceService.previewNextSequence).toHaveBeenCalledWith(mockCompanyId, 'PAYMENT');
      expect(res.nextNumber).toBe('PAY-00001');
    });

    it('should throw ConflictException if custom payment number already exists', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue(mockVendor);
      prisma.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prisma.account.findFirst.mockResolvedValue(mockLedger);
      prisma.transactionPayment.findFirst.mockResolvedValue({
        id: 'existing-pay-1',
        paymentNo: 'PAY-DUPLICATE',
      });

      await expect(
        service.create({
          vendorId: mockVendorId,
          paymentNumber: 'PAY-DUPLICATE',
          date: '2026-10-16',
          amount: 1000,
          method: PaymentMethod.CASH,
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. Draft vs Paid Lifecycle Protection', () => {
    it('should save a DRAFT payment without modifying bills, balances, or posting GL entries', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue(mockVendor);
      prisma.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prisma.account.findFirst.mockResolvedValue(mockLedger);
      prisma.transactionPayment.create.mockResolvedValue({
        id: 'pay-draft-1',
        companyId: mockCompanyId,
        paymentNo: 'PAY-00001',
        amount: 2500,
        method: PaymentMethod.BANK_TRANSFER,
        notes: JSON.stringify({ status: 'DRAFT', type: 'BILL_PAYMENT' }),
      });

      const res = await service.create({
        vendorId: mockVendorId,
        status: 'DRAFT',
        date: '2026-10-16',
        amount: 2500,
        method: PaymentMethod.BANK_TRANSFER,
        bankAccountId: mockBankAccountId,
      });

      expect(res.status).toBe('DRAFT');
      expect(prisma.purchase.update).not.toHaveBeenCalled();
      expect(prisma.businessPartner.update).not.toHaveBeenCalled();
      expect(prisma.bankAccount.update).not.toHaveBeenCalled();
      expect(accountingEngine.postTransaction).not.toHaveBeenCalled();
    });
  });

  describe('3. Bill Allocations & Multi-Bill Payments', () => {
    it('should successfully allocate across multiple bills, update paid amounts, decrement payable & post balanced GL', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue(mockVendor);
      prisma.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prisma.account.findFirst
        .mockResolvedValueOnce(mockLedger) // bank ledger
        .mockResolvedValueOnce({ id: 'acc-ap', name: 'Accounts Payable' }); // AP ledger

      const mockBill1 = { id: 'bill-1', purchaseNo: 'BILL-001', grandTotal: 2000, amountPaid: 1000 };
      const mockBill2 = { id: 'bill-2', purchaseNo: 'BILL-002', grandTotal: 3000, amountPaid: 0 };

      prisma.purchase.findFirst
        .mockResolvedValueOnce(mockBill1)
        .mockResolvedValueOnce(mockBill2);

      prisma.transactionPayment.create.mockResolvedValue({
        id: 'pay-multi-1',
        companyId: mockCompanyId,
        paymentNo: 'PAY-00001',
        amount: 2500,
        method: PaymentMethod.BANK_TRANSFER,
        allocations: [],
      });

      const res = await service.create({
        vendorId: mockVendorId,
        date: '2026-10-16',
        amount: 2500,
        method: PaymentMethod.BANK_TRANSFER,
        bankAccountId: mockBankAccountId,
        allocations: [
          { purchaseId: 'bill-1', amount: 1000 },
          { purchaseId: 'bill-2', amount: 1500 },
        ],
      });

      expect(res.status).toBe('PAID');
      expect(prisma.purchase.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: { amountPaid: 2000, status: 'PAID' },
      });
      expect(prisma.purchase.update).toHaveBeenCalledWith({
        where: { id: 'bill-2' },
        data: { amountPaid: 1500, status: 'PARTIAL' },
      });
      expect(prisma.businessPartner.update).toHaveBeenCalledWith({
        where: { id: mockVendorId },
        data: { payableBalance: { decrement: 2500 } },
      });
      expect(prisma.bankAccount.update).toHaveBeenCalledWith({
        where: { id: mockBankAccountId },
        data: { currentBalance: { decrement: 2500 } },
      });
      expect(accountingEngine.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [
            { accountId: 'acc-ap', debit: 2500, credit: 0 },
            { accountId: mockLedgerId, debit: 0, credit: 2500 },
          ],
        }),
        expect.anything()
      );
    });

    it('should reject allocation greater than remaining bill balance with BadRequestException', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue(mockVendor);
      prisma.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prisma.account.findFirst.mockResolvedValue(mockLedger);

      const mockBill = { id: 'bill-1', purchaseNo: 'BILL-001', grandTotal: 2000, amountPaid: 1500 }; // remaining due 500
      prisma.purchase.findFirst.mockResolvedValue(mockBill);
      prisma.transactionPayment.create.mockResolvedValue({ id: 'p1' });

      await expect(
        service.create({
          vendorId: mockVendorId,
          date: '2026-10-16',
          amount: 800,
          method: PaymentMethod.CASH,
          allocations: [{ purchaseId: 'bill-1', amount: 800 }], // 800 > 500
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should record unallocated excess as Vendor Advance asset in GL and retain unused amount', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue(mockVendor);
      prisma.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prisma.account.findFirst
        .mockResolvedValueOnce(mockLedger) // bank ledger
        .mockResolvedValueOnce({ id: 'acc-ap', name: 'Accounts Payable' }) // AP
        .mockResolvedValueOnce({ id: 'acc-adv', name: 'Vendor Advances' }); // Advance

      const mockBill = { id: 'bill-1', purchaseNo: 'BILL-001', grandTotal: 2000, amountPaid: 1000 }; // due 1000
      prisma.purchase.findFirst.mockResolvedValue(mockBill);
      prisma.transactionPayment.create.mockResolvedValue({
        id: 'pay-excess-1',
        companyId: mockCompanyId,
        paymentNo: 'PAY-00001',
        amount: 1500,
        allocations: [{ purchaseId: 'bill-1', amount: 1000 }],
      });

      const res = await service.create({
        vendorId: mockVendorId,
        date: '2026-10-16',
        amount: 1500, // 1000 allocated, 500 excess
        method: PaymentMethod.BANK_TRANSFER,
        bankAccountId: mockBankAccountId,
        allocations: [{ purchaseId: 'bill-1', amount: 1000 }],
      });

      expect(res.unusedAmount).toBe(500);
      expect(accountingEngine.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [
            { accountId: 'acc-ap', debit: 1000, credit: 0 },
            { accountId: 'acc-adv', debit: 500, credit: 0 },
            { accountId: mockLedgerId, debit: 0, credit: 1500 },
          ],
        }),
        expect.anything()
      );
    });
  });

  describe('4. Vendor Advance Workflow & TDS Handling', () => {
    it('should record vendor advance with TDS deduction and post balanced entries to GL', async () => {
      prisma.businessPartner.findFirst.mockResolvedValue(mockVendor);
      prisma.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prisma.account.findFirst
        .mockResolvedValueOnce(mockLedger) // bank
        .mockResolvedValueOnce({ id: 'acc-adv', name: 'Vendor Advances' }) // Advance
        .mockResolvedValueOnce({ id: 'acc-tds', name: 'TDS Payable' }); // TDS

      prisma.transactionPayment.create.mockResolvedValue({
        id: 'pay-adv-1',
        companyId: mockCompanyId,
        paymentNo: 'PAY-00002',
        amount: 10000,
        notes: JSON.stringify({ type: 'VENDOR_ADVANCE', status: 'PAID', tdsAmount: 200 }),
      });

      const res = await service.create({
        vendorId: mockVendorId,
        type: 'VENDOR_ADVANCE',
        status: 'PAID',
        date: '2026-10-16',
        amount: 10000,
        tdsRate: 2,
        tdsAmount: 200,
        method: PaymentMethod.BANK_TRANSFER,
        bankAccountId: mockBankAccountId,
      });

      expect(res.type).toBe('VENDOR_ADVANCE');
      expect(res.unusedAmount).toBe(10000);
      // Net payout from bank = 10000 - 200 = 9800
      expect(prisma.bankAccount.update).toHaveBeenCalledWith({
        where: { id: mockBankAccountId },
        data: { currentBalance: { decrement: 9800 } },
      });
      // GL: Debit Advance 10000 = Credit TDS 200 + Credit Bank 9800
      expect(accountingEngine.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [
            { accountId: 'acc-adv', debit: 10000, credit: 0 },
            { accountId: 'acc-tds', debit: 0, credit: 200 },
            { accountId: mockLedgerId, debit: 0, credit: 9800 },
          ],
        }),
        expect.anything()
      );
    });
  });

  describe('5. Payment Reversal / Deletion', () => {
    it('should revert bill amounts, payable balance, bank balance and reverse GL transactions upon deletion', async () => {
      const existingPayment = {
        id: 'pay-to-delete',
        companyId: mockCompanyId,
        businessPartnerId: mockVendorId,
        bankAccountId: mockBankAccountId,
        paymentNo: 'PAY-00001',
        amount: 1500,
        status: 'PAID',
        allocatedAmount: 1500,
        allocations: [{ purchaseId: 'bill-1', amount: 1500 }],
        notes: JSON.stringify({ status: 'PAID', type: 'BILL_PAYMENT' }),
      };

      prisma.transactionPayment.findFirst.mockResolvedValue(existingPayment);
      prisma.purchase.findFirst.mockResolvedValue({
        id: 'bill-1',
        amountPaid: 1500,
      });

      await service.remove('pay-to-delete');

      // Bill status reverted to SENT and amountPaid to 0
      expect(prisma.purchase.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: { amountPaid: 0, status: 'SENT' },
      });
      // Payable balance restored
      expect(prisma.businessPartner.update).toHaveBeenCalledWith({
        where: { id: mockVendorId },
        data: { payableBalance: { increment: 1500 } },
      });
      // Bank balance restored
      expect(prisma.bankAccount.update).toHaveBeenCalledWith({
        where: { id: mockBankAccountId },
        data: { currentBalance: { increment: 1500 } },
      });
      // Soft-deleted
      expect(prisma.transactionPayment.update).toHaveBeenCalledWith({
        where: { id: 'pay-to-delete' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
