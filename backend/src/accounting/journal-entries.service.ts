import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateJournalEntryDto } from './dto/journal-entry.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class JournalEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.JournalEntryWhereInput = {
      companyId,
      ...(query.search
        ? {
            description: { contains: query.search },
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
      where: { id, companyId },
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

    // Verify double-entry balancing rules
    let sumDebit = 0;
    let sumCredit = 0;

    for (const line of dto.lines) {
      sumDebit += Number(line.debit || 0);
      sumCredit += Number(line.credit || 0);
    }

    if (Math.abs(sumDebit - sumCredit) > 0.01) {
      throw new BadRequestException(`Unbalanced journal entry. Total debits (${sumDebit}) must equal total credits (${sumCredit})`);
    }

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: dto.reference || null,
          description: dto.description || null,
          lines: {
            create: dto.lines.map((l) => ({
              accountId: l.accountId,
              debit: Number(l.debit || 0),
              credit: Number(l.credit || 0),
            })),
          },
        },
        include: { lines: true },
      });

      // Update account balances
      for (const line of dto.lines) {
        const change = Number(line.debit || 0) - Number(line.credit || 0);
        await tx.account.update({
          where: { id: line.accountId },
          data: {
            balance: {
              increment: change,
            },
          },
        });
      }

      return entry;
    });
  }
}
