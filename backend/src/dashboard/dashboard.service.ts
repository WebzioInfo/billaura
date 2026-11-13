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
    const completedPaymentWhere: Prisma.TransactionPaymentWhereInput = { companyId, paymentType: 'OUTBOUND', deletedAt: null };

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

    // Prepare 12-month fiscal year chart intervals (Apr to Mar)
    const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const chartMonths: Array<{ start: Date; end: Date; label: string; month: string }> = [];
    for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
      const calMonth = (3 + monthOffset) % 12;
      const calYear = monthOffset < 9 ? currentFyStart.getFullYear() : currentFyEnd.getFullYear();
      const start = new Date(calYear, calMonth, 1);
      const end = new Date(calYear, calMonth + 1, 0, 23, 59, 59, 999);
      chartMonths.push({
        start,
        end,
        label: monthNames[monthOffset],
        month: monthNames[monthOffset],
      });
    }

    // Run chart queries with genuine sales, receipts, expenses, and payments
    const chartPromises = chartMonths.map(async (m) => {
      const [inv, rec, exp, pmt] = await Promise.all([
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
        this.prisma.transactionPayment.aggregate({
          where: { ...completedPaymentWhere, date: { gte: m.start, lte: m.end } },
          _sum: { amount: true },
        }),
      ]);

      const sales = this.number(inv._sum.grandTotal);
      const received = this.number(rec._sum.amount);
      const totalExpense = this.number(exp._sum.totalAmount) + this.number(pmt._sum.amount);

      return {
        label: m.label,
        month: m.month,
        sales,
        received,
        expenses: totalExpense,
        income: sales,
        expense: totalExpense,
        incoming: received,
        outgoing: totalExpense,
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
      receivablesAgg,
      payablesAgg,
      allUnpaidInvoices,
      allUnpaidPurchases,
      rawWatchlist,
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
      this.prisma.businessPartner.aggregate({
        where: { companyId, deletedAt: null, bpType: { in: ['CUSTOMER', 'CUSTOMER_VENDOR'] }, receivableBalance: { gt: 0 } },
        _sum: { receivableBalance: true },
      }),
      this.prisma.businessPartner.aggregate({
        where: { companyId, deletedAt: null, bpType: { in: ['VENDOR', 'CUSTOMER_VENDOR'] }, payableBalance: { gt: 0 } },
        _sum: { payableBalance: true },
      }),
      this.prisma.invoice.findMany({
        where: { ...liveInvoiceWhere, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
        select: { id: true, invoiceNo: true, grandTotal: true, amountPaid: true, dueDate: true, date: true },
      }),
      this.prisma.purchase.findMany({
        where: { ...livePurchaseWhere, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
        select: { id: true, purchaseNo: true, grandTotal: true, amountPaid: true, date: true },
      }),
      this.prisma.account.findMany({
        where: { companyId, deletedAt: null, isGroup: false },
        select: { id: true, name: true, code: true, category: true, balance: true, balanceType: true },
        take: 6,
        orderBy: { balance: 'desc' },
      }),
    ]);

    const todaySalesValue = this.number(todaySales._sum.grandTotal);
    const todayReceiptsValue = this.number(todayReceipts._sum.amount);
    const todayPaymentsValue = this.number(todayPayments._sum.amount);
    const todayExpensesValue = this.number(todayExpenses._sum.totalAmount);
    const monthlyRevenue = this.number(monthSales._sum.grandTotal);
    const monthlyExpenses = this.number(monthExpenses._sum.totalAmount);
    const profitToday = todaySalesValue - todayExpensesValue;
    const monthlyProfit = monthlyRevenue - monthlyExpenses;

    // Accurate aggregate-based receivables & aging buckets
    const partnerReceivableTotal = this.number(receivablesAgg._sum.receivableBalance);
    let recOverdue = 0;
    let recCurrent = 0;
    let recBucket1_15 = 0;
    let recBucket16_30 = 0;
    let recBucket31_45 = 0;
    let recBucketOver45 = 0;

    for (const inv of allUnpaidInvoices) {
      const unpaid = Math.max(this.number(inv.grandTotal) - this.number(inv.amountPaid), 0);
      if (unpaid <= 0) continue;
      const due = inv.dueDate || inv.date;
      if (due && due < todayStart) {
        recOverdue += unpaid;
        const days = Math.floor((todayStart.getTime() - due.getTime()) / 86400000);
        if (days <= 15) recBucket1_15 += unpaid;
        else if (days <= 30) recBucket16_30 += unpaid;
        else if (days <= 45) recBucket31_45 += unpaid;
        else recBucketOver45 += unpaid;
      } else {
        recCurrent += unpaid;
      }
    }

    const computedRecTotal = recOverdue + recCurrent;
    const receivablesTotal = Math.max(partnerReceivableTotal, computedRecTotal);
    if (receivablesTotal > computedRecTotal) {
      recCurrent += (receivablesTotal - computedRecTotal);
    }
    const recCurrentPct = receivablesTotal > 0 ? Math.round((recCurrent / receivablesTotal) * 100) : 0;
    const recOverduePct = receivablesTotal > 0 ? 100 - recCurrentPct : 0;

    // Accurate aggregate-based payables & aging buckets
    const partnerPayableTotal = this.number(payablesAgg._sum.payableBalance);
    let payOverdue = 0;
    let payCurrent = 0;
    let payBucket1_15 = 0;
    let payBucket16_30 = 0;
    let payBucket31_45 = 0;
    let payBucketOver45 = 0;

    for (const pur of allUnpaidPurchases) {
      const unpaid = Math.max(this.number(pur.grandTotal) - this.number(pur.amountPaid), 0);
      if (unpaid <= 0) continue;
      const billDate = pur.date;
      const daysSinceBill = Math.floor((todayStart.getTime() - billDate.getTime()) / 86400000);
      if (daysSinceBill > 30) {
        payOverdue += unpaid;
        const overdueDays = daysSinceBill - 30;
        if (overdueDays <= 15) payBucket1_15 += unpaid;
        else if (overdueDays <= 30) payBucket16_30 += unpaid;
        else if (overdueDays <= 45) payBucket31_45 += unpaid;
        else payBucketOver45 += unpaid;
      } else {
        payCurrent += unpaid;
      }
    }

    const computedPayTotal = payOverdue + payCurrent;
    const payablesTotal = Math.max(partnerPayableTotal, computedPayTotal);
    if (payablesTotal > computedPayTotal) {
      payCurrent += (payablesTotal - computedPayTotal);
    }
    const payCurrentPct = payablesTotal > 0 ? Math.round((payCurrent / payablesTotal) * 100) : 0;
    const payOverduePct = payablesTotal > 0 ? 100 - payCurrentPct : 0;
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

    const totalIncoming = chartData.reduce((sum, item) => sum + item.incoming, 0);
    const totalOutgoing = chartData.reduce((sum, item) => sum + item.outgoing, 0);
    const closingBalance = cashBalance + bankBalance;
    const openingBalance = Math.max(closingBalance - totalIncoming + totalOutgoing, 0);
    const cashFlowSummary = {
      opening: openingBalance,
      incoming: totalIncoming,
      outgoing: totalOutgoing,
      closing: closingBalance,
    };

    let runningCash = openingBalance;
    const finalChartData = chartData.map((m) => {
      runningCash = Math.max(0, runningCash + m.incoming - m.outgoing);
      return {
        ...m,
        balance: runningCash,
      };
    });

    const watchlist = rawWatchlist.map((acc) => ({
      name: acc.name,
      code: acc.code || '',
      category: acc.category,
      balance: this.number(acc.balance),
      normalBalance: acc.balanceType === 'CREDIT' ? 'Cr' : 'Dr',
    }));

    const expenseColors = ['#408DFB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];
    const totalExpensesSum = expenseCategories.reduce((sum, row) => sum + this.number(row._sum.totalAmount), 0);
    const topExpensesList = expenseCategories.map((row, idx) => {
      const amount = this.number(row._sum.totalAmount);
      const name = row.categoryId ? categoryName.get(row.categoryId) || 'Expense Category' : 'Uncategorized';
      const pct = totalExpensesSum > 0 ? Math.round((amount / totalExpensesSum) * 100) : 0;
      return {
        id: row.categoryId || `exp-${idx}`,
        name,
        amount,
        pct,
        color: expenseColors[idx % expenseColors.length],
      };
    });

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
      chartData: finalChartData,
      cashFlowSummary,
      watchlist,
      topExpenses: topExpensesList,
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
        current: recCurrent,
        overdue: recOverdue,
        currentPct: recCurrentPct,
        overduePct: recOverduePct,
        buckets: [
          { label: '1 - 15 days', amount: recBucket1_15 },
          { label: '16 - 30 days', amount: recBucket16_30 },
          { label: '31 - 45 days', amount: recBucket31_45 },
          { label: '> 45 days', amount: recBucketOver45 },
        ],
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
        current: payCurrent,
        overdue: payOverdue,
        currentPct: payCurrentPct,
        overduePct: payOverduePct,
        buckets: [
          { label: '1 - 15 days', amount: payBucket1_15 },
          { label: '16 - 30 days', amount: payBucket16_30 },
          { label: '31 - 45 days', amount: payBucket31_45 },
          { label: '> 45 days', amount: payBucketOver45 },
        ],
        vendors: payablePartners.map((partner) => ({ id: partner.id, name: partner.name, amount: this.number(partner.payableBalance) })),
        upcoming: (upcomingPurchases as any[]).map((purchase) => ({ id: purchase.id, reference: purchase.purchaseNo, vendor: purchase.businessPartner?.name || 'Vendor', amount: Math.max(this.number(purchase.grandTotal) - this.number(purchase.amountPaid), 0), date: purchase.date })),
        overduePurchases: (overduePurchases as any[]).map((purchase) => ({ id: purchase.id, reference: purchase.purchaseNo, vendor: purchase.businessPartner?.name || 'Vendor', amount: Math.max(this.number(purchase.grandTotal) - this.number(purchase.amountPaid), 0), date: purchase.date })),
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
