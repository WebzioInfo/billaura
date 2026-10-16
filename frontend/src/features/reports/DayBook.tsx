import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';
import {
  Printer,
  Download,
  ChevronDown,
  ArrowUpDown,
  Search,
  X,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface DayBookVoucherLine {
  id: string;
  accountId: string;
  accountName: string;
  departmentName?: string | null;
  description?: string;
  narration?: string;
  debit: number;
  credit: number;
}

interface DayBookVoucher {
  id: string;
  date: string;
  voucherNo: string;
  rawReference?: string;
  voucherType: string;
  status: 'POSTED' | 'REVERSED' | 'CANCELLED';
  narration: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lines: DayBookVoucherLine[];
}

type DatePreset =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_FY'
  | 'CUSTOM';

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  THIS_WEEK: 'This Week',
  THIS_MONTH: 'This Month',
  LAST_MONTH: 'Last Month',
  THIS_QUARTER: 'This Quarter',
  THIS_FY: 'This Financial Year',
  CUSTOM: 'Custom Date',
};

const VOUCHER_TYPES = [
  'ALL',
  'Sales Invoice',
  'Receipt',
  'Payment',
  'Bill',
  'Expense',
  'Credit Note',
  'Vendor Credit',
  'Contra',
  'Journal',
] as const;

const formatCurrency = (val: number | string | undefined | null): string => {
  const num = Number(val || 0);
  if (Math.abs(num) < 0.005) return '—';
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const getDateRangeForPreset = (preset: DatePreset) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'TODAY': {
      const d = new Date(year, month, now.getDate());
      const s = d.toISOString().slice(0, 10);
      return { startDate: s, endDate: s };
    }
    case 'YESTERDAY': {
      const d = new Date(year, month, now.getDate() - 1);
      const s = d.toISOString().slice(0, 10);
      return { startDate: s, endDate: s };
    }
    case 'THIS_WEEK': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(year, month, diff);
      const end = new Date(year, month, diff + 6);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      };
    }
    case 'THIS_MONTH': {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      };
    }
    case 'LAST_MONTH': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      };
    }
    case 'THIS_QUARTER': {
      const qMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, qMonth, 1);
      const end = new Date(year, qMonth + 3, 0);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      };
    }
    case 'THIS_FY': {
      const fyStartYear = month >= 3 ? year : year - 1;
      const start = new Date(fyStartYear, 3, 1);
      const end = new Date(fyStartYear + 1, 2, 31);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      };
    }
    default:
      return { startDate: '', endDate: '' };
  }
};

const getVoucherTypeDot = (type: string) => {
  switch (type) {
    case 'Sales Invoice':
      return { dot: 'bg-blue-500', text: 'text-blue-600' };
    case 'Receipt':
      return { dot: 'bg-green-500', text: 'text-green-600' };
    case 'Payment':
      return { dot: 'bg-orange-500', text: 'text-orange-600' };
    case 'Bill':
      return { dot: 'bg-purple-500', text: 'text-purple-600' };
    case 'Expense':
      return { dot: 'bg-amber-500', text: 'text-amber-600' };
    case 'Credit Note':
      return { dot: 'bg-rose-500', text: 'text-rose-600' };
    case 'Vendor Credit':
      return { dot: 'bg-red-500', text: 'text-red-600' };
    case 'Contra':
      return { dot: 'bg-teal-500', text: 'text-teal-600' };
    default:
      return { dot: 'bg-slate-400', text: 'text-slate-600' };
  }
};

export const DayBook: React.FC = () => {
  const navigate = useNavigate();

  // Filters State
  const [datePreset, setDatePreset] = useState<DatePreset>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedVoucherType, setSelectedVoucherType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'POSTED' | 'REVERSED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Detail Drawer State
  const [selectedVoucher, setSelectedVoucher] = useState<DayBookVoucher | null>(null);

  // Compute effective start and end dates
  const effectiveDates = useMemo(() => {
    if (datePreset === 'CUSTOM') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return getDateRangeForPreset(datePreset);
  }, [datePreset, customStartDate, customEndDate]);

  // Data Fetching
  const { data: rawData = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['reports', 'day-book', effectiveDates.startDate, effectiveDates.endDate],
    queryFn: async () => {
      const params: any = {};
      if (effectiveDates.startDate) params.startDate = effectiveDates.startDate;
      if (effectiveDates.endDate) params.endDate = effectiveDates.endDate;
      const res = await apiClient.get('/reports/day-book', { params });
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  // Group raw journal lines by voucher
  const groupedVouchers = useMemo(() => {
    const map = new Map<string, DayBookVoucher>();

    rawData.forEach((rawItem: any) => {
      const ref = (rawItem.rawReference || rawItem.voucherNo || '').trim();
      const refUpper = ref.toUpperCase();
      const desc = (rawItem.narration || rawItem.description || rawItem.entryDescription || '').trim();
      const descUpper = desc.toUpperCase();

      // Normalize voucherType
      let voucherType = rawItem.voucherType || 'Journal';
      if (
        voucherType === 'SALES' ||
        refUpper.startsWith('INV-') ||
        refUpper.startsWith('INV/') ||
        refUpper.startsWith('B2B') ||
        refUpper.startsWith('B2C') ||
        descUpper.includes('TAX_INVOICE') ||
        descUpper.includes('INVOICE')
      ) {
        voucherType = 'Sales Invoice';
      } else if (
        voucherType === 'RECEIPT' ||
        refUpper.startsWith('REC-') ||
        refUpper.startsWith('REC/') ||
        refUpper.startsWith('FEE') ||
        refUpper.startsWith('INC-') ||
        descUpper.includes('RECEIPT') ||
        descUpper.includes('INCOME')
      ) {
        voucherType = 'Receipt';
      } else if (
        refUpper.startsWith('BIL-') ||
        refUpper.startsWith('PUR-') ||
        refUpper.startsWith('BILL-') ||
        refUpper.startsWith('PB-') ||
        descUpper.includes('PURCHASE') ||
        descUpper.includes('BILL')
      ) {
        voucherType = 'Bill';
      } else if (
        refUpper.startsWith('PAY-') ||
        refUpper.startsWith('PM-') ||
        descUpper.includes('PAYMENT MADE') ||
        descUpper.includes('VENDOR PAYMENT') ||
        descUpper.includes('PAYOUT')
      ) {
        voucherType = 'Payment';
      } else if (refUpper.startsWith('EXP-') || descUpper.includes('EXPENSE')) {
        voucherType = 'Expense';
      } else if (
        refUpper.startsWith('CN-') ||
        refUpper.startsWith('CRN-') ||
        refUpper.startsWith('RET-') ||
        refUpper.startsWith('SR-') ||
        descUpper.includes('CREDIT NOTE') ||
        descUpper.includes('SALES RETURN')
      ) {
        voucherType = 'Credit Note';
      } else if (
        refUpper.startsWith('DN-') ||
        refUpper.startsWith('DRN-') ||
        refUpper.startsWith('VC-') ||
        descUpper.includes('VENDOR CREDIT') ||
        descUpper.includes('DEBIT NOTE')
      ) {
        voucherType = 'Vendor Credit';
      } else if (
        refUpper.startsWith('TRF-') ||
        refUpper.startsWith('CONTRA') ||
        descUpper.includes('TRANSFER') ||
        descUpper.includes('CONTRA')
      ) {
        voucherType = 'Contra';
      } else if (
        refUpper.startsWith('JV-') ||
        descUpper.includes('JOURNAL') ||
        refUpper.startsWith('AUDIT') ||
        refUpper.startsWith('VOB')
      ) {
        voucherType = 'Journal';
      }

      // Status
      let status: 'POSTED' | 'REVERSED' | 'CANCELLED' = 'POSTED';
      if (refUpper.startsWith('REV-') || descUpper.includes('REVERSAL') || descUpper.includes('CANCELLATION')) {
        status = 'REVERSED';
      }

      // Real document number
      let voucherNo = rawItem.voucherNo || ref || ('JV-' + String(rawItem.journalEntryId || '').substring(0, 7).toUpperCase());
      if (refUpper.startsWith('DAYBOOK-') || !rawItem.voucherNo) {
        const docMatch = desc.match(/\b(INV|REC|PAY|BIL|PUR|EXP|CN|DN|JV|B2B)[A-Za-z0-9\-\/]+\b/i);
        if (docMatch) {
          voucherNo = docMatch[0];
        }
      }

      const vKey = rawItem.journalEntryId || `${rawItem.date}_${voucherNo}`;

      if (!map.has(vKey)) {
        map.set(vKey, {
          id: rawItem.journalEntryId || vKey,
          date: rawItem.date,
          voucherNo,
          rawReference: ref,
          voucherType,
          status,
          narration: desc,
          totalDebit: 0,
          totalCredit: 0,
          isBalanced: true,
          lines: [],
        });
      }

      const v = map.get(vKey)!;
      const debit = Number(rawItem.debit || 0);
      const credit = Number(rawItem.credit || 0);

      v.lines.push({
        id: rawItem.id || `${vKey}_${v.lines.length}`,
        accountId: rawItem.accountId,
        accountName: rawItem.accountName || 'Unknown Account',
        departmentName: rawItem.departmentName || null,
        description: rawItem.description,
        narration: desc,
        debit,
        credit,
      });

      v.totalDebit += debit;
      v.totalCredit += credit;
    });

    const vouchers = Array.from(map.values()).map(v => ({
      ...v,
      totalDebit: Number(v.totalDebit.toFixed(2)),
      totalCredit: Number(v.totalCredit.toFixed(2)),
      isBalanced: Math.abs(v.totalDebit - v.totalCredit) < 0.01,
    }));

    // Sorting: date ascending by default, then voucherNo
    vouchers.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return a.voucherNo.localeCompare(b.voucherNo);
    });

    return vouchers;
  }, [rawData, sortDirection]);

  // Client-side filtering
  const filteredVouchers = useMemo(() => {
    return groupedVouchers.filter(v => {
      // Voucher type filter
      if (selectedVoucherType !== 'ALL' && v.voucherType !== selectedVoucherType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'POSTED' && v.status !== 'POSTED') return false;
        if (selectedStatus === 'REVERSED' && v.status !== 'REVERSED' && v.status !== 'CANCELLED') return false;
      }

      // Search term (voucherNo, narration, accountName)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNo = v.voucherNo.toLowerCase().includes(q);
        const matchNarration = (v.narration || '').toLowerCase().includes(q);
        const matchAccount = v.lines.some(l => (l.accountName || '').toLowerCase().includes(q));
        if (!matchNo && !matchNarration && !matchAccount) return false;
      }

      return true;
    });
  }, [groupedVouchers, selectedVoucherType, selectedStatus, searchTerm]);

  // Overall totals for filtered set
  const { overallDebit, overallCredit, overallDifference } = useMemo(() => {
    let d = 0;
    let c = 0;
    filteredVouchers.forEach(v => {
      d += v.totalDebit;
      c += v.totalCredit;
    });
    d = Number(d.toFixed(2));
    c = Number(c.toFixed(2));
    return {
      overallDebit: d,
      overallCredit: c,
      overallDifference: Math.abs(d - c) >= 0.01 ? Number(Math.abs(d - c).toFixed(2)) : 0,
    };
  }, [filteredVouchers]);

  // Pagination calculations
  const totalVouchers = filteredVouchers.length;
  const totalPages = Math.max(1, Math.ceil(totalVouchers / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [datePreset, customStartDate, customEndDate, selectedVoucherType, selectedStatus, searchTerm, pageSize]);

  const paginatedVouchers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVouchers.slice(start, start + pageSize);
  }, [filteredVouchers, currentPage, pageSize]);

  const isFilterActive = useMemo(() => {
    return (
      datePreset !== 'THIS_MONTH' ||
      selectedVoucherType !== 'ALL' ||
      selectedStatus !== 'ALL' ||
      searchTerm.trim() !== ''
    );
  }, [datePreset, selectedVoucherType, selectedStatus, searchTerm]);

  const handleClearFilters = () => {
    setDatePreset('THIS_MONTH');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedVoucherType('ALL');
    setSelectedStatus('ALL');
    setSearchTerm('');
  };

  const handleVoucherClick = (voucher: DayBookVoucher) => {
    const type = voucher.voucherType.toLowerCase();
    const vNo = voucher.voucherNo;

    if (type.includes('invoice') || type.includes('sales')) {
      navigate(`/invoices?search=${encodeURIComponent(vNo)}`);
    } else if (type.includes('receipt')) {
      navigate(`/receipts?search=${encodeURIComponent(vNo)}`);
    } else if (type.includes('bill') || type.includes('purchase')) {
      navigate(`/bills?search=${encodeURIComponent(vNo)}`);
    } else if (type.includes('payment')) {
      navigate(`/payments-made?search=${encodeURIComponent(vNo)}`);
    } else if (type.includes('expense')) {
      navigate(`/expenses?search=${encodeURIComponent(vNo)}`);
    } else if (type.includes('credit note')) {
      navigate(`/credit-notes?search=${encodeURIComponent(vNo)}`);
    } else if (type.includes('vendor credit') || type.includes('debit note')) {
      navigate(`/vendor-credits?search=${encodeURIComponent(vNo)}`);
    } else if (type.includes('journal')) {
      if (voucher.id && voucher.id.startsWith('cm')) {
        navigate(`/journal-entries/${voucher.id}`);
      } else {
        navigate(`/journal-entries?search=${encodeURIComponent(vNo)}`);
      }
    } else if (type.includes('contra')) {
      navigate(`/banking`);
    } else {
      setSelectedVoucher(voucher);
    }
  };

  const handleExportCSV = () => {
    const rows: string[][] = [
      ['Date', 'Voucher No', 'Voucher Type', 'Status', 'Account', 'Narration', 'Debit', 'Credit']
    ];

    filteredVouchers.forEach(v => {
      v.lines.forEach((l, idx) => {
        rows.push([
          idx === 0 ? formatDate(v.date) : '',
          idx === 0 ? v.voucherNo : '',
          idx === 0 ? v.voucherType : '',
          idx === 0 ? v.status : '',
          l.accountName,
          idx === 0 ? v.narration : (l.description || ''),
          l.debit > 0 ? l.debit.toFixed(2) : '',
          l.credit > 0 ? l.credit.toFixed(2) : '',
        ]);
      });
    });

    const csvContent = rows
      .map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DayBook_${effectiveDates.startDate || 'all'}_to_${effectiveDates.endDate || 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white text-[#333333] font-sans antialiased overflow-hidden select-text">
      {/* 1. Fixed Top Header */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-[#e5e7eb] bg-white">
        <div className="flex items-center gap-3">
          <h1 className="text-[20px] font-semibold text-[#333333] tracking-tight">
            Day Book
          </h1>
          <span className="text-[13px] text-[#6c7380] font-normal">
            {loading ? 'Loading...' : `${totalVouchers} vouchers`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium text-[#333333] bg-white border border-[#d9dce3] rounded hover:bg-[#f9f9fb] transition-colors"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#6c7380]" />
            <span>Export</span>
          </button>

          {/* Print button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center w-8 h-8 text-[#333333] bg-white border border-[#d9dce3] rounded hover:bg-[#f9f9fb] transition-colors"
            title="Print Day Book"
          >
            <Printer className="w-4 h-4 text-[#6c7380]" />
          </button>
        </div>
      </header>

      {/* 2. Filter Bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-[#f9f9fb] border-b border-[#e5e7eb]">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Preset Dropdown */}
          <div className="relative">
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="h-8 pl-3 pr-8 text-[13px] font-medium text-[#333333] bg-white border border-[#d9dce3] rounded cursor-pointer appearance-none hover:border-[#b0b5c0] focus:outline-none focus:border-[#408dfb]"
            >
              {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map((key) => (
                <option key={key} value={key}>
                  {DATE_PRESET_LABELS[key]}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#6c7380] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Custom Date Inputs */}
          {datePreset === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 animate-fadeIn">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 px-2.5 text-[12px] text-[#333333] bg-white border border-[#d9dce3] rounded focus:outline-none focus:border-[#408dfb]"
                placeholder="From"
              />
              <span className="text-[12px] text-[#6c7380]">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 px-2.5 text-[12px] text-[#333333] bg-white border border-[#d9dce3] rounded focus:outline-none focus:border-[#408dfb]"
                placeholder="To"
              />
            </div>
          )}

          {/* Voucher Type Filter */}
          <div className="relative">
            <select
              value={selectedVoucherType}
              onChange={(e) => setSelectedVoucherType(e.target.value)}
              className="h-8 pl-3 pr-8 text-[13px] text-[#333333] bg-white border border-[#d9dce3] rounded cursor-pointer appearance-none hover:border-[#b0b5c0] focus:outline-none focus:border-[#408dfb]"
            >
              {VOUCHER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === 'ALL' ? 'All Voucher Types' : type}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#6c7380] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="h-8 pl-3 pr-8 text-[13px] text-[#333333] bg-white border border-[#d9dce3] rounded cursor-pointer appearance-none hover:border-[#b0b5c0] focus:outline-none focus:border-[#408dfb]"
            >
              <option value="ALL">All Status</option>
              <option value="POSTED">Posted</option>
              <option value="REVERSED">Reversed / Cancelled</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#6c7380] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Clear Filters Link */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[12px] text-[#408dfb] hover:underline cursor-pointer pl-1"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-[#6c7380] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search voucher no, account or narration"
            className="w-full h-8 pl-8 pr-7 text-[12px] text-[#333333] bg-white border border-[#d9dce3] rounded placeholder:text-[#999999] focus:outline-none focus:border-[#408dfb]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#333333]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Table Body Container */}
      <div className="flex-1 min-h-0 overflow-auto bg-white">
        <table className="w-full border-collapse text-[13px] text-left">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-[#f9f9fb] border-b border-[#e5e7eb]">
            <tr className="h-10 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
              <th
                onClick={() => setSortDirection(s => (s === 'asc' ? 'desc' : 'asc'))}
                className="pl-6 pr-3 py-2 w-[110px] cursor-pointer select-none hover:text-[#333333]"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Date</span>
                  <ArrowUpDown className="w-3 h-3 text-[#999999]" />
                </div>
              </th>
              <th className="px-3 py-2 w-[160px]">Voucher No</th>
              <th className="px-3 py-2 w-[140px]">Voucher Type</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Narration</th>
              <th className="px-3 py-2 w-[130px] text-right">Debit</th>
              <th className="pr-6 pl-3 py-2 w-[130px] text-right">Credit</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              // Skeleton loading state
              Array.from({ length: 12 }).map((_, idx) => (
                <tr key={idx} className="h-[38px] border-b border-[#f1f3f7] animate-pulse">
                  <td className="pl-6 pr-3"><div className="h-3 w-16 bg-[#eef0f4] rounded" /></td>
                  <td className="px-3"><div className="h-3 w-24 bg-[#eef0f4] rounded" /></td>
                  <td className="px-3"><div className="h-3 w-20 bg-[#eef0f4] rounded" /></td>
                  <td className="px-3"><div className="h-3 w-36 bg-[#eef0f4] rounded" /></td>
                  <td className="px-3"><div className="h-3 w-44 bg-[#eef0f4] rounded" /></td>
                  <td className="px-3 text-right"><div className="h-3 w-16 bg-[#eef0f4] rounded ml-auto" /></td>
                  <td className="pr-6 pl-3 text-right"><div className="h-3 w-16 bg-[#eef0f4] rounded ml-auto" /></td>
                </tr>
              ))
            ) : paginatedVouchers.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center text-[#6c7380] space-y-2">
                    <FileText className="w-8 h-8 text-[#b0b5c0] stroke-[1.5]" />
                    <p className="text-[14px]">No vouchers found for the selected period.</p>
                    {isFilterActive && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-[13px] text-[#408dfb] hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Vouchers grouped rows
              paginatedVouchers.map((voucher) => {
                const typeStyle = getVoucherTypeDot(voucher.voucherType);

                return (
                  <React.Fragment key={voucher.id}>
                    {voucher.lines.map((line, lineIndex) => {
                      const isFirst = lineIndex === 0;
                      const isLast = lineIndex === voucher.lines.length - 1;

                      return (
                        <tr
                          key={line.id}
                          className={`h-[38px] transition-colors group hover:bg-[#f7f9ff] ${
                            isLast ? 'border-b border-[#e5e7eb]' : 'border-b border-[#f1f3f7]'
                          }`}
                        >
                          {/* Date (first line only) */}
                          <td className="pl-6 pr-3 py-1.5 text-[#333333] whitespace-nowrap align-middle">
                            {isFirst ? formatDate(voucher.date) : ''}
                          </td>

                          {/* Voucher No (first line only) */}
                          <td className="px-3 py-1.5 whitespace-nowrap align-middle">
                            {isFirst && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleVoucherClick(voucher)}
                                  className="text-[#408dfb] font-medium hover:underline text-left cursor-pointer truncate max-w-[140px]"
                                  title={`Open source document for ${voucher.voucherNo}`}
                                >
                                  {voucher.voucherNo}
                                </button>

                                {/* Unbalanced Warning */}
                                {!voucher.isBalanced && (
                                  <span
                                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#dc2626] bg-[#fee2e2] px-1.5 py-0.5 rounded cursor-help"
                                    title={`Unbalanced: Debit ₹${voucher.totalDebit} != Credit ₹${voucher.totalCredit}`}
                                  >
                                    <AlertCircle className="w-3 h-3" />
                                    Unbalanced
                                  </span>
                                )}

                                {/* Reversed Badge */}
                                {voucher.status === 'REVERSED' && (
                                  <span className="text-[10px] uppercase font-semibold text-[#6c7380] bg-[#f1f3f7] px-1 py-0.5 rounded">
                                    Reversed
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Voucher Type (first line only) */}
                          <td className="px-3 py-1.5 whitespace-nowrap align-middle">
                            {isFirst && (
                              <div className="inline-flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dot}`} />
                                <span className={`text-[12px] ${typeStyle.text}`}>
                                  {voucher.voucherType}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Account (account name, indented on subsequent lines) */}
                          <td className={`px-3 py-1.5 text-[#333333] ${isFirst ? 'font-medium' : 'pl-7 text-[#555555]'}`}>
                            <span className="truncate max-w-[260px] inline-block align-middle" title={line.accountName}>
                              {line.accountName}
                            </span>
                          </td>

                          {/* Narration (first line shows voucher narration, subsequent can show line description if different) */}
                          <td className="px-3 py-1.5 text-[#6c7380] text-[12px] truncate max-w-[280px]" title={isFirst ? voucher.narration : (line.description || voucher.narration)}>
                            {isFirst
                              ? voucher.narration || '—'
                              : line.description && line.description !== voucher.narration
                              ? line.description
                              : ''}
                          </td>

                          {/* Debit */}
                          <td className="px-3 py-1.5 text-right font-normal tabular-nums text-[#333333] whitespace-nowrap">
                            {formatCurrency(line.debit)}
                          </td>

                          {/* Credit */}
                          <td className="pr-6 pl-3 py-1.5 text-right font-normal tabular-nums text-[#333333] whitespace-nowrap">
                            {formatCurrency(line.credit)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Fixed Bottom Bar: Totals and Pagination */}
      <footer className="shrink-0 flex flex-wrap items-center justify-between gap-4 px-6 py-2.5 bg-white border-t border-[#e5e7eb] text-[12px] text-[#6c7380]">
        {/* Left: Summary Count */}
        <div className="flex items-center gap-1 text-[#333333]">
          {totalVouchers > 0 ? (
            <span>
              Showing{' '}
              <strong className="font-semibold text-[#333333]">
                {Math.min((currentPage - 1) * pageSize + 1, totalVouchers)}
              </strong>
              -
              <strong className="font-semibold text-[#333333]">
                {Math.min(currentPage * pageSize, totalVouchers)}
              </strong>{' '}
              of <strong className="font-semibold text-[#333333]">{totalVouchers}</strong> vouchers
            </span>
          ) : (
            <span>0 vouchers</span>
          )}
        </div>

        {/* Center: Total Debit & Total Credit */}
        <div className="flex items-center gap-4 text-[13px] bg-[#f9f9fb] px-4 py-1.5 rounded border border-[#e5e7eb]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#6c7380]">Total Debit:</span>
            <span className="font-semibold text-[#333333] tabular-nums">
              ₹{overallDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[#d9dce3]">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#6c7380]">Total Credit:</span>
            <span className="font-semibold text-[#333333] tabular-nums">
              ₹{overallCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {overallDifference > 0 && (
            <>
              <span className="text-[#d9dce3]">|</span>
              <div className="flex items-center gap-1 text-[#dc2626] font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Diff: ₹{overallDifference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Page Size & Pagination Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-7 px-2 text-[12px] bg-white border border-[#d9dce3] rounded text-[#333333] focus:outline-none focus:border-[#408dfb]"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Page nav */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="w-7 h-7 flex items-center justify-center rounded border border-[#d9dce3] bg-white text-[#333333] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f9f9fb]"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2.5 py-0.5 text-[12px] font-semibold text-[#408dfb] bg-[#eef4ff] rounded border border-[#bfdbfe]">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="w-7 h-7 flex items-center justify-center rounded border border-[#d9dce3] bg-white text-[#333333] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f9f9fb]"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>

      {/* 5. Slide-In Detail Drawer */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-xs transition-opacity animate-fadeIn">
          <div className="w-[520px] h-full bg-white shadow-2xl flex flex-col border-l border-[#e5e7eb] animate-slideInRight">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] bg-[#f9f9fb]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-semibold text-[#333333]">
                    {selectedVoucher.voucherNo}
                  </h3>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#eef4ff] text-[#408dfb]">
                    {selectedVoucher.voucherType}
                  </span>
                  {selectedVoucher.status === 'REVERSED' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#fee2e2] text-[#dc2626]">
                      Reversed
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#6c7380] mt-0.5">
                  Posted on {formatDate(selectedVoucher.date)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#eef0f4] text-[#6c7380] hover:text-[#333333]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Narration */}
              {selectedVoucher.narration && (
                <div>
                  <h4 className="text-[11px] uppercase font-semibold text-[#6c7380] tracking-wider mb-1">
                    Narration / Description
                  </h4>
                  <p className="text-[13px] text-[#333333] bg-[#f9f9fb] p-3 rounded border border-[#eef0f4]">
                    {selectedVoucher.narration}
                  </p>
                </div>
              )}

              {/* Journal Lines Table */}
              <div>
                <h4 className="text-[11px] uppercase font-semibold text-[#6c7380] tracking-wider mb-2">
                  Ledger Postings ({selectedVoucher.lines.length} lines)
                </h4>
                <div className="border border-[#e5e7eb] rounded overflow-hidden">
                  <table className="w-full text-[12px] text-left">
                    <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb] text-[#6c7380] font-semibold">
                      <tr>
                        <th className="px-3 py-2">Account</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f3f7]">
                      {selectedVoucher.lines.map((l) => (
                        <tr key={l.id} className="hover:bg-[#f7f9ff]">
                          <td className="px-3 py-2 text-[#333333] font-medium">
                            {l.accountName}
                            {l.description && l.description !== selectedVoucher.narration && (
                              <div className="text-[11px] text-[#6c7380] font-normal">{l.description}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[#333333]">
                            {formatCurrency(l.debit)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[#333333]">
                            {formatCurrency(l.credit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#f9f9fb] border-t border-[#e5e7eb] font-semibold text-[#333333]">
                      <tr>
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(selectedVoucher.totalDebit)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(selectedVoucher.totalCredit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#e5e7eb] bg-[#f9f9fb] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="h-8 px-4 text-[13px] font-medium text-[#6c7380] hover:text-[#333333]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedVoucher(null);
                  handleVoucherClick(selectedVoucher);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-4 text-[13px] font-medium text-white bg-[#408dfb] rounded hover:bg-[#3478d8]"
              >
                <span>Go to Source Document</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
