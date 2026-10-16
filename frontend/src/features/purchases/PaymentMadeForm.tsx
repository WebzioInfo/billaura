import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Settings,
  X,
  AlertCircle,
  HelpCircle,
  Building,
  Calendar,
  DollarSign,
  FileText,
  RotateCcw,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Plus,
} from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import {
  ZohoAttachmentUploader,
  AttachmentFile,
  ZohoModal,
} from '@/shared/components/zoho';
import { PageLoader } from '@/shared/components/ui';

interface UnpaidBill {
  id: string;
  purchaseNo: string;
  date: string;
  dueDate?: string;
  grandTotal: number;
  amountPaid: number;
}

const INDIAN_STATES = [
  { code: '37', name: 'Andhra Pradesh', short: 'AP' },
  { code: '12', name: 'Arunachal Pradesh', short: 'AR' },
  { code: '18', name: 'Assam', short: 'AS' },
  { code: '10', name: 'Bihar', short: 'BR' },
  { code: '22', name: 'Chhattisgarh', short: 'CG' },
  { code: '30', name: 'Goa', short: 'GA' },
  { code: '24', name: 'Gujarat', short: 'GJ' },
  { code: '06', name: 'Haryana', short: 'HR' },
  { code: '02', name: 'Himachal Pradesh', short: 'HP' },
  { code: '20', name: 'Jharkhand', short: 'JH' },
  { code: '29', name: 'Karnataka', short: 'KA' },
  { code: '32', name: 'Kerala', short: 'KL' },
  { code: '23', name: 'Madhya Pradesh', short: 'MP' },
  { code: '27', name: 'Maharashtra', short: 'MH' },
  { code: '14', name: 'Manipur', short: 'MN' },
  { code: '17', name: 'Meghalaya', short: 'ML' },
  { code: '15', name: 'Mizoram', short: 'MZ' },
  { code: '13', name: 'Nagaland', short: 'NL' },
  { code: '21', name: 'Odisha', short: 'OR' },
  { code: '03', name: 'Punjab', short: 'PB' },
  { code: '08', name: 'Rajasthan', short: 'RJ' },
  { code: '11', name: 'Sikkim', short: 'SK' },
  { code: '33', name: 'Tamil Nadu', short: 'TN' },
  { code: '36', name: 'Telangana', short: 'TS' },
  { code: '16', name: 'Tripura', short: 'TR' },
  { code: '09', name: 'Uttar Pradesh', short: 'UP' },
  { code: '05', name: 'Uttarakhand', short: 'UK' },
  { code: '19', name: 'West Bengal', short: 'WB' },
  { code: '07', name: 'Delhi', short: 'DL' },
];

const TDS_OPTIONS = [
  { id: '', name: 'Select a Tax', rate: 0 },
  { id: 'tds-0.1', name: 'TDS 0.1% (Sec 194Q)', rate: 0.1 },
  { id: 'tds-1', name: 'TDS 1% (Sec 194C)', rate: 1 },
  { id: 'tds-2', name: 'TDS 2% (Sec 194I - Plant & Machinery)', rate: 2 },
  { id: 'tds-5', name: 'TDS 5% (Sec 194J - Professional)', rate: 5 },
  { id: 'tds-10', name: 'TDS 10% (Sec 194J - Technical)', rate: 10 },
];

export const PaymentMadeForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const editId = searchParams.get('editId') || '';
  const isEditMode = Boolean(editId);

  const preselectedVendorId = searchParams.get('vendorId') || '';
  const preselectedBillId = searchParams.get('billId') || '';

  // Active Tab: Bill Payment vs Vendor Advance
  const [activeTab, setActiveTab] = useState<'BILL_PAYMENT' | 'VENDOR_ADVANCE'>('BILL_PAYMENT');

  // Common Form Fields
  const [vendorId, setVendorId] = useState(preselectedVendorId);
  const [paymentNumber, setPaymentNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [bankAccountId, setBankAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachmentFile[]>([]);
  const [showPartnerBanner, setShowPartnerBanner] = useState(true);

  // Vendor Advance Specific Fields
  const [sourceOfSupply, setSourceOfSupply] = useState('Karnataka');
  const [destinationOfSupply, setDestinationOfSupply] = useState('Karnataka');
  const [descriptionOfSupply, setDescriptionOfSupply] = useState('');
  const [isRcm, setIsRcm] = useState(false);
  const [selectedTdsId, setSelectedTdsId] = useState('');
  const [depositToAccountId, setDepositToAccountId] = useState('');

  // Bill Allocations
  const [billAllocations, setBillAllocations] = useState<{ [billId: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contextual Vendor Side Panel
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<'details' | 'activity'>('details');

  // Vendor Search Modal
  const [isVendorSearchOpen, setIsVendorSearchOpen] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');

  // 1. Queries
  const { data: vendorsData, isLoading: loadingVendors } = useQuery<any>({
    queryKey: ['vendors'],
    queryFn: () => apiClient.get('/vendors'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: bankAccountsData, isLoading: loadingBanks } = useQuery<any>({
    queryKey: ['bank-accounts'],
    queryFn: () => apiClient.get('/bank-accounts'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: accountsData } = useQuery<any>({
    queryKey: ['accounts'],
    queryFn: () => apiClient.get('/accounts').catch(() => ({ data: [] })),
    staleTime: 5 * 60 * 1000,
  });

  const { data: vendorBillsData, isLoading: loadingBills } = useQuery<any>({
    queryKey: ['unpaid-bills', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const res = await apiClient.get('/purchases', { params: { vendorId, limit: 100 } });
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!vendorId,
  });

  const { data: nextNoData } = useQuery<any>({
    queryKey: ['purchases', 'payments', 'next-number'],
    queryFn: () => apiClient.get('/purchases/payments/next-number').catch(() => ({ nextNumber: `PAY-${Date.now().toString().slice(-5)}` })),
    staleTime: 0,
  });

  // Edit Mode Query
  const { data: existingPaymentData, isLoading: loadingExisting } = useQuery<any>({
    queryKey: ['purchases', 'payments', editId],
    queryFn: () => apiClient.get(`/purchases/payments/${editId}`),
    enabled: isEditMode,
  });

  const vendors = useMemo(() => ensureArray(vendorsData), [vendorsData]);
  const bankAccounts = useMemo(() => ensureArray(bankAccountsData), [bankAccountsData]);
  const accounts = useMemo(() => {
    const list = accountsData?.data || accountsData || [];
    return Array.isArray(list) ? list : [];
  }, [accountsData]);

  const selectedVendor = useMemo(() => {
    return vendors.find((v: any) => v.id === vendorId);
  }, [vendorId, vendors]);

  // Set default bank account
  useEffect(() => {
    if (bankAccounts.length > 0 && !bankAccountId) {
      setBankAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, bankAccountId]);

  // Set auto sequence number
  useEffect(() => {
    if (!isEditMode && nextNoData?.nextNumber && !paymentNumber) {
      setPaymentNumber(nextNoData.nextNumber);
    }
  }, [nextNoData, paymentNumber, isEditMode]);

  // Prepopulate vendor details when selected
  useEffect(() => {
    if (selectedVendor) {
      if (selectedVendor.state) {
        setSourceOfSupply(selectedVendor.state);
        setDestinationOfSupply(selectedVendor.state);
      }
    }
  }, [selectedVendor]);

  // Pre-populate if editing
  useEffect(() => {
    if (isEditMode && existingPaymentData) {
      const p = existingPaymentData?.data || existingPaymentData;
      if (p) {
        setActiveTab(p.type === 'VENDOR_ADVANCE' ? 'VENDOR_ADVANCE' : 'BILL_PAYMENT');
        if (p.vendorId || p.businessPartnerId) setVendorId(p.vendorId || p.businessPartnerId);
        if (p.paymentNumber || p.paymentNo) setPaymentNumber(p.paymentNumber || p.paymentNo);
        if (p.date) setPaymentDate(new Date(p.date).toISOString().split('T')[0]);
        if (p.amount) setAmount(Number(p.amount));
        if (p.method || p.paymentMode) setPaymentMode(p.method || p.paymentMode);
        if (p.bankAccountId) setBankAccountId(p.bankAccountId);
        if (p.reference) setReference(p.reference);
        if (p.notes) setNotes(p.notes);
        if (p.sourceOfSupply) setSourceOfSupply(p.sourceOfSupply);
        if (p.destinationOfSupply) setDestinationOfSupply(p.destinationOfSupply);
        if (p.descriptionOfSupply) setDescriptionOfSupply(p.descriptionOfSupply);
        if (p.isRcm !== undefined) setIsRcm(p.isRcm);
        if (p.tdsTaxId) setSelectedTdsId(p.tdsTaxId);
        if (p.depositToAccountId) setDepositToAccountId(p.depositToAccountId);
        if (Array.isArray(p.attachedFiles)) setAttachedFiles(p.attachedFiles);

        if (Array.isArray(p.allocations) && p.allocations.length > 0) {
          const map: { [bId: string]: number } = {};
          p.allocations.forEach((a: any) => {
            if (a.purchaseId) map[a.purchaseId] = Number(a.amount);
          });
          setBillAllocations(map);
        }
      }
    }
  }, [isEditMode, existingPaymentData]);

  // Eligible unpaid bills filter
  const unpaidBills: UnpaidBill[] = useMemo(() => {
    const list = Array.isArray(vendorBillsData) ? vendorBillsData : [];
    return list.filter((b: any) => {
      if (b.status === 'DRAFT' || b.status === 'CANCELLED') return false;
      const balance = Number(b.grandTotal || 0) - Number(b.amountPaid || 0);
      return balance > 0.009;
    });
  }, [vendorBillsData]);

  // Outstanding payables for vendor side panel
  const vendorTotalOutstanding = useMemo(() => {
    if (selectedVendor?.payableBalance !== undefined && Number(selectedVendor.payableBalance) > 0) {
      return Number(selectedVendor.payableBalance);
    }
    return unpaidBills.reduce((acc, b) => acc + Math.max(0, Number(b.grandTotal || 0) - Number(b.amountPaid || 0)), 0);
  }, [selectedVendor, unpaidBills]);

  // Auto-allocate amount across bills (FIFO) if preselectedBillId or on initial amount
  useEffect(() => {
    if (preselectedBillId && unpaidBills.length > 0) {
      const targetBill = unpaidBills.find((b) => b.id === preselectedBillId);
      if (targetBill) {
        const due = Math.max(0, Number(targetBill.grandTotal || 0) - Number(targetBill.amountPaid || 0));
        setAmount(due);
        setBillAllocations({ [targetBill.id]: due });
      }
    }
  }, [preselectedBillId, unpaidBills]);

  // Monetary calculations
  const totalUsedForPayments = useMemo(() => {
    return Object.values(billAllocations).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  }, [billAllocations]);

  const numAmount = Number(amount) || 0;
  const excessAmount = Math.max(0, Number((numAmount - totalUsedForPayments).toFixed(2)));

  // Selected TDS rate
  const selectedTdsOption = useMemo(() => {
    return TDS_OPTIONS.find((t) => t.id === selectedTdsId);
  }, [selectedTdsId]);

  const tdsAmount = useMemo(() => {
    if (!selectedTdsOption || selectedTdsOption.rate <= 0) return 0;
    return Number(((numAmount * selectedTdsOption.rate) / 100).toFixed(2));
  }, [numAmount, selectedTdsOption]);

  const netCashPaid = Math.max(0, Number((numAmount - tdsAmount).toFixed(2)));

  const handleClearApplied = () => {
    setBillAllocations({});
  };

  const handleBillAllocationChange = (billId: string, val: number, maxDue: number) => {
    const safeVal = Math.max(0, Math.min(val, maxDue));
    setBillAllocations((prev) => ({
      ...prev,
      [billId]: safeVal,
    }));
  };

  const handleVendorSelect = (id: string) => {
    setVendorId(id);
    setBillAllocations({});
    const found = vendors.find((v: any) => v.id === id);
    if (found?.state) {
      setSourceOfSupply(found.state);
      setDestinationOfSupply(found.state);
    }
  };

  const handleSubmit = async (submitStatus: 'DRAFT' | 'PAID') => {
    if (!vendorId) {
      notification.error('Please select a vendor');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      notification.error('Please enter a valid payment amount');
      return;
    }
    if (paymentMode !== 'CASH' && !bankAccountId) {
      notification.error('Please select a paid through account');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        vendorId,
        paymentNumber: paymentNumber.trim(),
        date: new Date(paymentDate).toISOString(),
        amount: numAmount,
        method: paymentMode,
        bankAccountId: bankAccountId || undefined,
        reference: reference || undefined,
        notes: notes || undefined,
        status: submitStatus,
        type: activeTab,
        attachedFiles,
      };

      if (activeTab === 'BILL_PAYMENT') {
        payload.allocations = Object.entries(billAllocations)
          .filter(([_, amt]) => Number(amt) > 0)
          .map(([bId, amt]) => ({
            purchaseId: bId,
            amount: Number(amt),
          }));
      } else {
        // Vendor Advance
        payload.sourceOfSupply = sourceOfSupply;
        payload.destinationOfSupply = destinationOfSupply;
        payload.descriptionOfSupply = descriptionOfSupply;
        payload.isRcm = isRcm;
        payload.tdsTaxId = selectedTdsId || undefined;
        payload.tdsRate = selectedTdsOption?.rate || 0;
        payload.tdsAmount = tdsAmount;
        payload.depositToAccountId = depositToAccountId || undefined;
      }

      if (isEditMode) {
        await apiClient.put(`/purchases/payments/${editId}`, payload);
        notification.success('Payment updated successfully');
      } else {
        await apiClient.post('/purchases/payments', payload);
        notification.success(
          submitStatus === 'DRAFT' ? 'Payment draft saved' : 'Vendor payment recorded successfully'
        );
      }

      await erpInvalidate.purchaseReceipt(queryClient, { vendorId, accountId: bankAccountId });
      navigate('/payments-made');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered vendors for search modal
  const filteredVendors = useMemo(() => {
    if (!vendorSearchTerm.trim()) return vendors;
    const term = vendorSearchTerm.toLowerCase();
    return vendors.filter((v: any) => {
      const name = (v.name || v.companyName || '').toLowerCase();
      const email = (v.email || '').toLowerCase();
      const phone = (v.phone || '').toLowerCase();
      const gstin = (v.gstin || v.gstNumber || '').toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term) || gstin.includes(term);
    });
  }, [vendors, vendorSearchTerm]);

  if (loadingVendors || loadingBanks || (isEditMode && loadingExisting)) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <PageLoader title="Loading Payment Form..." description="Fetching vendors, accounts, and bills..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-white overflow-y-auto pb-28 select-none relative">
      {/* 1. Header Bar: Tabs & Close */}
      <div className="h-12 px-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('BILL_PAYMENT')}
            className={`px-4 h-12 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'BILL_PAYMENT'
                ? 'border-[#408DFB] text-[#408DFB]'
                : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
            }`}
          >
            Bill Payment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('VENDOR_ADVANCE')}
            className={`px-4 h-12 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'VENDOR_ADVANCE'
                ? 'border-[#408DFB] text-[#408DFB]'
                : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
            }`}
          >
            Vendor Advance
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/payments-made')}
          className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#E54B4B] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Main Form Content Area */}
      <div className="flex-1 px-8 py-6 space-y-6 max-w-6xl">
        {/* Vendor Header Band + Side Panel Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-4 flex-1">
            <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
              Vendor Name <span className="text-[#E54B4B]">*</span>
            </label>
            <div className="flex items-center gap-1.5 flex-1 max-w-lg">
              <select
                value={vendorId}
                onChange={(e) => handleVendorSelect(e.target.value)}
                className="flex-1 h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB] cursor-pointer"
              >
                <option value="">Select a Vendor</option>
                {vendors.map((v: any) => {
                  const displayName = v.name || v.companyName || 'Unnamed Vendor';
                  const detail = [v.companyName !== v.name ? v.companyName : null, v.gstin || v.gstNumber].filter(Boolean).join(' - ');
                  return (
                    <option key={v.id} value={v.id}>
                      {displayName} {detail ? `(${detail})` : ''}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                title="Search & select vendor"
                onClick={() => {
                  setVendorSearchTerm('');
                  setIsVendorSearchOpen(true);
                }}
                className="h-8 w-8 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Contextual Side Panel Trigger Button (Screenshots 2 & 3) */}
          {selectedVendor && (
            <button
              type="button"
              onClick={() => setIsSidePanelOpen(true)}
              className="bg-[#2B2F36] hover:bg-[#1E293B] text-white text-xs font-semibold px-3 py-1.5 rounded-[4px] flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <span>{selectedVendor.name || selectedVendor.companyName}'s ...</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          )}
        </div>

        {/* TAB 1: BILL PAYMENT WORKFLOW */}
        {activeTab === 'BILL_PAYMENT' && (
          <div className="space-y-6">
            {/* Fields Grid */}
            <div className="space-y-4 max-w-3xl text-xs text-[#2B2F36]">
              {/* Payment # */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center justify-between">
                  <span>Payment # <span className="text-[#E54B4B]">*</span></span>
                </label>
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <input
                    type="text"
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    placeholder="PAY-00001"
                    className="flex-1 h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                  <button
                    type="button"
                    title="Refresh Sequence"
                    onClick={async () => {
                      const res = await apiClient.get('/purchases/payments/next-number').catch(() => ({ data: {} }));
                      if (res.data?.nextNumber) setPaymentNumber(res.data.nextNumber);
                    }}
                    className="p-1.5 text-gray-400 hover:text-[#408DFB] border border-gray-300 rounded-[4px] cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Payment Made */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
                  Payment Made <span className="text-[#E54B4B]">*</span>
                </label>
                <div className="flex items-center flex-1 max-w-sm">
                  <span className="h-8 px-3 bg-gray-50 border border-r-0 border-[#CBD5E1] rounded-l-[4px] text-xs text-gray-600 flex items-center font-medium">
                    INR
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-r-[4px] text-xs font-semibold text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </div>
              </div>

              {/* Partner Banking Notification Banner (Screenshot 2) */}
              {showPartnerBanner && (
                <div className="sm:ml-40 bg-[#FFFBEB] border border-[#FDE68A] rounded-[4px] p-2.5 flex items-center justify-between text-[11px] text-[#92400E]">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#D97706] shrink-0" />
                    <span>
                      Initiate payments for your bills directly from Zoho Books by integrating with one of our partner banks.{' '}
                      <span className="text-[#408DFB] hover:underline font-semibold cursor-pointer">Set Up Now</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPartnerBanner(false)}
                    className="text-[#92400E] hover:text-[#78350F] cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Payment Date */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
                  Payment Date <span className="text-[#E54B4B]">*</span>
                </label>
                <div className="flex-1 max-w-sm">
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0">
                  Payment Mode
                </label>
                <div className="flex-1 max-w-sm">
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                  </select>
                </div>
              </div>

              {/* Paid Through */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
                  Paid Through <span className="text-[#E54B4B]">*</span>
                </label>
                <div className="flex-1 max-w-sm">
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                  >
                    <option value="">Select Account</option>
                    {bankAccounts.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.bankName || 'Bank Account'} {b.accountNumber ? `(${b.accountNumber})` : ''}
                      </option>
                    ))}
                    {accounts
                      .filter((a: any) => a.category === 'ASSET' && (a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank')))
                      .map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (General Ledger)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Reference Number */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0">
                  Reference#
                </label>
                <div className="flex-1 max-w-sm">
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Transaction reference or cheque no."
                    className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </div>
              </div>
            </div>

            {/* Bill Allocation Table Section (Screenshot 1) */}
            <div className="space-y-2 pt-4">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleClearApplied}
                  className="text-xs text-[#408DFB] hover:underline font-medium cursor-pointer"
                >
                  Clear Applied Amount
                </button>
              </div>

              <div className="border border-[#CBD5E1] rounded-[4px] overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-xs">
                  <thead className="bg-[#F8F9FB] border-b border-[#CBD5E1] text-[#6B7280] font-semibold text-left">
                    <tr>
                      <th className="py-2.5 px-4 w-28">Date</th>
                      <th className="py-2.5 px-4 w-32">Bill#</th>
                      <th className="py-2.5 px-4 w-32">PO#</th>
                      <th className="py-2.5 px-4 text-right w-32">Bill Amount</th>
                      <th className="py-2.5 px-4 text-right w-32">Amount Due</th>
                      <th className="py-2.5 px-4 text-right w-36">
                        <span className="inline-flex items-center gap-1 justify-end">
                          Payment Made on <Info className="w-3 h-3 text-gray-400" />
                        </span>
                      </th>
                      <th className="py-2.5 px-4 text-right w-36">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!vendorId ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                          Please select a vendor to view and allocate unpaid bills.
                        </td>
                      </tr>
                    ) : unpaidBills.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-gray-500 font-medium">
                          There are no bills for this vendor.
                        </td>
                      </tr>
                    ) : (
                      unpaidBills.map((bill) => {
                        const total = Number(bill.grandTotal || 0);
                        const paid = Number(bill.amountPaid || 0);
                        const due = Math.max(0, Number((total - paid).toFixed(2)));
                        const applied = billAllocations[bill.id] !== undefined ? billAllocations[bill.id] : 0;

                        return (
                          <tr key={bill.id} className="border-b border-[#F1F5F9] hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 px-4 text-[#2B2F36]">
                              {bill.date ? new Date(bill.date).toLocaleDateString('en-GB') : '-'}
                            </td>
                            <td className="py-2.5 px-4 font-mono font-medium text-[#408DFB]">
                              {bill.purchaseNo || bill.id.slice(-6)}
                            </td>
                            <td className="py-2.5 px-4 text-[#6B7280] font-mono">-</td>
                            <td className="py-2.5 px-4 text-right font-medium tabular-nums text-[#2B2F36]">
                              {total.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-medium tabular-nums text-[#2B2F36]">
                              {due.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-[#6B7280] tabular-nums">
                              {paid.toFixed(2)}
                            </td>
                            <td className="py-2 px-4 text-right">
                              <input
                                type="number"
                                min="0"
                                max={due}
                                step="any"
                                value={applied === 0 ? '' : applied}
                                onChange={(e) =>
                                  handleBillAllocationChange(
                                    bill.id,
                                    e.target.value === '' ? 0 : Number(e.target.value),
                                    due
                                  )
                                }
                                placeholder="0.00"
                                className="w-28 h-7 px-2 text-right bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-semibold text-[#2B2F36] outline-none focus:border-[#408DFB]"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {unpaidBills.length > 0 && (
                    <tfoot className="bg-[#F8F9FB] border-t border-[#CBD5E1] font-semibold text-xs text-[#2B2F36]">
                      <tr>
                        <td colSpan={6} className="py-2.5 px-4 text-right">
                          Total:
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                          {totalUsedForPayments.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Total Calculation Card (Screenshot 1 Beige Box) */}
              <div className="flex justify-end pt-2">
                <div className="w-96 bg-[#FFFBEB]/70 border border-[#FEF3C7] rounded-[4px] p-4 text-xs space-y-2 text-[#451A03]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#78350F]">Amount Paid:</span>
                    <span className="font-semibold tabular-nums">{numAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#78350F]">Amount used for Payments:</span>
                    <span className="font-semibold tabular-nums">{totalUsedForPayments.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#78350F]">Amount Refunded:</span>
                    <span className="font-semibold tabular-nums">0.00</span>
                  </div>
                  {excessAmount > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-[#FDE68A] text-[#B45309] font-bold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                        Amount in Excess:
                      </span>
                      <span className="tabular-nums">₹ {excessAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VENDOR ADVANCE WORKFLOW (Screenshots 4 & 5) */}
        {activeTab === 'VENDOR_ADVANCE' && (
          <div className="space-y-5 max-w-3xl text-xs text-[#2B2F36]">
            {/* Inline GST Treatment & GSTIN (Screenshot 4) */}
            {selectedVendor && (
              <div className="sm:ml-40 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] p-2.5 text-xs text-[#475569] flex flex-wrap items-center gap-x-6 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span>GST Treatment:</span>
                  <strong className="text-[#1E293B]">
                    {selectedVendor.gstRegistrationStatus || 'Registered Business - Regular'}
                  </strong>
                  <Pencil className="w-3 h-3 text-[#408DFB] cursor-pointer" />
                </div>
                {(selectedVendor.gstin || selectedVendor.gstNumber) && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <span>GSTIN:</span>
                    <strong className="text-[#1E293B]">
                      {selectedVendor.gstin || selectedVendor.gstNumber}
                    </strong>
                    <Pencil className="w-3 h-3 text-[#408DFB] cursor-pointer" />
                  </div>
                )}
              </div>
            )}

            {/* Source of Supply */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
                Source of Supply <span className="text-[#E54B4B]">*</span>
              </label>
              <div className="flex-1 max-w-sm">
                <select
                  value={sourceOfSupply}
                  onChange={(e) => setSourceOfSupply(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      [{s.short}] - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Destination of Supply */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
                Destination of Supply <span className="text-[#E54B4B]">*</span>
              </label>
              <div className="flex-1 max-w-sm">
                <select
                  value={destinationOfSupply}
                  onChange={(e) => setDestinationOfSupply(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      [{s.short}] - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment # */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center justify-between">
                <span>Payment # <span className="text-[#E54B4B]">*</span></span>
              </label>
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <input
                  type="text"
                  value={paymentNumber}
                  onChange={(e) => setPaymentNumber(e.target.value)}
                  placeholder="25"
                  className="flex-1 h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
                <button
                  type="button"
                  title="Sequence Settings"
                  className="p-1.5 text-gray-400 hover:text-[#408DFB] border border-gray-300 rounded-[4px] cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Description of Supply */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 pt-1">
                Description of Supply
              </label>
              <div className="flex-1 max-w-sm">
                <textarea
                  rows={2}
                  value={descriptionOfSupply}
                  onChange={(e) => setDescriptionOfSupply(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[4px] p-2 text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
                <p className="text-[11px] text-gray-400 mt-0.5">Will be displayed on the Payment Voucher</p>
              </div>
            </div>

            {/* Payment Made */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
                Payment Made <span className="text-[#E54B4B]">*</span>
              </label>
              <div className="flex items-center flex-1 max-w-sm">
                <span className="h-8 px-3 bg-gray-50 border border-r-0 border-[#CBD5E1] rounded-l-[4px] text-xs text-gray-600 flex items-center font-medium">
                  INR
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-r-[4px] text-xs font-semibold text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>
            </div>

            {/* Partner Banner */}
            {showPartnerBanner && (
              <div className="sm:ml-40 bg-[#FFFBEB] border border-[#FDE68A] rounded-[4px] p-2.5 flex items-center justify-between text-[11px] text-[#92400E]">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span>
                    Initiate payments for your bills directly from Zoho Books by integrating with one of our partner banks.{' '}
                    <span className="text-[#408DFB] hover:underline font-semibold cursor-pointer">Set Up Now</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPartnerBanner(false)}
                  className="text-[#92400E] hover:text-[#78350F] cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Reverse Charge Checkbox */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0">
                Reverse Charge
              </label>
              <div className="flex-1 max-w-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-[#2B2F36]">
                  <input
                    type="checkbox"
                    checked={isRcm}
                    onChange={(e) => setIsRcm(e.target.checked)}
                    className="rounded border-[#CBD5E1] text-[#408DFB] focus:ring-0 cursor-pointer"
                  />
                  <span>This transaction is applicable for reverse charge</span>
                </label>
              </div>
            </div>

            {/* TDS */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0">
                TDS
              </label>
              <div className="flex-1 max-w-sm">
                <select
                  value={selectedTdsId}
                  onChange={(e) => setSelectedTdsId(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  {TDS_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {tdsAmount > 0 && (
                  <p className="text-[11px] text-[#2563EB] mt-1 font-medium">
                    TDS: ₹{tdsAmount.toFixed(2)} | Net Cash Outflow: ₹{netCashPaid.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Date */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
                Payment Date <span className="text-[#E54B4B]">*</span>
              </label>
              <div className="flex-1 max-w-sm">
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0">
                Payment Mode
              </label>
              <div className="flex-1 max-w-sm">
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
            </div>

            {/* Paid Through */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
                Paid Through <span className="text-[#E54B4B]">*</span>
              </label>
              <div className="flex-1 max-w-sm">
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value="">Select Account</option>
                  {bankAccounts.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name || b.bankName || 'Bank Account'} {b.accountNumber ? `(${b.accountNumber})` : ''}
                    </option>
                  ))}
                  {accounts
                    .filter((a: any) => a.category === 'ASSET' && (a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank')))
                    .map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (General Ledger)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Deposit To Account (Screenshot 5) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0">
                Deposit To
              </label>
              <div className="flex-1 max-w-sm">
                <select
                  value={depositToAccountId}
                  onChange={(e) => setDepositToAccountId(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value="">Prepaid Expenses / Vendor Advances</option>
                  {accounts
                    .filter((a: any) => a.category === 'ASSET')
                    .map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Reference# */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0">
                Reference#
              </label>
              <div className="flex-1 max-w-sm">
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. Adv Ref 01"
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Notes & Attachments (Both Tabs) */}
        <div className="space-y-4 pt-4 border-t border-[#F1F5F9] max-w-3xl text-xs text-[#2B2F36]">
          <div>
            <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
              Notes (Internal use. Not visible to vendor)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal remarks about this transaction..."
              className="w-full bg-white border border-[#CBD5E1] rounded-[4px] p-2.5 text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
              Attachments
            </label>
            <ZohoAttachmentUploader
              files={attachedFiles}
              onUpload={(files) => {
                if (!files) return;
                const newFiles = Array.from(files).map((f) => ({
                  name: f.name,
                  size: f.size,
                  type: f.type,
                }));
                setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 5));
              }}
              onRemove={(idx) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
              maxFiles={5}
              maxSizeMB={10}
            />
          </div>

          <p className="text-[11px] text-gray-500 pt-2">
            Additional Fields: Start adding custom fields for your payments made by going to{' '}
            <span className="text-[#408DFB] hover:underline cursor-pointer" onClick={() => navigate('/settings')}>
              Settings → Purchases → Payments Made
            </span>.
          </p>
        </div>
      </div>

      {/* 4. Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E5E7EB] px-8 flex items-center justify-between z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSubmit('DRAFT')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-gray-50 text-xs font-semibold text-[#2B2F36] rounded-[4px] transition-colors cursor-pointer disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('PAID')}
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#408DFB] hover:bg-[#3078E0] text-xs font-semibold text-white rounded-[4px] shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? 'Recording...' : 'Save as Paid'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/payments-made')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-transparent text-xs text-[#6B7280] hover:text-[#2B2F36] rounded-[4px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {activeTab === 'BILL_PAYMENT' && numAmount > 0 && (
          <div className="text-xs text-right text-[#64748B]">
            <span>Total Payout: </span>
            <strong className="text-sm font-bold text-[#1E293B]">₹{numAmount.toFixed(2)}</strong>
          </div>
        )}
      </div>

      {/* 5. Contextual Vendor Side Panel (Screenshots 2 & 3) */}
      {isSidePanelOpen && selectedVendor && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-[#E5E7EB] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-[#E5E7EB] flex items-start justify-between bg-[#F8F9FB]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[4px] bg-[#E2E8F0] text-[#1E293B] font-bold text-lg flex items-center justify-center shrink-0">
                {(selectedVendor.name || selectedVendor.companyName || 'V').charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold">Vendor</span>
                <h3 className="text-sm font-bold text-[#1E293B] leading-tight">
                  {selectedVendor.name || selectedVendor.companyName}
                </h3>
                <button
                  type="button"
                  onClick={() => window.open(`/vendors/${selectedVendor.id}`, '_blank')}
                  className="text-[11px] text-[#408DFB] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer font-medium"
                >
                  <span>View in Vendors module</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidePanelOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Side Panel Tabs */}
          <div className="flex border-b border-[#E5E7EB] px-4 text-xs font-semibold bg-white">
            <button
              type="button"
              onClick={() => setSidePanelTab('details')}
              className={`py-2.5 px-3 border-b-2 cursor-pointer ${
                sidePanelTab === 'details'
                  ? 'border-[#408DFB] text-[#408DFB]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setSidePanelTab('activity')}
              className={`py-2.5 px-3 border-b-2 cursor-pointer ${
                sidePanelTab === 'activity'
                  ? 'border-[#408DFB] text-[#408DFB]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Activity Log
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-[#2B2F36]">
            {sidePanelTab === 'details' ? (
              <>
                {/* 2 Stat Cards: Outstanding Payables & Unused Credits (Screenshot 3) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#FEF3C7]/40 border border-[#FDE68A] rounded-[4px] p-3 text-center">
                    <AlertTriangle className="w-4 h-4 text-[#D97706] mx-auto mb-1" />
                    <span className="text-[10px] text-[#92400E] font-medium block">Outstanding Payables</span>
                    <strong className="text-sm font-bold text-[#92400E] block mt-0.5">
                      ₹{vendorTotalOutstanding.toFixed(2)}
                    </strong>
                  </div>

                  <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-[4px] p-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-[#059669] mx-auto mb-1" />
                    <span className="text-[10px] text-[#065F46] font-medium block">Unused Credits</span>
                    <strong className="text-sm font-bold text-[#065F46] block mt-0.5">
                      ₹0.00
                    </strong>
                  </div>
                </div>

                {/* Contact Details Table */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-[#1E293B] border-b border-gray-100 pb-1">
                    Contact Details
                  </h4>
                  <div className="divide-y divide-gray-100 text-xs">
                    <div className="py-1.5 flex justify-between">
                      <span className="text-gray-500">Currency</span>
                      <span className="font-semibold text-gray-800">INR</span>
                    </div>
                    <div className="py-1.5 flex justify-between">
                      <span className="text-gray-500">Payment Terms</span>
                      <span className="font-semibold text-gray-800">
                        {selectedVendor.paymentTerms || 'Due on Receipt'}
                      </span>
                    </div>
                    <div className="py-1.5 flex justify-between">
                      <span className="text-gray-500">GST Treatment</span>
                      <span className="font-semibold text-gray-800">
                        {selectedVendor.gstRegistrationStatus || 'Registered Business - Regular'}
                      </span>
                    </div>
                    {(selectedVendor.gstin || selectedVendor.gstNumber) && (
                      <div className="py-1.5 flex justify-between">
                        <span className="text-gray-500">GSTIN</span>
                        <span className="font-mono font-semibold text-gray-800">
                          {selectedVendor.gstin || selectedVendor.gstNumber}
                        </span>
                      </div>
                    )}
                    {selectedVendor.panNumber && (
                      <div className="py-1.5 flex justify-between">
                        <span className="text-gray-500">PAN</span>
                        <span className="font-mono font-semibold text-gray-800">
                          {selectedVendor.panNumber}
                        </span>
                      </div>
                    )}
                    <div className="py-1.5 flex justify-between">
                      <span className="text-gray-500">Source of Supply</span>
                      <span className="font-semibold text-gray-800">
                        {selectedVendor.state || 'Karnataka'}
                      </span>
                    </div>
                    <div className="py-1.5 flex justify-between">
                      <span className="text-gray-500">Business Legal Name</span>
                      <span className="font-semibold text-gray-800">
                        {selectedVendor.companyName || selectedVendor.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Persons */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#1E293B]">Contact Persons</h4>
                    <span className="text-[10px] text-gray-400 font-mono">1</span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-[4px] space-y-1">
                    <p className="font-semibold text-gray-800">{selectedVendor.contactPerson || selectedVendor.name}</p>
                    {selectedVendor.email && (
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {selectedVendor.email}
                      </p>
                    )}
                    {selectedVendor.phone && (
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {selectedVendor.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-[#1E293B]">Address</h4>
                  <div className="bg-gray-50 p-2.5 rounded-[4px] text-[11px] text-gray-600 space-y-0.5">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>
                        {selectedVendor.address ||
                          [selectedVendor.city, selectedVendor.state, selectedVendor.pinCode].filter(Boolean).join(', ') ||
                          'No address on file'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-gray-400 space-y-1">
                <FileText className="w-6 h-6 mx-auto text-gray-300" />
                <p>No recent activity recorded for this vendor.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Vendor Search Modal */}
      <ZohoModal
        isOpen={isVendorSearchOpen}
        onClose={() => {
          setIsVendorSearchOpen(false);
          setVendorSearchTerm('');
        }}
        title="Select Vendor"
        maxWidth="max-w-xl"
        secondaryAction={{
          label: 'Cancel',
          onClick: () => {
            setIsVendorSearchOpen(false);
            setVendorSearchTerm('');
          },
        }}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={vendorSearchTerm}
              onChange={(e) => setVendorSearchTerm(e.target.value)}
              placeholder="Search vendor by name, email, phone, or GSTIN..."
              className="w-full h-9 pl-9 pr-8 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              autoFocus
            />
            {vendorSearchTerm && (
              <button
                type="button"
                onClick={() => setVendorSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-[4px] divide-y divide-gray-100 max-h-72 overflow-y-auto bg-white">
            {filteredVendors.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                {vendorSearchTerm ? `No vendors match "${vendorSearchTerm}"` : 'No vendors found'}
              </div>
            ) : (
              filteredVendors.map((v: any) => {
                const isSelected = v.id === vendorId;
                const displayName = v.name || v.companyName || 'Unnamed Vendor';
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      handleVendorSelect(v.id);
                      setIsVendorSearchOpen(false);
                      setVendorSearchTerm('');
                    }}
                    className={`p-3 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-blue-50/90' : ''
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#2B2F36]">{displayName}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        {v.gstin && (
                          <span>
                            GSTIN: <span className="font-mono text-gray-700">{v.gstin}</span>
                          </span>
                        )}
                        {v.phone && <span>Phone: {v.phone}</span>}
                        {v.email && <span>Email: {v.email}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 pl-3">
                      <span className="text-xs text-blue-600 font-medium hover:text-blue-800">
                        {isSelected ? '✓' : 'Select'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
            <span>Showing {filteredVendors.length} of {vendors.length} vendors</span>
            <button
              type="button"
              onClick={() => {
                setIsVendorSearchOpen(false);
                navigate('/vendors/new');
              }}
              className="text-xs text-[#408DFB] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              + Create New Vendor
            </button>
          </div>
        </div>
      </ZohoModal>
    </div>
  );
};

export default PaymentMadeForm;
