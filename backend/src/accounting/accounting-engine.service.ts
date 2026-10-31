import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface PostJournalParams {
  companyId: string;
  date: Date;
  reference?: string;
  description?: string;
  allowDuplicateReference?: boolean;
  lines: {
    accountId: string;
    costCenterId?: string;
    departmentId?: string;
    debit: number;
    credit: number;
    description?: string;
  }[];
}

export type DefaultAccountPurpose =
  | 'SALES_INCOME'
  | 'ACCOUNTS_RECEIVABLE'
  | 'ACCOUNTS_PAYABLE'
  | 'INVENTORY_ASSET'
  | 'COST_OF_GOODS_SOLD'
  | 'OPENING_BALANCE_EQUITY'
  | 'SALARY_EXPENSE'
  | 'SALARY_PAYABLE'
  | 'OUTPUT_CGST'
  | 'OUTPUT_SGST'
  | 'OUTPUT_IGST'
  | 'INPUT_CGST'
  | 'INPUT_SGST'
  | 'INPUT_IGST'
  | 'ROUND_OFF'
  | 'STOCK_ADJUSTMENT'
  | 'BANK_ACCOUNT'
  | 'CASH_ACCOUNT'
  | 'STATUTORY_PF_PAYABLE'
  | 'STATUTORY_ESI_PAYABLE'
  | 'STATUTORY_TDS_PAYABLE';

interface AccountPurposeConfig {
  settingKey?: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  subCategory?: string;
  defaultName: string;
  candidateNames: string[];
  nature: 'DEBIT' | 'CREDIT';
  balanceType: 'DEBIT' | 'CREDIT';
}

const PURPOSE_CONFIGS: Record<DefaultAccountPurpose, AccountPurposeConfig> = {
  SALES_INCOME: {
    settingKey: 'salesAccountId',
    category: 'REVENUE',
    subCategory: 'OPERATING_REVENUE',
    defaultName: 'Sales',
    candidateNames: ['Sales', 'Sales Income', 'Operating Revenue', 'Revenue from Operations'],
    nature: 'CREDIT',
    balanceType: 'CREDIT',
  },
  ACCOUNTS_RECEIVABLE: {
    settingKey: 'receivableAccountId',
    category: 'ASSET',
    subCategory: 'CURRENT_ASSET',
    defaultName: 'Accounts Receivable',
    candidateNames: ['Accounts Receivable', 'Trade Receivables', 'Sundry Debtors'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  ACCOUNTS_PAYABLE: {
    settingKey: 'payableAccountId',
    category: 'LIABILITY',
    subCategory: 'CURRENT_LIABILITY',
    defaultName: 'Accounts Payable',
    candidateNames: ['Accounts Payable', 'Trade Payables', 'Sundry Creditors'],
    nature: 'CREDIT',
    balanceType: 'CREDIT',
  },
  INVENTORY_ASSET: {
    settingKey: 'inventoryAccountId',
    category: 'ASSET',
    subCategory: 'CURRENT_ASSET',
    defaultName: 'Inventory Asset',
    candidateNames: ['Inventory Asset', 'Stock in Hand', 'Inventory'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  COST_OF_GOODS_SOLD: {
    settingKey: 'cogsAccountId',
    category: 'EXPENSE',
    subCategory: 'COGS',
    defaultName: 'Cost of Goods Sold',
    candidateNames: ['Cost of Goods Sold', 'COGS', 'Cost of Sales'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  OPENING_BALANCE_EQUITY: {
    settingKey: 'openingBalanceEquityAccountId',
    category: 'EQUITY',
    subCategory: 'EQUITY',
    defaultName: 'Opening Balance Equity',
    candidateNames: ['Opening Balance Equity', 'Owner Equity', 'Retained Earnings'],
    nature: 'CREDIT',
    balanceType: 'CREDIT',
  },
  SALARY_EXPENSE: {
    settingKey: 'salaryExpenseAccountId',
    category: 'EXPENSE',
    subCategory: 'OPERATING_EXPENSE',
    defaultName: 'Salaries and Wages',
    candidateNames: ['Salaries and Wages', 'Payroll Expense', 'Salary Expense', 'Staff Salaries'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  SALARY_PAYABLE: {
    settingKey: 'salaryPayableAccountId',
    category: 'LIABILITY',
    subCategory: 'CURRENT_LIABILITY',
    defaultName: 'Salary Payable',
    candidateNames: ['Salary Payable', 'Salaries Payable', 'Payroll Payable'],
    nature: 'CREDIT',
    balanceType: 'CREDIT',
  },
  OUTPUT_CGST: {
    settingKey: 'outputCgstAccountId',
    category: 'LIABILITY',
    subCategory: 'CURRENT_LIABILITY',
    defaultName: 'Output CGST',
    candidateNames: ['Output CGST', 'CGST Output Payable', 'CGST Payable'],
    nature: 'CREDIT',
    balanceType: 'CREDIT',
  },
  OUTPUT_SGST: {
    settingKey: 'outputSgstAccountId',
    category: 'LIABILITY',
    subCategory: 'CURRENT_LIABILITY',
    defaultName: 'Output SGST',
    candidateNames: ['Output SGST', 'SGST Output Payable', 'SGST Payable'],
    nature: 'CREDIT',
    balanceType: 'CREDIT',
  },
  OUTPUT_IGST: {
    settingKey: 'outputIgstAccountId',
    category: 'LIABILITY',
    subCategory: 'CURRENT_LIABILITY',
    defaultName: 'Output IGST',
    candidateNames: ['Output IGST', 'IGST Output Payable', 'IGST Payable'],
    nature: 'CREDIT',
    balanceType: 'CREDIT',
  },
  INPUT_CGST: {
    settingKey: 'inputCgstAccountId',
    category: 'ASSET',
    subCategory: 'CURRENT_ASSET',
    defaultName: 'Input CGST',
    candidateNames: ['Input CGST', 'Input CGST Credit', 'CGST Input Receivable'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  INPUT_SGST: {
    settingKey: 'inputSgstAccountId',
    category: 'ASSET',
    subCategory: 'CURRENT_ASSET',
    defaultName: 'Input SGST',
    candidateNames: ['Input SGST', 'Input SGST Credit', 'SGST Input Receivable'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  INPUT_IGST: {
    settingKey: 'inputIgstAccountId',
    category: 'ASSET',
    subCategory: 'CURRENT_ASSET',
    defaultName: 'Input IGST',
    candidateNames: ['Input IGST', 'Input IGST Credit', 'IGST Input Receivable'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  ROUND_OFF: {
    settingKey: 'roundOffAccountId',
    category: 'EXPENSE',
    subCategory: 'OTHER_EXPENSE',
    defaultName: 'Round Off',
    candidateNames: ['Round Off', 'Rounding Off', 'Rounding Adjustment'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  STOCK_ADJUSTMENT: {
    settingKey: 'stockAdjustmentAccountId',
    category: 'EXPENSE',
    subCategory: 'COGS',
    defaultName: 'Inventory Adjustment',
    candidateNames: ['Inventory Adjustment', 'Stock Adjustment', 'Inventory Shrinkage'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  BANK_ACCOUNT: {
    settingKey: 'defaultBankAccountId',
    category: 'ASSET',
    subCategory: 'CURRENT_ASSET',
    defaultName: 'Bank Accounts',
    candidateNames: ['Bank Accounts', 'Bank Account', 'HDFC Bank', 'ICICI Bank', 'SBI Bank'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  CASH_ACCOUNT: {
    settingKey: 'defaultCashAccountId',
    category: 'ASSET',
    subCategory: 'CURRENT_ASSET',
    defaultName: 'Cash',
    candidateNames: ['Cash', 'Petty Cash', 'Cash on Hand'],
    nature: 'DEBIT',
    balanceType: 'DEBIT',
  },
  STATUTORY_PF_PAYABLE: {
    settingKey: 'pfPayableAccountId',
    category: 'LIABILITY',
    subCategory: 'CURRENT_LIABILITY',
    defaultName: 'PF Payable',
    candidateNames: ['PF Payable', 'Provident Fund Payable', 'Statutory PF Payable'],
    nature: 'CREDIT',
    balanceType: 'CREDIT',
  },
  STATUTORY_ESI_PAYABLE: {
    settingKey: 'esiPayableAccountId',
    category: 'LIABILITY',
    subCategory: 'CURRENT_LIABILITY',
    defaultName: 'ESI Payable',
    candidateNames: ['ESI Payable', 'Employee State Insurance Payable'],
    nature: 'CREDIT',
    balanceType: 'CREDIT',
  },
  STATUTORY_TDS_PAYABLE: {
    settingKey: 'tdsPayableAccountId',
    category: 'LIABILITY',
    subCategory: 'CURRENT_LIABILITY',
    defaultName: 'TDS Payable',
    candidateNames: ['TDS Payable', 'Tax Deducted at Source Payable'],
    nature: 'CREDIT',
    balanceType: 'CREDIT',
  },
};

@Injectable()
export class AccountingEngineService {
  constructor(private readonly prisma?: PrismaService) {}

  /**
   * Central, tenant-aware resolver for core chart-of-accounts mapping.
   * Checks companySettings.defaultAccounts, then existing accounts by name/category,
   * and auto-provisions missing accounts with full double-entry metadata.
   */
  async resolveAccount(
    companyId: string,
    purpose: DefaultAccountPurpose,
    tx: Prisma.TransactionClient,
  ) {
    const config = PURPOSE_CONFIGS[purpose];
    if (!config) {
      throw new BadRequestException(`Unknown account purpose: ${purpose}`);
    }

    // 1. Check company settings for mapped ID
    if (config.settingKey) {
      const settings = await tx.companySettings.findFirst({
        where: { companyId },
        select: { defaultAccounts: true },
      });
      const defMap = (settings?.defaultAccounts as any) || {};
      const mappedId = defMap[config.settingKey];
      if (mappedId) {
        const mappedAcc = await tx.account.findFirst({
          where: { id: mappedId, companyId, isGroup: false },
        });
        if (mappedAcc) return mappedAcc;
      }
    }

    // 2. Search existing accounts by candidate names within company and category
    const existing = await tx.account.findFirst({
      where: {
        companyId,
        category: config.category as any,
        isGroup: false,
        name: { in: config.candidateNames },
      },
    });
    if (existing) return existing;

    // 3. Fallback: match by contains
    for (const nameCandidate of config.candidateNames) {
      const match = await tx.account.findFirst({
        where: {
          companyId,
          category: config.category as any,
          isGroup: false,
          name: { contains: nameCandidate, mode: 'insensitive' },
        },
      });
      if (match) return match;
    }

    // 4. Auto-provision standard compliant account if missing
    return tx.account.create({
      data: {
        companyId,
        name: config.defaultName,
        category: config.category as any,
        subCategory: config.subCategory as any,
        nature: config.nature as any,
        balanceType: config.balanceType as any,
        balance: 0,
        isGroup: false,
      },
    });
  }

  /**
   * Core method to post a balanced double-entry journal entry.
   * Ensures strict double-entry balancing, idempotency, tenant data isolation,
   * account balance updates, and banking synchronization.
   */
  async postTransaction(params: PostJournalParams, tx: Prisma.TransactionClient) {
    if (!params.lines || params.lines.length < 2) {
      throw new BadRequestException('Journal entry must contain at least two lines for double-entry balancing.');
    }

    // 1. Idempotency Check: Prevent duplicate postings for the same business reference
    if (params.reference && !params.allowDuplicateReference) {
      const existing = await tx.journalEntry.findFirst({
        where: {
          companyId: params.companyId,
          reference: params.reference.trim(),
        },
        include: { lines: true },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Validate double-entry balancing with decimal safety
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    const accountIds = params.lines.map((l) => l.accountId);

    // Verify accounts exist and belong strictly to the authenticated tenant
    const accounts = await tx.account.findMany({
      where: {
        id: { in: accountIds },
        companyId: params.companyId,
      },
    });

    if (accounts.length !== new Set(accountIds).size) {
      throw new BadRequestException('One or more accounts are invalid or do not belong to the tenant context.');
    }

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    for (const line of params.lines) {
      const debit = new Prisma.Decimal(Number(line.debit || 0).toFixed(2));
      const credit = new Prisma.Decimal(Number(line.credit || 0).toFixed(2));

      if (debit.lessThan(0) || credit.lessThan(0)) {
        throw new BadRequestException('Negative debits or credits are not permitted in double-entry accounting.');
      }

      if (debit.greaterThan(0) && credit.greaterThan(0)) {
        throw new BadRequestException('A single journal line cannot contain both a debit and a credit.');
      }

      const acc = accountMap.get(line.accountId);
      if (!acc) {
        throw new BadRequestException(`Account not found: ${line.accountId}`);
      }

      if (acc.isGroup) {
        throw new BadRequestException(`Cannot post directly to group account: ${acc.name}. Post to a child leaf account.`);
      }

      totalDebit = totalDebit.plus(debit);
      totalCredit = totalCredit.plus(credit);
    }

    const diff = totalDebit.minus(totalCredit).abs();
    if (diff.greaterThan(0.001)) {
      throw new BadRequestException(
        `Unbalanced journal entry. Total Debit: ${totalDebit.toFixed(2)}, Total Credit: ${totalCredit.toFixed(2)}`
      );
    }

    if (totalDebit.equals(0)) {
      throw new BadRequestException('Journal entry cannot be zero.');
    }

    // 3. Ensure Financial Year is open
    let financialYear = await tx.financialYear.findFirst({
      where: {
        companyId: params.companyId,
        startDate: { lte: params.date },
        endDate: { gte: params.date },
        isActive: true,
        isClosed: false,
      },
    });

    if (!financialYear) {
      const d = new Date(params.date);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-indexed: April is 3
      const startYear = month >= 3 ? year : year - 1;
      const endYear = startYear + 1;
      const fyName = `FY-${startYear}-${endYear}`;
      const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
      const endDate = new Date(`${endYear}-03-31T23:59:59.999Z`);

      financialYear = await tx.financialYear.findFirst({
        where: { companyId: params.companyId, name: fyName },
      });

      if (!financialYear) {
        financialYear = await tx.financialYear.create({
          data: {
            companyId: params.companyId,
            name: fyName,
            startDate,
            endDate,
            isActive: true,
            isClosed: false,
          },
        });
      }
    }

    // Auto-generate reference if omitted
    let finalReference = params.reference?.trim();
    if (!finalReference) {
      const count = await tx.journalEntry.count({
        where: { companyId: params.companyId },
      });
      const year = new Date(params.date).getFullYear();
      finalReference = `JV-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    // 4. Create the Journal Entry and Lines
    const journalEntry = await tx.journalEntry.create({
      data: {
        companyId: params.companyId,
        date: params.date,
        reference: finalReference,
        description: params.description || null,
        lines: {
          create: params.lines.map((line) => ({
            accountId: line.accountId,
            costCenterId: line.costCenterId || null,
            departmentId: line.departmentId || null,
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            description: line.description || null,
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    // 5. Update Account Balances and Synchronize Banking / Cash
    for (const line of params.lines) {
      const debitNum = Number(line.debit || 0);
      const creditNum = Number(line.credit || 0);
      const netChange = debitNum - creditNum;

      await tx.account.update({
        where: { id: line.accountId },
        data: {
          balance: {
            increment: netChange,
          },
        },
      });

      // Synchronize linked BankAccount
      const linkedBank = await tx.bankAccount.findFirst({
        where: { accountId: line.accountId, companyId: params.companyId },
      });
      if (linkedBank) {
        const newBankBal = Number(linkedBank.currentBalance) + netChange;
        await tx.bankAccount.update({
          where: { id: linkedBank.id },
          data: {
            currentBalance: { increment: netChange },
          },
        });

        // Automatically log BankTransaction for bank ledger and reconciliation
        const isDeposit = debitNum > 0;
        const txnAmount = isDeposit ? debitNum : creditNum;
        if (txnAmount > 0) {
          await tx.bankTransaction.create({
            data: {
              companyId: params.companyId,
              bankAccountId: linkedBank.id,
              date: params.date,
              type: isDeposit ? 'DEPOSIT' : 'WITHDRAWAL',
              amount: txnAmount,
              balanceAfter: newBankBal,
              reference: finalReference,
              description: params.description || (isDeposit ? 'Bank Deposit' : 'Bank Withdrawal'),
              isReconciled: false,
            },
          });
        }
      }

      // Synchronize linked CashAccount
      const linkedCash = await tx.cashAccount.findFirst({
        where: { accountId: line.accountId, companyId: params.companyId },
      });
      if (linkedCash) {
        const newCashBal = Number(linkedCash.currentBalance) + netChange;
        await tx.cashAccount.update({
          where: { id: linkedCash.id },
          data: {
            currentBalance: { increment: netChange },
          },
        });

        const isDeposit = debitNum > 0;
        const txnAmount = isDeposit ? debitNum : creditNum;
        if (txnAmount > 0) {
          await tx.cashTransaction.create({
            data: {
              companyId: params.companyId,
              cashAccountId: linkedCash.id,
              date: params.date,
              type: isDeposit ? 'RECEIPT' : 'PAYMENT',
              amount: txnAmount,
              balanceAfter: newCashBal,
              reference: finalReference,
              description: params.description || (isDeposit ? 'Cash Receipt' : 'Cash Payment'),
            },
          });
        }
      }
    }

    return journalEntry;
  }

  /**
   * Reverses a journal entry by creating a matching entry with swapped debits and credits.
   */
  async reverseTransaction(
    journalEntryId: string,
    companyId: string,
    tx: Prisma.TransactionClient,
    reason?: string
  ) {
    const originalEntry = await tx.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: true },
    });

    if (!originalEntry || originalEntry.companyId !== companyId) {
      throw new BadRequestException('Journal entry not found or unauthorized.');
    }

    const reversalLines = originalEntry.lines.map((line) => ({
      accountId: line.accountId,
      costCenterId: line.costCenterId || undefined,
      departmentId: line.departmentId || undefined,
      debit: Number(line.credit), // Swap credit to debit
      credit: Number(line.debit),  // Swap debit to credit
      description: `Reversal of line: ${line.description || originalEntry.reference || ''}`.trim(),
    }));

    return this.postTransaction(
      {
        companyId: originalEntry.companyId,
        date: new Date(),
        reference: `REV-${originalEntry.reference || originalEntry.id}`,
        description: `Reversal of ${originalEntry.reference || originalEntry.id}. ${reason || ''}`.trim(),
        lines: reversalLines,
      },
      tx
    );
  }
}
