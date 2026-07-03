import React from 'react';
import { 
  ArrowUpRight, AlertTriangle, Clock, RefreshCw, Landmark, ShoppingCart, BarChart3, PieChart, Activity, AlertCircle, FileText, Download, CheckCircle, TrendingUp, DollarSign, TrendingDown, Users
} from 'lucide-react';
import apiClient from '../../services/api';
import { useQuery } from '@tanstack/react-query';

interface DashboardMetrics {
  salesTotal: number;
  purchaseTotal: number;
  expenseTotal: number;
  customerCount: number;
  vendorCount: number;
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  reorderLevel: number;
}

interface RecentActivity {
  id: string;
  type: string;
  reference: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

interface DashboardData {
  metrics: DashboardMetrics;
  lowStock: LowStockItem[];
  recentActivity: RecentActivity[];
}

export const ExecutiveDashboard = () => {
  const { data, isLoading, refetch: fetchDashboardData } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: DashboardData }>('/dashboard/summary');
      if (res?.success && res?.data) {
        return res.data;
      }
      return null;
    }
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse text-left">
        <div className="h-8 bg-border rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl border border-border h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-border h-96" />
          <div className="glass-panel p-6 rounded-2xl border border-border h-96" />
        </div>
      </div>
    );
  }

  const { metrics, lowStock, recentActivity } = data;
  const netProfit = metrics.salesTotal - metrics.purchaseTotal - metrics.expenseTotal;

  // Compute percentage levels for sales vs purchases vs expenses
  const maxMetric = Math.max(metrics.salesTotal, metrics.purchaseTotal, metrics.expenseTotal, 1);
  const salesPercent = (metrics.salesTotal / maxMetric) * 100;
  const purchasePercent = (metrics.purchaseTotal / maxMetric) * 100;
  const expensePercent = (metrics.expenseTotal / maxMetric) * 100;

  return (
    <div className="space-y-6 text-left">
      {/* Header Row */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="w-6 h-6 text-accent" />
            Executive Command Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time multi-tenant financial telemetry and core operational metrics.
          </p>
        </div>
        <button
          onClick={() => fetchDashboardData()}
          className="p-2.5 rounded-xl border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-background transition-all cursor-pointer"
          title="Refresh Telemetry"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sales Card */}
        <div className="glass-panel p-6 rounded-2xl border border-border flex justify-between items-start hover-premium">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Sales</span>
            <h3 className="text-2xl font-black text-foreground">{formatCurrency(metrics.salesTotal)}</h3>
            <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +12% vs last month
            </span>
          </div>
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Purchases Card */}
        <div className="glass-panel p-6 rounded-2xl border border-border flex justify-between items-start hover-premium">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Purchases</span>
            <h3 className="text-2xl font-black text-foreground">{formatCurrency(metrics.purchaseTotal)}</h3>
            <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5">
              <TrendingDown className="w-3.5 h-3.5" /> +4.2% procurement expense
            </span>
          </div>
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* Expenses Card */}
        <div className="glass-panel p-6 rounded-2xl border border-border flex justify-between items-start hover-premium">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operating Expenses</span>
            <h3 className="text-2xl font-black text-foreground">{formatCurrency(metrics.expenseTotal)}</h3>
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
              General overheads log
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="glass-panel p-6 rounded-2xl border border-border flex justify-between items-start hover-premium">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Operating Surplus</span>
            <h3 className={`text-2xl font-black ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(netProfit)}
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Taxable margin computed
            </span>
          </div>
          <div className={`p-3 rounded-xl ${netProfit >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Widgets layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Ledger Visual Summary & Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visual Summary Widget */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Ledger Activity Overview</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Comparative margin distribution between key ledgers.</p>
            </div>

            <div className="space-y-4">
              {/* Sales bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground">Revenue generated</span>
                  <span className="text-green-500">{formatCurrency(metrics.salesTotal)} ({Math.round(salesPercent)}%)</span>
                </div>
                <div className="w-full bg-border rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${salesPercent}%` }} />
                </div>
              </div>

              {/* Purchase bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground">Procurement procurement</span>
                  <span className="text-red-500">{formatCurrency(metrics.purchaseTotal)} ({Math.round(purchasePercent)}%)</span>
                </div>
                <div className="w-full bg-border rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${purchasePercent}%` }} />
                </div>
              </div>

              {/* Expense bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground">General overheads</span>
                  <span className="text-amber-500">{formatCurrency(metrics.expenseTotal)} ({Math.round(expensePercent)}%)</span>
                </div>
                <div className="w-full bg-border rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${expensePercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities Log */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-foreground">Recent Transactions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Real-time ledger postings across active departments.</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground italic">
                No recent transactions registered.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-bold text-muted-foreground uppercase border-b border-border bg-background bg-opacity-40">
                    <tr>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Details</th>
                      <th className="py-2.5 px-3 text-right">Value</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentActivity.map((act) => (
                      <tr key={act.id} className="hover:bg-background/20 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">{act.reference}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{act.description}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatCurrency(act.amount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${
                            act.status === 'PAID' || act.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {act.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Alerts, Low Stock, & Mappings */}
        <div className="space-y-6">
          {/* Quick Stats Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
            <h2 className="text-lg font-bold text-foreground">Directories Count</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background border border-border rounded-xl flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold">Customers</span>
                  <span className="font-bold text-lg text-foreground">{metrics.customerCount}</span>
                </div>
              </div>
              <div className="p-4 bg-background border border-border rounded-xl flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold">Vendors</span>
                  <span className="font-bold text-lg text-foreground">{metrics.vendorCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Warnings Widget */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Critical Reorder Alerts
            </h2>
            
            {lowStock.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground italic">
                Inventory levels within safety limits.
              </div>
            ) : (
              <div className="space-y-3">
                {lowStock.map((item) => (
                  <div key={item.id} className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex justify-between items-center text-xs">
                    <div className="text-left">
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-semibold">
                      Reorder: {item.reorderLevel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
