import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CreditCard,
  Plus,
  Users,
  FileText,
  Wallet,
  Landmark,
  Calendar,
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../core/api/apiClient';
import { useSessionStore } from '../../features/auth/stores/sessionStore';
import { useWorkspaceStore } from '../../shared/stores/workspaceStore';

export interface DashboardData {
  company: {
    name: string;
    financialYear: string;
    today: string;
  };
  summary: {
    period: string;
    sales: number;
    received: number;
    expenses: number;
    pending: number;
    cashBalance: number;
    bankBalance: number;
    totalBalance: number;
  };
  chartData: Array<{
    label: string;
    sales: number;
    received: number;
    expenses: number;
  }>;
  paymentAccounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    lastTransaction: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    description: string;
    reference: string;
    amount: number;
    direction: 'IN' | 'OUT';
    type: string;
    date: string;
    account: string;
    status: string;
  }>;
  receivables: {
    total: number;
    customers: Array<{ id: string; name: string; amount: number }>;
    overdueInvoices: Array<{
      id: string;
      reference: string;
      customer: string;
      amount: number;
      daysOverdue: number;
    }>;
  };
  payables: {
    total: number;
    vendors: Array<{ id: string; name: string; amount: number }>;
    upcoming: Array<{ id: string; reference: string; vendor: string; amount: number; date: string }>;
    overdue: Array<{ id: string; reference: string; vendor: string; amount: number; date: string }>;
  };
  metrics?: {
    todaySales: number;
    todayReceipts: number;
    todayPayments: number;
    todayExpenses: number;
    cashBalance: number;
    bankBalance: number;
    receivablesTotal: number;
    payablesTotal: number;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const formatDate = (value: string | Date) => {
  if (!value) return '';
  const d = new Date(value);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return 'Today, ' + new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(d);
  }
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(d);
};

export const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const { openTab } = useWorkspaceStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'this_week' | 'this_month' | 'this_year' | 'all'>('this_month');

  const { data, isLoading, isError, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ['dashboard-summary', selectedPeriod],
    queryFn: async () => {
      const res = await apiClient.get<DashboardData>('/dashboard/summary', {
        params: { period: selectedPeriod },
      });
      return res;
    },
    staleTime: 30_000,
  });

  const userName = useMemo(() => {
    if (!user?.name) return 'there';
    return user.name.split(' ')[0];
  }, [user?.name]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleActionClick = (path: string, title: string, id: string) => {
    openTab({ id, title, path });
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 text-left max-w-7xl mx-auto">
        <div className="h-20 bg-muted/30 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface border border-border/60 rounded-2xl p-5 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 h-64 bg-surface border border-border/60 rounded-2xl animate-pulse" />
          <div className="lg:col-span-6 h-64 bg-surface border border-border/60 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-md mx-auto my-16 text-center bg-surface border border-border rounded-2xl p-8 shadow-sm">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground">Dashboard Unavailable</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Something went wrong while retrieving financial data. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const s = data.summary || {
    sales: data.metrics?.todaySales || 0,
    received: data.metrics?.todayReceipts || 0,
    expenses: data.metrics?.todayExpenses || 0,
    pending: data.metrics?.receivablesTotal || 0,
    cashBalance: data.metrics?.cashBalance || 0,
    bankBalance: data.metrics?.bankBalance || 0,
    totalBalance: (data.metrics?.cashBalance || 0) + (data.metrics?.bankBalance || 0),
  };

  const periodLabels: Record<string, string> = {
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    this_year: 'This Financial Year',
    all: 'All Time',
  };

  // Prepare chart metrics from real historical data
  const chartPoints = data.chartData || [];
  const maxChartValue = Math.max(
    ...chartPoints.flatMap((p) => [p.sales, p.expenses, p.received]),
    1
  );

  const overdueInvoices = data.receivables?.overdueInvoices || [];
  const totalOverdue = overdueInvoices.reduce((acc, inv) => acc + inv.amount, 0);

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-12">
      {/* 1. TOP GREETING & COMPACT DATE FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {userName}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {data.company?.name || 'Bill Aura'} • FY {data.company?.financialYear || '2025-2026'}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/60">
          {(['today', 'this_week', 'this_month', 'this_year', 'all'] as const).map((periodKey) => {
            const isActive = selectedPeriod === periodKey;
            return (
              <button
                key={periodKey}
                onClick={() => setSelectedPeriod(periodKey)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-background text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {periodLabels[periodKey]}
              </button>
            );
          })}
          <button
            onClick={() => refetch()}
            title="Refresh Data"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg ml-1 cursor-pointer transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* OVERDUE NOTICE (Shown only if actual overdue invoices exist) */}
      {overdueInvoices.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-xl text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You have <strong className="font-bold">{overdueInvoices.length} overdue invoices</strong> totaling{' '}
              <strong className="font-bold">{formatCurrency(totalOverdue)}</strong> needing attention.
            </span>
          </div>
          <button
            onClick={() => handleActionClick('/invoices', 'Invoices', 'invoices')}
            className="font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer shrink-0"
          >
            Review Invoices →
          </button>
        </div>
      )}

      {/* 2. LEVEL 1: THE 4 ESSENTIAL MONEY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL SALES */}
        <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs transition hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-3 tracking-tight">
            {formatCurrency(s.sales)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Invoiced in {periodLabels[selectedPeriod].toLowerCase()}
          </p>
        </div>

        {/* MONEY RECEIVED */}
        <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs transition hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Money Received</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-3 tracking-tight">
            {formatCurrency(s.received)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Total collections & receipts
          </p>
        </div>

        {/* MONEY OUT / EXPENSES */}
        <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs transition hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Money Out</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-3 tracking-tight">
            {formatCurrency(s.expenses)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Expenses & vendor payouts
          </p>
        </div>

        {/* PENDING PAYMENTS (RECEIVABLES) */}
        <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs transition hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending to Collect</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-3 tracking-tight">
            {formatCurrency(s.pending)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Outstanding customer receivables
          </p>
        </div>
      </div>

      {/* 3. FINANCIAL POSITION ("YOUR MONEY") + QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* YOUR MONEY (Cash & Bank Position) */}
        <div className="lg:col-span-7 bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Your Money</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Real cash & bank account balances</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Available</span>
                <span className="text-lg font-black text-foreground">{formatCurrency(s.totalBalance)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {data.paymentAccounts && data.paymentAccounts.length > 0 ? (
                data.paymentAccounts.map((acc) => {
                  const isCash = acc.name.toLowerCase().includes('cash');
                  return (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60 hover:border-border transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isCash ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
                          }`}
                        >
                          {isCash ? <Wallet className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{acc.name}</p>
                          <p className="text-[11px] text-muted-foreground">{acc.type}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-foreground">{formatCurrency(acc.balance)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border text-center">
                  <p className="text-xs text-muted-foreground">No bank or cash accounts setup yet.</p>
                  <button
                    onClick={() => handleActionClick('/chart-of-accounts', 'Chart of Accounts', 'coa')}
                    className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Configure in Chart of Accounts →
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Balances reflect actual cleared ledger records</span>
            <button
              onClick={() => handleActionClick('/banking', 'Banking', 'banking')}
              className="font-semibold text-primary hover:underline cursor-pointer"
            >
              Banking Center →
            </button>
          </div>
        </div>

        {/* QUICK ACTIONS (4 Clear, Essential Actions) */}
        <div className="lg:col-span-5 bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Quick Actions</h2>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Start your everyday business operations</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleActionClick('/invoices/new', 'New Invoice', 'new-invoice')}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/40 transition cursor-pointer text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">+ New Invoice</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Bill a client</p>
                </div>
              </button>

              <button
                onClick={() => handleActionClick('/customers/new', 'New Customer', 'new-customer')}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/40 transition cursor-pointer text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">+ New Customer</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Add client profile</p>
                </div>
              </button>

              <button
                onClick={() => handleActionClick('/receipts/new', 'Record Payment', 'new-receipt')}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/40 transition cursor-pointer text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">+ Record Payment</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Collect money in</p>
                </div>
              </button>

              <button
                onClick={() => handleActionClick('/expenses', 'Expenses', 'expenses')}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/40 transition cursor-pointer text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">+ Add Expense</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Record money spent</p>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">Ctrl+K</kbd> for all operations</span>
            <button
              onClick={() => handleActionClick('/bills/new', 'New Bill', 'new-bill')}
              className="font-semibold text-primary hover:underline cursor-pointer"
            >
              Create Vendor Bill →
            </button>
          </div>
        </div>
      </div>

      {/* 4. BUSINESS TREND (CHART) & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SALES VS EXPENSES (6-Month Trend) */}
        <div className="lg:col-span-7 bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Sales & Collections Trend</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Monthly revenue vs expenses (Last 6 Months)</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Sales
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> Expenses
                </span>
              </div>
            </div>

            {chartPoints.length > 0 && chartPoints.some((p) => p.sales > 0 || p.expenses > 0) ? (
              <div className="mt-6 space-y-4">
                <div className="h-48 flex items-end justify-between gap-3 pt-4 px-2">
                  {chartPoints.map((pt, idx) => {
                    const salesHeight = Math.max(Math.round((pt.sales / maxChartValue) * 100), 4);
                    const expensesHeight = Math.max(Math.round((pt.expenses / maxChartValue) * 100), 4);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-20 bg-foreground text-background text-[10px] font-bold rounded-md px-2 py-1 shadow-md whitespace-nowrap transition">
                          Sales: {formatCurrency(pt.sales)}
                          <br />
                          Exp: {formatCurrency(pt.expenses)}
                        </div>

                        <div className="w-full flex items-end justify-center gap-1.5 h-full">
                          {/* Sales Bar */}
                          <div
                            style={{ height: `${salesHeight}%` }}
                            className="w-1/2 max-w-[24px] bg-emerald-500 rounded-t-sm transition-all duration-500 hover:brightness-110"
                          />
                          {/* Expense Bar */}
                          <div
                            style={{ height: `${expensesHeight}%` }}
                            className="w-1/2 max-w-[24px] bg-rose-400/80 rounded-t-sm transition-all duration-500 hover:brightness-110"
                          />
                        </div>
                        <span className="text-[11px] font-bold text-muted-foreground">{pt.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="my-10 p-8 rounded-xl bg-muted/20 border border-dashed border-border text-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-foreground">No transaction history yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  As you create invoices, record customer payments, and track expenses, your business trend will visualize here.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Real accounting values from posted transactions</span>
            <button
              onClick={() => handleActionClick('/profit-loss', 'Profit & Loss', 'profit-loss')}
              className="font-semibold text-primary hover:underline cursor-pointer"
            >
              Full P&L Report →
            </button>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="lg:col-span-5 bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Recent Activity</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Latest financial movements</p>
              </div>
              <button
                onClick={() => handleActionClick('/day-book', 'Day Book', 'day-book')}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                View All →
              </button>
            </div>

            <div className="mt-3 divide-y divide-border/40">
              {data.recentActivity && data.recentActivity.length > 0 ? (
                data.recentActivity.slice(0, 6).map((item) => {
                  const isMoneyIn = item.direction === 'IN';
                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.description} • {item.account}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-black ${
                            isMoneyIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isMoneyIn ? '+' : '−'} {formatCurrency(item.amount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">{formatDate(item.date)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-foreground">No recent activity</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Transactions will appear here as they occur.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 text-center">
            <button
              onClick={() => handleActionClick('/day-book', 'Day Book', 'day-book')}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition"
            >
              Open Complete Day Book
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
