import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

  async generateDepartmentalReport(companyId: string) {
    const departments = await this.prisma.department.findMany({
      where: { companyId, deletedAt: null },
    });

    const employees = await this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      include: { department: true, designation: true },
    });

    const expenses = await this.prisma.expense.findMany({
      where: { companyId, deletedAt: null },
    });

    const otherIncomes = await this.prisma.otherIncome.findMany({
      where: { companyId, deletedAt: null },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: { companyId },
      include: { employee: true },
    });

    const salarySlips = await this.prisma.salarySlip.findMany({
      where: { companyId },
      include: { employee: true },
    });

    // 1. Headcount & Designation counts
    const headcountMap: Record<string, number> = {};
    const designationMap: Record<string, number> = {};
    
    // Seed headcount maps
    departments.forEach((d: any) => {
      headcountMap[d.id] = 0;
    });
    
    employees.forEach(emp => {
      if ((emp as any).departmentId) {
        headcountMap[(emp as any).departmentId] = (headcountMap[(emp as any).departmentId] || 0) + 1;
      }
      if ((emp as any).designationId && emp.designation) {
        designationMap[(emp as any).designation?.name] = (designationMap[(emp as any).designation?.name] || 0) + 1;
      }
    });

    // 2. Salary costs by Department
    const salaryCostMap: Record<string, number> = {};
    salarySlips.forEach(slip => {
      if ((slip.employee as any).departmentId) {
        salaryCostMap[(slip.employee as any).departmentId] = (salaryCostMap[(slip.employee as any).departmentId] || 0) + Number(slip.netSalary);
      }
    });

    // 3. Expenses by Department
    const expenseMap: Record<string, number> = {};
    expenses.forEach(exp => {
      if ((exp as any).departmentId) {
        expenseMap[(exp as any).departmentId] = (expenseMap[(exp as any).departmentId] || 0) + Number(exp.totalAmount);
      }
    });

    // 4. Incomes by Department
    const incomeMap: Record<string, number> = {};
    otherIncomes.forEach(inc => {
      if ((inc as any).departmentId) {
        incomeMap[(inc as any).departmentId] = (incomeMap[(inc as any).departmentId] || 0) + Number(inc.grandTotal);
      }
    });

    // 5. Attendance statistics by Department
    const attendanceMap: Record<string, { present: number; absent: number; leave: number }> = {};
    departments.forEach((d: any) => {
      attendanceMap[d.id] = { present: 0, absent: 0, leave: 0 };
    });

    attendances.forEach(att => {
      const deptId = att.employee.departmentId;
      if (deptId) {
        if (!attendanceMap[deptId]) {
          attendanceMap[deptId] = { present: 0, absent: 0, leave: 0 };
        }
        if (att.type === 'PRESENT') {
          attendanceMap[deptId].present++;
        } else if (att.type === 'ABSENT') {
          attendanceMap[deptId].absent++;
        } else if (att.type === 'LEAVE' || att.type === 'HALF_DAY') {
          attendanceMap[deptId].leave++;
        }
      }
    });

    // Build final report items
    const departmentReportItems = departments.map((d: any) => {
      const headcount = headcountMap[d.id] || 0;
      const salaryCost = salaryCostMap[d.id] || 0;
      const expenseCost = expenseMap[d.id] || 0;
      const incomeValue = incomeMap[d.id] || 0;
      const attStats = attendanceMap[d.id] || { present: 0, absent: 0, leave: 0 };
      const profitability = incomeValue - expenseCost - salaryCost;

      return {
        departmentId: d.id,
        departmentCode: d.code,
        departmentName: d.name,
        headcount,
        salaryCost,
        expenseCost,
        incomeValue,
        profitability,
        attendance: attStats,
      };
    });

    return {
      departmentalSummary: departmentReportItems,
      designationSummary: Object.entries(designationMap).map(([name, count]) => ({ designationName: name, count })),
    };
  }

  async generateCustomerStatement(companyId: string, customerId: string, startDate: Date, endDate: Date) {
    const customer = await this.prisma.businessPartner.findUnique({
      where: { id: customerId, companyId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const historicalInvoices = await this.prisma.historicalInvoice.findMany({
      where: { companyId, businessPartnerId: customerId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });

    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, businessPartnerId: customerId, date: { gte: startDate, lte: endDate }, status: { not: 'DRAFT' } },
      orderBy: { date: 'asc' },
    });

    const payments = await this.prisma.transactionPayment.findMany({
      where: { companyId, businessPartnerId: customerId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });

    let runningBalance = 0;
    const lines = [];

    // Combine and sort chronologically
    const allTransactions = [
      ...historicalInvoices.map(inv => ({ date: inv.date, type: 'Historical Invoice', reference: inv.invoiceNo, debit: Number(inv.totalAmount), credit: 0 })),
      ...invoices.map(inv => ({ date: inv.date, type: 'Invoice', reference: inv.invoiceNo, debit: Number(inv.grandTotal), credit: 0 })),
      ...payments.map(pay => ({ date: pay.date, type: 'Payment Receipt', reference: pay.paymentNo, debit: 0, credit: Number(pay.amount) })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const t of allTransactions) {
      runningBalance += t.debit - t.credit;
      lines.push({ ...t, balance: runningBalance });
    }

    return {
      customer,
      period: { startDate, endDate },
      openingBalance: 0, // Simplified for this implementation
      closingBalance: runningBalance,
      lines,
    };
  }

  async generateCustomerAgeing(companyId: string, asOfDate: Date) {
    const historicalInvoices = await this.prisma.historicalInvoice.findMany({
      where: { companyId, status: { not: 'PAID' }, date: { lte: asOfDate } },
      include: { businessPartner: true },
    });

    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, status: { notIn: ['PAID', 'DRAFT', 'CANCELLED'] }, date: { lte: asOfDate } },
      include: { businessPartner: true },
    });

    const customerAgeingMap: Record<string, any> = {};

    const processInvoice = (inv: any, bp: any, isHistorical: boolean) => {
      if (!bp) return;
      if (!customerAgeingMap[bp.id]) {
        customerAgeingMap[bp.id] = {
          customerId: bp.id,
          customerName: bp.name,
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          older: 0,
          total: 0,
        };
      }

      const totalAmount = isHistorical ? Number(inv.totalAmount) : Number(inv.grandTotal);
      const balance = totalAmount - Number(inv.amountPaid);
      if (balance <= 0) return;

      const dueDate = new Date(inv.dueDate || inv.date);
      const daysOverdue = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
      
      const bucket = customerAgeingMap[bp.id];
      if (daysOverdue <= 0) bucket.current += balance;
      else if (daysOverdue <= 30) bucket.days30 += balance;
      else if (daysOverdue <= 60) bucket.days60 += balance;
      else if (daysOverdue <= 90) bucket.days90 += balance;
      else bucket.older += balance;
      
      bucket.total += balance;
    };

    historicalInvoices.forEach(inv => processInvoice(inv, inv.businessPartner, true));
    invoices.forEach(inv => processInvoice(inv, inv.businessPartner, false));

    return Object.values(customerAgeingMap).filter(c => c.total > 0);
  }
}
