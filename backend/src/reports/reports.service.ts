import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateProfitLoss(companyId: string, startDate: Date, endDate: Date) {
    if (!companyId) throw new BadRequestException('Company ID is required');

    // 1. Fetch aggregated ledger balances for the date range
    // We strictly use double-entry records from JournalLines
    const rawBalances: any[] = await this.prisma.$queryRaw`
      SELECT 
        a.id as accountId,
        a.name as accountName,
        a.category as category,
        a.subCategory as subCategory,
        SUM(l.debit) as totalDebit,
        SUM(l.credit) as totalCredit
      FROM journal_lines l
      JOIN journal_entries je ON l.journalEntryId = je.id
      JOIN accounts a ON l.accountId = a.id
      WHERE je.companyId = ${companyId}
        AND je.date >= ${startDate}
        AND je.date <= ${endDate}
        AND a.category IN ('REVENUE', 'EXPENSE')
      GROUP BY a.id, a.name, a.category, a.subCategory
    `;

    // 2. Initialize the P&L structure
    const pnl = {
      revenue: {
        salesRevenue: [] as any[],
        serviceRevenue: [] as any[],
        otherIncome: [] as any[],
        grossRevenue: 0,
      },
      less: {
        salesReturns: [] as any[],
        salesDiscounts: [] as any[],
        totalDeductions: 0,
      },
      netRevenue: 0,
      cogs: {
        items: [] as any[],
        total: 0,
      },
      grossProfit: 0,
      operatingExpenses: {
        items: [] as any[],
        total: 0,
      },
      operatingProfit: 0,
      otherIncome: {
        items: [] as any[],
        total: 0,
      },
      otherExpenses: {
        items: [] as any[],
        total: 0,
      },
      netProfit: 0,
    };

    // 3. Process balances
    for (const row of rawBalances) {
      const debit = Number(row.totalDebit || 0);
      const credit = Number(row.totalCredit || 0);
      
      const isRevenue = row.category === 'REVENUE';
      const balance = isRevenue ? (credit - debit) : (debit - credit);
      
      const accountItem = {
        id: row.accountId,
        name: row.accountName,
        balance,
      };

      // Map to correct section based on subCategory
      switch (row.subCategory) {
        case 'SALES_REVENUE':
          pnl.revenue.salesRevenue.push(accountItem);
          pnl.revenue.grossRevenue += balance;
          break;
        case 'SERVICE_REVENUE':
          pnl.revenue.serviceRevenue.push(accountItem);
          pnl.revenue.grossRevenue += balance;
          break;
        case 'SALES_RETURNS':
          pnl.less.salesReturns.push(accountItem);
          pnl.less.totalDeductions += Math.abs(balance); // Deductions should subtract
          break;
        case 'SALES_DISCOUNTS':
          pnl.less.salesDiscounts.push(accountItem);
          pnl.less.totalDeductions += Math.abs(balance);
          break;
        case 'COGS':
          pnl.cogs.items.push(accountItem);
          pnl.cogs.total += balance;
          break;
        case 'OPERATING_EXPENSE':
          pnl.operatingExpenses.items.push(accountItem);
          pnl.operatingExpenses.total += balance;
          break;
        case 'OTHER_INCOME':
          pnl.otherIncome.items.push(accountItem);
          pnl.otherIncome.total += balance;
          break;
        case 'OTHER_EXPENSE':
          pnl.otherExpenses.items.push(accountItem);
          pnl.otherExpenses.total += balance;
          break;
        default:
          // Fallback if no subCategory is set
          if (isRevenue) {
            pnl.revenue.otherIncome.push(accountItem);
            pnl.revenue.grossRevenue += balance;
          } else {
            pnl.operatingExpenses.items.push(accountItem);
            pnl.operatingExpenses.total += balance;
          }
      }
    }

    // 4. Calculate Totals
    pnl.netRevenue = pnl.revenue.grossRevenue - pnl.less.totalDeductions;
    pnl.grossProfit = pnl.netRevenue - pnl.cogs.total;
    pnl.operatingProfit = pnl.grossProfit - pnl.operatingExpenses.total;
    pnl.netProfit = pnl.operatingProfit + pnl.otherIncome.total - pnl.otherExpenses.total;

    // 5. Build KPI Summary
    const margins = {
      grossMarginPct: pnl.netRevenue > 0 ? (pnl.grossProfit / pnl.netRevenue) * 100 : 0,
      netMarginPct: pnl.netRevenue > 0 ? (pnl.netProfit / pnl.netRevenue) * 100 : 0,
      expenseRatioPct: pnl.netRevenue > 0 ? (pnl.operatingExpenses.total / pnl.netRevenue) * 100 : 0,
    };

    return {
      period: { startDate, endDate },
      statement: pnl,
      kpis: {
        totalRevenue: pnl.netRevenue,
        grossProfit: pnl.grossProfit,
        operatingExpense: pnl.operatingExpenses.total,
        operatingProfit: pnl.operatingProfit,
        netProfit: pnl.netProfit,
        ...margins,
      }
    };
  }
}
