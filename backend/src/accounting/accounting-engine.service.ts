import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface PostJournalParams {
  companyId: string;
  date: Date;
  reference?: string;
  description?: string;
  lines: {
    accountId: string;
    costCenterId?: string;
    departmentId?: string;
    debit: number;
    credit: number;
  }[];
}

@Injectable()
export class AccountingEngineService {
  /**
   * Core method to post a balanced journal entry.
   * This must always be called within a Prisma interactive transaction.
   */
  async postTransaction(params: PostJournalParams, tx: Prisma.TransactionClient) {
    if (!params.lines || params.lines.length === 0) {
      throw new BadRequestException('Journal entry must contain lines.');
    }

    // 1. Validate balancing (Total Debit == Total Credit)
    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const line of params.lines) {
      totalDebit += line.debit;
      totalCredit += line.credit;
    }

    // Use a small epsilon to account for floating point inaccuracies
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException(`Unbalanced journal entry. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`);
    }

    if (totalDebit === 0 && totalCredit === 0) {
      throw new BadRequestException('Journal entry cannot be zero.');
    }

    // 2. Ensure the Financial Year is open (Auto-initialize if not yet explicitly created)
    let financialYear = await tx.financialYear.findFirst({
      where: {
        companyId: params.companyId,
        startDate: { lte: params.date },
        endDate: { gte: params.date },
        isActive: true,
        isClosed: false,
      }
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

    // 3. Create the Journal Entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        companyId: params.companyId,
        date: params.date,
        reference: params.reference,
        description: params.description,
        lines: {
          create: params.lines.map(line => ({
            accountId: line.accountId,
            costCenterId: line.costCenterId,
            departmentId: line.departmentId,
            debit: line.debit,
            credit: line.credit,
          }))
        }
      },
      include: {
        lines: true
      }
    });

    // 4. Update Account Balances
    // This assumes account balance is (Debit - Credit) for Assets/Expenses
    // For simplicity, we just add (Debit - Credit) to the general balance column
    // The exact nature of balance (positive/negative) depends on AccountCategory.
    for (const line of params.lines) {
      const account = await tx.account.findUnique({ where: { id: line.accountId } });
      if (!account) {
        throw new BadRequestException(`Account not found: ${line.accountId}`);
      }

      // Mathematical equality update:
      // Typically:
      // Asset / Expense: +Debit, -Credit
      // Liability / Equity / Revenue: -Debit, +Credit
      // Here we assume balance = debit - credit for all, making Liability balances negative.
      
      const balanceChange = new Prisma.Decimal(line.debit - line.credit);

      await tx.account.update({
        where: { id: line.accountId },
        data: {
          balance: {
            increment: balanceChange
          }
        }
      });
    }

    return journalEntry;
  }

  /**
   * Reverses a journal entry by creating a matching entry with swapped debits and credits.
   */
  async reverseTransaction(journalEntryId: string, companyId: string, tx: Prisma.TransactionClient, reason?: string) {
    const originalEntry = await tx.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: true }
    });

    if (!originalEntry || originalEntry.companyId !== companyId) {
      throw new BadRequestException('Journal entry not found or unauthorized.');
    }

    const reversalLines = originalEntry.lines.map(line => ({
      accountId: line.accountId,
      costCenterId: line.costCenterId || undefined,
      debit: Number(line.credit), // Swap credit to debit
      credit: Number(line.debit)  // Swap debit to credit
    }));

    return this.postTransaction({
      companyId: originalEntry.companyId,
      date: new Date(), // Reversal happens today
      reference: `REV-${originalEntry.id}`,
      description: `Reversal of ${originalEntry.id}. ${reason || ''}`,
      lines: reversalLines
    }, tx);
  }
}
