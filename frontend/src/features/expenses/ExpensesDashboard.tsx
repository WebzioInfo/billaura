import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  Receipt, Search, Plus, Trash2, Loader2, RefreshCw, 
  Calendar, CreditCard, DollarSign, Wallet, FileText, ArrowRightLeft 
} from 'lucide-react';
import api from '../../services/api';

// --- SCHEMAS ---
const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Select a category'),
  bankAccountId: z.string().optional(),
  date: z.string().nonempty('Select date'),
  amount: z.number().min(1, 'Amount must be >= 1'),
  taxAmount: z.number(),
  paymentMethod: z.string().optional(),
  billNumber: z.string().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

// --- TYPES ---
interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

interface BankAccount {
  id: string;
  name: string;
  currentBalance: number;
}

interface Expense {
  id: string;
  expenseNo: string;
  categoryId: string;
  bankAccountId?: string;
  billNumber?: string;
  date: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  status: string;
  reference?: string;
  description?: string;
  notes?: string;
  category: ExpenseCategory;
  bankAccount?: BankAccount;
}

export const ExpensesDashboard = () => {
  const [activeTab, setActiveTab] = useState<'claims' | 'categories'>('claims');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data lists
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Forms hooks
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      categoryId: '',
      bankAccountId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      taxAmount: 0,
      paymentMethod: 'BANK_TRANSFER',
      billNumber: '',
      reference: '',
      description: '',
      notes: '',
    }
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Load categories and bank accounts for dropdowns
      const [catRes, bankRes] = await Promise.all([
        api.get<any>('/expenses/categories'),
        api.get<any>('/bank-accounts'),
      ]);
      setCategories(catRes || []);
      setBankAccounts(bankRes?.items || []);

      if (activeTab === 'claims') {
        const res = await api.get<any>('/expenses');
        setExpenses(res.items || []);
      }
    } catch (err) {
      toast.error('Failed to load expenses data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSubmit = async (values: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/expenses', values);
      toast.success('Expense logged and posted to General Ledger');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Posting failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense claim? Paid amount balances will be reverted.')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense claim removed');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Deletion failed');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 text-left p-6 max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-accent" />
            Expense Claims & Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Log overhead operations costs, approve employee reimbursements, and auto-sync ledger balances.
          </p>
        </div>
        <div>
          {activeTab === 'claims' && (
            <button
              onClick={() => { form.reset(); setIsModalOpen(true); }}
              className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              File Expense Claim
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'claims' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Expense Claims
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'categories' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Expense Categories
        </button>
      </div>

      {/* Search Input Filter */}
      {activeTab === 'claims' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border w-full max-w-md focus-within:border-accent transition-colors">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search claims..." 
            className="bg-transparent border-none outline-none w-full text-sm text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Main List Panels */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl border border-border h-32 animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'claims' ? (
        expenses.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Expense Claims Lodged</h3>
            <button onClick={() => { form.reset(); setIsModalOpen(true); }} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              File First Claim
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expenses.filter(e => e.expenseNo.toLowerCase().includes(searchQuery.toLowerCase()) || (e.description || '').toLowerCase().includes(searchQuery.toLowerCase())).map((exp) => (
              <div key={exp.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{exp.expenseNo}</h3>
                      <p className="text-xs text-muted-foreground">Category: <span className="font-semibold text-foreground">{exp.category?.name}</span></p>
                    </div>
                    <span className="bg-green-500/10 text-green-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                      {exp.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                    <p>Description: <span className="text-foreground">{exp.description || 'N/A'}</span></p>
                    <p>Amount Paid: <span className="text-red-500 font-bold">{formatCurrency(Number(exp.totalAmount))}</span></p>
                    {exp.bankAccount && <p>Source Ledger: <span className="text-foreground">{exp.bankAccount.name}</span></p>}
                    <p>Date: <span className="text-foreground">{exp.date.split('T')[0]}</span></p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button onClick={() => handleDelete(exp.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Expense Categories List Tab
        <div className="bg-surface rounded-2xl border border-border shadow-premium overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="py-4 px-6">Category Name</th>
                <th className="py-4 px-6">Description</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-border/50 hover:bg-background/20 transition-colors">
                  <td className="py-4 px-6 font-bold text-foreground">{cat.name}</td>
                  <td className="py-4 px-6 text-muted-foreground text-sm">{cat.description || 'No description provided'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* File Expense Claim Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-lg z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">File Expense Claim</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expense Category *</label>
                  <select {...form.register('categoryId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Choose category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pay-out Ledger (leaves blank for Accrued Payable Liability)</label>
                  <select {...form.register('bankAccountId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Accrued Accounts Payable</option>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name} (Bal: {formatCurrency(b.currentBalance)})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expense Date *</label>
                  <input type="date" {...form.register('date')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Amount *</label>
                  <input type="number" {...form.register('amount', { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">GST Tax Component</label>
                  <input type="number" {...form.register('taxAmount', { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payment Mode</label>
                  <select {...form.register('paymentMethod')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI Payment</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Brief Description *</label>
                  <input type="text" {...form.register('description')} placeholder="e.g. Office high-speed broadband" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Memos / Private Notes</label>
                  <textarea {...form.register('notes')} placeholder="Provide transaction details..." rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
