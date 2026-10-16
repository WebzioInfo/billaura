import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { CreateCapitalTransactionDto } from './capital.controller';

@Injectable()
export class CapitalService {
  constructor(private readonly prisma: PrismaService) {}

  async getCapitalOverview() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    // Find Owner's Capital and Owner's Drawings accounts
    const capitalAccount = await this.prisma.account.findFirst({
      where: {
        companyId,
        deletedAt: null,
        name: { in: ["Owner's Capital", "Owners Capital", "Capital Account", "Owner Equity"] },
      },
      include: {
        journalLines: {
          include: { journalEntry: true },
        },
      },
    });

    const drawingsAccount = await this.prisma.account.findFirst({
      where: {
        companyId,
        deletedAt: null,
        name: { in: ["Owner's Drawings", "Owners Drawings", "Drawings", "Owner Drawings"] },
      },
      include: {
        journalLines: {
          include: { journalEntry: true },
        },
      },
    });

    // Calculate totals:
    // Capital Introduced is Credit minus Debit on Capital Account
    let totalIntroduced = 0;
    if (capitalAccount?.journalLines) {
      capitalAccount.journalLines.forEach((l) => {
        totalIntroduced += Number(l.credit) - Number(l.debit);
      });
    }

    // Drawings is Debit minus Credit on Drawings Account
    let totalDrawings = 0;
    if (drawingsAccount?.journalLines) {
      drawingsAccount.journalLines.forEach((l) => {
        totalDrawings += Number(l.debit) - Number(l.credit);
      });
    }

    const netEquity = totalIntroduced - totalDrawings;

    // Recent 10 transactions
    const recentEntries = await this.prisma.journalEntry.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { reference: { startsWith: 'CAP-' } },
          { reference: { startsWith: 'DRW-' } },
          { description: { contains: 'Capital', mode: 'insensitive' } },
          { description: { contains: 'Drawing', mode: 'insensitive' } },
        ],
      },
      include: {
        lines: {
          include: { account: true },
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    const history = recentEntries.map((e) => {
      const ref = (e.reference || '').toUpperCase();
      const desc = (e.description || '').toLowerCase();
      const isDrawing = ref.startsWith('DRW') || desc.includes('drawing');
      const amount = e.lines.reduce((max, l) => Math.max(max, Number(l.debit || 0)), 0);
      const bankLine = e.lines.find(
        (l) => l.account?.category === 'ASSET' || l.account?.name.includes('Bank') || l.account?.name.includes('Cash')
      );

      return {
        id: e.id,
        date: e.date,
        type: isDrawing ? 'DRAWING' : 'INTRODUCED',
        typeLabel: isDrawing ? "Owner's Drawing" : 'Capital Introduced',
        reference: e.reference || '—',
        bankAccount: bankLine?.account?.name || 'Bank/Cash Account',
        notes: e.description || '',
        amount,
      };
    });

    return {
      summary: {
        totalIntroduced: Math.max(0, totalIntroduced),
        totalDrawings: Math.max(0, totalDrawings),
        netEquity,
      },
      recentTransactions: history,
    };
  }

  async recordCapitalTransaction(dto: CreateCapitalTransactionDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve Bank/Cash Account
      let bank = await tx.bankAccount.findFirst({
        where: { id: dto.bankAccountId, companyId, deletedAt: null },
      });

      let bankLedger: any = null;
      if (bank) {
        if (bank.accountId) {
          bankLedger = await tx.account.findFirst({
            where: { id: bank.accountId, companyId, deletedAt: null },
          });
        }
        if (!bankLedger) {
          bankLedger = await tx.account.findFirst({
            where: { companyId, name: bank.name, deletedAt: null },
          });
        }
      } else {
        // Check if cash account
        const cash = await tx.cashAccount.findFirst({
          where: { id: dto.bankAccountId, companyId, deletedAt: null },
        });
        if (cash) {
          if (cash.accountId) {
            bankLedger = await tx.account.findFirst({
              where: { id: cash.accountId, companyId, deletedAt: null },
            });
          }
          if (!bankLedger) {
            bankLedger = await tx.account.findFirst({
              where: { companyId, name: cash.name, deletedAt: null },
            });
          }
        } else {
          // Check if direct Account ID from Chart of Accounts
          bankLedger = await tx.account.findFirst({
            where: { id: dto.bankAccountId, companyId, deletedAt: null },
          });
        }
      }

      if (!bankLedger) {
        // Fallback to active Bank or Cash account
        bankLedger = await tx.account.findFirst({
          where: {
            companyId,
            deletedAt: null,
            name: { in: ['Bank Accounts', 'Cash', 'Federal Bank'] },
          },
        });
      }

      if (!bankLedger) {
        // Create Bank Accounts ledger under ASSET if none existed
        bankLedger = await tx.account.create({
          data: {
            companyId,
            name: bank ? bank.name : 'Bank Accounts',
            code: 'ASSET-BANK',
            category: 'ASSET',
            nature: 'DEBIT',
            balanceType: 'DEBIT',
            balance: 0,
          },
        });
      }

      // 2. Resolve or Auto-Create Equity Account (A2)
      const isIntroduced = dto.type === 'INTRODUCED';
      const targetNames = isIntroduced
        ? ["Owner's Capital", "Owners Capital", "Capital Account", "Owner Equity"]
        : ["Owner's Drawings", "Owners Drawings", "Drawings", "Owner Drawings"];

      let equityAccount = await tx.account.findFirst({
        where: {
          companyId,
          deletedAt: null,
          name: { in: targetNames },
        },
      });

      if (!equityAccount) {
        // Auto-create under EQUITY
        equityAccount = await tx.account.create({
          data: {
            companyId,
            name: isIntroduced ? "Owner's Capital" : "Owner's Drawings",
            code: isIntroduced ? 'EQ-CAP' : 'EQ-DRW',
            category: 'EQUITY',
            nature: isIntroduced ? 'CREDIT' : 'DEBIT',
            balanceType: isIntroduced ? 'CREDIT' : 'DEBIT',
            balance: 0,
          },
        });
      }

      // 3. Create Balanced Journal Entry (A1)
      // Capital Introduced: Dr Bank Account, Cr Owner's Capital
      // Owner's Drawing: Dr Owner's Drawings, Cr Bank Account
      let debitAccountId: string;
      let creditAccountId: string;

      if (isIntroduced) {
        debitAccountId = bankLedger.id;
        creditAccountId = equityAccount.id;
      } else {
        debitAccountId = equityAccount.id;
        creditAccountId = bankLedger.id;
      }

      const ref = dto.reference?.trim() || `${isIntroduced ? 'CAP' : 'DRW'}-${Date.now()}`;
      const narration =
        dto.notes?.trim() ||
        (isIntroduced
          ? `Owner Capital Introduced into ${bankLedger.name}`
          : `Owner Drawing from ${bankLedger.name}`);

      const entry = await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: ref,
          description: narration,
          lines: {
            create: [
              { accountId: debitAccountId, debit: dto.amount, credit: 0, description: narration },
              { accountId: creditAccountId, debit: 0, credit: dto.amount, description: narration },
            ],
          },
        },
        include: { lines: true },
      });

      // 4. Update Ledger Balances
      await tx.account.update({
        where: { id: debitAccountId },
        data: { balance: { increment: dto.amount } },
      });
      await tx.account.update({
        where: { id: creditAccountId },
        data: { balance: { decrement: dto.amount } },
      });

      // 5. Update Bank Account Balance & Record BankTransaction (A1)
      if (bank) {
        const bankChange = isIntroduced ? dto.amount : -dto.amount;
        const newBalance = Number(bank.currentBalance) + bankChange;

        await tx.bankAccount.update({
          where: { id: bank.id },
          data: { currentBalance: { increment: bankChange } },
        });

        await tx.bankTransaction.create({
          data: {
            companyId,
            bankAccountId: bank.id,
            date: new Date(dto.date),
            type: isIntroduced ? 'DEPOSIT' : 'WITHDRAWAL',
            amount: dto.amount,
            balanceAfter: newBalance,
            reference: ref,
            description: narration,
          },
        });
      }

      return entry;
    });
  }
}
