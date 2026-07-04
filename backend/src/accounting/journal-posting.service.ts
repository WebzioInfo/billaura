import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface PostJournalLine {
  accountId: string;
  debit?: number;
  credit?: number;
}

export interface PostJournalPayload {
  date: Date;
  reference?: string;
  description?: string;
  lines: PostJournalLine[];
}

@Injectable()
export class JournalPostingService {
  /**
   * Core posting engine. Always executed within a Prisma transaction.
   * Ensures strict double-entry balancing and tenant data isolation.
   */
  async post(
    tx: Prisma.TransactionClient,
    companyId: string,
    payload: PostJournalPayload,
  ) {
    if (!payload.lines || payload.lines.length < 2) {
      throw new BadRequestException('A journal entry must have at least two lines');
    }

    let sumDebit = new Prisma.Decimal(0);
    let sumCredit = new Prisma.Decimal(0);

    const accountIds = payload.lines.map((l) => l.accountId);

    // Fetch accounts to validate they exist, belong to company, and aren't groups
    const accounts = await tx.account.findMany({
      where: {
        id: { in: accountIds },
        companyId,
      },
    });

    if (accounts.length !== new Set(accountIds).size) {
      throw new BadRequestException('One or more accounts are invalid, duplicated, or do not belong to the company context');
    }

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    for (const line of payload.lines) {
      const debit = new Prisma.Decimal(line.debit || 0);
      const credit = new Prisma.Decimal(line.credit || 0);

      if (debit.lessThan(0) || credit.lessThan(0)) {
        throw new BadRequestException('Negative debits or credits are not permitted in double-entry accounting');
      }

      if (debit.greaterThan(0) && credit.greaterThan(0)) {
        throw new BadRequestException('A single journal line cannot have both a debit and a credit');
      }

      const account = accountMap.get(line.accountId);
      if (!account) {
        throw new BadRequestException(`Account ${line.accountId} not found in company context`);
      }

      if (account.isGroup) {
        throw new BadRequestException(`Cannot post directly to group account: ${account.name}`);
      }

      sumDebit = sumDebit.plus(debit);
      sumCredit = sumCredit.plus(credit);
    }

    if (!sumDebit.equals(sumCredit)) {
      throw new BadRequestException(
        `Unbalanced journal entry. Total debits (${sumDebit.toNumber()}) must equal total credits (${sumCredit.toNumber()})`
      );
    }

    if (sumDebit.equals(0)) {
      throw new BadRequestException('Journal entry must have a non-zero value');
    }

    // Auto-generate reference if missing
    let finalReference = payload.reference;
    if (!finalReference) {
      const count = await tx.journalEntry.count({
        where: { companyId },
      });
      const year = payload.date.getFullYear();
      finalReference = `JV-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    // Create Entry and Lines
    const entry = await tx.journalEntry.create({
      data: {
        companyId,
        date: payload.date,
        reference: finalReference,
        description: payload.description || null,
        lines: {
          create: payload.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit || 0,
            credit: l.credit || 0,
          })),
        },
      },
      include: { lines: true },
    });

    // Update balances
    for (const line of payload.lines) {
      const change = new Prisma.Decimal(line.debit || 0).minus(new Prisma.Decimal(line.credit || 0));
      
      await tx.account.update({
        where: { id: line.accountId },
        data: {
          balance: {
            increment: change.toNumber(), // Prisma accepts number for increment
          },
        },
      });
    }

    return entry;
  }
}
