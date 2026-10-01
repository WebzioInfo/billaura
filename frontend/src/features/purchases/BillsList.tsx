import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Receipt, Search, Filter, Eye, Edit, Copy, DollarSign, 
  Trash2, X, Download, FileText, Calendar, Building, ListFilter,
  CheckCircle, AlertTriangle, ShieldAlert, Sparkles, Send, Briefcase, Printer, ArrowRight
} from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Card, Button, 
  IconButton, PageHeader, KpiCard, LoadingState, TableLoader, TableSkeleton, 
  SummaryCardLoader, StatusBadge, CurrencyCell, DateCell, RelativeDueCell 
} from '@/shared/components/ui';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { DataTable } from '@/shared/components/ui/data-table/DataTable';
import { usePagination } from '@/shared/hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import apiClient from '@/core/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import notification from '@/core/services/NotificationService';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';
import { useBankAccounts } from '@/features/banking/hooks/useBankAccounts';
import { ExportService } from '@/core/services/ExportService';
import { DocumentEngine } from '@/core/reporting/DocumentEngine';
import { DeleteDialog, ConfirmDialog } from '@/shared/components/ui';
import { PdfDownloadButton } from '../../shared/components/pdf/PdfDownloadButton';

interface Vendor {
  id: string;
  name: string;
  gstin?: string;
  state?: string;
}

interface Product {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface BankAccount {
  id: string;
  name: string;
  currentBalance: number;
}

interface PurchaseItem {
  id: string;
  productId: string;
  description: string;
  qty: number;
  rate: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  product?: Product;
}

interface Purchase {
  id: string;
  purchaseNo: string;
  vendorId: string;
  date: string;
  status: string;
  subTotal: number;
  taxTotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  amountPaid: number;
  reference?: string;
  billingAddress?: string;
  shippingAddress?: string;
  placeOfSupply?: string;
  taxMode?: string;
  isRcm?: boolean;
  gstBreakup?: any;
  vendor: Vendor;
  items: PurchaseItem[];
  allocations?: any[];
}

export const BillsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [billStatus, setBillStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gstType, setGstType] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Modal / Selection State
  const [selectedBill, setSelectedBill] = useState<Purchase | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState<Purchase | null>(null);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [isLoadingJournals, setIsLoadingJournals] = useState(false);
  const [billToCancel, setBillToCancel] = useState<Purchase | null>(null);
  const [billToDelete, setBillToDelete] = useState<Purchase | null>(null);

  // Payment Form State
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');

  // Fetch Queries
  const { data: bills = [], isLoading: loadingBills } = useQuery<Purchase[]>({
    queryKey: ['bills'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases');
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/vendors');
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ['bankAccounts'],
    queryFn: async () => {
      const res = await apiClient.get('/bank-accounts');
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: meData } = useQuery<any>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me'),
  });

  const companyProfile = meData?.data?.company || meData?.company || { name: 'Your Company', address: 'N/A', email: 'N/A' };

  // Fetch journal entries for selected bill
  useEffect(() => {
    const fetchJournals = async () => {
      if (!selectedBill) return;
      setIsLoadingJournals(true);
      try {
        const res = await apiClient.get('/journal-entries', {
          params: { search: selectedBill.purchaseNo }
        });
        const list = res.data?.data || res.data || [];
        setJournalEntries(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error fetching journal entries', err);
        setJournalEntries([]);
      } finally {
        setIsLoadingJournals(false);
      }
    };
    if (isViewModalOpen && selectedBill) {
      fetchJournals();
    }
  }, [isViewModalOpen, selectedBill]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/purchases/${id}`);
    },
    onSuccess: () => {
      notification.success('Bill deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete bill');
    }
  });

  const paymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      await apiClient.post('/purchases/payments', payload);
    },
    onSuccess: () => {
      notification.success('Vendor payment recorded successfully');
      setIsPaymentModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to record payment');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/purchases/${id}`);
    },
    onSuccess: () => {
      notification.success('Bill cancelled and ledger entries reverted successfully');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to cancel bill');
    }
  });

  // Calculations
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const getOutstandingBalance = (bill: Purchase) => {
    return Number(bill.grandTotal) - Number(bill.amountPaid);
  };

  const isBillOverdue = (bill: Purchase) => {
    const dueDateStr = bill.gstBreakup?.dueDate;
    if (!dueDateStr) return false;
    const dueDate = new Date(dueDateStr);
    return dueDate < new Date() && getOutstandingBalance(bill) > 0;
  };

  // Stats
  const stats = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalCount = 0;
    let unpaidCount = 0;
    let paidCount = 0;
    let partialCount = 0;
    let overdueCount = 0;
    let outstandingAmt = 0;
    let gstCredit = 0;
    let currentMonthPurchases = 0;

    bills.forEach(b => {
      const gTotal = Number(b.grandTotal || 0);
      const paidAmt = Number(b.amountPaid || 0);
      const taxAmt = Number(b.taxTotal || 0);
      const balance = gTotal - paidAmt;
      const bDate = new Date(b.date);

      totalCount++;
      outstandingAmt += balance;
      gstCredit += taxAmt;

      if (paidAmt === 0) unpaidCount++;
      else if (balance > 0) partialCount++;
      else paidCount++;

      if (isBillOverdue(b)) overdueCount++;

      if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
        currentMonthPurchases += gTotal;
      }
    });

    return {
      totalCount, unpaidCount, paidCount, partialCount, overdueCount,
      outstandingAmt, gstCredit, currentMonthPurchases
    };
  }, [bills]);

  const handleExport = () => {
    if (!filteredBills || filteredBills.length === 0) return;
    const headers = ['Purchase No', 'Date', 'Vendor', 'Status', 'Tax Mode', 'Sub Total', 'Tax', 'Grand Total', 'Amount Paid'];
    const data = filteredBills.map((b: any) => [
      b.purchaseNo || '',
      b.date ? new Date(b.date).toLocaleDateString() : '',
      b.vendor?.name || '',
      b.status || '',
      b.taxMode || '',
      b.subTotal || 0,
      b.taxTotal || 0,
      b.grandTotal || 0,
      b.amountPaid || 0
    ]);
    
    ExportService.exportExcel({
      filename: `Bills_Export_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Bills',
      title: 'Vendor Bills',
      headers,
      data
    });
  };

  const handlePrint = async () => {
    if (!filteredBills || filteredBills.length === 0) return;
    
    await DocumentEngine.generateTablePDF({
      title: 'Vendor Bills Register',
      columns: [
        { header: 'Bill No', dataKey: 'billNo', width: 25 },
        { header: 'Date', dataKey: 'date', width: 25 },
        { header: 'Vendor', dataKey: 'vendor' },
        { header: 'Grand Total', dataKey: 'total', align: 'right' },
        { header: 'Status', dataKey: 'status', align: 'center' }
      ],
      data: filteredBills.map((b: any) => ({
        billNo: b.purchaseNo || '',
        date: b.date ? new Date(b.date).toLocaleDateString() : '',
        vendor: b.vendor?.name || '',
        total: formatCurrency(Number(b.grandTotal || 0)),
        status: b.status
      })),
      orientation: 'landscape'
    });
  };

  // Client Side Filtering
  const filteredBills = React.useMemo(() => {
    return bills.filter(b => {
      const matchesSearch = 
        b.purchaseNo.toLowerCase().includes(search.toLowerCase()) ||
        b.vendor?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (b.reference && b.reference.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedVendorId && b.vendorId !== selectedVendorId) return false;

      if (billStatus) {
        if (billStatus === 'OVERDUE' && !isBillOverdue(b)) return false;
        if (billStatus === 'CANCELLED' && b.status !== 'CANCELLED') return false;
        if (billStatus === 'SENT' && b.status !== 'SENT') return false;
      }

      if (paymentStatus) {
        const balance = getOutstandingBalance(b);
        if (paymentStatus === 'PAID' && b.status !== 'PAID') return false;
        if (paymentStatus === 'PARTIAL' && b.status !== 'PARTIAL') return false;
        if (paymentStatus === 'UNPAID' && b.amountPaid !== 0) return false;
      }

      if (startDate && new Date(b.date) < new Date(startDate)) return false;
      if (endDate && new Date(b.date) > new Date(endDate)) return false;

      if (gstType) {
        const hasIGST = Number(b.igstAmount) > 0;
        if (gstType === 'IGST' && !hasIGST) return false;
        if (gstType === 'CGST_SGST' && hasIGST) return false;
      }

      if (warehouseId) {
        const whId = b.gstBreakup?.warehouseId;
        if (whId !== warehouseId) return false;
      }

      if (minAmount && Number(b.grandTotal) < Number(minAmount)) return false;
      if (maxAmount && Number(b.grandTotal) > Number(maxAmount)) return false;

      return true;
    });
  }, [bills, search, selectedVendorId, billStatus, paymentStatus, startDate, endDate, gstType, warehouseId, minAmount, maxAmount]);

  const handleOpenPayment = (bill: Purchase) => {
    setPaymentBill(bill);
    setPaymentAmount(getOutstandingBalance(bill));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentReference('');
    if (bankAccounts.length > 0) {
      setSelectedBankAccountId(bankAccounts[0].id);
    }
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBill) return;
    if (paymentAmount <= 0) {
      notification.error('Payment amount must be greater than zero');
      return;
    }
    if (paymentAmount > getOutstandingBalance(paymentBill)) {
      notification.error('Payment amount cannot exceed the outstanding balance');
      return;
    }
    if (!selectedBankAccountId) {
      notification.error('Please select a bank account');
      return;
    }

    paymentMutation.mutate({
      vendorId: paymentBill.vendorId,
      purchaseId: paymentBill.id,
      bankAccountId: selectedBankAccountId,
      date: paymentDate,
      amount: Number(paymentAmount),
      method: paymentMethod,
      reference: paymentReference
    });
  };

  const parseLineDescription = (desc: string) => {
    try {
      if (desc.startsWith('{') && desc.endsWith('}')) {
        const parsed = JSON.parse(desc);
        return {
          text: parsed.text || 'Item details',
          discount: parsed.discount || 0
        };
      }
    } catch (e) {}
    return { text: desc, discount: 0 };
  };

  // Unified pagination (Client-side slicing for bills; TODO: endpoint should support server-side pagination)
  const {
    page,
    limit,
    totalPages,
    totalItems,
    setPage,
    setLimit,
    resetPage,
    paginatedData,
  } = usePagination({
    tableKey: 'bills',
    data: filteredBills,
    itemLabel: 'bills',
  });

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'purchaseNo',
      header: 'Bill Code',
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-[#111827] dark:text-[#EDEDED]">
          {row.original.purchaseNo}
        </span>
      ),
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      cell: ({ row }) => (
        <span className="font-medium text-[#111827] dark:text-[#EDEDED]">
          {row.original.vendor?.name || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Bill Date',
      cell: ({ row }) => <DateCell date={row.original.date} />,
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => (
        <RelativeDueCell
          dueDate={row.original.gstBreakup?.dueDate}
          isPaid={row.original.status === 'PAID'}
        />
      ),
    },
    {
      accessorKey: 'reference',
      header: 'Ref / Invoice No',
      cell: ({ row }) => (
        <span className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
          {row.original.reference || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'subTotal',
      header: () => <div className="text-right">Subtotal</div>,
      cell: ({ row }) => <CurrencyCell amount={Number(row.original.subTotal)} />,
    },
    {
      accessorKey: 'taxTotal',
      header: () => <div className="text-right">GST Tax</div>,
      cell: ({ row }) => <CurrencyCell amount={Number(row.original.taxTotal)} />,
    },
    {
      accessorKey: 'grandTotal',
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <CurrencyCell
          amount={Number(row.original.grandTotal)}
          className="font-semibold text-foreground text-right"
        />
      ),
    },
    {
      accessorKey: 'amountPaid',
      header: () => <div className="text-right">Paid</div>,
      cell: ({ row }) => <CurrencyCell amount={Number(row.original.amountPaid)} />,
    },
    {
      accessorKey: 'balance',
      header: () => <div className="text-right">Balance</div>,
      cell: ({ row }) => {
        const balance = getOutstandingBalance(row.original);
        return (
          <CurrencyCell
            amount={balance}
            className={balance > 0 ? 'font-semibold text-amber-600 dark:text-amber-400 text-right' : 'text-right'}
          />
        );
      },
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => {
        const isOverdue = isBillOverdue(row.original);
        return (
          <div className="text-center">
            <StatusBadge
              status={
                isOverdue && row.original.status !== 'PAID'
                  ? 'OVERDUE'
                  : row.original.status || 'POSTED'
              }
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const bill = row.original;
        const balance = getOutstandingBalance(bill);
        return (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              icon={Eye}
              aria-label="View Audit Ledger & Details"
              tooltip="View Audit Ledger & Details"
              size="dense"
              variant="ghost"
              onClick={() => {
                setSelectedBill(bill);
                setIsViewModalOpen(true);
              }}
            />
            <IconButton
              icon={Edit}
              aria-label="Edit Bill"
              tooltip="Edit Bill Details"
              size="dense"
              variant="ghost"
              disabled={bill.status === 'PAID'}
              onClick={() => navigate(`/bills/new?edit=${bill.id}`)}
            />
            <IconButton
              icon={Copy}
              aria-label="Duplicate Bill"
              tooltip="Duplicate Bill"
              size="dense"
              variant="ghost"
              onClick={() => navigate(`/bills/new?duplicate=${bill.id}`)}
            />
            <IconButton
              icon={DollarSign}
              aria-label="Record Payment"
              tooltip="Record Payout Allocation"
              size="dense"
              variant="ghost"
              disabled={balance <= 0}
              onClick={() => handleOpenPayment(bill)}
            />
            <IconButton
              icon={X}
              aria-label="Cancel Bill"
              tooltip="Cancel & Reverse Entries"
              size="dense"
              variant="danger-ghost"
              disabled={bill.status === 'PAID'}
              onClick={() => setBillToCancel(bill)}
            />
            <IconButton
              icon={Trash2}
              aria-label="Delete Bill"
              tooltip="Delete Bill"
              size="dense"
              variant="danger-ghost"
              disabled={bill.status === 'PAID'}
              onClick={() => setBillToDelete(bill)}
            />
          </div>
        );
      },
    },
  ], [navigate, isBillOverdue, getOutstandingBalance]);

  return (
    <>
      <PageLayout>
        <PageHeader
          title="Bills"
          count={bills.length}
          secondaryAction={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="md" onClick={handleExport}>
                Export
              </Button>
              <IconButton
                icon={Printer}
                aria-label="Print Bills"
                tooltip="Print List"
                size="md"
                variant="secondary"
                onClick={handlePrint}
              />
            </div>
          }
          primaryAction={
            <Button
              onClick={() => navigate('/bills/new')}
              variant="primary"
              size="md"
            >
              <Plus className="w-4 h-4" /> New Bill
            </Button>
          }
        />

        {/* Stats Dashboard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 mb-3">
          <KpiCard
            label="Total Outstanding"
            value={loadingBills ? '—' : formatCurrency(stats.outstandingAmt)}
            helperText={`${stats.unpaidCount + stats.partialCount} active bills`}
            isLoading={loadingBills}
          />
          <KpiCard
            label="GST Input Credit"
            value={loadingBills ? '—' : formatCurrency(stats.gstCredit)}
            helperText="Accumulated input credit"
            indicatorDot="collected"
            isLoading={loadingBills}
          />
          <KpiCard
            label="Overdue Bills"
            value={loadingBills ? '—' : stats.overdueCount.toString()}
            helperText="Requires payout attention"
            indicatorDot="overdue"
            isLoading={loadingBills}
          />
          <KpiCard
            label="Purchases This Month"
            value={loadingBills ? '—' : formatCurrency(stats.currentMonthPurchases)}
            helperText="Current billing cycle"
            isLoading={loadingBills}
          />
        </div>

        {/* Expandable Filters Section */}
        {isFilterPanelOpen && (
          <div className="bg-surface border border-border p-3.5 rounded-xl shadow-xs shrink-0 mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Vendor</label>
              <select
                value={selectedVendorId}
                onChange={e => { setSelectedVendorId(e.target.value); resetPage(); }}
                className="w-full h-8 bg-background border border-border rounded-[6px] px-2 text-[13px] text-foreground focus:outline-none"
              >
                <option value="">All Vendors</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Bill Status</label>
              <select
                value={billStatus}
                onChange={e => { setBillStatus(e.target.value); resetPage(); }}
                className="w-full h-8 bg-background border border-border rounded-[6px] px-2 text-[13px] text-foreground focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="SENT">Approved / Posted</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={e => { setPaymentStatus(e.target.value); resetPage(); }}
                className="w-full h-8 bg-background border border-border rounded-[6px] px-2 text-[13px] text-foreground focus:outline-none"
              >
                <option value="">All Payment Statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedVendorId('');
                  setBillStatus('');
                  setPaymentStatus('');
                  setStartDate('');
                  setEndDate('');
                  setGstType('');
                  setWarehouseId('');
                  setMinAmount('');
                  setMaxAmount('');
                  setSearch('');
                  resetPage();
                }}
                className="w-full h-8 text-[13px]"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={paginatedData}
          totalItems={totalItems}
          manualPagination={true}
          pagination={{
            pageIndex: page - 1,
            pageSize: limit,
          }}
          onPaginationChange={(updater: any) => {
            const next = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize: limit }) : updater;
            if (next.pageIndex !== undefined) setPage(next.pageIndex + 1);
            if (next.pageSize !== undefined) setLimit(next.pageSize);
          }}
          isLoading={loadingBills}
          storageKey="bills"
          searchPlaceholder="Search bills by number, vendor, reference..."
          globalFilter={search}
          onGlobalFilterChange={(val) => {
            setSearch(val);
            resetPage();
          }}
          toolbarExtras={
            <Button
              variant={isFilterPanelOpen ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className="text-[13px]"
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {(selectedVendorId || billStatus || paymentStatus || startDate || endDate || gstType || warehouseId || minAmount || maxAmount) && (
                <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
              )}
            </Button>
          }
          exportFilename="Bills_List"
          itemLabel="bills"
          emptyText="No purchase bills found"
          emptyDescription="Try adjusting your filters or record a new bill to track vendor balances."
          emptyActionLabel="Record Vendor Bill"
          onEmptyAction={() => navigate('/bills/new')}
        />
      </PageLayout>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && paymentBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col scale-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
              <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" /> Record Outbound Payment
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="bg-muted/10 border border-border/40 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Bill Number:</span>
                  <span className="font-mono font-bold text-foreground">{paymentBill.purchaseNo}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Vendor Name:</span>
                  <span className="font-semibold text-foreground">{paymentBill.vendor?.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Grand Total:</span>
                  <span className="font-bold text-foreground">{formatCurrency(Number(paymentBill.grandTotal))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-bold text-emerald-500">{formatCurrency(Number(paymentBill.amountPaid))}</span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-border/40 font-bold">
                  <span className="text-foreground">Pending Balance Due:</span>
                  <span className="text-amber-500">{formatCurrency(getOutstandingBalance(paymentBill))}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={getOutstandingBalance(paymentBill)}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Source Bank / Cash Account</label>
                <select
                  value={selectedBankAccountId}
                  onChange={e => setSelectedBankAccountId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                >
                  <option value="">Select Account</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.name} (Bal: {formatCurrency(b.currentBalance)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="IMPS">IMPS</option>
                  <option value="WALLET">Wallet</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reference / Tx Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR Number, Cheque Ref"
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)} className="w-full font-bold">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={paymentMutation.isPending}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
                >
                  {paymentMutation.isPending ? 'Processing...' : 'Post Outbound Payout'} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Drawer/Modal */}
      {isViewModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border-l border-border/80 w-full max-w-4xl h-full flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
              <div>
                <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Purchase Bill: <span className="font-mono text-primary">{selectedBill.purchaseNo}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Auditing transactions, journal postings, and inventory movement records.</p>
              </div>
              <div className="flex items-center gap-3">
                <PdfDownloadButton
                  filename={`Bill-${selectedBill.purchaseNo}.pdf`}
                  data={{
                    company: { name: companyProfile.name || '', address: companyProfile.address || '', email: companyProfile.email || '' },
                    customer: { name: selectedBill.vendor?.name || 'Unknown', address: selectedBill.vendor?.state || 'N/A' },
                    document: { title: 'Purchase Bill', documentNo: selectedBill.purchaseNo, date: selectedBill.date, status: selectedBill.status },
                    items: selectedBill.items?.map(i => {
                      const parsed = parseLineDescription(i.description);
                      return {
                        id: i.id,
                        description: parsed.text,
                        qty: Number(i.qty),
                        rate: Number(i.rate),
                        taxPercent: Number(i.taxPercent || 0),
                        taxAmount: Number(i.taxAmount || 0),
                        total: Number(i.total || 0)
                      };
                    }) || [],
                    totals: {
                      subTotal: Number(selectedBill.subTotal),
                      taxTotal: Number(selectedBill.taxTotal),
                      grandTotal: Number(selectedBill.grandTotal),
                      amountPaid: Number(selectedBill.amountPaid || 0),
                      balance: getOutstandingBalance(selectedBill),
                      currency: 'INR'
                    }
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-sm"
                />
                <button onClick={() => setIsViewModalOpen(false)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/10 border border-border/40 rounded-lg p-5">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vendor details</div>
                  <div className="font-bold text-foreground">{selectedBill.vendor?.name}</div>
                  <div className="text-xs text-muted-foreground">GSTIN: {selectedBill.vendor?.gstin || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground">Place of Supply: {selectedBill.placeOfSupply || 'Intrastate'}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date & Warehouse</div>
                  <div className="text-xs text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Bill Date: {new Date(selectedBill.date).toLocaleDateString()}
                  </div>
                  {selectedBill.gstBreakup?.dueDate && (
                    <div className="text-xs text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      Due Date: {new Date(selectedBill.gstBreakup.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  <div className="text-xs text-foreground flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-muted-foreground" />
                    Storage: {warehouses.find(w => w.id === selectedBill.gstBreakup?.warehouseId)?.name || 'Default Warehouse'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reference & RCM</div>
                  <div className="text-xs text-foreground">Invoice No: <span className="font-mono font-semibold">{selectedBill.reference || 'N/A'}</span></div>
                  <div className="text-xs text-foreground">Tax Mode: <span className="font-mono font-semibold">{selectedBill.taxMode || 'CGST_SGST'}</span></div>
                  <div className="text-xs text-foreground">Reverse Charge (RCM): {selectedBill.isRcm ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {/* Items Grid */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider">Itemized Line Entries</h4>
                <div className="border border-border/80 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="font-bold py-2.5 px-4 text-xs">Product Item</TableHead>
                        <TableHead className="font-bold py-2.5 px-4 text-right text-xs">Quantity</TableHead>
                        <TableHead className="font-bold py-2.5 px-4 text-right text-xs">Rate</TableHead>
                        <TableHead className="font-bold py-2.5 px-4 text-right text-xs">Discount</TableHead>
                        <TableHead className="font-bold py-2.5 px-4 text-right text-xs">Tax %</TableHead>
                        <TableHead className="font-bold py-2.5 px-4 text-right text-xs">Tax Amount</TableHead>
                        <TableHead className="font-bold py-2.5 px-4 text-right text-xs">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBill.items?.map((item: PurchaseItem) => {
                        const parsed = parseLineDescription(item.description);
                        return (
                          <TableRow key={item.id} className="border-b border-border/40 text-xs">
                            <TableCell className="py-2.5 px-4">
                              <div className="font-bold text-foreground">{item.product?.name || 'Unknown Product'}</div>
                              {parsed.text && <div className="text-[10px] text-muted-foreground mt-0.5">{parsed.text}</div>}
                            </TableCell>
                            <TableCell className="py-2.5 px-4 text-right font-mono">{Number(item.qty).toLocaleString()}</TableCell>
                            <TableCell className="py-2.5 px-4 text-right font-mono">{formatCurrency(Number(item.rate))}</TableCell>
                            <TableCell className="py-2.5 px-4 text-right font-mono text-muted-foreground">{parsed.discount > 0 ? `${parsed.discount}%` : '-'}</TableCell>
                            <TableCell className="py-2.5 px-4 text-right font-mono text-muted-foreground">{Number(item.taxPercent)}%</TableCell>
                            <TableCell className="py-2.5 px-4 text-right font-mono text-muted-foreground">{formatCurrency(Number(item.taxAmount))}</TableCell>
                            <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-foreground">{formatCurrency(Number(item.total))}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                {/* GST Breakup */}
                <div className="w-full md:w-1/2 space-y-2">
                  <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider">GST Distribution Summary</h4>
                  <div className="border border-border/50 rounded-lg p-4 space-y-2 bg-muted/10">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Central GST (CGST Input):</span>
                      <span className="font-semibold text-foreground">{formatCurrency(Number(selectedBill.cgstAmount))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">State GST (SGST Input):</span>
                      <span className="font-semibold text-foreground">{formatCurrency(Number(selectedBill.sgstAmount))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Integrated GST (IGST Input):</span>
                      <span className="font-semibold text-foreground">{formatCurrency(Number(selectedBill.igstAmount))}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1.5 border-t border-border/40 font-bold">
                      <span className="text-foreground">Total Tax Input Credit:</span>
                      <span className="text-primary">{formatCurrency(Number(selectedBill.taxTotal))}</span>
                    </div>
                  </div>
                </div>

                {/* Subtotals */}
                <div className="w-full md:w-1/2 space-y-2">
                  <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider">Financial Calculations</h4>
                  <div className="border border-border/50 rounded-lg p-4 space-y-2 bg-muted/10">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Gross Subtotal:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(Number(selectedBill.subTotal))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">GST Taxes:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(Number(selectedBill.taxTotal))}</span>
                    </div>
                    {selectedBill.gstBreakup?.roundOff !== undefined && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Round Off Adjustment:</span>
                        <span className="font-semibold text-foreground">{formatCurrency(Number(selectedBill.gstBreakup.roundOff))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs pt-1.5 border-t border-border/40 font-bold text-foreground">
                      <span>Grand Billing Total:</span>
                      <span>{formatCurrency(Number(selectedBill.grandTotal))}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-emerald-500">
                      <span>Outbound Payments Settled:</span>
                      <span>{formatCurrency(Number(selectedBill.amountPaid))}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1.5 border-t border-border/40 font-black text-amber-500">
                      <span>Current Ledger Balance:</span>
                      <span>{formatCurrency(getOutstandingBalance(selectedBill))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Automatic Journal Voucher Entry Audit */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Automatic General Ledger Journal Audit
                </h4>
                {isLoadingJournals ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 p-3">
                    Loading ledger entries...
                  </div>
                ) : journalEntries.length === 0 ? (
                  <div className="text-xs text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg p-4">
                    Warning: No journal posting records found for this bill. Contact ledger administration.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {journalEntries.map((je: any) => (
                      <div key={je.id} className="border border-border/60 rounded-lg overflow-hidden bg-card text-xs">
                        <div className="bg-muted/30 px-4 py-2 flex items-center justify-between border-b border-border/40">
                          <div>
                            Journal Voucher: <span className="font-mono font-bold text-foreground">{je.journalNo || je.reference}</span>
                          </div>
                          <div className="text-muted-foreground text-[10px]">
                            Posted Date: {new Date(je.date).toLocaleDateString()}
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/10">
                              <TableHead className="font-bold py-1.5 px-4 text-[10px]">Ledger Account</TableHead>
                              <TableHead className="font-bold py-1.5 px-4 text-[10px] text-right">Debit (Dr)</TableHead>
                              <TableHead className="font-bold py-1.5 px-4 text-[10px] text-right">Credit (Cr)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {je.lines?.map((line: any) => (
                              <TableRow key={line.id} className="border-b border-border/20">
                                <TableCell className="py-2 px-4 font-semibold text-foreground">
                                  {line.account?.name}
                                </TableCell>
                                <TableCell className="py-2 px-4 text-right font-mono text-foreground">
                                  {Number(line.debit) > 0 ? formatCurrency(Number(line.debit)) : '-'}
                                </TableCell>
                                <TableCell className="py-2 px-4 text-right font-mono text-foreground">
                                  {Number(line.credit) > 0 ? formatCurrency(Number(line.credit)) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border/60 bg-muted/10 text-right">
              <Button onClick={() => setIsViewModalOpen(false)} variant="primary" className="font-bold">
                Close Audit View
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={!!billToCancel} onClose={() => setBillToCancel(null)} onConfirm={async () => { cancelMutation.mutate(billToCancel!.id); setBillToCancel(null); }} title="Cancel Purchase Bill" message={<span>Cancel bill <strong>{billToCancel?.purchaseNo}</strong>? This will reverse ledger accounts and stock changes.</span>} confirmText="Cancel Bill" variant="danger" />
      <DeleteDialog isOpen={!!billToDelete} onClose={() => setBillToDelete(null)} onConfirm={async () => { deleteMutation.mutate(billToDelete!.id); setBillToDelete(null); }} entityName="Purchase Bill" entityId={billToDelete?.purchaseNo} warningText="This action is irreversible." />
    </>
  );
};
