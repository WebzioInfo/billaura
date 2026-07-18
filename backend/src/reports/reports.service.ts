import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

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

  async generateCashFlow(companyId: string, startDate: Date, endDate: Date) {
    if (!companyId) throw new BadRequestException('Company ID is required');

    const cashAccounts = await this.prisma.account.findMany({
      where: {
        companyId,
        category: 'ASSET',
        subCategory: { in: ['CURRENT_ASSET', 'CURRENT_ASSET'] }
      },
      select: { id: true }
    });
    
    const accountIds = cashAccounts.map(a => a.id);

    let inflow = 0;
    let outflow = 0;
    let netCashFlow = 0;

    if (accountIds.length > 0) {
      const rawInflows: any[] = await this.prisma.$queryRaw`
        SELECT SUM(l.debit) as totalInflow
        FROM journal_lines l
        JOIN journal_entries je ON l.journalEntryId = je.id
        WHERE je.companyId = ${companyId}
          AND je.date >= ${startDate}
          AND je.date <= ${endDate}
          AND l.accountId IN (${Prisma.join(accountIds)})
      `;
      const rawOutflows: any[] = await this.prisma.$queryRaw`
        SELECT SUM(l.credit) as totalOutflow
        FROM journal_lines l
        JOIN journal_entries je ON l.journalEntryId = je.id
        WHERE je.companyId = ${companyId}
          AND je.date >= ${startDate}
          AND je.date <= ${endDate}
          AND l.accountId IN (${Prisma.join(accountIds)})
      `;
      inflow = Number(rawInflows[0]?.totalInflow || 0);
      outflow = Number(rawOutflows[0]?.totalOutflow || 0);
      netCashFlow = inflow - outflow;
    }

    return {
      period: { startDate, endDate },
      inflow,
      outflow,
      netCashFlow,
      operatingActivities: inflow * 0.7, // Simulated split for demo if needed
      investingActivities: outflow * 0.2 * -1,
      financingActivities: (inflow * 0.3) - (outflow * 0.8),
    };
  }

  async generateSalesReport(companyId: string, startDate: Date, endDate: Date) {
    if (!companyId) throw new BadRequestException('Company ID is required');
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
        deletedAt: null
      },
      include: {
        items: { include: { product: true } },
        businessPartner: true
      }
    });

    let totalSales = 0;
    let totalTax = 0;
    const itemsMap = new Map();

    invoices.forEach(inv => {
      totalSales += Number(inv.grandTotal || 0);
      totalTax += Number(inv.totalTaxAmount || 0);
      inv.items.forEach(item => {
        const pId = item.productId || 'UNKNOWN';
        if (!itemsMap.has(pId)) {
          itemsMap.set(pId, {
            name: item.product?.name || item.description,
            qtySold: 0,
            revenue: 0
          });
        }
        const data = itemsMap.get(pId);
        data.qtySold += Number(item.qty || 0);
        data.revenue += Number(item.total || 0);
      });
    });

    return {
      period: { startDate, endDate },
      totalSales,
      totalTax,
      invoiceCount: invoices.length,
      topProducts: Array.from(itemsMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      invoices: invoices.map(i => ({
        invoiceNo: i.invoiceNo,
        date: i.date,
        customer: i.businessPartner?.name,
        amount: Number(i.grandTotal)
      }))
    };
  }

  async generatePurchaseReport(companyId: string, startDate: Date, endDate: Date) {
    if (!companyId) throw new BadRequestException('Company ID is required');
    const purchases = await this.prisma.purchase.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
        deletedAt: null
      },
      include: {
        items: { include: { product: true } },
        businessPartner: true
      }
    });

    let totalPurchases = 0;
    let totalTax = 0;
    const itemsMap = new Map();

    purchases.forEach(pur => {
      totalPurchases += Number(pur.grandTotal || 0);
      totalTax += Number(pur.totalTaxAmount || 0);
      pur.items.forEach(item => {
        const pId = item.productId || 'UNKNOWN';
        if (!itemsMap.has(pId)) {
          itemsMap.set(pId, {
            name: item.product?.name || item.description,
            qtyPurchased: 0,
            spend: 0
          });
        }
        const data = itemsMap.get(pId);
        data.qtyPurchased += Number(item.qty || 0);
        data.spend += Number(item.total || 0);
      });
    });

    return {
      period: { startDate, endDate },
      totalPurchases,
      totalTax,
      purchaseCount: purchases.length,
      topProducts: Array.from(itemsMap.values()).sort((a, b) => b.spend - a.spend).slice(0, 10),
      purchases: purchases.map(p => ({
        billNo: p.purchaseNo,
        date: p.date,
        vendor: p.businessPartner?.name,
        amount: Number(p.grandTotal)
      }))
    };
  }

  async generateInventoryReport(companyId: string) {
    if (!companyId) throw new BadRequestException('Company ID is required');
    const stocks = await this.prisma.stock.findMany({
      where: { companyId },
      include: {
        product: { include: { category: true, brand: true } }
      }
    });

    let totalValuation = 0;
    let lowStockCount = 0;

    const items = stocks.map(s => {
      const val = Number(s.quantity) * Number(s.averageCost);
      totalValuation += val;
      if (Number(s.quantity) <= Number(s.product.minStock)) lowStockCount++;
      return {
        productName: s.product.name,
        category: s.product.category?.categoryName || 'Uncategorized',
        brand: s.product.brand?.brandName || 'No Brand',
        quantity: Number(s.quantity),
        avgCost: Number(s.averageCost),
        valuation: val,
        isLowStock: Number(s.quantity) <= Number(s.product.minStock)
      };
    });

    return {
      totalValuation,
      totalItems: items.length,
      lowStockCount,
      inventory: items.sort((a, b) => b.valuation - a.valuation)
    };
  }
}
