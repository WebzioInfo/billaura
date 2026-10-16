import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Edit,
  Printer,
  Trash2,
  DollarSign,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  LayoutGrid,
  List,
  Eye,
  AlertCircle,
  X,
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import {
  ZohoPageHeader,
  ZohoListTable,
  ZohoColumn,
  ZohoSplitDetail,
  ZohoSplitListItem,
  ZohoPDFPreview,
  ZohoStatusText,
  ZohoViewOption,
} from '@/shared/components/zoho';
import { DeleteDialog } from '@/shared/components/ui';

interface Vendor {
  id: string;
  name: string;
  gstin?: string;
  state?: string;
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
  product?: { name: string };
}

interface Purchase {
  id: string;
  purchaseNo: string;
  vendorId: string;
  date: string;
  dueDate?: string;
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
  vendor: Vendor;
  items: PurchaseItem[];
  allocations?: any[];
}

export const BillsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState('ALL');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [isKpiVisible, setIsKpiVisible] = useState(true);
  const [isPaymentsCollapsed, setIsPaymentsCollapsed] = useState(false);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [isLoadingJournals, setIsLoadingJournals] = useState(false);
  const [billToDelete, setBillToDelete] = useState<Purchase | null>(null);

  // Queries
  const { data: bills = [], isLoading, isError, error, refetch } = useQuery<Purchase[]>({
    queryKey: ['bills'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases');
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: meData } = useQuery<any>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  const companyProfile = meData?.data?.company || meData?.company || null;

  // Selected bill
  const selectedBill = useMemo(() => {
    return bills.find((b) => b.id === selectedBillId) || null;
  }, [bills, selectedBillId]);

  // Fetch journal entries for selected bill
  useEffect(() => {
    const fetchJournals = async () => {
      if (!selectedBill) return;
      setIsLoadingJournals(true);
      try {
        const res = await apiClient.get('/journal-entries', {
          params: { search: selectedBill.purchaseNo },
        });
        const list = res.data?.data || res.data || [];
        setJournalEntries(Array.isArray(list) ? list : []);
      } catch (err) {
        setJournalEntries([]);
      } finally {
        setIsLoadingJournals(false);
      }
    };
    if (selectedBill) {
      fetchJournals();
    }
  }, [selectedBill]);

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/purchases/${id}`);
    },
    onSuccess: async () => {
      notification.success('Bill deleted successfully');
      await erpInvalidate.purchaseBill(queryClient, {
        vendorId: billToDelete?.vendorId || undefined,
      });
      setBillToDelete(null);
      if (selectedBillId === billToDelete?.id) {
        setSelectedBillId(null);
      }
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete bill');
    },
  });

  // KPI Computations
  const kpis = useMemo(() => {
    let totalOutstanding = 0;
    let dueToday = 0;
    let dueWithin30 = 0;
    let overdueBills = 0;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    bills.forEach((b) => {
      const balance = Math.max(0, Number(b.grandTotal || 0) - Number(b.amountPaid || 0));
      totalOutstanding += balance;

      if (b.dueDate && balance > 0) {
        const due = new Date(b.dueDate);
        const dueStr = due.toISOString().split('T')[0];
        if (dueStr === todayStr) {
          dueToday += balance;
        } else if (due < now) {
          overdueBills += balance;
        } else if (due <= in30Days) {
          dueWithin30 += balance;
        }
      }
    });

    return { totalOutstanding, dueToday, dueWithin30, overdueBills };
  }, [bills]);

  // Views Filter
  const views: ZohoViewOption[] = [
    { id: 'ALL', label: 'All Bills', count: bills.length },
    {
      id: 'DRAFT',
      label: 'Draft',
      count: bills.filter((b) => b.status === 'DRAFT').length,
    },
    {
      id: 'UNPAID',
      label: 'Unpaid / Open',
      count: bills.filter((b) => Number(b.grandTotal) > Number(b.amountPaid)).length,
    },
    {
      id: 'OVERDUE',
      label: 'Overdue',
      count: bills.filter((b) => {
        const bal = Number(b.grandTotal) - Number(b.amountPaid);
        return bal > 0 && b.dueDate && new Date(b.dueDate) < new Date();
      }).length,
    },
    {
      id: 'PAID',
      label: 'Paid',
      count: bills.filter((b) => Number(b.grandTotal) <= Number(b.amountPaid) && Number(b.grandTotal) > 0).length,
    },
  ];

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (activeView === 'DRAFT') return b.status === 'DRAFT';
      if (activeView === 'UNPAID') return Number(b.grandTotal) > Number(b.amountPaid);
      if (activeView === 'OVERDUE') {
        const bal = Number(b.grandTotal) - Number(b.amountPaid);
        return bal > 0 && b.dueDate && new Date(b.dueDate) < new Date();
      }
      if (activeView === 'PAID') {
        return Number(b.grandTotal) <= Number(b.amountPaid) && Number(b.grandTotal) > 0;
      }
      return true;
    });
  }, [bills, activeView]);

  const getBillStatus = (bill: Purchase) => {
    if (bill.status === 'DRAFT') return 'DRAFT';
    const total = Number(bill.grandTotal || 0);
    const paid = Number(bill.amountPaid || 0);
    if (total > 0 && paid >= total) return 'PAID';
    if (bill.dueDate) {
      const due = new Date(bill.dueDate);
      const today = new Date();
      if (due < today) {
        const diffDays = Math.ceil((today.getTime() - due.getTime()) / (1000 * 3600 * 24));
        return `OVERDUE BY ${diffDays} DAYS`;
      }
    }
    if (paid > 0 && paid < total) return 'PARTIALLY PAID';
    return 'OPEN';
  };

  const splitItems = useMemo<ZohoSplitListItem[]>(() => {
    return filteredBills.map((b) => ({
      id: b.id,
      name: b.vendor?.name || 'Unknown Vendor',
      amount: `₹${(Number(b.grandTotal) || 0).toLocaleString('en-IN')}`,
      number: b.purchaseNo,
      date: b.date ? new Date(b.date).toLocaleDateString('en-GB') : '',
      status: getBillStatus(b),
    }));
  }, [filteredBills]);

  // Columns definition
  const columns: ZohoColumn<Purchase>[] = [
    {
      key: 'date',
      label: 'Date',
      width: '110px',
      render: (b) => (
        <span className="text-[#2B2F36] font-medium">
          {b.date ? new Date(b.date).toLocaleDateString('en-GB') : '-'}
        </span>
      ),
    },
    {
      key: 'purchaseNo',
      label: 'Bill#',
      width: '130px',
      render: (b) => (
        <span className="text-[#408DFB] hover:underline font-medium font-mono cursor-pointer">
          {b.purchaseNo}
        </span>
      ),
    },
    {
      key: 'reference',
      label: 'Reference Number',
      width: '150px',
      render: (b) => (
        <span className="text-[#6B7280]">{b.reference || '-'}</span>
      ),
    },
    {
      key: 'vendor',
      label: 'Vendor Name',
      render: (b) => (
        <span className="text-[#2B2F36] font-medium truncate block max-w-[200px]">
          {b.vendor?.name || 'Unknown Vendor'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '140px',
      render: (b) => <ZohoStatusText status={getBillStatus(b)} />,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      width: '110px',
      render: (b) => (
        <span className="text-[#6B7280]">
          {b.dueDate ? new Date(b.dueDate).toLocaleDateString('en-GB') : '-'}
        </span>
      ),
    },
    {
      key: 'grandTotal',
      label: 'Amount',
      align: 'right',
      width: '120px',
      render: (b) => (
        <span className="font-semibold text-[#2B2F36] tabular-nums">
          ₹{(Number(b.grandTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'balance',
      label: 'Balance Due',
      align: 'right',
      width: '120px',
      render: (b) => {
        const bal = Math.max(0, Number(b.grandTotal || 0) - Number(b.amountPaid || 0));
        return (
          <span className={`font-semibold tabular-nums ${bal > 0 ? 'text-[#E54B4B]' : 'text-[#6B7280]'}`}>
            ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden select-none">
      {/* 1. Zoho Page Header with View Switcher & Split + New */}
      <ZohoPageHeader
        title="All Bills"
        views={views}
        activeViewId={activeView}
        onViewChange={(vId) => setActiveView(vId)}
        newAction={{
          label: '+ New',
          onClick: () => navigate('/bills/new'),
          splitItems: [
            { label: 'New Bill', onClick: () => navigate('/bills/new') },
            { label: 'Import Bills', onClick: () => notification.info('Import Bills via CSV') },
          ],
        }}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['bills'] })}
        moreActions={[
          {
            label: viewMode === 'list' ? 'Card View' : 'List View',
            onClick: () => setViewMode(viewMode === 'list' ? 'card' : 'list'),
          },
          { label: 'Export Bills', onClick: () => notification.info('Exporting Bills to CSV...') },
        ]}
      />

      {/* 2. KPI Strip above the table with Hide link */}
      {isKpiVisible && !selectedBill && (
        <div className="bg-[#F8F9FB] border-b border-[#E5E7EB] px-6 py-3 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-6 flex-1 max-w-5xl divide-x divide-[#E5E7EB]">
            {/* 1. Total Outstanding Payables with orange circle icon */}
            <div className="flex items-center gap-3 pr-6">
              <div className="w-8 h-8 rounded-full bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[#6B7280] block text-[11px] font-medium">Total Outstanding Payables</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#2B2F36] tabular-nums">
                    ₹{kpis.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['bills'] })}
                    className="text-[11px] text-[#408DFB] hover:underline cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Due Today */}
            <div className="pl-6 pr-6">
              <span className="text-[#6B7280] block text-[11px] font-medium">Due Today</span>
              <span className="text-sm font-bold text-[#D97706] tabular-nums">
                ₹{kpis.dueToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 3. Due Within 30 Days */}
            <div className="pl-6 pr-6">
              <span className="text-[#6B7280] block text-[11px] font-medium">Due Within 30 Days</span>
              <span className="text-sm font-bold text-[#2B2F36] tabular-nums">
                ₹{kpis.dueWithin30.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 4. OverDue Bills */}
            <div className="pl-6">
              <span className="text-[#6B7280] block text-[11px] font-medium">OverDue Bills</span>
              <span className="text-sm font-bold text-[#E54B4B] tabular-nums">
                ₹{kpis.overdueBills.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsKpiVisible(false)}
            className="text-[11px] text-[#408DFB] hover:underline cursor-pointer ml-4 shrink-0 font-medium flex items-center gap-0.5"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Hide
          </button>
        </div>
      )}
      {!isKpiVisible && !selectedBill && (
        <div className="bg-[#F8F9FB] border-b border-[#E5E7EB] px-6 py-1 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => setIsKpiVisible(true)}
            className="text-[11px] text-[#408DFB] hover:underline cursor-pointer font-medium flex items-center gap-0.5"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Show Summary
          </button>
        </div>
      )}

      {/* 3. Main Workspace: ListTable or SplitDetail */}
      <div className="flex-1 overflow-hidden">
        {selectedBill ? (
          <ZohoSplitDetail
            moduleTitle="All Bills"
            items={splitItems}
            selectedId={selectedBill.id}
            onSelect={(id) => setSelectedBillId(id)}
            onNew={() => navigate('/bills/new')}
            onClose={() => setSelectedBillId(null)}
            detailTitle={selectedBill.purchaseNo}
            detailActions={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigate(`/bills/new?edit=${selectedBill.id}`)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>PDF/Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/vendor-payments/new?vendorId=${selectedBill.vendorId || ''}&billId=${selectedBill.id}`)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-medium cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillToDelete(selectedBill)}
                  className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#FEF2F2] rounded-[4px] text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                  title="Delete Bill"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            }
          >
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
              {/* Collapsible Payments Made */}
              {Number(selectedBill.amountPaid) > 0 && (
                <div className="border border-[#CBD5E1] rounded-[4px] bg-[#F8F9FB] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsPaymentsCollapsed(!isPaymentsCollapsed)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-[#2B2F36] cursor-pointer hover:bg-[#F3F4F6]"
                  >
                    <span className="flex items-center gap-1.5">
                      {isPaymentsCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Payments Made (1)
                    </span>
                    <span className="text-green-700 font-bold">
                      -₹{Number(selectedBill.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </button>

                  {!isPaymentsCollapsed && (
                    <div className="p-3 bg-white border-t border-[#CBD5E1] text-xs">
                      <div className="flex justify-between items-center py-1 text-[#6B7280]">
                        <span>Payment recorded towards {selectedBill.purchaseNo}</span>
                        <span className="font-semibold text-[#2B2F36]">
                          ₹{Number(selectedBill.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PDF Preview Card with Corner Ribbon */}
              <ZohoPDFPreview
                status={getBillStatus(selectedBill)}
                onPrint={() => window.print()}
                onDownload={() => window.print()}
              >
                <div className="space-y-6 text-xs text-[#2B2F36]">
                  {/* Bill Header */}
                  <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#2B2F36] uppercase tracking-wide">VENDOR BILL</h2>
                      <p className="font-mono text-xs text-[#6B7280] mt-0.5">{selectedBill.purchaseNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-[#2B2F36]">{selectedBill.vendor?.name}</p>
                      {selectedBill.vendor?.gstin && <p className="text-[11px] text-[#6B7280]">GSTIN: {selectedBill.vendor.gstin}</p>}
                    </div>
                  </div>

                  {/* Dates & Reference */}
                  <div className="grid grid-cols-3 gap-4 py-2 text-xs">
                    <div>
                      <span className="text-[#6B7280] block text-[11px]">Bill Date</span>
                      <span className="font-semibold">{selectedBill.date ? new Date(selectedBill.date).toLocaleDateString('en-GB') : '-'}</span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block text-[11px]">Due Date</span>
                      <span className="font-semibold">{selectedBill.dueDate ? new Date(selectedBill.dueDate).toLocaleDateString('en-GB') : '-'}</span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block text-[11px]">Reference#</span>
                      <span className="font-semibold">{selectedBill.reference || '-'}</span>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-[#CBD5E1] rounded-[4px] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-[#F8F9FB] border-b border-[#CBD5E1] text-[#6B7280] font-semibold">
                        <tr>
                          <th className="py-2 px-3 text-left">Item Details</th>
                          <th className="py-2 px-2 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">Rate</th>
                          <th className="py-2 px-3 text-right">Tax %</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {selectedBill.items?.map((it, idx) => (
                          <tr key={idx} className="hover:bg-[#F9FAFB]">
                            <td className="py-2 px-3 font-medium text-[#2B2F36]">
                              {it.product?.name || it.description}
                            </td>
                            <td className="py-2 px-2 text-right">{it.qty}</td>
                            <td className="py-2 px-3 text-right">₹{Number(it.rate).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right">{it.taxPercent}%</td>
                            <td className="py-2 px-3 text-right font-semibold">₹{Number(it.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Breakdown */}
                  <div className="flex justify-end">
                    <div className="w-72 space-y-1.5 text-xs bg-[#F8F9FB] p-4 rounded-[4px] border border-[#CBD5E1]">
                      <div className="flex justify-between text-[#6B7280]">
                        <span>Sub Total</span>
                        <span className="font-medium text-[#2B2F36]">₹{Number(selectedBill.subTotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#6B7280]">
                        <span>Taxes (GST)</span>
                        <span className="font-medium text-[#2B2F36]">₹{Number(selectedBill.taxTotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-[#2B2F36] pt-1.5 border-t border-[#CBD5E1]">
                        <span>Total (₹)</span>
                        <span>₹{Number(selectedBill.grandTotal || 0).toFixed(2)}</span>
                      </div>
                      {Number(selectedBill.amountPaid) > 0 && (
                        <div className="flex justify-between text-red-600 font-semibold pt-1 border-t border-[#E5E7EB]">
                          <span>Payments Made</span>
                          <span>-₹{Number(selectedBill.amountPaid).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm text-[#E54B4B] pt-1 border-t border-[#CBD5E1] bg-red-50/50 p-1.5 rounded-[2px]">
                        <span>Balance Due</span>
                        <span>₹{Math.max(0, Number(selectedBill.grandTotal || 0) - Number(selectedBill.amountPaid || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ZohoPDFPreview>

              {/* Journal Entries Section */}
              <div className="border border-[#CBD5E1] rounded-[4px] overflow-hidden bg-white">
                <div className="bg-[#F8F9FB] px-4 py-2.5 border-b border-[#CBD5E1] flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                    Journal
                  </h4>
                  <span className="text-[11px] text-[#6B7280]">
                    Amount is displayed in your base currency INR
                  </span>
                </div>

                <div className="p-4">
                  {journalEntries.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] text-[#6B7280] text-left">
                          <th className="py-2">ACCOUNT</th>
                          <th className="py-2 text-right">DEBIT</th>
                          <th className="py-2 text-right">CREDIT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {journalEntries.map((je: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2 font-medium">{je.account?.name || je.accountName || 'Accounts Payable'}</td>
                            <td className="py-2 text-right tabular-nums">{je.debit ? `₹${Number(je.debit).toFixed(2)}` : '-'}</td>
                            <td className="py-2 text-right tabular-nums">{je.credit ? `₹${Number(je.credit).toFixed(2)}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-4 text-xs text-[#6B7280]">
                      No journal lines generated yet for this transaction.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ZohoSplitDetail>
        ) : isError ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white">
            <AlertCircle className="w-10 h-10 text-[#E54B4B] mb-2" />
            <p className="text-sm font-semibold text-[#2B2F36]">Failed to load vendor bills</p>
            <p className="text-xs text-[#6B7280] max-w-sm mt-1">
              {(error as any)?.response?.data?.message || (error as any)?.message || 'An error occurred while fetching bills from the server.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 px-3 py-1.5 bg-[#408DFB] text-white rounded-[4px] text-xs font-medium hover:bg-[#2563EB] cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          <ZohoListTable
            columns={columns}
            data={filteredBills}
            isLoading={isLoading}
            keyField="id"
            onRowClick={(b) => setSelectedBillId(b.id)}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {billToDelete && (
        <DeleteDialog
          isOpen={!!billToDelete}
          onClose={() => setBillToDelete(null)}
          onConfirm={() => deleteMutation.mutate(billToDelete.id)}
          entityName={`Bill ${billToDelete.purchaseNo}`}
          warningText={`Are you sure you want to delete bill "${billToDelete.purchaseNo}"? This action cannot be undone.`}
        />
      )}
    </div>
  );
};

export default BillsList;
