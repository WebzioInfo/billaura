import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  BookOpen, Plus, Loader2, Calendar, Trash2, Pencil 
} from 'lucide-react';
import api from '../../services/api';
import { DataTable, DataTableColumnHeader, FilterPanel } from '../../components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiList } from '../../hooks/useApiList';
import { LedgerLookup } from '../../components/ui/LedgerLookup';

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
  const location = useLocation();
  const navigate = useNavigate();
  
  // Derive active tab from URL path
  const path = location.pathname;
  let activeTab: 'coa' | 'journal' | 'trial' | 'pl' | 'bs' | 'cf' = 'coa';
  if (path.includes('/journal-entries')) activeTab = 'journal';
  else if (path.includes('/trial-balance')) activeTab = 'trial';
  else if (path.includes('/profit-loss')) activeTab = 'pl';
  else if (path.includes('/balance-sheet')) activeTab = 'bs';
  else if (path.includes('/cash-flow')) activeTab = 'cf';
  
  const setActiveTab = (tab: 'coa' | 'journal' | 'trial' | 'pl' | 'bs' | 'cf') => {
    if (tab === 'journal') navigate('/journal-entries');
    else if (tab === 'trial') navigate('/trial-balance');
    else if (tab === 'pl') navigate('/profit-loss');
    else if (tab === 'bs') navigate('/balance-sheet');
    else if (tab === 'cf') navigate('/cash-flow');
    else navigate('/chart-of-accounts');
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
 
  // Data lists
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  
  // Financial Telemetry states
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [profitLoss, setProfitLoss] = useState<any>({ revenue: [], expense: [], totalRevenue: 0, totalExpense: 0, netProfit: 0 });
  const [balanceSheet, setBalanceSheet] = useState<any>({ assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 });
  const [cashFlow, setCashFlow] = useState<any>({ operatingInflow: 0, operatingOutflow: 0, operatingNet: 0, investingInflow: 0, investingOutflow: 0, investingNet: 0, financingInflow: 0, financingOutflow: 0, financingNet: 0, netCashFlow: 0 });
 
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const accountColumns: ColumnDef<Account>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
      cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue('name')}</span>,
    },
    {
      accessorKey: 'category',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category Type" />,
      cell: ({ row }) => {
        const cat = row.getValue('category') as string;
        return (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${
            cat === 'ASSET' ? 'bg-blue-500/10 text-blue-500' :
            cat === 'LIABILITY' ? 'bg-amber-500/10 text-amber-500' :
            cat === 'REVENUE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
          }`}>
            {cat}
          </span>
        );
      },
    },
    {
      accessorKey: 'balance',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
      cell: ({ row }) => <span className="font-bold text-foreground block text-right">{formatCurrency(Number(row.getValue('balance') || 0))}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        return (
          <div className="flex justify-end gap-2">
            <button onClick={() => handleEditAccount(row.original)} className="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg cursor-pointer">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => handleDeleteAccount(row.original.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const trialBalanceColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Ledger" />,
      cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue('name')}</span>,
    },
    {
      id: 'debit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Debit" />,
      cell: ({ row }) => {
        const bal = row.original.balance;
        return <span className="font-bold text-foreground block text-right">{bal > 0 ? formatCurrency(bal) : ''}</span>;
      },
    },
    {
      id: 'credit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Credit" />,
      cell: ({ row }) => {
        const bal = row.original.balance;
        return <span className="font-bold text-foreground block text-right">{bal < 0 ? formatCurrency(Math.abs(bal)) : ''}</span>;
      },
    },
  ];
 
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [globalFilter, setGlobalFilter] = useState('');

  const { data: accountsData, meta: accountsMeta, isLoading: isLoadingAccounts } = useApiList<Account>(
    ['accounts', String(pagination.pageIndex), String(pagination.pageSize), globalFilter],
    '/accounts',
    { 
      page: pagination.pageIndex + 1, 
      limit: pagination.pageSize,
      search: globalFilter || undefined
    },
    { enabled: activeTab === 'coa' || activeTab === 'journal' }
  );
  
  useEffect(() => {
    if (accountsData) setAccounts(accountsData);
  }, [accountsData]);

  const { data: journalEntriesData, isLoading: isLoadingJournal } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: async () => {
      const res = await api.get<any>('/journal-entries');
      return res.data || [];
    },
    enabled: activeTab === 'journal'
  });

  useEffect(() => {
    if (journalEntriesData) setJournalEntries(journalEntriesData);
  }, [journalEntriesData]);

  const { data: trialBalanceData, isLoading: isLoadingTrial } = useQuery({
    queryKey: ['trial-balance'],
    queryFn: async () => {
      const res = await api.get<any>('/accounts/trial-balance');
      return res.data || [];
    },
    enabled: activeTab === 'trial'
  });

  useEffect(() => {
    if (trialBalanceData) setTrialBalance(trialBalanceData);
  }, [trialBalanceData]);

  const { data: profitLossData, isLoading: isLoadingPL } = useQuery({
    queryKey: ['profit-loss'],
    queryFn: async () => {
      const res = await api.get<any>('/accounts/profit-loss');
      return res.data || { revenue: [], expense: [], totalRevenue: 0, totalExpense: 0, netProfit: 0 };
    },
    enabled: activeTab === 'pl'
  });

  useEffect(() => {
    if (profitLossData) setProfitLoss(profitLossData);
  }, [profitLossData]);

  const { data: balanceSheetData, isLoading: isLoadingBS } = useQuery({
    queryKey: ['balance-sheet'],
    queryFn: async () => {
      const res = await api.get<any>('/accounts/balance-sheet');
      return res.data || { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
    },
    enabled: activeTab === 'bs'
  });

  useEffect(() => {
    if (balanceSheetData) setBalanceSheet(balanceSheetData);
  }, [balanceSheetData]);

  const { data: cashFlowData, isLoading: isLoadingCF } = useQuery({
    queryKey: ['cash-flow'],
    queryFn: async () => {
      const res = await api.get<any>('/accounts/cash-flow');
      return res.data || { operatingInflow: 0, operatingOutflow: 0, operatingNet: 0, investingInflow: 0, investingOutflow: 0, investingNet: 0, financingInflow: 0, financingOutflow: 0, financingNet: 0, netCashFlow: 0 };
    },
    enabled: activeTab === 'cf'
  });

  useEffect(() => {
    if (cashFlowData) setCashFlow(cashFlowData);
  }, [cashFlowData]);

  const isLoading = isLoadingAccounts || isLoadingJournal || isLoadingTrial || isLoadingPL || isLoadingBS || isLoadingCF;

  const queryClient = useQueryClient();

  const handleEditAccount = (acc: Account) => {
    setEditingId(acc.id);
    accountForm.reset({
      name: acc.name,
      category: acc.category,
      balance: acc.balance || 0,
    });
    setIsAccountModalOpen(true);
  };

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
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-master-data'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['account-lookup'] });
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
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['profit-loss'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
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
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Deletion failed');
    }
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
        <button
          onClick={() => setActiveTab('cf')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'cf' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Cash Flow
        </button>
      </div>
 
      {/* Main Tab Renderings */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground flex justify-center items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading Ledger...
        </div>
      ) : activeTab === 'coa' ? (
        <div className="bg-surface rounded-2xl border border-border shadow-premium overflow-hidden">
          <FilterPanel 
            fields={[
              { id: 'category', label: 'Category', type: 'select', options: [{label: 'ASSET', value: 'ASSET'}, {label: 'LIABILITY', value: 'LIABILITY'}, {label: 'EQUITY', value: 'EQUITY'}, {label: 'REVENUE', value: 'REVENUE'}, {label: 'EXPENSE', value: 'EXPENSE'}] }
            ]} 
            onApply={() => {}} 
            className="border-none shadow-none border-b rounded-none mb-0" 
          />
          <div className="p-4">
            <DataTable 
              columns={accountColumns} 
              data={accounts} 
              exportFilename="chart_of_accounts" 
              manualPagination
              manualFiltering
              pageCount={accountsMeta?.totalPages || 0}
              pagination={pagination}
              onPaginationChange={setPagination}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
            />
          </div>
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
          <div className="p-4">
            <DataTable columns={trialBalanceColumns} data={trialBalance} searchKey="name" exportFilename="trial_balance" />
          </div>
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
      ) : activeTab === 'bs' ? (
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
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface p-6 rounded-2xl border border-border space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                Operating Activities
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Inflow:</span>
                  <span className="font-semibold text-green-500">{formatCurrency(cashFlow.operatingInflow)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Outflow:</span>
                  <span className="font-semibold text-red-500">{formatCurrency(cashFlow.operatingOutflow)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span className="text-foreground">Net Operating Cash:</span>
                  <span className={cashFlow.operatingNet >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(cashFlow.operatingNet)}
                  </span>
                </div>
              </div>
            </div>
 
            <div className="bg-surface p-6 rounded-2xl border border-border space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                Investing Activities
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Inflow:</span>
                  <span className="font-semibold text-green-500">{formatCurrency(cashFlow.investingInflow)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Outflow:</span>
                  <span className="font-semibold text-red-500">{formatCurrency(cashFlow.investingOutflow)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span className="text-foreground">Net Investing Cash:</span>
                  <span className={cashFlow.investingNet >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(cashFlow.investingNet)}
                  </span>
                </div>
              </div>
            </div>
 
            <div className="bg-surface p-6 rounded-2xl border border-border space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                Financing Activities
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Inflow:</span>
                  <span className="font-semibold text-green-500">{formatCurrency(cashFlow.financingInflow)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Outflow:</span>
                  <span className="font-semibold text-red-500">{formatCurrency(cashFlow.financingOutflow)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span className="text-foreground">Net Financing Cash:</span>
                  <span className={cashFlow.financingNet >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(cashFlow.financingNet)}
                  </span>
                </div>
              </div>
            </div>
          </div>
 
          <div className="bg-background p-6 rounded-2xl border border-border flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-foreground">Net Cash Flow Summary</h3>
              <p className="text-xs text-muted-foreground">Net change in cash and bank balances for the period</p>
            </div>
            <span className={`text-2xl font-black ${cashFlow.netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(cashFlow.netCashFlow)}
            </span>
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
                        <LedgerLookup
                          value={watchedLines[index]?.accountId || ''}
                          onChange={(val) => journalForm.setValue(`lines.${index}.accountId`, val)}
                          placeholder="Select account..."
                        />
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
