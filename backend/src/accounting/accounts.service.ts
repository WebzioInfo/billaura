import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import { AccountCategory, AccountSubCategory } from '@prisma/client';
import type { Prisma } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaultChartOfAccounts(companyId: string) {
    const count = await this.prisma.account.count({ where: { companyId } });
    if (count > 0) return;

    const defaults = [
      { name: 'Cash', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET },
      { name: 'Bank Accounts', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET },
      { name: 'Accounts Receivable', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET },
      { name: 'Inventory', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET },
      { name: 'Machinery', category: AccountCategory.ASSET, subCategory: AccountSubCategory.FIXED_ASSET },
      { name: 'Accounts Payable', category: AccountCategory.LIABILITY, subCategory: AccountSubCategory.CURRENT_LIABILITY },
      { name: 'GST Payable', category: AccountCategory.LIABILITY, subCategory: AccountSubCategory.CURRENT_LIABILITY },
      { name: 'Owners Capital', category: AccountCategory.EQUITY, subCategory: AccountSubCategory.EQUITY },
      { name: 'Drawings', category: AccountCategory.EQUITY, subCategory: AccountSubCategory.EQUITY },
      { name: 'Retained Earnings', category: AccountCategory.EQUITY, subCategory: AccountSubCategory.EQUITY },
      { name: 'Opening Balance Equity', category: AccountCategory.EQUITY, subCategory: AccountSubCategory.EQUITY },
      { name: 'Sales Revenue', category: AccountCategory.REVENUE, subCategory: AccountSubCategory.SALES_REVENUE },
      { name: 'Service Revenue', category: AccountCategory.REVENUE, subCategory: AccountSubCategory.SERVICE_REVENUE },
      { name: 'Cost of Goods Sold', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.COGS },
      { name: 'Salary Expense', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE },
      { name: 'Rent Expense', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE },
      { name: 'Utilities Expense', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE },
      { name: 'Bank Charges', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OTHER_EXPENSE },
      { name: 'Travel Expense', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE },
    ];

    await this.prisma.account.createMany({
      data: defaults.map(d => ({
        companyId,
        name: d.name,
        category: d.category,
        subCategory: d.subCategory,
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
        subCategory: acc.subCategory,
        balance: balanceVal,
      };
    });

    const revenueItems = items.filter(i => i.category === AccountCategory.REVENUE);
    
    return {
      revenue: {
        salesRevenue: revenueItems.filter(i => i.subCategory === 'SALES_REVENUE'),
        serviceRevenue: revenueItems.filter(i => i.subCategory === 'SERVICE_REVENUE'),
        otherIncome: revenueItems.filter(i => i.subCategory === 'OTHER_INCOME'),
        unclassified: revenueItems.filter(i => !['SALES_REVENUE', 'SERVICE_REVENUE', 'OTHER_INCOME'].includes(i.subCategory as string)),
      },
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

  async getCashFlow() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    await this.ensureDefaultChartOfAccounts(companyId);

    const cashAccounts = await this.prisma.account.findMany({
      where: {
        companyId,
        name: { in: ['Cash', 'Bank Accounts'] },
      },
    });

    const cashAccountIds = cashAccounts.map(a => a.id);

    const journalLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: { in: cashAccountIds },
      },
      include: {
        journalEntry: {
          include: {
            lines: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    });

    let operatingInflow = 0;
    let operatingOutflow = 0;
    const investingInflow = 0;
    const investingOutflow = 0;
    const financingInflow = 0;
    const financingOutflow = 0;

    for (const line of journalLines) {
      const isDebit = Number(line.debit) > 0;
      const amount = isDebit ? Number(line.debit) : Number(line.credit);
      const counterparties = line.journalEntry.lines.filter(l => l.accountId !== line.accountId);
      
      let classified = false;
      for (const cp of counterparties) {
        const cat = cp.account.category;
        if (cat === AccountCategory.REVENUE || cp.account.name === 'Accounts Receivable') {
          if (isDebit) operatingInflow += amount;
          else operatingOutflow += amount;
          classified = true;
          break;
        } else if (cat === AccountCategory.EXPENSE || cp.account.name === 'Accounts Payable') {
          if (isDebit) {
            // Reversal or negative expense
          } else {
            operatingOutflow += amount;
          }
          classified = true;
          break;
        }
      }

      if (!classified) {
        if (isDebit) operatingInflow += amount;
        else operatingOutflow += amount;
      }
    }

    return {
      operatingInflow,
      operatingOutflow,
      operatingNet: operatingInflow - operatingOutflow,
      investingInflow,
      investingOutflow,
      investingNet: investingInflow - investingOutflow,
      financingInflow,
      financingOutflow,
      financingNet: financingInflow - financingOutflow,
      netCashFlow: (operatingInflow - operatingOutflow) + (investingInflow - investingOutflow) + (financingInflow - financingOutflow),
    };
  }
}
