import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAccountDto, UpdateAccountDto, AccountLookupQueryDto } from './dto/account.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import { AccountCategory, AccountSubCategory } from '@prisma/client';
import type { Prisma } from '@prisma/client';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);
  
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaultChartOfAccounts(companyId: string) {
    const count = await this.prisma.account.count({ where: {} });
    if (count > 0) return;

    // Create Groups
    const groups = [
      { name: 'Current Assets', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET },
      { name: 'Fixed Assets', category: AccountCategory.ASSET, subCategory: AccountSubCategory.FIXED_ASSET },
      { name: 'Current Liabilities', category: AccountCategory.LIABILITY, subCategory: AccountSubCategory.CURRENT_LIABILITY },
      { name: 'Equity Accounts', category: AccountCategory.EQUITY, subCategory: AccountSubCategory.EQUITY },
      { name: 'Revenue Accounts', category: AccountCategory.REVENUE, subCategory: AccountSubCategory.SALES_REVENUE },
      { name: 'Direct Expenses', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.COGS },
      { name: 'Indirect Expenses', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE },
    ];

    const groupMap = new Map();
    for (const g of groups) {
      const created = await this.prisma.account.create({
        data: {
          companyId,
          name: g.name,
          isGroup: true,
          category: g.category,
          subCategory: g.subCategory,
          balance: 0,
        }
      });
      groupMap.set(g.name, created.id);
    }

    // Create Ledgers under groups
    const ledgers = [
      { name: 'Cash', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, parent: 'Current Assets' },
      { name: 'Bank Accounts', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, parent: 'Current Assets' },
      { name: 'Accounts Receivable', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, parent: 'Current Assets' },
      { name: 'Inventory', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, parent: 'Current Assets' },
      { name: 'Machinery', category: AccountCategory.ASSET, subCategory: AccountSubCategory.FIXED_ASSET, parent: 'Fixed Assets' },
      { name: 'Accounts Payable', category: AccountCategory.LIABILITY, subCategory: AccountSubCategory.CURRENT_LIABILITY, parent: 'Current Liabilities' },
      { name: 'GST Payable', category: AccountCategory.LIABILITY, subCategory: AccountSubCategory.CURRENT_LIABILITY, parent: 'Current Liabilities' },
      { name: 'Owners Capital', category: AccountCategory.EQUITY, subCategory: AccountSubCategory.EQUITY, parent: 'Equity Accounts' },
      { name: 'Retained Earnings', category: AccountCategory.EQUITY, subCategory: AccountSubCategory.EQUITY, parent: 'Equity Accounts' },
      { name: 'Opening Balance Equity', category: AccountCategory.EQUITY, subCategory: AccountSubCategory.EQUITY, parent: 'Equity Accounts' },
      { name: 'Sales Revenue', category: AccountCategory.REVENUE, subCategory: AccountSubCategory.SALES_REVENUE, parent: 'Revenue Accounts' },
      { name: 'Service Revenue', category: AccountCategory.REVENUE, subCategory: AccountSubCategory.SERVICE_REVENUE, parent: 'Revenue Accounts' },
      { name: 'Cost of Goods Sold', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.COGS, parent: 'Direct Expenses' },
      { name: 'Salary Expense', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, parent: 'Indirect Expenses' },
      { name: 'Rent Expense', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, parent: 'Indirect Expenses' },
      { name: 'Utilities Expense', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, parent: 'Indirect Expenses' },
      { name: 'Bank Charges', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OTHER_EXPENSE, parent: 'Indirect Expenses' },
    ];

    await this.prisma.account.createMany({
      data: ledgers.map(l => ({
        companyId,
        name: l.name,
        isGroup: false,
        parentId: groupMap.get(l.parent),
        category: l.category,
        subCategory: l.subCategory,
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

  async lookup(query: AccountLookupQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const search = query.search?.trim();
    const categories: AccountCategory[] = [];
    const subCategories: AccountSubCategory[] = [];

    if (query.allowedAccountTypes) {
      const types = query.allowedAccountTypes.split(',');
      for (const t of types) {
        const trimmed = t.trim().toUpperCase();
        if (trimmed in AccountCategory) {
          categories.push(trimmed as AccountCategory);
        } else if (trimmed in AccountSubCategory) {
          subCategories.push(trimmed as AccountSubCategory);
        }
      }
    }

    const where: Prisma.AccountWhereInput = {
      companyId,
      ...(query.isGroup !== undefined ? { isGroup: query.isGroup } : { isGroup: false }),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ]
      } : {}),
      ...(categories.length > 0 || subCategories.length > 0 ? {
        OR: [
          ...(categories.length > 0 ? [{ category: { in: categories } }] : []),
          ...(subCategories.length > 0 ? [{ subCategory: { in: subCategories } }] : []),
        ]
      } : {}),
    };

    this.logger.log(`Executing lookup query for tenant ${companyId} with filters: ${JSON.stringify(query)}`);

    try {
      if (search) {
        // Case with search term: Retrieve matches, rank in memory, and then paginate
        const data = await this.prisma.account.findMany({
          where,
          select: {
            id: true,
            name: true,
            code: true,
            category: true,
            subCategory: true,
            isGroup: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                name: true,
                code: true,
              }
            }
          },
          take: 500, // Capped to protect memory
        });

        const term = search.toLowerCase();
        const score = (item: any) => {
          const name = item.name.toLowerCase();
          const code = (item.code || '').toLowerCase();
          
          if (name === term || code === term) return 10; // Exact match
          if (name.startsWith(term) || code.startsWith(term)) return 8; // Starts with
          
          // Word contains (starts at word boundary)
          const wordBoundaryRegex = new RegExp('\\b' + term);
          if (wordBoundaryRegex.test(name) || wordBoundaryRegex.test(code)) return 5;
          
          if (name.includes(term) || code.includes(term)) return 3; // Contains anywhere
          return 0;
        };

        const rankedData = data
          .map(item => ({ item, score: score(item) }))
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.item.name.localeCompare(b.item.name);
          })
          .map(x => x.item);

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 25;
        const total = rankedData.length;
        const paginatedData = rankedData.slice((page - 1) * limit, page * limit);

        const mappedData = paginatedData.map(item => ({
          id: item.id,
          name: item.name,
          code: item.code,
          accountType: item.subCategory || item.category,
          category: item.category,
          parent: item.parent ? { id: item.parent.id, name: item.parent.name, code: item.parent.code } : null
        }));

        this.logger.log(`Lookup search successful. Found ${mappedData.length} records of ${total} total.`);
        return {
          data: mappedData,
          meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        };
      } else {
        // Case without search term: Paginate directly in database for scale
        const { skip, take, page, limit } = getPagination(query);

        const [data, total] = await this.prisma.$transaction([
          this.prisma.account.findMany({
            where,
            skip,
            take,
            select: {
              id: true,
              name: true,
              code: true,
              category: true,
              subCategory: true,
              isGroup: true,
              parentId: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                }
              }
            },
            orderBy: { name: 'asc' },
          }),
          this.prisma.account.count({ where }),
        ]);

        const mappedData = data.map(item => ({
          id: item.id,
          name: item.name,
          code: item.code,
          accountType: item.subCategory || item.category,
          category: item.category,
          parent: item.parent ? { id: item.parent.id, name: item.parent.name, code: item.parent.code } : null
        }));

        this.logger.log(`Lookup standard listing successful. Found ${mappedData.length} records of ${total} total.`);
        return {
          data: mappedData,
          meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        };
      }
    } catch (error: any) {
      this.logger.error(`Lookup query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getLedgerInquiry(id: string, query: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const account = await this.prisma.account.findFirst({
      where: { id, companyId },
      include: { parent: true },
    });

    if (!account) {
      throw new NotFoundException(`Ledger account with ID ${id} not found`);
    }

    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const minAmount = query.minAmount ? Number(query.minAmount) : undefined;
    const maxAmount = query.maxAmount ? Number(query.maxAmount) : undefined;
    const voucherType = query.voucherType;
    const search = query.search?.trim().toLowerCase();

    const allLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: id,
        journalEntry: {
          companyId,
        },
      },
      include: {
        journalEntry: true
      },
      orderBy: [
        { journalEntry: { date: 'asc' } },
        { journalEntry: { createdAt: 'asc' } },
        { id: 'asc' }
      ]
    });

    let balance = 0;
    const formattedLines = allLines.map((line) => {
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      
      const isAssetOrExpense = account.category === 'ASSET' || account.category === 'EXPENSE';
      const change = isAssetOrExpense ? (debit - credit) : (credit - debit);
      balance += change;

      const ref = line.journalEntry.reference || '';
      const desc = line.journalEntry.description || '';
      
      let vType = 'Journal Entry';
      let path = '/accounting';
      if (ref.startsWith('INV-') || desc.includes('invoice')) {
        vType = 'Sales Invoice';
        path = '/invoices';
      } else if (ref.startsWith('REC-') || desc.includes('receipt')) {
        vType = 'Receipt';
        path = '/receipts';
      } else if (ref.startsWith('PAY-') || desc.includes('payment') || desc.includes('payout')) {
        vType = 'Vendor Payment';
        path = '/vendor-payments';
      } else if (ref.startsWith('BIL-') || ref.startsWith('PUR-') || desc.includes('purchase')) {
        vType = 'Purchase Bill';
        path = '/bills';
      }

      return {
        id: line.id,
        journalEntryId: line.journalEntryId,
        date: line.journalEntry.date,
        voucherNo: ref || 'JV-' + line.journalEntryId.substring(0, 5).toUpperCase(),
        voucherType: vType,
        path,
        reference: ref,
        description: desc,
        partyName: desc.replace(/Automatic .*posting /i, '') || 'N/A',
        debit,
        credit,
        runningBalance: balance,
        createdAt: line.journalEntry.createdAt,
        status: 'POSTED'
      };
    });

    let filtered = formattedLines;

    let openingBalance = 0;
    if (startDate) {
      const beforeStart = formattedLines.filter(line => new Date(line.date) < startDate);
      if (beforeStart.length > 0) {
        openingBalance = beforeStart[beforeStart.length - 1].runningBalance;
      }
    }

    if (startDate) {
      filtered = filtered.filter(line => new Date(line.date) >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(line => new Date(line.date) <= endDate);
    }
    if (minAmount !== undefined) {
      filtered = filtered.filter(line => Math.max(line.debit, line.credit) >= minAmount);
    }
    if (maxAmount !== undefined) {
      filtered = filtered.filter(line => Math.max(line.debit, line.credit) <= maxAmount);
    }
    if (voucherType) {
      filtered = filtered.filter(line => line.voucherType.toLowerCase() === voucherType.toLowerCase());
    }
    if (search) {
      filtered = filtered.filter(line => 
        line.voucherNo.toLowerCase().includes(search) ||
        line.description.toLowerCase().includes(search) ||
        line.partyName.toLowerCase().includes(search) ||
        line.reference.toLowerCase().includes(search)
      );
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const totalDebit = filtered.reduce((acc, curr) => acc + curr.debit, 0);
    const totalCredit = filtered.reduce((acc, curr) => acc + curr.credit, 0);
    const netMovement = account.category === 'ASSET' || account.category === 'EXPENSE'
      ? totalDebit - totalCredit
      : totalCredit - totalDebit;

    const averageTransaction = (totalDebit + totalCredit) / Math.max(1, filtered.length);
    const largestDebit = filtered.reduce((max, curr) => Math.max(max, curr.debit), 0);
    const largestCredit = filtered.reduce((max, curr) => Math.max(max, curr.credit), 0);

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { companyId, tableName: 'accounts' },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    let linkedPartners: any[] = [];
    const isAR = account.name.toLowerCase().includes('receivable');
    const isAP = account.name.toLowerCase().includes('payable');
    if (isAR) {
      linkedPartners = await this.prisma.businessPartner.findMany({
        where: { companyId, deletedAt: null, bpType: { in: ['CUSTOMER', 'CUSTOMER_VENDOR'] } },
        select: { id: true, name: true, phone: true, gstin: true, receivableBalance: true },
        take: 15
      });
    } else if (isAP) {
      linkedPartners = await this.prisma.businessPartner.findMany({
        where: { companyId, deletedAt: null, bpType: { in: ['VENDOR', 'CUSTOMER_VENDOR'] } },
        select: { id: true, name: true, phone: true, gstin: true, payableBalance: true },
        take: 15
      });
    }

    return {
      success: true,
      data: {
        ledger: {
          id: account.id,
          name: account.name,
          code: account.code,
          category: account.category,
          subCategory: account.subCategory,
          balance: Number(account.balance),
          parentName: account.parent?.name || 'Root Group',
          openingBalance,
          currentBalance: Number(account.balance),
        },
        summary: {
          openingBalance,
          currentBalance: Number(account.balance),
          totalDebit,
          totalCredit,
          netMovement,
          transactionCount: total,
          lastTransactionDate: filtered.length > 0 ? filtered[filtered.length - 1].date : null,
          averageTransaction,
          largestDebit,
          largestCredit,
        },
        transactions: paginated,
        allTransactions: filtered,
        auditLogs: auditLogs.map(log => ({
          id: log.id,
          action: log.action,
          createdAt: log.createdAt,
          ipAddress: log.ipAddress || '127.0.0.1',
          userId: log.userId,
        })),
        linkedPartners: linkedPartners.map(partner => ({
          id: partner.id,
          name: partner.name,
          phone: partner.phone || 'N/A',
          gstin: partner.gstin || 'N/A',
          balance: Number(partner.receivableBalance || partner.payableBalance || 0),
        })),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const account = await this.prisma.account.findFirst({
      where: { id },
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
        companyId,
        name: dto.name,
        code: dto.code,
        category: dto.category,
        subCategory: dto.subCategory,
        balance: dto.balance ?? 0,
        isGroup: dto.isGroup ?? false,
        parentId: dto.parentId,
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
      data: {
        name: dto.name,
        code: dto.code,
        category: dto.category,
        subCategory: dto.subCategory,
        balance: dto.balance,
        isGroup: dto.isGroup,
        parentId: dto.parentId,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

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
      where: {},
    });

    const aggregates = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: { account: { companyId } },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const sumMap = new Map(aggregates.map(a => [a.accountId, { debit: Number(a._sum.debit || 0), credit: Number(a._sum.credit || 0) }]));

    return accounts.map((acc) => {
      const sums = sumMap.get(acc.id) || { debit: 0, credit: 0 };
      return {
        id: acc.id,
        name: acc.name,
        category: acc.category,
        debit: sums.debit,
        credit: sums.credit,
        balance: sums.debit - sums.credit,
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
    });

    const aggregates = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: { account: { companyId, category: { in: [AccountCategory.REVENUE, AccountCategory.EXPENSE] } } },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const sumMap = new Map(aggregates.map(a => [a.accountId, Number(a._sum.debit || 0) - Number(a._sum.credit || 0)]));

    let totalRevenue = 0;
    let totalExpense = 0;

    const items = accounts.map((acc) => {
      const accSum = sumMap.get(acc.id) || 0;

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
    });

    const aggregates = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: { account: { companyId, category: { in: [AccountCategory.ASSET, AccountCategory.LIABILITY, AccountCategory.EQUITY] } } },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const sumMap = new Map(aggregates.map(a => [a.accountId, Number(a._sum.debit || 0) - Number(a._sum.credit || 0)]));

    const items = accounts.map((acc) => {
      const accSum = sumMap.get(acc.id) || 0;

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
