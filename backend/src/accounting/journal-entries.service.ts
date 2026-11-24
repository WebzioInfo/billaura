import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateJournalEntryDto } from './dto/journal-entry.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

import { JournalPostingService } from './journal-posting.service';

@Injectable()
export class JournalEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalPostingService: JournalPostingService
  ) {}

  async findAll(query: PaginationQueryDto & { type?: string; view?: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const conditions: Prisma.JournalEntryWhereInput[] = [
      { companyId, deletedAt: null },
    ];

    if (query.search?.trim()) {
      const q = query.search.trim();
      conditions.push({
        OR: [
          { description: { contains: q } },
          { reference: { contains: q } },
        ],
      });
    }

    const type = query.type || (query as any)?.view;
    const autoPrefixes = ['EXP-', 'INV-', 'RCP-', 'REV-', 'PAYMENT-', 'BIL-', 'PUR-'];

    if (type === 'MANUAL') {
      conditions.push({
        OR: [
          { reference: { startsWith: 'JN-' } },
          {
            AND: autoPrefixes.map((p) => ({
              reference: { not: { startsWith: p } },
            })),
          },
        ],
      });
    } else if (type === 'SYSTEM') {
      conditions.push({
        OR: autoPrefixes.map((p) => ({
          reference: { startsWith: p },
        })),
      });
    }

    const where: Prisma.JournalEntryWhereInput = {
      AND: conditions,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.journalEntry.findMany({
        where,
        skip,
        take,
        include: { lines: { include: { account: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    const mapped = data.map((entry) => ({
      ...entry,
      journalNo: entry.reference?.startsWith('JN-') ? entry.reference : `JN-${entry.id.slice(-5)}`,
    }));

    return toPaginatedResult(mapped, total, query);
  }

  async getNextNumber(): Promise<{ nextNumber: string; formattedNumber: string }> {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        companyId,
        reference: { startsWith: 'JN-' },
      },
      select: { reference: true },
    });

    let maxNum = 0;
    for (const entry of entries) {
      if (!entry.reference) continue;
      const match = entry.reference.match(/^JN-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNumber = String(maxNum + 1);
    return {
      nextNumber,
      formattedNumber: `JN-${nextNumber}`,
    };
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { lines: { include: { account: true } } },
    });

    if (!entry) {
      throw new NotFoundException(`Journal Entry with ID ${id} not found`);
    }

    return {
      ...entry,
      journalNo: entry.reference?.startsWith('JN-') ? entry.reference : `JN-${entry.id.slice(-5)}`,
    };
  }

  async create(dto: CreateJournalEntryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    let reference = dto.reference?.trim();
    if (!reference) {
      const next = await this.getNextNumber();
      reference = next.formattedNumber;
    } else {
      // Check if reference already exists in the active company
      const existing = await this.prisma.journalEntry.findFirst({
        where: { companyId, reference, deletedAt: null },
      });
      if (existing) {
        if (reference.startsWith('JN-')) {
          // If auto-numbered JN- format collided, advance to next guaranteed unique number
          const next = await this.getNextNumber();
          reference = next.formattedNumber;
        } else {
          throw new ConflictException(`Journal entry with reference "${reference}" already exists.`);
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      return this.journalPostingService.post(tx as any, companyId, {
        date: new Date(dto.date),
        reference,
        description: dto.description,
        throwOnDuplicateReference: true,
        lines: dto.lines,
      });
    }, { timeout: 20000 });
  }

  async remove(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const entry = await this.findOne(id);

    return this.prisma.$transaction(
      async (tx) => {
        // Unwind financial impact on Account, BankAccount, and CashAccount balances
        for (const line of entry.lines) {
          const debitNum = Number(line.debit || 0);
          const creditNum = Number(line.credit || 0);
          const netChange = debitNum - creditNum;

          if (netChange !== 0) {
            // Revert GL account balance
            await tx.account.update({
              where: { id: line.accountId },
              data: { balance: { decrement: netChange } },
            });

            // Revert linked BankAccount balance if mapped
            const linkedBank = await tx.bankAccount.findFirst({
              where: { accountId: line.accountId, companyId },
            });
            if (linkedBank) {
              await tx.bankAccount.update({
                where: { id: linkedBank.id },
                data: { currentBalance: { decrement: netChange } },
              });
            }

            // Revert linked CashAccount balance if mapped
            const linkedCash = await tx.cashAccount.findFirst({
              where: { accountId: line.accountId, companyId },
            });
            if (linkedCash) {
              await tx.cashAccount.update({
                where: { id: linkedCash.id },
                data: { currentBalance: { decrement: netChange } },
              });
            }
          }
        }

        // Soft delete the journal lines and the entry
        await tx.journalLine.updateMany({
          where: { journalEntryId: entry.id },
          data: { deletedAt: new Date() },
        });

        const deleted = await tx.journalEntry.update({
          where: { id: entry.id },
          data: { deletedAt: new Date() },
        });

        return deleted;
      },
      { timeout: 30000, maxWait: 10000 }
    );
  }
}
