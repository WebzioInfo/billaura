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
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
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
          { name: { contains: 'savings', mode: 'insensitive' } },
          { name: { contains: 'current account', mode: 'insensitive' } },
          { parent: { name: { contains: 'cash', mode: 'insensitive' } } },
          { parent: { name: { contains: 'bank', mode: 'insensitive' } } },
        ],
      },
      include: { parent: { select: { name: true } } },
      orderBy: { name: 'asc' },
      take: 8,
    });

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.name.toLowerCase().includes('cash') || account.parent?.name?.toLowerCase().includes('cash') ? 'Cash Ledger' : 'Bank Ledger',
      balance: this.number(account.balance),
      lastTransaction: null,
    }));
  }

  async getSummary() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const now = new Date();
    const todayStart = this.startOfDay(now);
    const monthStart = this.startOfMonth(now);
    const yesterday = this.previousDayRange(now);
    const currentFyStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1);
    const currentFyEnd = new Date(currentFyStart.getFullYear() + 1, 2, 31);

    const liveInvoiceWhere: Prisma.InvoiceWhereInput = { companyId, deletedAt: null };
    const livePurchaseWhere: Prisma.PurchaseWhereInput = { companyId, deletedAt: null };
    const liveExpenseWhere: Prisma.ExpenseWhereInput = { companyId, deletedAt: null };
    const liveReceiptWhere: Prisma.ReceiptWhereInput = { companyId, deletedAt: null };
    const completedPaymentWhere: Prisma.TransactionPaymentWhereInput = { companyId, paymentType: 'OUTBOUND' };

    const [
      company,
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
    ] = await Promise.all([
      this.prisma.company.findFirst({ where: { id: companyId }, select: { companyName: true } }),
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
      this.sumAccountBalance(companyId, ['bank', 'hdfc', 'sbi', 'icici', 'axis', 'kotak', 'savings', 'current account']),
      this.paymentAccounts(companyId),
      this.prisma.invoice.findMany({ where: liveInvoiceWhere, take: 4, orderBy: { createdAt: 'desc' }, include: { businessPartner: { select: { name: true } } } }),
      this.prisma.receipt.findMany({ where: liveReceiptWhere, take: 4, orderBy: { createdAt: 'desc' }, include: { businessPartner: { select: { name: true } } } }),
      this.prisma.transactionPayment.findMany({ where: completedPaymentWhere, take: 4, orderBy: { createdAt: 'desc' }, include: { businessPartner: { select: { name: true } } } }),
      this.prisma.expense.findMany({ where: liveExpenseWhere, take: 4, orderBy: { createdAt: 'desc' }, include: { category: { select: { name: true } } } }),
      this.prisma.purchase.findMany({ where: livePurchaseWhere, take: 4, orderBy: { createdAt: 'desc' }, include: { businessPartner: { select: { name: true } } } }),
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
      ...recentInvoices.map((invoice) => ({ id: invoice.id, type: 'Invoice Created', reference: invoice.invoiceNo, description: invoice.businessPartner?.name || 'Customer invoice', amount: this.number(invoice.grandTotal), date: invoice.createdAt, status: invoice.status })),
      ...recentReceipts.map((receipt) => ({ id: receipt.id, type: 'Receipt Recorded', reference: receipt.receiptNo, description: receipt.businessPartner?.name || 'Customer receipt', amount: this.number(receipt.amount), date: receipt.createdAt, status: receipt.status })),
      ...recentPayments.map((payment) => ({ id: payment.id, type: 'Payment Made', reference: payment.paymentNo, description: payment.businessPartner?.name || 'Vendor payout', amount: this.number(payment.amount), date: payment.createdAt, status: payment.method })),
      ...recentExpenses.map((expense) => ({ id: expense.id, type: 'Expense Added', reference: expense.expenseNo, description: expense.category?.name || expense.description || 'Business expense', amount: this.number(expense.totalAmount), date: expense.createdAt, status: expense.status })),
      ...recentPurchases.map((purchase) => ({ id: purchase.id, type: 'Bill Posted', reference: purchase.purchaseNo, description: purchase.businessPartner?.name || 'Vendor bill', amount: this.number(purchase.grandTotal), date: purchase.createdAt, status: purchase.status })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);

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

    return {
      company: {
        name: company?.companyName || 'Bill Aura Workspace',
        financialYear: `${currentFyStart.getFullYear()}-${currentFyEnd.getFullYear()}`,
        today: now.toISOString(),
      },
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
