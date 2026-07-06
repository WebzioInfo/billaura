import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Calendar, Receipt, Search, ChevronDown, Check, CreditCard, Banknote, HelpCircle, Loader2, ArrowLeft, Info, Landmark, Wallet, CheckCircle, FileCheck, AlertCircle } from 'lucide-react';
import { PageContainer, LoadingState } from '@/components/ui/LayoutComponents';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface InvoiceAllocationRow {
  invoiceId: string;
  invoiceNo: string;
  date: string;
  grandTotal: number;
  amountPaid: number;
  unpaidAmount: number;
  amount: number;
}

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

  const [invoices, setInvoices] = useState<InvoiceAllocationRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Issue 1: Customer Dropdown Loading (robust with retry/error fallback)
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

    // Load allocations
    if (r.allocations) {
      const allocs = r.allocations.map((a: any) => ({
        invoiceId: a.invoiceId,
        invoiceNo: a.invoice?.invoiceNo || 'N/A',
        date: a.invoice?.date ? new Date(a.invoice.date).toLocaleDateString() : 'N/A',
        grandTotal: Number(a.invoice?.grandTotal || 0),
        amountPaid: Number(a.invoice?.amountPaid || 0) - Number(a.amount), // Amount paid before this receipt
        unpaidAmount: Number(a.invoice?.grandTotal || 0) - (Number(a.invoice?.amountPaid || 0) - Number(a.amount)),
        amount: Number(a.amount)
      }));
      setInvoices(allocs);
    }
  }, [receiptData, id]);

  // Issue 2: Automatically load outstanding invoices for selected customer
  const { data: customerInvoices } = useQuery({
    queryKey: ['sales-invoices-outstanding', businessPartnerId],
    queryFn: async () => {
      if (!businessPartnerId || id) return [];
      const res = await apiClient.get(`/sales/invoices`, {
        params: { customerId: businessPartnerId }
      });
      const dataObj = res.data || res;
      const list = dataObj.data?.data || dataObj.data || dataObj || [];
      const listArr = Array.isArray(list) ? list : [];
      return listArr
        .filter((inv: any) => Number(inv.amountPaid) < Number(inv.grandTotal) && inv.status !== 'DRAFT')
        .map((inv: any) => ({
          invoiceId: inv.id,
          invoiceNo: inv.invoiceNo,
          date: new Date(inv.date).toLocaleDateString(),
          grandTotal: Number(inv.grandTotal),
          amountPaid: Number(inv.amountPaid),
          unpaidAmount: Number(inv.grandTotal) - Number(inv.amountPaid),
          amount: 0
        }));
    },
    enabled: !!businessPartnerId && !id
  });

  useEffect(() => {
    if (customerInvoices) {
      setInvoices(customerInvoices);
      setSelectedCustomer(customers.find((c: any) => c.id === businessPartnerId));
    }
  }, [customerInvoices, businessPartnerId, customers]);

  // Auto/FIFO Allocation
  const handleAutoAllocate = () => {
    if (amount <= 0) {
      toast.error('Enter receipt amount first');
      return;
    }

    let remaining = amount;
    const updated = invoices.map(inv => {
      const allocate = Math.min(remaining, inv.unpaidAmount);
      remaining -= allocate;
      return { ...inv, amount: allocate };
    });

    setInvoices(updated);
    toast.success('Amount allocated using FIFO strategy');
  };

  const handleAllocationChange = (invoiceId: string, val: number) => {
    const updated = invoices.map(inv => {
      if (inv.invoiceId === invoiceId) {
        if (val > inv.unpaidAmount) {
          toast.warning(`Allocation cannot exceed unpaid balance of ₹${inv.unpaidAmount}`);
          return { ...inv, amount: inv.unpaidAmount };
        }
        return { ...inv, amount: Math.max(0, val) };
      }
      return inv;
    });
    setInvoices(updated);
  };

  const totalAllocated = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const remainingUnapplied = amount - totalAllocated;

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
    if (totalAllocated > amount) {
      toast.error('Allocated invoice sum cannot exceed Receipt Amount');
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
        notes: notes || undefined,
        allocations: invoices
          .filter(inv => inv.amount > 0)
          .map(inv => ({ invoiceId: inv.invoiceId, amount: inv.amount }))
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
        description={isView ? 'View accounting postings and invoice allocations.' : 'Configure money collection and allocations.'}
        backTo={{ label: 'Receipts', path: '/receipts' }}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Columns - Form Entry */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-accent" /> Basic Details
            </h3>

            {/* Row 1: Date & Payment Method */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Allocation Section */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Invoice Allocations
              </h3>
              {!isView && invoices.length > 0 && (
                <button
                  type="button"
                  onClick={handleAutoAllocate}
                  className="text-xs bg-accent/15 text-accent hover:bg-accent/20 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer border-0"
                >
                  Auto FIFO Allocate
                </button>
              )}
            </div>

            {invoices.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">Select a customer with unpaid invoices to configure allocations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b border-border pb-2">
                      <th className="py-2">Invoice No</th>
                      <th className="py-2">Date</th>
                      <th className="py-2 text-right">Total</th>
                      <th className="py-2 text-right">Unpaid</th>
                      <th className="py-2 text-right w-1/3">Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.invoiceId} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                        <td className="py-3 font-mono font-bold text-foreground">{inv.invoiceNo}</td>
                        <td className="py-3 text-xs text-muted-foreground">{inv.date}</td>
                        <td className="py-3 text-right font-semibold font-sans tabular-nums">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                        <td className="py-3 text-right text-amber-500 font-bold font-sans tabular-nums">₹{inv.unpaidAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3 pl-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold font-sans">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={inv.amount || ''}
                              onChange={(e) => handleAllocationChange(inv.invoiceId, Number(e.target.value))}
                              disabled={isView}
                              placeholder="0.00"
                              className="w-full text-right bg-background border border-border rounded-lg pl-6 pr-3 py-1.5 text-xs font-bold focus:outline-none focus:border-accent disabled:opacity-60 font-sans tabular-nums"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Subtotals & Unapplied display */}
                <div className="border-t border-border mt-4 pt-4 space-y-2 text-xs font-bold text-muted-foreground">
                  <div className="flex justify-between items-center">
                    <span>Sum of allocated amounts:</span>
                    <span className={totalAllocated > amount ? 'text-red-500 font-sans' : 'text-foreground font-sans'}>
                      ₹{totalAllocated.toLocaleString('en-IN')} / ₹{amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Unapplied / Remaining Balance:</span>
                    <span className={remainingUnapplied < 0 ? 'text-red-500 font-sans' : remainingUnapplied > 0 ? 'text-amber-500 font-sans' : 'text-green-600 font-sans'}>
                      ₹{remainingUnapplied.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}
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
