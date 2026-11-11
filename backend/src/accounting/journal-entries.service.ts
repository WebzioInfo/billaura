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

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.JournalEntryWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search } },
              { reference: { contains: query.search } },
            ],
          }
        : {}),
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

    return toPaginatedResult(data, total, query);
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

    return entry;
  }

  async create(dto: CreateJournalEntryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    return this.prisma.$transaction(async (tx) => {
      return this.journalPostingService.post(tx as any, companyId, {
        date: new Date(dto.date),
        reference: dto.reference,
        description: dto.description,
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
