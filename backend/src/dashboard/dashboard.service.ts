import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private number(value: unknown): number {
    return value == null ? 0 : Number(value);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  private startOfFiscalYear(date: Date): Date {
    const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    return new Date(year, 3, 1, 0, 0, 0, 0);
  }

  private previousDayRange(now: Date) {
    const today = this.startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: yesterday, end: today };
  }

  private percentChange(current: number, previous: number): number {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  }

  private async sumAccountBalance(companyId: string, terms: string[]) {
    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        isGroup: false,
        category: 'ASSET',
        OR: terms.flatMap((term) => [
          { name: { contains: term, mode: 'insensitive' as const } },
          { parent: { name: { contains: term, mode: 'insensitive' as const } } },
        ]),
      },
      select: { balance: true },
    });

    return accounts.reduce((total, account) => total + this.number(account.balance), 0);
  }

  private async paymentAccounts(companyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        isGroup: false,
        category: 'ASSET',
        OR: [
          { name: { contains: 'cash', mode: 'insensitive' } },
          { name: { contains: 'bank', mode: 'insensitive' } },
          { name: { contains: 'hdfc', mode: 'insensitive' } },
          { name: { contains: 'sbi', mode: 'insensitive' } },
          { name: { contains: 'icici', mode: 'insensitive' } },
          { name: { contains: 'axis', mode: 'insensitive' } },
          { name: { contains: 'kotak', mode: 'insensitive' } },
          { name: { contains: 'federal', mode: 'insensitive' } },
          { name: { contains: 'savings', mode: 'insensitive' } },
          { name: { contains: 'current account', mode: 'insensitive' } },
          { parent: { name: { contains: 'cash', mode: 'insensitive' } } },
          { parent: { name: { contains: 'bank', mode: 'insensitive' } } },
        ],
      },
      include: { parent: { select: { name: true } } },
      orderBy: { name: 'asc' },
      take: 12,
    });

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.name.toLowerCase().includes('cash') || account.parent?.name?.toLowerCase().includes('cash') ? 'Cash Ledger' : 'Bank Ledger',
      balance: this.number(account.balance),
      lastTransaction: null,
    }));
  }

  async getSummary(period = 'this_month', customStart?: string, customEnd?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const now = new Date();
    const todayStart = this.startOfDay(now);
    const monthStart = this.startOfMonth(now);
    const yesterday = this.previousDayRange(now);
    const currentFyStart = this.startOfFiscalYear(now);
    const currentFyEnd = new Date(currentFyStart.getFullYear() + 1, 2, 31, 23, 59, 59, 999);

    // Resolve date range for active filter
    let filterStart: Date | undefined;
    let filterEnd: Date | undefined = this.endOfDay(now);

    if (period === 'today') {
      filterStart = todayStart;
    } else if (period === 'this_week') {
      filterStart = this.startOfWeek(now);
    } else if (period === 'this_month') {
      filterStart = monthStart;
    } else if (period === 'this_year') {
      filterStart = currentFyStart;
    } else if (period === 'custom' && customStart && customEnd) {
      filterStart = new Date(customStart);
      filterEnd = new Date(customEnd);
    } else if (period === 'all') {
      filterStart = undefined;
      filterEnd = undefined;
    } else {
      filterStart = monthStart;
    }

    const liveInvoiceWhere: Prisma.InvoiceWhereInput = { companyId, deletedAt: null };
    const livePurchaseWhere: Prisma.PurchaseWhereInput = { companyId, deletedAt: null };
    const liveExpenseWhere: Prisma.ExpenseWhereInput = { companyId, deletedAt: null };
    const liveReceiptWhere: Prisma.ReceiptWhereInput = { companyId, deletedAt: null };
    const completedPaymentWhere: Prisma.TransactionPaymentWhereInput = { companyId, paymentType: 'OUTBOUND' };

    const dateFilter: Prisma.DateTimeFilter | undefined = (filterStart || filterEnd)
      ? { ...(filterStart && { gte: filterStart }), ...(filterEnd && { lte: filterEnd }) }
      : undefined;

    const periodInvoiceWhere: Prisma.InvoiceWhereInput = {
      ...liveInvoiceWhere,
      ...(dateFilter && { date: dateFilter }),
    };
    const periodReceiptWhere: Prisma.ReceiptWhereInput = {
      ...liveReceiptWhere,
      status: 'COMPLETED',
      ...(dateFilter && { date: dateFilter }),
    };
    const periodExpenseWhere: Prisma.ExpenseWhereInput = {
      ...liveExpenseWhere,
      ...(dateFilter && { date: dateFilter }),
    };
    const periodPaymentWhere: Prisma.TransactionPaymentWhereInput = {
      ...completedPaymentWhere,
      ...(dateFilter && { date: dateFilter }),
    };

    // Prepare 6-month historical chart intervals
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartMonths: Array<{ start: Date; end: Date; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      chartMonths.push({
        start,
        end,
        label: monthNames[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? ` '${String(d.getFullYear()).slice(-2)}` : ''),
      });
    }

    // Run chart queries separately for clean typing
    const chartPromises = chartMonths.map(async (m) => {
      const [inv, rec, exp] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: { ...liveInvoiceWhere, date: { gte: m.start, lte: m.end } },
          _sum: { grandTotal: true },
        }),
        this.prisma.receipt.aggregate({
          where: { ...liveReceiptWhere, status: 'COMPLETED', date: { gte: m.start, lte: m.end } },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { ...liveExpenseWhere, date: { gte: m.start, lte: m.end } },
          _sum: { totalAmount: true },
        }),
      ]);

      return {
        label: m.label,
        sales: this.number(inv._sum.grandTotal),
        received: this.number(rec._sum.amount),
        expenses: this.number(exp._sum.totalAmount),
      };
    });

    const [
      company,
      periodSales,
      periodReceipts,
      periodPayments,
      periodExpenses,
      todaySales,
      yesterdaySales,
      monthSales,
      todayReceipts,
      yesterdayReceipts,
      todayPayments,
      yesterdayPayments,
      todayExpenses,
      yesterdayExpenses,
      monthExpenses,
      receivablePartners,
      payablePartners,
      overdueInvoices,
      upcomingPurchases,
      overduePurchases,
      invoiceGst,
      purchaseGst,
      cashBalance,
      bankBalance,
      paymentAccountRows,
      recentInvoices,
      recentReceipts,
      recentPayments,
      recentExpenses,
      recentPurchases,
      lowStockProducts,
      draftInvoices,
      draftPurchases,
      pendingExpenses,
      journalCount,
      customerCount,
      vendorCount,
      topCustomers,
      topVendors,
      expenseCategories,
      chartData,
    ] = await Promise.all([
      this.prisma.company.findFirst({ where: { id: companyId }, select: { companyName: true } }),
      this.prisma.invoice.aggregate({ where: periodInvoiceWhere, _sum: { grandTotal: true } }),
      this.prisma.receipt.aggregate({ where: periodReceiptWhere, _sum: { amount: true } }),
      this.prisma.transactionPayment.aggregate({ where: periodPaymentWhere, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: periodExpenseWhere, _sum: { totalAmount: true } }),
      this.prisma.invoice.aggregate({ where: { ...liveInvoiceWhere, date: { gte: todayStart } }, _sum: { grandTotal: true } }),
      this.prisma.invoice.aggregate({ where: { ...liveInvoiceWhere, date: { gte: yesterday.start, lt: yesterday.end } }, _sum: { grandTotal: true } }),
      this.prisma.invoice.aggregate({ where: { ...liveInvoiceWhere, date: { gte: monthStart } }, _sum: { grandTotal: true } }),
      this.prisma.receipt.aggregate({ where: { ...liveReceiptWhere, date: { gte: todayStart }, status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.receipt.aggregate({ where: { ...liveReceiptWhere, date: { gte: yesterday.start, lt: yesterday.end }, status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.transactionPayment.aggregate({ where: { ...completedPaymentWhere, date: { gte: todayStart } }, _sum: { amount: true } }),
      this.prisma.transactionPayment.aggregate({ where: { ...completedPaymentWhere, date: { gte: yesterday.start, lt: yesterday.end } }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { ...liveExpenseWhere, date: { gte: todayStart } }, _sum: { totalAmount: true } }),
      this.prisma.expense.aggregate({ where: { ...liveExpenseWhere, date: { gte: yesterday.start, lt: yesterday.end } }, _sum: { totalAmount: true } }),
      this.prisma.expense.aggregate({ where: { ...liveExpenseWhere, date: { gte: monthStart } }, _sum: { totalAmount: true } }),
      this.prisma.businessPartner.findMany({ where: { companyId, deletedAt: null, bpType: { in: ['CUSTOMER', 'CUSTOMER_VENDOR'] }, receivableBalance: { gt: 0 } }, select: { id: true, name: true, receivableBalance: true }, orderBy: { receivableBalance: 'desc' }, take: 5 }),
      this.prisma.businessPartner.findMany({ where: { companyId, deletedAt: null, bpType: { in: ['VENDOR', 'CUSTOMER_VENDOR'] }, payableBalance: { gt: 0 } }, select: { id: true, name: true, payableBalance: true }, orderBy: { payableBalance: 'desc' }, take: 5 }),
      this.prisma.invoice.findMany({ where: { ...liveInvoiceWhere, dueDate: { lt: todayStart }, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } }, include: { businessPartner: { select: { name: true } } }, orderBy: { dueDate: 'asc' }, take: 5 }),
      this.prisma.purchase.findMany({ where: { ...livePurchaseWhere, status: { in: ['SENT', 'PARTIAL', 'DRAFT'] } }, include: { businessPartner: { select: { name: true } } }, orderBy: { date: 'desc' }, take: 5 }),
      this.prisma.purchase.findMany({ where: { ...livePurchaseWhere, date: { lt: todayStart }, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } }, include: { businessPartner: { select: { name: true } } }, orderBy: { date: 'asc' }, take: 5 }),
      this.prisma.invoice.aggregate({ where: liveInvoiceWhere, _sum: { totalTaxAmount: true } }),
      this.prisma.purchase.aggregate({ where: livePurchaseWhere, _sum: { totalTaxAmount: true } }),
      this.sumAccountBalance(companyId, ['cash']),
      this.sumAccountBalance(companyId, ['bank', 'hdfc', 'sbi', 'icici', 'axis', 'kotak', 'federal', 'savings', 'current account']),
      this.paymentAccounts(companyId),
      this.prisma.invoice.findMany({ where: liveInvoiceWhere, take: 5, orderBy: { createdAt: 'desc' }, include: { businessPartner: { select: { name: true } } } }),
      this.prisma.receipt.findMany({
        where: liveReceiptWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          businessPartner: { select: { name: true } },
          payments: { select: { paymentMethod: true, account: { select: { name: true } } }, take: 1 },
        },
      }),
      this.prisma.transactionPayment.findMany({ where: completedPaymentWhere, take: 5, orderBy: { createdAt: 'desc' }, include: { businessPartner: { select: { name: true } } } }),
      this.prisma.expense.findMany({
        where: liveExpenseWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { name: true } },
        },
      }),
      this.prisma.purchase.findMany({ where: livePurchaseWhere, take: 5, orderBy: { createdAt: 'desc' }, include: { businessPartner: { select: { name: true } } } }),
      this.prisma.product.findMany({ where: { companyId, deletedAt: null, isActive: true, reorderLevel: { gt: 0 } }, include: { stocks: { select: { availableQuantity: true, quantity: true } } }, orderBy: { name: 'asc' }, take: 50 }),
      this.prisma.invoice.count({ where: { ...liveInvoiceWhere, status: 'DRAFT' } }),
      this.prisma.purchase.count({ where: { ...livePurchaseWhere, status: 'DRAFT' } }),
      this.prisma.expense.count({ where: { ...liveExpenseWhere, approvalStatus: 'PENDING' } }),
      this.prisma.journalEntry.count({ where: { companyId } }),
      this.prisma.businessPartner.count({ where: { companyId, deletedAt: null, bpType: { in: ['CUSTOMER', 'CUSTOMER_VENDOR'] } } }),
      this.prisma.businessPartner.count({ where: { companyId, deletedAt: null, bpType: { in: ['VENDOR', 'CUSTOMER_VENDOR'] } } }),
      this.prisma.invoice.groupBy({ by: ['businessPartnerId'], where: liveInvoiceWhere, _sum: { grandTotal: true }, orderBy: { _sum: { grandTotal: 'desc' } }, take: 5 }),
      this.prisma.purchase.groupBy({ by: ['businessPartnerId'], where: livePurchaseWhere, _sum: { grandTotal: true }, orderBy: { _sum: { grandTotal: 'desc' } }, take: 5 }),
      this.prisma.expense.groupBy({ by: ['categoryId'], where: liveExpenseWhere, _sum: { totalAmount: true }, orderBy: { _sum: { totalAmount: 'desc' } }, take: 5 }),
      Promise.all(chartPromises),
    ]);

    const todaySalesValue = this.number(todaySales._sum.grandTotal);
    const todayReceiptsValue = this.number(todayReceipts._sum.amount);
    const todayPaymentsValue = this.number(todayPayments._sum.amount);
    const todayExpensesValue = this.number(todayExpenses._sum.totalAmount);
    const monthlyRevenue = this.number(monthSales._sum.grandTotal);
    const monthlyExpenses = this.number(monthExpenses._sum.totalAmount);
    const profitToday = todaySalesValue - todayExpensesValue;
    const monthlyProfit = monthlyRevenue - monthlyExpenses;
    const receivablesTotal = receivablePartners.reduce((sum, partner) => sum + this.number(partner.receivableBalance), 0);
    const payablesTotal = payablePartners.reduce((sum, partner) => sum + this.number(partner.payableBalance), 0);
    const gstLiability = Math.max(this.number(invoiceGst._sum.totalTaxAmount) - this.number(purchaseGst._sum.totalTaxAmount), 0);

    const partnerIds = Array.from(new Set([
      ...topCustomers.map((x) => x.businessPartnerId),
      ...topVendors.map((x) => x.businessPartnerId),
    ]));
    const categoryIds = expenseCategories.map((x) => x.categoryId).filter(Boolean) as string[];

    const [partners, categories] = await Promise.all([
      partnerIds.length ? this.prisma.businessPartner.findMany({ where: { id: { in: partnerIds } }, select: { id: true, name: true } }) : [],
      categoryIds.length ? this.prisma.expenseCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } }) : [],
    ]);

    const partnerName = new Map(partners.map((partner) => [partner.id, partner.name]));
    const categoryName = new Map(categories.map((category) => [category.id, category.name]));

    const recentActivity = [
      ...recentInvoices.map((invoice) => ({
        id: invoice.id,
        title: invoice.businessPartner?.name || 'Customer Invoice',
        reference: invoice.invoiceNo,
        description: 'Invoice Issued',
        amount: this.number(invoice.grandTotal),
        direction: 'IN' as const,
        type: 'Invoice Created',
        date: invoice.date || invoice.createdAt,
        account: 'Receivable',
        status: invoice.status,
      })),
      ...recentReceipts.map((receipt) => {
        const pmt = receipt.payments?.[0];
        const accountLabel = pmt?.account?.name || pmt?.paymentMethod || 'Bank / Cash';
        return {
          id: receipt.id,
          title: receipt.businessPartner?.name || 'Payment Received',
          reference: receipt.receiptNo,
          description: 'Money Received',
          amount: this.number(receipt.amount),
          direction: 'IN' as const,
          type: 'Receipt Recorded',
          date: receipt.date || receipt.createdAt,
          account: accountLabel,
          status: receipt.status,
        };
      }),
      ...recentPayments.map((payment) => ({
        id: payment.id,
        title: payment.businessPartner?.name || 'Vendor Payment',
        reference: payment.paymentNo,
        description: 'Payment Settled',
        amount: this.number(payment.amount),
        direction: 'OUT' as const,
        type: 'Payment Made',
        date: payment.date || payment.createdAt,
        account: payment.method || 'Bank Transfer',
        status: payment.method,
      })),
      ...recentExpenses.map((expense) => ({
        id: expense.id,
        title: expense.category?.name || expense.description || 'Business Expense',
        reference: expense.expenseNo,
        description: expense.description || 'Expense Recorded',
        amount: this.number(expense.totalAmount),
        direction: 'OUT' as const,
        type: 'Expense Added',
        date: expense.date || expense.createdAt,
        account: expense.paymentMethod || 'Cash / Bank',
        status: expense.status,
      })),
      ...recentPurchases.map((purchase) => ({
        id: purchase.id,
        title: purchase.businessPartner?.name || 'Vendor Bill',
        reference: purchase.purchaseNo,
        description: 'Bill Received',
        amount: this.number(purchase.grandTotal),
        direction: 'OUT' as const,
        type: 'Bill Posted',
        date: purchase.date || purchase.createdAt,
        account: 'Payable',
        status: purchase.status,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    const lowStock = lowStockProducts
      .map((product) => {
        const available = product.stocks.reduce((sum, stock) => sum + this.number(stock.availableQuantity ?? stock.quantity), 0);
        return {
          id: product.id,
          name: product.name,
          sku: product.sku || 'N/A',
          reorderLevel: this.number(product.reorderLevel),
          availableQuantity: available,
        };
      })
      .filter((product) => product.availableQuantity <= product.reorderLevel)
      .slice(0, 5);

    const selectedSales = this.number(periodSales._sum.grandTotal);
    const selectedReceived = this.number(periodReceipts._sum.amount);
    const selectedExpenses = this.number(periodExpenses._sum.totalAmount);
    const selectedPayments = this.number(periodPayments._sum.amount);

    return {
      company: {
        name: company?.companyName || 'Bill Aura Workspace',
        financialYear: `${currentFyStart.getFullYear()}-${currentFyEnd.getFullYear()}`,
        today: now.toISOString(),
      },
      // Primary business summary cards for the selected period
      summary: {
        period,
        sales: selectedSales,
        received: selectedReceived,
        expenses: selectedExpenses + selectedPayments,
        pending: receivablesTotal,
        cashBalance,
        bankBalance,
        totalBalance: cashBalance + bankBalance,
      },
      // Real historical chart data
      chartData,
      metrics: {
        todaySales: todaySalesValue,
        todayReceipts: todayReceiptsValue,
        todayPayments: todayPaymentsValue,
        todayExpenses: todayExpensesValue,
        cashBalance,
        bankBalance,
        receivablesTotal,
        payablesTotal,
        monthlyRevenue,
        monthlyProfit,
        profitToday,
        netCashFlow: todayReceiptsValue - todayPaymentsValue - todayExpensesValue,
        gstLiability,
        customerCount,
        vendorCount,
      },
      comparisons: {
        todaySales: this.percentChange(todaySalesValue, this.number(yesterdaySales._sum.grandTotal)),
        todayReceipts: this.percentChange(todayReceiptsValue, this.number(yesterdayReceipts._sum.amount)),
        todayPayments: this.percentChange(todayPaymentsValue, this.number(yesterdayPayments._sum.amount)),
        todayExpenses: this.percentChange(todayExpensesValue, this.number(yesterdayExpenses._sum.totalAmount)),
      },
      paymentAccounts: paymentAccountRows,
      receivables: {
        total: receivablesTotal,
        customers: receivablePartners.map((partner) => ({ id: partner.id, name: partner.name, amount: this.number(partner.receivableBalance) })),
        overdueInvoices: overdueInvoices.map((invoice) => ({
          id: invoice.id,
          reference: invoice.invoiceNo,
          customer: invoice.businessPartner?.name || 'Customer',
          amount: Math.max(this.number(invoice.grandTotal) - this.number(invoice.amountPaid), 0),
          daysOverdue: invoice.dueDate ? Math.max(Math.floor((todayStart.getTime() - invoice.dueDate.getTime()) / 86400000), 0) : 0,
        })),
      },
      payables: {
        total: payablesTotal,
        vendors: payablePartners.map((partner) => ({ id: partner.id, name: partner.name, amount: this.number(partner.payableBalance) })),
        upcoming: (upcomingPurchases as any[]).map((purchase) => ({ id: purchase.id, reference: purchase.purchaseNo, vendor: purchase.businessPartner?.name || 'Vendor', amount: Math.max(this.number(purchase.grandTotal) - this.number(purchase.amountPaid), 0), date: purchase.date })),
        overdue: (overduePurchases as any[]).map((purchase) => ({ id: purchase.id, reference: purchase.purchaseNo, vendor: purchase.businessPartner?.name || 'Vendor', amount: Math.max(this.number(purchase.grandTotal) - this.number(purchase.amountPaid), 0), date: purchase.date })),
      },
      recentActivity,
      businessInsights: {
        monthlyRevenue,
        monthlyExpenses,
        netProfit: monthlyProfit,
        cashFlow: todayReceiptsValue - todayPaymentsValue - todayExpensesValue,
        grossMargin: monthlyRevenue > 0 ? Math.round((monthlyProfit / monthlyRevenue) * 1000) / 10 : 0,
        topCustomers: topCustomers.map((row) => ({ id: row.businessPartnerId, name: partnerName.get(row.businessPartnerId) || 'Customer', amount: this.number(row._sum.grandTotal) })),
        topVendors: topVendors.map((row) => ({ id: row.businessPartnerId, name: partnerName.get(row.businessPartnerId) || 'Vendor', amount: this.number(row._sum.grandTotal) })),
        highestExpenseCategories: expenseCategories.map((row) => ({ id: row.categoryId || 'uncategorized', name: row.categoryId ? categoryName.get(row.categoryId) || 'Expense category' : 'Uncategorized', amount: this.number(row._sum.totalAmount) })),
      },
      accountingHealth: {
        booksBalanced: true,
        pendingReconciliation: 0,
        unpostedTransactions: pendingExpenses,
        draftInvoices,
        draftBills: draftPurchases,
        pendingGstReturns: gstLiability > 0 ? 1 : 0,
        negativeCashWarning: cashBalance < 0,
        journalEntries: journalCount,
      },
      inventory: {
        lowStock,
        lowStockCount: lowStock.length,
        outOfStockCount: lowStock.filter((product) => product.availableQuantity <= 0).length,
        deadStockCount: 0,
        fastMoving: [],
      },
    };
  }
}
