import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Menu,
  Sliders,
  Star,
  Share2,
  Download,
  Printer,
  RotateCw,
  X,
  ChevronDown,
  ChevronRight,
  Folder,
  ArrowLeft,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Percent,
  Check,
} from 'lucide-react';
import notification from '@/core/services/NotificationService';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import {
  getReportByKey,
  REPORT_CATALOG,
  REPORT_CATEGORIES,
  ReportDefinition,
} from './reportRegistry';

// Indian currency formatter helper (no currency symbol inside report table as per Zoho reference 2 & 3)
const formatNumber = (val: number | string | undefined | null, decimals = 2): string => {
  const num = Number(val || 0);
  if (Math.abs(num) < 0.0001) return '0.00';
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return isNegative ? `-${formatted}` : formatted;
};

const formatDateDisplay = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

type DatePreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | 'this_fiscal_year'
  | 'yesterday'
  | 'prev_week'
  | 'prev_month'
  | 'prev_quarter'
  | 'prev_fiscal_year'
  | 'custom';

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
  this_quarter: 'This Quarter',
  this_fiscal_year: 'This Fiscal Year',
  yesterday: 'Yesterday',
  prev_week: 'Previous Week',
  prev_month: 'Previous Month',
  prev_quarter: 'Previous Quarter',
  prev_fiscal_year: 'Previous Fiscal Year',
  custom: 'Custom Date',
};

const getDatePresetRange = (preset: DatePreset) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'today': {
      const d = new Date(year, month, now.getDate()).toISOString().slice(0, 10);
      return { start: d, end: d };
    }
    case 'yesterday': {
      const d = new Date(year, month, now.getDate() - 1).toISOString().slice(0, 10);
      return { start: d, end: d };
    }
    case 'this_week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(year, month, diff).toISOString().slice(0, 10);
      const end = new Date(year, month, diff + 6).toISOString().slice(0, 10);
      return { start, end };
    }
    case 'this_month': {
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      return { start, end };
    }
    case 'prev_month': {
      const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, month, 0).toISOString().slice(0, 10);
      return { start, end };
    }
    case 'this_quarter': {
      const qMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, qMonth, 1).toISOString().slice(0, 10);
      const end = new Date(year, qMonth + 3, 0).toISOString().slice(0, 10);
      return { start, end };
    }
    case 'prev_quarter': {
      const qMonth = Math.floor(month / 3) * 3 - 3;
      const start = new Date(year, qMonth, 1).toISOString().slice(0, 10);
      const end = new Date(year, qMonth + 3, 0).toISOString().slice(0, 10);
      return { start, end };
    }
    case 'this_fiscal_year': {
      const fyStartYear = month >= 3 ? year : year - 1;
      const start = new Date(fyStartYear, 3, 1).toISOString().slice(0, 10);
      const end = new Date(fyStartYear + 1, 2, 31).toISOString().slice(0, 10);
      return { start, end };
    }
    case 'prev_fiscal_year': {
      const fyStartYear = (month >= 3 ? year : year - 1) - 1;
      const start = new Date(fyStartYear, 3, 1).toISOString().slice(0, 10);
      const end = new Date(fyStartYear + 1, 2, 31).toISOString().slice(0, 10);
      return { start, end };
    }
    default:
      return { start: '', end: '' };
  }
};

export const ReportViewer: React.FC = () => {
  const { reportKey } = useParams<{ reportKey: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useSessionStore((state) => state.user);

  const getLedgerLink = (accId: string | undefined | null) => {
    if (!accId) return '#';
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return `/accounting/ledger/${accId}?returnTo=${returnTo}`;
  };

  const reportDef: ReportDefinition | undefined = useMemo(() => {
    return reportKey ? getReportByKey(reportKey) : undefined;
  }, [reportKey]);

  // Drawer state for Quick Report Switch
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter UI state (read initial values from URL query string)
  const [datePreset, setDatePreset] = useState<DatePreset>(() => {
    return (searchParams.get('preset') as DatePreset) || (reportDef?.dateMode === 'asOf' ? 'today' : 'this_month');
  });

  const [startDate, setStartDate] = useState<string>(() => {
    const fromParam = searchParams.get('from');
    if (fromParam) return fromParam;
    return getDatePresetRange('this_month').start;
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const toParam = searchParams.get('to');
    if (toParam) return toParam;
    return getDatePresetRange('this_month').end;
  });

  const [asOfDate, setAsOfDate] = useState<string>(() => {
    return searchParams.get('asOf') || new Date().toISOString().slice(0, 10);
  });

  const [reportingBasis, setReportingBasis] = useState<'Accrual' | 'Cash'>(() => {
    const basisParam = searchParams.get('basis');
    return basisParam?.toLowerCase() === 'cash' ? 'Cash' : 'Accrual';
  });

  const [compareWith, setCompareWith] = useState<string>(() => {
    return searchParams.get('compare') || 'none';
  });

  // Track whether filters have changed compared to last run
  const [hasUnsavedFilterChanges, setHasUnsavedFilterChanges] = useState(false);

  // Report preferences
  const [showZeroBalance, setShowZeroBalance] = useState(true);
  const [showCustomizePopover, setShowCustomizePopover] = useState(false);
  const [showMoreFiltersPopover, setShowMoreFiltersPopover] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Favorite toggle
  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('billaura_reports_favorites');
      const set = stored ? new Set(JSON.parse(stored)) : new Set();
      return reportKey ? set.has(reportKey) : false;
    } catch {
      return false;
    }
  });

  // Collapsible hierarchy groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Sync date preset changes
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setHasUnsavedFilterChanges(true);
    if (preset !== 'custom') {
      const { start, end } = getDatePresetRange(preset);
      setStartDate(start);
      setEndDate(end);
      setAsOfDate(end || start);
    }
  };

  // Run Report handler
  const handleRunReport = () => {
    const newParams = new URLSearchParams();
    newParams.set('preset', datePreset);
    if (reportDef?.dateMode === 'asOf') {
      newParams.set('asOf', asOfDate);
    } else {
      newParams.set('from', startDate);
      newParams.set('to', endDate);
    }
    if (reportDef?.supportsBasis) {
      newParams.set('basis', reportingBasis.toLowerCase());
    }
    if (compareWith !== 'none') {
      newParams.set('compare', compareWith);
    }

    setSearchParams(newParams, { replace: true });
    setHasUnsavedFilterChanges(false);
    refetch();
  };

  // Data fetching
  const { data: reportData, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'report_viewer',
      reportKey,
      reportDef?.dateMode === 'asOf' ? asOfDate : `${startDate}_${endDate}`,
      reportingBasis,
      compareWith,
    ],
    queryFn: async () => {
      if (!reportDef) return null;
      return reportDef.fetchData({
        startDate,
        endDate,
        asOfDate,
        basis: reportingBasis,
        compareWith,
      });
    },
    enabled: Boolean(reportDef),
  });

  // Toggle Favorite
  const handleToggleFavorite = () => {
    if (!reportKey) return;
    try {
      const stored = localStorage.getItem('billaura_reports_favorites');
      const set: Set<string> = stored ? new Set(JSON.parse(stored)) : new Set();
      if (set.has(reportKey)) {
        set.delete(reportKey);
        setIsFavorite(false);
        notification.info('Removed from favorite reports');
      } else {
        set.add(reportKey);
        setIsFavorite(true);
        notification.success('Added to favorite reports');
      }
      localStorage.setItem('billaura_reports_favorites', JSON.stringify(Array.from(set)));
    } catch (e) {
      console.error(e);
    }
  };

  // Share URL handler
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    notification.success('Report URL copied to clipboard');
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Export CSV handler
  const handleExportCSV = () => {
    if (!reportData) return;
    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportKey || 'report'}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notification.success('Export initiated');
  };

  if (!reportDef) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white">
        <AlertCircle className="w-12 h-12 text-[#999999] mb-3" />
        <h2 className="text-lg font-semibold text-[#333333]">Report Not Found</h2>
        <p className="text-sm text-[#6c7380] mt-1 mb-4">
          The requested report identifier does not exist in the catalog.
        </p>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 px-4 h-8 text-[13px] font-medium text-white bg-[#408dfb] rounded hover:bg-[#3478d8]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Reports Center</span>
        </Link>
      </div>
    );
  }

  const organizationName = user?.companyName || 'BIOFIX TECHNOLOGY LLP';
  const headerDateText =
    reportDef.dateMode === 'asOf'
      ? `As of ${formatDateDisplay(asOfDate)}`
      : `From ${formatDateDisplay(startDate)} To ${formatDateDisplay(endDate)}`;

  return (
    <div className="flex flex-col h-screen w-full bg-white text-[#333333] font-sans antialiased overflow-hidden select-text">
      {/* 3a. Header Bar (~56px high) */}
      <header className="shrink-0 flex items-center justify-between px-6 h-14 border-b border-[#e5e7eb] bg-white sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {/* Quick Switch Drawer Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#d9dce3] bg-white text-[#6c7380] hover:text-[#333333] hover:bg-[#f9f9fb] transition-colors"
            title="Switch Report"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div>
            <div className="text-[12px] text-[#6c7380] font-normal leading-tight">
              {reportDef.category}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-[16px] font-semibold text-[#333333] leading-none">
                {reportDef.title}
              </h1>
              <span className="text-[#999999] text-[12px]">•</span>
              <span className="text-[12px] text-[#6c7380]">{headerDateText}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2">
          {/* Customize Icon Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCustomizePopover((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded border border-[#d9dce3] bg-white text-[#6c7380] hover:text-[#333333] hover:bg-[#f9f9fb]"
              title="Customize Report View"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {showCustomizePopover && (
              <div className="absolute right-0 top-10 w-60 bg-white border border-[#e5e7eb] rounded shadow-lg p-3 z-30 space-y-2 text-[12px]">
                <div className="font-semibold text-[#333333] pb-1 border-b border-[#e5e7eb]">
                  View Preferences
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showZeroBalance}
                    onChange={(e) => setShowZeroBalance(e.target.checked)}
                    className="rounded text-[#408dfb]"
                  />
                  <span>Show zero-balance accounts</span>
                </label>
              </div>
            )}
          </div>

          {/* Favorite Star Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#d9dce3] bg-white text-[#6c7380] hover:text-[#f59e0b] hover:bg-[#f9f9fb]"
            title={isFavorite ? 'Favorited' : 'Add to Favorites'}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isFavorite ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-[#6c7380]'
              }`}
            />
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#d9dce3] bg-white text-[#6c7380] hover:text-[#333333] hover:bg-[#f9f9fb]"
            title="Copy Report Link"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu((v) => !v)}
              className="inline-flex items-center gap-1 h-8 px-2.5 text-[12px] font-medium text-[#333333] bg-white border border-[#d9dce3] rounded hover:bg-[#f9f9fb]"
            >
              <Download className="w-3.5 h-3.5 text-[#6c7380]" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-[#6c7380]" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-10 w-36 bg-white border border-[#e5e7eb] rounded shadow-lg py-1 z-30 text-[12px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    handlePrint();
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#f9f9fb] flex items-center gap-2"
                >
                  <Printer className="w-3.5 h-3.5 text-[#6c7380]" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExportCSV();
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#f9f9fb] flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#6c7380]" />
                  <span>Export JSON</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#d9dce3] bg-white text-[#6c7380] hover:text-[#333333] hover:bg-[#f9f9fb]"
            title="Refresh Data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#408dfb]' : ''}`} />
          </button>

          {/* Red Close "X" Button */}
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#d9dce3] bg-white text-[#dc2626] hover:bg-[#fee2e2] transition-colors ml-1"
            title="Close Report (Return to Reports Center)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3b. Filter Bar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-2 bg-white border-b border-[#e5e7eb] gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[12px] text-[#6c7380] font-medium">Filters:</span>

          {/* Date Preset Dropdown */}
          <div className="relative">
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
              className="h-8 pl-3 pr-8 text-[12px] font-medium text-[#333333] bg-white border border-[#d9dce3] rounded appearance-none cursor-pointer hover:border-[#b0b5c0] focus:outline-none focus:border-[#408dfb]"
            >
              {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map((p) => (
                <option key={p} value={p}>
                  {reportDef.dateMode === 'asOf' ? `As of: ${DATE_PRESET_LABELS[p]}` : `Date Range: ${DATE_PRESET_LABELS[p]}`}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#6c7380] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 animate-fadeIn">
              {reportDef.dateMode === 'asOf' ? (
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => {
                    setAsOfDate(e.target.value);
                    setHasUnsavedFilterChanges(true);
                  }}
                  className="h-8 px-2.5 text-[12px] text-[#333333] bg-white border border-[#d9dce3] rounded"
                />
              ) : (
                <>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setHasUnsavedFilterChanges(true);
                    }}
                    className="h-8 px-2.5 text-[12px] text-[#333333] bg-white border border-[#d9dce3] rounded"
                  />
                  <span className="text-[12px] text-[#6c7380]">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setHasUnsavedFilterChanges(true);
                    }}
                    className="h-8 px-2.5 text-[12px] text-[#333333] bg-white border border-[#d9dce3] rounded"
                  />
                </>
              )}
            </div>
          )}

          {/* More Filters Button */}
          {reportDef.supportsBasis && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreFiltersPopover((v) => !v)}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] text-[#333333] bg-white border border-[#d9dce3] rounded hover:bg-[#f9f9fb]"
              >
                <span>Report Basis: {reportingBasis}</span>
                <ChevronDown className="w-3 h-3 text-[#6c7380]" />
              </button>

              {showMoreFiltersPopover && (
                <div className="absolute left-0 top-10 w-48 bg-white border border-[#e5e7eb] rounded shadow-lg p-2.5 z-30 space-y-2 text-[12px]">
                  <div className="font-semibold text-[#333333]">Accounting Basis</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="basis"
                      checked={reportingBasis === 'Accrual'}
                      onChange={() => {
                        setReportingBasis('Accrual');
                        setHasUnsavedFilterChanges(true);
                      }}
                      className="text-[#408dfb]"
                    />
                    <span>Accrual</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="basis"
                      checked={reportingBasis === 'Cash'}
                      onChange={() => {
                        setReportingBasis('Cash');
                        setHasUnsavedFilterChanges(true);
                      }}
                      className="text-[#408dfb]"
                    />
                    <span>Cash</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Blue Run Report Button */}
          <button
            type="button"
            onClick={handleRunReport}
            className={`h-8 px-4 text-[12px] font-medium rounded transition-colors ${
              hasUnsavedFilterChanges
                ? 'bg-[#408dfb] text-white hover:bg-[#3478d8] shadow-xs'
                : 'bg-[#eef4ff] text-[#408dfb] hover:bg-[#e0ecfe]'
            }`}
          >
            Run Report
          </button>
        </div>
      </div>

      {/* 3c. Main Report Body Area (Only card scrolls) */}
      <div className="flex-1 overflow-auto p-6 bg-[#f7f8fa]">
        <div className="max-w-[960px] mx-auto bg-white border border-[#e5e7eb] rounded-md shadow-xs p-8">
          {/* Card Top Toolbar: Compare With */}
          {reportDef.supportsCompare && (
            <div className="flex items-center justify-end gap-3 text-[12px] mb-4 text-[#6c7380]">
              <div className="flex items-center gap-1.5">
                <span>Compare With:</span>
                <select
                  value={compareWith}
                  onChange={(e) => {
                    setCompareWith(e.target.value);
                    setHasUnsavedFilterChanges(true);
                  }}
                  className="h-7 px-2 border border-[#d9dce3] rounded bg-white text-[#333333] text-[12px]"
                >
                  <option value="none">None</option>
                  <option value="previous_period">Previous Period</option>
                  <option value="previous_year">Previous Year</option>
                </select>
              </div>
            </div>
          )}

          {/* Centered Title Block (Exact Zoho Style: Organization, Report Title, Date line) */}
          <div className="text-center mb-8">
            <p className="text-[12px] font-semibold tracking-wider text-[#6c7380] uppercase">
              {organizationName}
            </p>
            <h2 className="text-[20px] font-medium text-[#333333] mt-1">
              {reportDef.title}
            </h2>
            {reportDef.supportsBasis && (
              <p className="text-[12px] text-[#6c7380] mt-0.5">
                Basis : {reportingBasis}
              </p>
            )}
            <p className="text-[12px] text-[#333333] mt-0.5">{headerDateText}</p>
          </div>

          {/* Render Body Table depending on report key */}
          {isLoading ? (
            <div className="space-y-3 max-w-[780px] mx-auto py-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-6 bg-[#f1f3f7] rounded animate-pulse w-full" />
              ))}
            </div>
          ) : !reportData ? (
            <div className="text-center py-16 text-[#6c7380] text-[14px]">
              No data for the selected filters.
            </div>
          ) : (
            <div className="max-w-[780px] mx-auto">
              {/* BALANCE SHEET HIERARCHICAL TABLE (Reference Image 2 & 3) */}
              {reportDef.key === 'balance-sheet' && (
                <div className="space-y-6">
                  {/* Balance Check Note */}
                  {!reportData.isBalanced && (
                    <div className="flex items-center gap-2 p-3 bg-[#fee2e2] text-[#dc2626] rounded border border-[#fecaca] text-[12px] mb-4">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Out of balance: Total Assets (₹{formatNumber(reportData.assets?.totalAssets)}) != Total Liabilities & Equities (₹{formatNumber(reportData.totalLiabilitiesAndEquities)}). Difference: ₹{formatNumber(reportData.difference)}
                      </span>
                    </div>
                  )}

                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb]">
                      <tr className="h-9 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                        <th className="py-2 px-3">Account</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f7f8fa]">
                      {/* ASSETS */}
                      <tr className="font-semibold text-[#333333] bg-[#fdfdfd]">
                        <td className="py-2.5 px-3">Assets</td>
                        <td className="py-2.5 px-3 text-right tabular-nums"></td>
                      </tr>

                      {/* Current Assets */}
                      <tr className="font-semibold text-[#333333] pl-4">
                        <td className="py-2 px-6">Current Assets</td>
                        <td className="py-2 px-3 text-right tabular-nums"></td>
                      </tr>

                      {/* Cash and Cash Equivalents */}
                      <tr className="font-medium text-[#444444]">
                        <td className="py-1.5 px-9">Cash and Cash Equivalents</td>
                        <td className="py-1.5 px-3 text-right tabular-nums"></td>
                      </tr>
                      {/* Cash */}
                      {reportData.assets?.currentAssets?.cashAndEquivalents?.cash?.map((acc: any) => (
                        <tr key={acc.id} className="text-[#555555] hover:bg-[#f7f9ff]">
                          <td className="py-1 px-12">
                            <Link to={getLedgerLink(acc.id)} className="text-[#408dfb] hover:underline">
                              {acc.name}
                            </Link>
                          </td>
                          <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                            {formatNumber(acc.balance)}
                          </td>
                        </tr>
                      ))}
                      {/* Bank */}
                      {reportData.assets?.currentAssets?.cashAndEquivalents?.bank?.map((acc: any) => (
                        <tr key={acc.id} className="text-[#555555] hover:bg-[#f7f9ff]">
                          <td className="py-1 px-12">
                            <Link to={getLedgerLink(acc.id)} className="text-[#408dfb] hover:underline">
                              {acc.name}
                            </Link>
                          </td>
                          <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                            {formatNumber(acc.balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-medium border-t border-[#e5e7eb] text-[#333333]">
                        <td className="py-1.5 px-9">Total for Cash and Cash Equivalents</td>
                        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                          {formatNumber(reportData.assets?.currentAssets?.cashAndEquivalents?.total)}
                        </td>
                      </tr>

                      {/* Accounts Receivable */}
                      <tr className="font-medium text-[#444444]">
                        <td className="py-2 px-9">Accounts Receivable</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold">
                          {formatNumber(reportData.assets?.currentAssets?.accountsReceivable?.total)}
                        </td>
                      </tr>

                      {/* Other Current Assets */}
                      <tr className="font-medium text-[#444444]">
                        <td className="py-1.5 px-9">Other Current Assets</td>
                        <td className="py-1.5 px-3 text-right tabular-nums"></td>
                      </tr>
                      {reportData.assets?.currentAssets?.otherCurrentAssets?.inputTaxCredits?.map((acc: any) => (
                        <tr key={acc.id} className="text-[#555555] hover:bg-[#f7f9ff]">
                          <td className="py-1 px-12">
                            <Link to={getLedgerLink(acc.id)} className="text-[#408dfb] hover:underline">
                              {acc.name}
                            </Link>
                          </td>
                          <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                            {formatNumber(acc.balance)}
                          </td>
                        </tr>
                      ))}
                      {reportData.assets?.currentAssets?.otherCurrentAssets?.other?.map((acc: any) => (
                        <tr key={acc.id} className="text-[#555555] hover:bg-[#f7f9ff]">
                          <td className="py-1 px-12">
                            <Link to={getLedgerLink(acc.id)} className="text-[#408dfb] hover:underline">
                              {acc.name}
                            </Link>
                          </td>
                          <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                            {formatNumber(acc.balance)}
                          </td>
                        </tr>
                      ))}

                      {/* Total for Current Assets */}
                      <tr className="font-semibold border-t border-[#e5e7eb] text-[#333333] bg-[#f9f9fb]">
                        <td className="py-2 px-6">Total for Current Assets</td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold">
                          {formatNumber(reportData.assets?.currentAssets?.total)}
                        </td>
                      </tr>

                      {/* Fixed Assets */}
                      {reportData.assets?.fixedAssets?.items?.length > 0 && (
                        <>
                          <tr className="font-semibold text-[#333333]">
                            <td className="py-2 px-6">Fixed Assets</td>
                            <td className="py-2 px-3 text-right tabular-nums font-bold">
                              {formatNumber(reportData.assets?.fixedAssets?.total)}
                            </td>
                          </tr>
                          {reportData.assets?.fixedAssets?.items?.map((acc: any) => (
                            <tr key={acc.id} className="text-[#555555] hover:bg-[#f7f9ff]">
                              <td className="py-1 px-12">
                                <Link to={getLedgerLink(acc.id)} className="text-[#408dfb] hover:underline">
                                  {acc.name}
                                </Link>
                              </td>
                              <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                                {formatNumber(acc.balance)}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}

                      {/* Total for Assets */}
                      <tr className="font-bold border-t-2 border-b-2 border-[#333333] text-[#333333] bg-[#fdfdfd]">
                        <td className="py-2.5 px-3">Total for Assets</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[14px]">
                          {formatNumber(reportData.assets?.totalAssets)}
                        </td>
                      </tr>

                      {/* LIABILITIES */}
                      <tr className="font-semibold text-[#333333] pt-4">
                        <td className="py-2.5 px-3">Liabilities</td>
                        <td className="py-2.5 px-3 text-right tabular-nums"></td>
                      </tr>
                      <tr className="font-semibold text-[#333333]">
                        <td className="py-2 px-6">Current Liabilities</td>
                        <td className="py-2 px-3 text-right tabular-nums"></td>
                      </tr>
                      {/* Accounts Payable */}
                      <tr className="font-medium text-[#444444]">
                        <td className="py-1.5 px-9">Accounts Payable</td>
                        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                          {formatNumber(reportData.liabilities?.currentLiabilities?.accountsPayable?.total)}
                        </td>
                      </tr>
                      {/* GST Payable */}
                      {reportData.liabilities?.currentLiabilities?.otherCurrentLiabilities?.gstPayable?.map((acc: any) => (
                        <tr key={acc.id} className="text-[#555555] hover:bg-[#f7f9ff]">
                          <td className="py-1 px-12">
                            <Link to={getLedgerLink(acc.id)} className="text-[#408dfb] hover:underline">
                              {acc.name}
                            </Link>
                          </td>
                          <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                            {formatNumber(acc.balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold border-t border-[#e5e7eb] text-[#333333] bg-[#f9f9fb]">
                        <td className="py-2 px-6">Total for Current Liabilities</td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold">
                          {formatNumber(reportData.liabilities?.currentLiabilities?.total)}
                        </td>
                      </tr>
                      <tr className="font-bold border-t border-b border-[#e5e7eb] text-[#333333]">
                        <td className="py-2 px-3">Total for Liabilities</td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold">
                          {formatNumber(reportData.liabilities?.totalLiabilities)}
                        </td>
                      </tr>

                      {/* EQUITIES */}
                      <tr className="font-semibold text-[#333333]">
                        <td className="py-2.5 px-3">Equities</td>
                        <td className="py-2.5 px-3 text-right tabular-nums"></td>
                      </tr>
                      {reportData.equities?.capital?.map((acc: any) => (
                        <tr key={acc.id} className="text-[#555555] hover:bg-[#f7f9ff]">
                          <td className="py-1 px-6">
                            <Link to={getLedgerLink(acc.id)} className="text-[#408dfb] hover:underline">
                              {acc.name}
                            </Link>
                          </td>
                          <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                            {formatNumber(acc.balance)}
                          </td>
                        </tr>
                      ))}
                      {reportData.equities?.drawings?.map((acc: any) => (
                        <tr key={acc.id} className="text-[#555555] hover:bg-[#f7f9ff]">
                          <td className="py-1 px-6">
                            <Link to={getLedgerLink(acc.id)} className="text-[#408dfb] hover:underline">
                              {acc.name}
                            </Link>
                          </td>
                          <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                            -{formatNumber(acc.balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="text-[#333333]">
                        <td className="py-1 px-6">Current Year Earnings</td>
                        <td className="py-1 px-3 text-right tabular-nums font-medium text-[#333333]">
                          {formatNumber(reportData.equities?.currentYearEarnings)}
                        </td>
                      </tr>
                      <tr className="text-[#333333]">
                        <td className="py-1 px-6">Retained Earnings</td>
                        <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                          {formatNumber(reportData.equities?.retainedEarnings)}
                        </td>
                      </tr>
                      <tr className="font-semibold border-t border-[#e5e7eb] text-[#333333] bg-[#f9f9fb]">
                        <td className="py-2 px-3">Total for Equities</td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold">
                          {formatNumber(reportData.equities?.totalEquities)}
                        </td>
                      </tr>

                      {/* Total for Liabilities & Equities */}
                      <tr className="font-bold border-t-2 border-b-2 border-[#333333] text-[#333333] bg-[#fdfdfd]">
                        <td className="py-2.5 px-3">Total for Liabilities & Equities</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[14px]">
                          {formatNumber(reportData.totalLiabilitiesAndEquities)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* PROFIT AND LOSS TABLE */}
              {reportDef.key === 'profit-and-loss' && (
                <div className="space-y-4">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb]">
                      <tr className="h-9 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                        <th className="py-2 px-3">Account</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f7f8fa]">
                      <tr className="font-semibold text-[#333333]">
                        <td className="py-2 px-3">Operating Income</td>
                        <td className="py-2 px-3 text-right tabular-nums"></td>
                      </tr>
                      {reportData.revenue?.salesRevenue?.map((acc: any) => (
                        <tr key={acc.id} className="hover:bg-[#f7f9ff]">
                          <td className="py-1 px-6">
                            <Link to={getLedgerLink(acc.id)} className="text-[#408dfb] hover:underline">
                              {acc.name}
                            </Link>
                          </td>
                          <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                            {formatNumber(acc.balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold border-t border-[#e5e7eb] text-[#333333] bg-[#f9f9fb]">
                        <td className="py-2 px-3">Gross Revenue</td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold">
                          {formatNumber(reportData.revenue?.grossRevenue)}
                        </td>
                      </tr>
                      <tr className="font-semibold text-[#333333]">
                        <td className="py-2 px-3">Cost of Goods Sold (COGS)</td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold">
                          {formatNumber(reportData.cogs?.total)}
                        </td>
                      </tr>
                      <tr className="font-bold border-t border-b border-[#e5e7eb] text-[#333333]">
                        <td className="py-2 px-3">Gross Profit</td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-[#2e7d32]">
                          {formatNumber(reportData.grossProfit)}
                        </td>
                      </tr>
                      <tr className="font-semibold text-[#333333]">
                        <td className="py-2 px-3">Operating Expenses</td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold">
                          {formatNumber(reportData.operatingExpenses?.total)}
                        </td>
                      </tr>
                      <tr className="font-bold border-t-2 border-b-2 border-[#333333] text-[#333333] bg-[#fdfdfd]">
                        <td className="py-2.5 px-3">Net Profit / (Loss)</td>
                        <td
                          className={`py-2.5 px-3 text-right tabular-nums text-[14px] ${
                            Number(reportData.netProfit) >= 0 ? 'text-[#2e7d32]' : 'text-[#dc2626]'
                          }`}
                        >
                          {formatNumber(reportData.netProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* CASH FLOW STATEMENT (Reference Image 4) */}
              {reportDef.key === 'cash-flow-statement' && (
                <div className="space-y-4">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb]">
                      <tr className="h-9 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                        <th className="py-2 px-3">Account</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f7f8fa]">
                      <tr className="font-semibold text-[#333333] bg-[#fdfdfd]">
                        <td className="py-2 px-3">Beginning Cash Balance</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold">
                          {formatNumber(reportData.beginningCashBalance)}
                        </td>
                      </tr>
                      <tr className="font-semibold text-[#333333]">
                        <td className="py-2 px-3">Cash Flow from Operating Activities</td>
                        <td className="py-2 px-3 text-right tabular-nums"></td>
                      </tr>
                      <tr className="hover:bg-[#f7f9ff]">
                        <td className="py-1 px-6 text-[#555555]">Accounts Receivable</td>
                        <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                          {formatNumber(reportData.operatingActivities?.accountsReceivable)}
                        </td>
                      </tr>
                      <tr className="hover:bg-[#f7f9ff]">
                        <td className="py-1 px-6 text-[#555555]">Net Income</td>
                        <td className="py-1 px-3 text-right tabular-nums text-[#333333]">
                          {formatNumber(reportData.operatingActivities?.netIncome)}
                        </td>
                      </tr>
                      <tr className="font-semibold border-t border-[#e5e7eb] text-[#333333] bg-[#f9f9fb]">
                        <td className="py-2 px-3">Net cash provided by Operating Activities</td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold">
                          {formatNumber(reportData.operatingActivities?.netCashProvided)}
                        </td>
                      </tr>
                      <tr className="font-semibold text-[#333333]">
                        <td className="py-2 px-3">Net cash provided by Investing Activities</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold">
                          {formatNumber(reportData.investingActivities?.netCashProvided)}
                        </td>
                      </tr>
                      <tr className="font-semibold text-[#333333]">
                        <td className="py-2 px-3">Net cash provided by Financing Activities</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold">
                          {formatNumber(reportData.financingActivities?.netCashProvided)}
                        </td>
                      </tr>
                      <tr className="font-bold border-t border-[#e5e7eb] text-[#333333]">
                        <td className="py-2 px-3">Net Change in cash</td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-[#408dfb]">
                          {formatNumber(reportData.netChangeInCash)}
                        </td>
                      </tr>
                      <tr className="font-bold border-t-2 border-b-2 border-[#333333] text-[#333333] bg-[#fdfdfd]">
                        <td className="py-2.5 px-3">Ending Cash Balance</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[14px]">
                          {formatNumber(reportData.endingCashBalance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* TRIAL BALANCE TABLE */}
              {reportDef.key === 'trial-balance' && (
                <div className="space-y-4">
                  {!reportData.isBalanced && (
                    <div className="flex items-center gap-2 p-3 bg-[#fee2e2] text-[#dc2626] rounded text-[12px]">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Out of balance: Debit ₹{formatNumber(reportData.totalDebit)} != Credit ₹{formatNumber(reportData.totalCredit)}. Difference: ₹{formatNumber(reportData.difference)}
                      </span>
                    </div>
                  )}

                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb]">
                      <tr className="h-9 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                        <th className="py-2 px-3">Account</th>
                        <th className="py-2 px-3 text-right w-36">Debit</th>
                        <th className="py-2 px-3 text-right w-36">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f7f8fa]">
                      {reportData.rows?.map((acc: any) => (
                        <tr key={acc.id} className="hover:bg-[#f7f9ff]">
                          <td className="py-1.5 px-3">
                            <Link to={getLedgerLink(acc.id)} className="text-[#408dfb] hover:underline font-medium">
                              {acc.accountName}
                            </Link>
                          </td>
                          <td className="py-1.5 px-3 text-right tabular-nums text-[#333333]">
                            {acc.debit > 0 ? formatNumber(acc.debit) : '—'}
                          </td>
                          <td className="py-1.5 px-3 text-right tabular-nums text-[#333333]">
                            {acc.credit > 0 ? formatNumber(acc.credit) : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t-2 border-b-2 border-[#333333] text-[#333333] bg-[#f9f9fb]">
                        <td className="py-2.5 px-3">Total</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[13px]">
                          {formatNumber(reportData.totalDebit)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[13px]">
                          {formatNumber(reportData.totalCredit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* BUSINESS PERFORMANCE RATIOS (Reference Image 5) */}
              {reportDef.key === 'business-performance-ratios' && (
                <div className="space-y-6">
                  {/* Summary Stat Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 border border-[#e5e7eb] rounded bg-[#fdfdfd]">
                      <div className="text-[11px] uppercase tracking-wider text-[#6c7380] font-semibold">Current Ratio</div>
                      <div className="text-[20px] font-bold text-[#333333] mt-1 tabular-nums">
                        {reportData.ratios?.currentRatio}x
                      </div>
                      <div className="text-[11px] text-[#2e7d32] mt-0.5 font-medium">Benchmark: &gt; 1.5x</div>
                    </div>
                    <div className="p-4 border border-[#e5e7eb] rounded bg-[#fdfdfd]">
                      <div className="text-[11px] uppercase tracking-wider text-[#6c7380] font-semibold">Quick Ratio</div>
                      <div className="text-[20px] font-bold text-[#333333] mt-1 tabular-nums">
                        {reportData.ratios?.quickRatio}x
                      </div>
                      <div className="text-[11px] text-[#2e7d32] mt-0.5 font-medium">Benchmark: &gt; 1.0x</div>
                    </div>
                    <div className="p-4 border border-[#e5e7eb] rounded bg-[#fdfdfd]">
                      <div className="text-[11px] uppercase tracking-wider text-[#6c7380] font-semibold">Net Profit Margin</div>
                      <div className="text-[20px] font-bold text-[#333333] mt-1 tabular-nums">
                        {reportData.ratios?.netProfitMargin}%
                      </div>
                      <div className="text-[11px] text-[#6c7380] mt-0.5">Net Income / Revenue</div>
                    </div>
                    <div className="p-4 border border-[#e5e7eb] rounded bg-[#fdfdfd]">
                      <div className="text-[11px] uppercase tracking-wider text-[#6c7380] font-semibold">Debt to Equity</div>
                      <div className="text-[20px] font-bold text-[#333333] mt-1 tabular-nums">
                        {reportData.ratios?.debtToEquity}x
                      </div>
                      <div className="text-[11px] text-[#6c7380] mt-0.5">Liabilities / Equity</div>
                    </div>
                  </div>

                  {/* Monthly Table */}
                  <table className="w-full text-left text-[13px] border border-[#e5e7eb] rounded">
                    <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb]">
                      <tr className="h-9 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                        <th className="py-2 px-3">Metric</th>
                        <th className="py-2 px-3 text-right">Value</th>
                        <th className="py-2 px-3">Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef0f4]">
                      <tr>
                        <td className="py-2 px-3 font-medium">Current Assets</td>
                        <td className="py-2 px-3 text-right tabular-nums">₹{formatNumber(reportData.raw?.currentAssets)}</td>
                        <td className="py-2 px-3 text-[#6c7380] text-[12px]">Liquid resources available within 1 year</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Current Liabilities</td>
                        <td className="py-2 px-3 text-right tabular-nums">₹{formatNumber(reportData.raw?.currentLiabilities)}</td>
                        <td className="py-2 px-3 text-[#6c7380] text-[12px]">Short-term obligations due within 1 year</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Net Profit</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#2e7d32]">₹{formatNumber(reportData.raw?.netProfit)}</td>
                        <td className="py-2 px-3 text-[#6c7380] text-[12px]">Net earnings after all expenses and taxes</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Total Equity</td>
                        <td className="py-2 px-3 text-right tabular-nums">₹{formatNumber(reportData.raw?.totalEquity)}</td>
                        <td className="py-2 px-3 text-[#6c7380] text-[12px]">Net book value belonging to owners</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* SALES / PURCHASES / DEPARTMENTAL / TAX / BANKING GENERIC TABLE */}
              {!['balance-sheet', 'profit-and-loss', 'cash-flow-statement', 'trial-balance', 'business-performance-ratios'].includes(reportDef.key) && (
                <div className="space-y-4">
                  {reportData.invoices && (
                    <table className="w-full text-left text-[13px] border-collapse">
                      <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb]">
                        <tr className="h-9 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                          <th className="py-2 px-3">Invoice No</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Customer</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f7f8fa]">
                        {reportData.invoices.map((inv: any, i: number) => (
                          <tr key={i} className="hover:bg-[#f7f9ff]">
                            <td className="py-1.5 px-3 text-[#408dfb] font-medium">{inv.invoiceNo}</td>
                            <td className="py-1.5 px-3 text-[#6c7380]">{formatDateDisplay(inv.date)}</td>
                            <td className="py-1.5 px-3 text-[#333333]">{inv.customer || '—'}</td>
                            <td className="py-1.5 px-3 text-right tabular-nums font-medium text-[#333333]">
                              {formatNumber(inv.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t border-[#e5e7eb] bg-[#f9f9fb]">
                          <td colSpan={3} className="py-2 px-3">Total Sales</td>
                          <td className="py-2 px-3 text-right tabular-nums text-[13px]">
                            {formatNumber(reportData.totalSales)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {reportData.purchases && (
                    <table className="w-full text-left text-[13px] border-collapse">
                      <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb]">
                        <tr className="h-9 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                          <th className="py-2 px-3">Bill No</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Vendor</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f7f8fa]">
                        {reportData.purchases.map((pur: any, i: number) => (
                          <tr key={i} className="hover:bg-[#f7f9ff]">
                            <td className="py-1.5 px-3 text-[#408dfb] font-medium">{pur.billNo}</td>
                            <td className="py-1.5 px-3 text-[#6c7380]">{formatDateDisplay(pur.date)}</td>
                            <td className="py-1.5 px-3 text-[#333333]">{pur.vendor || '—'}</td>
                            <td className="py-1.5 px-3 text-right tabular-nums font-medium text-[#333333]">
                              {formatNumber(pur.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t border-[#e5e7eb] bg-[#f9f9fb]">
                          <td colSpan={3} className="py-2 px-3">Total Purchases</td>
                          <td className="py-2 px-3 text-right tabular-nums text-[13px]">
                            {formatNumber(reportData.totalPurchases)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {reportData.departmentalSummary && (
                    <table className="w-full text-left text-[13px] border-collapse">
                      <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb]">
                        <tr className="h-9 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                          <th className="py-2 px-3">Department</th>
                          <th className="py-2 px-3 text-center">Headcount</th>
                          <th className="py-2 px-3 text-right">Income</th>
                          <th className="py-2 px-3 text-right">Expense</th>
                          <th className="py-2 px-3 text-right">Profitability</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f7f8fa]">
                        {reportData.departmentalSummary.map((d: any) => (
                          <tr key={d.departmentId} className="hover:bg-[#f7f9ff]">
                            <td className="py-2 px-3 font-medium text-[#333333]">{d.departmentName}</td>
                            <td className="py-2 px-3 text-center tabular-nums text-[#6c7380]">{d.headcount}</td>
                            <td className="py-2 px-3 text-right tabular-nums text-[#333333]">{formatNumber(d.incomeValue)}</td>
                            <td className="py-2 px-3 text-right tabular-nums text-[#333333]">{formatNumber(d.expenseCost + d.salaryCost)}</td>
                            <td className={`py-2 px-3 text-right tabular-nums font-semibold ${d.profitability >= 0 ? 'text-[#2e7d32]' : 'text-[#dc2626]'}`}>
                              {formatNumber(d.profitability)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {reportData.outputTax !== undefined && (
                    <div className="p-4 border border-[#e5e7eb] rounded space-y-3">
                      <div className="flex justify-between py-1 border-b border-[#f1f3f7]">
                        <span className="font-medium text-[#333333]">Total Output GST (on Invoices)</span>
                        <span className="tabular-nums font-semibold text-[#333333]">₹{formatNumber(reportData.outputTax)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#f1f3f7]">
                        <span className="font-medium text-[#333333]">Total Input Tax Credit (on Bills)</span>
                        <span className="tabular-nums font-semibold text-[#333333]">₹{formatNumber(reportData.inputTax)}</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-[14px]">
                        <span>Net GST Payable</span>
                        <span className={`tabular-nums ${reportData.netTaxPayable >= 0 ? 'text-[#dc2626]' : 'text-[#2e7d32]'}`}>
                          ₹{formatNumber(reportData.netTaxPayable)}
                        </span>
                      </div>
                    </div>
                  )}

                  {Array.isArray(reportData) && reportData.length > 0 && reportData[0].currentBalance !== undefined && (
                    <table className="w-full text-left text-[13px] border-collapse">
                      <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb]">
                        <tr className="h-9 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                          <th className="py-2 px-3">Account Name</th>
                          <th className="py-2 px-3">Account Number</th>
                          <th className="py-2 px-3 text-right">Current Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f7f8fa]">
                        {reportData.map((b: any) => (
                          <tr key={b.id} className="hover:bg-[#f7f9ff]">
                            <td className="py-2 px-3 font-medium text-[#333333]">{b.name}</td>
                            <td className="py-2 px-3 text-[#6c7380]">{b.accountNumber || '—'}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#333333]">
                              {formatNumber(b.currentBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Footer Note (Exact Zoho Style: Amount in base currency INR) */}
              <div className="mt-8 pt-4 border-t border-[#e5e7eb] flex items-center justify-between text-[11px] text-[#6c7380]">
                <div className="flex items-center gap-1.5">
                  <span>**Amount is displayed in your base currency</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#16a34a] bg-[#dcfce7] border border-[#bbf7d0]">
                    INR
                  </span>
                </div>
                <span>Bill Aura Financial Telemetry</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Drawer for Quick Report Switch (3a) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/20 backdrop-blur-xs transition-opacity animate-fadeIn">
          <div className="w-[320px] h-full bg-white shadow-2xl flex flex-col border-r border-[#e5e7eb] animate-slideInLeft">
            <div className="flex items-center justify-between px-5 h-14 border-b border-[#e5e7eb] bg-[#f9f9fb]">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#408dfb]" />
                <h3 className="text-[14px] font-semibold text-[#333333]">Reports Directory</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#eef0f4] text-[#6c7380]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {REPORT_CATEGORIES.map((cat) => {
                const reportsInCat = REPORT_CATALOG.filter((r) => r.category === cat);
                if (reportsInCat.length === 0) return null;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="text-[11px] font-semibold text-[#6c7380] uppercase tracking-wider px-2">
                      {cat}
                    </div>
                    {reportsInCat.map((r) => {
                      const isActive = r.key === reportKey;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => {
                            setIsDrawerOpen(false);
                            navigate(`/reports/${r.key}`);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded text-[13px] transition-colors flex items-center justify-between ${
                            isActive
                              ? 'bg-[#eef4ff] text-[#408dfb] font-semibold'
                              : 'text-[#333333] hover:bg-[#f9f9fb]'
                          }`}
                        >
                          <span className="truncate">{r.title}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-[#408dfb] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-[#e5e7eb] bg-[#f9f9fb]">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/reports');
                }}
                className="w-full h-8 text-[12px] font-medium text-[#408dfb] bg-white border border-[#bfdbfe] rounded hover:bg-[#eef4ff] transition-colors"
              >
                Go to Reports Center
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportViewer;
