import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Search, Plus, Edit2, Trash2,
  Loader2, DollarSign, ShoppingCart
} from 'lucide-react';
import api from '../../services/api';
import { PdfDownloadButton } from '../../components/pdf/PdfDownloadButton';
import { DataTable, DataTableColumnHeader, FilterPanel } from '../../components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LedgerSearchSelect } from '../../components/ui/LedgerSearchSelect';
import { DeleteDialog, ConfirmDialog, AsyncSelect, PageContainer, TableLoader } from '../../components/ui';
import { useApiList } from '../../hooks/useApiList';
import { useBankAccounts } from '../../hooks/useBankAccounts';

// --- SCHEMAS ---
const vendorSchema = z.object({
  vendorCode: z.string().min(1, 'Vendor code is required'),
  name: z.string().min(2, 'Name is too short'),
  gstin: z.string().optional(),
  contactDetails: z.string().optional(),
  customerType: z.enum(['REGISTERED', 'UNREGISTERED', 'COMPOSITION', 'SEZ', 'EXPORT']),
  creditLimit: z.number().optional(),
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
  bankAccountId: z.string().optional(),
  date: z.string().nonempty('Select date'),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  method: z.string().min(1, 'Select payment method'),
  reference: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.method !== 'CASH' && !values.bankAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bankAccountId'],
      message: 'Select a bank account',
    });
  }
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
  customerType?: 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'SEZ' | 'EXPORT';
  creditLimit?: number;
}

interface Product {
  id: string;
  name: string;
  purchasePrice: number;
}

interface BankAccount {
  id: string;
  name: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  accountType?: string;
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

interface PaymentAllocation {
  id: string;
  transactionPaymentId: string;
  amount: number;
  purchase?: {
    id: string;
    purchaseNo: string;
  };
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
  allocations?: PaymentAllocation[];
}

export const PurchasesDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from URL path
  const path = location.pathname;
  let activeTab: 'purchases' | 'payments' = 'purchases';
  if (path.includes('/vendor-payments')) activeTab = 'payments';

  const setActiveTab = (tab: string) => navigate(tab === 'payments' ? '/vendor-payments' : `/${tab}`);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter States
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState('');
  const [purchaseStartDateFilter, setPurchaseStartDateFilter] = useState('');
  const [purchaseEndDateFilter, setPurchaseEndDateFilter] = useState('');

  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [paymentStartDateFilter, setPaymentStartDateFilter] = useState('');
  const [paymentEndDateFilter, setPaymentEndDateFilter] = useState('');

  const { data: purchases = [], isLoading: isLoadingPurchases } = useApiList<Purchase>(['purchases'], '/purchases');
  const { data: payments = [], isLoading: isLoadingPayments } = useApiList<Payment>(['payments'], '/purchases/payments');

  // Client-side filtering logic
  const filteredPurchases = purchases.filter(p => {
    // Search
    if (searchQuery &&
      !p.purchaseNo.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Status
    if (purchaseStatusFilter && p.status !== purchaseStatusFilter) {
      return false;
    }
    // Date
    if (purchaseStartDateFilter && p.date.split('T')[0] < purchaseStartDateFilter) return false;
    if (purchaseEndDateFilter && p.date.split('T')[0] > purchaseEndDateFilter) return false;
    return true;
  });

  const filteredPayments = payments.filter(p => {
    // Search
    if (searchQuery &&
      !p.paymentNo.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Method
    if (paymentMethodFilter && p.method !== paymentMethodFilter) {
      return false;
    }
    // Date
    if (paymentStartDateFilter && p.date.split('T')[0] < paymentStartDateFilter) return false;
    if (paymentEndDateFilter && p.date.split('T')[0] > paymentEndDateFilter) return false;
    return true;
  });
  const { data: vendors = [], isLoading: isLoadingVendors } = useApiList<Vendor>(['vendors'], '/vendors');
  const { data: products = [], isLoading: isLoadingProducts } = useApiList<Product>(['products'], '/products');
  const { bankAccounts, hasBankAccounts, isLoading: isLoadingBankAccounts } = useBankAccounts();
  const maskAccountNumber = (accountNumber?: string) => accountNumber ? `XXXX${accountNumber.slice(-4)}` : 'Account number not set';

  const isLoading = isLoadingPurchases || isLoadingPayments || isLoadingVendors || isLoadingProducts || isLoadingBankAccounts;
  const queryClient = useQueryClient();

  // Modal controls
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [paymentToRevert, setPaymentToRevert] = useState<Payment | null>(null);

  const { data: meData } = useQuery<any>({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get('/auth/me'),
    staleTime: 5 * 60 * 1000,
  });
  const companyProfile = meData?.company || meData?.data?.company || { name: 'Your Company', address: 'N/A', email: 'N/A' };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // DataTable columns for Purchases
  const purchaseColumns: ColumnDef<Purchase>[] = [
    {
      accessorKey: 'purchaseNo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bill No" />,
      cell: ({ row }) => <span className="font-mono font-medium">{row.getValue('purchaseNo')}</span>,
    },
    {
      accessorKey: 'vendor.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="font-semibold">{row.original.vendor?.name}</span>,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span>{(row.getValue('date') as string).split('T')[0]}</span>,
    },
    {
      accessorKey: 'grandTotal',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Value" />,
      cell: ({ row }) => <span className="font-bold">{formatCurrency(Number(row.getValue('grandTotal')))}</span>,
    },
    {
      accessorKey: 'amountPaid',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount Paid" />,
      cell: ({ row }) => <span className="font-semibold text-green-500">{formatCurrency(Number(row.getValue('amountPaid')))}</span>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.getValue('status') === 'PAID' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
          }`}>
          {row.getValue('status')}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <PdfDownloadButton
              className="p-1.5"
              filename={`Bill-${p.purchaseNo}.pdf`}
              data={{
                company: { name: companyProfile.name || 'Your Company', address: companyProfile.address || 'N/A', email: companyProfile.email || 'N/A' },
                customer: { name: p.vendor?.name || 'Unknown', address: 'N/A' },
                document: { title: 'Purchase Bill', documentNo: p.purchaseNo, date: p.date, status: p.status },
                items: p.items?.map(i => ({
                  id: i.id, description: i.description || 'Item', qty: Number(i.qty), rate: Number(i.rate),
                  taxPercent: Number(i.taxAmount) > 0 ? 10 : 0, taxAmount: Number(i.taxAmount), total: Number(i.total)
                })) || [],
                totals: {
                  subTotal: Number(p.grandTotal) - (p.items?.reduce((acc, i) => acc + Number(i.taxAmount), 0) || 0),
                  taxTotal: p.items?.reduce((acc, i) => acc + Number(i.taxAmount), 0) || 0,
                  grandTotal: Number(p.grandTotal), amountPaid: Number(p.amountPaid || 0),
                  balance: Number(p.grandTotal) - Number(p.amountPaid || 0), currency: 'USD'
                }
              }}
            />
            <button onClick={() => setPurchaseToDelete(p)} disabled={p.status === 'PAID'} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:border-red-500/40 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        );
      },
    },
  ];

  // DataTable columns for Payments
  const paymentColumns: ColumnDef<Payment>[] = [
    {
      accessorKey: 'paymentNo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Payment No" />,
      cell: ({ row }) => <span className="font-mono font-semibold">{row.getValue('paymentNo')}</span>,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span>{(row.getValue('date') as string).split('T')[0]}</span>,
    },
    {
      accessorKey: 'vendor.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.vendor?.name}</span>,
    },
    {
      id: 'invoice',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
      cell: ({ row }) => {
        const allocations = row.original.allocations || [];
        if (allocations.length === 0) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {allocations.map(a => (
              <span key={a.id} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/40">
                {a.purchase?.purchaseNo || 'N/A'}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => <span className="font-bold text-red-600">{formatCurrency(Number(row.getValue('amount')))}</span>,
    },
    {
      accessorKey: 'method',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Mode" />,
      cell: ({ row }) => {
        const mode = row.getValue('method') as string;
        const colorClass = mode === 'CASH' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        return (
          <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold uppercase ${colorClass}`}>
            {mode.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: () => (
        <span className="bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
          SUCCESS
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const pay = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <PdfDownloadButton
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-background border border-border/40 rounded transition-colors"
              filename={`Payment-${pay.paymentNo}.pdf`}
              data={{
                company: { name: companyProfile.name || 'Your Company', address: companyProfile.address || 'N/A', email: companyProfile.email || 'N/A' },
                customer: { name: pay.vendor?.name || 'Unknown', address: 'N/A' },
                document: { title: 'Payment Voucher', documentNo: pay.paymentNo, date: pay.date, status: 'PAID' },
                items: [{
                  id: '1', description: `Payment to vendor via ${pay.method} ${pay.reference ? `(Ref: ${pay.reference})` : ''}`,
                  qty: 1, rate: Number(pay.amount), taxPercent: 0, taxAmount: 0, total: Number(pay.amount)
                }],
                totals: {
                  subTotal: Number(pay.amount), taxTotal: 0, grandTotal: Number(pay.amount),
                  amountPaid: Number(pay.amount), balance: 0, currency: 'USD'
                },
                watermark: 'PAID'
              }}
            />
            <button onClick={() => setPaymentToRevert(pay)} title="Revert Payment" className="p-1 border border-border/40 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  // Forms hooks
  const vendorForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { vendorCode: '', name: '', gstin: '', contactDetails: '', customerType: 'UNREGISTERED', creditLimit: 0 }
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
    mode: 'onChange',
    defaultValues: {
      vendorId: '',
      bankAccountId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      method: 'BANK_TRANSFER',
      reference: '',
    }
  });

  const paymentMethod = paymentForm.watch('method');
  const requiresBankAccount = paymentMethod !== 'CASH';

  useEffect(() => {
    if (paymentMethod === 'CASH') {
      paymentForm.setValue('bankAccountId', '', { shouldValidate: true });
    }
  }, [paymentMethod, paymentForm]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: [activeTab] });
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
      customerType: item.customerType || 'UNREGISTERED',
      creditLimit: Number(item.creditLimit || 0),
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
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors_lookup'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteVendor = async () => {
    if (!vendorToDelete) return;
    try {
      await api.delete(`/vendors/${vendorToDelete.id}`);
      toast.success('Vendor deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    } catch { toast.error('Deletion failed'); } finally { setVendorToDelete(null); }
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
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
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
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 400) {
        toast.error(message || 'Complete all required payout fields.');
      } else if (status === 404) {
        toast.error(message || 'Selected supplier or bank account was not found.');
      } else if (status === 409) {
        toast.error(message || 'Payout cannot be recorded until financial setup is complete.');
      } else if (status >= 500) {
        toast.error('Unexpected server error while recording payout.');
      } else {
        toast.error(message || 'Payout failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeletePurchase = async () => {
    if (!purchaseToDelete) return;
    try {
      await api.delete(`/purchases/${purchaseToDelete.id}`);
      toast.success('Purchase bill removed');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Deletion failed'); } finally { setPurchaseToDelete(null); }
  };

  const confirmRevertPayment = async () => {
    if (!paymentToRevert) return;
    try {
      await api.delete(`/purchases/payments/${paymentToRevert.id}`);
      toast.success('Payout deleted');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Reversion failed'); } finally { setPaymentToRevert(null); }
  };


  const watchedItems = purchaseForm.watch('items') || [];
  const formSubTotal = watchedItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const formTaxTotal = formSubTotal * 0.18; // 18% GST display
  const formGrandTotal = formSubTotal + formTaxTotal;

  const totalPayable = vendors.reduce((sum, v) => sum + Number(v.payableBalance || 0), 0);

  return (
    <>
      <PageContainer maxWidth="7xl" className="px-6 py-6 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-accent" />
              Procurement & Purchase Bills
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Log vendor purchases, receive inventory stock points, and track outgoing cash/bank payments.
            </p>
          </div>
          <div className="flex gap-2 mt-3 sm:mt-0">
            {activeTab === 'purchases' ? (
              <button
                onClick={() => { purchaseForm.reset(); setIsPurchaseModalOpen(true); }}
                className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Log Purchase Bill
              </button>
            ) : activeTab === 'payments' ? (
              <button
                onClick={() => { paymentForm.reset(); setIsPaymentModalOpen(true); }}
                className="bg-accent text-white hover:bg-opacity-90 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Log Vendor Payout
              </button>
            ) : null}
          </div>
        </div>

        {/* Tabs Row */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => { setActiveTab('purchases'); setSearchQuery(''); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-all cursor-pointer ${activeTab === 'purchases' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            Purchase Bills
          </button>
          <button
            onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-all cursor-pointer ${activeTab === 'payments' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            Vendor Payments
          </button>
        </div>

        {/* Content Area */}
        <div className="space-y-8 w-full">
          {/* Main List Panels */}
          {isLoading ? (
            <TableLoader cols={6} rows={6} className="bg-surface border border-border rounded-xl" />
          ) : activeTab === 'purchases' ? (
            purchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 w-full px-4">
                <div className="bg-surface border border-border rounded-xl shadow-sm p-8 w-full max-w-[460px] text-center flex flex-col items-center gap-4 transition-all">
                  <div className="p-3.5 bg-muted/40 text-muted-foreground rounded-full">
                    <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-base text-foreground">No Purchase Bills Recorded</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      There are no purchase bills recorded yet. Create one to begin logging vendor purchases and tracking stock inventory.
                    </p>
                  </div>
                  <button
                    onClick={() => { purchaseForm.reset(); setIsPurchaseModalOpen(true); }}
                    className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Log Purchase Bill
                  </button>
                </div>
              </div>
            ) : (
              <div className="col-span-full bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
                {/* Integrated Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-surface border-b border-border/60">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background border border-border w-full max-w-xs focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by bill no, vendor..."
                      className="bg-transparent border-none outline-none w-full text-xs text-foreground placeholder:text-muted-foreground"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <select
                    value={purchaseStatusFilter}
                    onChange={(e) => setPurchaseStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-background border border-border rounded-md text-xs text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  >
                    <option value="">All Statuses</option>
                    <option value="PAID">PAID</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="SENT">SENT</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={purchaseStartDateFilter}
                      onChange={(e) => setPurchaseStartDateFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="date"
                      value={purchaseEndDateFilter}
                      onChange={(e) => setPurchaseEndDateFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                  </div>

                  {(searchQuery || purchaseStatusFilter || purchaseStartDateFilter || purchaseEndDateFilter) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setPurchaseStatusFilter('');
                        setPurchaseStartDateFilter('');
                        setPurchaseEndDateFilter('');
                      }}
                      className="text-xs text-accent hover:underline font-semibold cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <DataTable columns={purchaseColumns} data={filteredPurchases} exportFilename="purchases_export" />
                </div>
              </div>
            )
          ) : (
            // Payouts Tab
            payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 w-full px-4">
                <div className="bg-surface border border-border rounded-xl shadow-sm p-8 w-full max-w-[460px] text-center flex flex-col items-center gap-4 transition-all">
                  <div className="p-3.5 bg-muted/40 text-muted-foreground rounded-full">
                    <span className="text-3xl">DOC</span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-base text-foreground">No Vendor Payouts Recorded</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      Record your first vendor payment to begin tracking payments.
                    </p>
                  </div>
                  <button
                    onClick={() => { paymentForm.reset(); setIsPaymentModalOpen(true); }}
                    className="bg-accent text-white hover:bg-opacity-90 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Record Vendor Payout
                  </button>
                </div>
              </div>
            ) : (
              <div className="col-span-full bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
                {/* Integrated Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-surface border-b border-border/60">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background border border-border w-full max-w-xs focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by payment no, vendor..."
                      className="bg-transparent border-none outline-none w-full text-xs text-foreground placeholder:text-muted-foreground"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-background border border-border rounded-md text-xs text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  >
                    <option value="">All Payment Modes</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={paymentStartDateFilter}
                      onChange={(e) => setPaymentStartDateFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="date"
                      value={paymentEndDateFilter}
                      onChange={(e) => setPaymentEndDateFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                  </div>

                  {(searchQuery || paymentMethodFilter || paymentStartDateFilter || paymentEndDateFilter) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setPaymentMethodFilter('');
                        setPaymentStartDateFilter('');
                        setPaymentEndDateFilter('');
                      }}
                      className="text-xs text-accent hover:underline font-semibold cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <DataTable columns={paymentColumns} data={filteredPayments} exportFilename="vendor_payouts_export" />
                </div>
              </div>
            )
          )}
        </div>
        {/* Log Purchase Bill Modal */}
        {isPurchaseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPurchaseModalOpen(false)} />

            <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-3xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35 shrink-0">
                <h2 className="font-bold text-lg text-foreground">Log Purchase Bill</h2>
                <button onClick={() => setIsPurchaseModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">x</button>
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
                            x
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
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">x</button>
              </div>

              <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <AsyncSelect
                      label="Supplier *"
                      apiPath="/vendors"
                      queryKeyPrefix="vendors_lookup"
                      placeholder="Search suppliers..."
                      value={paymentForm.watch('vendorId')}
                      onChange={(val) => {
                        paymentForm.setValue('vendorId', val, { shouldValidate: true });
                      }}
                      mapOption={(v: any) => ({ label: v.name, value: v.id, description: `Payable: ${formatCurrency(Number(v.payableBalance))}` })}
                      error={paymentForm.formState.errors.vendorId?.message}
                    />
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
                      <option value="BANK_TRANSFER">Bank Transfer</option>

                      <option value="UPI">UPI Payout</option>
                      <option value="CHEQUE">Cheque Issued</option>
                      <option value="CASH">Cash Payment</option>
                    </select>
                  </div>
                  {requiresBankAccount && (
                    <div className="col-span-2">
                      {hasBankAccounts ? (
                        <AsyncSelect
                          label="Bank Account *"
                          apiPath="/bank-accounts"
                          queryKeyPrefix="bank_accounts_lookup"
                          placeholder="Search bank accounts..."
                          value={paymentForm.watch('bankAccountId') || ''}
                          onChange={(val) => {
                            paymentForm.setValue('bankAccountId', val, { shouldValidate: true });
                          }}
                          mapOption={(account: BankAccount) => {
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
                          error={paymentForm.formState.errors.bankAccountId?.message}
                        />
                      ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                          <p className="font-semibold">No Bank Accounts Configured</p>
                          <p className="mt-1 text-xs">Create a Bank or Cash Account before recording vendor payments.</p>
                          <button
                            type="button"
                            onClick={() => navigate('/chart-of-accounts')}
                            className="mt-2 text-xs font-semibold text-amber-900 underline underline-offset-2"
                          >
                            Go to Chart of Accounts
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Transaction Ref / UTR</label>
                    <input type="text" {...paymentForm.register('reference')} placeholder="e.g. UTR998877" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting || !paymentForm.formState.isValid || (requiresBankAccount && !hasBankAccounts)} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
                <button onClick={() => setIsVendorModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">x</button>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Vendor Type</label>
                      <select {...vendorForm.register('customerType')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="UNREGISTERED">Unregistered / Consumer</option>
                        <option value="REGISTERED">Regular / Registered</option>
                        <option value="COMPOSITION">Composition Dealer</option>
                        <option value="SEZ">SEZ (Special Economic Zone)</option>
                        <option value="EXPORT">Overseas / Import</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Credit Limit</label>
                      <input type="number" {...vendorForm.register('creditLimit', { valueAsNumber: true })} placeholder="e.g. 100000" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Contact Details</label>
                    <textarea {...vendorForm.register('contactDetails')} placeholder="Email, Mobile, or Address memo..." rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsVendorModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Vendor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageContainer>

      <DeleteDialog isOpen={!!vendorToDelete} onClose={() => setVendorToDelete(null)} onConfirm={confirmDeleteVendor} entityName="Vendor" entityId={vendorToDelete?.name} warningText="This action cannot be undone." />
      <DeleteDialog isOpen={!!purchaseToDelete} onClose={() => setPurchaseToDelete(null)} onConfirm={confirmDeletePurchase} entityName="Purchase Bill" entityId={purchaseToDelete?.purchaseNo} warningText="Stock levels and vendor payable balances will be reverted. This action cannot be undone." />
      <ConfirmDialog isOpen={!!paymentToRevert} onClose={() => setPaymentToRevert(null)} onConfirm={confirmRevertPayment} title="Revert Vendor Payout" message={<span>Are you sure you want to revert payout <strong>{paymentToRevert?.paymentNo}</strong>?</span>} confirmText="Revert" variant="danger" />
    </>
  );
};
