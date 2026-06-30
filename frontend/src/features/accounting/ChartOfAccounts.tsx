import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  BookOpen, Search, Plus, Edit2, Trash2, Loader2, 
  RefreshCw, Landmark, Calculator, AlertTriangle, FileText, ArrowRightLeft, Calendar 
} from 'lucide-react';
import api from '../../services/api';

// --- SCHEMAS ---
const accountSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  category: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  balance: z.number(),
});

const journalLineSchema = z.object({
  accountId: z.string().min(1, 'Select account'),
  debit: z.number(),
  credit: z.number(),
});

const journalEntrySchema = z.object({
  date: z.string().nonempty('Select date'),
  reference: z.string().optional(),
  description: z.string().optional(),
  lines: z.array(journalLineSchema).min(2, 'At least 2 lines are required'),
});

type AccountFormValues = z.infer<typeof accountSchema>;
type JournalEntryFormValues = z.infer<typeof journalEntrySchema>;

// --- TYPES ---
interface Account {
  id: string;
  name: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
}

interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  account: Account;
}

interface JournalEntry {
  id: string;
  date: string;
  reference?: string;
  description?: string;
  lines: JournalLine[];
}

export const ChartOfAccounts = () => {
  const [activeTab, setActiveTab] = useState<'coa' | 'journal' | 'trial' | 'pl' | 'bs'>('coa');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data lists
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  
  // Financial Telemetry states
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [profitLoss, setProfitLoss] = useState<any>({ revenue: [], expense: [], totalRevenue: 0, totalExpense: 0, netProfit: 0 });
  const [balanceSheet, setBalanceSheet] = useState<any>({ assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 });

  // Modal controls
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Forms hooks
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: '', category: 'ASSET', balance: 0 }
  });

  const journalForm = useForm<JournalEntryFormValues>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      reference: '',
      description: '',
      lines: [
        { accountId: '', debit: 0, credit: 0 },
        { accountId: '', debit: 0, credit: 0 },
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: journalForm.control,
    name: 'lines'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'coa') {
        const res = await api.get<any>('/accounts');
        setAccounts(res.items || []);
      } else if (activeTab === 'journal') {
        // Load accounts for dropdown reference
        const accRes = await api.get<any>('/accounts');
        setAccounts(accRes.items || []);
        
        const res = await api.get<any>('/journal-entries');
        setJournalEntries(res.items || []);
      } else if (activeTab === 'trial') {
        const res = await api.get<any>('/accounts/trial-balance');
        setTrialBalance(res || []);
      } else if (activeTab === 'pl') {
        const res = await api.get<any>('/accounts/profit-loss');
        setProfitLoss(res || { revenue: [], expense: [], totalRevenue: 0, totalExpense: 0, netProfit: 0 });
      } else if (activeTab === 'bs') {
        const res = await api.get<any>('/accounts/balance-sheet');
        setBalanceSheet(res || { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 });
      }
    } catch (err) {
      toast.error('Failed to load ledger data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAccountSubmit = async (values: AccountFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/accounts/${editingId}`, values);
        toast.success('Account updated successfully');
      } else {
        await api.post('/accounts', values);
        toast.success('New ledger account created');
      }
      setIsAccountModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJournalSubmit = async (values: JournalEntryFormValues) => {
    setIsSubmitting(true);
    // double entry validation
    const sumDebit = values.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const sumCredit = values.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

    if (Math.abs(sumDebit - sumCredit) > 0.01) {
      toast.error(`Debits (${sumDebit}) must equal Credits (${sumCredit})`);
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post('/journal-entries', values);
      toast.success('Journal entry posted successfully');
      setIsJournalModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Posting failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('Delete this account from Chart of Accounts?')) return;
    try {
      await api.delete(`/accounts/${id}`);
      toast.success('Account deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Deletion failed');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const watchedLines = journalForm.watch('lines') || [];
  const totalDebit = watchedLines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = watchedLines.reduce((s, l) => s + Number(l.credit || 0), 0);

  return (
    <div className="space-y-6 text-left p-6 max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-accent" />
            General Ledger Accounting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Maintain accounts, audit trial balances, draft balance sheets, and post manual journal entry vouchers.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'coa' && (
            <button
              onClick={() => { setEditingId(null); accountForm.reset(); setIsAccountModalOpen(true); }}
              className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Account
            </button>
          )}
          {activeTab === 'journal' && (
            <button
              onClick={() => { journalForm.reset(); setIsJournalModalOpen(true); }}
              className="bg-accent text-white hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Journal Entry
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-border gap-1">
        <button
          onClick={() => setActiveTab('coa')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'coa' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Chart of Accounts
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'journal' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Journal Entries
        </button>
        <button
          onClick={() => setActiveTab('trial')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'trial' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Trial Balance
        </button>
        <button
          onClick={() => setActiveTab('pl')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'pl' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Profit & Loss
        </button>
        <button
          onClick={() => setActiveTab('bs')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'bs' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Balance Sheet
        </button>
      </div>

      {/* Main Tab Renderings */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground flex justify-center items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading Ledger...
        </div>
      ) : activeTab === 'coa' ? (
        <div className="bg-surface rounded-2xl border border-border shadow-premium overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="py-4 px-6">Account Name</th>
                <th className="py-4 px-6">Category Type</th>
                <th className="py-4 px-6 text-right">Balance</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id} className="border-b border-border/50 hover:bg-background/20 transition-colors">
                  <td className="py-4 px-6 font-medium text-foreground">{acc.name}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${
                      acc.category === 'ASSET' ? 'bg-blue-500/10 text-blue-500' :
                      acc.category === 'LIABILITY' ? 'bg-amber-500/10 text-amber-500' :
                      acc.category === 'REVENUE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {acc.category}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-foreground">
                    {formatCurrency(Number(acc.balance || 0))}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => handleDeleteAccount(acc.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'journal' ? (
        journalEntries.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No manual journal entries recorded</h3>
          </div>
        ) : (
          <div className="space-y-6">
            {journalEntries.map((je) => (
              <div key={je.id} className="bg-surface rounded-2xl border border-border p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Reference: {je.reference || 'N/A'}</h3>
                    <p className="text-xs text-muted-foreground">{je.description || 'No description provided'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {je.date.split('T')[0]}
                  </span>
                </div>

                <table className="w-full text-xs text-left border-t border-border mt-4">
                  <thead>
                    <tr className="text-muted-foreground uppercase py-2">
                      <th className="py-2">Ledger Account</th>
                      <th className="py-2 text-right">Debit</th>
                      <th className="py-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {je.lines.map((l) => (
                      <tr key={l.id} className="border-b border-border/50">
                        <td className="py-2 font-medium text-foreground">{l.account?.name}</td>
                        <td className="py-2 text-right text-foreground font-semibold">{l.debit > 0 ? formatCurrency(Number(l.debit)) : ''}</td>
                        <td className="py-2 text-right text-foreground font-semibold">{l.credit > 0 ? formatCurrency(Number(l.credit)) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'trial' ? (
        <div className="bg-surface rounded-2xl border border-border shadow-premium overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="py-4 px-6">Account Ledger</th>
                <th className="py-4 px-6 text-right">Debit</th>
                <th className="py-4 px-6 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.map((row) => (
                <tr key={row.id} className="border-b border-border/50">
                  <td className="py-4 px-6 font-medium text-foreground">{row.name}</td>
                  <td className="py-4 px-6 text-right text-foreground font-bold">
                    {row.balance > 0 ? formatCurrency(row.balance) : ''}
                  </td>
                  <td className="py-4 px-6 text-right text-foreground font-bold">
                    {row.balance < 0 ? formatCurrency(Math.abs(row.balance)) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'pl' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface p-6 rounded-2xl border border-border space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              Sales & Revenues
            </h3>
            <div className="space-y-2">
              {profitLoss.revenue.map((r: any) => (
                <div key={r.name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(Math.abs(r.balance))}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface p-6 rounded-2xl border border-border space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              Operating Expenses
            </h3>
            <div className="space-y-2">
              {profitLoss.expense.map((e: any) => (
                <div key={e.name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{e.name}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(e.balance)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 bg-background p-6 rounded-2xl border border-border flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-foreground">Net Operating Profit</h3>
              <p className="text-xs text-muted-foreground">Calculated matching revenue inflows and expense outflows</p>
            </div>
            <span className={`text-2xl font-black ${profitLoss.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(profitLoss.netProfit)}
            </span>
          </div>
        </div>
      ) : (
        // Balance Sheet tab
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface p-6 rounded-2xl border border-border space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              Assets Ledger
            </h3>
            <div className="space-y-2">
              {balanceSheet.assets.map((a: any) => (
                <div key={a.name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{a.name}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(a.balance)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface p-6 rounded-2xl border border-border space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              Liabilities & Equity Ledger
            </h3>
            <div className="space-y-2">
              {[...balanceSheet.liabilities, ...balanceSheet.equity].map((l: any) => (
                <div key={l.name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{l.name}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(Math.abs(l.balance))}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 bg-background p-6 rounded-2xl border border-border flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-foreground">Statement Integrity Check</h3>
              <p className="text-xs text-muted-foreground">Formula: Asset Balance === Liability + Equity</p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-muted-foreground">Total Assets</p>
                <p className="text-base font-bold text-foreground">{formatCurrency(balanceSheet.totalAssets)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Liabilities & Equity</p>
                <p className="text-base font-bold text-accent">{formatCurrency(Math.abs(balanceSheet.totalLiabilities) + Math.abs(balanceSheet.totalEquity))}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAccountModalOpen(false)} />
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-md z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">Create Ledger Account</h2>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>
            <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Account Name *</label>
                <input type="text" {...accountForm.register('name')} placeholder="e.g. Travel Overhead Expenses" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Financial Category Type *</label>
                <select {...accountForm.register('category')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                  <option value="ASSET">Asset (Cash, Bank, Inventory)</option>
                  <option value="LIABILITY">Liability (Loans, Payables)</option>
                  <option value="EQUITY">Equity (Share Capital, Retained Earnings)</option>
                  <option value="REVENUE">Revenue (Product Sales, Service Income)</option>
                  <option value="EXPENSE">Expense (Salary, Rent, Consumables)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <button type="button" onClick={() => setIsAccountModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Journal Entry Modal */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsJournalModalOpen(false)} />
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-3xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35 shrink-0">
              <h2 className="font-bold text-lg text-foreground">Post Manual Journal entry voucher</h2>
              <button onClick={() => setIsJournalModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={journalForm.handleSubmit(handleJournalSubmit)} className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Transaction Date *</label>
                  <input type="date" {...journalForm.register('date')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reference No / Voucher</label>
                  <input type="text" {...journalForm.register('reference')} placeholder="e.g. JV-001" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description / Memo</label>
                  <input type="text" {...journalForm.register('description')} placeholder="Travel cost provision" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>
              </div>

              {/* Dynamic Voucher Rows */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Debit & Credit Line Items</label>
                  <button
                    type="button"
                    onClick={() => append({ accountId: '', debit: 0, credit: 0 })}
                    className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-3 items-end bg-background bg-opacity-40 p-3 rounded-xl border border-border">
                      <div className="col-span-6">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Ledger Account *</label>
                        <select
                          {...journalForm.register(`lines.${index}.accountId` as const)}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        >
                          <option value="">Select account...</option>
                          {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.category})</option>)}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Debit Value</label>
                        <input
                          type="number"
                          {...journalForm.register(`lines.${index}.debit` as const, { valueAsNumber: true })}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Credit Value</label>
                        <input
                          type="number"
                          {...journalForm.register(`lines.${index}.credit` as const, { valueAsNumber: true })}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2 text-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          disabled={fields.length === 2}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-30 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integrity balance check indicator */}
              <div className="border-t border-border pt-4 flex flex-col items-end space-y-2 text-sm shrink-0">
                <div className="flex justify-between w-64 text-muted-foreground">
                  <span>Total Debit:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(totalDebit)}</span>
                </div>
                <div className="flex justify-between w-64 text-muted-foreground">
                  <span>Total Credit:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(totalCredit)}</span>
                </div>
                <div className="flex justify-between w-64 text-xs font-semibold pt-2">
                  <span className="text-muted-foreground">Unbalance Variance:</span>
                  <span className={Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(Math.abs(totalDebit - totalCredit))}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={() => setIsJournalModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Post Journal entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
