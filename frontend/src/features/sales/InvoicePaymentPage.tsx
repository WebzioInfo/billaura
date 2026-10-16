import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  RefreshCw,
  Info,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  FileText,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  AlertCircle,
  HelpCircle,
  Layers,
  IndianRupee,
} from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { Button, SearchableSelect } from '@/shared/components/ui';
import { ZohoAttachmentUploader, AttachmentFile } from '@/shared/components/zoho';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';

interface PaymentSplit {
  id: string;
  paymentMethod: string;
  amount: number;
  accountId: string;
  referenceNo: string;
}

const PAYMENT_MODES = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT / RTGS' },
  { value: 'UPI', label: 'UPI / QR Code' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CREDIT_CARD', label: 'Credit Card / Debit Card' },
];

const TDS_SECTIONS = [
  { code: '194C-IND', label: '194C - Payment to Contractors (Individual/HUF) (1%)', rate: 1.0 },
  { code: '194C-CORP', label: '194C - Payment to Contractors (Company) (2%)', rate: 2.0 },
  { code: '194J', label: '194J - Fees for Professional / Technical Services (10%)', rate: 10.0 },
  { code: '194Q', label: '194Q - Purchase of Goods (0.1%)', rate: 0.1 },
  { code: '194H', label: '194H - Commission or Brokerage (5%)', rate: 5.0 },
  { code: '194I', label: '194I - Rent of Land / Building (10%)', rate: 10.0 },
];

export const InvoicePaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetch Invoice Details
  const {
    data: invoice,
    isLoading: loadingInvoice,
    error: invoiceError,
    refetch: refetchInvoice,
  } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/sales/invoices/${id}`);
      return res?.data?.data || res?.data || res;
    },
    enabled: Boolean(id),
  });

  useDynamicTitle(invoice?.invoiceNo ? `Payment for ${invoice.invoiceNo} — Bill Aura` : 'Record Payment — Bill Aura');

  // 2. Fetch Next Receipt Sequence Number
  const {
    data: nextNumberData,
    isLoading: loadingNextNumber,
    refetch: refetchNextNumber,
  } = useQuery({
    queryKey: ['receipt-next-number'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/sales/receipts/next-number');
      const val = res?.data?.data || res?.data || res;
      return typeof val === 'string' ? val : val?.receiptNo || 'REC-00001';
    },
  });

  // 3. Fetch Bank & Cash Accounts
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/finance/bank/accounts');
      return ensureArray(res);
    },
  });

  // Outstanding calculation
  const outstanding = useMemo(() => {
    if (!invoice) return 0;
    if (invoice.outstandingAmount !== undefined && invoice.outstandingAmount !== null) {
      return Number(invoice.outstandingAmount);
    }
    const grand = Number(invoice.grandTotal || 0);
    const paid = Number(invoice.amountPaid || 0);
    return Math.max(0, grand - paid);
  }, [invoice]);

  // Form State
  const [receiptNo, setReceiptNo] = useState('');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [bankCharges, setBankCharges] = useState<number>(0);
  const [taxDeductedType, setTaxDeductedType] = useState<'NONE' | 'TDS'>('NONE');
  const [tdsSection, setTdsSection] = useState('194C-IND');
  const [tdsAmount, setTdsAmount] = useState<number>(0);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentReceivedOn, setPaymentReceivedOn] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [depositToAccountId, setDepositToAccountId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  // Split payments toggle & list
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splits, setSplits] = useState<PaymentSplit[]>([]);

  // Attachments
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // Modals & submission state
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<any | null>(null);

  // Initialize form when invoice and next sequence load
  useEffect(() => {
    if (invoice) {
      const initAmount = Number(invoice.outstandingAmount) || Math.max(0, Number(invoice.grandTotal || 0) - Number(invoice.amountPaid || 0));
      setAmountReceived(initAmount);
      setNotes(`Payment for ${invoice.invoiceNo}`);

      // Initialize split mode rows
      setSplits([
        {
          id: Date.now().toString(),
          paymentMethod: 'BANK_TRANSFER',
          amount: initAmount,
          accountId: depositToAccountId || '',
          referenceNo: '',
        },
      ]);
    }
  }, [invoice]);

  useEffect(() => {
    if (nextNumberData && !receiptNo) {
      setReceiptNo(nextNumberData);
    }
  }, [nextNumberData]);

  // Default first account if none selected
  useEffect(() => {
    if (accounts.length > 0 && !depositToAccountId) {
      const defaultAcc = accounts.find((a: any) => a.isDefault) || accounts[0];
      const accId = defaultAcc?.accountId || defaultAcc?.id || '';
      setDepositToAccountId(accId);
      setSplits((prev) =>
        prev.map((s, idx) => (idx === 0 && !s.accountId ? { ...s, accountId: accId } : s))
      );
    }
  }, [accounts]);

  // Handle TDS changes
  const handleTdsSectionChange = (sectionCode: string) => {
    setTdsSection(sectionCode);
    const sec = TDS_SECTIONS.find((s) => s.code === sectionCode);
    if (sec && amountReceived > 0) {
      const computedTds = Number(((amountReceived * sec.rate) / 100).toFixed(2));
      setTdsAmount(computedTds);
    }
  };

  // Quick fill payment amount buttons
  const handleFillFull = () => {
    setAmountReceived(outstanding);
    if (!isSplitMode) {
      setSplits([
        {
          id: Date.now().toString(),
          paymentMethod: paymentMode,
          amount: outstanding,
          accountId: depositToAccountId,
          referenceNo,
        },
      ]);
    }
  };

  const handleFillHalf = () => {
    const half = Number((outstanding / 2).toFixed(2));
    setAmountReceived(half);
    if (!isSplitMode) {
      setSplits([
        {
          id: Date.now().toString(),
          paymentMethod: paymentMode,
          amount: half,
          accountId: depositToAccountId,
          referenceNo,
        },
      ]);
    }
  };

  // Split management
  const totalSplitAllocated = useMemo(() => {
    return splits.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  }, [splits]);

  const splitDifference = useMemo(() => {
    return Number((amountReceived - totalSplitAllocated).toFixed(2));
  }, [amountReceived, totalSplitAllocated]);

  const handleAddSplit = () => {
    const remaining = Math.max(0, amountReceived - totalSplitAllocated);
    setSplits([
      ...splits,
      {
        id: Date.now().toString(),
        paymentMethod: 'CASH',
        amount: remaining > 0 ? remaining : 0,
        accountId: depositToAccountId || '',
        referenceNo: '',
      },
    ]);
  };

  const handleRemoveSplit = (splitId: string) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((s) => s.id !== splitId));
  };

  const handleUpdateSplit = (splitId: string, field: keyof PaymentSplit, value: any) => {
    setSplits(splits.map((s) => (s.id === splitId ? { ...s, [field]: value } : s)));
  };

  // Attachments
  const handleAttachmentUpload = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: AttachmentFile[] = Array.from(fileList).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setAttachments((prev) => [...prev, ...newFiles].slice(0, 5));
  };

  const handleAttachmentRemove = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSavePayment = async (status: 'COMPLETED' | 'DRAFT') => {
    if (!invoice) return;

    if (amountReceived <= 0) {
      notification.error('Amount received must be greater than 0.');
      return;
    }

    if (amountReceived > outstanding + 0.01) {
      notification.error(
        `Amount received (₹${amountReceived.toFixed(2)}) cannot exceed the outstanding invoice balance of ₹${outstanding.toFixed(2)}.`
      );
      return;
    }

    if (isSplitMode) {
      if (Math.abs(splitDifference) > 0.01) {
        notification.error(
          `The sum of split payment modes (₹${totalSplitAllocated.toFixed(2)}) must exactly equal the total amount received (₹${amountReceived.toFixed(2)}). Difference: ₹${splitDifference.toFixed(2)}.`
        );
        return;
      }
      for (const sp of splits) {
        if (!sp.amount || sp.amount <= 0) {
          notification.error('Every payment split row must have an amount greater than 0.');
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);

      const splitPayload = isSplitMode
        ? splits.map((s) => ({
            paymentMethod: s.paymentMethod,
            amount: Number(s.amount),
            accountId: s.accountId || undefined,
            referenceNo: s.referenceNo || undefined,
            bankCharges: Number(bankCharges || 0) > 0 ? Number(bankCharges) : undefined,
          }))
        : [
            {
              paymentMethod: paymentMode,
              amount: Number(amountReceived),
              accountId: depositToAccountId || undefined,
              referenceNo: referenceNo || undefined,
              bankCharges: Number(bankCharges || 0) > 0 ? Number(bankCharges) : undefined,
            },
          ];

      const payload = {
        date,
        receiptNo: receiptNo.trim() || undefined,
        businessPartnerId: invoice.businessPartnerId,
        amount: Number(amountReceived),
        bankCharges: Number(bankCharges || 0),
        notes: notes.trim() || undefined,
        status,
        tdsAmount: taxDeductedType === 'TDS' ? Number(tdsAmount || 0) : undefined,
        allocations: [{ invoiceId: invoice.id, amount: Number(amountReceived) }],
        splitPayments: splitPayload,
      };

      const res = await apiClient.post('/sales/receipts', payload);
      const receiptObj = res?.data?.data || res?.data || res;
      setCreatedReceipt(receiptObj);

      await erpInvalidate.salesReceipt(queryClient, {
        customerId: invoice.businessPartnerId,
        invoiceIds: [invoice.id],
        accountId: isSplitMode ? splits[0]?.accountId : depositToAccountId,
      });

      notification.success(
        status === 'DRAFT'
          ? 'Payment saved as draft successfully.'
          : 'Payment recorded and posted to ledger successfully.'
      );

      // Navigate back after slight delay to see confirmation or direct
      setTimeout(() => {
        navigate(`/invoices/${invoice.id}`);
      }, 1200);
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReceiptPdf = async (receiptId: string, receiptNum: string) => {
    try {
      notification.info('Downloading receipt PDF...');
      const response = await apiClient.get(`/sales/receipts/${receiptId}/pdf`, { responseType: 'blob' });
      const blob = response instanceof Blob ? response : new Blob([(response as any).data || response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${receiptNum || 'Receipt'}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      notification.success('Receipt PDF downloaded successfully.');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to download receipt PDF');
    }
  };

  // Loading State
  if (loadingInvoice) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#408DFB] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#6B7280]">Loading invoice details...</p>
      </div>
    );
  }

  // Error State
  if (invoiceError || !invoice) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-white border border-[#E5E7EB] rounded-[4px] text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-semibold text-[#1E2540]">Invoice Not Found</h2>
        <p className="text-sm text-[#6B7280]">
          The invoice you are attempting to record payment for could not be found or has been deleted.
        </p>
        <Button variant="primary" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const customer = invoice.businessPartner;
  const isInvoiceFullyPaid = invoice.status === 'PAID' || outstanding <= 0;

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col pb-24 text-[#1E2540]">
      {/* 1. Header Toolbar */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="p-1.5 hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#1E2540] rounded-[4px] transition-colors"
            title="Back to Invoice"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[#1E2540] leading-none">
                Payment for {invoice.invoiceNo}
              </h1>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-[4px] uppercase tracking-wider ${
                  invoice.status === 'PAID'
                    ? 'bg-green-100 text-green-700'
                    : invoice.status === 'PARTIAL'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Customer: <span className="font-medium text-[#1E2540]">{customer?.name || 'Customer'}</span> • Date:{' '}
              {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCustomerDrawer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] text-xs font-semibold text-[#4B5563] rounded-[4px] transition-colors cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-[#408DFB]" />
            <span>View Customer Details</span>
          </button>
        </div>
      </div>

      {/* 2. Top Info Banner */}
      <div className="max-w-6xl w-full mx-auto px-6 pt-5">
        <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#6B7280] font-semibold block">
                Invoice Total
              </span>
              <span className="text-base font-bold text-[#1E2540]">
                ₹ {Number(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-8 w-px bg-[#E5E7EB]" />
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#6B7280] font-semibold block">
                Amount Paid
              </span>
              <span className="text-base font-bold text-green-600">
                ₹ {Number(invoice.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-8 w-px bg-[#E5E7EB]" />
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#6B7280] font-semibold block">
                Outstanding Balance
              </span>
              <span className="text-base font-bold text-[#D97706]">
                ₹ {outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7280]">Quick fill:</span>
            <button
              type="button"
              onClick={handleFillFull}
              className="px-2.5 py-1 text-xs bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] text-[#1E40AF] font-medium rounded-[4px] transition-colors"
            >
              Pay Full (₹{outstanding.toFixed(2)})
            </button>
            {outstanding > 1 && (
              <button
                type="button"
                onClick={handleFillHalf}
                className="px-2.5 py-1 text-xs bg-white border border-[#CBD5E1] hover:bg-[#F3F4F6] text-[#4B5563] font-medium rounded-[4px] transition-colors"
              >
                Pay Half (₹{(outstanding / 2).toFixed(2)})
              </button>
            )}
          </div>
        </div>

        {isInvoiceFullyPaid && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-[4px] text-green-800 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <span>This invoice is already fully paid. Any additional recorded payment will act as customer excess/advance.</span>
          </div>
        )}
      </div>

      {/* 3. Main Form Canvas */}
      <div className="max-w-6xl w-full mx-auto px-6 pt-5">
        <div className="bg-white border border-[#E5E7EB] rounded-[4px] shadow-xs overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Row 1: Customer Name & Payment # */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2540] mb-1.5">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={customer?.name || 'Customer'}
                    className="w-full h-9 px-3 bg-gray-50 border border-[#CBD5E1] rounded-[4px] text-xs font-medium text-[#1E2540] cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-[#6B7280]">
                    From Invoice
                  </div>
                </div>
              </div>

              {/* Payment # */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2540] mb-1.5">
                  Payment # <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    placeholder="e.g. REC-00001"
                    className="flex-1 h-9 px-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono font-medium text-[#1E2540] focus:border-[#408DFB] focus:ring-1 focus:ring-[#408DFB] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => refetchNextNumber()}
                    title="Generate Next Sequence Number"
                    className="h-9 px-2.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#408DFB] transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingNextNumber ? 'animate-spin text-[#408DFB]' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Amount Received & Bank Charges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount Received */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2540] mb-1.5">
                  Amount Received (INR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B7280]">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={amountReceived || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setAmountReceived(val);
                      if (!isSplitMode) {
                        setSplits((prev) =>
                          prev.map((s, idx) => (idx === 0 ? { ...s, amount: val } : s))
                        );
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-9 pl-8 pr-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-bold text-[#1E2540] focus:border-[#408DFB] focus:ring-1 focus:ring-[#408DFB] outline-none"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span>
                    PAN:{' '}
                    <strong className="text-[#1E2540]">{customer?.pan || customer?.taxNumber || 'AAKFE3589M'}</strong>
                  </span>
                  {customer?.gstin && (
                    <span>
                      GSTIN: <strong className="text-[#1E2540]">{customer.gstin}</strong>
                    </span>
                  )}
                </div>

                {amountReceived > outstanding + 0.01 && (
                  <div className="mt-1.5 text-[11px] text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle size={13} />
                    <span>Amount exceeds remaining balance of ₹{outstanding.toFixed(2)}.</span>
                  </div>
                )}
              </div>

              {/* Bank Charges */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2540] mb-1.5">
                  Bank Charges (if any)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B7280]">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bankCharges || ''}
                    onChange={(e) => setBankCharges(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full h-9 pl-8 pr-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#1E2540] focus:border-[#408DFB] focus:ring-1 focus:ring-[#408DFB] outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#6B7280]">
                  Any processing fees charged by the bank for this transaction.
                </p>
              </div>
            </div>

            {/* Row 3: Tax Deducted (TDS) */}
            <div className="pt-2 pb-1 border-y border-[#F3F4F6]">
              <label className="block text-xs font-semibold text-[#1E2540] mb-2">
                Tax deducted?
              </label>
              <div className="flex items-center gap-6 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="taxDeducted"
                    checked={taxDeductedType === 'NONE'}
                    onChange={() => setTaxDeductedType('NONE')}
                    className="text-[#408DFB] focus:ring-[#408DFB]"
                  />
                  <span>No Tax deducted</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="taxDeducted"
                    checked={taxDeductedType === 'TDS'}
                    onChange={() => {
                      setTaxDeductedType('TDS');
                      handleTdsSectionChange(tdsSection);
                    }}
                    className="text-[#408DFB] focus:ring-[#408DFB]"
                  />
                  <span>Yes, TDS (Income Tax)</span>
                </label>
              </div>

              {taxDeductedType === 'TDS' && (
                <div className="mt-4 p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px] grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1">
                      TDS Section
                    </label>
                    <select
                      value={tdsSection}
                      onChange={(e) => handleTdsSectionChange(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#1E2540] focus:border-[#408DFB] outline-none"
                    >
                      {TDS_SECTIONS.map((sec) => (
                        <option key={sec.code} value={sec.code}>
                          {sec.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1">
                      TDS Deducted Amount (INR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tdsAmount || ''}
                      onChange={(e) => setTdsAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-medium text-[#1E2540] focus:border-[#408DFB] outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Row 4: Two-Column Form Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-semibold text-[#1E2540] mb-1.5">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#1E2540] focus:border-[#408DFB] focus:ring-1 focus:ring-[#408DFB] outline-none"
                    />
                  </div>
                </div>

                {/* Payment Received On */}
                <div>
                  <label className="block text-xs font-semibold text-[#1E2540] mb-1.5">
                    Payment Received On
                  </label>
                  <input
                    type="date"
                    value={paymentReceivedOn}
                    onChange={(e) => setPaymentReceivedOn(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#1E2540] focus:border-[#408DFB] focus:ring-1 focus:ring-[#408DFB] outline-none"
                  />
                </div>

                {/* Single Payment Mode (when not split mode) */}
                {!isSplitMode && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#1E2540] mb-1.5">
                        Payment Mode
                      </label>
                      <select
                        value={paymentMode}
                        onChange={(e) => {
                          setPaymentMode(e.target.value);
                          setSplits((prev) =>
                            prev.map((s, idx) => (idx === 0 ? { ...s, paymentMethod: e.target.value } : s))
                          );
                        }}
                        className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#1E2540] focus:border-[#408DFB] focus:ring-1 focus:ring-[#408DFB] outline-none"
                      >
                        {PAYMENT_MODES.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1E2540] mb-1.5">
                        Reference#
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UTR123456789 / Cheque # 00412"
                        value={referenceNo}
                        onChange={(e) => {
                          setReferenceNo(e.target.value);
                          setSplits((prev) =>
                            prev.map((s, idx) => (idx === 0 ? { ...s, referenceNo: e.target.value } : s))
                          );
                        }}
                        className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#1E2540] focus:border-[#408DFB] focus:ring-1 focus:ring-[#408DFB] outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Deposit To Account (when not split mode) */}
                {!isSplitMode && (
                  <div>
                    <label className="block text-xs font-semibold text-[#1E2540] mb-1.5">
                      Deposit To <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={depositToAccountId}
                      onChange={(val) => {
                        setDepositToAccountId(val);
                        setSplits((prev) =>
                          prev.map((s, idx) => (idx === 0 ? { ...s, accountId: val } : s))
                        );
                      }}
                      options={accounts}
                      mapOption={(acc: any) => ({
                        value: acc.accountId || acc.id,
                        label: acc.bankName
                          ? `${acc.bankName}${acc.accountNumber ? ` - ${acc.accountNumber}` : ''}`
                          : acc.name || 'Bank Account',
                        subLabel: acc.accountType || undefined,
                        searchKeywords: [acc.accountNumber, acc.bankName, acc.name, acc.ifscCode].filter(Boolean),
                      })}
                      placeholder="Select receiving account..."
                      searchPlaceholder="Search bank or cash accounts..."
                      triggerClassName="w-full h-9 text-xs"
                      isLoading={loadingAccounts}
                      clearable={false}
                      quickCreateEntity="bankAccount"
                    />
                  </div>
                )}

                {/* Notes / Internal Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-[#1E2540] mb-1.5">
                    Notes / Internal Remarks
                  </label>
                  <textarea
                    rows={!isSplitMode ? 4 : 5}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any internal payment remarks or reconciliation details..."
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#1E2540] focus:border-[#408DFB] focus:ring-1 focus:ring-[#408DFB] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 5: Split Payment Modes (Preserving Multi-Mode feature) */}
            <div className="pt-4 border-t border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1E2540] uppercase tracking-wider">
                    Payment Mode Allocation
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSplitMode) {
                        setIsSplitMode(true);
                        if (splits.length === 0) {
                          setSplits([
                            {
                              id: Date.now().toString(),
                              paymentMethod: paymentMode,
                              amount: amountReceived,
                              accountId: depositToAccountId,
                              referenceNo,
                            },
                          ]);
                        }
                      } else {
                        setIsSplitMode(false);
                      }
                    }}
                    className="text-xs text-[#408DFB] hover:text-[#2563EB] font-medium underline"
                  >
                    {isSplitMode ? 'Switch to Single Mode' : 'Pay via Multiple Modes (Split Payment)'}
                  </button>
                </div>

                {isSplitMode && (
                  <button
                    type="button"
                    onClick={handleAddSplit}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#408DFB] bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-[4px] transition-colors"
                  >
                    <Plus size={13} />
                    <span>Add Payment Mode</span>
                  </button>
                )}
              </div>

              {isSplitMode && (
                <div className="space-y-2.5">
                  <div className="overflow-x-auto border border-[#E5E7EB] rounded-[4px]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#4B5563] font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 w-1/4">Payment Mode</th>
                          <th className="py-2.5 px-3 w-1/3">Deposit To Account</th>
                          <th className="py-2.5 px-3 w-1/5">Amount (INR)</th>
                          <th className="py-2.5 px-3">Reference / UTR</th>
                          <th className="py-2.5 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {splits.map((split) => (
                          <tr key={split.id} className="hover:bg-gray-50/50">
                            <td className="p-2.5">
                              <select
                                value={split.paymentMethod}
                                onChange={(e) => handleUpdateSplit(split.id, 'paymentMethod', e.target.value)}
                                className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#1E2540] focus:border-[#408DFB] outline-none"
                              >
                                {PAYMENT_MODES.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2.5">
                              <SearchableSelect
                                value={split.accountId}
                                onChange={(val) => handleUpdateSplit(split.id, 'accountId', val)}
                                options={accounts}
                                mapOption={(acc: any) => ({
                                  value: acc.accountId || acc.id,
                                  label: acc.bankName
                                    ? `${acc.bankName}${acc.accountNumber ? ` - ${acc.accountNumber}` : ''}`
                                    : acc.name || 'Bank Account',
                                  subLabel: acc.accountType || undefined,
                                  searchKeywords: [acc.accountNumber, acc.bankName, acc.name, acc.ifscCode].filter(
                                    Boolean
                                  ),
                                })}
                                placeholder="Select Account..."
                                searchPlaceholder="Search..."
                                triggerClassName="w-full h-8 text-xs"
                                isLoading={loadingAccounts}
                                clearable={false}
                                quickCreateEntity="bankAccount"
                              />
                            </td>
                            <td className="p-2.5">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-[#6B7280]">
                                  <IndianRupee size={12} />
                                </div>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={split.amount || ''}
                                  onChange={(e) =>
                                    handleUpdateSplit(split.id, 'amount', parseFloat(e.target.value) || 0)
                                  }
                                  placeholder="0.00"
                                  className="w-full h-8 pl-6 pr-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-semibold text-[#1E2540] focus:border-[#408DFB] outline-none"
                                />
                              </div>
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={split.referenceNo || ''}
                                onChange={(e) => handleUpdateSplit(split.id, 'referenceNo', e.target.value)}
                                placeholder="Ref / Cheque #"
                                className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#1E2540] focus:border-[#408DFB] outline-none"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              {splits.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSplit(split.id)}
                                  className="text-[#6B7280] hover:text-red-600 p-1 rounded transition-colors"
                                  title="Remove Mode"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Split Summary Validation Banner */}
                  <div
                    className={`p-3 rounded-[4px] text-xs flex items-center justify-between border ${
                      Math.abs(splitDifference) <= 0.01
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span>
                        Amount to Allocate:{' '}
                        <strong>
                          ₹ {Number(amountReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </strong>
                      </span>
                      <span>
                        Total Allocated:{' '}
                        <strong>
                          ₹ {totalSplitAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </strong>
                      </span>
                    </div>

                    <div>
                      {Math.abs(splitDifference) <= 0.01 ? (
                        <span className="font-semibold text-green-700 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Fully Allocated
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700">
                          Remaining to Allocate: ₹ {splitDifference.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Row 6: Attachments */}
            <div className="pt-4 border-t border-[#E5E7EB]">
              <label className="block text-xs font-semibold text-[#1E2540] mb-2">
                Attach File(s)
              </label>
              <ZohoAttachmentUploader
                files={attachments}
                onUpload={handleAttachmentUpload}
                onRemove={handleAttachmentRemove}
                maxFiles={5}
                maxSizeMB={5}
              />
            </div>
          </div>
        </div>

        {/* 4. Payment Accounting Summary Card */}
        <div className="mt-6 bg-white border border-[#E5E7EB] rounded-[4px] p-5 shadow-xs">
          <h3 className="text-xs font-bold text-[#1E2540] uppercase tracking-wider mb-4 pb-2 border-b border-[#E5E7EB]">
            Payment Reconciliation Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
            <div>
              <span className="text-[#6B7280] block text-[11px]">Invoice Outstanding</span>
              <span className="text-sm font-bold text-[#1E2540]">
                ₹ {outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[11px]">Amount Being Received</span>
              <span className="text-sm font-bold text-blue-600">
                ₹ {Number(amountReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[11px]">Remaining Balance</span>
              <span
                className={`text-sm font-bold ${
                  Math.max(0, outstanding - amountReceived) === 0 ? 'text-green-600' : 'text-amber-600'
                }`}
              >
                ₹ {Math.max(0, outstanding - amountReceived).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[11px]">Bank Charges</span>
              <span className="text-sm font-bold text-[#1E2540]">
                ₹ {Number(bankCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#CBD5E1] py-3 px-6 z-40 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Primary Action: Save as Paid / Record Payment */}
          <button
            type="button"
            disabled={
              isSubmitting ||
              amountReceived <= 0 ||
              amountReceived > outstanding + 0.01 ||
              (isSplitMode && Math.abs(splitDifference) > 0.01)
            }
            onClick={() => handleSavePayment('COMPLETED')}
            className="px-4 py-2 bg-[#408DFB] hover:bg-[#2563EB] disabled:bg-blue-300 text-white rounded-[4px] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Recording Payment...</span>
              </>
            ) : (
              <span>Save as Paid</span>
            )}
          </button>

          {/* Secondary Action: Save as Draft */}
          <button
            type="button"
            disabled={isSubmitting || amountReceived <= 0}
            onClick={() => handleSavePayment('DRAFT')}
            className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] disabled:opacity-50 text-[#1E2540] rounded-[4px] text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Save as Draft
          </button>

          {/* Cancel Action */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-[#4B5563] rounded-[4px] text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs">
          <span className="text-[#6B7280]">
            Total Payment:{' '}
            <strong className="text-sm font-bold text-[#1E2540]">
              ₹ {Number(amountReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
          </span>
        </div>
      </div>

      {/* 6. Customer Details Drawer */}
      {showCustomerDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white shadow-2xl h-full flex flex-col transform transition-transform duration-300">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8F9FB]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#408DFB]" />
                <h3 className="font-semibold text-sm text-[#1E2540]">Customer Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerDrawer(false)}
                className="p-1 hover:bg-[#E5E7EB] rounded-[4px] text-[#6B7280]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#1E2540]">
              <div>
                <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block font-semibold mb-1">
                  Customer Name
                </span>
                <p className="text-sm font-bold text-[#1E2540]">{customer?.name || 'Customer'}</p>
                {customer?.companyName && (
                  <p className="text-xs text-[#6B7280] mt-0.5">{customer.companyName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB]">
                <div>
                  <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block font-semibold mb-1">
                    GSTIN
                  </span>
                  <p className="font-mono font-medium">{customer?.gstin || 'Unregistered'}</p>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block font-semibold mb-1">
                    PAN
                  </span>
                  <p className="font-mono font-medium">{customer?.pan || customer?.taxNumber || 'AAKFE3589M'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
                <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block font-semibold">
                  Contact Information
                </span>
                {customer?.email && (
                  <div className="flex items-center gap-2 text-[#4B5563]">
                    <Mail size={14} className="text-[#6B7280]" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer?.phone && (
                  <div className="flex items-center gap-2 text-[#4B5563]">
                    <Phone size={14} className="text-[#6B7280]" />
                    <span>{customer.phone}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#E5E7EB]">
                <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block font-semibold mb-1">
                  Billing Address
                </span>
                <div className="flex items-start gap-2 text-[#4B5563]">
                  <MapPin size={14} className="text-[#6B7280] mt-0.5 shrink-0" />
                  <p className="leading-relaxed">
                    {[
                      customer?.billingAddressLine1,
                      customer?.billingAddressLine2,
                      customer?.billingCity,
                      customer?.billingState,
                      customer?.billingPincode,
                      customer?.billingCountry,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'No billing address provided'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] bg-[#F8F9FB] p-3 rounded-[4px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Credit Balance:</span>
                  <span className="font-semibold text-green-700">
                    ₹ {Number(customer?.creditBalance || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Credit Limit:</span>
                  <span className="font-semibold text-[#1E2540]">
                    ₹ {Number(customer?.creditLimit || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#E5E7EB] bg-gray-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCustomerDrawer(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
