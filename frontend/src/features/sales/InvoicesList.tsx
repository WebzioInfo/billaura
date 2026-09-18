import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Receipt,
  Eye,
  Download,
  Filter,
  X,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Printer,
  Calendar,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  Check,
  Building2,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  FileArchive,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { PageHeader } from '@/shared/components/ui/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  Button,
  PageContainer,
  EmptyState,
  TableLoader,
} from '@/shared/components/ui';
import apiClient from '@/core/api';
import { useSessionStore } from '@/features/auth/stores/sessionStore';

// ============================================================================
// CONSTANTS & ENUMS
// ============================================================================

const DOCUMENT_TYPES = [
  { value: '', label: 'All Document Types' },
  { value: 'TAX_INVOICE', label: 'Tax Invoice' },
  { value: 'BILL_OF_SUPPLY', label: 'Bill of Supply' },
  { value: 'PROFORMA_INVOICE', label: 'Proforma Invoice' },
  { value: 'QUOTATION', label: 'Quotation' },
  { value: 'ESTIMATE', label: 'Estimate' },
  { value: 'CREDIT_NOTE', label: 'Credit Note' },
  { value: 'DEBIT_NOTE', label: 'Debit Note' },
  { value: 'PAYMENT_RECEIPT', label: 'Payment Receipt' },
  { value: 'FEE_RECEIPT', label: 'Fee Receipt' },
  { value: 'OTHER_RECEIPT', label: 'Other Receipt' },
];

const TAX_MODES = [
  { value: '', label: 'All Tax Modes' },
  { value: 'CGST_SGST', label: 'Regular GST (CGST + SGST)' },
  { value: 'IGST', label: 'Interstate GST (IGST)' },
  { value: 'NO_TAX', label: 'Non-GST / Exempt (No Tax)' },
];

const INVOICE_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Issued / Sent' },
  { value: 'PARTIAL', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAYMENT_STATUSES = [
  { value: '', label: 'All Payment Statuses' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
];

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'this_fy', label: 'This Financial Year' },
  { id: 'custom', label: 'Custom Range' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatIndianCurrency = (amount: number) => {
  const rounded = Math.abs(amount) < 0.005 ? 0 : amount;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
};

const formatIndianDate = (dateStr?: string | Date) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const calculateDatePreset = (preset: string): { fromDate: string; toDate: string } | null => {
  const now = new Date();
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (preset === 'today') {
    const s = formatYMD(now);
    return { fromDate: s, toDate: s };
  }
  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const s = formatYMD(y);
    return { fromDate: s, toDate: s };
  }
  if (preset === 'this_week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return { fromDate: formatYMD(start), toDate: formatYMD(now) };
  }
  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromDate: formatYMD(start), toDate: formatYMD(now) };
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { fromDate: formatYMD(start), toDate: formatYMD(end) };
  }
  if (preset === 'this_quarter') {
    const m = now.getMonth();
    let qMonth = 0;
    if (m >= 3 && m <= 5) qMonth = 3;
    else if (m >= 6 && m <= 8) qMonth = 6;
    else if (m >= 9 && m <= 11) qMonth = 9;
    else qMonth = 0;
    const start = new Date(now.getFullYear(), qMonth, 1);
    return { fromDate: formatYMD(start), toDate: formatYMD(now) };
  }
  if (preset === 'this_fy') {
    const m = now.getMonth();
    const fyYear = m >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const start = new Date(fyYear, 3, 1);
    return { fromDate: formatYMD(start), toDate: formatYMD(now) };
  }
  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const InvoicesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Session & Permissions
  const user = useSessionStore((state) => state.user);
  const permissions = useSessionStore((state) => state.permissions);
  const canCreate = user?.globalRole === 'SUPER_ADMIN' || user?.role === 'ADMIN' || permissions?.includes('sales.create' as any);
  const canEdit = user?.globalRole === 'SUPER_ADMIN' || user?.role === 'ADMIN' || permissions?.includes('sales.edit' as any);

  // --------------------------------------------------------------------------
  // URL QUERY STATE READ
  // --------------------------------------------------------------------------
  const search = searchParams.get('search') || '';
  const documentType = searchParams.get('documentType') || '';
  const taxMode = searchParams.get('taxMode') || '';
  const customerId = searchParams.get('customerId') || '';
  const customerNameParam = searchParams.get('customerName') || '';
  const status = searchParams.get('status') || '';
  const paymentStatus = searchParams.get('paymentStatus') || '';
  const datePreset = searchParams.get('datePreset') || '';
  const fromDate = searchParams.get('fromDate') || '';
  const toDate = searchParams.get('toDate') || '';
  const minAmount = searchParams.get('minAmount') || '';
  const maxAmount = searchParams.get('maxAmount') || '';
  const sortBy = searchParams.get('sortBy') || 'date';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '25', 10);

  // Local Search Input state for debouncing
  const [searchInput, setSearchInput] = useState(search);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Drawer / Filter Modal Open state
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Draft filter state for Drawer
  const [drawerDocType, setDrawerDocType] = useState(documentType);
  const [drawerTaxMode, setDrawerTaxMode] = useState(taxMode);
  const [drawerCustomerId, setDrawerCustomerId] = useState(customerId);
  const [drawerCustomerName, setDrawerCustomerName] = useState(customerNameParam);
  const [drawerStatus, setDrawerStatus] = useState(status);
  const [drawerPaymentStatus, setDrawerPaymentStatus] = useState(paymentStatus);
  const [drawerDatePreset, setDrawerDatePreset] = useState(datePreset);
  const [drawerFromDate, setDrawerFromDate] = useState(fromDate);
  const [drawerToDate, setDrawerToDate] = useState(toDate);
  const [drawerMinAmount, setDrawerMinAmount] = useState(minAmount);
  const [drawerMaxAmount, setDrawerMaxAmount] = useState(maxAmount);

  // Customer dropdown search query & results
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Row Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllMatchingSelected, setIsAllMatchingSelected] = useState(false);

  // Action Loading states
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadingSingleId, setDownloadingSingleId] = useState<string | null>(null);

  // Sync search input when URL changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Handle Search Input Change with 400ms debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      updateUrlParams({ search: value.trim(), page: '1' });
    }, 400);
  };

  // Helper to safely update URL search parameters
  const updateUrlParams = (newParams: Record<string, string | null | undefined>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '') {
          next.delete(key);
        } else {
          next.set(key, val);
        }
      });
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // ASYNC CUSTOMER SEARCH FOR FILTER DRAWER
  // --------------------------------------------------------------------------
  const { data: customerSearchResults, isLoading: isCustomerSearching } = useQuery({
    queryKey: ['customers-lookup', customerSearchQuery],
    queryFn: async () => {
      const res: any = await apiClient.get('/customers', {
        params: { search: customerSearchQuery.trim() },
      });
      const items = res?.items || res?.data?.items || res?.data || [];
      return Array.isArray(items) ? items : [];
    },
    enabled: isCustomerDropdownOpen,
    staleTime: 60 * 1000,
  });

  // --------------------------------------------------------------------------
  // REAL-TIME KPI SUMMARY AGGREGATION QUERY
  // --------------------------------------------------------------------------
  const summaryParams = useMemo(() => {
    const p: Record<string, any> = {};
    if (search) p.search = search;
    if (documentType) p.documentType = documentType;
    if (taxMode) p.taxMode = taxMode;
    if (customerId) p.customerId = customerId;
    if (status) p.status = status;
    if (paymentStatus) p.paymentStatus = paymentStatus;
    if (fromDate) p.fromDate = fromDate;
    if (toDate) p.toDate = toDate;
    if (minAmount) p.minAmount = minAmount;
    if (maxAmount) p.maxAmount = maxAmount;
    return p;
  }, [search, documentType, taxMode, customerId, status, paymentStatus, fromDate, toDate, minAmount, maxAmount]);

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['invoices-summary', summaryParams],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/invoices/summary', { params: summaryParams });
      return res?.data || res || {
        totalInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        overdueCount: 0,
      };
    },
    staleTime: 30 * 1000,
  });

  // --------------------------------------------------------------------------
  // SERVER-SIDE PAGINATED INVOICES QUERY
  // --------------------------------------------------------------------------
  const queryParams = useMemo(() => {
    return {
      ...summaryParams,
      sortBy,
      sortOrder,
      page,
      limit,
    };
  }, [summaryParams, sortBy, sortOrder, page, limit]);

  const { data: rawInvoicesResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoices-paginated', queryParams],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/invoices', { params: queryParams });
      const items = res?.items || res?.data?.items || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      const total = res?.total ?? res?.meta?.total ?? items.length;
      const totalPages = res?.totalPages ?? res?.meta?.totalPages ?? Math.max(1, Math.ceil(total / limit));
      return {
        items: Array.isArray(items) ? items : [],
        total: Number(total || 0),
        totalPages: Number(totalPages || 1),
      };
    },
    staleTime: 30 * 1000,
  });

  const invoices = rawInvoicesResponse?.items || [];
  const totalCount = rawInvoicesResponse?.total || 0;
  const totalPages = rawInvoicesResponse?.totalPages || 1;

  // Clear selections when page or filters change
  useEffect(() => {
    setSelectedIds([]);
    setIsAllMatchingSelected(false);
  }, [page, limit, search, documentType, taxMode, customerId, status, paymentStatus, fromDate, toDate, minAmount, maxAmount]);

  // --------------------------------------------------------------------------
  // FILTER DRAWER ACTIONS
  // --------------------------------------------------------------------------
  const openFilterDrawer = () => {
    setDrawerDocType(documentType);
    setDrawerTaxMode(taxMode);
    setDrawerCustomerId(customerId);
    setDrawerCustomerName(customerNameParam);
    setDrawerStatus(status);
    setDrawerPaymentStatus(paymentStatus);
    setDrawerDatePreset(datePreset);
    setDrawerFromDate(fromDate);
    setDrawerToDate(toDate);
    setDrawerMinAmount(minAmount);
    setDrawerMaxAmount(maxAmount);
    setIsFilterDrawerOpen(true);
  };

  const applyDrawerFilters = () => {
    updateUrlParams({
      documentType: drawerDocType,
      taxMode: drawerTaxMode,
      customerId: drawerCustomerId,
      customerName: drawerCustomerName,
      status: drawerStatus,
      paymentStatus: drawerPaymentStatus,
      datePreset: drawerDatePreset,
      fromDate: drawerFromDate,
      toDate: drawerToDate,
      minAmount: drawerMinAmount,
      maxAmount: drawerMaxAmount,
      page: '1',
    });
    setIsFilterDrawerOpen(false);
  };

  const resetDrawerFilters = () => {
    setDrawerDocType('');
    setDrawerTaxMode('');
    setDrawerCustomerId('');
    setDrawerCustomerName('');
    setDrawerStatus('');
    setDrawerPaymentStatus('');
    setDrawerDatePreset('');
    setDrawerFromDate('');
    setDrawerToDate('');
    setDrawerMinAmount('');
    setDrawerMaxAmount('');
  };

  const handleDatePresetSelect = (presetId: string) => {
    setDrawerDatePreset(presetId);
    if (presetId === 'custom') {
      return;
    }
    const range = calculateDatePreset(presetId);
    if (range) {
      setDrawerFromDate(range.fromDate);
      setDrawerToDate(range.toDate);
    } else {
      setDrawerFromDate('');
      setDrawerToDate('');
    }
  };

  // Clear all filters completely
  const handleClearAllFilters = () => {
    setSearchInput('');
    setSearchParams({ page: '1', limit: String(limit), sortBy, sortOrder });
  };

  // Remove single active filter chip
  const handleRemoveFilter = (filterKey: string) => {
    if (filterKey === 'search') {
      setSearchInput('');
      updateUrlParams({ search: null, page: '1' });
    } else if (filterKey === 'customer') {
      updateUrlParams({ customerId: null, customerName: null, page: '1' });
    } else if (filterKey === 'date') {
      updateUrlParams({ datePreset: null, fromDate: null, toDate: null, page: '1' });
    } else if (filterKey === 'amount') {
      updateUrlParams({ minAmount: null, maxAmount: null, page: '1' });
    } else {
      updateUrlParams({ [filterKey]: null, page: '1' });
    }
  };

  // Active filter count for badge
  const activeFiltersList = useMemo(() => {
    const list: { key: string; label: string; value: string }[] = [];
    if (search) list.push({ key: 'search', label: 'Search', value: `"${search}"` });
    if (documentType) {
      const match = DOCUMENT_TYPES.find((t) => t.value === documentType);
      list.push({ key: 'documentType', label: 'Type', value: match?.label || documentType });
    }
    if (taxMode) {
      const match = TAX_MODES.find((m) => m.value === taxMode);
      list.push({ key: 'taxMode', label: 'Tax Mode', value: match?.label || taxMode });
    }
    if (customerId) {
      list.push({ key: 'customer', label: 'Customer', value: customerNameParam || 'Selected Customer' });
    }
    if (status) {
      const match = INVOICE_STATUSES.find((s) => s.value === status);
      list.push({ key: 'status', label: 'Status', value: match?.label || status });
    }
    if (paymentStatus) {
      const match = PAYMENT_STATUSES.find((p) => p.value === paymentStatus);
      list.push({ key: 'paymentStatus', label: 'Payment', value: match?.label || paymentStatus });
    }
    if (fromDate || toDate) {
      const fromLabel = fromDate ? formatIndianDate(fromDate) : 'Start';
      const toLabel = toDate ? formatIndianDate(toDate) : 'Present';
      list.push({ key: 'date', label: 'Date', value: `${fromLabel} – ${toLabel}` });
    }
    if (minAmount || maxAmount) {
      const minStr = minAmount ? `₹${formatIndianCurrency(Number(minAmount))}` : '₹0';
      const maxStr = maxAmount ? `₹${formatIndianCurrency(Number(maxAmount))}` : 'Max';
      list.push({ key: 'amount', label: 'Amount', value: `${minStr} – ${maxStr}` });
    }
    return list;
  }, [search, documentType, taxMode, customerId, customerNameParam, status, paymentStatus, fromDate, toDate, minAmount, maxAmount]);

  // --------------------------------------------------------------------------
  // SORTING HANDLER
  // --------------------------------------------------------------------------
  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateUrlParams({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateUrlParams({ sortBy: field, sortOrder: 'desc' });
    }
  };

  // --------------------------------------------------------------------------
  // ROW SELECTION
  // --------------------------------------------------------------------------
  const isAllCurrentPageSelected = useMemo(() => {
    if (invoices.length === 0) return false;
    return invoices.every((inv: any) => selectedIds.includes(inv.id));
  }, [invoices, selectedIds]);

  const handleToggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedIds([]);
      setIsAllMatchingSelected(false);
    } else {
      const pageIds = invoices.map((inv: any) => inv.id);
      setSelectedIds(pageIds);
      setIsAllMatchingSelected(false);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setIsAllMatchingSelected(false);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // --------------------------------------------------------------------------
  // SINGLE & BULK ACTIONS
  // --------------------------------------------------------------------------
  const handleDownloadSinglePdf = async (invoiceId: string, invoiceNo: string) => {
    try {
      setDownloadingSingleId(invoiceId);
      const loadingToastId = toast.loading(`Generating PDF for ${invoiceNo}...`);
      const response: any = await apiClient.get(`/sales/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response], { type: 'application/pdf' });
      downloadBlob(blob, `${invoiceNo || 'Invoice'}.pdf`);
      toast.success(`Invoice ${invoiceNo} PDF downloaded`, { id: loadingToastId });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to download invoice PDF');
    } finally {
      setDownloadingSingleId(null);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one invoice to download.');
      return;
    }
    if (selectedIds.length > 100) {
      toast.error('Bulk download is capped at 100 invoices per batch for server safety.');
      return;
    }

    try {
      setIsBulkDownloading(true);
      const isZip = selectedIds.length > 1;
      const toastId = toast.loading(
        isZip
          ? `Preparing ZIP package for ${selectedIds.length} invoices...`
          : 'Generating invoice PDF...'
      );

      const response: any = await apiClient.post(
        '/sales/invoices/bulk-pdf',
        { invoiceIds: selectedIds },
        { responseType: 'blob' }
      );

      const contentType = isZip ? 'application/zip' : 'application/pdf';
      const filename = isZip
        ? `BillAura_Invoices_${new Date().toISOString().slice(0, 10)}.zip`
        : `Invoice_${selectedIds[0]}.pdf`;

      const blob = new Blob([response], { type: contentType });
      downloadBlob(blob, filename);

      toast.success(
        isZip ? `Downloaded ${selectedIds.length} invoices in ZIP archive` : 'PDF downloaded successfully',
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to download selected invoices');
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const toastId = toast.loading('Exporting invoices to CSV...');
      const response: any = await apiClient.get('/sales/invoices/export', {
        params: summaryParams,
        responseType: 'blob',
      });
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' });
      const filename = `BillAura_Invoices_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadBlob(blob, filename);
      toast.success('Invoices CSV export downloaded', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to export invoices CSV');
    } finally {
      setIsExporting(false);
    }
  };

  // --------------------------------------------------------------------------
  // STATUS BADGE FORMATTER
  // --------------------------------------------------------------------------
  const renderStatusBadge = (item: any) => {
    if (item.status === 'CANCELLED' || item.status === 'VOID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20">
          <XCircle className="w-3 h-3" /> Cancelled
        </span>
      );
    }
    if (item.status === 'DRAFT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 border border-slate-500/20">
          <Clock className="w-3 h-3" /> Draft
        </span>
      );
    }

    const grandTotal = Number(item.grandTotal || 0) - Number(item.roundOff || 0);
    const amountPaid = Number(item.amountPaid || 0);
    const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && amountPaid < grandTotal;

    if (amountPaid >= grandTotal && grandTotal > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> Paid
        </span>
      );
    }
    if (amountPaid > 0 && amountPaid < grandTotal) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
          <TrendingUp className="w-3 h-3" /> Partially Paid
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
          <AlertTriangle className="w-3 h-3" /> Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <Receipt className="w-3 h-3" /> Issued
      </span>
    );
  };

  const renderDocumentTypeBadge = (type?: string) => {
    switch (type) {
      case 'BILL_OF_SUPPLY':
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Bill of Supply</span>;
      case 'PROFORMA_INVOICE':
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">Proforma</span>;
      case 'QUOTATION':
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">Quotation</span>;
      case 'ESTIMATE':
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800">Estimate</span>;
      case 'CREDIT_NOTE':
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800">Credit Note</span>;
      case 'DEBIT_NOTE':
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800">Debit Note</span>;
      default:
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Tax Invoice</span>;
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <div className="space-y-6 pb-12">
        {/* ================================================================= */}
        {/* 1. HEADER */}
        {/* ================================================================= */}
        <PageHeader
          title="Invoices"
          description="Enterprise invoice workspace: search, advanced tax filtering, bulk PDF downloads, and receivables tracking"
          primaryAction={
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportCsv}
                variant="outline"
                disabled={isExporting}
                className="flex items-center gap-2 h-10 px-4 font-medium text-foreground border-border shadow-sm hover:bg-muted/60"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              {canCreate && (
                <Button
                  onClick={() => navigate('/invoices/new')}
                  className="flex items-center gap-2 h-10 font-semibold px-5 shadow-sm hover:shadow-md transition-all duration-200"
                  variant="primary"
                >
                  <Plus className="w-4 h-4" /> New Invoice
                </Button>
              )}
            </div>
          }
        />

        {/* ================================================================= */}
        {/* 2. REAL-TIME SUMMARY METRICS CARDS */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <Card className="p-4 bg-surface border border-border/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <span>Matching Invoices</span>
              <Layers className="w-4 h-4 text-primary/70" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {isSummaryLoading ? '...' : (summaryData?.totalInvoices || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Filtered result count</div>
          </Card>

          <Card className="p-4 bg-surface border border-border/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <span>Total Invoiced</span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground font-mono">
              ₹{isSummaryLoading ? '...' : formatIndianCurrency(Number(summaryData?.totalAmount || 0))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Cumulative grand total</div>
          </Card>

          <Card className="p-4 bg-surface border border-border/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <span>Collected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
              ₹{isSummaryLoading ? '...' : formatIndianCurrency(Number(summaryData?.paidAmount || 0))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Total receipts settled</div>
          </Card>

          <Card className="p-4 bg-surface border border-border/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <span>Outstanding</span>
              <Receipt className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600 font-mono">
              ₹{isSummaryLoading ? '...' : formatIndianCurrency(Number(summaryData?.unpaidAmount || 0))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Pending receivables</div>
          </Card>

          <Card className="p-4 bg-surface border border-border/80 shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <span>Overdue</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-600 font-mono">
              {isSummaryLoading ? '...' : (summaryData?.overdueCount || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Past payment due date</div>
          </Card>
        </div>

        {/* ================================================================= */}
        {/* 3. SEARCH & FILTER TOOLBAR */}
        {/* ================================================================= */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Prominent Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search invoice number, customer name, phone, GSTIN..."
              className="w-full pl-10 pr-10 h-10 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-foreground shadow-2xs"
            />
            {searchInput && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={openFilterDrawer}
              variant="outline"
              className={`h-10 px-4 flex items-center gap-2 border font-medium shadow-2xs transition-colors ${
                activeFiltersList.length > 0
                  ? 'bg-primary/5 border-primary/40 text-primary hover:bg-primary/10'
                  : 'bg-surface border-border text-foreground hover:bg-muted/60'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {activeFiltersList.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-primary text-primary-foreground">
                  {activeFiltersList.length}
                </span>
              )}
            </Button>

            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="h-10 px-3 text-muted-foreground hover:text-foreground border-border shadow-2xs"
              title="Refresh invoice data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. ACTIVE FILTER CHIPS */}
        {/* ================================================================= */}
        {activeFiltersList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
            <span className="text-xs font-medium text-muted-foreground mr-1">Active filters:</span>
            {activeFiltersList.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-muted/60 text-foreground border border-border/80 shadow-2xs animate-fadeIn"
              >
                <span className="text-muted-foreground font-normal">{chip.label}:</span>
                <span className="font-semibold">{chip.value}</span>
                <button
                  onClick={() => handleRemoveFilter(chip.key)}
                  className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={`Remove ${chip.label} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-primary hover:underline hover:text-primary/80 ml-2 cursor-pointer transition-colors"
            >
              Clear All
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 5. BULK SELECTION FLOATING ACTION BAR */}
        {/* ================================================================= */}
        {selectedIds.length > 0 && (
          <div className="sticky top-4 z-20 flex items-center justify-between p-3 px-5 bg-foreground text-background dark:bg-slate-900 dark:text-slate-100 rounded-xl shadow-xl border border-border/50 animate-slideDown">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {selectedIds.length}
              </span>
              <span className="text-sm font-semibold">
                {selectedIds.length} {selectedIds.length === 1 ? 'invoice' : 'invoices'} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleBulkDownload}
                disabled={isBulkDownloading}
                variant="primary"
                size="sm"
                className="h-8 px-4 flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm"
              >
                {isBulkDownloading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : selectedIds.length > 1 ? (
                  <FileArchive className="w-3.5 h-3.5" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>
                  {isBulkDownloading
                    ? 'Packaging...'
                    : selectedIds.length > 1
                    ? `Download PDFs as ZIP (${selectedIds.length})`
                    : 'Download PDF'}
                </span>
              </Button>

              <Button
                onClick={() => setSelectedIds([])}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-medium border-border/50 bg-background/10 text-background dark:text-slate-200 hover:bg-background/20 cursor-pointer"
              >
                Deselect All
              </Button>
            </div>
          </div>
        )}

        {/* "Select all matching results" Banner */}
        {isAllCurrentPageSelected && totalCount > invoices.length && !isAllMatchingSelected && (
          <div className="p-2.5 px-4 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center justify-between">
            <span>
              All <strong className="font-semibold">{invoices.length}</strong> invoices on this page are selected.
            </span>
            <button
              onClick={() => {
                // In bulk actions, users can perform actions on the whole dataset or page
                setIsAllMatchingSelected(true);
                toast('Selected all matching invoices for batch operations.');
              }}
              className="font-bold text-primary hover:underline cursor-pointer ml-2"
            >
              Select all {totalCount} invoices matching current filters
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 6. TABLE CONTAINER & SKELETON / EMPTY STATES */}
        {/* ================================================================= */}
        {isLoading ? (
          <TableLoader cols={8} rows={8} className="bg-surface border border-border rounded-2xl" />
        ) : isError ? (
          <Card className="p-8 text-center bg-surface border border-red-200 dark:border-red-900/50 rounded-2xl">
            <div className="inline-flex p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Failed to load invoices</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              We encountered an error fetching your tenant invoices. Please check your connection and try again.
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
              Retry Query
            </Button>
          </Card>
        ) : invoices.length === 0 ? (
          activeFiltersList.length > 0 ? (
            <EmptyState
              icon={<Filter className="w-12 h-12 text-muted-foreground/60" />}
              title="No Invoices Found"
              description="No invoices match your active filters or search parameters. Try loosening your criteria."
              actionLabel="Clear Filters"
              onActionClick={handleClearAllFilters}
            />
          ) : (
            <EmptyState
              icon={<Receipt className="w-12 h-12 text-muted-foreground/60" />}
              title="No Invoices Recorded"
              description="Create your first client tax invoice to record sales and track ledgers."
              actionLabel={canCreate ? 'New Invoice' : undefined}
              onActionClick={canCreate ? () => navigate('/invoices/new') : undefined}
            />
          )
        ) : (
          <Card className="overflow-hidden border border-border/70 shadow-xs bg-surface rounded-2xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/15 border-b border-border">
                    {/* Checkbox Header */}
                    <TableHead className="w-10 py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={handleToggleSelectAllCurrentPage}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        title="Select all on this page"
                      />
                    </TableHead>

                    {/* Invoice No */}
                    <TableHead
                      onClick={() => handleSort('invoiceNo')}
                      className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Invoice #</span>
                        {sortBy === 'invoiceNo' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Date */}
                    <TableHead
                      onClick={() => handleSort('date')}
                      className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        {sortBy === 'date' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Customer */}
                    <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Customer
                    </TableHead>

                    {/* Document Type */}
                    <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Type
                    </TableHead>

                    {/* Subtotal */}
                    <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                      Taxable
                    </TableHead>

                    {/* Tax Total */}
                    <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                      Tax
                    </TableHead>

                    {/* Grand Total */}
                    <TableHead
                      onClick={() => handleSort('grandTotal')}
                      className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right cursor-pointer hover:text-foreground select-none"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total</span>
                        {sortBy === 'grandTotal' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Balance Due */}
                    <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                      Balance Due
                    </TableHead>

                    {/* Status */}
                    <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                      Status
                    </TableHead>

                    {/* Due Date */}
                    <TableHead
                      onClick={() => handleSort('dueDate')}
                      className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Due Date</span>
                        {sortBy === 'dueDate' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Actions */}
                    <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {invoices.map((item: any) => {
                    const isSelected = selectedIds.includes(item.id);
                    const grandTotal = Number(item.grandTotal || 0);
                    const amountPaid = Number(item.amountPaid || 0);
                    const outstanding = Math.max(0, grandTotal - amountPaid);
                    const isDownloadingThis = downloadingSingleId === item.id;

                    return (
                      <TableRow
                        key={item.id}
                        className={`hover:bg-muted/35 border-b border-border/60 transition-colors ${
                          isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <TableCell className="w-10 py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(item.id)}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          />
                        </TableCell>

                        {/* Invoice No */}
                        <TableCell className="py-3.5 px-4 font-semibold text-foreground text-sm tracking-wide">
                          <button
                            onClick={() => navigate(`/invoices/${item.id}`)}
                            className="font-mono font-bold text-primary hover:underline text-left cursor-pointer"
                          >
                            {item.invoiceNo}
                          </button>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {formatIndianDate(item.date)}
                        </TableCell>

                        {/* Customer */}
                        <TableCell className="py-3.5 px-4 text-sm max-w-[220px]">
                          <div className="font-semibold text-foreground truncate" title={item.businessPartner?.name}>
                            {item.businessPartner?.name || 'N/A'}
                          </div>
                          {(item.businessPartner?.gstin || item.businessPartner?.gstNumber) ? (
                            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                              GST: {item.businessPartner?.gstin || item.businessPartner?.gstNumber}
                            </div>
                          ) : item.businessPartner?.phone ? (
                            <div className="text-[10px] text-muted-foreground">
                              {item.businessPartner.phone}
                            </div>
                          ) : null}
                        </TableCell>

                        {/* Document Type */}
                        <TableCell className="py-3.5 px-4">
                          {renderDocumentTypeBadge(item.invoiceType)}
                        </TableCell>

                        {/* Subtotal */}
                        <TableCell className="py-3.5 px-4 text-xs text-right text-muted-foreground font-mono">
                          ₹{formatIndianCurrency(Number(item.subTotal || 0))}
                        </TableCell>

                        {/* Tax */}
                        <TableCell className="py-3.5 px-4 text-xs text-right text-muted-foreground font-mono">
                          ₹{formatIndianCurrency(Number(item.taxTotal || 0))}
                        </TableCell>

                        {/* Grand Total */}
                        <TableCell className="py-3.5 px-4 text-sm text-right font-bold text-foreground font-mono whitespace-nowrap">
                          ₹{formatIndianCurrency(grandTotal)}
                        </TableCell>

                        {/* Balance Due */}
                        <TableCell
                          className={`py-3.5 px-4 text-sm text-right font-bold font-mono whitespace-nowrap ${
                            outstanding > 0.01 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                          }`}
                        >
                          ₹{formatIndianCurrency(outstanding)}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5 px-4 text-center whitespace-nowrap">
                          {renderStatusBadge(item)}
                        </TableCell>

                        {/* Due Date */}
                        <TableCell className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {formatIndianDate(item.dueDate)}
                        </TableCell>

                        {/* Row Actions */}
                        <TableCell className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Action */}
                            <Button
                              onClick={() => navigate(`/invoices/${item.id}`)}
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 flex items-center gap-1 hover:bg-muted/80 text-foreground border-border/80 shadow-2xs cursor-pointer text-xs"
                              title="View Invoice Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">View</span>
                            </Button>

                            {/* Download PDF Action */}
                            <Button
                              onClick={() => handleDownloadSinglePdf(item.id, item.invoiceNo)}
                              disabled={isDownloadingThis}
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 flex items-center gap-1 hover:bg-muted/80 text-foreground border-border/80 shadow-2xs cursor-pointer text-xs"
                              title="Download PDF"
                            >
                              {isDownloadingThis ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                              ) : (
                                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </Button>

                            {/* Print Action */}
                            <Button
                              onClick={() => window.open(`/invoices/${item.id}/print`, '_blank')}
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 flex items-center hover:bg-muted/80 text-foreground border-border/80 shadow-2xs cursor-pointer text-xs"
                              title="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* ============================================================= */}
            {/* 7. PAGINATION CONTROLS */}
            {/* ============================================================= */}
            <div className="bg-muted/10 border-t border-border p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left: Total & Page Size */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Showing{' '}
                  <strong className="text-foreground">
                    {totalCount === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, totalCount)}
                  </strong>{' '}
                  of <strong className="text-foreground">{totalCount}</strong> invoices
                </span>

                <div className="flex items-center gap-1.5">
                  <span>Per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => updateUrlParams({ limit: e.target.value, page: '1' })}
                    className="h-8 text-xs bg-surface border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary text-foreground cursor-pointer"
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>

              {/* Right: Page Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => updateUrlParams({ page: String(Math.max(1, page - 1)) })}
                  disabled={page <= 1}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs flex items-center gap-1 border-border shadow-2xs disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>

                <span className="text-xs font-semibold px-2 text-foreground">
                  Page {page} of {totalPages}
                </span>

                <Button
                  onClick={() => updateUrlParams({ page: String(Math.min(totalPages, page + 1)) })}
                  disabled={page >= totalPages}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs flex items-center gap-1 border-border shadow-2xs disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ================================================================= */}
        {/* 8. ADVANCED FILTER DRAWER / SHEET */}
        {/* ================================================================= */}
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
            {/* Backdrop */}
            <div
              onClick={() => setIsFilterDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            />

            {/* Slide-over Sheet Panel */}
            <div className="relative w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col z-10 h-full overflow-hidden animate-slideLeft">
              {/* Drawer Header */}
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-base text-foreground">Advanced Invoice Filters</h3>
                </div>
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
                {/* 1. Document Category / Invoice Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Document Category
                  </label>
                  <select
                    value={drawerDocType}
                    onChange={(e) => setDrawerDocType(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Tax Treatment / Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Tax Treatment
                  </label>
                  <select
                    value={drawerTaxMode}
                    onChange={(e) => setDrawerTaxMode(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                  >
                    {TAX_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Customer Combobox Lookup */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Customer Lookup
                  </label>
                  {drawerCustomerId ? (
                    <div className="flex items-center justify-between p-2.5 px-3 bg-muted/40 border border-border rounded-xl">
                      <div className="truncate">
                        <div className="font-semibold text-foreground text-xs">{drawerCustomerName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">ID: {drawerCustomerId}</div>
                      </div>
                      <button
                        onClick={() => {
                          setDrawerCustomerId('');
                          setDrawerCustomerName('');
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Remove customer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setIsCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        placeholder="Search client by name, phone, or GST..."
                        className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                      />
                      {isCustomerDropdownOpen && (
                        <div className="absolute left-0 right-0 top-11 z-30 max-h-48 overflow-y-auto bg-surface border border-border rounded-xl shadow-lg divide-y divide-border/60">
                          {isCustomerSearching ? (
                            <div className="p-3 text-xs text-muted-foreground text-center">Searching customers...</div>
                          ) : customerSearchResults && customerSearchResults.length > 0 ? (
                            customerSearchResults.map((c: any) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setDrawerCustomerId(c.id);
                                  setDrawerCustomerName(c.name || c.displayName);
                                  setIsCustomerDropdownOpen(false);
                                  setCustomerSearchQuery('');
                                }}
                                className="w-full p-2.5 px-3 text-left hover:bg-muted/50 flex flex-col text-xs cursor-pointer"
                              >
                                <span className="font-semibold text-foreground">{c.name || c.displayName}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {c.phone ? `Phone: ${c.phone}` : ''}{' '}
                                  {(c.gstin || c.gstNumber) ? `• GST: ${c.gstin || c.gstNumber}` : ''}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-xs text-muted-foreground text-center">
                              No matching customers found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Invoice Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Document Status
                  </label>
                  <select
                    value={drawerStatus}
                    onChange={(e) => setDrawerStatus(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                  >
                    {INVOICE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Payment Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Payment Status
                  </label>
                  <select
                    value={drawerPaymentStatus}
                    onChange={(e) => setDrawerPaymentStatus(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                  >
                    {PAYMENT_STATUSES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Date Range Filter & Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Date Filter Presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleDatePresetSelect(preset.id)}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                          drawerDatePreset === preset.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/30 border-border text-foreground hover:bg-muted/60'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] text-muted-foreground">From Date</label>
                      <input
                        type="date"
                        value={drawerFromDate}
                        onChange={(e) => {
                          setDrawerFromDate(e.target.value);
                          setDrawerDatePreset('custom');
                        }}
                        className="w-full h-9 px-2.5 text-xs bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">To Date</label>
                      <input
                        type="date"
                        value={drawerToDate}
                        onChange={(e) => {
                          setDrawerToDate(e.target.value);
                          setDrawerDatePreset('custom');
                        }}
                        className="w-full h-9 px-2.5 text-xs bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* 7. Amount Range */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Grand Total Range (₹)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={drawerMinAmount}
                      onChange={(e) => setDrawerMinAmount(e.target.value)}
                      className="w-full h-9 px-2.5 text-xs bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Max ₹"
                      value={drawerMaxAmount}
                      onChange={(e) => setDrawerMaxAmount(e.target.value)}
                      className="w-full h-9 px-2.5 text-xs bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-muted/10">
                <Button
                  onClick={resetDrawerFilters}
                  variant="outline"
                  size="sm"
                  className="px-4 text-xs font-medium"
                >
                  Reset
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsFilterDrawerOpen(false)}
                    variant="outline"
                    size="sm"
                    className="px-3 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={applyDrawerFilters}
                    variant="primary"
                    size="sm"
                    className="px-5 text-xs font-semibold shadow-sm"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
