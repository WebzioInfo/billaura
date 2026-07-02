import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Save, FileText, Loader2, Info, Plus, Trash2, 
  DollarSign, Landmark, Wallet, CheckCircle, AlertCircle, FileCheck 
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import apiClient from '@/services/api';
import { toast } from 'sonner';

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
  
  const isEdit = pathname.endsWith('/edit');
  const isView = !!id && !isEdit;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [businessPartnerId, setBusinessPartnerId] = useState('');
  const [accountId, setAccountId] = useState('');
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

  // Master Data Options
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<InvoiceAllocationRow[]>([]);

  // Selected customer details
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Load master data
  useEffect(() => {
    const loadMasterData = async () => {
      setLoading(true);
      try {
        const [custRes, accRes] = await Promise.all([
          apiClient.get('/customers'),
          apiClient.get('/accounts')
        ]);
        setCustomers(custRes.data?.data || custRes.data || []);
        
        // Filter asset accounts (cash, bank, bank accounts) for receipt debit
        const accs = accRes.data?.data || accRes.data || [];
        setAccounts(accs.filter((a: any) => a.category === 'ASSET'));
      } catch (err) {
        toast.error('Failed to load master data');
      } finally {
        setLoading(false);
      }
    };
    loadMasterData();
  }, []);

  // Load receipt if edit/view mode
  useEffect(() => {
    if (!id) return;

    const fetchReceipt = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/receipts/${id}`);
        const r = res.data?.data || res.data || {};
        
        setDate(new Date(r.date).toISOString().split('T')[0]);
        setBusinessPartnerId(r.businessPartnerId);
        setAccountId(r.accountId);
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
      } catch (err) {
        toast.error('Failed to load receipt details');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [id]);

  // Load invoices when customer changes (only in Create mode)
  useEffect(() => {
    if (id || !businessPartnerId) {
      setInvoices([]);
      return;
    }

    const fetchInvoices = async () => {
      try {
        const res = await apiClient.get(`/sales/invoices`, {
          params: { customerId: businessPartnerId }
        });
        const list = res.data?.data?.items || res.data?.items || [];
        
        // Filter invoices with outstanding balances
        const outstanding = list
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
        
        setInvoices(outstanding);
        setSelectedCustomer(customers.find(c => c.id === businessPartnerId));
      } catch (err) {
        toast.error('Failed to load outstanding invoices');
      }
    };
    fetchInvoices();
  }, [businessPartnerId, id, customers]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessPartnerId) {
      toast.error('Select a Customer');
      return;
    }
    if (!accountId) {
      toast.error('Select an Account Ledger');
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
        accountId,
        paymentMethod,
        amount,
        referenceNo,
        chequeNo,
        transactionId,
        clearanceDate: clearanceDate || undefined,
        bankCharges,
        cashier,
        notes,
        allocations: invoices
          .filter(inv => inv.amount > 0)
          .map(inv => ({ invoiceId: inv.invoiceId, amount: inv.amount }))
      };

      if (id && isEdit) {
        await apiClient.put(`/receipts/${id}`, {
          referenceNo,
          chequeNo,
          transactionId,
          clearanceDate: clearanceDate || undefined,
          bankCharges,
          cashier,
          notes,
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

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Loading Receipt...</p>
        </div>
      </div>
    );
  }

  const isCash = paymentMethod === 'CASH';
  const isBank = !isCash;

  return (
    <div className="p-8 max-w-[1200px] mx-auto text-left text-foreground bg-background min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/receipts')}
          className="p-2 hover:bg-muted border border-border rounded-xl transition-all cursor-pointer text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold">
            {isView ? 'Receipt Details' : isEdit ? 'Edit Receipt' : 'Record Receipt'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isView ? 'View accounting postings and invoice allocations.' : 'Configure money collection and allocations.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns - Form Entry */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-accent" /> Basic Details
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
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isView}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / EFT</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT_CARD">Credit/Debit Card</option>
                  <option value="WALLET">Mobile Wallet</option>
                </select>
              </div>
            </div>

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
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Debit Account Ledger *</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  disabled={isView}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  required
                >
                  <option value="">Select Ledger...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.category})</option>)}
                </select>
              </div>
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
                  className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent font-bold disabled:opacity-60"
                  required
                  min={0.01}
                />
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
                  className="text-xs bg-accent/15 text-accent hover:bg-accent/20 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
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
                <table className="w-full text-left text-sm">
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
                      <tr key={inv.invoiceId} className="border-b border-border/40 last:border-0">
                        <td className="py-3 font-mono font-bold text-foreground">{inv.invoiceNo}</td>
                        <td className="py-3 text-xs text-muted-foreground">{inv.date}</td>
                        <td className="py-3 text-right font-semibold">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                        <td className="py-3 text-right text-amber-500 font-bold">₹{inv.unpaidAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3 pl-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={inv.amount || ''}
                              onChange={(e) => handleAllocationChange(inv.invoiceId, Number(e.target.value))}
                              disabled={isView}
                              placeholder="0.00"
                              className="w-full text-right bg-background border border-border rounded-lg pl-6 pr-3 py-1.5 text-xs font-bold focus:outline-none focus:border-accent disabled:opacity-60"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between items-center border-t border-border mt-4 pt-4 text-xs font-bold text-muted-foreground">
                  <span>Sum of allocated amounts:</span>
                  <span className={totalAllocated > amount ? 'text-red-500' : 'text-foreground'}>
                    ₹{totalAllocated.toLocaleString('en-IN')} / ₹{amount.toLocaleString('en-IN')}
                  </span>
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
              {isCash ? <Wallet className="w-4 h-4 text-amber-500" /> : <Landmark className="w-4 h-4 text-blue-500" />}
              {isCash ? 'Cash Details' : 'Bank Details'}
            </h3>

            {isCash ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cashier / Collector</label>
                  <input
                    type="text"
                    value={cashier}
                    onChange={(e) => setCashier(e.target.value)}
                    disabled={isView}
                    placeholder="Collector name"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
              </div>
            ) : (
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
                    placeholder="e.g. TXN9824"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cheque Number</label>
                  <input
                    type="text"
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                    disabled={isView}
                    placeholder="e.g. 000123"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60 font-mono"
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
                    placeholder="0.00"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reference Number</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                disabled={isView}
                placeholder="Internal reference No"
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
              />
            </div>
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
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border font-semibold text-sm text-foreground hover:bg-muted transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-accent/20 cursor-pointer hover:bg-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Receipt
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
