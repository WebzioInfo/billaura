import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FilePlus2,
  FileText,
  Landmark,
  Loader2,
  PackagePlus,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { apiClient } from '../../core/api/apiClient';

type MoneyMetricKey = keyof DashboardData['metrics'];

interface DashboardData {
  company: { name: string; financialYear: string; today: string };
  metrics: {
    todaySales: number;
    todayReceipts: number;
    todayPayments: number;
    todayExpenses: number;
    cashBalance: number;
    bankBalance: number;
    receivablesTotal: number;
    payablesTotal: number;
    monthlyRevenue: number;
    monthlyProfit: number;
    profitToday: number;
    netCashFlow: number;
    gstLiability: number;
    customerCount: number;
    vendorCount: number;
  };
  comparisons: Record<string, number>;
  paymentAccounts: Array<{ id: string; name: string; type: string; balance: number; lastTransaction: string | null }>;
  receivables: {
    total: number;
    customers: Array<{ id: string; name: string; amount: number }>;
    overdueInvoices: Array<{ id: string; reference: string; customer: string; amount: number; daysOverdue: number }>;
  };
  payables: {
    total: number;
    vendors: Array<{ id: string; name: string; amount: number }>;
    upcoming: Array<{ id: string; reference: string; vendor: string; amount: number; date: string }>;
    overdue: Array<{ id: string; reference: string; vendor: string; amount: number; date: string }>;
  };
  recentActivity: Array<{ id: string; type: string; reference: string; description: string; amount: number; date: string; status: string }>;
  businessInsights: {
    monthlyRevenue: number;
    monthlyExpenses: number;
    netProfit: number;
    cashFlow: number;
    grossMargin: number;
    topCustomers: Array<{ id: string; name: string; amount: number }>;
    topVendors: Array<{ id: string; name: string; amount: number }>;
    highestExpenseCategories: Array<{ id: string; name: string; amount: number }>;
  };
  accountingHealth: {
    booksBalanced: boolean;
    pendingReconciliation: number;
    unpostedTransactions: number;
    draftInvoices: number;
    draftBills: number;
    pendingGstReturns: number;
    negativeCashWarning: boolean;
    journalEntries: number;
  };
  inventory: {
    lowStock: Array<{ id: string; name: string; sku: string; reorderLevel: number; availableQuantity: number }>;
    lowStockCount: number;
    outOfStockCount: number;
    deadStockCount: number;
    fastMoving: Array<{ id: string; name: string; soldQuantity: number }>;
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

const formatTime = (value: string | Date) =>
  new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

const WidgetCard = ({ title, action, children, className = '' }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={`bg-surface border border-border rounded-lg shadow-sm overflow-hidden ${className}`}>
    <div className="flex items-center justify-between border-b border-border bg-background/50 px-4 py-2.5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const SkeletonBlock = ({ className = '' }: { className?: string }) => <div className={`animate-pulse rounded-md bg-border/50 ${className}`} />;

const EmptyState = ({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) => (
  <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/40 p-4 text-center">
    <Sparkles className="mb-2 h-5 w-5 text-muted-foreground" />
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    {action && <div className="mt-3">{action}</div>}
  </div>
);

const Sparkline = ({ tone = 'blue' }: { tone?: 'green' | 'red' | 'blue' | 'amber' }) => {
  const color = tone === 'green' ? 'bg-green-500' : tone === 'red' ? 'bg-red-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden="true">
      {[34, 48, 42, 62, 54, 72, 64].map((height, index) => (
        <span key={index} className={`${color} w-1 rounded-sm opacity-${index > 4 ? '100' : '50'}`} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
};

const KpiCard = memo(({ label, value, icon: Icon, comparison, tone = 'blue' }: { label: string; value: number; icon: any; comparison?: number; tone?: 'green' | 'red' | 'blue' | 'amber' }) => {
  const positive = Number(comparison || 0) >= 0;
  const iconTone = tone === 'green' ? 'bg-green-500/10 text-green-600' : tone === 'red' ? 'bg-red-500/10 text-red-600' : tone === 'amber' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600';
  return (
    <div className="bg-surface border border-border rounded-lg p-3 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
          <p className="mt-1 text-lg font-black text-foreground truncate">{formatCurrency(value)}</p>
        </div>
        <div className={`rounded-md p-1.5 ${iconTone}`}><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {comparison === undefined ? 'Live value' : `${positive ? '+' : ''}${comparison}% vs yesterday`}
        </div>
        <Sparkline tone={tone} />
      </div>
    </div>
  );
});

const QuickActions = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => {
  const actions = [
    { label: 'New Invoice', path: '/invoices/new', icon: FilePlus2 },
    { label: 'New Receipt', path: '/receipts/new', icon: Receipt },
    { label: 'Purchase Bill', path: '/bills/new', icon: ShoppingCart },
    { label: 'Add Customer', path: '/customers', icon: Users },
    { label: 'Add Vendor', path: '/vendors/new', icon: Building2 },
    { label: 'Record Expense', path: '/expenses', icon: Wallet },
    { label: 'Journal Entry', path: '/journal-entries/new', icon: BookOpen },
    { label: 'Chart of Accounts', path: '/chart-of-accounts', icon: Landmark },
    { label: 'Add Product', path: '/products', icon: PackagePlus },
    { label: 'Stock Adjustment', path: '/inventory', icon: Boxes },
  ];

  return (
    <WidgetCard title="Quick Action Center">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-10">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} onClick={() => navigate(action.path)} className="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background px-2 py-3 text-center text-xs font-semibold text-foreground transition hover:border-accent hover:bg-accent-muted cursor-pointer">
              <Icon className="h-5 w-5 text-muted-foreground group-hover:text-accent" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
};

const RankedList = ({ items, empty, cta }: { items: Array<{ id: string; name: string; amount: number }>; empty: string; cta?: React.ReactNode }) => (
  items.length === 0 ? <EmptyState title="Nothing due" description={empty} action={cta} /> : (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
          <span className="truncate text-sm font-semibold text-foreground">{item.name}</span>
          <span className="shrink-0 text-sm font-bold text-foreground">{formatCurrency(item.amount)}</span>
        </div>
      ))}
    </div>
  )
);

export const ExecutiveDashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => apiClient.get<DashboardData>('/dashboard/summary'),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 text-left">
        <SkeletonBlock className="h-24" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 12 }).map((_, i) => <SkeletonBlock key={i} className="h-28" />)}</div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12"><SkeletonBlock className="h-80 xl:col-span-8" /><SkeletonBlock className="h-80 xl:col-span-4" /></div>
      </div>
    );
  }

  if (isError || !data) {
    return <EmptyState title="Dashboard could not load" description="One or more dashboard services failed. Refresh to retry without leaving the workspace." action={<button onClick={() => refetch()} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Retry</button>} />;
  }

  const m = data.metrics;
  const c = data.comparisons || {};
  const kpis: Array<{ key: MoneyMetricKey; label: string; icon: any; tone: 'green' | 'red' | 'blue' | 'amber'; comparison?: number }> = [
    { key: 'todaySales', label: "Today's Sales", icon: ArrowUpRight, tone: 'green', comparison: c.todaySales },
    { key: 'todayReceipts', label: "Today's Receipts", icon: Receipt, tone: 'green', comparison: c.todayReceipts },
    { key: 'todayPayments', label: "Today's Payments", icon: CreditCard, tone: 'red', comparison: c.todayPayments },
    { key: 'todayExpenses', label: "Today's Expenses", icon: ArrowDownRight, tone: 'red', comparison: c.todayExpenses },
    { key: 'cashBalance', label: 'Cash Balance', icon: Wallet, tone: 'amber' },
    { key: 'bankBalance', label: 'Bank Balance', icon: Landmark, tone: 'blue' },
    { key: 'receivablesTotal', label: 'Receivables', icon: CircleDollarSign, tone: 'green' },
    { key: 'payablesTotal', label: 'Payables', icon: ClipboardList, tone: 'red' },
    { key: 'monthlyRevenue', label: 'Monthly Revenue', icon: TrendingUp, tone: 'green' },
    { key: 'monthlyProfit', label: 'Monthly Profit', icon: Banknote, tone: m.monthlyProfit >= 0 ? 'green' : 'red' },
    { key: 'netCashFlow', label: 'Net Cash Flow', icon: Activity, tone: m.netCashFlow >= 0 ? 'green' : 'red' },
    { key: 'gstLiability', label: 'GST Liability', icon: FileText, tone: 'amber' },
  ];

  return (
    <div className="space-y-4 text-left pb-6">
      <section className="bg-surface border border-border rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Welcome back</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">{data.company.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">FY {data.company.financialYear} - {formatDate(data.company.today)}</p>
          </div>
          <button onClick={() => navigate('/search')} className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground lg:col-span-5 cursor-pointer hover:border-accent">
            <Search className="h-4 w-4" />
            Search customers, invoices, vendors, products, ledgers
            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="flex items-center justify-end gap-2 lg:col-span-3">
            <button className="rounded-lg border border-border bg-background p-2 text-muted-foreground hover:text-foreground"><Bell className="h-4 w-4" /></button>
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:border-accent cursor-pointer">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>
      </section>

      <QuickActions navigate={navigate} />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {kpis.map((kpi) => <KpiCard key={kpi.key} label={kpi.label} value={Number(m[kpi.key] || 0)} icon={kpi.icon} tone={kpi.tone} comparison={kpi.comparison} />)}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <WidgetCard title="Bank & Cash Summary" className="xl:col-span-4">
          {data.paymentAccounts.length === 0 ? <EmptyState title="No payment ledgers" description="Create Cash or Bank ledgers in Chart of Accounts to monitor balances here." action={<button onClick={() => navigate('/chart-of-accounts')} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">Open Chart of Accounts</button>} /> : (
            <div className="space-y-2">
              {data.paymentAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{account.name}</p>
                    <p className="text-[11px] text-muted-foreground">{account.type} - Last transaction: {account.lastTransaction ? formatDate(account.lastTransaction) : 'No activity yet'}</p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-foreground">{formatCurrency(account.balance)}</p>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Receivables" className="xl:col-span-4" action={<button onClick={() => navigate('/receipts/new')} className="text-xs font-semibold text-accent">Quick Collect</button>}>
          <p className="mb-3 text-xl font-black text-foreground">{formatCurrency(data.receivables.total)}</p>
          <RankedList items={data.receivables.customers} empty="No outstanding customer balances. Receivables are clean." />
          <div className="mt-3 space-y-2">
            {data.receivables.overdueInvoices.map((invoice) => (
              <div key={invoice.id} className="flex justify-between gap-3 rounded-md bg-red-500/5 px-3 py-2 text-xs text-red-700">
                <span className="truncate">{invoice.reference} - {invoice.customer} - {invoice.daysOverdue} days overdue</span>
                <span className="font-bold">{formatCurrency(invoice.amount)}</span>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Payables" className="xl:col-span-4" action={<button onClick={() => navigate('/vendor-payments')} className="text-xs font-semibold text-accent">Quick Pay</button>}>
          <p className="mb-3 text-xl font-black text-foreground">{formatCurrency(data.payables.total)}</p>
          <RankedList items={data.payables.vendors} empty="No outstanding vendor balances. Payables are clear." />
          <div className="mt-3 space-y-2">
            {data.payables.overdue.map((bill) => (
              <div key={bill.id} className="flex justify-between gap-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                <span className="truncate">{bill.reference} - {bill.vendor}</span>
                <span className="font-bold">{formatCurrency(bill.amount)}</span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <WidgetCard title="Business Insights" className="xl:col-span-5">
          <div className="grid grid-cols-2 gap-3">
            {[['Monthly Revenue', data.businessInsights.monthlyRevenue], ['Monthly Expenses', data.businessInsights.monthlyExpenses], ['Net Profit', data.businessInsights.netProfit], ['Cash Flow', data.businessInsights.cashFlow]].map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-border bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 text-base font-black text-foreground">{formatCurrency(Number(value))}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">Gross margin: <span className="text-foreground">{data.businessInsights.grossMargin}%</span></p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <RankedList items={data.businessInsights.topCustomers} empty="No customer revenue yet." />
            <RankedList items={data.businessInsights.topVendors} empty="No vendor spend yet." />
            <RankedList items={data.businessInsights.highestExpenseCategories} empty="No expense categories yet." />
          </div>
        </WidgetCard>

        <WidgetCard title="Recent Activity" className="xl:col-span-4">
          {data.recentActivity.length === 0 ? <EmptyState title="No activity yet" description="Invoices, receipts, payments, expenses, bills, and journals will appear here as they are posted." /> : (
            <div className="space-y-3">
              {data.recentActivity.slice(0, 8).map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex gap-3">
                  <div className="mt-0.5 rounded-md bg-accent-muted p-1.5 text-accent"><Activity className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1 border-b border-border pb-2 last:border-0">
                    <div className="flex justify-between gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{item.type}</p>
                      <span className="text-[10px] text-muted-foreground">{formatTime(item.date)}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{item.reference} - {item.description}</p>
                    <p className="text-xs font-bold text-foreground">{formatCurrency(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Accounting Health" className="xl:col-span-3">
          {[
            ['Books Balanced', data.accountingHealth.booksBalanced ? 'Healthy' : 'Review', data.accountingHealth.booksBalanced],
            ['Pending Reconciliation', data.accountingHealth.pendingReconciliation, data.accountingHealth.pendingReconciliation === 0],
            ['Unposted Transactions', data.accountingHealth.unpostedTransactions, data.accountingHealth.unpostedTransactions === 0],
            ['Draft Invoices', data.accountingHealth.draftInvoices, data.accountingHealth.draftInvoices === 0],
            ['Draft Bills', data.accountingHealth.draftBills, data.accountingHealth.draftBills === 0],
            ['Pending GST Returns', data.accountingHealth.pendingGstReturns, data.accountingHealth.pendingGstReturns === 0],
            ['Negative Cash Warning', data.accountingHealth.negativeCashWarning ? 'Yes' : 'No', !data.accountingHealth.negativeCashWarning],
          ].map(([label, value, ok]) => (
            <div key={String(label)} className="flex items-center justify-between border-b border-border py-2 last:border-0">
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold ${ok ? 'text-green-600' : 'text-amber-600'}`}>{ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{String(value)}</span>
            </div>
          ))}
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <WidgetCard title="Inventory Alerts" className="xl:col-span-5">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-md bg-amber-500/10 p-3"><p className="text-[10px] font-bold uppercase text-amber-700">Low Stock</p><p className="text-xl font-black text-foreground">{data.inventory.lowStockCount}</p></div>
            <div className="rounded-md bg-red-500/10 p-3"><p className="text-[10px] font-bold uppercase text-red-700">Out of Stock</p><p className="text-xl font-black text-foreground">{data.inventory.outOfStockCount}</p></div>
            <div className="rounded-md bg-background p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Dead Stock</p><p className="text-xl font-black text-foreground">{data.inventory.deadStockCount}</p></div>
          </div>
          {data.inventory.lowStock.length === 0 ? <EmptyState title="Inventory is healthy" description="No products are currently below reorder level." /> : (
            <div className="space-y-2">
              {data.inventory.lowStock.map((product) => (
                <div key={product.id} className="flex justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <span className="font-semibold text-foreground">{product.name} <span className="text-xs text-muted-foreground">{product.sku}</span></span>
                  <span className="font-bold text-amber-700">{product.availableQuantity} / {product.reorderLevel}</span>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Shortcut Panel" className="xl:col-span-3">
          <div className="grid grid-cols-2 gap-2">
            {[['Reports', '/reports'], ['Day Book', '/day-book'], ['GST', '/gst'], ['Settings', '/settings?tab=company']].map(([label, path]) => (
              <button key={label} onClick={() => navigate(path)} className="rounded-md border border-border bg-background px-3 py-3 text-xs font-bold text-foreground hover:border-accent cursor-pointer">{label}</button>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Pending Approvals" className="xl:col-span-4">
          {data.accountingHealth.unpostedTransactions === 0 ? <EmptyState title="No pending approvals" description="Expenses and transactions waiting for approval will appear here." /> : (
            <button onClick={() => navigate('/expenses')} className="flex w-full items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-left text-amber-900">
              <span className="font-semibold">{data.accountingHealth.unpostedTransactions} expense approvals pending</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </WidgetCard>
      </div>
    </div>
  );
};
