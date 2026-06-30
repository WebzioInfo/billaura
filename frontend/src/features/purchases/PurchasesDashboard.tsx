import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  FileText, Search, Plus, Edit2, Trash2, Landmark, 
  Loader2, RefreshCw, AlertTriangle, Calendar, CreditCard, DollarSign, ShoppingCart, Download 
} from 'lucide-react';
import api from '../../services/api';
import { PdfDownloadButton } from '../../components/pdf/PdfDownloadButton';

// --- SCHEMAS ---
const vendorSchema = z.object({
  vendorCode: z.string().min(1, 'Vendor code is required'),
  name: z.string().min(2, 'Name is too short'),
  gstin: z.string().optional(),
  contactDetails: z.string().optional(),
});

const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  description: z.string().optional(),
  qty: z.number().min(1, 'Qty must be >= 1'),
  rate: z.number().min(0, 'Rate must be >= 0'),
});

const purchaseSchema = z.object({
  vendorId: z.string().min(1, 'Select a vendor'),
  date: z.string().nonempty('Select date'),
  dueDate: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one line item is required'),
});

const paymentSchema = z.object({
  vendorId: z.string().min(1, 'Select a vendor'),
  purchaseId: z.string().optional(),
  bankAccountId: z.string().min(1, 'Select a bank account'),
  date: z.string().nonempty('Select date'),
  amount: z.number().min(1, 'Amount must be >= 1'),
  method: z.string().min(1, 'Select payment method'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type VendorFormValues = z.infer<typeof vendorSchema>;
type PurchaseFormValues = z.infer<typeof purchaseSchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;

// --- TYPES ---
interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  gstin?: string;
  contactDetails?: string;
  payableBalance: number;
}

interface Product {
  id: string;
  name: string;
  purchasePrice: number;
}

interface BankAccount {
  id: string;
  name: string;
  currentBalance: number;
}

interface PurchaseItem {
  id: string;
  productId: string;
  description: string;
  qty: number;
  rate: number;
  taxAmount: number;
  total: number;
  product?: Product;
}

interface Purchase {
  id: string;
  purchaseNo: string;
  vendorId: string;
  date: string;
  grandTotal: number;
  amountPaid: number;
  status: string;
  vendor: Vendor;
  items: PurchaseItem[];
}

interface Payment {
  id: string;
  paymentNo: string;
  vendorId: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  vendor: Vendor;
}

export const PurchasesDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Derive active tab from URL path
  const path = location.pathname;
  let activeTab: 'vendors' | 'purchases' | 'payments' = 'purchases';
  if (path.includes('/vendors')) activeTab = 'vendors';
  if (path.includes('/vendor-payments')) activeTab = 'payments';
  
  const setActiveTab = (tab: string) => navigate(tab === 'payments' ? '/vendor-payments' : `/${tab}`);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data lists
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bankAccounts, setBankAccount] = useState<BankAccount[]>([]);

  // Modal controls
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Forms hooks
  const vendorForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { vendorCode: '', name: '', gstin: '', contactDetails: '' }
  });

  const purchaseForm = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      vendorId: '',
      date: new Date().toISOString().split('T')[0],
      items: [{ productId: '', description: '', qty: 1, rate: 0 }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: purchaseForm.control,
    name: 'items',
  });

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      vendorId: '',
      purchaseId: '',
      bankAccountId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      method: 'BANK_TRANSFER',
      reference: '',
    }
  });

  // Filter vendor purchases
  const selectedVendorId = paymentForm.watch('vendorId');
  const [vendorPurchases, setVendorPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    if (selectedVendorId) {
      const fetchVendorPurchases = async () => {
        try {
          const res = await api.get<{ success: boolean; data: { items: Purchase[] } }>('/purchases');
          const unpaid = (res.data?.items || []).filter(p => p.vendorId === selectedVendorId && p.status !== 'PAID');
          setVendorPurchases(unpaid);
        } catch (err) {
          // Silent fail
        }
      };
      fetchVendorPurchases();
    } else {
      setVendorPurchases([]);
    }
  }, [selectedVendorId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [vendRes, prodRes, bankRes] = await Promise.all([
        api.get<{ success: boolean; data: { items: Vendor[] } }>('/vendors'),
        api.get<{ success: boolean; data: { items: Product[] } }>('/products'),
        api.get<{ success: boolean; data: { items: BankAccount[] } }>('/bank-accounts'),
      ]);
      setVendors(vendRes.data?.items || []);
      setProducts(prodRes.data?.items || []);
      setBankAccount(bankRes.data?.items || []);

      if (activeTab === 'vendors') {
        const res = await api.get<{ success: boolean; data: { items: Vendor[] } }>('/vendors');
        setVendors(res.data?.items || []);
      } else if (activeTab === 'purchases') {
        const res = await api.get<{ success: boolean; data: { items: Purchase[] } }>('/purchases');
        setPurchases(res.data?.items || []);
      } else if (activeTab === 'payments') {
        const res = await api.get<{ success: boolean; data: { items: Payment[] } }>('/purchases/payments');
        setPayments(res.data?.items || []);
      }
    } catch (err) {
      toast.error('Failed to load purchases data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleOpenAddVendorModal = () => {
    setEditingId(null);
    vendorForm.reset();
    setIsVendorModalOpen(true);
  };

  const handleOpenEditVendorModal = (item: Vendor) => {
    setEditingId(item.id);
    vendorForm.reset({
      vendorCode: item.vendorCode,
      name: item.name,
      gstin: item.gstin || '',
      contactDetails: item.contactDetails || '',
    });
    setIsVendorModalOpen(true);
  };

  const handleVendorSubmit = async (values: VendorFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/vendors/${editingId}`, values);
        toast.success('Vendor updated successfully');
      } else {
        await api.post('/vendors', values);
        toast.success('Vendor registered successfully');
      }
      setIsVendorModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await api.delete(`/vendors/${id}`);
      toast.success('Vendor deleted successfully');
      fetchData();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const handlePurchaseProductChange = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      purchaseForm.setValue(`items.${index}.rate`, Number(prod.purchasePrice));
      purchaseForm.setValue(`items.${index}.description`, prod.name);
    }
  };

  const handlePurchaseSubmit = async (values: PurchaseFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/purchases', values);
      toast.success('Purchase bill posted and stock items updated successfully');
      setIsPurchaseModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Purchase posting failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/purchases/payments', values);
      toast.success('Vendor payout recorded successfully');
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payout failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePurchase = async (id: string) => {
    if (!window.confirm('Delete this purchase bill? Stock levels and vendor payable balances will be reverted.')) return;
    try {
      await api.delete(`/purchases/${id}`);
      toast.success('Purchase bill removed');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Deletion failed');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm('Revert this payout transaction?')) return;
    try {
      await api.delete(`/purchases/payments/${id}`);
      toast.success('Payout deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reversion failed');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const watchedItems = purchaseForm.watch('items') || [];
  const formSubTotal = watchedItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const formTaxTotal = formSubTotal * 0.18; // 18% GST display
  const formGrandTotal = formSubTotal + formTaxTotal;

  const totalPayable = vendors.reduce((sum, v) => sum + Number(v.payableBalance || 0), 0);

  return (
    <div className="space-y-6 text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-accent" />
            {activeTab === 'vendors' ? 'Vendor Catalog & Registry' : 'Procurement & Purchase Bills'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === 'vendors'
              ? 'Manage supplier information, credit accounts, payable balances, and tax profiles.'
              : 'Log vendor purchases, receive inventory stock points, and track outgoing cash/bank payments.'}
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'vendors' ? (
            <button
              onClick={handleOpenAddVendorModal}
              className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register Vendor
            </button>
          ) : activeTab === 'purchases' ? (
            <button
              onClick={() => { purchaseForm.reset(); setIsPurchaseModalOpen(true); }}
              className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Purchase Bill
            </button>
          ) : activeTab === 'payments' ? (
            <button
              onClick={() => { paymentForm.reset(); setIsPaymentModalOpen(true); }}
              className="bg-accent text-white hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Vendor Payout
            </button>
          ) : null}
        </div>
      </div>

      {/* KPI Cards Row */}
      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-border flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Total Payables</span>
              <h3 className="text-2xl font-black text-foreground">{formatCurrency(totalPayable)}</h3>
            </div>
            <div className="p-3 bg-accent/10 text-accent rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-border flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Active Vendors</span>
              <h3 className="text-2xl font-black text-foreground">{vendors.length}</h3>
            </div>
            <div className="p-3 bg-accent/10 text-accent rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}
 
      {/* Tabs Row */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveTab('vendors'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'vendors' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Vendor Directory
        </button>
        <button
          onClick={() => { setActiveTab('purchases'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'purchases' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Purchase Bills
        </button>
        <button
          onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'payments' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Vendor Payouts
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
      ) : activeTab === 'vendors' ? (
        vendors.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Vendors Registered</h3>
            <button onClick={handleOpenAddVendorModal} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Register First Vendor
            </button>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border shadow-premium overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="py-4 px-6">Vendor Code</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">GSTIN</th>
                  <th className="py-4 px-6">Contact details</th>
                  <th className="py-4 px-6 text-right">Payable Balance</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.vendorCode.toLowerCase().includes(searchQuery.toLowerCase())).map((v) => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-background/20 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground">{v.vendorCode}</td>
                    <td className="py-4 px-6 font-medium text-foreground">{v.name}</td>
                    <td className="py-4 px-6 text-xs text-foreground font-mono">{v.gstin || '-'}</td>
                    <td className="py-4 px-6 text-xs text-foreground">{v.contactDetails || '-'}</td>
                    <td className="py-4 px-6 text-right font-bold text-foreground">
                      {formatCurrency(Number(v.payableBalance || 0))}
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5">
                      <button onClick={() => handleOpenEditVendorModal(v)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer inline-flex">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteVendor(v.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer inline-flex">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'purchases' ? (
        purchases.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Purchase Bills Recorded</h3>
            <button onClick={() => { purchaseForm.reset(); setIsPurchaseModalOpen(true); }} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Log Purchase Bill
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.filter(p => p.purchaseNo.toLowerCase().includes(searchQuery.toLowerCase()) || p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())).map((pur) => (
              <div key={pur.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{pur.purchaseNo}</h3>
                      <p className="text-xs text-muted-foreground">Supplier: <span className="font-semibold text-foreground">{pur.vendor?.name}</span></p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      pur.status === 'PAID' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {pur.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                    <p>Total Bill Value: <span className="text-foreground font-bold">{formatCurrency(Number(pur.grandTotal))}</span></p>
                    <p>Amount Paid: <span className="text-foreground font-semibold text-green-500">{formatCurrency(Number(pur.amountPaid || 0))}</span></p>
                    <p>Posting Date: <span className="text-foreground">{pur.date.split('T')[0]}</span></p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <PdfDownloadButton 
                    className="mr-auto"
                    filename={`PurchaseBill-${pur.purchaseNo}.pdf`}
                    data={{
                      company: {
                        name: 'Webzio Accounting Demo',
                        address: '123 Wall Street',
                        email: 'admin@webzio.com'
                      },
                      customer: {
                        name: pur.vendor?.name || 'Unknown Vendor',
                        address: 'N/A'
                      },
                      document: {
                        title: 'Purchase Bill',
                        documentNo: pur.purchaseNo,
                        date: pur.date,
                        status: pur.status
                      },
                      items: pur.items?.map(i => ({
                        id: i.id,
                        description: i.description || 'Item',
                        qty: Number(i.qty),
                        rate: Number(i.rate),
                        taxPercent: Number(i.taxAmount) > 0 ? 10 : 0, 
                        taxAmount: Number(i.taxAmount),
                        total: Number(i.total)
                      })) || [],
                      totals: {
                        subTotal: Number(pur.grandTotal) - (pur.items?.reduce((acc, i) => acc + Number(i.taxAmount), 0) || 0),
                        taxTotal: pur.items?.reduce((acc, i) => acc + Number(i.taxAmount), 0) || 0,
                        grandTotal: Number(pur.grandTotal),
                        amountPaid: Number(pur.amountPaid || 0),
                        balance: Number(pur.grandTotal) - Number(pur.amountPaid || 0),
                        currency: 'USD'
                      }
                    }} 
                  />
                  <button onClick={() => handleDeletePurchase(pur.id)} disabled={pur.status === 'PAID'} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Payouts Tab
        payments.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Vendor Payouts Recorded</h3>
            <button onClick={() => { paymentForm.reset(); setIsPaymentModalOpen(true); }} className="bg-accent text-white hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Record Payout
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payments.filter(p => p.paymentNo.toLowerCase().includes(searchQuery.toLowerCase()) || p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())).map((pay) => (
              <div key={pay.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{pay.paymentNo}</h3>
                      <p className="text-xs text-muted-foreground">To Supplier: <span className="font-semibold text-foreground">{pay.vendor?.name}</span></p>
                    </div>
                    <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                      {pay.method}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                    <p>Amount Paid: <span className="text-red-500 font-bold text-sm">{formatCurrency(Number(pay.amount))}</span></p>
                    <p>Posting Date: <span className="text-foreground">{pay.date.split('T')[0]}</span></p>
                    {pay.reference && <p>UTR Reference: <span className="text-foreground">{pay.reference}</span></p>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <PdfDownloadButton 
                    className="mr-auto"
                    filename={`Payout-${pay.paymentNo}.pdf`}
                    data={{
                      company: {
                        name: 'Webzio Accounting Demo',
                        address: '123 Wall Street',
                        email: 'admin@webzio.com'
                      },
                      customer: {
                        name: pay.vendor?.name || 'Unknown',
                        address: 'N/A'
                      },
                      document: {
                        title: 'Vendor Payout Voucher',
                        documentNo: pay.paymentNo,
                        date: pay.date,
                        status: 'PAID'
                      },
                      items: [{
                        id: '1',
                        description: `Payout via ${pay.method} ${pay.reference ? `(Ref: ${pay.reference})` : ''}`,
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
                      watermark: 'PAID OUT'
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

      {/* Log Purchase Bill Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPurchaseModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-3xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35 shrink-0">
              <h2 className="font-bold text-lg text-foreground">Log Purchase Bill</h2>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={purchaseForm.handleSubmit(handlePurchaseSubmit)} className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
              <div className="grid grid-cols-2 gap-4 shrink-0">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Select Supplier *</label>
                  <select {...purchaseForm.register('vendorId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Choose Supplier...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Billing Date *</label>
                  <input type="date" {...purchaseForm.register('date')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
              </div>

              {/* Dynamic Items Array List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Line Items (Goods Received)</label>
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
                          {...purchaseForm.register(`items.${index}.productId` as const)}
                          onChange={(e) => handlePurchaseProductChange(index, e.target.value)}
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
                          {...purchaseForm.register(`items.${index}.description` as const)}
                          placeholder="Item details"
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Qty *</label>
                        <input
                          type="number"
                          {...purchaseForm.register(`items.${index}.qty` as const, { valueAsNumber: true })}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Rate *</label>
                        <input
                          type="number"
                          {...purchaseForm.register(`items.${index}.rate` as const, { valueAsNumber: true })}
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
                <button type="button" onClick={() => setIsPurchaseModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Post Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Payout Receipt Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-lg z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">Post Vendor Payout</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Supplier *</label>
                  <select {...paymentForm.register('vendorId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Select supplier...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} (Payable: {formatCurrency(Number(v.payableBalance))})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Select Purchase Invoice Bill *</label>
                  <select {...paymentForm.register('purchaseId')} disabled={!selectedVendorId} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:opacity-40 font-mono">
                    <option value="">Select invoice bill...</option>
                    {vendorPurchases.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.purchaseNo} (Total: {formatCurrency(Number(p.grandTotal))}, Due: {formatCurrency(Number(p.grandTotal) - Number(p.amountPaid))})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payout Bank Ledger *</label>
                  <select {...paymentForm.register('bankAccountId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Select ledger...</option>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name} (Balance: {formatCurrency(b.currentBalance)})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payout Date *</label>
                  <input type="date" {...paymentForm.register('date')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Amount Paid *</label>
                  <input type="number" {...paymentForm.register('amount', { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payout Mode *</label>
                  <select {...paymentForm.register('method')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CASH">Cash Payment</option>
                    <option value="UPI">UPI Payout</option>
                    <option value="CHEQUE">Cheque Issued</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Transaction Ref / UTR</label>
                  <input type="text" {...paymentForm.register('reference')} placeholder="e.g. UTR998877" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Registration Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsVendorModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-md z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">
                {editingId ? 'Modify Vendor Details' : 'Register New Vendor'}
              </h2>
              <button onClick={() => setIsVendorModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={vendorForm.handleSubmit(handleVendorSubmit)} className="p-6 space-y-4 text-left">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Vendor Code *</label>
                  <input type="text" {...vendorForm.register('vendorCode')} placeholder="e.g. VEND-001" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono" />
                  {vendorForm.formState.errors.vendorCode && <p className="text-xs text-red-500 mt-1">{vendorForm.formState.errors.vendorCode.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Vendor / Supplier Name *</label>
                  <input type="text" {...vendorForm.register('name')} placeholder="e.g. Global Distributors" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  {vendorForm.formState.errors.name && <p className="text-xs text-red-500 mt-1">{vendorForm.formState.errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">GSTIN</label>
                  <input type="text" {...vendorForm.register('gstin')} placeholder="e.g. 27BBBBB2222B2Z2" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Contact Details</label>
                  <textarea {...vendorForm.register('contactDetails')} placeholder="Email, Mobile, or Address memo..." rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <button type="button" onClick={() => setIsVendorModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
