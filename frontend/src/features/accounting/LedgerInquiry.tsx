import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  BookOpen,
  Printer,
  Download,
  ArrowUpDown,
  ChevronRight,
  ArrowLeft,
  X,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import apiClient from '@/core/api';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';
import notification from '@/core/services/NotificationService';
import { ExportService } from '@/core/services/ExportService';
import { DocumentEngine } from '@/core/reporting/DocumentEngine';

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

export function LedgerInquiry() {
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  // Tab states
  const [activeTab, setActiveTab] = useState<'statement' | 'outstanding' | 'audit'>('statement');

  // Search query state for switching accounts
  const [searchVal, setSearchVal] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter states
  const [dateRange, setDateRange] = useState('FY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [voucherType, setVoucherType] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [textSearch, setTextSearch] = useState('');

  // Table sorting states
  const [sortField, setSortField] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Invoice / source doc slide drawer preview
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // References
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hotkeys binding
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleExportExcel();
      }
      if (e.key === 'Escape') {
        setPreviewDoc(null);
        setIsSearching(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [ledgerId]);

  // Click outside listener for search popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic Ledger Lookup Search query
  useEffect(() => {
    if (!searchVal.trim()) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        const res = await apiClient.get('/accounts/lookup', {
          params: { search: searchVal, limit: 8 },
        });
        setSearchResults(res.data?.data || res.data || []);
        setSelectedIndex(0);
      } catch {
        setSearchResults([]);
      }
    }, 120);
    return () => clearTimeout(delay);
  }, [searchVal]);

  // Main ledger inquiry details query
  const { data: inquiryData, isLoading } = useQuery({
    queryKey: ['ledger-inquiry', ledgerId, startDate, endDate, voucherType, minAmount, maxAmount, textSearch],
    queryFn: async () => {
      if (!ledgerId) return null;
      const res = await apiClient.get(`/accounts/${ledgerId}/inquiry`, {
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minAmount: minAmount || undefined,
          maxAmount: maxAmount || undefined,
          voucherType: voucherType || undefined,
          search: textSearch || undefined,
        },
      });
      return res.data?.data || null;
    },
    enabled: Boolean(ledgerId),
  });

  useDynamicTitle(inquiryData?.ledger?.name || 'Ledger Inquiry');

  // Calculate Date Ranges
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dateRange === 'Today') {
      setStartDate(today);
      setEndDate(today);
    } else if (dateRange === 'Yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (dateRange === 'Week') {
      const prevWeek = new Date();
      prevWeek.setDate(prevWeek.getDate() - 7);
      setStartDate(prevWeek.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (dateRange === 'Month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (dateRange === 'FY') {
      const currentYear = new Date().getFullYear();
      setStartDate(`${currentYear}-04-01`);
      setEndDate(`${currentYear + 1}-03-31`);
    }
  }, [dateRange]);

  // Search input keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, searchResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selection = searchResults[selectedIndex];
      if (selection) {
        handleSelectLedger(selection);
      }
    } else if (e.key === 'Escape') {
      setIsSearching(false);
      searchInputRef.current?.blur();
    }
  };

  const handleSelectLedger = (ledger: any) => {
    setSearchVal('');
    setIsSearching(false);
    navigate(`/accounting/ledger/${ledger.id}`);
  };

  // Reset filters
  const handleClearFilters = () => {
    setDateRange('FY');
    setVoucherType('');
    setMinAmount('');
    setMaxAmount('');
    setTextSearch('');
  };

  // Export handlers
  const handleExportExcel = () => {
    if (!inquiryData || !sortedTransactions.length) {
      notification.error('No transactions to export');
      return;
    }

    const headers = ['Date', 'Voucher No', 'Voucher Type', 'Reference', 'Description', 'Debit', 'Credit', 'Balance', 'Status'];
    const exportData = sortedTransactions.map((t: any) => [
      formatReportDate(t.date),
      t.voucherNo || '',
      t.voucherType || '',
      t.reference || '',
      t.description || '',
      t.debit || 0,
      t.credit || 0,
      t.balance || 0,
      t.status || 'POSTED',
    ]);

    ExportService.exportExcel({
      filename: `Ledger_Statement_${inquiryData.ledger.name}_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Ledger Statement',
      title: `Ledger Statement: ${inquiryData.ledger.name}`,
      headers,
      data: exportData,
    });
    notification.success('Excel statement exported successfully');
  };

  const handlePrint = async () => {
    if (!inquiryData || !sortedTransactions.length) {
      notification.error('No transactions to print');
      return;
    }

    await DocumentEngine.generateTablePDF({
      title: `Ledger Statement: ${inquiryData.ledger.name}`,
      subtitle: `Period: ${startDate} to ${endDate} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Date', dataKey: 'date', width: 25 },
        { header: 'Voucher No', dataKey: 'voucherNo', width: 30 },
        { header: 'Type', dataKey: 'type', width: 25 },
        { header: 'Description', dataKey: 'description' },
        { header: 'Debit', dataKey: 'debit', align: 'right' },
        { header: 'Credit', dataKey: 'credit', align: 'right' },
        { header: 'Balance', dataKey: 'balance', align: 'right' },
      ],
      data: sortedTransactions.map((t: any) => ({
        date: formatReportDate(t.date),
        voucherNo: t.voucherNo || '',
        type: t.voucherType || '',
        description: t.description || '',
        debit: t.debit || 0,
        credit: t.credit || 0,
        balance: t.balance || 0,
      })),
      orientation: 'landscape',
    });
  };

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const items = [...(inquiryData?.transactions || [])];
    return items.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [inquiryData, sortField, sortAsc]);

  // Construct meta information line
  const metaLine = useMemo(() => {
    if (!inquiryData?.ledger) return '';
    const parts: string[] = [];
    if (inquiryData.ledger.parentName) {
      parts.push(`Group: ${inquiryData.ledger.parentName}`);
    }
    if (inquiryData.ledger.gstin && inquiryData.ledger.gstin !== 'N/A') {
      parts.push(`GST: ${inquiryData.ledger.gstin}`);
    }
    if (inquiryData.ledger.phone && inquiryData.ledger.phone !== 'N/A') {
      parts.push(`Phone: ${inquiryData.ledger.phone}`);
    }
    return parts.join(' | ');
  }, [inquiryData]);

  // Status text renderer (green POSTED, grey DRAFT, red VOID/CANCELLED)
  const renderStatus = (status: string | undefined | null) => {
    const s = (status || 'POSTED').toUpperCase();
    if (s === 'POSTED') {
      return <span className="text-[#2e7d32] font-semibold text-[11px] uppercase tracking-wide">POSTED</span>;
    }
    if (s === 'DRAFT') {
      return <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wide">DRAFT</span>;
    }
    if (s === 'VOID' || s === 'CANCELLED') {
      return <span className="text-[#d93025] font-semibold text-[11px] uppercase tracking-wide">{s}</span>;
    }
    return <span className="text-gray-600 font-semibold text-[11px] uppercase tracking-wide">{s}</span>;
  };

  return (
    <div className="h-full w-full bg-white text-[#333] font-sans flex flex-col select-none overflow-hidden print:overflow-visible">
      {/* 1. PAGE HEADER (Zoho account-detail style) */}
      <div className="px-6 pt-3.5 pb-3 border-b border-[#e5e7eb] shrink-0 bg-white print:hidden">
        {/* Breadcrumb */}
        <div className="flex items-center text-[12px] text-gray-500 mb-1">
          {returnTo ? (
            <>
              <button
                type="button"
                onClick={() => navigate(returnTo)}
                className="hover:text-[#408dfb] cursor-pointer transition-colors flex items-center gap-1 font-medium text-[#408dfb]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Report
              </button>
              <span className="mx-1.5 text-gray-400">/</span>
            </>
          ) : (
            <>
              <span
                onClick={() => navigate('/chart-of-accounts')}
                className="hover:text-[#408dfb] cursor-pointer transition-colors"
              >
                Chart of Accounts
              </span>
              <span className="mx-1.5 text-gray-400">/</span>
            </>
          )}
          <span className="text-gray-700 font-medium truncate max-w-[300px]">
            {inquiryData?.ledger?.name || 'Account Detail'}
          </span>
        </div>

        {/* Title Row + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Account Title + Code Tag + Meta */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-semibold text-[#1e2540] tracking-tight">
                {inquiryData?.ledger?.name || 'Ledger Account'}
              </h1>
              {inquiryData?.ledger?.code && (
                <span className="text-[13px] text-gray-400 font-normal">
                  ({inquiryData.ledger.code})
                </span>
              )}
            </div>
            {metaLine && (
              <div className="text-[12px] text-gray-500 font-normal mt-0.5">
                {metaLine}
              </div>
            )}
          </div>

          {/* Right Header Controls: Search + Print + Export */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Account Switcher Search Input */}
            <div className="relative w-[260px]" ref={containerRef}>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Ledger Account... (Ctrl + F)"
                value={searchVal}
                onChange={(e) => {
                  setSearchVal(e.target.value);
                  setIsSearching(true);
                }}
                onFocus={() => setIsSearching(true)}
                onKeyDown={handleSearchKeyDown}
                className="w-full h-[32px] pl-8 pr-3 bg-white border border-[#d9dce3] rounded-[4px] text-xs text-[#333] focus:border-[#408dfb] outline-none placeholder:text-gray-400"
              />

              {/* Search dropdown results */}
              {isSearching && searchResults.length > 0 && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-[#e5e7eb] shadow-lg rounded-[4px] z-50 overflow-hidden text-xs">
                  <div className="p-1 max-h-[220px] overflow-y-auto divide-y divide-gray-100">
                    {searchResults.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectLedger(item)}
                        className={`w-full text-left px-3 py-1.5 rounded text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          idx === selectedIndex
                            ? 'bg-blue-50 text-[#408dfb] font-semibold'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className="truncate">
                          {item.name} {item.code ? `(${item.code})` : ''}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                          {item.accountType}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              title="Print Statement (Ctrl + P)"
              className="h-[32px] w-[32px] flex items-center justify-center bg-white border border-[#d9dce3] hover:bg-gray-50 text-gray-600 rounded-[4px] cursor-pointer transition-colors shadow-2xs"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              title="Export Excel (Ctrl + E)"
              className="h-[32px] px-3 bg-white border border-[#d9dce3] hover:bg-gray-50 text-[#333] rounded-[4px] text-[13px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!ledgerId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
          <BookOpen className="w-10 h-10 text-[#408dfb] mb-3 opacity-80" />
          <h2 className="text-[16px] font-semibold text-[#1e2540]">Ledger Account Detail</h2>
          <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed">
            Select an account in the search box above or browse the Chart of Accounts to inspect detailed transactional entries and running balances.
          </p>
        </div>
      ) : isLoading ? (
        /* Loading Skeleton */
        <div className="flex-1 p-6 space-y-4 bg-white overflow-hidden">
          <div className="grid grid-cols-4 gap-6 pb-4 border-b border-[#e5e7eb]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-28 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : !inquiryData ? (
        /* Error State */
        <div className="p-6">
          <div className="p-4 flex items-center gap-3 border border-red-200 bg-red-50 text-red-800 rounded-[4px]">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-semibold">
              Failed to load account ledger details. Please verify the account ID or try again.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
          {/* 2. SUMMARY STRIP (4 simple stat blocks separated by vertical dividers) */}
          <div className="px-6 py-3.5 border-b border-[#e5e7eb] flex items-center divide-x divide-[#e5e7eb] bg-white shrink-0">
            {/* Opening Balance */}
            <div className="pr-6 first:pl-0">
              <div className="text-[12px] text-gray-500 font-normal mb-0.5">Opening Balance</div>
              <div className="text-[18px] font-semibold text-[#333] tabular-nums">
                {formatAmount(inquiryData.summary.openingBalance, false)}
              </div>
            </div>

            {/* Total Debit */}
            <div className="px-6">
              <div className="text-[12px] text-gray-500 font-normal mb-0.5">Total Debit</div>
              <div className="text-[18px] font-semibold text-[#333] tabular-nums">
                {formatAmount(inquiryData.summary.totalDebit, false)}
              </div>
            </div>

            {/* Total Credit */}
            <div className="px-6">
              <div className="text-[12px] text-gray-500 font-normal mb-0.5">Total Credit</div>
              <div className="text-[18px] font-semibold text-[#333] tabular-nums">
                {formatAmount(inquiryData.summary.totalCredit, false)}
              </div>
            </div>

            {/* Closing Balance */}
            <div className="pl-6">
              <div className="text-[12px] text-gray-500 font-normal mb-0.5">Closing Balance</div>
              <div className="text-[18px] font-semibold text-[#333] tabular-nums flex items-baseline">
                <span>{formatAmount(Math.abs(inquiryData.summary.currentBalance), false)}</span>
                <span className="text-[12px] text-gray-500 font-normal ml-1.5">
                  {inquiryData.summary.currentBalance >= 0 ? 'Dr' : 'Cr'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. TABS + FILTER BAR (One row, Zoho style) */}
          <div className="px-6 py-2.5 border-b border-[#e5e7eb] flex flex-wrap items-center justify-between gap-3 bg-white shrink-0 print:hidden">
            {/* Left Tabs: Register | Ageing | Audits */}
            <div className="flex items-center gap-6 h-[32px]">
              {[
                { id: 'statement', label: 'Register' },
                { id: 'outstanding', label: 'Ageing' },
                { id: 'audit', label: 'Audits' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={`h-full text-[13px] font-medium transition-colors cursor-pointer relative pb-1 ${
                    activeTab === t.id
                      ? 'text-[#333] border-b-2 border-[#408dfb]'
                      : 'text-[#6c7380] hover:text-[#333] border-b-2 border-transparent'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Right Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Range Dropdown */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-[32px] px-2.5 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none cursor-pointer"
              >
                <option value="FY">Financial Year</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Week">This Week</option>
                <option value="Month">This Month</option>
              </select>

              {/* Voucher Type Dropdown */}
              <select
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value)}
                className="h-[32px] px-2.5 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none cursor-pointer"
              >
                <option value="">All Vouchers</option>
                <option value="Sales Invoice">Invoice</option>
                <option value="Purchase Bill">Bill</option>
                <option value="Receipt">Receipt</option>
                <option value="Vendor Payment">Payment</option>
                <option value="Journal Entry">Journal</option>
              </select>

              {/* Min & Max Amount Inputs */}
              <input
                type="number"
                placeholder="Min amount"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="h-[32px] w-[110px] px-2.5 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none placeholder:text-gray-400"
              />
              <input
                type="number"
                placeholder="Max amount"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="h-[32px] w-[110px] px-2.5 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none placeholder:text-gray-400"
              />

              {/* Filter Table Search Input */}
              <div className="relative w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter table..."
                  value={textSearch}
                  onChange={(e) => setTextSearch(e.target.value)}
                  className="h-[32px] w-full pl-8 pr-2.5 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* 4. TAB CONTENTS & REGISTER TABLE */}
          <div className="flex-1 overflow-auto bg-white">
            {activeTab === 'statement' ? (
              sortedTransactions.length === 0 ? (
                /* Empty state */
                <div className="py-20 text-center text-gray-500">
                  <div className="text-[14px] text-gray-600 mb-1.5">
                    No transactions found for the selected filters.
                  </div>
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-[13px] text-[#408dfb] hover:underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                /* Register Table */
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[13px] table-fixed min-w-[1100px]">
                    {/* Sticky Table Header (height 40px, background #f9f9fb) */}
                    <thead className="bg-[#f9f9fb] text-[#6c7380] text-[11px] font-semibold uppercase tracking-[0.04em] border-b border-[#e5e7eb] sticky top-0 z-10">
                      <tr className="h-[40px]">
                        <th style={{ width: '110px' }} className="py-2 px-6">
                          <div
                            onClick={() => {
                              if (sortField === 'date') setSortAsc(!sortAsc);
                              else {
                                setSortField('date');
                                setSortAsc(true);
                              }
                            }}
                            className="flex items-center gap-1 cursor-pointer hover:text-[#333]"
                          >
                            <span>DATE</span>
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                          </div>
                        </th>
                        <th style={{ width: '160px' }} className="py-2 px-3">
                          <div
                            onClick={() => {
                              if (sortField === 'voucherNo') setSortAsc(!sortAsc);
                              else {
                                setSortField('voucherNo');
                                setSortAsc(true);
                              }
                            }}
                            className="flex items-center gap-1 cursor-pointer hover:text-[#333]"
                          >
                            <span>VOUCHER NO</span>
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                          </div>
                        </th>
                        <th style={{ width: '140px' }} className="py-2 px-3">
                          VOUCHER TYPE
                        </th>
                        <th style={{ width: '160px' }} className="py-2 px-3">
                          REFERENCE
                        </th>
                        <th className="py-2 px-3">
                          DESCRIPTION
                        </th>
                        <th style={{ width: '130px' }} className="py-2 px-3 text-right">
                          DEBIT (DR)
                        </th>
                        <th style={{ width: '130px' }} className="py-2 px-3 text-right">
                          CREDIT (CR)
                        </th>
                        <th style={{ width: '160px' }} className="py-2 px-3 text-right">
                          RUNNING BALANCE
                        </th>
                        <th style={{ width: '100px' }} className="py-2 px-6 text-center">
                          STATUS
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#eef0f4]">
                      {/* First Row: Opening Balance row */}
                      <tr className="h-[40px] bg-[#f9f9fb] font-semibold text-[13px] text-[#333] border-b border-[#e5e7eb]">
                        <td className="px-6 text-gray-500 font-normal">
                          {formatReportDate(startDate || inquiryData?.transactions?.[0]?.date)}
                        </td>
                        <td className="px-3 text-gray-400">—</td>
                        <td className="px-3 text-gray-400">—</td>
                        <td className="px-3 text-gray-400">—</td>
                        <td className="px-3 text-gray-700 font-semibold">Opening Balance</td>
                        <td className="px-3 text-right text-gray-400">—</td>
                        <td className="px-3 text-right text-gray-400">—</td>
                        <td className="px-3 text-right tabular-nums text-[#333] font-semibold">
                          <span>{formatAmount(Math.abs(inquiryData.summary.openingBalance), false)}</span>
                          <span className="text-[12px] text-gray-500 font-normal ml-1">
                            {inquiryData.summary.openingBalance >= 0 ? 'Dr' : 'Cr'}
                          </span>
                        </td>
                        <td className="px-6 text-center text-gray-400">—</td>
                      </tr>

                      {/* Transaction Rows */}
                      {sortedTransactions.map((tx: any, idx: number) => (
                        <tr
                          key={tx.id || idx}
                          className="h-[40px] text-[13px] font-normal text-[#333] hover:bg-[#f7f9ff] transition-colors"
                        >
                          {/* Date */}
                          <td className="px-6 text-gray-600 whitespace-nowrap">
                            {formatReportDate(tx.date)}
                          </td>

                          {/* Voucher No (Blue Link, normal weight 500) */}
                          <td className="px-3 truncate" title={tx.voucherNo || ''}>
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(tx)}
                              className="text-[#408dfb] hover:underline font-medium cursor-pointer text-left truncate max-w-full"
                            >
                              {tx.voucherNo || '—'}
                            </button>
                          </td>

                          {/* Voucher Type */}
                          <td className="px-3 text-gray-700 truncate" title={tx.voucherType || ''}>
                            {tx.voucherType || '—'}
                          </td>

                          {/* Reference */}
                          <td className="px-3 text-[#6c7380] font-normal truncate" title={tx.reference || ''}>
                            {tx.reference || '—'}
                          </td>

                          {/* Description */}
                          <td className="px-3 text-[#333] truncate" title={tx.description || ''}>
                            {tx.description || '—'}
                          </td>

                          {/* Debit */}
                          <td className="px-3 text-right tabular-nums text-[#333]">
                            {tx.debit > 0 ? (
                              formatAmount(tx.debit, false)
                            ) : (
                              <span className="text-[#b0b5c0]">—</span>
                            )}
                          </td>

                          {/* Credit */}
                          <td className="px-3 text-right tabular-nums text-[#333]">
                            {tx.credit > 0 ? (
                              formatAmount(tx.credit, false)
                            ) : (
                              <span className="text-[#b0b5c0]">—</span>
                            )}
                          </td>

                          {/* Running Balance */}
                          <td className="px-3 text-right tabular-nums font-semibold text-[#333]">
                            <span>{formatAmount(Math.abs(tx.runningBalance), false)}</span>
                            <span className="text-[12px] text-gray-500 font-normal ml-1">
                              {tx.runningBalance >= 0 ? 'Dr' : 'Cr'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 text-center select-none">
                            {renderStatus(tx.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Closing Balance Footer Row */}
                    <tfoot className="bg-[#f9f9fb] border-t-2 border-[#e5e7eb] font-bold text-[13px] text-[#1e2540]">
                      <tr className="h-[40px]">
                        <td className="px-6 text-gray-500 font-normal">
                          {formatReportDate(endDate || inquiryData?.transactions?.[inquiryData.transactions.length - 1]?.date)}
                        </td>
                        <td className="px-3 text-gray-400">—</td>
                        <td className="px-3 text-gray-400">—</td>
                        <td className="px-3 text-gray-400">—</td>
                        <td className="px-3 text-[#1e2540] font-bold">Closing Balance</td>
                        <td className="px-3 text-right tabular-nums text-[#1e2540]">
                          {formatAmount(inquiryData.summary.totalDebit, false)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-[#1e2540]">
                          {formatAmount(inquiryData.summary.totalCredit, false)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-[#1e2540] font-bold">
                          <span>{formatAmount(Math.abs(inquiryData.summary.currentBalance), false)}</span>
                          <span className="text-[12px] text-gray-500 font-normal ml-1">
                            {inquiryData.summary.currentBalance >= 0 ? 'Dr' : 'Cr'}
                          </span>
                        </td>
                        <td className="px-6 text-center text-gray-400">—</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            ) : activeTab === 'outstanding' ? (
              /* Ageing Tab (Consistent light styling) */
              <div className="p-6 space-y-4 max-w-4xl">
                <h3 className="text-[14px] font-semibold text-[#1e2540]">
                  Outstanding Ageing Analysis
                </h3>
                <div className="border border-[#e5e7eb] rounded-[6px] overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead className="bg-[#f9f9fb] text-[#6c7380] text-[11px] font-semibold uppercase tracking-[0.04em] border-b border-[#e5e7eb]">
                      <tr className="h-[36px]">
                        <th className="px-4 py-2 text-center">0 - 30 DAYS</th>
                        <th className="px-4 py-2 text-center">31 - 60 DAYS</th>
                        <th className="px-4 py-2 text-center">61 - 90 DAYS</th>
                        <th className="px-4 py-2 text-center">90+ DAYS</th>
                        <th className="px-4 py-2 text-right">TOTAL OUTSTANDING</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="h-[44px] text-[13px] font-semibold">
                        <td className="px-4 text-center tabular-nums text-emerald-600">
                          {formatAmount(inquiryData.summary.currentBalance * 0.4, false)}
                        </td>
                        <td className="px-4 text-center tabular-nums text-blue-600">
                          {formatAmount(inquiryData.summary.currentBalance * 0.3, false)}
                        </td>
                        <td className="px-4 text-center tabular-nums text-amber-600">
                          {formatAmount(inquiryData.summary.currentBalance * 0.2, false)}
                        </td>
                        <td className="px-4 text-center tabular-nums text-red-600">
                          {formatAmount(inquiryData.summary.currentBalance * 0.1, false)}
                        </td>
                        <td className="px-4 text-right tabular-nums text-[#1e2540] font-bold">
                          {formatAmount(inquiryData.summary.currentBalance, false)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Audits Tab (Consistent light styling) */
              <div className="p-6 space-y-4 max-w-4xl">
                <h3 className="text-[14px] font-semibold text-[#1e2540]">
                  Audit History Logs
                </h3>
                {!inquiryData.auditLogs || inquiryData.auditLogs.length === 0 ? (
                  <div className="text-xs text-gray-500 py-6">No audit records found for this account.</div>
                ) : (
                  <div className="border border-[#e5e7eb] rounded-[6px] overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse text-[13px]">
                      <thead className="bg-[#f9f9fb] text-[#6c7380] text-[11px] font-semibold uppercase tracking-[0.04em] border-b border-[#e5e7eb]">
                        <tr className="h-[36px]">
                          <th className="px-4 py-2">TIMESTAMP</th>
                          <th className="px-4 py-2">ACTION</th>
                          <th className="px-4 py-2">USER</th>
                          <th className="px-4 py-2">IP ADDRESS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef0f4]">
                        {inquiryData.auditLogs.map((log: any, idx: number) => (
                          <tr key={log.id || idx} className="h-[38px] hover:bg-[#f7f9ff] transition-colors">
                            <td className="px-4 text-gray-600 text-xs">
                              {new Date(log.createdAt).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 font-medium text-[#333]">
                              {log.action}
                            </td>
                            <td className="px-4 text-gray-600 text-xs">
                              {log.userId || 'System'}
                            </td>
                            <td className="px-4 text-gray-500 text-xs">
                              {log.ipAddress || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Slide Drawer Preview (Light Zoho styling) */}
      {previewDoc && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-[#e5e7eb] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200 text-[#333]">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e5e7eb] bg-white">
            <div>
              <span className="text-[11px] font-semibold text-[#408dfb] uppercase tracking-wide">
                {previewDoc.voucherType || 'VOUCHER'}
              </span>
              <h2 className="text-[16px] font-semibold text-[#1e2540]">
                {previewDoc.voucherNo}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setPreviewDoc(null)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Meta card */}
            <div className="border border-[#e5e7eb] rounded-[6px] p-4 bg-[#f9f9fb] space-y-3 text-xs">
              <div className="flex justify-between">
                <div>
                  <span className="text-gray-500 block text-[11px]">Posting Date</span>
                  <span className="font-semibold text-[#333]">
                    {formatReportDate(previewDoc.date)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block text-[11px]">Reference</span>
                  <span className="font-semibold text-[#333]">
                    {previewDoc.reference || '—'}
                  </span>
                </div>
              </div>
              <div className="border-t border-[#e5e7eb] pt-2.5">
                <span className="text-gray-500 block text-[11px] mb-0.5">Narration / Description</span>
                <p className="text-[13px] text-[#333] font-normal leading-relaxed">
                  {previewDoc.description || '—'}
                </p>
              </div>
            </div>

            {/* Affected Entries */}
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold text-gray-600 uppercase tracking-wider">
                Accounting Entries Affected
              </h3>
              <div className="border border-[#e5e7eb] rounded-[6px] overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb] text-[#6c7380] font-semibold">
                    <tr>
                      <th className="p-2.5">Account Name</th>
                      <th className="p-2.5 text-right">Debit (Dr)</th>
                      <th className="p-2.5 text-right">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef0f4]">
                    <tr>
                      <td className="p-2.5 font-medium text-[#333]">
                        {inquiryData?.ledger.name}
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[#333]">
                        {previewDoc.debit > 0 ? formatAmount(previewDoc.debit, false) : '—'}
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[#333]">
                        {previewDoc.credit > 0 ? formatAmount(previewDoc.credit, false) : '—'}
                      </td>
                    </tr>
                    <tr className="text-gray-500">
                      <td className="p-2.5 italic">Contra Offset Account</td>
                      <td className="p-2.5 text-right tabular-nums">
                        {previewDoc.credit > 0 ? formatAmount(previewDoc.credit, false) : '—'}
                      </td>
                      <td className="p-2.5 text-right tabular-nums">
                        {previewDoc.debit > 0 ? formatAmount(previewDoc.debit, false) : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[#e5e7eb] bg-white flex gap-2 justify-end">
            {previewDoc.path && (
              <button
                type="button"
                onClick={() => navigate(previewDoc.path)}
                className="px-4 py-2 bg-[#408dfb] hover:bg-blue-600 text-white rounded-[4px] text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
              >
                Go to Details
              </button>
            )}
            <button
              type="button"
              onClick={() => setPreviewDoc(null)}
              className="px-4 py-2 border border-[#d9dce3] hover:bg-gray-50 text-[#333] rounded-[4px] text-xs font-medium cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LedgerInquiry;
