import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Plus, Trash2, Calendar, Receipt, Search, ChevronDown, Check, CreditCard, 
  Banknote, HelpCircle, Loader2, ArrowLeft, Info, Landmark, Wallet, 
  CheckCircle, FileCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import { PageContainer, LoadingState } from '@/components/ui/LayoutComponents';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  grandTotal: number;
  amountPaid: number;
  status: string;
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

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [manualAllocationMode, setManualAllocationMode] = useState(false);
  const [allocations, setAllocations] = useState<{ [invoiceId: string]: number }>({});

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
    return customerInvoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'DRAFT');
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

    if (r.allocations && Array.isArray(r.allocations)) {
      const initialAllocs: { [id: string]: number } = {};
      r.allocations.forEach((a: any) => {
        initialAllocs[a.invoiceId] = Number(a.amount);
      });
      setAllocations(initialAllocs);
      setManualAllocationMode(true);
    }
  }, [receiptData, id]);

  // FIFO Auto Allocation Frontend simulation
  const handleAutoAllocate = () => {
    let remaining = amount;
    const newAllocations: { [invoiceId: string]: number } = {};

    // Sort by date ascending (FIFO)
    const sorted = [...unpaidInvoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(inv => {
      if (remaining <= 0) return;
      const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
      const allocate = Math.min(remaining, unpaid);
      newAllocations[inv.id] = Number(allocate.toFixed(2));
      remaining -= allocate;
    });

    setAllocations(newAllocations);
    setManualAllocationMode(true);
    toast.success('FIFO Auto-allocated amount across outstanding invoices');
  };

  const handleClearAllocations = () => {
    setAllocations({});
    toast.info('Allocations cleared');
  };

  const handleAllocationChange = (invoiceId: string, val: number) => {
    const inv = unpaidInvoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
    const amountToAlloc = Math.max(0, Math.min(unpaid, val));

    setAllocations(prev => ({
      ...prev,
      [invoiceId]: Number(amountToAlloc.toFixed(2))
    }));
  };

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + val, 0);
  }, [allocations]);

  const unallocatedAmount = useMemo(() => {
    return Math.max(0, amount - totalAllocated);
  }, [amount, totalAllocated]);

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

    if (manualAllocationMode && totalAllocated > amount) {
      toast.error('Total allocated amount cannot exceed receipt amount');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
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

      if (manualAllocationMode) {
        payload.allocations = Object.entries(allocations)
          .filter(([_, val]) => val > 0)
          .map(([invoiceId, val]) => ({ invoiceId, amount: val }));
      }

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

      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto text-left">
        
        {/* Basic and Payment Details Split Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column - Basic Details */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <FileCheck className="w-4.5 h-4.5 text-accent" /> Basic Details
            </h3>

            <div className="space-y-4">
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

          {/* Right Column - Reference Details */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              {paymentMethod === 'CASH' ? <Wallet className="w-4.5 h-4.5 text-amber-500" /> : <Landmark className="w-4.5 h-4.5 text-blue-500" />}
              {paymentMethod === 'CASH' ? 'Cash Details' : 'Payment Details'}
            </h3>

            <div className="space-y-4">
              {/* Cash details fields */}
              {paymentMethod === 'CASH' && (
                <>
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
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Transaction Reference</label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      disabled={isView}
                      placeholder="Ref No (Optional)"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                    />
                  </div>
                </>
              )}

              {/* Bank Transfer details fields */}
              {paymentMethod === 'BANK_TRANSFER' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
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
                    <div>
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
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Transaction Ref / ID</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      disabled={isView}
                      placeholder="e.g. TXN9824 (Optional)"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Reference Number</label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      disabled={isView}
                      placeholder="Ref No (Optional)"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                    />
                  </div>
                </>
              )}

              {/* UPI details fields */}
              {paymentMethod === 'UPI' && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">UPI Transaction Reference</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    disabled={isView}
                    placeholder="e.g. UPI1234567890 (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
                  />
                </div>
              )}

              {/* Cheque details fields */}
              {paymentMethod === 'CHEQUE' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Cheque Number</label>
                      <input
                        type="text"
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        disabled={isView}
                        placeholder="e.g. 000123"
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
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Reference Number</label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      disabled={isView}
                      placeholder="Cheque Ref (Optional)"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                    />
                  </div>
                </>
              )}

              {/* Card details fields */}
              {paymentMethod === 'CREDIT_CARD' && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Transaction Reference</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    disabled={isView}
                    placeholder="e.g. CARD-TXN-9824 (Optional)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Outstanding Invoices Allocation Block */}
        {businessPartnerId && (
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Receipt className="w-4.5 h-4.5 text-accent" /> Outstanding Invoices Allocation
              </h3>
              {!isView && unpaidInvoices.length > 0 && (
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAutoAllocate} 
                    className="text-xs font-bold py-1.5 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-accent" /> Auto Allocate FIFO
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleClearAllocations} 
                    className="text-xs font-bold py-1.5 flex items-center gap-1 cursor-pointer"
                  >
                    Clear Allocations
                  </Button>
                </div>
              )}
            </div>

            {isLoadingInvoices ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading customer invoices...</div>
            ) : unpaidInvoices.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5 bg-muted/25 rounded-xl border border-dashed border-border">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <p className="font-extrabold text-foreground uppercase tracking-wide">Account Fully Cleared</p>
                <p>This customer has no unpaid invoices. Recorded amount will be posted as an advance payment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[700px]">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border font-bold uppercase tracking-wider">
                        <th className="pb-3 text-left w-32">Invoice Number</th>
                        <th className="pb-3 text-center w-28">Date</th>
                        <th className="pb-3 text-right w-32">Total Amount</th>
                        <th className="pb-3 text-right w-32">Amount Paid</th>
                        <th className="pb-3 text-right w-32">Balance Due</th>
                        <th className="pb-3 text-right w-36">Allocated Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono">
                      {unpaidInvoices.map(inv => {
                        const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
                        const allocatedVal = allocations[inv.id] || 0;

                        return (
                          <tr key={inv.id} className="hover:bg-muted/15 transition-all">
                            <td className="py-3 font-bold text-foreground font-sans">{inv.invoiceNo}</td>
                            <td className="py-3 text-center text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</td>
                            <td className="py-3 text-right text-muted-foreground">₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 text-right text-muted-foreground">₹{Number(inv.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 text-right text-red-500 font-bold">₹{unpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 pr-2 text-right">
                              <div className="relative inline-block w-32">
                                <span className="absolute left-2.5 top-1.5 text-muted-foreground text-[10px] font-bold">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  max={unpaid}
                                  value={allocatedVal || ''}
                                  onChange={e => handleAllocationChange(inv.id, Number(e.target.value))}
                                  disabled={isView}
                                  placeholder="0.00"
                                  className="w-full pl-5 pr-2 py-1 text-right bg-background border border-border rounded focus:outline-none text-xs font-bold"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Manual mode checkbox and summary logs */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/20 border border-border/80 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="manual-alloc"
                      checked={manualAllocationMode}
                      onChange={e => setManualAllocationMode(e.target.checked)}
                      disabled={isView}
                      className="rounded border-border focus:ring-accent text-accent"
                    />
                    <label htmlFor="manual-alloc" className="font-bold text-foreground select-none cursor-pointer">
                      Lock allocations manually (override FIFO auto allocation)
                    </label>
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

        {/* Additional Notes & Form Submission Controls */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
            <Info className="w-4.5 h-4.5 text-purple-500" /> Additional Notes & Submission
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
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              >
                <option value="COMPLETED">Completed</option>
                <option value="VOID">Void</option>
              </select>
            </div>
          )}

          {/* Customer Account Summary */}
          {selectedCustomer && (
            <div className="bg-muted/40 rounded-xl p-4 border border-border text-xs space-y-1.5">
              <p className="font-semibold text-foreground border-b border-border/60 pb-1.5 mb-1.5 uppercase">Customer Account Summary</p>
              <p className="flex justify-between"><span>Customer Name:</span> <span className="font-semibold text-foreground">{selectedCustomer.name}</span></p>
              <p className="flex justify-between"><span>Outstanding Balance:</span> <span className="font-bold text-amber-500">₹{Number(selectedCustomer.receivableBalance).toLocaleString('en-IN')}</span></p>
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

      </form>
    </PageContainer>
  );
};
