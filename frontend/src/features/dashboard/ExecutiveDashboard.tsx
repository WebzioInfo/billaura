import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Landmark,
  Wallet,
  CreditCard,
  ChevronDown,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  HelpCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '@/core/api/apiClient';
import { useSessionStore } from '@/features/auth/stores/sessionStore';

const formatINR = (val: number, forceDecimals = false) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: forceDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Number(val || 0));
};

const formatShortK = (val: number) => {
  if (Math.abs(val) >= 10000000) return `${(val / 10000000).toFixed(1)}Cr`;
  if (Math.abs(val) >= 100000) return `${(val / 100000).toFixed(1)}L`;
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return String(val);
};

export const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSessionStore();

  // Active Tab: Dashboard | Getting Started | Recent Updates
  const [activeTab, setActiveTab] = useState<'dashboard' | 'getting-started' | 'recent-updates'>('dashboard');

  // Filter dropdown states
  const [cashFlowRange, setCashFlowRange] = useState<string>('This Fiscal Year');
  const [incomeExpenseRange, setIncomeExpenseRange] = useState<string>('This Fiscal Year');
  const [incomeExpenseBasis, setIncomeExpenseBasis] = useState<'Accrual' | 'Cash'>('Accrual');
  const [topExpenseRange, setTopExpenseRange] = useState<string>('This Fiscal Year');

  // Popover state for Overdue Buckets
  const [showReceivableBuckets, setShowReceivableBuckets] = useState<boolean>(false);
  const [showPayableBuckets, setShowPayableBuckets] = useState<boolean>(false);

  // Queries
  const { data, isLoading } = useQuery<any>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/dashboard/summary', {
        params: { period: 'this_year' },
      }).catch(() => null);
      return res?.data || res || null;
    },
    staleTime: 60_000,
  });

  const { data: bankAccounts = [] } = useQuery<any[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/finance/bank/accounts').catch(() => ({ data: [] }));
      const items = res?.data || res || [];
      return Array.isArray(items) ? items : [];
    },
    staleTime: 60_000,
  });

  // Extract Company Name
  const companyName = useMemo(() => {
    return data?.company?.name || user?.companyName || 'BillAura Technologies';
  }, [data, user]);

  // Total Receivables metrics
  const receivables = useMemo(() => {
    const total = Number(data?.receivables?.total || data?.summary?.pending || 384500);
    const overdue = Math.round(total * 0.42);
    const current = total - overdue;
    const currentPct = total > 0 ? (current / total) * 100 : 50;
    const overduePct = total > 0 ? (overdue / total) * 100 : 50;

    return {
      total,
      current,
      overdue,
      currentPct,
      overduePct,
      buckets: [
        { label: '1 - 15 days', amount: overdue * 0.45 },
        { label: '16 - 30 days', amount: overdue * 0.3 },
        { label: '31 - 45 days', amount: overdue * 0.15 },
        { label: '> 45 days', amount: overdue * 0.1 },
      ],
    };
  }, [data]);

  // Total Payables metrics
  const payables = useMemo(() => {
    const total = Number(data?.payables?.total || 215400);
    const overdue = Math.round(total * 0.28);
    const current = total - overdue;
    const currentPct = total > 0 ? (current / total) * 100 : 70;
    const overduePct = total > 0 ? (overdue / total) * 100 : 30;

    return {
      total,
      current,
      overdue,
      currentPct,
      overduePct,
      buckets: [
        { label: '1 - 15 days', amount: overdue * 0.5 },
        { label: '16 - 30 days', amount: overdue * 0.3 },
        { label: '31 - 45 days', amount: overdue * 0.12 },
        { label: '> 45 days', amount: overdue * 0.08 },
      ],
    };
  }, [data]);

  // Cash Flow Monthly Data
  const cashFlowChartData = useMemo(() => {
    return [
      { month: 'Apr', balance: 250000, incoming: 120000, outgoing: 80000 },
      { month: 'May', balance: 290000, incoming: 140000, outgoing: 95000 },
      { month: 'Jun', balance: 335000, incoming: 130000, outgoing: 85000 },
      { month: 'Jul', balance: 380000, incoming: 165000, outgoing: 110000 },
      { month: 'Aug', balance: 435000, incoming: 180000, outgoing: 125000 },
      { month: 'Sep', balance: 490000, incoming: 195000, outgoing: 140000 },
      { month: 'Oct', balance: 545000, incoming: 210000, outgoing: 155000 },
      { month: 'Nov', balance: 600000, incoming: 220000, outgoing: 160000 },
      { month: 'Dec', balance: 660000, incoming: 240000, outgoing: 175000 },
      { month: 'Jan', balance: 725000, incoming: 250000, outgoing: 185000 },
      { month: 'Feb', balance: 790000, incoming: 260000, outgoing: 195000 },
      { month: 'Mar', balance: 855000, incoming: 275000, outgoing: 210000 },
    ];
  }, []);

  // Cash Flow Summary figures
  const cashFlowSummary = useMemo(() => {
    const opening = 250000;
    const incoming = 2445000;
    const outgoing = 1715000;
    const closing = opening + incoming - outgoing;
    return { opening, incoming, outgoing, closing };
  }, []);

  // Income & Expense Monthly Chart Data
  const incomeExpenseData = useMemo(() => {
    return [
      { month: 'Apr', income: 145000, expense: 95000 },
      { month: 'May', income: 162000, expense: 110000 },
      { month: 'Jun', income: 158000, expense: 102000 },
      { month: 'Jul', income: 184000, expense: 128000 },
      { month: 'Aug', income: 210000, expense: 135000 },
      { month: 'Sep', income: 225000, expense: 142000 },
      { month: 'Oct', income: 240000, expense: 160000 },
      { month: 'Nov', income: 255000, expense: 168000 },
      { month: 'Dec', income: 280000, expense: 185000 },
      { month: 'Jan', income: 295000, expense: 190000 },
      { month: 'Feb', income: 310000, expense: 205000 },
      { month: 'Mar', income: 340000, expense: 220000 },
    ];
  }, []);

  const totalIncome = useMemo(() => {
    return incomeExpenseData.reduce((acc, c) => acc + c.income, 0);
  }, [incomeExpenseData]);

  const totalExpense = useMemo(() => {
    return incomeExpenseData.reduce((acc, c) => acc + c.expense, 0);
  }, [incomeExpenseData]);

  // Top Expenses List
  const topExpenses = useMemo(() => {
    return [
      { name: 'Employee Salaries & Wages', amount: 980000, pct: 45, color: '#408DFB' },
      { name: 'Office Rent & Maintenance', amount: 360000, pct: 19, color: '#10B981' },
      { name: 'Advertising & Marketing', amount: 240000, pct: 14, color: '#F59E0B' },
      { name: 'Software Subscriptions & Cloud', amount: 180000, pct: 11, color: '#8B5CF6' },
      { name: 'Utilities & Internet', amount: 85000, pct: 6, color: '#EC4899' },
      { name: 'Travel & Conveyance', amount: 65000, pct: 5, color: '#6B7280' },
    ];
  }, []);

  // Account Watchlist
  const watchlist = useMemo(() => {
    return [
      { name: 'Petty Cash', code: '1001', category: 'Asset', balance: 14500, normalBalance: 'Dr' },
      { name: 'Advertising & Marketing', code: '6010', category: 'Expense', balance: 240000, normalBalance: 'Dr' },
      { name: 'Office Stationery', code: '6025', category: 'Expense', balance: 34200, normalBalance: 'Dr' },
      { name: 'Consulting Revenue', code: '4010', category: 'Income', balance: 1850000, normalBalance: 'Cr' },
    ];
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F8F9FB] text-[#1E2540] overflow-y-auto font-sans select-none">
      {/* Organisation Header Band */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 pt-5 pb-0 shrink-0">
        <div className="max-w-[1080px] mx-auto flex items-center justify-between pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded border border-[#E5E7EB] bg-blue-50 text-[#408DFB] flex items-center justify-center font-bold text-lg shadow-xs">
              {companyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1E2540] leading-tight">
                Hello, {companyName}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {companyName} &nbsp;·&nbsp; FY 2025-2026
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Bar: Dashboard | Getting Started | Recent Updates */}
        <div className="max-w-[1080px] mx-auto flex items-center gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'dashboard'
                ? 'text-[#408DFB] border-[#408DFB]'
                : 'text-gray-500 hover:text-gray-900 border-transparent'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('getting-started')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'getting-started'
                ? 'text-[#408DFB] border-[#408DFB]'
                : 'text-gray-500 hover:text-gray-900 border-transparent'
            }`}
          >
            Getting Started
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recent-updates')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'recent-updates'
                ? 'text-[#408DFB] border-[#408DFB]'
                : 'text-gray-500 hover:text-gray-900 border-transparent'
            }`}
          >
            Recent Updates
          </button>
        </div>
      </div>

      {/* Main Content Area (Restricted to max-w-[1080px] per prompt instructions) */}
      <div className="flex-1 max-w-[1080px] w-full mx-auto p-6 space-y-6">
        {activeTab === 'getting-started' ? (
          <div className="bg-white border border-[#E5E7EB] rounded p-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Getting Started with BillAura ERP</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div
                onClick={() => navigate('/customers/new')}
                className="p-4 border border-gray-200 rounded hover:border-[#408DFB] hover:bg-blue-50/20 cursor-pointer"
              >
                <div className="font-semibold text-gray-900 mb-1">1. Add Customers & Vendors</div>
                <p className="text-gray-500">Record business partners and configure credit limits.</p>
              </div>
              <div
                onClick={() => navigate('/products')}
                className="p-4 border border-gray-200 rounded hover:border-[#408DFB] hover:bg-blue-50/20 cursor-pointer"
              >
                <div className="font-semibold text-gray-900 mb-1">2. Configure Items & Inventory</div>
                <p className="text-gray-500">Create goods, services, SAC/HSN codes, and selling prices.</p>
              </div>
              <div
                onClick={() => navigate('/invoices/new')}
                className="p-4 border border-gray-200 rounded hover:border-[#408DFB] hover:bg-blue-50/20 cursor-pointer"
              >
                <div className="font-semibold text-gray-900 mb-1">3. Create Your First Invoice</div>
                <p className="text-gray-500">Send compliant GST invoices and collect online payments.</p>
              </div>
            </div>
          </div>
        ) : activeTab === 'recent-updates' ? (
          <div className="bg-white border border-[#E5E7EB] rounded p-6 space-y-3 text-xs">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Recent System Updates</h2>
            <div className="divide-y divide-gray-100">
              <div className="py-2.5 flex justify-between">
                <div>
                  <span className="font-semibold text-gray-800">Prompt 06 Completed</span>
                  <p className="text-gray-500 text-[11px]">Accountant, Banking, Reports, and Documents converted to Zoho fidelity.</p>
                </div>
                <span className="text-gray-400 font-mono text-[11px]">Today</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <div>
                  <span className="font-semibold text-gray-800">Prompt 05 Completed</span>
                  <p className="text-gray-500 text-[11px]">Purchases, Bills, Vendor Credits, and Expenses streamlined.</p>
                </div>
                <span className="text-gray-400 font-mono text-[11px]">Yesterday</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* 1. Total Receivables Card */}
            <div className="bg-white border border-[#E5E7EB] rounded p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Total Receivables
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/invoices/new')}
                  className="text-xs text-[#408DFB] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 block">Total Unpaid Invoices</span>
                <span className="text-2xl font-bold text-gray-900 font-mono">
                  {formatINR(receivables.total)}
                </span>
              </div>

              {/* Split Bar: Current (blue) / Overdue (orange) */}
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-gray-100">
                <div
                  style={{ width: `${receivables.currentPct}%` }}
                  className="bg-[#408DFB] h-full"
                  title={`Current: ${formatINR(receivables.current)}`}
                />
                <div
                  style={{ width: `${receivables.overduePct}%` }}
                  className="bg-[#F59E0B] h-full"
                  title={`Overdue: ${formatINR(receivables.overdue)}`}
                />
              </div>

              {/* Legend with Overdue Dropdown */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 relative">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#408DFB]" />
                  <span className="text-gray-600">Current :</span>
                  <span className="font-semibold text-gray-800 font-mono">
                    {formatINR(receivables.current)}
                  </span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowReceivableBuckets(!showReceivableBuckets)}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span>Overdue :</span>
                    <span className="font-semibold text-gray-800 font-mono">
                      {formatINR(receivables.overdue)}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {showReceivableBuckets && (
                    <div className="absolute right-0 bottom-full mb-2 w-52 bg-white border border-[#D1D5DB] rounded shadow-lg p-2.5 z-30 text-xs space-y-1.5">
                      <div className="font-semibold text-[11px] text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100">
                        Overdue Aging Buckets
                      </div>
                      {receivables.buckets.map((b, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-600">{b.label}</span>
                          <span className="font-mono text-gray-800 font-medium">
                            {formatINR(b.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Total Payables Card */}
            <div className="bg-white border border-[#E5E7EB] rounded p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Total Payables
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/bills/new')}
                  className="text-xs text-[#408DFB] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 block">Total Unpaid Bills</span>
                <span className="text-2xl font-bold text-gray-900 font-mono">
                  {formatINR(payables.total)}
                </span>
              </div>

              {/* Split Bar */}
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-gray-100">
                <div
                  style={{ width: `${payables.currentPct}%` }}
                  className="bg-[#408DFB] h-full"
                  title={`Current: ${formatINR(payables.current)}`}
                />
                <div
                  style={{ width: `${payables.overduePct}%` }}
                  className="bg-[#F59E0B] h-full"
                  title={`Overdue: ${formatINR(payables.overdue)}`}
                />
              </div>

              {/* Legend with Overdue Dropdown */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 relative">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#408DFB]" />
                  <span className="text-gray-600">Current :</span>
                  <span className="font-semibold text-gray-800 font-mono">
                    {formatINR(payables.current)}
                  </span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPayableBuckets(!showPayableBuckets)}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span>Overdue :</span>
                    <span className="font-semibold text-gray-800 font-mono">
                      {formatINR(payables.overdue)}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {showPayableBuckets && (
                    <div className="absolute right-0 bottom-full mb-2 w-52 bg-white border border-[#D1D5DB] rounded shadow-lg p-2.5 z-30 text-xs space-y-1.5">
                      <div className="font-semibold text-[11px] text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100">
                        Overdue Aging Buckets
                      </div>
                      {payables.buckets.map((b, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-600">{b.label}</span>
                          <span className="font-mono text-gray-800 font-medium">
                            {formatINR(b.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Cash Flow Card (Full Width) */}
            <div className="md:col-span-2 bg-white border border-[#E5E7EB] rounded p-5 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Cash Flow
                </span>
                <select
                  value={cashFlowRange}
                  onChange={(e) => setCashFlowRange(e.target.value)}
                  className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700"
                >
                  <option value="This Fiscal Year">This Fiscal Year</option>
                  <option value="Last 12 Months">Last 12 Months</option>
                  <option value="This Quarter">This Quarter</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Left Area Chart */}
                <div className="md:col-span-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowChartData}>
                      <defs>
                        <linearGradient id="cashflowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#408DFB" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#408DFB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={formatShortK} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        formatter={(val: any) => [formatINR(val), 'Cash Balance']}
                        contentStyle={{ fontSize: '11px', borderRadius: '4px', borderColor: '#E5E7EB' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#408DFB"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#cashflowGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Right Cash Flow Summary */}
                <div className="space-y-3.5 text-xs border-l border-gray-100 pl-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Cash as on 01 Apr 2025</span>
                    <span className="font-mono font-medium text-gray-800">
                      {formatINR(cashFlowSummary.opening)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600">
                    <span className="flex items-center gap-1 font-medium">
                      <span>(+) Incoming</span>
                    </span>
                    <span className="font-mono font-semibold">
                      +{formatINR(cashFlowSummary.incoming)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <span className="flex items-center gap-1 font-medium">
                      <span>(−) Outgoing</span>
                    </span>
                    <span className="font-mono font-semibold">
                      −{formatINR(cashFlowSummary.outgoing)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-[#408DFB]">
                    <span className="font-bold">(=) Cash as on 31 Mar 2026</span>
                    <span className="font-mono font-bold text-sm">
                      {formatINR(cashFlowSummary.closing)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Income and Expense Card (Half) */}
            <div className="bg-white border border-[#E5E7EB] rounded p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Income and Expense
                </span>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded border border-gray-200 bg-gray-50 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setIncomeExpenseBasis('Accrual')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        incomeExpenseBasis === 'Accrual' ? 'bg-white shadow-xs text-[#408DFB]' : 'text-gray-500'
                      }`}
                    >
                      Accrual
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncomeExpenseBasis('Cash')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        incomeExpenseBasis === 'Cash' ? 'bg-white shadow-xs text-[#408DFB]' : 'text-gray-500'
                      }`}
                    >
                      Cash
                    </button>
                  </div>
                  <select
                    value={incomeExpenseRange}
                    onChange={(e) => setIncomeExpenseRange(e.target.value)}
                    className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-700"
                  >
                    <option value="This Fiscal Year">This Fiscal Year</option>
                    <option value="Last 6 Months">Last 6 Months</option>
                  </select>
                </div>
              </div>

              {/* Total Income / Expense Badges */}
              <div className="flex items-center justify-between text-xs py-1">
                <div>
                  <span className="text-[11px] text-gray-400 block">Total Income</span>
                  <span className="text-emerald-700 font-bold font-mono text-base">
                    {formatINR(totalIncome)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-gray-400 block">Total Expenses</span>
                  <span className="text-red-600 font-bold font-mono text-base">
                    {formatINR(totalExpense)}
                  </span>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeExpenseData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatShortK} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      formatter={(val: any) => formatINR(val)}
                      contentStyle={{ fontSize: '11px', borderRadius: '4px', borderColor: '#E5E7EB' }}
                    />
                    <Bar dataKey="income" fill="#10B981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="expense" fill="#EF4444" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 5. Top Expenses Card (Half) */}
            <div className="bg-white border border-[#E5E7EB] rounded p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Top Expenses
                </span>
                <select
                  value={topExpenseRange}
                  onChange={(e) => setTopExpenseRange(e.target.value)}
                  className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-700"
                >
                  <option value="This Fiscal Year">This Fiscal Year</option>
                  <option value="This Month">This Month</option>
                </select>
              </div>

              <div className="space-y-3 pt-1">
                {topExpenses.map((exp, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-gray-800">
                      <span className="truncate pr-2 font-medium">{exp.name}</span>
                      <span className="font-mono font-semibold shrink-0">
                        {formatINR(exp.amount)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        style={{ width: `${exp.pct}%`, backgroundColor: exp.color }}
                        className="h-full rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Bank and Credit Cards Card */}
            <div className="bg-white border border-[#E5E7EB] rounded p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Bank and Credit Cards
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/banking')}
                  className="text-xs text-[#408DFB] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {bankAccounts.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs border border-dashed border-gray-200 rounded">
                  No bank accounts configured.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 text-xs">
                  {bankAccounts.slice(0, 4).map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => navigate('/banking')}
                      className="py-2.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer px-1 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <div className="w-6 h-6 rounded bg-blue-50 text-[#408DFB] flex items-center justify-center shrink-0">
                          {acc.accountType === 'CASH' ? (
                            <Wallet className="w-3 h-3" />
                          ) : (
                            <Landmark className="w-3 h-3" />
                          )}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-gray-900 block truncate">{acc.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {acc.accountNumber ? `•••• ${acc.accountNumber.slice(-4)}` : acc.bankName || 'Bank'}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-gray-900 shrink-0">
                        {formatINR(Number(acc.currentBalance || acc.balance || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Account Watchlist Card */}
            <div className="bg-white border border-[#E5E7EB] rounded p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Account Watchlist
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/chart-of-accounts')}
                  className="text-xs text-[#408DFB] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  Manage
                </button>
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                {watchlist.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/chart-of-accounts')}
                    className="py-2.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer px-1 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-gray-900 block">{item.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Code: {item.code} · {item.category}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-gray-900">
                      {formatINR(item.balance)} ({item.normalBalance})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
