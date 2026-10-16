import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  Calendar,
  Info,
  FileText,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';
import apiClient from '@/core/api';
import { ExportService } from '@/core/services/ExportService';
import notification from '@/core/services/NotificationService';
import { useSessionStore } from '@/features/auth/stores/sessionStore';

interface GeneralLedgerRawItem {
  id: string;
  date: string;
  accountName: string;
  accountId: string;
  voucherNo?: string;
  description: string;
  debit: number;
  credit: number;
  departmentName?: string | null;
}

interface AccountOption {
  id: string;
  name: string;
  code?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters & Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatReportDate = (d: string | Date | undefined | null): string => {
  if (!d) return '—';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '—';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatAmount = (val: number | undefined | null, showDashForZero = true): string => {
  const num = Number(val) || 0;
  if (showDashForZero && Math.abs(num) < 0.005) {
    return '—';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const cleanDescription = (desc: string | undefined | null): string => {
  if (!desc) return '—';
  return desc.replace(/^(Debit|Credit):\s*/i, '').trim() || '—';
};

const getDateRangeBounds = (range: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (range === 'Today') {
    const todayStr = now.toISOString().split('T')[0];
    return {
      start: todayStr,
      end: todayStr,
      label: `For ${formatReportDate(now)}`,
    };
  }
  if (range === 'This Week') {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0],
      label: `From ${formatReportDate(startOfWeek)} To ${formatReportDate(endOfWeek)}`,
    };
  }
  if (range === 'This Month') {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    return {
      start: startOfMonth.toISOString().split('T')[0],
      end: endOfMonth.toISOString().split('T')[0],
      label: `From ${formatReportDate(startOfMonth)} To ${formatReportDate(endOfMonth)}`,
    };
  }
  if (range === 'This Quarter') {
    const qMonth = Math.floor(month / 3) * 3;
    const startOfQ = new Date(year, qMonth, 1);
    const endOfQ = new Date(year, qMonth + 3, 0);
    return {
      start: startOfQ.toISOString().split('T')[0],
      end: endOfQ.toISOString().split('T')[0],
      label: `From ${formatReportDate(startOfQ)} To ${formatReportDate(endOfQ)}`,
    };
  }
  if (range === 'This Year') {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    return {
      start: startOfYear.toISOString().split('T')[0],
      end: endOfYear.toISOString().split('T')[0],
      label: `From ${formatReportDate(startOfYear)} To ${formatReportDate(endOfYear)}`,
    };
  }
  if (range === 'Custom' && customStart && customEnd) {
    return {
      start: customStart,
      end: customEnd,
      label: `From ${formatReportDate(customStart)} To ${formatReportDate(customEnd)}`,
    };
  }
  // Default fallback: This Month
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  return {
    start: startOfMonth.toISOString().split('T')[0],
    end: endOfMonth.toISOString().split('T')[0],
    label: `From ${formatReportDate(startOfMonth)} To ${formatReportDate(endOfMonth)}`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const GeneralLedger: React.FC = () => {
  const navigate = useNavigate();
  const companyName = useSessionStore((state) => state.user?.companyName) || 'BillAura Technologies';

  // Filter Form State
  const [selectedRange, setSelectedRange] = useState<string>('This Month');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [reportingBasis, setReportingBasis] = useState<'Accrual' | 'Cash'>('Accrual');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');

  // Committed Filter State (applied when "Run Report" is clicked)
  const [appliedFilters, setAppliedFilters] = useState({
    range: 'This Month',
    customStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    customEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    basis: 'Accrual' as 'Accrual' | 'Cash',
    accountId: 'ALL',
  });

  // UI Dropdowns & Collapsed Groups
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute active date boundaries
  const activeRangeBounds = useMemo(() => {
    return getDateRangeBounds(appliedFilters.range, appliedFilters.customStart, appliedFilters.customEnd);
  }, [appliedFilters]);

  // Fetch full General Ledger data
  const { data = [], isLoading: loading, refetch } = useQuery<GeneralLedgerRawItem[]>({
    queryKey: ['reports', 'general-ledger'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/general-ledger');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    },
    staleTime: 30000,
  });

  // Fetch Account Lookup for filter dropdown
  const { data: accountsLookup = [] } = useQuery<AccountOption[]>({
    queryKey: ['accounts-lookup-filter'],
    queryFn: async () => {
      const res = await apiClient.get('/accounts/lookup', { params: { limit: 200 } });
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    },
    staleTime: 60000,
  });

  // Client-side filtering
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return data.filter((item) => {
      // Account filter
      if (
        appliedFilters.accountId &&
        appliedFilters.accountId !== 'ALL' &&
        item.accountId !== appliedFilters.accountId &&
        item.accountName !== appliedFilters.accountId
      ) {
        return false;
      }

      // Date range filter
      if (item.date) {
        const itemDateStr = new Date(item.date).toISOString().split('T')[0];
        if (activeRangeBounds.start && itemDateStr < activeRangeBounds.start) return false;
        if (activeRangeBounds.end && itemDateStr > activeRangeBounds.end) return false;
      }

      return true;
    });
  }, [data, appliedFilters.accountId, activeRangeBounds]);

  // Group rows by account with computed running balances
  const accountGroups = useMemo(() => {
    const groupsMap = new Map<string, { accountId: string; accountName: string; items: GeneralLedgerRawItem[] }>();

    filteredData.forEach((item) => {
      const key = item.accountId || item.accountName || 'Unknown Account';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          accountId: item.accountId || '',
          accountName: item.accountName || 'Unknown Account',
          items: [],
        });
      }
      groupsMap.get(key)!.items.push(item);
    });

    const result: Array<{
      key: string;
      accountId: string;
      accountName: string;
      rows: Array<{
        id: string;
        date: string;
        description: string;
        debit: number;
        credit: number;
        balance: number;
        balanceSuffix: 'Dr' | 'Cr' | '';
      }>;
      totalDebit: number;
      totalCredit: number;
      closingBalance: number;
      closingBalanceSuffix: 'Dr' | 'Cr' | '';
    }> = [];

    groupsMap.forEach((grp, key) => {
      // Sort chronologically by date
      const sortedItems = [...grp.items].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      let runningBalance = 0;
      let totalDebit = 0;
      let totalCredit = 0;

      const rows = sortedItems.map((item) => {
        const d = Number(item.debit) || 0;
        const c = Number(item.credit) || 0;
        totalDebit += d;
        totalCredit += c;

        runningBalance += (d - c);

        let balanceSuffix: 'Dr' | 'Cr' | '' = '';
        if (runningBalance > 0.005) balanceSuffix = 'Dr';
        else if (runningBalance < -0.005) balanceSuffix = 'Cr';

        return {
          id: item.id,
          date: item.date,
          description: cleanDescription(item.description),
          debit: d,
          credit: c,
          balance: Math.abs(runningBalance),
          balanceSuffix,
        };
      });

      let closingBalanceSuffix: 'Dr' | 'Cr' | '' = '';
      if (runningBalance > 0.005) closingBalanceSuffix = 'Dr';
      else if (runningBalance < -0.005) closingBalanceSuffix = 'Cr';

      result.push({
        key,
        accountId: grp.accountId,
        accountName: grp.accountName,
        rows,
        totalDebit,
        totalCredit,
        closingBalance: Math.abs(runningBalance),
        closingBalanceSuffix,
      });
    });

    return result;
  }, [filteredData]);

  // Grand totals across all accounts
  const grandTotalDebit = useMemo(() => {
    return accountGroups.reduce((acc, g) => acc + g.totalDebit, 0);
  }, [accountGroups]);

  const grandTotalCredit = useMemo(() => {
    return accountGroups.reduce((acc, g) => acc + g.totalCredit, 0);
  }, [accountGroups]);

  const difference = Math.abs(grandTotalDebit - grandTotalCredit);

  // Pagination for all transactions
  const totalEntries = filteredData.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalEntries / pageSize) || 1;
  const paginatedStartIndex = (currentPage - 1) * (pageSize === -1 ? totalEntries : pageSize);
  const paginatedEndIndex = Math.min(paginatedStartIndex + (pageSize === -1 ? totalEntries : pageSize), totalEntries);

  // Toggle group expansion
  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Run report action
  const handleRunReport = () => {
    setAppliedFilters({
      range: selectedRange,
      customStart: customStartDate,
      customEnd: customEndDate,
      basis: reportingBasis,
      accountId: selectedAccountId,
    });
    setCurrentPage(1);
    refetch();
    notification.success('Report updated for selected period');
  };

  // Reset / Clear filters
  const handleClearFilters = () => {
    const defaultStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    setSelectedRange('This Month');
    setCustomStartDate(defaultStart);
    setCustomEndDate(defaultEnd);
    setReportingBasis('Accrual');
    setSelectedAccountId('ALL');
    setAppliedFilters({
      range: 'This Month',
      customStart: defaultStart,
      customEnd: defaultEnd,
      basis: 'Accrual',
      accountId: 'ALL',
    });
    setCurrentPage(1);
  };

  // Export handlers
  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (!filteredData.length) {
      notification.warning('No data to export');
      return;
    }
    const exportRows = filteredData.map((d) => ({
      Date: formatReportDate(d.date),
      Account: d.accountName,
      Description: cleanDescription(d.description),
      Debit: Number(d.debit) || 0,
      Credit: Number(d.credit) || 0,
    }));
    ExportService.exportCsv(
      `General_Ledger_${activeRangeBounds.start}_to_${activeRangeBounds.end}.csv`,
      exportRows,
      ['Date', 'Account', 'Description', 'Debit', 'Credit']
    );
    notification.success('CSV exported successfully');
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    if (!filteredData.length) {
      notification.warning('No data to export');
      return;
    }
    ExportService.exportExcel({
      filename: `General_Ledger_${activeRangeBounds.start}_to_${activeRangeBounds.end}.xlsx`,
      sheetName: 'General Ledger',
      title: `General Ledger - ${companyName}`,
      headers: ['Date', 'Account', 'Description', 'Debit (INR)', 'Credit (INR)'],
      data: filteredData.map((d) => [
        formatReportDate(d.date),
        d.accountName,
        cleanDescription(d.description),
        Number(d.debit) || 0,
        Number(d.credit) || 0,
      ]),
    });
    notification.success('Excel exported successfully');
  };

  const handleExportPDF = () => {
    setIsExportOpen(false);
    window.print();
  };

  return (
    <div className="flex flex-col h-full w-full bg-white text-[#333] font-sans select-none overflow-hidden">
      {/* 1. PAGE HEADER (Fixed at top, 56px height, bottom border) */}
      <div className="h-[56px] bg-white border-b border-[#e5e7eb] px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <h1 className="text-[18px] font-semibold text-[#1e2540] tracking-tight">
            General Ledger
          </h1>
          <span
            className="cursor-pointer text-gray-400 hover:text-gray-600"
            title="Complete chronological record of all financial transactions classified by ledger account."
          >
            <Info className="w-4 h-4" />
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="h-[32px] px-3 bg-white border border-[#d9dce3] hover:bg-gray-50 text-[#333] rounded-[4px] text-[13px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#e5e7eb] rounded-[4px] shadow-lg py-1 z-50 text-[13px]">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-[#333] flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF Document</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-[#333] flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel (XLSX)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-[#333] flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#408dfb]" />
                  <span>CSV File</span>
                </button>
              </div>
            )}
          </div>

          {/* Print Icon Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="h-[32px] w-[32px] flex items-center justify-center bg-white border border-[#d9dce3] hover:bg-gray-50 text-gray-600 rounded-[4px] cursor-pointer transition-colors shadow-2xs"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. FILTER BAR (Fixed under header, background #f9f9fb, border-bottom 1px #e5e7eb) */}
      <div className="bg-[#f9f9fb] border-b border-[#e5e7eb] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Dropdown with Calendar Icon */}
          <div className="relative flex items-center">
            <div className="absolute left-2.5 text-gray-400 pointer-events-none">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              className="h-[32px] pl-8 pr-7 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none cursor-pointer appearance-none"
            >
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="This Quarter">This Quarter</option>
              <option value="This Year">This Year</option>
              <option value="Custom">Custom Date</option>
            </select>
            <div className="absolute right-2 text-gray-400 pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Custom Date Pickers (if Custom selected) */}
          {selectedRange === 'Custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-[32px] px-2.5 bg-white border border-[#d9dce3] rounded-[4px] text-[12px] text-[#333] focus:border-[#408dfb] outline-none"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-[32px] px-2.5 bg-white border border-[#d9dce3] rounded-[4px] text-[12px] text-[#333] focus:border-[#408dfb] outline-none"
              />
            </div>
          )}

          {/* Reporting Basis Segmented Toggle */}
          <div className="flex items-center border border-[#d9dce3] rounded-[4px] overflow-hidden bg-white h-[32px]">
            <button
              type="button"
              onClick={() => setReportingBasis('Accrual')}
              className={`px-3 h-full text-[12px] font-medium transition-colors cursor-pointer ${
                reportingBasis === 'Accrual'
                  ? 'bg-[#408dfb] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Accrual
            </button>
            <button
              type="button"
              onClick={() => setReportingBasis('Cash')}
              className={`px-3 h-full text-[12px] font-medium transition-colors cursor-pointer ${
                reportingBasis === 'Cash'
                  ? 'bg-[#408dfb] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Cash
            </button>
          </div>

          {/* Account Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="h-[32px] pl-3 pr-7 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none cursor-pointer appearance-none max-w-[200px]"
            >
              <option value="ALL">All Accounts</option>
              {accountsLookup.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.code ? `(${acc.code})` : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-2.5 text-gray-400 pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Blue Run Report Button */}
          <button
            type="button"
            onClick={handleRunReport}
            className="h-[32px] px-4 bg-[#408dfb] hover:bg-blue-600 text-white rounded-[4px] text-[13px] font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            Run Report
          </button>
        </div>

        {/* Clear Filters Reset Link */}
        {(appliedFilters.range !== 'This Month' ||
          appliedFilters.accountId !== 'ALL' ||
          appliedFilters.basis !== 'Accrual') && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-[12px] text-gray-500 hover:text-[#408dfb] flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* 3. REPORT BODY AREA (Scrollable, white card with border & margin) */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#f8f9fb]">
        <div className="max-w-full bg-white border border-[#e5e7eb] rounded-[6px] shadow-2xs overflow-hidden mb-6">
          {/* Report Heading Block (Centered like Zoho) */}
          <div className="py-6 px-4 text-center border-b border-[#e5e7eb] bg-white">
            <div className="text-[14px] font-semibold text-[#333] tracking-tight">
              {companyName}
            </div>
            <div className="text-[18px] font-semibold text-[#1e2540] mt-0.5">
              General Ledger
            </div>
            <div className="text-[12px] text-[#6c7380] mt-1 font-normal">
              Basis: {appliedFilters.basis}
            </div>
            <div className="text-[12px] text-[#6c7380] mt-0.5 font-normal">
              {activeRangeBounds.label}
            </div>
          </div>

          {/* Single Table Container (Header is sticky inside same container) */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px] table-fixed min-w-[700px]">
              {/* Sticky Table Header */}
              <thead className="bg-[#f9f9fb] text-[#6c7380] text-[11px] font-semibold uppercase tracking-[0.04em] border-b border-[#e5e7eb] sticky top-0 z-10">
                <tr>
                  <th style={{ width: '120px' }} className="py-2.5 px-3">
                    DATE
                  </th>
                  <th className="py-2.5 px-3">
                    DESCRIPTION
                  </th>
                  <th style={{ width: '140px' }} className="py-2.5 px-3 text-right">
                    DEBIT
                  </th>
                  <th style={{ width: '140px' }} className="py-2.5 px-3 text-right">
                    CREDIT
                  </th>
                  <th style={{ width: '160px' }} className="py-2.5 px-3 text-right">
                    BALANCE
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* 1. Loading Skeleton State */}
                {loading && data.length === 0 ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="h-[36px] border-b border-[#eef0f4]">
                      <td className="px-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                      </td>
                      <td className="px-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-48" />
                      </td>
                      <td className="px-3 text-right">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20 ml-auto" />
                      </td>
                      <td className="px-3 text-right">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20 ml-auto" />
                      </td>
                      <td className="px-3 text-right">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : accountGroups.length === 0 ? (
                  /* 2. Empty State */
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-gray-500">
                      <div className="text-[14px] text-gray-600 mb-1">
                        There are no transactions for the selected period.
                      </div>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-[13px] text-[#408dfb] hover:underline cursor-pointer"
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  /* 3. Account Grouped Rows */
                  accountGroups.map((grp) => {
                    const isCollapsed = Boolean(collapsedGroups[grp.key]);

                    return (
                      <React.Fragment key={grp.key}>
                        {/* A. Account Group Header Row */}
                        <tr className="bg-[#f5f6fa] border-b border-[#e5e7eb] font-bold text-[13px] text-[#333] select-none">
                          <td colSpan={2} className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleGroup(grp.key)}
                                className="p-0.5 hover:bg-gray-200 rounded text-gray-500 cursor-pointer"
                                title={isCollapsed ? 'Expand group' : 'Collapse group'}
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {grp.accountId ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/accounting/ledger/${grp.accountId}`)}
                                  className="text-[#408dfb] hover:underline font-bold text-left cursor-pointer"
                                >
                                  {grp.accountName}
                                </button>
                              ) : (
                                <span className="text-[#333] font-bold">{grp.accountName}</span>
                              )}
                            </div>
                          </td>

                          {/* Group Debit Total */}
                          <td className="py-2 px-3 text-right tabular-nums text-[#333] font-bold">
                            {formatAmount(grp.totalDebit, true)}
                          </td>

                          {/* Group Credit Total */}
                          <td className="py-2 px-3 text-right tabular-nums text-[#333] font-bold">
                            {formatAmount(grp.totalCredit, true)}
                          </td>

                          {/* Group Closing Balance */}
                          <td className="py-2 px-3 text-right tabular-nums text-[#333] font-bold">
                            {formatAmount(grp.closingBalance, false)}{' '}
                            {grp.closingBalanceSuffix && (
                              <span className="text-[11px] font-semibold text-gray-500 ml-1">
                                {grp.closingBalanceSuffix}
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* B. Child Transaction Rows (Rendered when expanded) */}
                        {!isCollapsed &&
                          grp.rows.map((row) => (
                            <tr
                              key={row.id}
                              className="h-[36px] text-[13px] font-normal text-[#333] border-b border-[#eef0f4] hover:bg-[#f7f9ff] transition-colors"
                            >
                              <td className="px-3 text-gray-600 whitespace-nowrap">
                                {formatReportDate(row.date)}
                              </td>
                              <td className="px-3 text-[#333] truncate max-w-[320px]" title={row.description}>
                                {row.description}
                              </td>
                              <td className="px-3 text-right tabular-nums text-[#333]">
                                {formatAmount(row.debit, true)}
                              </td>
                              <td className="px-3 text-right tabular-nums text-[#333]">
                                {formatAmount(row.credit, true)}
                              </td>
                              <td className="px-3 text-right tabular-nums text-[#333]">
                                <span>{formatAmount(row.balance, false)}</span>
                                {row.balanceSuffix && (
                                  <span className="text-[11px] font-medium text-gray-500 ml-1">
                                    {row.balanceSuffix}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}

                        {/* C. Group Footer Row */}
                        {!isCollapsed && (
                          <tr className="bg-white border-t border-b border-[#e5e7eb] font-bold text-[13px] text-[#333] h-[36px]">
                            <td colSpan={2} className="px-3 text-gray-700">
                              Total for {grp.accountName}
                            </td>
                            <td className="px-3 text-right tabular-nums text-[#1e2540]">
                              {formatAmount(grp.totalDebit, false)}
                            </td>
                            <td className="px-3 text-right tabular-nums text-[#1e2540]">
                              {formatAmount(grp.totalCredit, false)}
                            </td>
                            <td className="px-3 text-right tabular-nums text-[#1e2540]">
                              {formatAmount(grp.closingBalance, false)}{' '}
                              {grp.closingBalanceSuffix && (
                                <span className="text-[11px] text-gray-500 ml-1">
                                  {grp.closingBalanceSuffix}
                                </span>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

              {/* 5. GRAND TOTAL FOOTER (Fixed at the bottom of the report table) */}
              {accountGroups.length > 0 && (
                <tfoot className="bg-[#f9f9fb] border-t-2 border-[#e5e7eb] font-bold text-[13px] text-[#1e2540]">
                  <tr className="h-[40px]">
                    <td colSpan={2} className="px-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[14px]">Total</span>
                        {difference > 0.005 && (
                          <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            Difference: {formatAmount(difference, false)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 text-right tabular-nums text-[14px]">
                      {formatAmount(grandTotalDebit, false)}
                    </td>
                    <td className="px-3 text-right tabular-nums text-[14px]">
                      {formatAmount(grandTotalCredit, false)}
                    </td>
                    <td className="px-3 text-right tabular-nums text-[13px] text-gray-500 font-normal">
                      {difference <= 0.005 ? (
                        <span className="text-emerald-600 font-semibold text-xs">Balanced</span>
                      ) : (
                        <span className="text-red-500 font-semibold text-xs">Unbalanced</span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* 6. FIXED BOTTOM PAGINATION BAR */}
      <div className="h-[44px] bg-white border-t border-[#e5e7eb] px-6 flex items-center justify-between shrink-0 text-xs text-[#555] z-10">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-[#d9dce3] rounded px-2 py-0.5 bg-white text-xs text-[#333] outline-none cursor-pointer"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={-1}>All</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span>
            {totalEntries === 0
              ? '0 - 0 of 0 entries'
              : `${paginatedStartIndex + 1} - ${paginatedEndIndex} of ${totalEntries} entries`}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 border border-[#d9dce3] rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages || pageSize === -1}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 border border-[#d9dce3] rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralLedger;
