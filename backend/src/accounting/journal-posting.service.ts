import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccountingEngineService } from './accounting-engine.service';

export interface PostJournalLine {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface PostJournalPayload {
  date: Date;
  reference?: string;
  description?: string;
  lines: PostJournalLine[];
}

@Injectable()
export class JournalPostingService {
  constructor(private readonly accountingEngine: AccountingEngineService) {}

  /**
   * Unified posting engine. Delegates to central AccountingEngineService.
   * Ensures double-entry balancing, tenant data isolation, and banking ledger sync.
   */
  async post(
    tx: Prisma.TransactionClient,
    companyId: string,
    payload: PostJournalPayload,
  ) {
    const entry = await this.accountingEngine.postTransaction(
      {
        companyId,
        date: payload.date,
        reference: payload.reference,
        description: payload.description,
        lines: payload.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit || 0,
          credit: l.credit || 0,
          description: l.description,
        })),
      },
      tx
    );

    // Return with accounts included for downstream controller responses
    return tx.journalEntry.findUnique({
      where: { id: entry.id },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
  }
}
