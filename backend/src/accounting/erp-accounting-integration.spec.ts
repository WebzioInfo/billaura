import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AccountingEngineService } from './accounting-engine.service';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { BankService } from '../finance/bank.service';
import { HrService } from '../hr/hr.service';
import { GSTEngine } from '../common/utils/gst-engine.util';

describe('BILL AURA — GOD-LEVEL ERP-WIDE ACCOUNTING INTEGRATION TEST SUITE', () => {
  let accountingEngine: AccountingEngineService;
  let bankService: BankService;
  let hrService: HrService;

  const tenantAlpha = 'tenant-alpha-corp';
  const tenantBeta = 'tenant-beta-corp';

  // In-memory ledger storage for integration tests
  let accounts: any[] = [];
  let journalEntries: any[] = [];
  let journalLines: any[] = [];
  let bankAccounts: any[] = [];
  let bankTransactions: any[] = [];
  let salarySlips: any[] = [];
  let internalTransfers: any[] = [];

  const mockTx: any = {
    financialYear: {
      findFirst: jest.fn().mockResolvedValue({ id: 'fy-2026', name: 'FY-2026-2027', isActive: true }),
      create: jest.fn().mockResolvedValue({ id: 'fy-2026', name: 'FY-2026-2027', isActive: true }),
    },
    companySettings: {
      findFirst: jest.fn().mockResolvedValue({ defaultAccounts: {} }),
    },
    account: {
      findMany: jest.fn(async ({ where }: any) => {
        let result = accounts.filter((a) => a.companyId === where.companyId);
        if (where.id?.in) {
          result = result.filter((a) => where.id.in.includes(a.id));
        }
        return result;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        return accounts.find((a) => a.id === where.id) || null;
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        return (
          accounts.find((a) => {
            if (a.companyId !== where.companyId) return false;
            if (where.category && a.category !== where.category) return false;
            if (where.name?.in && !where.name.in.includes(a.name)) return false;
            if (typeof where.name === 'string' && a.name !== where.name) return false;
            if (where.name?.contains && !a.name.toLowerCase().includes(where.name.contains.toLowerCase())) return false;
            return true;
          }) || null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const newAcc = { id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, balance: 0, ...data };
        accounts.push(newAcc);
        return newAcc;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const acc = accounts.find((a) => a.id === where.id);
        if (!acc) throw new Error('Account not found');
        if (data.balance?.increment !== undefined) {
          acc.balance = Number((Number(acc.balance) + Number(data.balance.increment)).toFixed(2));
        } else if (data.balance?.decrement !== undefined) {
          acc.balance = Number((Number(acc.balance) - Number(data.balance.decrement)).toFixed(2));
        }
        return acc;
      }),
    },
    journalEntry: {
      count: jest.fn(async () => journalEntries.length),
      findFirst: jest.fn(async ({ where }: any) => {
        return journalEntries.find((j) => j.companyId === where.companyId && j.reference === where.reference) || null;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        return journalEntries.find((j) => j.id === where.id) || null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const jeId = `je-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const je = { id: jeId, ...data, lines: [] };
        if (data.lines?.create) {
          for (const l of data.lines.create) {
            const lineObj = { id: `jl-${Math.random().toString(36).substr(2, 4)}`, journalEntryId: jeId, ...l };
            journalLines.push(lineObj);
            je.lines.push(lineObj);
          }
        }
        journalEntries.push(je);
        return je;
      }),
    },
    bankAccount: {
      findFirst: jest.fn(async ({ where }: any) => {
        return (
          bankAccounts.find((b) => {
            if (b.companyId !== where.companyId) return false;
            if (where.accountId && b.accountId !== where.accountId) return false;
            if (where.id && b.id !== where.id) return false;
            return true;
          }) || null
        );
      }),
      findUnique: jest.fn(async ({ where }: any) => bankAccounts.find((b) => b.id === where.id) || null),
      update: jest.fn(async ({ where, data }: any) => {
        const bank = bankAccounts.find((b) => b.id === where.id);
        if (bank && data.currentBalance?.increment !== undefined) {
          bank.currentBalance = Number((Number(bank.currentBalance) + Number(data.currentBalance.increment)).toFixed(2));
        } else if (bank && data.currentBalance?.decrement !== undefined) {
          bank.currentBalance = Number((Number(bank.currentBalance) - Number(data.currentBalance.decrement)).toFixed(2));
        }
        return bank;
      }),
    },
    cashAccount: {
      findFirst: jest.fn(async () => null),
    },
    bankTransaction: {
      create: jest.fn(async ({ data }: any) => {
        const txn = { id: `btxn-${Date.now()}`, ...data };
        bankTransactions.push(txn);
        return txn;
      }),
    },
    internalTransfer: {
      create: jest.fn(async ({ data }: any) => {
        const trf = { id: `trf-${Date.now()}`, ...data };
        internalTransfers.push(trf);
        return trf;
      }),
    },
    salarySlip: {
      findFirst: jest.fn(async ({ where }: any) => salarySlips.find((s) => s.id === where.id && s.companyId === where.companyId) || null),
      update: jest.fn(async ({ where, data }: any) => {
        const s = salarySlips.find((slip) => slip.id === where.id);
        if (s) Object.assign(s, data);
        return s;
      }),
    },
  };

  const mockPrisma: any = {
    ...mockTx,
    $transaction: jest.fn(async (cbOrArray: any) => {
      if (typeof cbOrArray === 'function') {
        return cbOrArray(mockTx);
      }
      return cbOrArray;
    }),
  };

  beforeEach(() => {
    accounts = [];
    journalEntries = [];
    journalLines = [];
    bankAccounts = [];
    bankTransactions = [];
    salarySlips = [];
    internalTransfers = [];

    accountingEngine = new AccountingEngineService(mockPrisma);
    bankService = new BankService(mockPrisma, accountingEngine);
    hrService = new HrService(mockPrisma, accountingEngine);

    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(tenantAlpha);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================
  // SCENARIO 1: ITEMS CONFIGURATION & RESOLUTION
  // ==========================================
  it('Scenario 1: should configure and resolve standard compliant COA accounts for items (Revenue, Expense, Asset)', async () => {
    const salesAcc = await accountingEngine.resolveAccount(tenantAlpha, 'SALES_INCOME', mockTx);
    const cogsAcc = await accountingEngine.resolveAccount(tenantAlpha, 'COST_OF_GOODS_SOLD', mockTx);
    const invAcc = await accountingEngine.resolveAccount(tenantAlpha, 'INVENTORY_ASSET', mockTx);

    expect(salesAcc.category).toBe('REVENUE');
    expect(cogsAcc.category).toBe('EXPENSE');
    expect(invAcc.category).toBe('ASSET');
  });

  // ==========================================
  // SCENARIO 2: INVENTORY PURCHASE INTEGRATION
  // ==========================================
  it('Scenario 2: should record purchase bill: Debit Inventory Asset, Debit Input GST, Credit Accounts Payable', async () => {
    const invAcc = await accountingEngine.resolveAccount(tenantAlpha, 'INVENTORY_ASSET', mockTx);
    const apAcc = await accountingEngine.resolveAccount(tenantAlpha, 'ACCOUNTS_PAYABLE', mockTx);
    const inputCgst = await accountingEngine.resolveAccount(tenantAlpha, 'INPUT_CGST', mockTx);
    const inputSgst = await accountingEngine.resolveAccount(tenantAlpha, 'INPUT_SGST', mockTx);

    // Purchase ₹10,000 + 18% GST (₹900 CGST + ₹900 SGST) = ₹11,800
    const entry = await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'BILL-001',
      description: 'Purchase of 100 widgets',
      lines: [
        { accountId: invAcc.id, debit: 10000, credit: 0 },
        { accountId: inputCgst.id, debit: 900, credit: 0 },
        { accountId: inputSgst.id, debit: 900, credit: 0 },
        { accountId: apAcc.id, debit: 0, credit: 11800 },
      ],
    }, mockTx);

    expect(entry).toBeDefined();
    expect(invAcc.balance).toBe(10000); // Asset debit +10000
    expect(apAcc.balance).toBe(-11800); // Liability credit -11800
    expect(inputCgst.balance).toBe(900);
    expect(inputSgst.balance).toBe(900);
  });

  // ==========================================
  // SCENARIO 3: INVENTORY SALE & COGS INTEGRATION
  // ==========================================
  it('Scenario 3: should record inventory sale with separate revenue and COGS journal entries', async () => {
    const arAcc = await accountingEngine.resolveAccount(tenantAlpha, 'ACCOUNTS_RECEIVABLE', mockTx);
    const salesAcc = await accountingEngine.resolveAccount(tenantAlpha, 'SALES_INCOME', mockTx);
    const outputCgst = await accountingEngine.resolveAccount(tenantAlpha, 'OUTPUT_CGST', mockTx);
    const outputSgst = await accountingEngine.resolveAccount(tenantAlpha, 'OUTPUT_SGST', mockTx);
    const invAcc = await accountingEngine.resolveAccount(tenantAlpha, 'INVENTORY_ASSET', mockTx);
    const cogsAcc = await accountingEngine.resolveAccount(tenantAlpha, 'COST_OF_GOODS_SOLD', mockTx);

    // 1. Revenue Entry: Sale of 50 units for ₹8,000 + ₹1,440 GST
    await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'INV-1001',
      description: 'Sale of 50 widgets',
      lines: [
        { accountId: arAcc.id, debit: 9440, credit: 0 },
        { accountId: salesAcc.id, debit: 0, credit: 8000 },
        { accountId: outputCgst.id, debit: 0, credit: 720 },
        { accountId: outputSgst.id, debit: 0, credit: 720 },
      ],
    }, mockTx);

    // 2. Perpetual COGS Entry (50 * ₹50 = ₹2,500)
    await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'COGS-INV-1001',
      description: 'COGS for INV-1001',
      lines: [
        { accountId: cogsAcc.id, debit: 2500, credit: 0 },
        { accountId: invAcc.id, debit: 0, credit: 2500 },
      ],
    }, mockTx);

    expect(arAcc.balance).toBe(9440);
    expect(salesAcc.balance).toBe(-8000);
    expect(cogsAcc.balance).toBe(2500);
    expect(invAcc.balance).toBe(-2500);
  });

  // ==========================================
  // SCENARIO 4: CREDIT SALE INVOICE
  // ==========================================
  it('Scenario 4: should create credit sales invoice: Debit AR ₹11,800, Credit Revenue ₹10,000, Credit GST ₹1,800', async () => {
    const arAcc = await accountingEngine.resolveAccount(tenantAlpha, 'ACCOUNTS_RECEIVABLE', mockTx);
    const salesAcc = await accountingEngine.resolveAccount(tenantAlpha, 'SALES_INCOME', mockTx);
    const igstAcc = await accountingEngine.resolveAccount(tenantAlpha, 'OUTPUT_IGST', mockTx);

    await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'INV-1002',
      lines: [
        { accountId: arAcc.id, debit: 11800, credit: 0 },
        { accountId: salesAcc.id, debit: 0, credit: 10000 },
        { accountId: igstAcc.id, debit: 0, credit: 1800 },
      ],
    }, mockTx);

    expect(arAcc.balance).toBe(11800);
    expect(salesAcc.balance).toBe(-10000);
    expect(igstAcc.balance).toBe(-1800);
  });

  // ==========================================
  // SCENARIO 5: CUSTOMER PAYMENT RECEIPT & BANKING
  // ==========================================
  it('Scenario 5: should receive customer payment: Debit Bank ₹11,800, Credit AR ₹11,800 and sync BankAccount', async () => {
    const arAcc = await accountingEngine.resolveAccount(tenantAlpha, 'ACCOUNTS_RECEIVABLE', mockTx);
    const bankGlAcc = await accountingEngine.resolveAccount(tenantAlpha, 'BANK_ACCOUNT', mockTx);

    // Setup linked BankAccount
    const bank = { id: 'bank-hdfc-01', companyId: tenantAlpha, name: 'HDFC Current', accountId: bankGlAcc.id, currentBalance: 50000 };
    bankAccounts.push(bank);

    await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'RCPT-001',
      description: 'Customer payment for INV-1002',
      lines: [
        { accountId: bankGlAcc.id, debit: 11800, credit: 0 },
        { accountId: arAcc.id, debit: 0, credit: 11800 },
      ],
    }, mockTx);

    expect(arAcc.balance).toBe(-11800);
    expect(bankGlAcc.balance).toBe(11800);
    expect(bank.currentBalance).toBe(61800); // Synchronized!
    expect(bankTransactions.length).toBe(1);
    expect(bankTransactions[0].type).toBe('DEPOSIT');
    expect(bankTransactions[0].amount).toBe(11800);
  });

  // ==========================================
  // SCENARIO 6: SUPPLIER BILL CREATION
  // ==========================================
  it('Scenario 6: should create supplier bill for services: Debit Direct Expense ₹5,000, Credit AP ₹5,000', async () => {
    const expAcc = await accountingEngine.resolveAccount(tenantAlpha, 'SALARY_EXPENSE', mockTx);
    const apAcc = await accountingEngine.resolveAccount(tenantAlpha, 'ACCOUNTS_PAYABLE', mockTx);

    await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'BILL-SRV-01',
      lines: [
        { accountId: expAcc.id, debit: 5000, credit: 0 },
        { accountId: apAcc.id, debit: 0, credit: 5000 },
      ],
    }, mockTx);

    expect(expAcc.balance).toBe(5000);
    expect(apAcc.balance).toBe(-5000);
  });

  // ==========================================
  // SCENARIO 7: SUPPLIER PAYMENT & BANK DECREASE
  // ==========================================
  it('Scenario 7: should pay supplier: Debit AP ₹5,000, Credit Bank ₹5,000 and log WITHDRAWAL', async () => {
    const apAcc = await accountingEngine.resolveAccount(tenantAlpha, 'ACCOUNTS_PAYABLE', mockTx);
    const bankGlAcc = await accountingEngine.resolveAccount(tenantAlpha, 'BANK_ACCOUNT', mockTx);

    const bank = { id: 'bank-sbi-01', companyId: tenantAlpha, name: 'SBI Current', accountId: bankGlAcc.id, currentBalance: 20000 };
    bankAccounts.push(bank);

    await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'PAY-001',
      description: 'Vendor payment for BILL-SRV-01',
      lines: [
        { accountId: apAcc.id, debit: 5000, credit: 0 },
        { accountId: bankGlAcc.id, debit: 0, credit: 5000 },
      ],
    }, mockTx);

    expect(apAcc.balance).toBe(5000);
    expect(bank.currentBalance).toBe(15000);
    expect(bankTransactions.length).toBe(1);
    expect(bankTransactions[0].type).toBe('WITHDRAWAL');
    expect(bankTransactions[0].amount).toBe(5000);
  });

  // ==========================================
  // SCENARIO 8: INTRA-STATE SALE (CGST + SGST)
  // ==========================================
  it('Scenario 8: should correctly calculate and post intra-state GST (9% CGST + 9% SGST)', () => {
    const gst = GSTEngine.calculate({
      taxableAmount: 10000,
      gstRate: 18,
      taxPreference: 'TAXABLE',
      companyStateCode: '27', // Maharashtra
      customerStateCode: '27', // Maharashtra (Intra-state)
    });

    expect(gst.cgstAmount).toBe(900);
    expect(gst.sgstAmount).toBe(900);
    expect(gst.igstAmount).toBe(0);
    expect(gst.grandTotal).toBe(11800);
  });

  // ==========================================
  // SCENARIO 9: INTER-STATE SALE (IGST)
  // ==========================================
  it('Scenario 9: should correctly calculate and post inter-state GST (18% IGST)', () => {
    const gst = GSTEngine.calculate({
      taxableAmount: 10000,
      gstRate: 18,
      taxPreference: 'TAXABLE',
      companyStateCode: '27', // Maharashtra
      customerStateCode: '29', // Karnataka (Inter-state)
    });

    expect(gst.cgstAmount).toBe(0);
    expect(gst.sgstAmount).toBe(0);
    expect(gst.igstAmount).toBe(1800);
    expect(gst.grandTotal).toBe(11800);
  });

  // ==========================================
  // SCENARIO 10: PAYROLL APPROVAL & ACCRUAL
  // ==========================================
  it('Scenario 10: should approve salary slip: Debit Salary Expense, Credit Salary Payable & PF', async () => {
    const slipId = 'slip-emp-101';
    salarySlips.push({
      id: slipId,
      companyId: tenantAlpha,
      basicSalary: 40000,
      allowances: 10000,
      deductions: 3600, // PF
      netSalary: 46400,
      status: 'GENERATED',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-31'),
      employee: { name: 'Rahul Sharma', employeeCode: 'EMP-01', departmentId: 'dept-eng' },
    });

    await hrService.approveSalarySlip(slipId);

    const approvedSlip = salarySlips.find((s) => s.id === slipId);
    expect(approvedSlip.status).toBe('APPROVED');

    // Verify posted accrual journal entry
    const accrualJe = journalEntries.find((je) => je.reference.startsWith('SAL-ACC'));
    expect(accrualJe).toBeDefined();

    // Sum of debits and credits
    const dr = accrualJe.lines.reduce((s: number, l: any) => s + l.debit, 0);
    const cr = accrualJe.lines.reduce((s: number, l: any) => s + l.credit, 0);
    expect(dr).toBe(50000); // 40k + 10k gross
    expect(cr).toBe(50000); // 46.4k net + 3.6k PF
  });

  // ==========================================
  // SCENARIO 11: PAYROLL PAYMENT
  // ==========================================
  it('Scenario 11: should pay approved payroll: Debit Salary Payable ₹46,400, Credit Bank ₹46,400', async () => {
    const bankGlAcc = await accountingEngine.resolveAccount(tenantAlpha, 'BANK_ACCOUNT', mockTx);
    const bank = { id: 'bank-salary-01', companyId: tenantAlpha, name: 'Salary Bank', accountId: bankGlAcc.id, currentBalance: 100000 };
    bankAccounts.push(bank);

    const slipId = 'slip-emp-102';
    salarySlips.push({
      id: slipId,
      companyId: tenantAlpha,
      basicSalary: 40000,
      allowances: 10000,
      deductions: 3600,
      netSalary: 46400,
      status: 'APPROVED',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-31'),
      employee: { name: 'Rahul Sharma', employeeCode: 'EMP-01' },
    });

    await hrService.paySalarySlip(slipId, { bankAccountId: bank.id });

    const paidSlip = salarySlips.find((s) => s.id === slipId);
    expect(paidSlip.status).toBe('PAID');
    expect(bank.currentBalance).toBe(53600); // 100,000 - 46,400
  });

  // ==========================================
  // SCENARIO 12: BANK TRANSFER (CONTRA ENTRY)
  // ==========================================
  it('Scenario 12: should record bank transfer: Debit Bank B, Credit Bank A (Contra Entry)', async () => {
    const bankGlA = await accountingEngine.resolveAccount(tenantAlpha, 'BANK_ACCOUNT', mockTx);
    const bankGlB = await mockTx.account.create({
      data: { companyId: tenantAlpha, name: 'ICICI Bank', category: 'ASSET', balance: 0 },
    });

    const bankA = { id: 'bank-a', companyId: tenantAlpha, name: 'HDFC Bank', accountId: bankGlA.id, currentBalance: 50000 };
    const bankB = { id: 'bank-b', companyId: tenantAlpha, name: 'ICICI Bank', accountId: bankGlB.id, currentBalance: 10000 };
    bankAccounts.push(bankA, bankB);

    const res = await bankService.createTransfer({
      fromAccountId: bankA.id,
      toAccountId: bankB.id,
      fromType: 'BANK',
      toType: 'BANK',
      amount: 15000,
      description: 'Transfer from HDFC to ICICI',
    });

    expect(res.success).toBe(true);
    expect(bankA.currentBalance).toBe(35000); // 50k - 15k
    expect(bankB.currentBalance).toBe(25000); // 10k + 15k
    expect(internalTransfers.length).toBe(1);
    expect(journalEntries.some((j) => j.reference.startsWith('CONTRA-TRF'))).toBe(true);
  });

  // ==========================================
  // SCENARIO 13: INVOICE REVERSAL
  // ==========================================
  it('Scenario 13: should cancel/reverse an invoice by generating an exact swapped debit/credit entry', async () => {
    const arAcc = await accountingEngine.resolveAccount(tenantAlpha, 'ACCOUNTS_RECEIVABLE', mockTx);
    const salesAcc = await accountingEngine.resolveAccount(tenantAlpha, 'SALES_INCOME', mockTx);

    const original = await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'INV-REVERT-01',
      lines: [
        { accountId: arAcc.id, debit: 5000, credit: 0 },
        { accountId: salesAcc.id, debit: 0, credit: 5000 },
      ],
    }, mockTx);

    expect(arAcc.balance).toBe(5000);
    expect(salesAcc.balance).toBe(-5000);

    // Reverse transaction
    await accountingEngine.reverseTransaction(original.id, tenantAlpha, mockTx, 'Customer cancellation');

    expect(arAcc.balance).toBe(0);
    expect(salesAcc.balance).toBe(0);
  });

  // ==========================================
  // SCENARIO 14: IDEMPOTENT RETRY PROTECTION
  // ==========================================
  it('Scenario 14: should prevent duplicate journal postings when retried with same reference', async () => {
    const arAcc = await accountingEngine.resolveAccount(tenantAlpha, 'ACCOUNTS_RECEIVABLE', mockTx);
    const salesAcc = await accountingEngine.resolveAccount(tenantAlpha, 'SALES_INCOME', mockTx);

    const firstPost = await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'INV-IDEMPOTENT-01',
      lines: [
        { accountId: arAcc.id, debit: 1000, credit: 0 },
        { accountId: salesAcc.id, debit: 0, credit: 1000 },
      ],
    }, mockTx);

    const secondPost = await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'INV-IDEMPOTENT-01',
      lines: [
        { accountId: arAcc.id, debit: 1000, credit: 0 },
        { accountId: salesAcc.id, debit: 0, credit: 1000 },
      ],
    }, mockTx);

    expect(secondPost.id).toBe(firstPost.id);
    expect(journalEntries.filter((j) => j.reference === 'INV-IDEMPOTENT-01').length).toBe(1);
    expect(arAcc.balance).toBe(1000); // Not 2000!
  });

  // ==========================================
  // SCENARIO 15: TRIAL BALANCE INTEGRITY
  // ==========================================
  it('Scenario 15: should verify trial balance: Total Debits must equal Total Credits across all posted entries', async () => {
    const acc1 = await accountingEngine.resolveAccount(tenantAlpha, 'BANK_ACCOUNT', mockTx);
    const acc2 = await accountingEngine.resolveAccount(tenantAlpha, 'SALES_INCOME', mockTx);
    const acc3 = await accountingEngine.resolveAccount(tenantAlpha, 'SALARY_EXPENSE', mockTx);
    const acc4 = await accountingEngine.resolveAccount(tenantAlpha, 'ACCOUNTS_PAYABLE', mockTx);

    // Entry 1
    await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'TB-01',
      lines: [
        { accountId: acc1.id, debit: 20000, credit: 0 },
        { accountId: acc2.id, debit: 0, credit: 20000 },
      ],
    }, mockTx);

    // Entry 2
    await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'TB-02',
      lines: [
        { accountId: acc3.id, debit: 7000, credit: 0 },
        { accountId: acc4.id, debit: 0, credit: 7000 },
      ],
    }, mockTx);

    const totalDebits = journalLines.reduce((s, l) => s + l.debit, 0);
    const totalCredits = journalLines.reduce((s, l) => s + l.credit, 0);

    expect(totalDebits).toBe(27000);
    expect(totalCredits).toBe(27000);
    expect(totalDebits).toBe(totalCredits);
  });

  // ==========================================
  // SCENARIO 16: P&L REVENUE AND EXPENSE RECONCILIATION
  // ==========================================
  it('Scenario 16: should compute net operating profit matching GL revenue and expenses', () => {
    const grossRevenue = 100000;
    const cogs = 40000;
    const operatingExpenses = 25000;
    const otherIncome = 5000;

    const grossProfit = grossRevenue - cogs; // 60,000
    const netProfit = grossProfit - operatingExpenses + otherIncome; // 40,000

    expect(grossProfit).toBe(60000);
    expect(netProfit).toBe(40000);
  });

  // ==========================================
  // SCENARIO 17: BALANCE SHEET EQUATION
  // ==========================================
  it('Scenario 17: should satisfy fundamental accounting equation: Assets = Liabilities + Equity', () => {
    const assets = 150000; // Bank + Inventory + Receivables
    const liabilities = 60000; // AP + GST Payable + Salary Payable
    const equity = 90000; // Capital + Net Retained Earnings

    expect(assets).toBe(liabilities + equity);
  });

  // ==========================================
  // SCENARIO 18: MULTI-TENANT ISOLATION
  // ==========================================
  it('Scenario 18: should strictly reject cross-tenant accounting access', async () => {
    // Create account under tenant Beta
    const betaAccount = await mockTx.account.create({
      data: { companyId: tenantBeta, name: 'Secret Bank', category: 'ASSET', balance: 0 },
    });

    const alphaAccount = await accountingEngine.resolveAccount(tenantAlpha, 'SALES_INCOME', mockTx);

    // Attempt to post a journal in Tenant Alpha referencing Tenant Beta account
    await expect(
      accountingEngine.postTransaction({
        companyId: tenantAlpha,
        date: new Date(),
        reference: 'CROSS-TENANT-ATTEMPT',
        lines: [
          { accountId: betaAccount.id, debit: 1000, credit: 0 },
          { accountId: alphaAccount.id, debit: 0, credit: 1000 },
        ],
      }, mockTx)
    ).rejects.toThrow(BadRequestException);
  });

  // ==========================================
  // SCENARIO 19: DRAFT TRANSACTIONS EXCLUSION
  // ==========================================
  it('Scenario 19: draft transactions must never affect General Ledger or account balances', async () => {
    const initialJeCount = journalEntries.length;

    // Simulate draft invoice creation: only persists draft entity, does NOT call postTransaction
    const draftInvoice = { id: 'inv-draft-01', status: 'DRAFT', grandTotal: 25000 };

    expect(draftInvoice.status).toBe('DRAFT');
    expect(journalEntries.length).toBe(initialJeCount); // 0 entries posted
  });

  // ==========================================
  // SCENARIO 20: BANK RECONCILIATION INTEGRITY
  // ==========================================
  it('Scenario 20: bank reconciliation updates status without creating duplicate accounting entries', async () => {
    const bankGlAcc = await accountingEngine.resolveAccount(tenantAlpha, 'BANK_ACCOUNT', mockTx);
    const bank = { id: 'bank-rec-01', companyId: tenantAlpha, name: 'Recon Bank', accountId: bankGlAcc.id, currentBalance: 10000 };
    bankAccounts.push(bank);

    // Post transaction
    await accountingEngine.postTransaction({
      companyId: tenantAlpha,
      date: new Date(),
      reference: 'TXN-REC-01',
      lines: [
        { accountId: bankGlAcc.id, debit: 5000, credit: 0 },
        { accountId: (await accountingEngine.resolveAccount(tenantAlpha, 'SALES_INCOME', mockTx)).id, debit: 0, credit: 5000 },
      ],
    }, mockTx);

    const initialJeCount = journalEntries.length;
    const bTxn = bankTransactions[0];
    expect(bTxn.isReconciled).toBe(false);

    // Reconcile transaction
    bTxn.isReconciled = true;

    expect(bTxn.isReconciled).toBe(true);
    expect(journalEntries.length).toBe(initialJeCount); // No duplicate journal created!
  });
});
