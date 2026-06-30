import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  FileText, Search, Plus, Edit2, Trash2, Landmark, 
  Loader2, RefreshCw, AlertTriangle, Calendar, CreditCard, DollarSign, ArrowUpRight, Download 
} from 'lucide-react';
import api from '../../services/api';
import { PdfDownloadButton } from '../../components/pdf/PdfDownloadButton';

// --- SCHEMAS ---
const invoiceItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  description: z.string().optional(),
  qty: z.number().min(1, 'Qty must be >= 1'),
  rate: z.number().min(0, 'Rate must be >= 0'),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  date: z.string().nonempty('Select date'),
  dueDate: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
});

const paymentSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  bankAccountId: z.string().min(1, 'Select a bank account'),
  date: z.string().nonempty('Select date'),
  amount: z.number().min(1, 'Amount must be >= 1'),
  method: z.string().min(1, 'Select payment method'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;

// --- TYPES ---
interface Customer {
  id: string;
  name: string;
  outstandingAmount: number;
}

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
}

interface BankAccount {
  id: string;
  name: string;
  currentBalance: number;
}

interface InvoiceItem {
  id: string;
  productId: string;
  description: string;
  qty: number;
  rate: number;
  taxAmount: number;
  total: number;
  product?: Product;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  date: string;
  grandTotal: number;
  amountPaid: number;
  status: string;
  customer: Customer;
  items: InvoiceItem[];
}

interface Payment {
  id: string;
  paymentNo: string;
  customerId: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  customer: Customer;
}

interface Quotation {
  id: string;
  quotationNo: string;
  customerId: string;
  date: string;
  grandTotal: number;
  customer: Customer;
}

export const SalesDashboard = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'quotations'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data lists
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Modal controls
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Forms hooks
  const invoiceForm = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      items: [{ productId: '', description: '', qty: 1, rate: 0 }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: invoiceForm.control,
    name: 'items',
  });

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerId: '',
      bankAccountId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      method: 'BANK_TRANSFER',
      reference: '',
      notes: '',
    }
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Load shared catalog dependencies
      const [custRes, prodRes, bankRes] = await Promise.all([
        api.get<{ success: boolean; data: { items: Customer[] } }>('/customers'),
        api.get<{ success: boolean; data: { items: Product[] } }>('/products'),
        api.get<{ success: boolean; data: { items: BankAccount[] } }>('/bank-accounts'),
      ]);
      setCustomers(custRes.data?.items || []);
      setProducts(prodRes.data?.items || []);
      setBankAccounts(bankRes.data?.items || []);

      if (activeTab === 'invoices') {
        const res = await api.get<{ success: boolean; data: { items: Invoice[] } }>('/sales/invoices');
        setInvoices(res.data?.items || []);
      } else if (activeTab === 'payments') {
        const res = await api.get<{ success: boolean; data: { items: Payment[] } }>('/sales/payments');
        setPayments(res.data?.items || []);
      } else if (activeTab === 'quotations') {
        const res = await api.get<{ success: boolean; data: { items: Quotation[] } }>('/sales/quotations');
        setQuotations(res.data?.items || []);
      }
    } catch (err) {
      toast.error('Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleInvoiceProductChange = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      invoiceForm.setValue(`items.${index}.rate`, Number(prod.sellingPrice));
      invoiceForm.setValue(`items.${index}.description`, prod.name);
    }
  };

  const handleInvoiceSubmit = async (values: InvoiceFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/sales/invoices', values);
      toast.success('Tax invoice generated and posted successfully');
      setIsInvoiceModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invoice posting failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/sales/payments', values);
      toast.success('Payment received and auto-allocated successfully');
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment posting failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This will revert customer statement ledgers and stock reductions.')) return;
    try {
      await api.delete(`/sales/invoices/${id}`);
      toast.success('Invoice deleted successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm('Revert payment allocation? This will increase customer outstandings again.')) return;
    try {
      await api.delete(`/sales/payments/${id}`);
      toast.success('Payment reverted successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revert payment');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Compute form totals watch
  const watchedItems = invoiceForm.watch('items') || [];
  const formSubTotal = watchedItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const formTaxTotal = formSubTotal * 0.18; // Default 18% GST display
  const formGrandTotal = formSubTotal + formTaxTotal;

  return (
    <div className="space-y-6 text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-accent" />
            Sales Ledger & Invoicing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate compliant GST tax invoices, process customer cash/bank receipts, and view payment allocations.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'invoices' ? (
            <button
              onClick={() => { invoiceForm.reset(); setIsInvoiceModalOpen(true); }}
              className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Tax Invoice
            </button>
          ) : activeTab === 'payments' ? (
            <button
              onClick={() => { paymentForm.reset(); setIsPaymentModalOpen(true); }}
              className="bg-accent text-white hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Receive Payment
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveTab('invoices'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'invoices' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Sales Invoices
        </button>
        <button
          onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'payments' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Customer Payments
        </button>
      </div>

      {/* Search Input Filter */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border w-full max-w-md focus-within:border-accent transition-colors">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder={`Search ${activeTab}...`} 
          className="bg-transparent border-none outline-none w-full text-sm text-foreground placeholder:text-muted-foreground"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Main List Panels */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl border border-border h-32 animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'invoices' ? (
        invoices.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Invoices Issued</h3>
            <button onClick={() => { invoiceForm.reset(); setIsInvoiceModalOpen(true); }} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Issue First Invoice
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invoices.filter(i => i.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) || i.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())).map((inv) => (
              <div key={inv.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{inv.invoiceNo}</h3>
                      <p className="text-xs text-muted-foreground">Customer: <span className="font-semibold text-foreground">{inv.customer?.name}</span></p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      inv.status === 'PAID' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {inv.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                    <p>Total Invoice Value: <span className="text-foreground font-bold">{formatCurrency(Number(inv.grandTotal))}</span></p>
                    <p>Amount Paid: <span className="text-foreground font-semibold text-green-500">{formatCurrency(Number(inv.amountPaid || 0))}</span></p>
                    <p>Posting Date: <span className="text-foreground">{inv.date.split('T')[0]}</span></p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <PdfDownloadButton 
                    className="mr-auto"
                    filename={`${inv.invoiceNo}.pdf`}
                    data={{
                      company: {
                        name: 'Webzio Accounting Demo',
                        address: '123 Wall Street',
                        email: 'admin@webzio.com'
                      },
                      customer: {
                        name: inv.customer?.name || 'Unknown',
                        address: 'N/A'
                      },
                      document: {
                        title: 'Tax Invoice',
                        documentNo: inv.invoiceNo,
                        date: inv.date,
                        status: inv.status
                      },
                      items: inv.items?.map(i => ({
                        id: i.id,
                        description: i.description || 'Item',
                        qty: Number(i.qty),
                        rate: Number(i.rate),
                        taxPercent: Number(i.taxAmount) > 0 ? 10 : 0, // Mocked for now
                        taxAmount: Number(i.taxAmount),
                        total: Number(i.total)
                      })) || [],
                      totals: {
                        subTotal: Number(inv.grandTotal) - (inv.items?.reduce((acc, i) => acc + Number(i.taxAmount), 0) || 0),
                        taxTotal: inv.items?.reduce((acc, i) => acc + Number(i.taxAmount), 0) || 0,
                        grandTotal: Number(inv.grandTotal),
                        amountPaid: Number(inv.amountPaid || 0),
                        balance: Number(inv.grandTotal) - Number(inv.amountPaid || 0),
                        currency: 'USD'
                      }
                    }} 
                  />
                  <button onClick={() => handleDeleteInvoice(inv.id)} disabled={inv.status === 'PAID'} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Payments Tab
        payments.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Payments Received</h3>
            <button onClick={() => { paymentForm.reset(); setIsPaymentModalOpen(true); }} className="bg-accent text-white hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Post Payment Receipt
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payments.filter(p => p.paymentNo.toLowerCase().includes(searchQuery.toLowerCase()) || p.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())).map((pay) => (
              <div key={pay.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{pay.paymentNo}</h3>
                      <p className="text-xs text-muted-foreground">From: <span className="font-semibold text-foreground">{pay.customer?.name}</span></p>
                    </div>
                    <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                      {pay.method}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                    <p>Amount Received: <span className="text-green-500 font-bold text-sm">{formatCurrency(Number(pay.amount))}</span></p>
                    <p>Posting Date: <span className="text-foreground">{pay.date.split('T')[0]}</span></p>
                    {pay.reference && <p>Reference No: <span className="text-foreground">{pay.reference}</span></p>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <PdfDownloadButton 
                    className="mr-auto"
                    filename={`Receipt-${pay.paymentNo}.pdf`}
                    data={{
                      company: {
                        name: 'Webzio Accounting Demo',
                        address: '123 Wall Street',
                        email: 'admin@webzio.com'
                      },
                      customer: {
                        name: pay.customer?.name || 'Unknown',
                        address: 'N/A'
                      },
                      document: {
                        title: 'Payment Receipt',
                        documentNo: pay.paymentNo,
                        date: pay.date,
                        status: 'RECEIVED'
                      },
                      items: [{
                        id: '1',
                        description: `Payment via ${pay.method} ${pay.reference ? `(Ref: ${pay.reference})` : ''}`,
                        qty: 1,
                        rate: Number(pay.amount),
                        taxPercent: 0,
                        taxAmount: 0,
                        total: Number(pay.amount)
                      }],
                      totals: {
                        subTotal: Number(pay.amount),
                        taxTotal: 0,
                        grandTotal: Number(pay.amount),
                        amountPaid: Number(pay.amount),
                        balance: 0,
                        currency: 'USD'
                      },
                      watermark: 'PAID'
                    }} 
                  />
                  <button onClick={() => handleDeletePayment(pay.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Tax Invoice Generation Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsInvoiceModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-3xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35 shrink-0">
              <h2 className="font-bold text-lg text-foreground">Issue Tax Invoice</h2>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={invoiceForm.handleSubmit(handleInvoiceSubmit)} className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="col-span-3 md:col-span-1">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Select Customer *</label>
                  <select {...invoiceForm.register('customerId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Choose Customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Invoice Date *</label>
                  <input type="date" {...invoiceForm.register('date')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Due Date</label>
                  <input type="date" {...invoiceForm.register('dueDate')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
              </div>

              {/* Dynamic Items Array List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Line Items (Goods / Services)</label>
                  <button
                    type="button"
                    onClick={() => append({ productId: '', description: '', qty: 1, rate: 0 })}
                    className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-3 items-end bg-background bg-opacity-40 p-3 rounded-xl border border-border">
                      <div className="col-span-4">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Product *</label>
                        <select
                          {...invoiceForm.register(`items.${index}.productId` as const)}
                          onChange={(e) => handleInvoiceProductChange(index, e.target.value)}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        >
                          <option value="">Select...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Label description</label>
                        <input
                          type="text"
                          {...invoiceForm.register(`items.${index}.description` as const)}
                          placeholder="Line details"
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Qty *</label>
                        <input
                          type="number"
                          {...invoiceForm.register(`items.${index}.qty` as const, { valueAsNumber: true })}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Rate *</label>
                        <input
                          type="number"
                          {...invoiceForm.register(`items.${index}.rate` as const, { valueAsNumber: true })}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-30 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary Panel */}
              <div className="border-t border-border pt-4 flex flex-col items-end space-y-2 text-sm shrink-0">
                <div className="flex justify-between w-64 text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(formSubTotal)}</span>
                </div>
                <div className="flex justify-between w-64 text-muted-foreground">
                  <span>GST Taxes (18%):</span>
                  <span className="font-semibold text-foreground">{formatCurrency(formTaxTotal)}</span>
                </div>
                <div className="flex justify-between w-64 text-base font-bold border-t border-border pt-2">
                  <span className="text-foreground">Grand Total:</span>
                  <span className="text-accent">{formatCurrency(formGrandTotal)}</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-lg z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">Post Payment Receipt</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customer *</label>
                  <select {...paymentForm.register('customerId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Select customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Outstanding: {formatCurrency(Number(c.outstandingAmount))})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Receipt Bank Ledger *</label>
                  <select {...paymentForm.register('bankAccountId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Select ledger...</option>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name} (Balance: {formatCurrency(b.currentBalance)})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Posting Date *</label>
                  <input type="date" {...paymentForm.register('date')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Amount Received *</label>
                  <input type="number" {...paymentForm.register('amount', { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payment Mode *</label>
                  <select {...paymentForm.register('method')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reference No / UTR</label>
                  <input type="text" {...paymentForm.register('reference')} placeholder="e.g. UTR12345678" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Private Notes</label>
                  <textarea {...paymentForm.register('notes')} placeholder="Provide transaction memos..." rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Post Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
