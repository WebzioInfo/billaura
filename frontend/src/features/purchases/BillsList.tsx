import React, { useState, useEffect } from 'react';
import { 
  Plus, Receipt, Search, Filter, Eye, Edit, Copy, DollarSign, 
  Trash2, X, Download, FileText, Calendar, Building, ListFilter,
  CheckCircle, AlertTriangle, ShieldAlert, Sparkles, Send, Briefcase, Printer, ArrowRight
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Card, Button, PageContainer, LoadingState, TableLoader, SummaryCardLoader } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import notification from '@/core/services/NotificationService';
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
    if (!bills || bills.length === 0) return;
    const header = ['Purchase No', 'Date', 'Vendor', 'Status', 'Tax Mode', 'Sub Total', 'Tax', 'Grand Total', 'Amount Paid'];
    const rows = bills.map((b: any) => [
      b.purchaseNo || '',
      b.date ? new Date(b.date).toLocaleDateString() : '',
      b.vendor?.name || '',
      b.status || '',
      b.taxMode || '',
      b.subTotal || 0,
      b.taxTotal || 0,
      b.grandTotal || 0,
      b.amountPaid || 0
    ].map((v: any) => `"${v}"`).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  return (
    <>
    <PageContainer maxWidth="7xl">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="w-8 h-8 text-primary" /> Bills
            </h1>
            <p className="text-muted-foreground mt-1">Manage vendor invoices, track purchase costs, and post accounting ledger journals.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => navigate('/bills/new')}
              variant="primary"
              className="flex items-center gap-2 font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg px-5 py-2.5 transition-transform active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> New Bill
            </Button>
            <Button variant="outline" className="gap-1.5 opacity-50 cursor-not-allowed" title="Available in a future release." disabled>
              <Download className="w-4 h-4" /> Import
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={handleExport}>
              Export
            </Button>
            <Button variant="outline" className="p-2.5" onClick={() => window.print()}>
              <Printer className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>

        {/* Stats Dashboard Grid */}
        {loadingBills ? (
          <SummaryCardLoader count={4} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border-l-4 border-l-primary relative overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Outstanding</div>
              <div className="text-2xl font-black text-foreground mt-2">{formatCurrency(stats.outstandingAmt)}</div>
              <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <span className="font-bold text-amber-500">{stats.unpaidCount + stats.partialCount}</span> active bills
              </div>
              <DollarSign className="absolute right-4 bottom-4 w-12 h-12 text-primary/10" />
            </Card>

            <Card className="p-5 border-l-4 border-l-emerald-500 relative overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">GST Input Credit</div>
              <div className="text-2xl font-black text-emerald-500 mt-2">{formatCurrency(stats.gstCredit)}</div>
              <div className="text-xs text-muted-foreground mt-1.5">Accumulated Input GST balances</div>
              <Sparkles className="absolute right-4 bottom-4 w-12 h-12 text-emerald-500/10" />
            </Card>

            <Card className="p-5 border-l-4 border-l-amber-500 relative overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue Bills</div>
              <div className="text-2xl font-black text-amber-500 mt-2">{stats.overdueCount}</div>
              <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                Requires immediate payout attention
              </div>
              <AlertTriangle className="absolute right-4 bottom-4 w-12 h-12 text-amber-500/10" />
            </Card>

            <Card className="p-5 border-l-4 border-l-indigo-500 relative overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchases This Month</div>
              <div className="text-2xl font-black text-indigo-500 mt-2">{formatCurrency(stats.currentMonthPurchases)}</div>
              <div className="text-xs text-muted-foreground mt-1.5">Cumulative billing for current cycle</div>
              <Briefcase className="absolute right-4 bottom-4 w-12 h-12 text-indigo-500/10" />
            </Card>
          </div>
        )}

        {/* Filter Toolbar */}
        <Card className="p-4 bg-muted/20 border border-border/50">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search bills by number, vendor, reference..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button
                variant={isFilterPanelOpen ? 'secondary' : 'outline'}
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className="flex items-center gap-1.5 py-2.5 text-sm"
              >
                <Filter className="w-4 h-4" /> Filters
                {(selectedVendorId || billStatus || paymentStatus || startDate || endDate || gstType || warehouseId || minAmount || maxAmount) && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
              </Button>
              {(selectedVendorId || billStatus || paymentStatus || startDate || endDate || gstType || warehouseId || minAmount || maxAmount || search) && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearch(''); setSelectedVendorId(''); setBillStatus(''); setPaymentStatus('');
                    setStartDate(''); setEndDate(''); setGstType(''); setWarehouseId('');
                    setMinAmount(''); setMaxAmount('');
                  }}
                  className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 font-bold"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Advanced filters */}
          {isFilterPanelOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/60">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Vendor</label>
                <select
                  value={selectedVendorId}
                  onChange={e => setSelectedVendorId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Vendors</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Bill Status</label>
                <select
                  value={billStatus}
                  onChange={e => setBillStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="SENT">Approved / Posted</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={e => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Payment Statuses</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partially Paid</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">GST Route</label>
                <select
                  value={gstType}
                  onChange={e => setGstType(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All GST Types</option>
                  <option value="CGST_SGST">Intrastate (CGST/SGST)</option>
                  <option value="IGST">Interstate (IGST)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Storage Warehouse</label>
                <select
                  value={warehouseId}
                  onChange={e => setWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Start Billing Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">End Billing Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Amount Range</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Data Table */}
        {loadingBills ? (
          <TableLoader cols={8} rows={6} className="bg-card border border-border/80 rounded-2xl" />
        ) : filteredBills.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center bg-card">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No purchase bills found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">Try tweaking your filters or search query, or record a new bill to track vendor balances.</p>
            <Button
              onClick={() => navigate('/bills/new')}
              className="mt-5 font-bold flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/95"
            >
              <Plus className="w-4.5 h-4.5" /> Record Vendor Bill
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-border/80 shadow-sm bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 border-b border-border">
                    <TableHead className="font-bold py-3.5 px-5">Bill Code</TableHead>
                    <TableHead className="font-bold py-3.5 px-5">Vendor</TableHead>
                    <TableHead className="font-bold py-3.5 px-5">Bill Date</TableHead>
                    <TableHead className="font-bold py-3.5 px-5">Due Date</TableHead>
                    <TableHead className="font-bold py-3.5 px-5">Ref / Invoice No</TableHead>
                    <TableHead className="font-bold py-3.5 px-5 text-right">Subtotal</TableHead>
                    <TableHead className="font-bold py-3.5 px-5 text-right">GST Tax</TableHead>
                    <TableHead className="font-bold py-3.5 px-5 text-right">Total Amount</TableHead>
                    <TableHead className="font-bold py-3.5 px-5 text-right text-emerald-600">Paid</TableHead>
                    <TableHead className="font-bold py-3.5 px-5 text-right text-amber-600">Balance</TableHead>
                    <TableHead className="font-bold py-3.5 px-5">Status</TableHead>
                    <TableHead className="font-bold py-3.5 px-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill: Purchase) => {
                    const balance = getOutstandingBalance(bill);
                    const isOverdue = isBillOverdue(bill);
                    return (
                      <TableRow key={bill.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                        <TableCell className="font-mono font-bold py-3.5 px-5 text-foreground">{bill.purchaseNo}</TableCell>
                        <TableCell className="py-3.5 px-5 font-semibold text-foreground">{bill.vendor?.name}</TableCell>
                        <TableCell className="py-3.5 px-5 text-xs text-muted-foreground">{new Date(bill.date).toLocaleDateString()}</TableCell>
                        <TableCell className="py-3.5 px-5 text-xs">
                          {bill.gstBreakup?.dueDate ? (
                            <span className={isOverdue ? "text-red-500 font-bold" : "text-muted-foreground"}>
                              {new Date(bill.gstBreakup.dueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-5 text-xs text-muted-foreground font-mono">{bill.reference || 'N/A'}</TableCell>
                        <TableCell className="py-3.5 px-5 text-right font-medium">{formatCurrency(Number(bill.subTotal))}</TableCell>
                        <TableCell className="py-3.5 px-5 text-right text-muted-foreground text-xs">{formatCurrency(Number(bill.taxTotal))}</TableCell>
                        <TableCell className="py-3.5 px-5 text-right font-bold text-foreground">{formatCurrency(Number(bill.grandTotal))}</TableCell>
                        <TableCell className="py-3.5 px-5 text-right text-xs font-semibold text-emerald-500">{formatCurrency(Number(bill.amountPaid))}</TableCell>
                        <TableCell className="py-3.5 px-5 text-right text-xs font-bold text-amber-500">{formatCurrency(balance)}</TableCell>
                        <TableCell className="py-3.5 px-5">
                          {bill.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 uppercase tracking-wide">
                              <CheckCircle className="w-2.5 h-2.5" /> PAID
                            </span>
                          ) : bill.status === 'PARTIAL' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">
                              <AlertTriangle className="w-2.5 h-2.5" /> PARTIAL
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wide">
                              <ShieldAlert className="w-2.5 h-2.5" /> OVERDUE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wide">
                              POSTED
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setSelectedBill(bill); setIsViewModalOpen(true); }}
                              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="View Audit Ledger & Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/bills/new?edit=${bill.id}`)}
                              disabled={bill.status === 'PAID'}
                              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-blue-500 transition-colors disabled:opacity-20 cursor-pointer"
                              title="Edit Bill Details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/bills/new?duplicate=${bill.id}`)}
                              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-violet-500 transition-colors cursor-pointer"
                              title="Duplicate Bill"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenPayment(bill)}
                              disabled={balance <= 0}
                              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-emerald-500 transition-colors disabled:opacity-20 cursor-pointer"
                              title="Record Payout Allocation"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            <PdfDownloadButton
                              filename={`Bill-${bill.purchaseNo}.pdf`}
                              data={{
                                company: { name: companyProfile.name || '', address: companyProfile.address || '', email: companyProfile.email || '' },
                                customer: { name: bill.vendor?.name || 'Unknown', address: bill.vendor?.state || 'N/A' },
                                document: { title: 'Purchase Bill', documentNo: bill.purchaseNo, date: bill.date, status: bill.status },
                                items: bill.items?.map(i => {
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
                                  subTotal: Number(bill.subTotal),
                                  taxTotal: Number(bill.taxTotal),
                                  grandTotal: Number(bill.grandTotal),
                                  amountPaid: Number(bill.amountPaid || 0),
                                  balance: getOutstandingBalance(bill),
                                  currency: 'INR'
                                }
                              }}
                              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            />
                            <button
                              onClick={() => setBillToCancel(bill)}
                              disabled={bill.status === 'PAID'}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors disabled:opacity-20"
                              title="Cancel & Reverse Entries"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                            <button
                              onClick={() => setBillToDelete(bill)}
                              disabled={bill.status === 'PAID'}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-20"
                              title="Delete Bill"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

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
    </PageContainer>
      <ConfirmDialog isOpen={!!billToCancel} onClose={() => setBillToCancel(null)} onConfirm={async () => { cancelMutation.mutate(billToCancel!.id); setBillToCancel(null); }} title="Cancel Purchase Bill" message={<span>Cancel bill <strong>{billToCancel?.purchaseNo}</strong>? This will reverse ledger accounts and stock changes.</span>} confirmText="Cancel Bill" variant="danger" />
      <DeleteDialog isOpen={!!billToDelete} onClose={() => setBillToDelete(null)} onConfirm={async () => { deleteMutation.mutate(billToDelete!.id); setBillToDelete(null); }} entityName="Purchase Bill" entityId={billToDelete?.purchaseNo} warningText="This action is irreversible." />
    </>
  );
};
