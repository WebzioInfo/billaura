import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  HelpCircle,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { ZohoAttachmentUploader } from '@/shared/components/zoho';

interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  grandTotal: number;
  amountPaid: number;
  status: string;
}

const INDIAN_STATES = [
  { code: 'KL', name: 'Kerala', label: '[KL] - Kerala' },
  { code: 'MH', name: 'Maharashtra', label: '[MH] - Maharashtra' },
  { code: 'DL', name: 'Delhi', label: '[DL] - Delhi' },
  { code: 'KA', name: 'Karnataka', label: '[KA] - Karnataka' },
  { code: 'TN', name: 'Tamil Nadu', label: '[TN] - Tamil Nadu' },
  { code: 'AP', name: 'Andhra Pradesh', label: '[AP] - Andhra Pradesh' },
  { code: 'GJ', name: 'Gujarat', label: '[GJ] - Gujarat' },
  { code: 'HR', name: 'Haryana', label: '[HR] - Haryana' },
  { code: 'UP', name: 'Uttar Pradesh', label: '[UP] - Uttar Pradesh' },
  { code: 'WB', name: 'West Bengal', label: '[WB] - West Bengal' },
  { code: 'RJ', name: 'Rajasthan', label: '[RJ] - Rajasthan' },
  { code: 'MP', name: 'Madhya Pradesh', label: '[MP] - Madhya Pradesh' },
  { code: 'PB', name: 'Punjab', label: '[PB] - Punjab' },
  { code: 'BR', name: 'Bihar', label: '[BR] - Bihar' },
  { code: 'OD', name: 'Odisha', label: '[OD] - Odisha' },
  { code: 'TS', name: 'Telangana', label: '[TS] - Telangana' },
  { code: 'AS', name: 'Assam', label: '[AS] - Assam' },
  { code: 'JH', name: 'Jharkhand', label: '[JH] - Jharkhand' },
  { code: 'CT', name: 'Chhattisgarh', label: '[CT] - Chhattisgarh' },
  { code: 'UT', name: 'Uttarakhand', label: '[UT] - Uttarakhand' },
  { code: 'HP', name: 'Himachal Pradesh', label: '[HP] - Himachal Pradesh' },
  { code: 'GA', name: 'Goa', label: '[GA] - Goa' },
  { code: 'JK', name: 'Jammu and Kashmir', label: '[JK] - Jammu and Kashmir' },
  { code: 'CH', name: 'Chandigarh', label: '[CH] - Chandigarh' },
  { code: 'PY', name: 'Puducherry', label: '[PY] - Puducherry' },
];

const ADVANCE_TAX_RATES = [
  { id: '', label: 'Select a Tax', rate: 0 },
  { id: 'GST0', label: 'GST0 [0%]', rate: 0 },
  { id: 'GST5', label: 'GST5 [5%]', rate: 5 },
  { id: 'GST12', label: 'GST12 [12%]', rate: 12 },
  { id: 'GST18', label: 'GST18 [18%]', rate: 18 },
  { id: 'GST28', label: 'GST28 [28%]', rate: 28 },
];

const TDS_SECTIONS = [
  { code: '194C-IND', label: '194C - Payment to Contractors (Individual/HUF) (1%)', rate: 1.0 },
  { code: '194C-CORP', label: '194C - Payment to Contractors (Company) (2%)', rate: 2.0 },
  { code: '194J', label: '194J - Fees for Professional / Technical Services (10%)', rate: 10.0 },
  { code: '194Q', label: '194Q - Purchase of Goods (0.1%)', rate: 0.1 },
  { code: '194I', label: '194I - Rent of Land / Building (10%)', rate: 10.0 },
  { code: '194H', label: '194H - Commission or Brokerage (5%)', rate: 5.0 },
];

export const PaymentReceivedForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync tab with URL query parameter
  const transactionTypeParam = searchParams.get('transaction_type');
  const isInitialAdvance = transactionTypeParam === 'customer_advance';
  const [activeTab, setActiveTab] = useState<'INVOICE_PAYMENT' | 'CUSTOMER_ADVANCE'>(
    isInitialAdvance ? 'CUSTOMER_ADVANCE' : 'INVOICE_PAYMENT'
  );

  useEffect(() => {
    if (transactionTypeParam === 'customer_advance') {
      setActiveTab('CUSTOMER_ADVANCE');
    } else {
      setActiveTab('INVOICE_PAYMENT');
    }
  }, [transactionTypeParam]);

  const handleTabSwitch = (tab: 'INVOICE_PAYMENT' | 'CUSTOMER_ADVANCE') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'CUSTOMER_ADVANCE') {
      newParams.set('transaction_type', 'customer_advance');
    } else {
      newParams.delete('transaction_type');
    }
    setSearchParams(newParams, { replace: true });
  };

  // Shared Customer & Invoice State
  const queryCustomerId = searchParams.get('customerId');
  const queryInvoiceId = searchParams.get('invoiceId');
  const [customerId, setCustomerId] = useState<string>(queryCustomerId || '');
  const [showCustomerDrawer, setShowCustomerDrawer] = useState<boolean>(false);

  // Common Payment Fields
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [bankCharges, setBankCharges] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentNumber, setPaymentNumber] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [depositToId, setDepositToId] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [files, setFiles] = useState<Array<{ name: string; size?: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Invoice Payment Specific Fields
  const [taxDeducted, setTaxDeducted] = useState<'NO' | 'YES_TDS'>('NO');
  const [tdsSection, setTdsSection] = useState<string>('194C-CORP');
  const [tdsAmount, setTdsAmount] = useState<number>(0);
  const [allocations, setAllocations] = useState<{ [invoiceId: string]: number }>({});
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<string>('ALL');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState<boolean>(false);

  // Customer Advance Specific Fields
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('[KL] - Kerala');
  const [descriptionOfSupply, setDescriptionOfSupply] = useState<string>('');
  const [advanceTaxId, setAdvanceTaxId] = useState<string>('');

  // Fetch Next Payment Number
  useEffect(() => {
    let isMounted = true;
    apiClient.get('/receipts/next-number')
      .then((res: any) => {
        if (!isMounted) return;
        const nextNo = res.data?.data || res.data || '';
        if (nextNo && typeof nextNo === 'string') {
          setPaymentNumber(nextNo);
        } else {
          setPaymentNumber(`RCP-${Math.floor(1000 + Math.random() * 9000)}`);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPaymentNumber(`RCP-${Math.floor(1000 + Math.random() * 9000)}`);
        }
      });
    return () => { isMounted = false; };
  }, []);

  // Auto-populate when invoiceId is passed in URL query
  useEffect(() => {
    if (queryInvoiceId) {
      apiClient.get(`/sales/invoices/${queryInvoiceId}`)
        .then((res: any) => {
          const inv = res.data?.data || res.data;
          if (inv) {
            if (inv.businessPartnerId && !customerId) {
              setCustomerId(inv.businessPartnerId);
            }
            const unpaid = Math.max(0, Number(inv.grandTotal || 0) - Number(inv.amountPaid || 0));
            if (unpaid > 0) {
              setAmountReceived(Number(unpaid.toFixed(2)));
              setAllocations({ [inv.id]: Number(unpaid.toFixed(2)) });
            }
          }
        })
        .catch(() => {});
    }
  }, [queryInvoiceId]);

  // Fetch Customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: async () => {
      const res = await apiClient.get('/customers', { params: { limit: 100 } });
      return ensureArray(res.data);
    },
  });

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === customerId) || null;
  }, [customers, customerId]);

  // Set default place of supply when customer is chosen
  useEffect(() => {
    if (selectedCustomer) {
      const stateName = selectedCustomer.state || selectedCustomer.billingState || 'Kerala';
      const matched = INDIAN_STATES.find(
        (s) => s.name.toLowerCase() === stateName.toLowerCase() || s.label.toLowerCase().includes(stateName.toLowerCase())
      );
      if (matched) {
        setPlaceOfSupply(matched.label);
      }
    }
  }, [selectedCustomer]);

  // Fetch Cash & Bank Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts-all'],
    queryFn: async () => {
      const res = await apiClient.get('/bank-accounts');
      return ensureArray(res.data);
    },
  });

  useEffect(() => {
    if (accounts.length > 0 && !depositToId) {
      const petty = accounts.find((a: any) =>
        a.accountType === 'CASH' ||
        a.name?.toLowerCase().includes('petty') ||
        a.name?.toLowerCase().includes('cash')
      );
      setDepositToId(petty ? petty.id : accounts[0].id);
    }
  }, [accounts, depositToId]);

  // Fetch Invoices for Selected Customer (only relevant for Invoice Payment)
  const { data: customerInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ['customer-unpaid-invoices', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const res = await apiClient.get('/sales/invoices', {
        params: { customerId, limit: 100 },
      });
      return ensureArray<Invoice>(res.data);
    },
    enabled: Boolean(customerId) && activeTab === 'INVOICE_PAYMENT',
  });

  const unpaidInvoices = useMemo(() => {
    const valid = customerInvoices.filter(
      (inv) => inv.status !== 'PAID' && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED'
    );

    if (invoiceDateFilter === 'THIS_MONTH') {
      const now = new Date();
      return valid.filter((inv) => {
        const d = new Date(inv.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }

    if (invoiceDateFilter === 'LAST_30_DAYS') {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return valid.filter((inv) => new Date(inv.date) >= cutoff);
    }

    return valid;
  }, [customerInvoices, invoiceDateFilter]);

  // FIFO auto allocation for Invoice Payment
  useEffect(() => {
    if (activeTab === 'CUSTOMER_ADVANCE') {
      return;
    }

    let remaining = amountReceived;
    const newAllocations: { [invoiceId: string]: number } = {};
    const sorted = [...unpaidInvoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((inv) => {
      if (remaining <= 0) return;
      const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid || 0);
      const alloc = Math.min(remaining, unpaid);
      newAllocations[inv.id] = Number(alloc.toFixed(2));
      remaining -= alloc;
    });

    setAllocations(newAllocations);
  }, [amountReceived, unpaidInvoices, activeTab]);

  // Dynamic TDS calculation for Invoice Payment
  useEffect(() => {
    if (taxDeducted === 'YES_TDS' && activeTab === 'INVOICE_PAYMENT') {
      const selectedSec = TDS_SECTIONS.find((s) => s.code === tdsSection);
      const rate = selectedSec ? selectedSec.rate : 2.0;
      const calc = Number(((amountReceived * rate) / 100).toFixed(2));
      setTdsAmount(calc);
    } else {
      setTdsAmount(0);
    }
  }, [taxDeducted, tdsSection, amountReceived, activeTab]);

  const totalAllocated = useMemo(() => {
    if (activeTab === 'CUSTOMER_ADVANCE') return 0;
    return Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [allocations, activeTab]);

  const excessAmount = useMemo(() => {
    if (activeTab === 'CUSTOMER_ADVANCE') return 0;
    return Math.max(0, amountReceived - totalAllocated);
  }, [amountReceived, totalAllocated, activeTab]);

  const handleClearAllocations = () => {
    setAllocations({});
  };

  const handleAllocationChange = (invoiceId: string, val: number) => {
    const inv = unpaidInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid || 0);
    const capped = Math.max(0, Math.min(unpaid, val));
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: Number(capped.toFixed(2)),
    }));
  };

  const handleSubmit = async (submitStatus: 'DRAFT' | 'PAID') => {
    if (!customerId) {
      notification.error('Please select a Customer');
      return;
    }
    if (amountReceived <= 0) {
      notification.error('Amount Received must be greater than zero');
      return;
    }
    if (activeTab === 'CUSTOMER_ADVANCE' && !placeOfSupply) {
      notification.error('Please select Place of Supply');
      return;
    }
    if (activeTab === 'INVOICE_PAYMENT') {
      const totalCustomerCredit = amountReceived + (taxDeducted === 'YES_TDS' ? tdsAmount : 0);
      if (totalAllocated > totalCustomerCredit + 0.01) {
        notification.error(
          `Total allocated amount (₹${totalAllocated.toFixed(2)}) cannot exceed receipt amount with TDS (₹${totalCustomerCredit.toFixed(2)})`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let payload: any;

      if (activeTab === 'CUSTOMER_ADVANCE') {
        const selectedTax = ADVANCE_TAX_RATES.find((t) => t.id === advanceTaxId);
        payload = {
          date: paymentDate,
          businessPartnerId: customerId,
          paymentMethod: paymentMode.toUpperCase().replace(/\s+/g, '_'),
          amount: amountReceived,
          receiptNo: paymentNumber.trim() || undefined,
          accountId: depositToId || undefined,
          referenceNo: referenceNumber.trim() || undefined,
          bankCharges: bankCharges > 0 ? bankCharges : undefined,
          placeOfSupply: placeOfSupply || undefined,
          descriptionOfSupply: descriptionOfSupply.trim() || undefined,
          taxRate: selectedTax && selectedTax.rate > 0 ? selectedTax.rate : undefined,
          taxAmount:
            selectedTax && selectedTax.rate > 0
              ? Number(((amountReceived * selectedTax.rate) / (100 + selectedTax.rate)).toFixed(2))
              : undefined,
          notes: notes.trim() || undefined,
          status: submitStatus === 'DRAFT' ? 'DRAFT' : 'COMPLETED',
          isAdvance: true,
          allocations: [], // Zero invoice allocations for advance
          attachments: files.map((f) => ({
            fileName: f.name,
            fileSize: f.size || 0,
            fileUrl: (f as any).url || '',
            mimeType: (f as any).type || 'application/octet-stream',
          })),
        };
      } else {
        payload = {
          date: paymentDate,
          businessPartnerId: customerId,
          paymentMethod: paymentMode.toUpperCase().replace(/\s+/g, '_'),
          amount: amountReceived,
          receiptNo: paymentNumber.trim() || undefined,
          accountId: depositToId || undefined,
          referenceNo: referenceNumber.trim() || undefined,
          bankCharges: bankCharges > 0 ? bankCharges : undefined,
          tdsAmount: taxDeducted === 'YES_TDS' && tdsAmount > 0 ? tdsAmount : undefined,
          notes: notes.trim() || undefined,
          status: submitStatus === 'DRAFT' ? 'DRAFT' : 'COMPLETED',
          isAdvance: false,
          allocations: Object.entries(allocations)
            .filter(([_, val]) => val > 0)
            .map(([invoiceId, val]) => ({ invoiceId, amount: val })),
          attachments: files.map((f) => ({
            fileName: f.name,
            fileSize: f.size || 0,
            fileUrl: (f as any).url || '',
            mimeType: (f as any).type || 'application/octet-stream',
          })),
        };
      }

      await apiClient.post('/receipts', payload);

      await erpInvalidate.salesReceipt(queryClient, {
        customerId,
        invoiceIds: activeTab === 'INVOICE_PAYMENT' ? Object.keys(allocations) : [],
        accountId: depositToId || undefined,
      });

      notification.success(
        submitStatus === 'DRAFT'
          ? 'Payment saved as Draft.'
          : activeTab === 'CUSTOMER_ADVANCE'
          ? 'Customer advance recorded successfully.'
          : 'Payment recorded and applied successfully.'
      );

      navigate('/receipts');
    } catch (err: any) {
      notification.error(err?.response?.data?.message || 'Failed to save payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden text-xs text-[#2B2F36]">
      {/* 1. Header & Tabs Bar */}
      <div className="border-b border-[#E5E7EB] bg-white px-8 flex items-center justify-between h-11 shrink-0">
        <div className="flex items-center gap-6 h-full">
          <button
            type="button"
            onClick={() => handleTabSwitch('INVOICE_PAYMENT')}
            className={`h-full flex items-center px-1 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'INVOICE_PAYMENT'
                ? 'border-[#408DFB] text-[#408DFB]'
                : 'border-transparent text-[#6B7280] hover:text-[#1E2540]'
            }`}
          >
            Invoice Payment
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('CUSTOMER_ADVANCE')}
            className={`h-full flex items-center px-1 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'CUSTOMER_ADVANCE'
                ? 'border-[#408DFB] text-[#408DFB]'
                : 'border-transparent text-[#6B7280] hover:text-[#1E2540]'
            }`}
          >
            Customer Advance
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/receipts')}
          className="text-[#6B7280] hover:text-[#1E2540] p-1.5 rounded-[4px] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          title="Close and exit form"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Scrollable Document Workspace */}
      <div className="flex-1 overflow-y-auto px-8 py-6 relative">
        <div className="w-full max-w-[1040px] space-y-5">
          {/* ========================================================================= */}
          {/* WORKFLOW A: INVOICE PAYMENT FORM                                          */}
          {/* ========================================================================= */}
          {activeTab === 'INVOICE_PAYMENT' && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              {/* 1. Customer Name */}
              <div className="flex items-start">
                <label className="w-48 text-xs font-normal text-[#2B2F36] pt-1.5">
                  Customer Name<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="flex-1 flex items-start gap-4">
                  <div className="w-[380px] max-w-full">
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                    >
                      <option value="">Select a customer</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.companyName ? `(${c.companyName})` : ''}
                        </option>
                      ))}
                    </select>

                    {/* PAN Display */}
                    {selectedCustomer && (
                      <div className="mt-1 text-[11px] text-[#6B7280]">
                        PAN: <span className="text-[#408DFB] font-medium">{selectedCustomer.pan || selectedCustomer.taxNumber || '—'}</span>
                      </div>
                    )}
                  </div>

                  {/* Customer Details Pill Button */}
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => setShowCustomerDrawer(!showCustomerDrawer)}
                      className="h-8 px-3.5 bg-[#1E2540] hover:bg-[#2A3456] text-white text-[11px] font-semibold rounded-[4px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 uppercase tracking-wide"
                    >
                      <span className="truncate max-w-[140px]">{selectedCustomer.name}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Amount Received */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Amount Received<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="w-[380px] max-w-full flex h-8 rounded-[4px] border border-[#CBD5E1] focus-within:border-[#408DFB] overflow-hidden bg-white">
                  <span className="px-3 bg-[#F8F9FA] text-xs text-[#6B7280] font-medium border-r border-[#CBD5E1] flex items-center justify-center select-none">
                    INR
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={amountReceived || ''}
                    onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="flex-1 px-3 text-xs text-[#2B2F36] outline-none tabular-nums font-semibold"
                  />
                </div>
              </div>

              {/* 3. Bank Charges (if any) */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Bank Charges (if any)
                </label>
                <div className="w-[380px] max-w-full">
                  <input
                    type="number"
                    step="0.01"
                    value={bankCharges || ''}
                    onChange={(e) => setBankCharges(parseFloat(e.target.value) || 0)}
                    placeholder=""
                    className="w-full h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* 4. Payment Date */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Payment Date<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="w-[380px] max-w-full">
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                  />
                </div>
              </div>

              {/* 5. Payment # */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Payment #<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="w-[380px] max-w-full relative flex items-center">
                  <input
                    type="text"
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    className="w-full h-8 pl-3 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                  />
                  <button
                    type="button"
                    title="Configure sequence"
                    className="absolute right-2.5 text-[#408DFB] hover:text-[#2563EB] cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 6. Payment Mode */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Payment Mode
                </label>
                <div className="w-[380px] max-w-full">
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Remittance">Bank Remittance</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              {/* 7. Deposit To */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Deposit To<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="w-[380px] max-w-full">
                  <select
                    value={depositToId}
                    onChange={(e) => setDepositToId(e.target.value)}
                    className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                  >
                    {accounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName || acc.name} {acc.accountNumber ? `(..${acc.accountNumber.slice(-4)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 8. Reference# */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Reference#
                </label>
                <div className="w-[380px] max-w-full">
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder=""
                    className="w-full h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] font-mono focus:border-[#408DFB] focus:outline-none"
                  />
                </div>
              </div>

              {/* 9. Tax Deducted? (TDS) */}
              <div className="flex items-start">
                <label className="w-48 text-xs font-normal text-[#2B2F36] pt-1">
                  Tax deducted?
                </label>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#2B2F36]">
                      <input
                        type="radio"
                        name="taxDeductedRadio"
                        checked={taxDeducted === 'NO'}
                        onChange={() => setTaxDeducted('NO')}
                        className="text-[#408DFB] focus:ring-0"
                      />
                      <span>No Tax deducted</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#2B2F36]">
                      <input
                        type="radio"
                        name="taxDeductedRadio"
                        checked={taxDeducted === 'YES_TDS'}
                        onChange={() => setTaxDeducted('YES_TDS')}
                        className="text-[#408DFB] focus:ring-0"
                      />
                      <span>Yes, TDS (Income Tax)</span>
                    </label>
                  </div>

                  {taxDeducted === 'YES_TDS' && (
                    <div className="w-[380px] bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px] p-3 space-y-2 mt-1">
                      <div>
                        <label className="block text-[11px] text-[#6B7280] mb-1 font-medium">TDS Section / Rate</label>
                        <select
                          value={tdsSection}
                          onChange={(e) => setTdsSection(e.target.value)}
                          className="w-full h-7 px-2 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] outline-none"
                        >
                          {TDS_SECTIONS.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-[#6B7280]">Calculated TDS Amount:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[#6B7280]">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={tdsAmount}
                            onChange={(e) => setTdsAmount(parseFloat(e.target.value) || 0)}
                            className="w-24 h-6 px-1.5 border border-[#CBD5E1] rounded text-right text-xs font-semibold text-[#2B2F36] focus:border-[#408DFB] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 10. Unpaid Invoices Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 relative">
                    <span className="font-semibold text-xs text-[#1E2540]">
                      Unpaid Invoices
                    </span>

                    {/* Filter by Date Range */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                        className="text-[#6B7280] hover:text-[#2B2F36] text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <span>
                          {invoiceDateFilter === 'ALL'
                            ? 'Filter by Date Range'
                            : invoiceDateFilter === 'THIS_MONTH'
                            ? 'This Month'
                            : 'Last 30 Days'}
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {isDateFilterOpen && (
                        <div className="absolute top-6 left-0 z-30 bg-white border border-[#E5E7EB] rounded-[4px] shadow-md py-1 w-36 text-xs">
                          <button
                            type="button"
                            onClick={() => { setInvoiceDateFilter('ALL'); setIsDateFilterOpen(false); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#F3F4F6] text-[#2B2F36]"
                          >
                            All Invoices
                          </button>
                          <button
                            type="button"
                            onClick={() => { setInvoiceDateFilter('THIS_MONTH'); setIsDateFilterOpen(false); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#F3F4F6] text-[#2B2F36]"
                          >
                            This Month
                          </button>
                          <button
                            type="button"
                            onClick={() => { setInvoiceDateFilter('LAST_30_DAYS'); setIsDateFilterOpen(false); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#F3F4F6] text-[#2B2F36]"
                          >
                            Last 30 Days
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearAllocations}
                    className="text-[#408DFB] hover:underline text-xs font-medium cursor-pointer"
                  >
                    Clear Applied Amount
                  </button>
                </div>

                {/* Table */}
                <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                        <th className="px-3.5 py-2.5 text-left font-medium">DATE</th>
                        <th className="px-3.5 py-2.5 text-left font-medium">INVOICE NUMBER</th>
                        <th className="px-3.5 py-2.5 text-right font-medium">INVOICE AMOUNT</th>
                        <th className="px-3.5 py-2.5 text-right font-medium">AMOUNT DUE</th>
                        <th className="px-3.5 py-2.5 text-left font-medium">
                          <span className="flex items-center gap-1">
                            PAYMENT RECEIVED ON <HelpCircle className="w-3 h-3 text-[#9CA3AF]" />
                          </span>
                        </th>
                        <th className="px-3.5 py-2.5 text-right font-medium">PAYMENT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {unpaidInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                            There are no unpaid invoices associated with this customer.
                          </td>
                        </tr>
                      ) : (
                        unpaidInvoices.map((inv) => {
                          const due = Number(inv.grandTotal) - Number(inv.amountPaid || 0);
                          const allocVal = allocations[inv.id] || 0;
                          return (
                            <tr key={inv.id} className="hover:bg-[#F9FAFB] transition-colors">
                              <td className="px-3.5 py-2.5 text-[#2B2F36]">
                                {inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : '—'}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono font-medium text-[#408DFB]">
                                {inv.invoiceNo}
                              </td>
                              <td className="px-3.5 py-2.5 text-right tabular-nums text-[#6B7280]">
                                {Number(inv.grandTotal || 0).toFixed(2)}
                              </td>
                              <td className="px-3.5 py-2.5 text-right tabular-nums font-medium text-[#2B2F36]">
                                {due.toFixed(2)}
                              </td>
                              <td className="px-3.5 py-2.5 text-[#6B7280]">
                                {paymentDate ? new Date(paymentDate).toLocaleDateString('en-GB') : '—'}
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={allocVal > 0 ? allocVal : ''}
                                  onChange={(e) =>
                                    handleAllocationChange(inv.id, parseFloat(e.target.value) || 0)
                                  }
                                  placeholder="0.00"
                                  className="w-28 h-7 px-2 border border-[#CBD5E1] rounded-[4px] text-right font-semibold text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none tabular-nums"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sub-table Footer */}
                <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1">
                  <span>**List contains only SENT invoices</span>
                  <div className="flex items-center gap-6 font-semibold text-xs text-[#1E2540]">
                    <span>Total</span>
                    <span className="tabular-nums">{totalAllocated.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 11. Payment Summary (Right Aligned) */}
              <div className="flex justify-end pt-2">
                <div className="w-[360px] bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px] p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#6B7280]">Amount Received :</span>
                    <span className="font-semibold text-[#1E2540] tabular-nums">
                      {amountReceived.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#6B7280]">Amount used for Payments :</span>
                    <span className="font-medium text-[#1E2540] tabular-nums">
                      {totalAllocated.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#6B7280]">Amount Refunded :</span>
                    <span className="text-[#6B7280] tabular-nums">0.00</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-[#E5E7EB]">
                    <span className="flex items-center gap-1 font-semibold text-[#2B2F36]">
                      {excessAmount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-[#E54B4B]" />}
                      <span>Amount in Excess :</span>
                    </span>
                    <span className={`font-semibold tabular-nums ${excessAmount > 0 ? 'text-[#E54B4B]' : 'text-[#2B2F36]'}`}>
                      ₹ {excessAmount.toFixed(2)}
                    </span>
                  </div>

                  {excessAmount > 0 && (
                    <p className="text-[10px] text-[#E54B4B] pt-0.5">
                      Excess amount will be saved as customer advance credit.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKFLOW B: CUSTOMER ADVANCE FORM                                         */}
          {/* ========================================================================= */}
          {activeTab === 'CUSTOMER_ADVANCE' && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              {/* 1. Customer Name + GST Treatment + GSTIN */}
              <div className="flex items-start">
                <label className="w-48 text-xs font-normal text-[#2B2F36] pt-1.5">
                  Customer Name<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="flex-1 flex items-start gap-4">
                  <div className="w-[380px] max-w-full">
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                    >
                      <option value="">Select a customer</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.companyName ? `(${c.companyName})` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Tax & GST Metadata Details */}
                    <div className="mt-1 space-y-1 text-[11px] text-[#6B7280]">
                      <div>
                        PAN: <span className="text-[#408DFB] font-medium">{selectedCustomer?.pan || selectedCustomer?.taxNumber || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span>GST Treatment:</span>
                        <strong className="text-[#2B2F36] font-medium">
                          {selectedCustomer?.gstTreatment || 'Registered Business - Regular'}
                        </strong>
                        <Pencil className="w-3 h-3 text-[#408DFB] cursor-pointer" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>GSTIN:</span>
                        <strong className="text-[#2B2F36] font-medium font-mono">
                          {selectedCustomer?.taxNumber || selectedCustomer?.gstin || '—'}
                        </strong>
                        <Pencil className="w-3 h-3 text-[#408DFB] cursor-pointer" />
                      </div>
                    </div>
                  </div>

                  {/* Customer Details Pill Button */}
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => setShowCustomerDrawer(!showCustomerDrawer)}
                      className="h-8 px-3.5 bg-[#1E2540] hover:bg-[#2A3456] text-white text-[11px] font-semibold rounded-[4px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 uppercase tracking-wide"
                    >
                      <span className="truncate max-w-[140px]">{selectedCustomer.name}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Place of Supply */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Place of Supply<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="w-[380px] max-w-full">
                  <select
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Description of Supply */}
              <div className="flex items-start">
                <label className="w-48 text-xs font-normal text-[#2B2F36] pt-1.5">
                  Description of Supply
                </label>
                <div className="w-[380px] max-w-full">
                  <textarea
                    value={descriptionOfSupply}
                    onChange={(e) => setDescriptionOfSupply(e.target.value)}
                    rows={3}
                    placeholder=""
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none resize-none"
                  />
                  <p className="text-[11px] text-[#6B7280] mt-1">
                    Will be displayed on the Payment Receipt
                  </p>
                </div>
              </div>

              {/* 4. Amount Received */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Amount Received<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="w-[380px] max-w-full flex h-8 rounded-[4px] border border-[#CBD5E1] focus-within:border-[#408DFB] overflow-hidden bg-white">
                  <span className="px-3 bg-[#F8F9FA] text-xs text-[#6B7280] font-medium border-r border-[#CBD5E1] flex items-center justify-center select-none">
                    INR
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={amountReceived || ''}
                    onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="flex-1 px-3 text-xs text-[#2B2F36] outline-none tabular-nums font-semibold"
                  />
                </div>
              </div>

              {/* 5. Bank Charges (if any) */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Bank Charges (if any)
                </label>
                <div className="w-[380px] max-w-full">
                  <input
                    type="number"
                    step="0.01"
                    value={bankCharges || ''}
                    onChange={(e) => setBankCharges(parseFloat(e.target.value) || 0)}
                    placeholder=""
                    className="w-full h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* 6. Tax Selector (GST on Advance) */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Tax
                </label>
                <div className="w-[380px] max-w-full">
                  <select
                    value={advanceTaxId}
                    onChange={(e) => setAdvanceTaxId(e.target.value)}
                    className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                  >
                    {ADVANCE_TAX_RATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 7. Payment Date */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Payment Date<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="w-[380px] max-w-full">
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                  />
                </div>
              </div>

              {/* 8. Payment # */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Payment #<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="w-[380px] max-w-full relative flex items-center">
                  <input
                    type="text"
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    className="w-full h-8 pl-3 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                  />
                  <button
                    type="button"
                    title="Configure sequence"
                    className="absolute right-2.5 text-[#408DFB] hover:text-[#2563EB] cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 9. Payment Mode */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Payment Mode
                </label>
                <div className="w-[380px] max-w-full">
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Remittance">Bank Remittance</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              {/* 10. Deposit To */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Deposit To<span className="text-[#E54B4B]">*</span>
                </label>
                <div className="w-[380px] max-w-full">
                  <select
                    value={depositToId}
                    onChange={(e) => setDepositToId(e.target.value)}
                    className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                  >
                    {accounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName || acc.name} {acc.accountNumber ? `(..${acc.accountNumber.slice(-4)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 11. Reference# */}
              <div className="flex items-center">
                <label className="w-48 text-xs font-normal text-[#2B2F36]">
                  Reference#
                </label>
                <div className="w-[380px] max-w-full">
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder=""
                    className="w-full h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] font-mono focus:border-[#408DFB] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SHARED SECTION: NOTES & ATTACHMENTS                                       */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
            <div>
              <label className="block text-xs font-normal text-[#2B2F36] mb-1.5">
                Notes (Internal use. Not visible to customer)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder=""
                className="w-full max-w-[680px] px-3 py-2 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-[#2B2F36] mb-1.5">
                Attachments
              </label>
              <div className="max-w-[480px]">
                <ZohoAttachmentUploader
                  files={files}
                  onUpload={(fl) => {
                    if (!fl) return;
                    const newF = Array.from(fl).map((f) => ({ name: f.name, size: f.size }));
                    setFiles((prev) => [...prev, ...newF]);
                  }}
                  onRemove={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  maxFiles={5}
                  maxSizeMB={5}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sliding Customer Details Drawer */}
        {showCustomerDrawer && selectedCustomer && (
          <div className="absolute top-0 right-0 w-80 h-full bg-white border-l border-[#E5E7EB] shadow-lg p-5 space-y-4 z-40 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-xs font-semibold text-[#1E2540] uppercase tracking-wider">
                Customer Details
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomerDrawer(false)}
                className="text-[#6B7280] hover:text-[#1E2540] p-1 rounded hover:bg-[#F3F4F6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-sm text-[#1E2540]">{selectedCustomer.name}</p>
                {selectedCustomer.companyName && (
                  <p className="text-[#6B7280] text-[11px]">{selectedCustomer.companyName}</p>
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E5E7EB]">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">PAN:</span>
                  <span className="font-medium text-[#1E2540]">{selectedCustomer.pan || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">GSTIN:</span>
                  <span className="font-medium text-[#1E2540]">{selectedCustomer.taxNumber || '—'}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Email:</span>
                    <span className="font-medium text-[#1E2540] truncate max-w-[170px]">{selectedCustomer.email}</span>
                  </div>
                )}
                {selectedCustomer.phone && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Phone:</span>
                    <span className="font-medium text-[#1E2540]">{selectedCustomer.phone}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-[#F8F9FB] rounded-[4px] border border-[#E5E7EB] space-y-1">
                <span className="text-[11px] text-[#6B7280]">Outstanding Receivables:</span>
                <p className="text-base font-bold text-[#E54B4B] tabular-nums">
                  ₹{Number(selectedCustomer.receivableBalance || selectedCustomer.outstandingBalance || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Fixed Bottom Workspace Footer */}
      <div className="border-t border-[#E5E7EB] bg-white px-8 py-3 flex items-center gap-3 shrink-0 select-none">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit('DRAFT')}
          className="h-8 px-4 bg-white border border-[#CBD5E1] text-[#2B2F36] hover:bg-[#F8F9FA] rounded-[4px] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-none"
        >
          Save as Draft
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit('PAID')}
          className="h-8 px-4 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-none"
        >
          {isSubmitting ? 'Recording...' : 'Save as Paid'}
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => navigate('/receipts')}
          className="h-8 px-4 bg-white border border-[#CBD5E1] text-[#2B2F36] hover:bg-[#F8F9FA] rounded-[4px] text-xs font-medium cursor-pointer transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
