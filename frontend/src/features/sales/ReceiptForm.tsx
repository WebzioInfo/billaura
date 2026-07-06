import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Calendar, Receipt, Search, ChevronDown, Check, CreditCard, Banknote, HelpCircle, Loader2, ArrowLeft, Info, Landmark, Wallet, CheckCircle, FileCheck, AlertCircle } from 'lucide-react';
import { PageContainer, LoadingState } from '@/components/ui/LayoutComponents';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export const ReceiptForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const queryCustomerId = searchParams.get('customerId');

  const isEdit = pathname.endsWith('/edit');
  const isView = !!id && !isEdit;

  const [saving, setSaving] = useState(false);

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [businessPartnerId, setBusinessPartnerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [amount, setAmount] = useState<number>(0);
  const [referenceNo, setReferenceNo] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [clearanceDate, setClearanceDate] = useState('');
  const [bankCharges, setBankCharges] = useState<number>(0);
  const [cashier, setCashier] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('COMPLETED');

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

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

  useEffect(() => {
    if (!id && queryCustomerId && customers.length > 0) {
      const match = customers.find((c: any) => c.id === queryCustomerId);
      if (match) {
        setBusinessPartnerId(match.id);
        setSelectedCustomer(match);
      }
    }
  }, [id, queryCustomerId, customers]);

  // Sync selectedCustomer state when businessPartnerId changes in Create Mode
  useEffect(() => {
    if (businessPartnerId && customers.length > 0 && !id) {
      const match = customers.find((c: any) => c.id === businessPartnerId);
      if (match) {
        setSelectedCustomer(match);
      }
    }
  }, [businessPartnerId, customers, id]);

  const { data: receiptData, isLoading: isLoadingReceipt } = useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get(`/receipts/${id}`);
      return res.data || {};
    },
    enabled: !!id
  });

  // Load receipt if edit/view mode
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
  }, [receiptData, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessPartnerId) {
      toast.error('Select a Customer');
      return;
    }
    if (amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date,
        businessPartnerId,
        paymentMethod,
        amount,
        referenceNo: referenceNo || undefined,
        chequeNo: chequeNo || undefined,
        transactionId: transactionId || undefined,
        clearanceDate: clearanceDate || undefined,
        bankCharges: bankCharges || undefined,
        cashier: cashier || undefined,
        notes: notes || undefined
      };

      if (id && isEdit) {
        await apiClient.put(`/receipts/${id}`, {
          referenceNo: referenceNo || undefined,
          chequeNo: chequeNo || undefined,
          transactionId: transactionId || undefined,
          clearanceDate: clearanceDate || undefined,
          bankCharges: bankCharges || undefined,
          cashier: cashier || undefined,
          notes: notes || undefined,
          status
        });
        toast.success('Receipt updated successfully');
      } else {
        await apiClient.post('/receipts', payload);
        toast.success('Receipt recorded successfully');
      }

      navigate('/receipts');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save receipt');
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

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title={isView ? 'Receipt Details' : isEdit ? 'Edit Receipt' : 'Record Receipt'}
        description={isView ? 'View accounting postings and details.' : 'Configure money collection.'}
        backTo={{ label: 'Receipts', path: '/receipts' }}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">

        {/* Left Columns - Form Entry */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-accent" /> Basic Details
            </h3>

            {/* Row 1: Date & Payment Method */}
            <div className="grid grid-cols-1 gap-4">
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
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isView}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT_CARD">Credit/Debit Card</option>
                </select>
              </div>
            </div>

            {/* Row 2: Customer (with detailed text) & Receipt Amount */}
            <div className="grid grid-cols-1 gap-4">
              <div>
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
                      c.mobile || c.phone ? `Ph: ${c.mobile || c.phone}` : null
                    ].filter(Boolean).join(' | ');
                    
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} {details ? `(${details})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Receipt Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
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
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Reference Details */}
        <div className="space-y-6">

          {/* Payment Method Details */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              {paymentMethod === 'CASH' ? <Wallet className="w-4 h-4 text-amber-500" /> : <Landmark className="w-4 h-4 text-blue-500" />}
              {paymentMethod === 'CASH' ? 'Cash Details' : 'Payment Details'}
            </h3>

            {/* CASH details block */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cashier / Collector</label>
                  <input
                    type="text"
                    value={cashier}
                    onChange={(e) => setCashier(e.target.value)}
                    disabled={isView}
                    placeholder="Collector name (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Transaction Reference</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    disabled={isView}
                    placeholder="Ref No (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Clearance Date</label>
                  <input
                    type="date"
                    value={clearanceDate}
                    onChange={(e) => setClearanceDate(e.target.value)}
                    disabled={isView}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
              </div>
            )}

            {/* CHEQUE details block */}
            {paymentMethod === 'CHEQUE' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cheque Number</label>
                  <input
                    type="text"
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                    disabled={isView}
                    placeholder="e.g. 000123 (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Clearance Date</label>
                  <input
                    type="date"
                    value={clearanceDate}
                    onChange={(e) => setClearanceDate(e.target.value)}
                    disabled={isView}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    disabled={isView}
                    placeholder="Cheque Ref (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
              </div>
            )}

            {/* UPI details block */}
            {paymentMethod === 'UPI' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">UPI Transaction Reference</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    disabled={isView}
                    placeholder="e.g. UPI1234567890 (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
                  />
                </div>
              </div>
            )}

            {/* CREDIT_CARD details block */}
            {paymentMethod === 'CREDIT_CARD' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Transaction Reference</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    disabled={isView}
                    placeholder="e.g. CARD-TXN-9824 (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
                  />
                </div>
              </div>
            )}

            {/* BANK_TRANSFER details block */}
            {paymentMethod === 'BANK_TRANSFER' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Clearance Date</label>
                  <input
                    type="date"
                    value={clearanceDate}
                    onChange={(e) => setClearanceDate(e.target.value)}
                    disabled={isView}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Transaction Ref / ID</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    disabled={isView}
                    placeholder="e.g. TXN9824 (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bank Charges (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankCharges || ''}
                    onChange={(e) => setBankCharges(Number(e.target.value))}
                    disabled={isView}
                    placeholder="0.00 (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    disabled={isView}
                    placeholder="Ref No (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes & Actions */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-500" /> Additional Notes
            </h3>

            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isView}
                placeholder="Add special notes for receipt..."
                rows={4}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent resize-none disabled:opacity-60"
              />
            </div>

            {isEdit && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                >
                  <option value="COMPLETED">Completed</option>
                  <option value="VOID">Void</option>
                </select>
              </div>
            )}

            {/* Display Customer Balance summary */}
            {selectedCustomer && (
              <div className="bg-muted/40 rounded-xl p-4 border border-border text-xs space-y-1.5">
                <p className="font-semibold text-foreground border-b border-border/60 pb-1.5 mb-1.5 uppercase">Customer Account Summary</p>
                <p className="flex justify-between"><span>Name:</span> <span className="font-semibold text-foreground">{selectedCustomer.name}</span></p>
                <p className="flex justify-between"><span>Outstandings:</span> <span className="font-bold text-amber-500">₹{Number(selectedCustomer.receivableBalance).toLocaleString('en-IN')}</span></p>
              </div>
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
                  disabled={saving}
                  className="flex-1 bg-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-accent/20 cursor-pointer hover:bg-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-0"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Receipt
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </PageContainer>
  );
};
