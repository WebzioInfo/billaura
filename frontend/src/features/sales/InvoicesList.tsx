import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  FileSpreadsheet,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import {
  KpiCard,
  StatusBadge,
  TypeBadge,
  RowActions,
  Pagination,
  TableSkeleton,
  FiltersDrawer,
  FilterBar,
  ColumnVisibilityMenu,
  PageHeader,
  Button,
  ConfirmDialog,
} from '@/shared/components/ui';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import apiClient from '@/core/api';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { cn } from '@/lib/utils';
import { downloadInvoicePdf, printInvoicePdf } from '@/shared/utils/invoicePdf';
import { erpInvalidate } from '@/core/query/erpConsistency';

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
];

const TAX_MODES = [
  { value: '', label: 'All Tax Treatments' },
  { value: 'CGST_SGST', label: 'Regular GST (CGST + SGST)' },
  { value: 'IGST', label: 'Interstate GST (IGST)' },
  { value: 'NO_TAX', label: 'Non-GST / Exempt' },
];

const QUICK_STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'SENT', label: 'Issued' },
  { id: 'PARTIAL', label: 'Partially Paid' },
  { id: 'PAID', label: 'Paid' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'ARCHIVED', label: 'Archived' },
];

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: '7d' },
  { id: 'this_month', label: '30d' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'this_fy', label: 'This FY' },
  { id: 'custom', label: 'Custom' },
];

const INITIAL_COLUMNS = [
  { id: 'invoiceNo', label: 'Invoice #', visible: true, required: true },
  { id: 'date', label: 'Date', visible: true },
  { id: 'customer', label: 'Customer', visible: true },
  { id: 'type', label: 'Type', visible: true },
  { id: 'taxable', label: 'Taxable', visible: true },
  { id: 'total', label: 'Total', visible: true },
  { id: 'balanceDue', label: 'Balance Due', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'dueDate', label: 'Due Date', visible: true },
  { id: 'actions', label: 'Actions', visible: true, required: true },
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

const getDueDateHint = (dueDateStr?: string | Date, isPaid = false) => {
  if (isPaid || !dueDateStr) return null;
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return {
      text: `${days}d overdue`,
      type: 'overdue' as const,
    };
  }
  if (diffDays === 0) {
    return { text: 'Due today', type: 'today' as const };
  }
  if (diffDays <= 7) {
    return {
      text: `Due in ${diffDays}d`,
      type: 'soon' as const,
    };
  }
  return { text: `Due in ${diffDays}d`, type: 'normal' as const };
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
  if (preset === 'this_week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
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
// MAIN INVOICES LIST COMPONENT
// ============================================================================

export const InvoicesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const [invoiceToRestore, setInvoiceToRestore] = useState<any | null>(null);
  const [invoiceToDeletePermanently, setInvoiceToDeletePermanently] = useState<any | null>(null);

  // Session & Permissions
  const user = useSessionStore((state) => state.user);
  const permissions = useSessionStore((state) => state.permissions);
  const canCreate =
    user?.globalRole === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    permissions?.includes('sales.create' as any);
  const canDelete =
    user?.globalRole === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    permissions?.includes('sales.delete' as any) ||
    permissions?.includes('sales.invoices.delete' as any) ||
    !permissions ||
    permissions.length === 0;

  // --------------------------------------------------------------------------
  // URL QUERY STATE
  // --------------------------------------------------------------------------
  const search = searchParams.get('search') || '';
  const documentType = searchParams.get('documentType') || '';
  const taxMode = searchParams.get('taxMode') || '';
  const customerId = searchParams.get('customerId') || '';
  const customerNameParam = searchParams.get('customerName') || '';
  const status = searchParams.get('status') || '';
  const datePreset = searchParams.get('datePreset') || '';
  const fromDate = searchParams.get('fromDate') || '';
  const toDate = searchParams.get('toDate') || '';
  const minAmount = searchParams.get('minAmount') || '';
  const maxAmount = searchParams.get('maxAmount') || '';
  const sortBy = searchParams.get('sortBy') || 'date';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '25', 10);

  // UI Density & Columns configuration
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem('invoices_table_density') as 'comfortable' | 'compact') || 'comfortable';
  });
  const [columns, setColumns] = useState(INITIAL_COLUMNS);

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

  // Action Loading states
  const [isExporting, setIsExporting] = useState(false);
  const [downloadingSingleId, setDownloadingSingleId] = useState<string | null>(null);
  const [printingSingleId, setPrintingSingleId] = useState<string | null>(null);

  // Sync density changes to localStorage
  const handleDensityChange = (newDensity: 'comfortable' | 'compact') => {
    setDensity(newDensity);
    localStorage.setItem('invoices_table_density', newDensity);
  };

  // Sync search input when URL changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Keyboard shortcut "N" for New Invoice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'n' || e.key === 'N') &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        if (canCreate) {
          e.preventDefault();
          navigate('/invoices/new');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canCreate, navigate]);

  // Handle Search Input Change with 350ms debounce
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      updateUrlParams({ search: val, page: '1' });
    }, 350);
  };

  // Helper to update URL params cleanly
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') {
        nextParams.delete(k);
      } else {
        nextParams.set(k, v);
      }
    });
    setSearchParams(nextParams, { replace: true });
  };

  // --------------------------------------------------------------------------
  // API QUERIES
  // --------------------------------------------------------------------------

  // 1. Invoices List Query
  const {
    data: invoicesResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      'invoices',
      search,
      documentType,
      taxMode,
      customerId,
      status,
      fromDate,
      toDate,
      minAmount,
      maxAmount,
      sortBy,
      sortOrder,
      page,
      limit,
    ],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
      if (search) params.search = search;
      if (documentType) params.documentType = documentType;
      if (taxMode) params.taxMode = taxMode;
      if (customerId) params.customerId = customerId;
      if (status) params.status = status;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;

      const res = await apiClient.get('/sales/invoices', { params });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const invoices = useMemo(() => {
    if (!invoicesResponse) return [];
    if (Array.isArray(invoicesResponse.data)) return invoicesResponse.data;
    if (Array.isArray(invoicesResponse.data?.data)) return invoicesResponse.data.data;
    if (Array.isArray(invoicesResponse.data?.items)) return invoicesResponse.data.items;
    if (Array.isArray(invoicesResponse.items)) return invoicesResponse.items;
    if (Array.isArray(invoicesResponse)) return invoicesResponse;
    return [];
  }, [invoicesResponse]);

  const meta = invoicesResponse?.meta || invoicesResponse?.data?.meta || {};
  const totalCount = meta.total ?? meta.totalItems ?? invoices.length;
  const totalPages = meta.totalPages || Math.ceil(totalCount / limit) || 1;

  // 2. Summary KPI Query
  const { data: summaryResponse, isLoading: isSummaryLoading } = useQuery({
    queryKey: [
      'invoices-summary',
      search,
      documentType,
      taxMode,
      customerId,
      fromDate,
      toDate,
      minAmount,
      maxAmount,
    ],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (documentType) params.documentType = documentType;
      if (taxMode) params.taxMode = taxMode;
      if (customerId) params.customerId = customerId;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;

      const res = await apiClient.get('/sales/invoices/summary', { params });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const summaryData = summaryResponse?.data || {};

  // 3. Customer Search Query for Filters Drawer
  const { data: customerSearchResponse } = useQuery({
    queryKey: ['customers-search', customerSearchQuery],
    queryFn: async () => {
      if (!customerSearchQuery.trim()) return [];
      const res = await apiClient.get('/customers', {
        params: { search: customerSearchQuery, limit: 15 },
      });
      return res.data?.data || res.data || [];
    },
    enabled: isFilterDrawerOpen && isCustomerDropdownOpen,
  });

  const customerSearchResults = useMemo(() => {
    if (!customerSearchResponse) return [];
    if (Array.isArray(customerSearchResponse)) return customerSearchResponse;
    if (Array.isArray(customerSearchResponse.data)) return customerSearchResponse.data;
    return [];
  }, [customerSearchResponse]);

  // --------------------------------------------------------------------------
  // LIVE STATUS COUNTS FOR SEGMENTED CONTROL
  // --------------------------------------------------------------------------
  const statusTabsWithCounts = useMemo(() => {
    const counts = summaryData?.statusCounts || {};
    return QUICK_STATUS_TABS.map((tab) => {
      let count: number | undefined = undefined;
      if (tab.id === '') count = counts.ALL ?? summaryData?.totalInvoices;
      else if (tab.id === 'SENT') count = counts.SENT ?? counts.ISSUED;
      else if (tab.id === 'PARTIAL') count = counts.PARTIAL ?? counts.PARTIALLY_PAID;
      else if (tab.id === 'PAID') count = counts.PAID;
      else if (tab.id === 'OVERDUE') count = counts.OVERDUE ?? summaryData?.overdueCount;
      else if (tab.id === 'DRAFT') count = counts.DRAFT;
      else if (tab.id === 'ARCHIVED') count = counts.ARCHIVED;

      return {
        ...tab,
        count: typeof count === 'number' ? count : undefined,
      };
    });
  }, [summaryData]);

  // --------------------------------------------------------------------------
  // ACTIVE REMOVABLE FILTER CHIPS
  // --------------------------------------------------------------------------
  const activeFiltersList = useMemo(() => {
    const list: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

    if (search) {
      list.push({
        key: 'search',
        label: 'Search',
        value: search,
        onRemove: () => {
          setSearchInput('');
          updateUrlParams({ search: null, page: '1' });
        },
      });
    }

    if (status) {
      const match = QUICK_STATUS_TABS.find((t) => t.id === status);
      list.push({
        key: 'status',
        label: 'Status',
        value: match ? match.label : status,
        onRemove: () => updateUrlParams({ status: null, page: '1' }),
      });
    }

    if (documentType) {
      const match = DOCUMENT_TYPES.find((d) => d.value === documentType);
      list.push({
        key: 'documentType',
        label: 'Type',
        value: match ? match.label : documentType,
        onRemove: () => updateUrlParams({ documentType: null, page: '1' }),
      });
    }

    if (taxMode) {
      const match = TAX_MODES.find((m) => m.value === taxMode);
      list.push({
        key: 'taxMode',
        label: 'Tax',
        value: match ? match.label : taxMode,
        onRemove: () => updateUrlParams({ taxMode: null, page: '1' }),
      });
    }

    if (customerId) {
      list.push({
        key: 'customer',
        label: 'Customer',
        value: customerNameParam || 'Selected Client',
        onRemove: () => updateUrlParams({ customerId: null, customerName: null, page: '1' }),
      });
    }

    if (datePreset) {
      const match = DATE_PRESETS.find((p) => p.id === datePreset);
      list.push({
        key: 'datePreset',
        label: 'Date',
        value: match ? match.label : datePreset,
        onRemove: () =>
          updateUrlParams({ datePreset: null, fromDate: null, toDate: null, page: '1' }),
      });
    } else if (fromDate || toDate) {
      list.push({
        key: 'customDate',
        label: 'Date Range',
        value: `${fromDate || 'Start'} to ${toDate || 'Now'}`,
        onRemove: () => updateUrlParams({ fromDate: null, toDate: null, page: '1' }),
      });
    }

    if (minAmount || maxAmount) {
      list.push({
        key: 'amountRange',
        label: 'Amount',
        value: `₹${minAmount || '0'} – ₹${maxAmount || '∞'}`,
        onRemove: () => updateUrlParams({ minAmount: null, maxAmount: null, page: '1' }),
      });
    }

    return list;
  }, [
    search,
    status,
    documentType,
    taxMode,
    customerId,
    customerNameParam,
    datePreset,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
  ]);

  const handleClearAllFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams({ page: '1', limit: String(limit) }), { replace: true });
  };

  // --------------------------------------------------------------------------
  // DRAWER FILTER MANAGEMENT
  // --------------------------------------------------------------------------
  const openFilterDrawer = () => {
    setDrawerDocType(documentType);
    setDrawerTaxMode(taxMode);
    setDrawerCustomerId(customerId);
    setDrawerCustomerName(customerNameParam);
    setDrawerStatus(status);
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
    setDrawerDatePreset('');
    setDrawerFromDate('');
    setDrawerToDate('');
    setDrawerMinAmount('');
    setDrawerMaxAmount('');
  };

  // --------------------------------------------------------------------------
  // SORTING & COLUMNS
  // --------------------------------------------------------------------------
  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateUrlParams({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateUrlParams({ sortBy: field, sortOrder: 'desc' });
    }
  };

  const handleToggleColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, visible: !c.visible } : c))
    );
  };

  const isColVisible = (colId: string) => {
    const found = columns.find((c) => c.id === colId);
    return found ? found.visible : true;
  };

  // --------------------------------------------------------------------------
  // ROW SELECTION & BULK ACTIONS
  // --------------------------------------------------------------------------
  const currentPageIds = useMemo(() => invoices.map((inv: any) => inv.id), [invoices]);

  const isAllCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id: string) => selectedIds.includes(id));

  const isSomeCurrentPageSelected =
    currentPageIds.some((id: string) => selectedIds.includes(id)) &&
    !isAllCurrentPageSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeCurrentPageSelected;
    }
  }, [isSomeCurrentPageSelected]);

  const handleToggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk PDF download individually
  const handleBulkDownloadIndividually = async () => {
    if (selectedIds.length === 0) return;
    toast.loading(`Downloading ${selectedIds.length} invoice PDF(s)...`, { id: 'bulk-dl' });
    try {
      for (const id of selectedIds) {
        const item = invoices.find((inv: any) => inv.id === id);
        const invNo = item?.invoiceNo || id;
        try {
          await downloadInvoicePdf(id, invNo);
        } catch (err) {
          console.error(`Failed to download PDF for invoice ${invNo}`, err);
        }
      }
      toast.success(`Completed downloading ${selectedIds.length} invoice PDF(s)`, {
        id: 'bulk-dl',
      });
    } catch {
      toast.error('Encountered an issue downloading invoice PDFs', { id: 'bulk-dl' });
    }
  };

  // Single PDF download
  const handleDownloadSinglePdf = async (id: string, invoiceNo: string) => {
    if (downloadingSingleId) return;
    setDownloadingSingleId(id);
    const toastId = toast.loading(`Preparing PDF for ${invoiceNo}...`);
    try {
      await downloadInvoicePdf(id, invoiceNo);
      toast.success(`Downloaded ${invoiceNo}.pdf`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || `Failed to download ${invoiceNo}.pdf`, { id: toastId });
    } finally {
      setDownloadingSingleId(null);
    }
  };

  // Single PDF print
  const handlePrintSinglePdf = async (id: string, invoiceNo: string) => {
    if (printingSingleId) return;
    setPrintingSingleId(id);
    const toastId = toast.loading(`Preparing ${invoiceNo} for printing...`);
    try {
      await printInvoicePdf(id);
      toast.dismiss(toastId);
    } catch (err: any) {
      toast.error(err.message || `Failed to prepare print for ${invoiceNo}`, { id: toastId });
    } finally {
      setPrintingSingleId(null);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Exporting invoices to CSV...');
    try {
      const params: Record<string, any> = { format: 'csv' };
      if (search) params.search = search;
      if (documentType) params.documentType = documentType;
      if (taxMode) params.taxMode = taxMode;
      if (customerId) params.customerId = customerId;
      if (status) params.status = status;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;

      const res = await apiClient.get('/sales/invoices/export', {
        params,
        responseType: 'blob',
      });
      downloadBlob(res.data, `Invoices-Export-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Invoices exported successfully', { id: toastId });
    } catch {
      toast.error('Failed to export invoices CSV', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // --------------------------------------------------------------------------
  // STATUS HELPER FOR TABLE ROWS
  // --------------------------------------------------------------------------
  const getResolvedStatus = (item: any) => {
    if (item.deletedAt) {
      return 'ARCHIVED';
    }
    if (item.status === 'CANCELLED' || item.status === 'VOID') {
      return 'CANCELLED';
    }
    if (item.status === 'DRAFT') {
      return 'DRAFT';
    }

    const grandTotal = Number(item.grandTotal || 0) - Number(item.roundOff || 0);
    const amountPaid = Number(item.amountPaid || 0);
    const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && amountPaid < grandTotal;

    if (amountPaid >= grandTotal && grandTotal > 0) {
      return 'PAID';
    }
    if (amountPaid > 0 && amountPaid < grandTotal) {
      return 'PARTIAL';
    }
    if (isOverdue) {
      return 'OVERDUE';
    }
    return 'SENT';
  };

  // Row height based on density
  const rowHeightClass = density === 'compact' ? 'h-10' : 'h-[52px]';

  return (
    <PageLayout
      isLoading={isLoading && !invoicesResponse}
      loadingTitle="Loading Invoices..."
      loadingDescription="Fetching invoices and financial metrics..."
      isError={isError && !invoicesResponse}
      errorMessage="Failed to retrieve invoice records from server."
      onRetry={() => refetch()}
    >
      {/* 1. STANDARDIZED PAGE HEADER + ACTIONS */}
      <PageHeader
        title="Invoices"
        count={totalCount}
        secondaryAction={
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>
        }
        primaryAction={
          canCreate ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/invoices/new')}
            >
              <Plus className="w-4 h-4" />
              <span>New Invoice</span>
            </Button>
          ) : null
        }
      />

      {/* =================================================================== */}
      {/* 2. FLAT MINIMAL KPI CARDS */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0 mt-3">
        <KpiCard
          label="Matching"
          value={(summaryData?.totalInvoices || 0).toLocaleString('en-IN')}
          helperText="Total filtered invoices"
          isLoading={isSummaryLoading}
        />
        <KpiCard
          label="Total Amount"
          value={`₹${formatIndianCurrency(Number(summaryData?.totalAmount || 0))}`}
          helperText="Gross billing value"
          isLoading={isSummaryLoading}
        />
        <KpiCard
          label="Collected"
          value={`₹${formatIndianCurrency(Number(summaryData?.paidAmount || 0))}`}
          helperText="Settled receipts"
          indicatorDot="collected"
          isLoading={isSummaryLoading}
        />
        <KpiCard
          label="Outstanding"
          value={`₹${formatIndianCurrency(Number(summaryData?.unpaidAmount || 0))}`}
          helperText="Due balance"
          indicatorDot="outstanding"
          isLoading={isSummaryLoading}
        />
        <KpiCard
          label="Overdue"
          value={(summaryData?.overdueCount || 0).toLocaleString('en-IN')}
          helperText="Past due date count"
          indicatorDot="overdue"
          isLoading={isSummaryLoading}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* =================================================================== */}
      {/* 3. TOOLBAR (SEARCH, STATUS TABS, MORE FILTERS, DENSITY, COLUMNS) */}
      {/* =================================================================== */}
      <div className="shrink-0 mt-3">
        <FilterBar
          search={searchInput}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search invoice or customer..."
          statusTabs={statusTabsWithCounts}
          activeStatus={status}
          onStatusChange={(id) => updateUrlParams({ status: id, page: '1' })}
          documentTypes={DOCUMENT_TYPES}
          activeDocType={documentType}
          onDocTypeChange={(dt) => updateUrlParams({ documentType: dt, page: '1' })}
          datePresets={DATE_PRESETS}
          activeDatePreset={datePreset}
          onDatePresetChange={(dp) => {
            if (dp === 'custom') {
              openFilterDrawer();
            } else {
              const range = calculateDatePreset(dp);
              updateUrlParams({
                datePreset: dp,
                fromDate: range ? range.fromDate : null,
                toDate: range ? range.toDate : null,
                page: '1',
              });
            }
          }}
          onOpenMoreFilters={openFilterDrawer}
          moreFiltersCount={activeFiltersList.length}
          activeFilters={activeFiltersList}
          onClearAllFilters={handleClearAllFilters}
          selectedCount={selectedIds.length}
          onBulkDownloadPdf={handleBulkDownloadIndividually}
          onBulkSendReminder={() =>
            toast.success(`Payment reminders queued for ${selectedIds.length} invoice(s)`)
          }
          onBulkMarkPaid={() =>
            toast.success(`${selectedIds.length} invoice(s) marked as paid`)
          }
          onClearSelection={() => setSelectedIds([])}
          density={density}
          onDensityChange={handleDensityChange}
          columnVisibilityTrigger={
            <ColumnVisibilityMenu
              columns={columns}
              onToggleColumn={handleToggleColumn}
            />
          }
        />
      </div>

      {/* =================================================================== */}
      {/* 4. TABLE CONTAINER (Table V01 Reference Style) */}
      {/* =================================================================== */}
      <div className="flex-1 min-h-0 flex flex-col bg-surface dark:bg-[#17161C] border border-[#E8E8EC] dark:border-[#26262A] rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden mt-3">
        {isLoading ? (
          <div className="flex-1 overflow-auto">
            <TableSkeleton
              rows={10}
              cols={columns.filter((c) => c.visible).length}
              density={density}
            />
          </div>
        ) : isError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#DC2626] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#EDEDED]">
              Failed to load invoices
            </h3>
            <p className="text-[13px] text-[#555555] dark:text-[#A1A1AA] max-w-sm">
              We encountered an issue loading your invoices. Please retry.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 px-3.5 py-1.5 rounded-[6px] border border-[#D1D5DB] dark:border-[#374151] text-[13px] font-medium hover:bg-[#F3F4F6] dark:hover:bg-[#26262A] cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[14px] text-[#555555] dark:text-[#A1A1AA] space-y-3">
            <p className="text-[15px] font-medium text-[#111827] dark:text-[#EDEDED]">
              No invoices found
            </p>
            {activeFiltersList.length > 0 ? (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="px-3 py-1.5 rounded-[6px] bg-[#34303F] text-white hover:bg-[#25222E] dark:bg-[#EDEDED] dark:text-[#0A0A0A] text-[13px] font-medium cursor-pointer"
              >
                Clear filters
              </button>
            ) : canCreate ? (
              <button
                type="button"
                onClick={() => navigate('/invoices/new')}
                className="px-3.5 py-1.5 rounded-[6px] bg-[#34303F] text-white hover:bg-[#25222E] dark:bg-[#EDEDED] dark:text-[#0A0A0A] text-[13px] font-medium cursor-pointer"
              >
                Create Invoice
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Scrollable Table */}
            <div className="hidden sm:block flex-1 min-h-0 overflow-auto scrollbar-thin">
              <table className="w-full border-collapse text-left">
                {/* Dark Header Bar (56px, #34303F, white text 14px 500 weight, no uppercase, sticky) */}
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#34303F] dark:bg-[#1E1C26] text-white select-none h-14">
                    {/* Checkbox Header */}
                    <th
                      scope="col"
                      className="w-12 pl-6 pr-3 py-3 text-center sticky left-0 z-20 bg-[#34303F] dark:bg-[#1E1C26]"
                    >
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={handleToggleSelectAllCurrentPage}
                        className="rounded-[4px] border-white/60 bg-transparent text-[#34303F] accent-white h-4 w-4 cursor-pointer"
                        title="Select all on this page"
                        aria-label="Select all on this page"
                      />
                    </th>

                    {/* Invoice No */}
                    {isColVisible('invoiceNo') && (
                      <th
                        scope="col"
                        onClick={() => handleSort('invoiceNo')}
                        className="px-4 py-3 text-[14px] font-medium text-white cursor-pointer hover:text-white/90 select-none sticky left-12 z-20 bg-[#34303F] dark:bg-[#1E1C26] group"
                        aria-sort={sortBy === 'invoiceNo' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Invoice #</span>
                          <span className={cn('transition-opacity', sortBy === 'invoiceNo' ? 'opacity-100' : 'opacity-0 group-hover:opacity-70')}>
                            {sortBy === 'invoiceNo' && sortOrder === 'desc' ? (
                              <ChevronDown className="w-4 h-4 text-white" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-white" />
                            )}
                          </span>
                        </div>
                      </th>
                    )}

                    {/* Date */}
                    {isColVisible('date') && (
                      <th
                        scope="col"
                        onClick={() => handleSort('date')}
                        className="px-4 py-3 text-[14px] font-medium text-white cursor-pointer hover:text-white/90 select-none group"
                        aria-sort={sortBy === 'date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Date</span>
                          <span className={cn('transition-opacity', sortBy === 'date' ? 'opacity-100' : 'opacity-0 group-hover:opacity-70')}>
                            {sortBy === 'date' && sortOrder === 'desc' ? (
                              <ChevronDown className="w-4 h-4 text-white" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-white" />
                            )}
                          </span>
                        </div>
                      </th>
                    )}

                    {/* Customer (Flexible width) */}
                    {isColVisible('customer') && (
                      <th scope="col" className="px-4 py-3 text-[14px] font-medium text-white">
                        Customer
                      </th>
                    )}

                    {/* Type */}
                    {isColVisible('type') && (
                      <th scope="col" className="px-4 py-3 text-[14px] font-medium text-white">
                        Type
                      </th>
                    )}

                    {/* Taxable */}
                    {isColVisible('taxable') && (
                      <th scope="col" className="px-4 py-3 text-[14px] font-medium text-white text-right">
                        Taxable
                      </th>
                    )}

                    {/* Total */}
                    {isColVisible('total') && (
                      <th
                        scope="col"
                        onClick={() => handleSort('grandTotal')}
                        className="px-4 py-3 text-[14px] font-medium text-white text-right cursor-pointer hover:text-white/90 select-none group"
                        aria-sort={sortBy === 'grandTotal' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Total</span>
                          <span className={cn('transition-opacity', sortBy === 'grandTotal' ? 'opacity-100' : 'opacity-0 group-hover:opacity-70')}>
                            {sortBy === 'grandTotal' && sortOrder === 'desc' ? (
                              <ChevronDown className="w-4 h-4 text-white" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-white" />
                            )}
                          </span>
                        </div>
                      </th>
                    )}

                    {/* Balance Due */}
                    {isColVisible('balanceDue') && (
                      <th scope="col" className="px-4 py-3 text-[14px] font-medium text-white text-right">
                        Balance Due
                      </th>
                    )}

                    {/* Status */}
                    {isColVisible('status') && (
                      <th scope="col" className="px-4 py-3 text-[14px] font-medium text-white text-center">
                        Status
                      </th>
                    )}

                    {/* Due Date */}
                    {isColVisible('dueDate') && (
                      <th
                        scope="col"
                        onClick={() => handleSort('dueDate')}
                        className="px-4 py-3 text-[14px] font-medium text-white cursor-pointer hover:text-white/90 select-none group"
                        aria-sort={sortBy === 'dueDate' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Due Date</span>
                          <span className={cn('transition-opacity', sortBy === 'dueDate' ? 'opacity-100' : 'opacity-0 group-hover:opacity-70')}>
                            {sortBy === 'dueDate' && sortOrder === 'desc' ? (
                              <ChevronDown className="w-4 h-4 text-white" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-white" />
                            )}
                          </span>
                        </div>
                      </th>
                    )}

                    {/* Actions (Matches header perfectly) */}
                    {isColVisible('actions') && (
                      <th scope="col" className="w-36 pl-3 pr-6 py-3 text-[14px] font-medium text-white text-right sticky right-0 z-20 bg-[#34303F] dark:bg-[#1E1C26]">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>

                {/* Table Body (Zebra rows: odd white, even #F5F5F5, hover #EFEFF1) */}
                <tbody>
                  {invoices.map((item: any, rowIdx: number) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isEven = rowIdx % 2 === 1;
                    const grandTotal = Number(item.grandTotal || 0);
                    const amountPaid = Number(item.amountPaid || 0);
                    const outstanding = Math.max(0, grandTotal - amountPaid);
                    const resolvedStatus = getResolvedStatus(item);
                    const isPaid = resolvedStatus === 'PAID';
                    const isOverdue = resolvedStatus === 'OVERDUE';
                    const isCancelled = resolvedStatus === 'CANCELLED';
                    const dueDateHint = getDueDateHint(item.dueDate, isPaid);
                    const isDownloadingThis = downloadingSingleId === item.id;

                    // Row background classes for zebra + hover + selected
                    const rowBgClass = isSelected
                      ? 'bg-[#ECECF1] dark:bg-[#2B2A36]'
                      : isEven
                      ? 'bg-[#F5F5F5] dark:bg-[#1C1B22] hover:bg-[#EFEFF1] dark:hover:bg-[#24232C]'
                      : 'bg-white dark:bg-[#17161C] hover:bg-[#EFEFF1] dark:hover:bg-[#24232C]';

                    // Sticky cell background classes to keep zebra pattern seamless
                    const stickyCellBgClass = isSelected
                      ? 'bg-[#ECECF1] dark:bg-[#2B2A36]'
                      : isEven
                      ? 'bg-[#F5F5F5] dark:bg-[#1C1B22] group-hover:bg-[#EFEFF1] dark:group-hover:bg-[#24232C]'
                      : 'bg-white dark:bg-[#17161C] group-hover:bg-[#EFEFF1] dark:group-hover:bg-[#24232C]';

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'group transition-colors duration-120 text-[14px]',
                          rowHeightClass,
                          rowBgClass
                        )}
                      >
                        {/* Checkbox */}
                        <td
                          className={cn(
                            'w-12 pl-6 pr-3 py-2 text-center sticky left-0 z-10 transition-colors duration-120',
                            stickyCellBgClass
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(item.id)}
                            className="rounded-[4px] border-[#D1D5DB] dark:border-[#374151] text-[#34303F] accent-[#34303F] dark:accent-[#EDEDED] h-4 w-4 cursor-pointer"
                            aria-label={`Select invoice ${item.invoiceNo}`}
                          />
                        </td>

                        {/* Invoice # (Dark ink #1F2937, 500 weight, underline on hover only) */}
                        {isColVisible('invoiceNo') && (
                          <td
                            className={cn(
                              'px-4 py-2 font-medium tabular-nums sticky left-12 z-10 whitespace-nowrap transition-colors duration-120 text-[#1F2937] dark:text-[#EDEDED]',
                              stickyCellBgClass
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => navigate(`/invoices/${item.id}`)}
                              className={cn(
                                'text-[#1F2937] dark:text-[#EDEDED] hover:underline text-left cursor-pointer transition-colors',
                                isCancelled && 'line-through text-[#6B7280]'
                              )}
                            >
                              {item.invoiceNo}
                            </button>
                          </td>
                        )}

                        {/* Date (Grey #555555) */}
                        {isColVisible('date') && (
                          <td className="px-4 py-2 text-[#555555] dark:text-[#A1A1AA] whitespace-nowrap font-normal">
                            {formatIndianDate(item.date)}
                          </td>
                        )}

                        {/* Customer (Ink #1F2937, 500 weight, name only, flex-grow) */}
                        {isColVisible('customer') && (
                          <td
                            className="px-4 py-2 font-medium text-[#1F2937] dark:text-[#EDEDED] truncate max-w-[280px] w-full"
                            title={item.businessPartner?.name || 'Customer'}
                          >
                            <span className="truncate block">
                              {item.businessPartner?.name || 'Unknown Customer'}
                            </span>
                          </td>
                        )}

                        {/* Type (<TypeBadge />) */}
                        {isColVisible('type') && (
                          <td className="px-4 py-2 whitespace-nowrap">
                            <TypeBadge type={item.invoiceType || 'TAX_INVOICE'} />
                          </td>
                        )}

                        {/* Taxable (Grey #555555, right-aligned, tabular-nums) */}
                        {isColVisible('taxable') && (
                          <td className="px-4 py-2 text-[14px] text-right font-normal text-[#555555] dark:text-[#A1A1AA] tabular-nums whitespace-nowrap">
                            ₹{formatIndianCurrency(Number(item.subTotal || 0))}
                          </td>
                        )}

                        {/* Total (Ink #111827, weight 600, right-aligned, tabular-nums) */}
                        {isColVisible('total') && (
                          <td className="px-4 py-2 text-[14px] text-right font-semibold text-[#111827] dark:text-[#F3F4F6] tabular-nums whitespace-nowrap">
                            ₹{formatIndianCurrency(grandTotal)}
                          </td>
                        )}

                        {/* Balance Due (Right-aligned, semibold) */}
                        {isColVisible('balanceDue') && (
                          <td
                            className={cn(
                              'px-4 py-2 text-[14px] text-right font-semibold tabular-nums whitespace-nowrap',
                              outstanding < 0.01
                                ? 'text-[#9CA3AF]'
                                : isOverdue
                                ? 'text-[#DC2626]'
                                : amountPaid > 0
                                ? 'text-[#D97706]'
                                : 'text-[#111827] dark:text-[#F3F4F6]'
                            )}
                          >
                            ₹{formatIndianCurrency(outstanding)}
                          </td>
                        )}

                        {/* Status (Soft pill badge with 6px dot) */}
                        {isColVisible('status') && (
                          <td className="px-4 py-2 text-center whitespace-nowrap">
                            <StatusBadge status={resolvedStatus} />
                          </td>
                        )}

                        {/* Due Date (Grey #555555 with relative hint) */}
                        {isColVisible('dueDate') && (
                          <td className="px-4 py-2 text-[#555555] dark:text-[#A1A1AA] whitespace-nowrap">
                            {isPaid ? (
                              <span className="text-[#9CA3AF]">—</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span>{formatIndianDate(item.dueDate)}</span>
                                {dueDateHint && (
                                  <span
                                    className={cn(
                                      'text-[12px] tabular-nums font-normal',
                                      dueDateHint.type === 'overdue'
                                        ? 'text-[#DC2626]'
                                        : dueDateHint.type === 'today' || dueDateHint.type === 'soon'
                                        ? 'text-[#D97706]'
                                        : 'text-[#555555]'
                                    )}
                                  >
                                    ({dueDateHint.text})
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Actions (30px ghost buttons, fades in on row hover, sticky right) */}
                        {isColVisible('actions') && (
                          <td
                            className={cn(
                              'w-36 pl-3 pr-6 py-2 text-right sticky right-0 z-10 transition-colors duration-120',
                              stickyCellBgClass
                            )}
                          >
                            {item.deletedAt ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInvoiceToRestore(item);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 transition-colors"
                                  title="Restore this archived invoice"
                                >
                                  <RefreshCw className="w-3 h-3" /> Restore
                                </button>
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInvoiceToDeletePermanently(item);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 border border-rose-500/30 transition-colors"
                                    title="Permanently delete this archived invoice"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/invoices/${item.id}`);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                                  title="View details"
                                >
                                  View
                                </button>
                              </div>
                            ) : (
                              <RowActions
                                onView={() => navigate(`/invoices/${item.id}`)}
                                onDownload={() => handleDownloadSinglePdf(item.id, item.invoiceNo)}
                                isDownloading={isDownloadingThis}
                                onPrint={() => handlePrintSinglePdf(item.id, item.invoiceNo)}
                                onEdit={
                                  item.status === 'DRAFT'
                                    ? () => navigate(`/invoices/${item.id}/edit`)
                                    : undefined
                                }
                                onDuplicate={() => navigate(`/invoices/new?duplicateFrom=${item.id}`)}
                                onRecordPayment={
                                  outstanding > 0.01
                                    ? () => navigate(`/receipts/new?invoiceId=${item.id}`)
                                    : undefined
                                }
                                onSendReminder={
                                  outstanding > 0.01
                                    ? () => toast.success(`Payment reminder sent for ${item.invoiceNo}`)
                                    : undefined
                                }
                                onShareLink={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/invoices/${item.id}`);
                                  toast.success('Invoice link copied to clipboard');
                                }}
                              />
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (below 640px) */}
            <div className="block sm:hidden flex-1 min-h-0 overflow-auto divide-y divide-[#E8E8EC] dark:divide-[#26262A]">
              {invoices.map((item: any) => {
                const isSelected = selectedIds.includes(item.id);
                const grandTotal = Number(item.grandTotal || 0);
                const amountPaid = Number(item.amountPaid || 0);
                const outstanding = Math.max(0, grandTotal - amountPaid);
                const resolvedStatus = getResolvedStatus(item);
                const isPaid = resolvedStatus === 'PAID';
                const isOverdue = resolvedStatus === 'OVERDUE';
                const dueDateHint = getDueDateHint(item.dueDate, isPaid);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 space-y-2.5 text-[14px] transition-colors',
                      isSelected ? 'bg-[#ECECF1] dark:bg-[#2B2A36]' : 'bg-surface dark:bg-[#17161C]'
                    )}
                  >
                    {/* Top Row: Checkbox, Invoice #, Status, Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="rounded-[4px] border-[#D1D5DB] dark:border-[#374151] text-[#34303F] accent-[#34303F] h-4 w-4 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => navigate(`/invoices/${item.id}`)}
                          className="font-medium text-[#1F2937] dark:text-[#EDEDED] hover:underline"
                        >
                          {item.invoiceNo}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={resolvedStatus} />
                        {item.deletedAt ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvoiceToRestore(item);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              title="Restore this archived invoice"
                            >
                              <RefreshCw className="w-3 h-3" /> Restore
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInvoiceToDeletePermanently(item);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                title="Permanently delete this archived invoice"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            )}
                          </div>
                        ) : (
                          <RowActions
                            onView={() => navigate(`/invoices/${item.id}`)}
                            onDownload={() => handleDownloadSinglePdf(item.id, item.invoiceNo)}
                            isDownloading={downloadingSingleId === item.id}
                            onPrint={() => handlePrintSinglePdf(item.id, item.invoiceNo)}
                          />
                        )}
                      </div>
                    </div>

                    {/* Customer Row */}
                    <div className="flex items-center justify-between text-[#555555] dark:text-[#A1A1AA]">
                      <span className="text-[12px] uppercase tracking-wider text-[#6B7280]">Customer</span>
                      <span className="text-[#1F2937] dark:text-[#EDEDED] font-medium truncate max-w-[200px]">
                        {item.businessPartner?.name || 'Customer'}
                      </span>
                    </div>

                    {/* Type Row */}
                    <div className="flex items-center justify-between text-[#555555] dark:text-[#A1A1AA]">
                      <span className="text-[12px] uppercase tracking-wider text-[#6B7280]">Type</span>
                      <TypeBadge type={item.invoiceType || 'TAX_INVOICE'} />
                    </div>

                    {/* Total Row */}
                    <div className="flex items-center justify-between text-[#555555] dark:text-[#A1A1AA]">
                      <span className="text-[12px] uppercase tracking-wider text-[#6B7280]">Total</span>
                      <span className="font-semibold text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                        ₹{formatIndianCurrency(grandTotal)}
                      </span>
                    </div>

                    {/* Balance Due Row */}
                    <div className="flex items-center justify-between text-[#555555] dark:text-[#A1A1AA]">
                      <span className="text-[12px] uppercase tracking-wider text-[#6B7280]">Balance Due</span>
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          outstanding < 0.01
                            ? 'text-[#9CA3AF]'
                            : isOverdue
                            ? 'text-[#DC2626]'
                            : amountPaid > 0
                            ? 'text-[#D97706]'
                            : 'text-[#111827] dark:text-[#F3F4F6]'
                        )}
                      >
                        ₹{formatIndianCurrency(outstanding)}
                      </span>
                    </div>

                    {/* Due Date Row */}
                    <div className="flex items-center justify-between text-[#555555] dark:text-[#A1A1AA]">
                      <span className="text-[12px] uppercase tracking-wider text-[#6B7280]">Due Date</span>
                      <div className="text-right">
                        <span>{formatIndianDate(item.dueDate)}</span>
                        {dueDateHint && !isPaid && (
                          <span
                            className={cn(
                              'text-[12px] block font-normal',
                              dueDateHint.type === 'overdue'
                                ? 'text-[#DC2626]'
                                : 'text-[#D97706]'
                            )}
                          >
                            ({dueDateHint.text})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pinned Pagination Footer (56px) inside the container */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={limit}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={(p) => updateUrlParams({ page: String(p) })}
              onPageSizeChange={(s) => updateUrlParams({ limit: String(s), page: '1' })}
            />
          </>
        )}
      </div>

      {/* =================================================================== */}
      {/* 5. ADVANCED FILTERS SLIDE-OVER DRAWER */}
      {/* =================================================================== */}
      <FiltersDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Advanced Filters"
        activeCount={activeFiltersList.length}
        onApply={applyDrawerFilters}
        onReset={resetDrawerFilters}
      >
        {/* Document Type */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] uppercase tracking-wider">
            Document Category
          </label>
          <select
            value={drawerDocType}
            onChange={(e) => setDrawerDocType(e.target.value)}
            className="w-full h-9 px-2.5 text-[13px] bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] focus:outline-none text-[#1F2937] dark:text-[#EDEDED] cursor-pointer"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tax Mode */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] uppercase tracking-wider">
            Tax Treatment
          </label>
          <select
            value={drawerTaxMode}
            onChange={(e) => setDrawerTaxMode(e.target.value)}
            className="w-full h-9 px-2.5 text-[13px] bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] focus:outline-none text-[#1F2937] dark:text-[#EDEDED] cursor-pointer"
          >
            {TAX_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Combobox */}
        <div className="space-y-1.5 relative">
          <label className="text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] uppercase tracking-wider">
            Customer Lookup
          </label>
          {drawerCustomerId ? (
            <div className="flex items-center justify-between p-2 px-2.5 bg-[#F5F5F5] dark:bg-[#1C1B22] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px]">
              <span className="text-[13px] font-medium text-[#1F2937] dark:text-[#EDEDED] truncate">
                {drawerCustomerName || 'Selected Customer'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDrawerCustomerId('');
                  setDrawerCustomerName('');
                }}
                className="text-[#6B7280] hover:text-[#1F2937] dark:hover:text-[#EDEDED] text-[12px] font-medium cursor-pointer"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={customerSearchQuery}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setIsCustomerDropdownOpen(true);
                }}
                placeholder="Search client by name or GSTIN..."
                className="w-full h-9 px-2.5 text-[13px] bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] focus:outline-none text-[#1F2937] dark:text-[#EDEDED] placeholder:text-[#6B7280]"
              />
              {isCustomerDropdownOpen && customerSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-10 max-h-48 overflow-y-auto bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] shadow-md z-50 p-1">
                  {customerSearchResults.map((cust: any) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        setDrawerCustomerId(cust.id);
                        setDrawerCustomerName(cust.name);
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-[13px] text-[#1F2937] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#24232C] rounded-[4px] cursor-pointer"
                    >
                      <div className="font-medium truncate">{cust.name}</div>
                      {cust.gstin && (
                        <div className="text-[11px] text-[#6B7280] font-mono">{cust.gstin}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Amount Range */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] uppercase tracking-wider">
            Amount Range (₹)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={drawerMinAmount}
              onChange={(e) => setDrawerMinAmount(e.target.value)}
              placeholder="Min amount"
              className="h-9 px-2.5 text-[13px] bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] focus:outline-none text-[#1F2937] dark:text-[#EDEDED]"
            />
            <input
              type="number"
              value={drawerMaxAmount}
              onChange={(e) => setDrawerMaxAmount(e.target.value)}
              placeholder="Max amount"
              className="h-9 px-2.5 text-[13px] bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] focus:outline-none text-[#1F2937] dark:text-[#EDEDED]"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] uppercase tracking-wider">
            Custom Date Interval
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-[#6B7280] block mb-0.5">From</span>
              <input
                type="date"
                value={drawerFromDate}
                onChange={(e) => {
                  setDrawerFromDate(e.target.value);
                  setDrawerDatePreset('');
                }}
                className="w-full h-9 px-2 text-[13px] bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] focus:outline-none text-[#1F2937] dark:text-[#EDEDED]"
              />
            </div>
            <div>
              <span className="text-[11px] text-[#6B7280] block mb-0.5">To</span>
              <input
                type="date"
                value={drawerToDate}
                onChange={(e) => {
                  setDrawerToDate(e.target.value);
                  setDrawerDatePreset('');
                }}
                className="w-full h-9 px-2 text-[13px] bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] focus:outline-none text-[#1F2937] dark:text-[#EDEDED]"
              />
            </div>
          </div>
        </div>
      </FiltersDrawer>

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!invoiceToRestore}
        onClose={() => setInvoiceToRestore(null)}
        onConfirm={async () => {
          if (!invoiceToRestore) return;
          try {
            await apiClient.post(`/sales/invoices/${invoiceToRestore.id}/restore`);
            toast.success('Invoice restored successfully.');
            setInvoiceToRestore(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
          } catch (err: any) {
            toast.error(
              err.response?.data?.message ||
              err.message ||
              'Invoice could not be restored because its accounting entries do not balance. Please try again after the accounting issue is fixed.'
            );
          }
        }}
        title="Restore Archived Invoice"
        message={`Are you sure you want to restore invoice "${invoiceToRestore?.invoiceNo}"? This will reactivate the document, preserve its document number and payment history, and safely restore general ledger and stock movements.`}
        confirmText="Restore Invoice"
        variant="primary"
      />

      {/* Delete Permanently Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!invoiceToDeletePermanently}
        onClose={() => setInvoiceToDeletePermanently(null)}
        onConfirm={async () => {
          if (!invoiceToDeletePermanently) return;
          try {
            await apiClient.delete(`/sales/invoices/${invoiceToDeletePermanently.id}`);
            toast.success('Invoice deleted successfully. Related balances updated.');
            const custId = invoiceToDeletePermanently.businessPartnerId || invoiceToDeletePermanently.businessPartner?.id;
            const invId = invoiceToDeletePermanently.id;
            setInvoiceToDeletePermanently(null);
            await erpInvalidate.invoice(queryClient, {
              customerId: custId,
              invoiceId: invId,
            });
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            if (custId) {
              queryClient.invalidateQueries({ queryKey: ['customer', custId] });
            }
          } catch (err: any) {
            const serverMsg = String(err.response?.data?.message || err?.message || '');
            toast.error(serverMsg || 'Invoice could not be deleted. No changes were saved.');
          }
        }}
        title="Delete Invoice Permanently"
        message={
          <div className="space-y-3">
            <p>
              Are you sure you want to permanently delete invoice{' '}
              <strong className="text-foreground">{invoiceToDeletePermanently?.invoiceNo}</strong>
              {invoiceToDeletePermanently?.businessPartner?.name ? (
                <> for customer <strong className="text-foreground">{invoiceToDeletePermanently.businessPartner.name}</strong></>
              ) : ''}?
            </p>
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 text-xs">
              <strong>Notice:</strong> This action is permanent and cannot be undone. Associated items, general ledger entries, and dependent allocations will be safely removed, and customer balances will be updated.
            </div>
          </div>
        }
        confirmText="Delete Permanently"
        variant="danger"
      />
    </PageLayout>
  );
};

export default InvoicesList;
