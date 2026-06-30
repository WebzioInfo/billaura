import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import { AccountCategory } from '@prisma/client';
import type { Prisma } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaultChartOfAccounts(companyId: string) {
    const count = await this.prisma.account.count({ where: { companyId } });
    if (count > 0) return;

    const defaults = [
      { name: 'Cash in Hand', category: AccountCategory.ASSET },
      { name: 'Operating Bank Account', category: AccountCategory.ASSET },
      { name: 'Inventory Asset', category: AccountCategory.ASSET },
      { name: 'Accounts Receivable', category: AccountCategory.ASSET },
      { name: 'Accounts Payable', category: AccountCategory.LIABILITY },
      { name: 'Sales Revenue', category: AccountCategory.REVENUE },
      { name: 'Cost of Goods Sold', category: AccountCategory.EXPENSE },
      { name: 'Office Overheads', category: AccountCategory.EXPENSE },
      { name: 'Retained Earnings', category: AccountCategory.EQUITY },
    ];

    await this.prisma.account.createMany({
      data: defaults.map(d => ({
        companyId,
        name: d.name,
        category: d.category,
        balance: 0,
      })),
    });
  }

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    await this.ensureDefaultChartOfAccounts(companyId);

    const { skip, take } = getPagination(query);

    const where: Prisma.AccountWhereInput = {
      companyId,
      ...(query.search
        ? {
            name: { contains: query.search },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where,
        skip,
        take,
        orderBy: { category: 'asc' },
      }),
      this.prisma.account.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const account = await this.prisma.account.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  async create(dto: CreateAccountDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const existing = await this.prisma.account.findFirst({
      where: { companyId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Account with name '${dto.name}' already exists`);
    }

    return this.prisma.account.create({
      data: {
        ...dto,
        companyId,
      },
    });
  }

  async update(id: string, dto: UpdateAccountDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const account = await this.findOne(id);

    if (dto.name && dto.name !== account.name) {
      const existing = await this.prisma.account.findFirst({
        where: { companyId, name: dto.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Account with name '${dto.name}' already exists`);
      }
    }

    return this.prisma.account.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const account = await this.findOne(id);

    // Check if account has journal ledger entries
    const inUse = await this.prisma.journalLine.findFirst({
      where: { accountId: id },
    });

    if (inUse) {
      throw new ConflictException('Cannot delete account with existing transactions');
    }

    return this.prisma.account.delete({
      where: { id },
    });
  }

  // --- FINANCIAL TELEMETRY REPORTS ---

  async getTrialBalance() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    await this.ensureDefaultChartOfAccounts(companyId);

    const accounts = await this.prisma.account.findMany({
      where: { companyId },
      include: {
        journalLines: true,
      },
    });

    return accounts.map((acc) => {
      let debit = 0;
      let credit = 0;
      acc.journalLines.forEach((l) => {
        debit += Number(l.debit || 0);
        credit += Number(l.credit || 0);
      });

      return {
        id: acc.id,
        name: acc.name,
        category: acc.category,
        debit,
        credit,
        balance: debit - credit,
      };
    });
  }

  async getProfitLoss() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    await this.ensureDefaultChartOfAccounts(companyId);

    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        category: { in: [AccountCategory.REVENUE, AccountCategory.EXPENSE] },
      },
      include: { journalLines: true },
    });

    let totalRevenue = 0;
    let totalExpense = 0;

    const items = accounts.map((acc) => {
      let accSum = 0;
      acc.journalLines.forEach((l) => {
        accSum += Number(l.debit || 0) - Number(l.credit || 0);
      });

      // Revenue standard credit balance, Expense standard debit balance
      const balanceVal = acc.category === AccountCategory.REVENUE ? -accSum : accSum;
      if (acc.category === AccountCategory.REVENUE) {
        totalRevenue += balanceVal;
      } else {
        totalExpense += balanceVal;
      }

      return {
        name: acc.name,
        category: acc.category,
        balance: balanceVal,
      };
    });

    return {
      revenue: items.filter(i => i.category === AccountCategory.REVENUE),
      expense: items.filter(i => i.category === AccountCategory.EXPENSE),
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
    };
  }

  async getBalanceSheet() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    await this.ensureDefaultChartOfAccounts(companyId);

    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        category: { in: [AccountCategory.ASSET, AccountCategory.LIABILITY, AccountCategory.EQUITY] },
      },
      include: { journalLines: true },
    });

    const items = accounts.map((acc) => {
      let accSum = 0;
      acc.journalLines.forEach((l) => {
        accSum += Number(l.debit || 0) - Number(l.credit || 0);
      });

      // Assets debit, Liabilities/Equity credit
      const balanceVal = acc.category === AccountCategory.ASSET ? accSum : -accSum;

      return {
        name: acc.name,
        category: acc.category,
        balance: balanceVal,
      };
    });

    const assets = items.filter(i => i.category === AccountCategory.ASSET);
    const liabilities = items.filter(i => i.category === AccountCategory.LIABILITY);
    const equity = items.filter(i => i.category === AccountCategory.EQUITY);

    const totalAssets = assets.reduce((s, i) => s + i.balance, 0);
    const totalLiabilities = liabilities.reduce((s, i) => s + i.balance, 0);
    const totalEquity = equity.reduce((s, i) => s + i.balance, 0);

    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }
}
