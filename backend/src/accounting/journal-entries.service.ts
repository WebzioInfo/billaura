import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
      where: { id },
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
}
