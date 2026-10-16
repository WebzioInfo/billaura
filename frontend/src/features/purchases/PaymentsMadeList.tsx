import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Edit,
  Printer,
  Trash2,
  Mail,
  Eye,
  CheckCircle,
  Building,
  CreditCard,
  Search,
  Filter,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import {
  ZohoPageHeader,
  ZohoListTable,
  ZohoColumn,
  ZohoSplitDetail,
  ZohoSplitListItem,
  ZohoStatusText,
  ZohoViewOption,
} from '@/shared/components/zoho';
import { DeleteDialog } from '@/shared/components/ui';

interface VendorPayment {
  id: string;
  paymentNumber?: string;
  paymentNo?: string;
  type?: 'BILL_PAYMENT' | 'VENDOR_ADVANCE';
  date: string;
  amount: number;
  unusedAmount?: number;
  allocatedAmount?: number;
  method?: string;
  paymentMode?: string;
  reference?: string;
  referenceNo?: string;
  vendorId: string;
  vendor?: {
    name: string;
    state?: string;
  };
  businessPartner?: {
    name: string;
    state?: string;
  };
  billNo?: string;
  bill?: {
    purchaseNo: string;
    date: string;
    grandTotal: number;
  };
  allocations?: Array<{
    id: string;
    amount: number;
    purchase?: {
      purchaseNo: string;
      date: string;
      grandTotal: number;
    };
  }>;
  bankAccount?: {
    name: string;
  };
  status?: string;
  notes?: string;
  sourceOfSupply?: string;
  destinationOfSupply?: string;
  descriptionOfSupply?: string;
  isRcm?: boolean;
  tdsRate?: number;
  tdsAmount?: number;
}

export const PaymentsMadeList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState('ALL');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<VendorPayment | null>(null);
  const [accountingMode, setAccountingMode] = useState<'Accrual' | 'Cash'>('Accrual');

  // Queries
  const {
    data: paymentsData,
    isLoading,
    isError,
    refetch,
  } = useQuery<any>({
    queryKey: ['purchases', 'payments'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/payments', { params: { limit: 200 } });
      return ensureArray<VendorPayment>(res);
    },
  });

  const payments: VendorPayment[] = Array.isArray(paymentsData) ? paymentsData : [];

  const selectedPayment = useMemo(() => {
    return payments.find((p) => p.id === selectedPaymentId) || null;
  }, [payments, selectedPaymentId]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/purchases/payments/${id}`);
    },
    onSuccess: () => {
      notification.success('Payment record deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['purchases', 'payments'] });
      setPaymentToDelete(null);
      if (selectedPaymentId === paymentToDelete?.id) setSelectedPaymentId(null);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete payment');
    },
  });

  const views: ZohoViewOption[] = [
    { id: 'ALL', label: 'All Payments', count: payments.length },
    {
      id: 'PAID',
      label: 'Paid / Completed',
      count: payments.filter((p) => (p.status || 'PAID').toUpperCase() === 'PAID').length,
    },
    {
      id: 'DRAFT',
      label: 'Draft',
      count: payments.filter((p) => p.status?.toUpperCase() === 'DRAFT').length,
    },
    {
      id: 'ADVANCE',
      label: 'Vendor Advances',
      count: payments.filter((p) => p.type === 'VENDOR_ADVANCE').length,
    },
  ];

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const st = (p.status || 'PAID').toUpperCase();
      if (activeView === 'DRAFT' && st !== 'DRAFT') return false;
      if (activeView === 'PAID' && st !== 'PAID') return false;
      if (activeView === 'ADVANCE' && p.type !== 'VENDOR_ADVANCE') return false;

      if (selectedModeFilter !== 'ALL') {
        const mode = (p.paymentMode || p.method || '').toUpperCase();
        if (mode !== selectedModeFilter) return false;
      }

      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const pNo = (p.paymentNumber || p.paymentNo || '').toLowerCase();
        const ref = (p.reference || p.referenceNo || '').toLowerCase();
        const vName = (p.vendor?.name || p.businessPartner?.name || '').toLowerCase();
        const bNo = (p.billNo || p.bill?.purchaseNo || '').toLowerCase();
        const match =
          pNo.includes(term) ||
          ref.includes(term) ||
          vName.includes(term) ||
          bNo.includes(term);
        if (!match) return false;
      }

      return true;
    });
  }, [payments, activeView, selectedModeFilter, searchQuery]);

  const splitItems = useMemo<ZohoSplitListItem[]>(() => {
    return filteredPayments.map((p) => ({
      id: p.id,
      name: p.vendor?.name || p.businessPartner?.name || 'Unknown Vendor',
      amount: `₹${(Number(p.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      number: p.paymentNumber || p.paymentNo || `PAY-${p.id.slice(-5)}`,
      date: p.date ? new Date(p.date).toLocaleDateString('en-GB') : '',
      status: (p.status || 'PAID').toUpperCase(),
    }));
  }, [filteredPayments]);

  const columns: ZohoColumn<VendorPayment>[] = [
    {
      key: 'date',
      label: 'Date',
      width: '110px',
      render: (p) => (
        <span className="text-[#2B2F36] font-medium">
          {p.date ? new Date(p.date).toLocaleDateString('en-GB') : '-'}
        </span>
      ),
    },
    {
      key: 'paymentNo',
      label: 'Payment #',
      width: '140px',
      render: (p) => (
        <span
          onClick={() => setSelectedPaymentId(p.id)}
          className="text-[#408DFB] hover:underline font-mono font-medium cursor-pointer"
        >
          {p.paymentNumber || p.paymentNo || `PAY-${p.id.slice(-5)}`}
        </span>
      ),
    },
    {
      key: 'reference',
      label: 'Reference#',
      width: '130px',
      render: (p) => <span className="text-[#6B7280]">{p.reference || p.referenceNo || '-'}</span>,
    },
    {
      key: 'vendor',
      label: 'Vendor Name',
      render: (p) => (
        <span
          onClick={() => p.vendorId && navigate(`/vendors/${p.vendorId}`)}
          className="text-[#2B2F36] hover:text-[#408DFB] font-medium truncate block max-w-[200px] cursor-pointer"
        >
          {p.vendor?.name || p.businessPartner?.name || 'Unknown Vendor'}
        </span>
      ),
    },
    {
      key: 'billNo',
      label: 'Bill#',
      width: '140px',
      render: (p) => {
        if (p.type === 'VENDOR_ADVANCE') {
          return <span className="text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">Vendor Advance</span>;
        }
        const bText = p.billNo || p.bill?.purchaseNo || '-';
        return <span className="text-[#6B7280] font-mono">{bText}</span>;
      },
    },
    {
      key: 'method',
      label: 'Mode',
      width: '120px',
      render: (p) => (
        <span className="text-[#6B7280] capitalize">
          {(p.paymentMode || p.method || 'Cash').toLowerCase().replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (p) => <ZohoStatusText status={(p.status || 'PAID').toUpperCase()} />,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      width: '120px',
      render: (p) => (
        <span className="font-semibold text-[#2B2F36] tabular-nums">
          ₹{(Number(p.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'unusedAmount',
      label: 'Unused Amount',
      align: 'right',
      width: '120px',
      render: (p) => (
        <span className="text-[#6B7280] tabular-nums">
          ₹{(Number(p.unusedAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white space-y-3">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <h3 className="text-base font-semibold text-gray-800">Failed to load payments</h3>
        <p className="text-xs text-gray-500 max-w-sm">
          An error occurred while fetching payment records. Please try again.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#408DFB] text-white text-xs font-semibold rounded-[4px] flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden select-none">
      <ZohoPageHeader
        title="All Payments"
        views={views}
        activeViewId={activeView}
        onViewChange={(vId) => setActiveView(vId)}
        newAction={{
          label: '+ New',
          onClick: () => navigate('/payments-made/new'),
        }}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['purchases', 'payments'] })}
      />

      {/* Filter and Search Bar */}
      <div className="px-6 py-2.5 border-b border-[#E5E7EB] bg-[#F8F9FB] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Payment#, Vendor, Reference#, or Bill#..."
              className="w-full h-8 pl-8 pr-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500">Mode:</span>
            <select
              value={selectedModeFilter}
              onChange={(e) => setSelectedModeFilter(e.target.value)}
              className="h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
            >
              <option value="ALL">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {selectedPayment ? (
          <ZohoSplitDetail
            moduleTitle="All Payments"
            items={splitItems}
            selectedId={selectedPayment.id}
            onSelect={(id) => setSelectedPaymentId(id)}
            onNew={() => navigate('/payments-made/new')}
            onClose={() => setSelectedPaymentId(null)}
            detailTitle={selectedPayment.paymentNumber || `Payment #${selectedPayment.id.slice(-5)}`}
            detailActions={
              <div className="flex items-center gap-1.5">
                {selectedPayment.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => navigate(`/payments-made/new?editId=${selectedPayment.id}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>Edit Draft</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => notification.info('Email payment confirmation to vendor')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Send Email</span>
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
                  onClick={() => setPaymentToDelete(selectedPayment)}
                  className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#FEF2F2] rounded-[4px] text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                  title="Delete Payment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            }
          >
            <div className="p-6 space-y-6 max-w-4xl mx-auto text-xs text-[#2B2F36]">
              {/* Receipt-Style Layout Header */}
              <div className="bg-white border border-[#CBD5E1] rounded-[4px] p-6 shadow-2xs space-y-6">
                <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#2B2F36] uppercase tracking-wide">
                      {selectedPayment.type === 'VENDOR_ADVANCE'
                        ? 'VENDOR ADVANCE PAYMENT RECEIPT'
                        : 'PAYMENT RECEIPT'}
                    </h2>
                    <p className="font-mono text-xs text-[#6B7280] mt-0.5">
                      {selectedPayment.paymentNumber || `PAY-${selectedPayment.id.slice(-5)}`}
                    </p>
                    {selectedPayment.status === 'DRAFT' && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        DRAFT
                      </span>
                    )}
                  </div>
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-[4px] text-right">
                    <span className="text-[11px] uppercase font-semibold block">Amount Paid</span>
                    <span className="text-base font-bold">
                      ₹{Number(selectedPayment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Key-Value Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Payment Date</span>
                    <span className="font-semibold text-[#2B2F36]">
                      {selectedPayment.date ? new Date(selectedPayment.date).toLocaleDateString('en-GB') : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Reference Number</span>
                    <span className="font-semibold text-[#2B2F36]">{selectedPayment.reference || selectedPayment.referenceNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Paid To</span>
                    <span
                      onClick={() => selectedPayment.vendorId && navigate(`/vendors/${selectedPayment.vendorId}`)}
                      className="font-semibold text-[#408DFB] hover:underline cursor-pointer"
                    >
                      {selectedPayment.vendor?.name || selectedPayment.businessPartner?.name || 'Unknown Vendor'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Place of Supply</span>
                    <span className="font-semibold text-[#2B2F36]">
                      {selectedPayment.sourceOfSupply || selectedPayment.vendor?.state || selectedPayment.businessPartner?.state || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Payment Mode</span>
                    <span className="font-semibold text-[#2B2F36] capitalize">
                      {(selectedPayment.paymentMode || selectedPayment.method || 'Cash').toLowerCase().replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Paid Through</span>
                    <span className="font-semibold text-[#2B2F36]">
                      {selectedPayment.bankAccount?.name || 'Petty Cash'}
                    </span>
                  </div>

                  {selectedPayment.type === 'VENDOR_ADVANCE' && (
                    <>
                      <div>
                        <span className="text-[#6B7280] block text-[11px]">Destination of Supply</span>
                        <span className="font-semibold text-[#2B2F36]">
                          {selectedPayment.destinationOfSupply || 'Not specified'}
                        </span>
                      </div>
                      {selectedPayment.tdsAmount ? (
                        <div>
                          <span className="text-[#6B7280] block text-[11px]">TDS Deducted</span>
                          <span className="font-semibold text-red-600">
                            ₹{Number(selectedPayment.tdsAmount).toFixed(2)} ({selectedPayment.tdsRate}%)
                          </span>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Payment For Table */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-[#2B2F36]">Payment for</h4>
                  <div className="border border-[#CBD5E1] rounded-[4px] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-[#F8F9FB] border-b border-[#CBD5E1] text-[#6B7280] font-semibold text-left">
                        <tr>
                          <th className="py-2 px-3">Bill Number</th>
                          <th className="py-2 px-3">Bill Date</th>
                          <th className="py-2 px-3 text-right">Bill Amount</th>
                          <th className="py-2 px-3 text-right">Payment Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPayment.type === 'VENDOR_ADVANCE' ? (
                          <tr>
                            <td colSpan={3} className="py-2.5 px-3 font-medium text-amber-800 bg-amber-50/50">
                              Vendor Advance (Unapplied on-account credit)
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#2B2F36] tabular-nums bg-amber-50/50">
                              ₹{Number(selectedPayment.amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        ) : selectedPayment.allocations && selectedPayment.allocations.length > 0 ? (
                          selectedPayment.allocations.map((alloc, idx) => (
                            <tr key={alloc.id || idx} className="border-b border-gray-100 last:border-0">
                              <td className="py-2.5 px-3 font-mono font-medium text-[#408DFB]">
                                {alloc.purchase?.purchaseNo || 'Bill'}
                              </td>
                              <td className="py-2.5 px-3 text-[#6B7280]">
                                {alloc.purchase?.date ? new Date(alloc.purchase.date).toLocaleDateString('en-GB') : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums">
                                {alloc.purchase?.grandTotal ? `₹${Number(alloc.purchase.grandTotal).toFixed(2)}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-[#2B2F36] tabular-nums">
                                ₹{Number(alloc.amount || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-medium text-[#408DFB]">
                              {selectedPayment.bill?.purchaseNo || selectedPayment.billNo || 'General On-Account'}
                            </td>
                            <td className="py-2.5 px-3 text-[#6B7280]">
                              {selectedPayment.bill?.date ? new Date(selectedPayment.bill.date).toLocaleDateString('en-GB') : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums">
                              {selectedPayment.bill?.grandTotal ? `₹${Number(selectedPayment.bill.grandTotal).toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#2B2F36] tabular-nums">
                              ₹{Number(selectedPayment.amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Journal with Accrual / Cash Toggle */}
              <div className="border border-[#CBD5E1] rounded-[4px] overflow-hidden bg-white">
                <div className="bg-[#F8F9FB] px-4 py-2.5 border-b border-[#CBD5E1] flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                    Journal
                  </h4>
                  <div className="inline-flex rounded-[4px] border border-[#CBD5E1] bg-white overflow-hidden text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAccountingMode('Accrual')}
                      className={`px-2.5 py-1 ${accountingMode === 'Accrual' ? 'bg-[#408DFB] text-white font-medium' : 'text-[#6B7280]'}`}
                    >
                      Accrual
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountingMode('Cash')}
                      className={`px-2.5 py-1 ${accountingMode === 'Cash' ? 'bg-[#408DFB] text-white font-medium' : 'text-[#6B7280]'}`}
                    >
                      Cash
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] text-[#6B7280] text-left">
                        <th className="py-2">ACCOUNT</th>
                        <th className="py-2 text-right">DEBIT</th>
                        <th className="py-2 text-right">CREDIT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {selectedPayment.type === 'VENDOR_ADVANCE' ? (
                        <>
                          <tr>
                            <td className="py-2 font-medium">Vendor Advances ({selectedPayment.vendor?.name || 'Vendor'})</td>
                            <td className="py-2 text-right tabular-nums font-semibold">₹{Number(selectedPayment.amount || 0).toFixed(2)}</td>
                            <td className="py-2 text-right tabular-nums">-</td>
                          </tr>
                          {selectedPayment.tdsAmount ? (
                            <tr>
                              <td className="py-2 font-medium">TDS Payable</td>
                              <td className="py-2 text-right tabular-nums">-</td>
                              <td className="py-2 text-right tabular-nums font-semibold">₹{Number(selectedPayment.tdsAmount).toFixed(2)}</td>
                            </tr>
                          ) : null}
                          <tr>
                            <td className="py-2 font-medium">{selectedPayment.bankAccount?.name || 'Bank Account / Cash'}</td>
                            <td className="py-2 text-right tabular-nums">-</td>
                            <td className="py-2 text-right tabular-nums font-semibold">
                              ₹{(Number(selectedPayment.amount || 0) - Number(selectedPayment.tdsAmount || 0)).toFixed(2)}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <td className="py-2 font-medium">Accounts Payable ({selectedPayment.vendor?.name || 'Vendor'})</td>
                            <td className="py-2 text-right tabular-nums font-semibold">
                              ₹{Number(selectedPayment.allocatedAmount || selectedPayment.amount || 0).toFixed(2)}
                            </td>
                            <td className="py-2 text-right tabular-nums">-</td>
                          </tr>
                          {selectedPayment.unusedAmount ? (
                            <tr>
                              <td className="py-2 font-medium">Vendor Advances (Excess)</td>
                              <td className="py-2 text-right tabular-nums font-semibold">
                                ₹{Number(selectedPayment.unusedAmount).toFixed(2)}
                              </td>
                              <td className="py-2 text-right tabular-nums">-</td>
                            </tr>
                          ) : null}
                          <tr>
                            <td className="py-2 font-medium">{selectedPayment.bankAccount?.name || 'Petty Cash / Bank Account'}</td>
                            <td className="py-2 text-right tabular-nums">-</td>
                            <td className="py-2 text-right tabular-nums font-semibold">₹{Number(selectedPayment.amount || 0).toFixed(2)}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ZohoSplitDetail>
        ) : (
          <ZohoListTable
            columns={columns}
            data={filteredPayments}
            isLoading={isLoading}
            keyField="id"
            onRowClick={(p) => setSelectedPaymentId(p.id)}
          />
        )}
      </div>

      {paymentToDelete && (
        <DeleteDialog
          isOpen={!!paymentToDelete}
          onClose={() => setPaymentToDelete(null)}
          onConfirm={() => deleteMutation.mutate(paymentToDelete.id)}
          entityName={`Payment #${paymentToDelete.paymentNumber || paymentToDelete.paymentNo || paymentToDelete.id.slice(-5)}`}
          warningText={`Are you sure you want to delete payment record #${paymentToDelete.paymentNumber || paymentToDelete.paymentNo || paymentToDelete.id.slice(-5)}? This action cannot be undone.`}
        />
      )}
    </div>
  );
};

export default PaymentsMadeList;
