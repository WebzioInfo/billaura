import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import {
  Plus, Trash2, Calendar, Receipt, Search, ChevronDown, Check, CreditCard,
  Banknote, HelpCircle, Loader2, ArrowLeft, Info, Landmark, Wallet,
  CheckCircle, FileCheck, AlertCircle, RefreshCw, Printer, Edit3
} from 'lucide-react';
import { PageContainer, LoadingState, FinancialSummary, SummaryRow, AsyncSelect } from '@/shared/components/ui';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useQuery } from '@tanstack/react-query';
import { useBankAccounts } from '@/features/banking/hooks/useBankAccounts';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';
import { UnifiedReceiptForm } from './UnifiedReceiptForm';
import { DocumentPreviewModal } from '@/shared/components/pdf/DocumentPreviewModal';

interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  grandTotal: number;
  amountPaid: number;
  status: string;
  businessPartner?: {
    name: string;
  };
  gstBreakup?: any;
}

interface PaymentFieldsProps {
  isView: boolean;
  referenceNo: string;
  setReferenceNo: (val: string) => void;
  chequeNo: string;
  setChequeNo: (val: string) => void;
  transactionId: string;
  setTransactionId: (val: string) => void;
  clearanceDate: string;
  setClearanceDate: (val: string) => void;
  bankCharges: number;
  setBankCharges: (val: number) => void;
  cashier: string;
  setCashier: (val: string) => void;
  bankAccountId: string;
  setBankAccountId: (val: string) => void;
  setSelectedBank: (bank: any) => void;
  hasBankAccounts: boolean;
  maskAccountNumber: (num?: string) => string;
}

const BankTransferFields: React.FC<PaymentFieldsProps> = ({
  isView,
  bankAccountId,
  setBankAccountId,
  setSelectedBank,
  hasBankAccounts,
  maskAccountNumber,
  referenceNo,
  setReferenceNo,
  bankCharges,
  setBankCharges,
  clearanceDate,
  setClearanceDate
}) => (
  <div className="space-y-4">
    <div>
      {hasBankAccounts ? (
        <AsyncSelect
          label="Bank Account *"
          apiPath="/bank-accounts"
          queryKeyPrefix="bank_accounts_lookup"
          placeholder="Search bank accounts..."
          value={bankAccountId}
          onChange={(val, item) => {
            setBankAccountId(val);
            setSelectedBank(item);
          }}
          mapOption={(account: any) => {
            const typeLabel = account.accountType === 'SAVINGS'
              ? 'Savings Account'
              : account.accountType === 'CASH'
                ? 'Cash Account'
                : 'Current Account';
            return {
              label: account.bankName || account.name,
              value: account.id,
              description: `${maskAccountNumber(account.accountNumber)} - ${typeLabel}`,
            };
          }}
          error={!bankAccountId ? 'Bank account is required' : undefined}
          disabled={isView}
        />
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold">No Bank Accounts Configured</p>
          <p className="mt-1 text-xs">Create a Bank or Cash Account in Chart of Accounts before recording receipts.</p>
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Transaction Ref / UTR *</label>
        <input
          type="text"
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
          disabled={isView}
          placeholder="e.g. UTR998877"
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"

        />

      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Clearance Date</label>
        <input
          type="date"
          value={clearanceDate}
          onChange={(e) => setClearanceDate(e.target.value)}
          disabled={isView}
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Bank Charges (₹)</label>
        <input
          type="number"
          step="0.01"
          value={bankCharges || ''}
          onChange={(e) => setBankCharges(Number(e.target.value))}
          disabled={isView}
          placeholder="0.00"
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
        />
      </div>
    </div>
  </div>
);

const ChequeFields: React.FC<PaymentFieldsProps> = ({
  isView,
  bankAccountId,
  setBankAccountId,
  setSelectedBank,
  hasBankAccounts,
  maskAccountNumber,
  chequeNo,
  setChequeNo,
  clearanceDate,
  setClearanceDate,
  bankCharges,
  setBankCharges
}) => (
  <div className="space-y-4">
    <div>
      {hasBankAccounts ? (
        <AsyncSelect
          label="Bank Account *"
          apiPath="/bank-accounts"
          queryKeyPrefix="bank_accounts_lookup"
          placeholder="Search bank accounts..."
          value={bankAccountId}
          onChange={(val, item) => {
            setBankAccountId(val);
            setSelectedBank(item);
          }}
          mapOption={(account: any) => {
            const typeLabel = account.accountType === 'SAVINGS'
              ? 'Savings Account'
              : account.accountType === 'CASH'
                ? 'Cash Account'
                : 'Current Account';
            return {
              label: account.bankName || account.name,
              value: account.id,
              description: `${maskAccountNumber(account.accountNumber)} - ${typeLabel}`,
            };
          }}
          error={!bankAccountId ? 'Bank account is required' : undefined}
          disabled={isView}
        />
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold">No Bank Accounts Configured</p>
          <p className="mt-1 text-xs">Create a Bank or Cash Account in Chart of Accounts before recording receipts.</p>
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Cheque Number *</label>
        <input
          type="text"
          value={chequeNo}
          onChange={(e) => setChequeNo(e.target.value)}
          disabled={isView}
          placeholder="e.g. 000123"
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
          required
        />
        {!chequeNo.trim() && (
          <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Cheque Number is required
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Clearance Date *</label>
        <input
          type="date"
          value={clearanceDate}
          onChange={(e) => setClearanceDate(e.target.value)}
          disabled={isView}
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
          required
        />
        {!clearanceDate && (
          <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Clearance Date is required
          </p>
        )}
      </div>

      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Bank Charges (₹)</label>
        <input
          type="number"
          step="0.01"
          value={bankCharges || ''}
          onChange={(e) => setBankCharges(Number(e.target.value))}
          disabled={isView}
          placeholder="0.00"
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
        />
      </div>
    </div>
  </div>
);

const CashFields: React.FC<PaymentFieldsProps> = ({
  isView,
  cashier,
  setCashier
}) => (
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Cashier / Collector</label>
      <input
        type="text"
        value={cashier}
        onChange={(e) => setCashier(e.target.value)}
        disabled={isView}
        placeholder="Collector name (Optional)"
        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
      />
    </div>
  </div>
);

const UPIFields: React.FC<PaymentFieldsProps> = ({
  isView,
  transactionId,
  setTransactionId
}) => (
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">UPI Reference ID</label>
      <input
        type="text"
        value={transactionId}
        onChange={(e) => setTransactionId(e.target.value)}
        disabled={isView}
        placeholder="e.g. UPI1234567890 (Optional)"
        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
      />
    </div>
  </div>
);

const CardFields: React.FC<PaymentFieldsProps> = ({
  isView,
  transactionId,
  setTransactionId
}) => (
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Card Transaction ID</label>
      <input
        type="text"
        value={transactionId}
        onChange={(e) => setTransactionId(e.target.value)}
        disabled={isView}
        placeholder="e.g. CARD-TXN-9824 (Optional)"
        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
      />
    </div>
  </div>
);

const WalletFields: React.FC<PaymentFieldsProps> = ({
  isView,
  transactionId,
  setTransactionId
}) => (
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Wallet Transaction ID</label>
      <input
        type="text"
        value={transactionId}
        onChange={(e) => setTransactionId(e.target.value)}
        disabled={isView}
        placeholder="e.g. WALLET-TXN-1234 (Optional)"
        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
      />
    </div>
  </div>
);

const OtherFields: React.FC<PaymentFieldsProps & { method: string }> = ({
  isView,
  referenceNo,
  setReferenceNo,
  method
}) => (
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{method} Transaction Reference</label>
      <input
        type="text"
        value={referenceNo}
        onChange={(e) => setReferenceNo(e.target.value)}
        disabled={isView}
        placeholder={`e.g. ${method}-REF-9988 (Optional)`}
        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
      />
    </div>
  </div>
);

interface ConditionalPaymentDetailsProps extends PaymentFieldsProps {
  paymentMethod: string;
}

const ConditionalPaymentDetails: React.FC<ConditionalPaymentDetailsProps> = (props) => {
  const { paymentMethod } = props;

  switch (paymentMethod) {
    case 'BANK_TRANSFER':
      return <BankTransferFields {...props} />;
    case 'CHEQUE':
      return <ChequeFields {...props} />;
    case 'CASH':
      return <CashFields {...props} />;
    case 'UPI':
      return <UPIFields {...props} />;
    case 'CREDIT_CARD':
      return <CardFields {...props} />;
    case 'WALLET':
      return <WalletFields {...props} />;
    case 'NEFT':
    case 'RTGS':
    case 'IMPS':
      return <OtherFields {...props} method={paymentMethod} />;
    default:
      return null;
  }
};

export const ReceiptForm = () => {
  const { id } = useParams();

  if (!id) {
    return <UnifiedReceiptForm />;
  }

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const queryCustomerId = searchParams.get('customerId');

  const isEdit = pathname.endsWith('/edit');
  const isView = !!id && !isEdit;

  const [saving, setSaving] = useState(false);

  // Form Fields & Bank Account selection
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [businessPartnerId, setBusinessPartnerId] = useState('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [splitPayments, setSplitPayments] = useState<any[]>([{ paymentMethod: 'CASH', amount: 0, accountId: '', referenceNo: '' }]);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [bankAccountId, setBankAccountId] = useState('');
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const { bankAccounts, hasBankAccounts, isLoading: isLoadingBankAccounts } = useBankAccounts();

  const maskAccountNumber = (accountNumber?: string) => accountNumber ? `XXXX${accountNumber.slice(-4)}` : 'Account number not set';
  const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const requiresBankAccount = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CHEQUE';

  const activeBank = useMemo(() => {
    if (!bankAccountId) return null;
    return bankAccounts.find((b: any) => b.id === bankAccountId) || selectedBank;
  }, [bankAccountId, bankAccounts, selectedBank]);

  const handlePaymentMethodChange = (val: string) => {
    setPaymentMethod(val);
    setBankAccountId('');
    setSelectedBank(null);
    setReferenceNo('');
    setChequeNo('');
    setTransactionId('');
    setClearanceDate('');
    setBankCharges(0);
    setCashier('');
  };

  const [amount, setAmount] = useState<number>(0);
  const [referenceNo, setReferenceNo] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [clearanceDate, setClearanceDate] = useState('');
  const [bankCharges, setBankCharges] = useState<number>(0);
  const [cashier, setCashier] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('COMPLETED');

  const isFormInvalid = useMemo(() => {
    if (!businessPartnerId) return true;
    if (amount <= 0) return true;

    if (paymentMethod === 'BANK_TRANSFER') {
      if (!bankAccountId) return true;
      if (!referenceNo.trim()) return true;
    }

    if (paymentMethod === 'CHEQUE') {
      if (!bankAccountId) return true;
      if (!chequeNo.trim()) return true;
      if (!clearanceDate) return true;
    }

    return false;
  }, [businessPartnerId, amount, paymentMethod, bankAccountId, referenceNo, chequeNo, clearanceDate]);

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [allocationMode, setAllocationMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [manualInvoiceIds, setManualInvoiceIds] = useState<string[]>([]);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allocations, setAllocations] = useState<{ [invoiceId: string]: number }>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Customer Dropdown Loading (robust with retry/error fallback)
  const { data: masterData, isLoading: isLoadingMaster, error: masterError, refetch: refetchMaster } = useQuery({
    queryKey: ['receipt-master-data'],
    queryFn: async () => {
      const custRes = await apiClient.get('/customers', { params: { limit: 100 } });
      const dataObj = custRes.data || custRes;
      const customersList = dataObj.items || dataObj.data?.items || dataObj.data || [];
      return {
        customers: Array.isArray(customersList) ? customersList : []
      };
    }
  });

  const customers = useMemo(() => masterData?.customers || [], [masterData]);

  // Fetch invoices for selected customer
  const { data: customerInvoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['customer-invoices', businessPartnerId],
    queryFn: async () => {
      if (!businessPartnerId) return [];
      const res = await apiClient.get('/sales/invoices', {
        params: { customerId: businessPartnerId, limit: 100 }
      });
      const list = res.data?.data || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!businessPartnerId
  });

  const unpaidInvoices = useMemo(() => {
    return customerInvoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED');
  }, [customerInvoices]);

  // Sync selectedCustomer state when businessPartnerId changes in Create Mode
  useEffect(() => {
    if (businessPartnerId && customers.length > 0 && !id) {
      const match = customers.find((c: any) => c.id === businessPartnerId);
      if (match) {
        setSelectedCustomer(match);
      }
    }
  }, [businessPartnerId, customers, id]);

  // Load receipt if edit/view mode
  const { data: receiptData, isLoading: isLoadingReceipt } = useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get(`/receipts/${id}`);
      return res.data || {};
    },
    enabled: !!id
  });

  useDynamicTitle(
    id ? (receiptData?.receiptNo ? (isEdit ? `Edit ${receiptData.receiptNo}` : `Receipt: ${receiptData.receiptNo}`) : 'Receipt Details') : 'New Receipt'
  );

  useEffect(() => {
    if (!receiptData || !id) return;

    const r = receiptData;

    setDate(new Date(r.date).toISOString().split('T')[0]);
    setBusinessPartnerId(r.businessPartnerId);
    setPaymentMethod(r.paymentMethod);
    setAmount(Number(r.amount));
    setReferenceNo(r.referenceNo || '');
    setChequeNo(r.chequeNo || '');
    setTransactionId(r.transactionId || '');
    setClearanceDate(r.clearanceDate ? new Date(r.clearanceDate).toISOString().split('T')[0] : '');
    setBankCharges(Number(r.bankCharges || 0));
    setCashier(r.cashier || '');
    setNotes(r.notes || '');
    setStatus(r.status);
    setSelectedCustomer(r.businessPartner);
    setBankAccountId(r.accountId || '');

    if (r.allocations && Array.isArray(r.allocations)) {
      const initialAllocs: { [id: string]: number } = {};
      const initialIds: string[] = [];
      r.allocations.forEach((a: any) => {
        initialAllocs[a.invoiceId] = Number(a.amount);
        initialIds.push(a.invoiceId);
      });
      setAllocations(initialAllocs);
      setManualInvoiceIds(initialIds);
      setAllocationMode('MANUAL');
    }
  }, [receiptData, id]);

  // FIFO Auto Allocation effect
  useEffect(() => {
    if (allocationMode === 'AUTO') {
      let remaining = amount;
      const newAllocations: { [invoiceId: string]: number } = {};
      const sorted = [...unpaidInvoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sorted.forEach(inv => {
        if (remaining <= 0) return;
        const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
        const allocate = Math.min(remaining, unpaid);
        newAllocations[inv.id] = Number(allocate.toFixed(2));
        remaining -= allocate;
      });

      setAllocations(newAllocations);
    }
  }, [amount, unpaidInvoices, allocationMode]);

  const handleClearAllocations = () => {
    setAllocations({});
    setManualInvoiceIds([]);
    notification.info('Allocations cleared');
  };

  const handleAllocationChange = (invoiceId: string, val: number) => {
    const inv = unpaidInvoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
    let amountToAlloc = Math.max(0, Math.min(unpaid, val));

    // Cap at receipt amount
    const otherAllocationsSum = Object.entries(allocations)
      .filter(([id, _]) => id !== invoiceId)
      .reduce((sum, [_, v]) => sum + v, 0);

    if (otherAllocationsSum + amountToAlloc > amount) {
      amountToAlloc = Math.max(0, amount - otherAllocationsSum);
      notification.warning('Total allocation capped at Receipt Amount');
    }

    setAllocations(prev => ({
      ...prev,
      [invoiceId]: Number(amountToAlloc.toFixed(2))
    }));
  };

  const handleAddManualInvoice = (invoiceId: string) => {
    if (manualInvoiceIds.includes(invoiceId)) return;

    const inv = unpaidInvoices.find(i => i.id === invoiceId);
    if (!inv) return;

    setManualInvoiceIds(prev => [...prev, invoiceId]);

    // Suggest allocated amount
    const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
    const suggested = Math.max(0, Math.min(unallocatedAmount, unpaid));

    setAllocations(prev => ({
      ...prev,
      [invoiceId]: Number(suggested.toFixed(2))
    }));

    setIsDropdownOpen(false);
    setInvoiceSearchTerm('');
  };

  const handleRemoveManualInvoice = (invoiceId: string) => {
    setManualInvoiceIds(prev => prev.filter(id => id !== invoiceId));
    setAllocations(prev => {
      const updated = { ...prev };
      delete updated[invoiceId];
      return updated;
    });
  };

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + val, 0);
  }, [allocations]);

  const totalCustomerOutstanding = useMemo(() => {
    return unpaidInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) - Number(inv.amountPaid)), 0);
  }, [unpaidInvoices]);

  const unallocatedAmount = useMemo(() => {
    return Math.max(0, amount - totalAllocated);
  }, [amount, totalAllocated]);

  const mappedInvoices = useMemo(() => {
    if (allocationMode === 'AUTO') {
      return unpaidInvoices.filter(inv => (allocations[inv.id] || 0) > 0);
    }
    return unpaidInvoices.filter(inv => manualInvoiceIds.includes(inv.id));
  }, [unpaidInvoices, allocations, manualInvoiceIds, allocationMode]);

  const filteredSearchInvoices = useMemo(() => {
    const unselected = unpaidInvoices.filter(inv => !manualInvoiceIds.includes(inv.id));
    if (!invoiceSearchTerm) return unselected;
    const term = invoiceSearchTerm.toLowerCase();
    return unselected.filter(inv => {
      const invNo = (inv.invoiceNo || '').toLowerCase();
      const cust = (inv.businessPartner?.name || '').toLowerCase();
      const amt = String(inv.grandTotal || '').toLowerCase();
      const dateStr = new Date(inv.date).toLocaleDateString().toLowerCase();
      const ref = (inv.gstBreakup?.referenceNo || '').toLowerCase();
      const out = String(Number(inv.grandTotal) - Number(inv.amountPaid)).toLowerCase();

      return invNo.includes(term) || cust.includes(term) || amt.includes(term) || dateStr.includes(term) || ref.includes(term) || out.includes(term);
    });
  }, [unpaidInvoices, invoiceSearchTerm, manualInvoiceIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessPartnerId) {
      notification.error('Select a Customer');
      return;
    }
    if (amount <= 0) {
      notification.error('Amount must be greater than zero');
      return;
    }

    if (!id && amount > totalCustomerOutstanding) {
      notification.error('Receipt amount exceeds outstanding balance');
      return;
    }

    if (totalAllocated > amount) {
      notification.error('Total allocated amount cannot exceed receipt amount');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        date,
        businessPartnerId,
        paymentMethod,
        amount,
        accountId: requiresBankAccount ? bankAccountId || undefined : undefined,
        referenceNo: referenceNo || undefined,
        chequeNo: chequeNo || undefined,
        transactionId: transactionId || undefined,
        clearanceDate: clearanceDate || undefined,
        bankCharges: bankCharges || undefined,
        cashier: cashier || undefined,
        notes: notes || undefined,
        splitPayments: isSplitPayment ? splitPayments.map(sp => ({
          paymentMethod: sp.paymentMethod,
          amount: Number(sp.amount),
          accountId: sp.accountId || undefined,
          referenceNo: sp.referenceNo || undefined
        })) : undefined
      };

      payload.allocations = Object.entries(allocations)
        .filter(([_, val]) => val > 0)
        .map(([invoiceId, val]) => ({ invoiceId, amount: val }));

      if (id && isEdit) {
        await apiClient.put(`/receipts/${id}`, {
          accountId: requiresBankAccount ? bankAccountId || undefined : undefined,
          referenceNo: referenceNo || undefined,
          chequeNo: chequeNo || undefined,
          transactionId: transactionId || undefined,
          clearanceDate: clearanceDate || undefined,
          bankCharges: bankCharges || undefined,
          cashier: cashier || undefined,
          notes: notes || undefined,
          status
        });
        notification.success('Receipt updated successfully');
      } else {
        await apiClient.post('/receipts', payload);
        notification.success('Receipt recorded successfully');
      }

      navigate('/receipts');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to save receipt');
    } finally {
      setSaving(false);
    }
  };

  if (masterError) {
    console.error('Failed to load customer master data:', masterError);
    return (
      <PageContainer maxWidth="7xl">
        <div className="bg-red-50/50 border border-red-200 rounded-2xl p-8 text-center space-y-4 my-8 max-w-2xl mx-auto shadow-sm">
          <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-red-900">Failed to load customer master data</h3>
          <p className="text-sm text-red-600 leading-relaxed">
            There was an issue retrieving the list of customers. Please check your network connection and try again.
          </p>
          <Button onClick={() => refetchMaster()} className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all">
            Retry Loading Customers
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (isLoadingMaster || isLoadingReceipt) {
    return (
      <PageContainer maxWidth="7xl">
        <LoadingState variant="form" />
      </PageContainer>
    );
  }

  if (isView && receiptData) {
    const r = receiptData;
    const allocated = r.allocations ? r.allocations.reduce((sum: number, alloc: any) => sum + Number(alloc.amount || 0), 0) : 0;
    const unallocated = Number(r.amount) - allocated;

    return (
      <PageContainer maxWidth="7xl">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface border border-border rounded-2xl p-4 sm:px-6 mb-6 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-accent/10 text-accent p-3 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-foreground">{r.receiptNo || 'Receipt'}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {r.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Received on {new Date(r.date).toLocaleDateString()} from <span className="font-semibold text-foreground">{r.businessPartner?.name}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => navigate('/receipts')}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => setIsPreviewOpen(true)}>
              <Printer className="w-4 h-4" /> Print
            </Button>
            {r.status === 'COMPLETED' && (
              <Button variant="primary" size="sm" className="gap-2 h-9" onClick={() => navigate(`/receipts/${r.id}/edit`)}>
                <Edit3 className="w-4 h-4" /> Edit
              </Button>
            )}
          </div>
        </div>

        {/* 70/30 Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">

          {/* Left Column (70%) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Receipt Information Card */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 mb-4 flex items-center gap-2">
                <FileCheck className="w-4.5 h-4.5 text-accent" /> Receipt Information
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Receipt Date</p>
                  <p className="text-sm font-medium text-foreground">{new Date(r.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customer</p>
                  <p className="text-sm font-medium text-foreground">{r.businessPartner?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payment Method</p>
                  <p className="text-sm font-medium text-foreground">{r.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reference Number</p>
                  <p className="text-sm font-medium text-foreground">{r.referenceNo || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Clearance Date</p>
                  <p className="text-sm font-medium text-foreground">{r.clearanceDate ? new Date(r.clearanceDate).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Account Ledger</p>
                  <p className="text-sm font-medium text-foreground">{r.account?.name || '—'}</p>
                </div>
              </div>
            </div>

            {/* Allocations Table */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-accent" /> Invoice Allocations
              </h3>

              {(!r.allocations || r.allocations.length === 0) ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <HelpCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No invoices were allocated to this receipt.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice No</th>
                        <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Invoice Total</th>
                        <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Allocated</th>
                        <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {r.allocations.map((alloc: any) => {
                        const inv = alloc.invoice;
                        return (
                          <tr key={alloc.id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-4 text-sm font-semibold text-foreground">{inv?.invoiceNo || 'Unknown'}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{inv ? new Date(inv.date).toLocaleDateString() : '—'}</td>
                            <td className="py-3 px-4 text-sm font-mono text-right text-muted-foreground">₹{inv?.grandTotal || '0.00'}</td>
                            <td className="py-3 px-4 text-sm font-mono font-bold text-right text-foreground">₹{alloc.amount}</td>
                            <td className="py-3 px-4 text-sm text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv?.status === 'PAID' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {inv?.status || 'UNKNOWN'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notes Panel */}
            {r.notes && (
              <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 mb-4 flex items-center gap-2">
                  <Info className="w-4.5 h-4.5 text-accent" /> Notes & Remarks
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.notes}</p>
              </div>
            )}

          </div>

          {/* Right Column (30%) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-6 space-y-6">

              {/* Receipt Summary Panel */}
              <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-muted/20 p-6 border-b border-border text-center">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Receipt Amount</p>
                  <h2 className="text-3xl font-bold text-blue-600 font-mono tracking-tight flex items-center justify-center gap-1">
                    ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Allocated Amount</span>
                    <span className="font-semibold font-mono text-foreground">₹{allocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Unallocated Amount</span>
                    <span className={`font-semibold font-mono ${unallocated > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                      ₹{unallocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Journal Status Panel */}
              <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 mb-4 flex items-center gap-2">
                  <Landmark className="w-4.5 h-4.5 text-accent" /> Accounting Status
                </h3>

                {r.status === 'COMPLETED' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl dark:bg-green-500/10 dark:border-green-500/20">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
                      <div>
                        <p className="text-sm font-semibold text-green-800 dark:text-green-400">Journal Posted</p>
                        <p className="text-xs text-green-700/80 dark:text-green-500/80">Ledgers updated successfully</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-medium flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {r.account?.name || 'Cash/Bank'}</span>
                        <span className="font-mono text-foreground">Dr. ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-medium flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Accounts Receivable</span>
                        <span className="font-mono text-foreground">Cr. ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl dark:bg-red-500/10 dark:border-red-500/20">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500" />
                    <div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-400">Receipt Voided</p>
                      <p className="text-xs text-red-700/80 dark:text-red-500/80">Ledger entries reversed</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <DocumentPreviewModal 
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          data={{ company: { name: "", address: "" }, customer: { name: r.customer?.name || "", address: "" }, document: { title: "Receipt", documentNo: r.receiptNo, date: r.date }, items: [], totals: { subTotal: 0, taxTotal: 0, grandTotal: r.amount, currency: "INR" } }}
          title="Receipt Preview"
          filename={`Receipt_${r.receiptNo}.pdf`}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title={isView ? 'Receipt Details' : isEdit ? 'Edit Receipt' : 'Record Receipt'}
        description={isView ? 'View accounting postings and details.' : 'Configure money collection.'}
        backTo={{ label: 'Receipts', path: '/receipts' }}
      />

      <form onSubmit={handleSubmit} className="w-full text-left">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN (Primary Information) - 8/12 on desktop, 7/12 on laptop */}
          <div className="xl:col-span-8 lg:col-span-7 space-y-6">

            {/* Split Payment Toggle */}
            <div className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <h4 className="text-sm font-bold text-foreground">Split Payment</h4>
                <p className="text-xs text-muted-foreground">Enable to pay using multiple payment methods</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isSplitPayment}
                  onChange={(e) => setIsSplitPayment(e.target.checked)}
                  disabled={isView}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            {isSplitPayment && (
              <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                 <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex justify-between items-center">
                  <span className="flex items-center gap-2">Payment Methods</span>
                  {!isView && (
                    <button type="button" onClick={() => setSplitPayments([...splitPayments, { paymentMethod: 'CASH', amount: 0, accountId: '', referenceNo: '' }])} className="text-xs text-accent hover:underline flex items-center gap-1">
                      Add Method
                    </button>
                  )}
                </h3>
                <div className="space-y-4">
                  {splitPayments.map((sp, idx) => (
                    <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end p-3 bg-muted/20 rounded-xl border border-border">
                      <div className="w-full md:w-1/4">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Method</label>
                        <select
                          value={sp.paymentMethod}
                          onChange={(e) => {
                            const newArr = [...splitPayments];
                            newArr[idx].paymentMethod = e.target.value;
                            setSplitPayments(newArr);
                          }}
                          disabled={isView}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent"
                        >
                          <option value="BANK_TRANSFER">Bank</option>
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="CREDIT_CARD">Card</option>
                        </select>
                      </div>
                      <div className="w-full md:w-1/4">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Amount</label>
                        <input
                          type="number"
                          value={sp.amount}
                          onChange={(e) => {
                            const newArr = [...splitPayments];
                            newArr[idx].amount = Number(e.target.value);
                            setSplitPayments(newArr);
                          }}
                          disabled={isView}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="w-full md:w-1/3">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Account / Ref</label>
                        <input
                          type="text"
                          placeholder="Account or Ref"
                          value={sp.referenceNo || sp.accountId}
                          onChange={(e) => {
                            const newArr = [...splitPayments];
                            if (sp.paymentMethod === 'BANK_TRANSFER' || sp.paymentMethod === 'UPI') {
                               newArr[idx].accountId = e.target.value;
                            } else {
                               newArr[idx].referenceNo = e.target.value;
                            }
                            setSplitPayments(newArr);
                          }}
                          disabled={isView}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      {!isView && splitPayments.length > 1 && (
                        <button type="button" onClick={() => {
                          const newArr = splitPayments.filter((_, i) => i !== idx);
                          setSplitPayments(newArr);
                        }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {splitPayments.reduce((s, a) => s + Number(a.amount), 0) !== amount && amount > 0 && (
                    <div className="text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg flex items-center gap-2">
                      Split amounts sum ({splitPayments.reduce((s, a) => s + Number(a.amount), 0)}) must equal Receipt Amount ({amount})
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isSplitPayment && (
              <>
            {/* Card 1 - Receipt Details */}
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                <FileCheck className="w-4.5 h-4.5 text-accent" /> Receipt Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={isView}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    disabled={isView}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CREDIT_CARD">Credit/Debit Card</option>
                    <option value="WALLET">Wallet Payout</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Customer *</label>
                  <select
                    value={businessPartnerId}
                    onChange={(e) => setBusinessPartnerId(e.target.value)}
                    disabled={isView || id !== undefined}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                    required
                  >
                    <option value="">Select Customer...</option>
                    {(customers || []).map((c: any) => {
                      const details = [
                        c.customerCode ? `Code: ${c.customerCode}` : null,
                        c.gstin || c.gstNumber ? `GSTIN: ${c.gstin || c.gstNumber}` : null,
                      ].filter(Boolean).join(' | ');

                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} {details ? `(${details})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {!businessPartnerId && (
                    <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Customer selection is required
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Receipt Amount *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold font-mono">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={amount || ''}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      disabled={isView}
                      placeholder="0.00"
                      className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent font-bold disabled:opacity-60 font-sans"
                      required
                      min={0.01}
                    />
                  </div>
                  {amount <= 0 && (
                    <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Amount must be greater than zero
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2 - Bank / Payment Information */}
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                {paymentMethod === 'CASH' ? <Wallet className="w-4.5 h-4.5 text-amber-500" /> : <Landmark className="w-4.5 h-4.5 text-blue-500" />}
                {paymentMethod === 'CASH' ? 'Cash Details' : 'Bank & Payment Details'}
              </h3>

              <div className="space-y-4">
                <ConditionalPaymentDetails
                  paymentMethod={paymentMethod}
                  isView={isView}
                  referenceNo={referenceNo}
                  setReferenceNo={setReferenceNo}
                  chequeNo={chequeNo}
                  setChequeNo={setChequeNo}
                  transactionId={transactionId}
                  setTransactionId={setTransactionId}
                  clearanceDate={clearanceDate}
                  setClearanceDate={setClearanceDate}
                  bankCharges={bankCharges}
                  setBankCharges={setBankCharges}
                  cashier={cashier}
                  setCashier={setCashier}
                  bankAccountId={bankAccountId}
                  setBankAccountId={setBankAccountId}
                  setSelectedBank={setSelectedBank}
                  hasBankAccounts={hasBankAccounts}
                  maskAccountNumber={maskAccountNumber}
                />
              </div>
            </div>

            </>
            )}

            {/* Card 3 - Outstanding Invoices Allocation Block */}
            {businessPartnerId && (
              <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm" ref={dropdownRef}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Receipt className="w-4.5 h-4.5 text-accent" /> Receipt Allocations
                  </h3>
                  {!isView && unpaidInvoices.length > 0 && (
                    <div className="flex items-center gap-2 bg-muted/20 border border-border/60 rounded-xl p-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setAllocationMode('AUTO');
                          setManualInvoiceIds([]);
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${allocationMode === 'AUTO' ? 'bg-surface text-accent shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Automatic FIFO
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAllocationMode('MANUAL');
                          const existingIds = Object.keys(allocations).filter(id => allocations[id] > 0);
                          setManualInvoiceIds(existingIds);
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${allocationMode === 'MANUAL' ? 'bg-surface text-accent shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Manual Allocation
                      </button>
                    </div>
                  )}
                </div>

                {isLoadingInvoices ? (
                  <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading customer invoices...</div>
                ) : unpaidInvoices.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5 bg-muted/25 rounded-xl border border-dashed border-border">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <p className="font-extrabold text-foreground uppercase tracking-wide">Account Fully Cleared</p>
                    <p>This customer has no unpaid invoices. Recorded amount will be posted as an advance payment.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Searchable Invoice Select Dropdown */}
                    {allocationMode === 'MANUAL' && !isView && (
                      <div className="relative max-w-md">
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Search & Add Unpaid Invoice</label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search by invoice number, date, amount, reference..."
                            value={invoiceSearchTerm}
                            onChange={e => {
                              setInvoiceSearchTerm(e.target.value);
                              setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-accent"
                          />
                        </div>

                        {isDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1.5 bg-surface border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                            {filteredSearchInvoices.length === 0 ? (
                              <div className="p-3 text-center text-xs text-muted-foreground">No matching unpaid invoices found</div>
                            ) : (
                              <div className="divide-y divide-border/40">
                                {filteredSearchInvoices.map(inv => {
                                  const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
                                  return (
                                    <div
                                      key={inv.id}
                                      onClick={() => handleAddManualInvoice(inv.id)}
                                      className="p-3 hover:bg-muted/30 cursor-pointer text-xs flex flex-col gap-1 transition-colors text-left"
                                    >
                                      <div className="flex justify-between font-bold">
                                        <span className="text-accent font-mono">{inv.invoiceNo}</span>
                                        <span className="text-foreground">₹{unpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })} due</span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground text-[10px]">
                                        <span>Date: {new Date(inv.date).toLocaleDateString()}</span>
                                        <span>Total: ₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {mappedInvoices.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-xl">
                        {allocationMode === 'MANUAL' ? 'No invoices selected. Search and add an invoice above.' : 'No automatic FIFO allocations applied.'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left min-w-[800px]">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border font-bold uppercase tracking-wider">
                              <th className="pb-3 text-left w-32">Invoice Number</th>
                              <th className="pb-3 text-center w-28">Date</th>
                              <th className="pb-3 text-right w-32">Total Amount</th>
                              <th className="pb-3 text-right w-32">Amount Paid</th>
                              <th className="pb-3 text-right w-32">Balance Due</th>
                              <th className="pb-3 text-right w-36">Allocate Amount</th>
                              <th className="pb-3 text-right w-32">Balance After</th>
                              <th className="pb-3 text-center w-28">Status</th>
                              {allocationMode === 'MANUAL' && !isView && <th className="pb-3 w-16 text-center"></th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60 font-semibold text-foreground">
                            {mappedInvoices.map(inv => {
                              const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
                              const allocatedVal = allocations[inv.id] || 0;
                              const balanceAfter = Math.max(0, unpaid - allocatedVal);
                              const statusLabel = balanceAfter === 0 ? 'PAID' : 'PARTIAL';

                              return (
                                <tr key={inv.id} className="hover:bg-muted/10 transition-colors">
                                  <td className="py-3 font-mono font-bold text-accent">{inv.invoiceNo}</td>
                                  <td className="py-3 text-center text-muted-foreground font-normal">{new Date(inv.date).toLocaleDateString()}</td>
                                  <td className="py-3 text-right text-muted-foreground font-normal font-mono">₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                  <td className="py-3 text-right text-muted-foreground font-normal font-mono">₹{Number(inv.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                  <td className="py-3 text-right text-red-500 font-mono">₹{unpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                  <td className="py-3 text-right pr-2">
                                    <div className="relative inline-block w-32">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">₹</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        max={unpaid}
                                        value={allocatedVal || ''}
                                        onChange={e => handleAllocationChange(inv.id, Number(e.target.value))}
                                        disabled={isView || allocationMode === 'AUTO'}
                                        placeholder="0.00"
                                        className="w-full pl-5 pr-2 py-1 text-right bg-background border border-border rounded focus:outline-none text-xs font-bold font-mono"
                                      />
                                    </div>
                                  </td>
                                  <td className="py-3 text-right font-mono text-foreground">₹{balanceAfter.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                  <td className="py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusLabel === 'PAID' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                                      }`}>
                                      {statusLabel}
                                    </span>
                                  </td>
                                  {allocationMode === 'MANUAL' && !isView && (
                                    <td className="py-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveManualInvoice(inv.id)}
                                        className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer hover:underline"
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Summary Metrics */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/20 border border-border/80 rounded-xl p-4 text-xs font-bold">
                      <div className="text-muted-foreground">
                        Allocation Mode: <span className="text-accent uppercase">{allocationMode}</span>
                      </div>

                      <div className="flex gap-4 font-bold text-muted-foreground">
                        <div>Receipt Amount: <span className="text-foreground font-mono">₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        <div>Allocated: <span className="text-green-600 font-mono">₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        <div>Unallocated: <span className={`${unallocatedAmount > 0 ? "text-amber-500" : "text-foreground"} font-mono`}>₹{unallocatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (Summary & Metadata) - 4/12 on desktop, 5/12 on laptop */}
          <div className="xl:col-span-4 lg:col-span-5 space-y-6 lg:sticky lg:top-6">

            {/* Card 1 - Receipt Summary */}
            <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden text-left">
              <div className="bg-muted/20 p-6 border-b border-border text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Net Received</p>
                <h2 className="text-3xl font-bold text-accent font-mono tracking-tight flex items-center justify-center gap-1">
                  {formatCurrency(Math.max(0, amount - bankCharges))}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/60 pb-2">Receipt Summary</h4>
                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Customer</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]">{selectedCustomer?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Receipt Amount</span>
                    <span className="font-semibold font-mono text-foreground">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Payment Method</span>
                    <span className="font-semibold text-foreground">{paymentMethod.replace('_', ' ')}</span>
                  </div>
                  {requiresBankAccount && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Selected Bank</span>
                      <span className="font-semibold text-foreground truncate max-w-[150px]">{activeBank?.bankName || activeBank?.name || '—'}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Reference Number</span>
                    <span className="font-semibold text-foreground">{referenceNo || chequeNo || transactionId || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Bank Charges</span>
                    <span className="font-semibold font-mono text-red-500">-{formatCurrency(bankCharges)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 - Notes & Remarks */}
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm text-left">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                <Info className="w-4.5 h-4.5 text-accent" /> Notes & Remarks
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isView}
                placeholder="Add special notes for receipt..."
                rows={4}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent resize-none disabled:opacity-60"
              />

              {isEdit && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="COMPLETED">Completed</option>
                    <option value="VOID">Void</option>
                  </select>
                </div>
              )}

              {selectedCustomer && (
                <FinancialSummary title="Customer Account Summary" className="p-4 bg-muted/10">
                  <div className="flex justify-between items-center py-2 border-b border-border/20 last:border-b-0 text-xs">
                    <span className="font-semibold text-muted-foreground">Customer Name</span>
                    <span className="font-bold text-foreground truncate max-w-[150px]">{selectedCustomer.name}</span>
                  </div>
                  <SummaryRow label="Outstanding Balance" value={selectedCustomer.receivableBalance} isNegative />
                </FinancialSummary>
              )}

              {!isView && (
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/receipts')}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border font-semibold text-sm text-foreground hover:bg-muted transition-all cursor-pointer text-center bg-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || isFormInvalid}
                    className="flex-1 bg-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-accent/20 cursor-pointer hover:bg-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-0 disabled:cursor-not-allowed"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Receipt
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </form>
    </PageContainer>
  );
};
