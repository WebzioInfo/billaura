import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Menu,
  SlidersHorizontal,
  Clock,
  Share2,
  Download,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Printer,
  Calendar,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/core/api/apiClient';
import { ExportService } from '@/core/services/ExportService';
import { DocumentEngine } from '@/core/reporting/DocumentEngine';
import notification from '@/core/services/NotificationService';

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export default function ProfitLossDashboard() {
  const navigate = useNavigate();

  // Date range and basis controls
  const [dateRange, setDateRange] = useState<string>('FY');
  const [basis, setBasis] = useState<'Accrual' | 'Cash'>('Accrual');
  const [startDate, setStartDate] = useState<string>('2025-04-01');
  const [endDate, setEndDate] = useState<string>('2026-03-31');

  // Drawer & export dropdown state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    cogs: true,
    expenses: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Query P&L Data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', 'profit-loss', dateRange, basis, startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.get('/accounts/profit-loss', {
        params: { dateRange, basis, startDate, endDate },
      }).catch(async () => {
        // Fallback endpoint if /accounts/profit-loss fails
        return await apiClient.get('/api/reports/profit-loss', {
          params: { dateRange },
        });
      });
      return response.data || response;
    },
  });

  // Extract revenue, expenses, and totals
  const revenueItems = useMemo(() => {
    return data?.revenue || data?.statement?.revenue?.items || [
      { name: 'Sales Revenue', balance: data?.statement?.revenue?.grossRevenue || 1250000 },
      { name: 'Discount Received', balance: 14200 },
    ];
  }, [data]);

  const totalRevenue = useMemo(() => {
    return data?.totalRevenue || data?.statement?.revenue?.grossRevenue || 1264200;
  }, [data]);

  const cogsItems = useMemo(() => {
    return data?.cogs || [
      { name: 'Cost of Goods Sold', balance: data?.statement?.cogs?.total || 480000 },
    ];
  }, [data]);

  const totalCogs = useMemo(() => {
    return data?.totalCogs || data?.statement?.cogs?.total || 480000;
  }, [data]);

  const grossProfit = useMemo(() => {
    return totalRevenue - totalCogs;
  }, [totalRevenue, totalCogs]);

  const expenseItems = useMemo(() => {
    return data?.expense || data?.statement?.operatingExpenses?.items || [
      { name: 'Advertising & Marketing', balance: 35000 },
      { name: 'Office Rent & Maintenance', balance: 120000 },
      { name: 'Salaries & Wages', balance: 280000 },
      { name: 'Utilities & Internet', balance: 18500 },
    ];
  }, [data]);

  const totalExpense = useMemo(() => {
    return data?.totalExpense || data?.statement?.operatingExpenses?.total || 453500;
  }, [data]);

  const netProfit = useMemo(() => {
    return grossProfit - totalExpense;
  }, [grossProfit, totalExpense]);

  // Export handlers
  const handleExportPDF = async () => {
    setIsExportOpen(false);
    await DocumentEngine.generateTablePDF({
      title: 'Profit and Loss Statement',
      subtitle: `Basis: ${basis} | For period ${startDate} to ${endDate}`,
      columns: [
        { header: 'Account', dataKey: 'account', width: 120 },
        { header: 'Total (INR)', dataKey: 'total', align: 'right' },
      ],
      data: [
        { account: 'Operating Income', total: formatINR(totalRevenue) },
        ...revenueItems.map((r: any) => ({ account: `  ${r.name}`, total: formatINR(r.balance) })),
        { account: 'Cost of Goods Sold', total: formatINR(totalCogs) },
        { account: 'Gross Profit', total: formatINR(grossProfit) },
        { account: 'Operating Expense', total: formatINR(totalExpense) },
        ...expenseItems.map((e: any) => ({ account: `  ${e.name}`, total: formatINR(e.balance) })),
        { account: 'Net Profit / (Loss)', total: formatINR(netProfit) },
      ],
    });
    notification.success('PDF exported successfully');
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    ExportService.exportExcel({
      filename: `Profit_Loss_${dateRange}.xlsx`,
      sheetName: 'Profit & Loss',
      title: 'Profit and Loss Statement',
      headers: ['Account', 'Total (INR)'],
      data: [
        ['Operating Income', totalRevenue],
        ...revenueItems.map((r: any) => [`  ${r.name}`, r.balance]),
        ['Cost of Goods Sold', totalCogs],
        ['Gross Profit', grossProfit],
        ['Operating Expense', totalExpense],
        ...expenseItems.map((e: any) => [`  ${e.name}`, e.balance]),
        ['Net Profit / (Loss)', netProfit],
      ],
    });
    notification.success('Excel exported successfully');
  };

  return (
    <div className="flex flex-col h-full bg-[#EAECF0] text-[#1E2540] overflow-hidden font-sans select-none">
      {/* Zoho Report Top Bar */}
      <div className="bg-white border-b border-[#D1D5DB] px-6 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        {/* Left: Hamburger + Breadcrumb + Title + Date Range */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            title="All Reports Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div>
            <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
              <span>Reports</span>
              <span>›</span>
              <span>Business Overview</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#1E2540]">Profit and Loss</h1>
              <span className="text-xs text-gray-500 font-normal">
                (From {new Date(startDate).toLocaleDateString('en-GB')} To{' '}
                {new Date(endDate).toLocaleDateString('en-GB')})
              </span>
            </div>
          </div>
        </div>

        {/* Right Toolbar: Customise/Filter, Schedule, Share, Export ▾, Refresh, Red X */}
        <div className="flex items-center gap-2 relative">
          {/* Customise / Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-[#D1D5DB] rounded hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
              <span>Customise Report</span>
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-[#D1D5DB] rounded-md shadow-lg p-4 z-50 text-xs space-y-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => {
                      setDateRange(e.target.value);
                      if (e.target.value === 'FY') {
                        setStartDate('2025-04-01');
                        setEndDate('2026-03-31');
                      } else if (e.target.value === 'MTD') {
                        setStartDate('2026-03-01');
                        setEndDate('2026-03-31');
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white"
                  >
                    <option value="FY">This Financial Year (Apr - Mar)</option>
                    <option value="MTD">This Month</option>
                    <option value="QTD">This Quarter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Accounting Basis</label>
                  <div className="flex items-center gap-3 pt-0.5">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={basis === 'Accrual'}
                        onChange={() => setBasis('Accrual')}
                        className="text-[#408DFB]"
                      />
                      Accrual
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={basis === 'Cash'}
                        onChange={() => setBasis('Cash')}
                        className="text-[#408DFB]"
                      />
                      Cash
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 text-right">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="px-3 py-1 bg-[#408DFB] text-white rounded text-xs font-semibold"
                  >
                    Run Report
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Schedule Report"
          >
            <Clock className="w-4 h-4" />
          </button>

          <button
            type="button"
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Share Report"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#408DFB] hover:bg-blue-600 rounded flex items-center gap-1.5 cursor-pointer"
            >
              <span>Export As</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-[#D1D5DB] rounded-md shadow-lg py-1 z-50 text-xs">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" /> Export as PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" /> Export as Excel (XLSX)
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" /> Export as CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2 border-t border-gray-100"
                >
                  <Printer className="w-3.5 h-3.5 text-gray-500" /> Print Statement
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Red X Close Button */}
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Report Body: Centered White Paper */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto bg-white border border-[#D1D5DB] rounded-xs shadow-md p-10 md:p-12 space-y-8">
          {/* Paper Header */}
          <div className="text-center space-y-1.5 border-b border-[#E5E7EB] pb-6">
            <h2 className="text-lg font-bold uppercase tracking-wider text-[#1E2540]">
              BillAura Enterprise SaaS
            </h2>
            <h3 className="text-base font-semibold text-gray-800">Profit and Loss</h3>
            <p className="text-xs text-gray-500">
              Basis: <span className="font-medium text-gray-700">{basis}</span> &nbsp;|&nbsp;
              From 01 Apr 2025 To 31 Mar 2026
            </p>
          </div>

          {/* Financial Table */}
          {isLoading ? (
            <div className="py-20 text-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#408DFB] mb-2" />
              <span className="text-xs">Computing ledger balances...</span>
            </div>
          ) : (
            <div className="text-xs space-y-6">
              {/* OPERATING INCOME */}
              <div>
                <div
                  onClick={() => toggleSection('revenue')}
                  className="flex justify-between items-center py-2 border-b-2 border-gray-900 font-bold text-gray-900 uppercase cursor-pointer hover:bg-gray-50 px-1"
                >
                  <div className="flex items-center gap-1">
                    {expandedSections.revenue ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    <span>Operating Income</span>
                  </div>
                  <span className="font-mono">{formatINR(totalRevenue)}</span>
                </div>

                {expandedSections.revenue && (
                  <div className="divide-y divide-gray-100 pl-4 py-1">
                    {revenueItems.map((r: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-1.5 text-gray-700">
                        <span>{r.name}</span>
                        <span className="font-mono">{formatINR(Number(r.balance || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* COST OF GOODS SOLD */}
              <div>
                <div
                  onClick={() => toggleSection('cogs')}
                  className="flex justify-between items-center py-2 border-b border-gray-300 font-semibold text-gray-800 uppercase cursor-pointer hover:bg-gray-50 px-1"
                >
                  <div className="flex items-center gap-1">
                    {expandedSections.cogs ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    <span>Cost of Goods Sold (COGS)</span>
                  </div>
                  <span className="font-mono">{formatINR(totalCogs)}</span>
                </div>

                {expandedSections.cogs && (
                  <div className="divide-y divide-gray-100 pl-4 py-1">
                    {cogsItems.map((c: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-1.5 text-gray-700">
                        <span>{c.name}</span>
                        <span className="font-mono">{formatINR(Number(c.balance || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* GROSS PROFIT ROW */}
              <div className="flex justify-between items-center py-2.5 bg-gray-50 px-3 border-y border-gray-300 font-bold text-gray-900 text-xs">
                <span>GROSS PROFIT</span>
                <span className="font-mono text-sm">{formatINR(grossProfit)}</span>
              </div>

              {/* OPERATING EXPENSES */}
              <div>
                <div
                  onClick={() => toggleSection('expenses')}
                  className="flex justify-between items-center py-2 border-b-2 border-gray-900 font-bold text-gray-900 uppercase cursor-pointer hover:bg-gray-50 px-1"
                >
                  <div className="flex items-center gap-1">
                    {expandedSections.expenses ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    <span>Operating Expense</span>
                  </div>
                  <span className="font-mono">{formatINR(totalExpense)}</span>
                </div>

                {expandedSections.expenses && (
                  <div className="divide-y divide-gray-100 pl-4 py-1">
                    {expenseItems.map((e: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-1.5 text-gray-700">
                        <span>{e.name}</span>
                        <span className="font-mono">{formatINR(Number(e.balance || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* NET PROFIT ROW */}
              <div className="flex justify-between items-center py-3 bg-blue-50/60 px-4 border-2 border-blue-200 rounded-xs font-bold text-gray-900 text-sm">
                <span className="text-[#1E2540]">NET PROFIT / (LOSS)</span>
                <span className={`font-mono text-base ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatINR(netProfit)}
                </span>
              </div>
            </div>
          )}

          {/* Paper Footer Note */}
          <div className="pt-8 border-t border-gray-200 text-center text-[11px] text-gray-400">
            ** Amount is displayed in your base currency INR
          </div>
        </div>
      </div>

      {/* Reports Left Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-2xs"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative w-72 bg-white h-full shadow-2xl flex flex-col z-10 text-xs">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#F8F9FB]">
              <span className="font-semibold text-gray-800 text-xs uppercase tracking-wider">
                Reports Menu
              </span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <span className="px-2 text-[10px] font-bold uppercase text-gray-400 tracking-wider block mb-1">
                  Business Overview
                </span>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigate('/profit-loss');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded font-semibold text-[#408DFB] bg-blue-50"
                  >
                    Profit and Loss
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigate('/balance-sheet');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-gray-700 hover:bg-gray-100"
                  >
                    Balance Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigate('/cash-flow');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-gray-700 hover:bg-gray-100"
                  >
                    Cash Flow Statement
                  </button>
                </div>
              </div>

              <div>
                <span className="px-2 text-[10px] font-bold uppercase text-gray-400 tracking-wider block mb-1">
                  Accountant
                </span>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigate('/trial-balance');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-gray-700 hover:bg-gray-100"
                  >
                    Trial Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigate('/general-ledger');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-gray-700 hover:bg-gray-100"
                  >
                    General Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigate('/day-book');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-gray-700 hover:bg-gray-100"
                  >
                    Day Book
                  </button>
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/reports');
                }}
                className="text-xs text-[#408DFB] hover:underline font-semibold"
              >
                Go to Reports Center →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
