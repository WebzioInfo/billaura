import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as xlsx from 'xlsx';
import notification from '@/core/services/NotificationService';
import {
  Plus,
  Search,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Loader2,
  Calendar,
  X,
} from 'lucide-react';
import { apiClient as api } from '../../core/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { StatusBadge, CurrencyCell, Button, DeleteDialog, Pagination } from '../../shared/components/ui';
import { LedgerLookup } from '../../shared/components/ui/LedgerLookup';
import { PageHeader } from '../../shared/components/ui/PageHeader';
import { PageLayout } from '../../shared/components/layout/PageLayout';
import { AccountingSubNav, AccountingTabId } from './components/AccountingSubNav';
import { AccountRowActions } from './components/AccountRowActions';
import { cn } from '@/lib/utils';

// --- SCHEMAS ---
const accountSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  category: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  balance: z.number(),
  parentId: z.string().optional().nullable(),
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
  code?: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
  isGroup?: boolean;
  parentId?: string | null;
  children?: Account[];
  depth?: number;
  isExpanded?: boolean;
  hasChildren?: boolean;
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

type CategoryFilter = 'ALL' | 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

const formatIndianCurrency = (amount: number) => {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return isNegative ? `-${formatted}` : formatted;
};

export const ChartOfAccounts: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Derive active tab from URL path
  const path = location.pathname;
  const activeTab: AccountingTabId = useMemo(() => {
    if (path.includes('/journal-entries')) return 'journal';
    if (path.includes('/trial-balance')) return 'trial';
    if (path.includes('/profit-loss')) return 'pl';
    if (path.includes('/balance-sheet')) return 'bs';
    if (path.includes('/cash-flow')) return 'cf';
    return 'coa';
  }, [path]);

  const handleTabChange = (tab: AccountingTabId) => {
    if (tab === 'journal') navigate('/journal-entries');
    else if (tab === 'trial') navigate('/trial-balance');
    else if (tab === 'pl') navigate('/profit-loss');
    else if (tab === 'bs') navigate('/balance-sheet');
    else if (tab === 'cf') navigate('/cash-flow');
    else navigate('/chart-of-accounts');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tree & Table States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Modal controls
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [parentAccountForSub, setParentAccountForSub] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Telemetry states for other tabs
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [profitLoss, setProfitLoss] = useState<any>({
    revenue: [],
    expense: [],
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
  });
  const [balanceSheet, setBalanceSheet] = useState<any>({
    assets: [],
    liabilities: [],
    equity: [],
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
  });
  const [cashFlow, setCashFlow] = useState<any>({
    operatingInflow: 0,
    operatingOutflow: 0,
    operatingNet: 0,
    investingInflow: 0,
    investingOutflow: 0,
    investingNet: 0,
    financingInflow: 0,
    financingOutflow: 0,
    financingNet: 0,
    netCashFlow: 0,
  });

  // Forms hooks
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: '', category: 'ASSET', balance: 0, parentId: null },
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
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: journalForm.control,
    name: 'lines',
  });

  // Query: Accounts Tree
  const { data: rawTreeData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts-tree'],
    queryFn: async () => {
      const res = await api.get<any>('/accounts/tree');
      return res.data || res || [];
    },
    enabled: activeTab === 'coa' || activeTab === 'journal',
  });

  // Initial expand: expand all root groups when data is first loaded
  useEffect(() => {
    if (rawTreeData && rawTreeData.length > 0 && expandedIds.size === 0) {
      const initialExpanded = new Set<string>();
      const addGroups = (nodes: Account[]) => {
        nodes.forEach((node) => {
          if (node.isGroup || (node.children && node.children.length > 0)) {
            initialExpanded.add(node.id);
            if (node.children) addGroups(node.children);
          }
        });
      };
      addGroups(rawTreeData);
      setExpandedIds(initialExpanded);
    }
  }, [rawTreeData]);

  // Compute category counts from all accounts
  const categoryCounts = useMemo(() => {
    const counts = {
      ALL: 0,
      ASSET: 0,
      LIABILITY: 0,
      EQUITY: 0,
      REVENUE: 0,
      EXPENSE: 0,
    };

    const countNodes = (nodes: Account[]) => {
      nodes.forEach((node) => {
        counts.ALL += 1;
        const cat = node.category as keyof typeof counts;
        if (counts[cat] !== undefined) {
          counts[cat] += 1;
        }
        if (node.children && node.children.length > 0) {
          countNodes(node.children);
        }
      });
    };

    if (rawTreeData) {
      countNodes(rawTreeData);
    }
    return counts;
  }, [rawTreeData]);

  // Toggle node expansion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand / Collapse all
  const allGroupIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (nodes: Account[]) => {
      nodes.forEach((n) => {
        if (n.isGroup || (n.children && n.children.length > 0)) {
          ids.add(n.id);
          if (n.children) collect(n.children);
        }
      });
    };
    if (rawTreeData) collect(rawTreeData);
    return ids;
  }, [rawTreeData]);

  const areAllExpanded = useMemo(() => {
    if (allGroupIds.size === 0) return false;
    for (const id of allGroupIds) {
      if (!expandedIds.has(id)) return false;
    }
    return true;
  }, [allGroupIds, expandedIds]);

  const handleToggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(allGroupIds));
    }
  };

  // Filter and flatten the tree based on search, category filter, and expansion state
  const { visibleRows, totalMatchingAccounts } = useMemo(() => {
    if (!rawTreeData) return { visibleRows: [], totalMatchingAccounts: 0 };

    const query = searchTerm.trim().toLowerCase();

    // Check if node matches filters
    const matchesSearch = (node: Account): boolean => {
      if (!query) return true;
      const nameMatch = node.name.toLowerCase().includes(query);
      const codeMatch = node.code ? node.code.toLowerCase().includes(query) : false;
      return nameMatch || codeMatch;
    };

    const matchesCategory = (node: Account): boolean => {
      if (categoryFilter === 'ALL') return true;
      return node.category === categoryFilter;
    };

    // Filter tree recursively
    const filterNode = (node: Account): Account | null => {
      const childMatches: Account[] = [];
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const filteredChild = filterNode(child);
          if (filteredChild) childMatches.push(filteredChild);
        }
      }

      const selfMatches = matchesSearch(node) && matchesCategory(node);
      const isAncestorOfMatch = childMatches.length > 0;

      if (selfMatches || isAncestorOfMatch) {
        return {
          ...node,
          children: childMatches,
        };
      }
      return null;
    };

    const filteredRoots: Account[] = [];
    for (const root of rawTreeData) {
      const filtered = filterNode(root);
      if (filtered) filteredRoots.push(filtered);
    }

    // Count total matching accounts
    let totalCount = 0;
    const countFiltered = (nodes: Account[]) => {
      nodes.forEach((n) => {
        totalCount += 1;
        if (n.children && n.children.length > 0) countFiltered(n.children);
      });
    };
    countFiltered(filteredRoots);

    // Paginate root groups if pagination is active
    const isAllMode = pageSize >= 10000;
    let paginatedRoots = filteredRoots;
    if (!isAllMode && filteredRoots.length > 0) {
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      paginatedRoots = filteredRoots.slice(start, end);
    }

    // Flatten tree based on expansion state (if search active, auto-expand)
    const flat: Account[] = [];
    const flatten = (nodes: Account[], depth = 0) => {
      nodes.forEach((node) => {
        const hasChildren = Boolean(node.children && node.children.length > 0);
        const isGroup = Boolean(node.isGroup || hasChildren);
        const isExpanded = query ? true : expandedIds.has(node.id);

        flat.push({
          ...node,
          depth,
          isGroup,
          hasChildren,
          isExpanded,
        });

        if (hasChildren && (isExpanded || query)) {
          flatten(node.children!, depth + 1);
        }
      });
    };

    flatten(paginatedRoots);

    return { visibleRows: flat, totalMatchingAccounts: totalCount };
  }, [rawTreeData, searchTerm, categoryFilter, expandedIds, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize >= 10000 || totalMatchingAccounts === 0) return 1;
    // Paginate by root groups
    const query = searchTerm.trim().toLowerCase();
    const countRoots = (rawTreeData || []).filter((r: Account) => {
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      if (query && !r.name.toLowerCase().includes(query)) return false;
      return true;
    }).length;
    return Math.max(1, Math.ceil(countRoots / pageSize));
  }, [rawTreeData, categoryFilter, searchTerm, pageSize, totalMatchingAccounts]);

  // Export to Excel
  const handleExport = () => {
    if (!visibleRows || visibleRows.length === 0) {
      notification.error('No accounts to export');
      return;
    }

    const exportData = visibleRows.map((acc) => ({
      'Account Name': `${'  '.repeat(acc.depth || 0)}${acc.name}`,
      Category: acc.category,
      Type: acc.isGroup ? 'Group' : 'Ledger',
      Balance: Number(acc.balance || 0),
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Chart of Accounts');
    xlsx.writeFile(workbook, `chart_of_accounts_${new Date().toISOString().split('T')[0]}.xlsx`);
    notification.success('Chart of accounts exported to Excel');
  };

  // Queries for other financial telemetry tabs
  const { data: journalEntriesData, isLoading: isLoadingJournal } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: async () => {
      const res = await api.get<any>('/journal-entries');
      return res.data || [];
    },
    enabled: activeTab === 'journal',
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
    enabled: activeTab === 'trial',
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
    enabled: activeTab === 'pl',
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
    enabled: activeTab === 'bs',
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
    enabled: activeTab === 'cf',
  });

  useEffect(() => {
    if (cashFlowData) setCashFlow(cashFlowData);
  }, [cashFlowData]);

  const isLoading = isLoadingAccounts || isLoadingJournal || isLoadingTrial || isLoadingPL || isLoadingBS || isLoadingCF;

  // Account Form Handlers
  const handleEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setParentAccountForSub(null);
    accountForm.reset({
      name: acc.name,
      category: acc.category,
      balance: Number(acc.balance || 0),
      parentId: acc.parentId || null,
    });
    setIsAccountModalOpen(true);
  };

  const handleAddSubAccount = (parentAcc: Account) => {
    setEditingAccount(null);
    setParentAccountForSub(parentAcc);
    accountForm.reset({
      name: '',
      category: parentAcc.category,
      balance: 0,
      parentId: parentAcc.id,
    });
    setIsAccountModalOpen(true);
  };

  const handleToggleActive = async (account: Account) => {
    try {
      const newStatus = !(account as any).isActive;
      await api.patch(`/accounts/${account.id}`, { isActive: newStatus });
      notification.success(`Account ${newStatus ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to update account status');
    }
  };

  const handleDeleteAccount = (id: string) => {
    const findAcc = (nodes: Account[]): Account | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
          const found = findAcc(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    const target = (rawTreeData && findAcc(rawTreeData)) || { id, name: 'Account' } as Account;
    setAccountToDelete(target);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      await api.delete(`/accounts/${accountToDelete.id}`);
      notification.success('Account deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setAccountToDelete(null);
    }
  };

  const handleAccountSubmit = async (values: AccountFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: values.name,
        category: values.category,
        balance: values.balance,
        parentId: values.parentId || (parentAccountForSub ? parentAccountForSub.id : undefined),
      };

      if (editingAccount) {
        await api.patch(`/accounts/${editingAccount.id}`, payload);
        notification.success('Account updated successfully');
      } else {
        await api.post('/accounts', payload);
        notification.success('New ledger account created');
      }
      setIsAccountModalOpen(false);
      setEditingAccount(null);
      setParentAccountForSub(null);
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-lookup'] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Journal Entry Submit
  const handleJournalSubmit = async (values: JournalEntryFormValues) => {
    setIsSubmitting(true);
    const sumDebit = values.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const sumCredit = values.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

    if (Math.abs(sumDebit - sumCredit) > 0.01) {
      notification.error(`Debits (${formatIndianCurrency(sumDebit)}) must equal Credits (${formatIndianCurrency(sumCredit)})`);
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post('/journal-entries', values);
      notification.success('Journal entry posted successfully');
      setIsJournalModalOpen(false);
      await erpInvalidate.journalEntry(queryClient);
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Posting failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedLines = journalForm.watch('lines') || [];
  const totalDebit = watchedLines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = watchedLines.reduce((s, l) => s + Number(l.credit || 0), 0);

  return (
    <>
      <PageLayout
        isLoading={isLoadingAccounts && (!rawTreeData || (rawTreeData as any)?.length === 0)}
        loadingTitle="Loading Chart of Accounts..."
        loadingDescription="Fetching general ledger account hierarchy..."
        header={
          <PageHeader
            title="Chart of Accounts"
            count={categoryCounts.ALL}
            primaryAction={
              activeTab === 'coa' ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingAccount(null);
                    setParentAccountForSub(null);
                    accountForm.reset({ name: '', category: 'ASSET', balance: 0, parentId: null });
                    setIsAccountModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Account
                </Button>
              ) : activeTab === 'journal' ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    journalForm.reset();
                    setIsJournalModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Journal Entry
                </Button>
              ) : undefined
            }
          />
        }
        subNav={<AccountingSubNav activeTab={activeTab} onTabChange={handleTabChange} />}
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading accounts...</span>
          </div>
        ) : activeTab === 'coa' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* 1. TOOLBAR: Sitting directly on page background (NO outer card!) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3 shrink-0">
              {/* Left: Search input + Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                <div className="relative min-w-[200px] max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search accounts..."
                    className="h-8.5 w-full pl-9 pr-7 rounded-lg border border-border bg-surface text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {(
                    [
                      { key: 'ALL', label: 'All', count: categoryCounts.ALL },
                      { key: 'ASSET', label: 'Asset', count: categoryCounts.ASSET },
                      { key: 'LIABILITY', label: 'Liability', count: categoryCounts.LIABILITY },
                      { key: 'EQUITY', label: 'Equity', count: categoryCounts.EQUITY },
                      { key: 'REVENUE', label: 'Revenue', count: categoryCounts.REVENUE },
                      { key: 'EXPENSE', label: 'Expense', count: categoryCounts.EXPENSE },
                    ] as const
                  ).map((pill) => {
                    const isActive = categoryFilter === pill.key;
                    return (
                      <button
                        key={pill.key}
                        type="button"
                        onClick={() => {
                          setCategoryFilter(pill.key);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          'h-7.5 px-2.5 rounded-full text-[12px] font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap select-none',
                          isActive
                            ? 'bg-[#111827] text-white dark:bg-[#EDEDED] dark:text-[#111827] shadow-xs'
                            : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB] dark:bg-[#26262C] dark:text-[#A1A1AA] dark:hover:bg-[#32313A]'
                        )}
                      >
                        <span>{pill.label}</span>
                        <span className="text-[11px] opacity-75 tabular-nums">({pill.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Expand all / Collapse all + Export */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleExpandAll}
                  className="h-8.5 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title={areAllExpanded ? 'Collapse all folders' : 'Expand all folders'}
                >
                  <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{areAllExpanded ? 'Collapse all' : 'Expand all'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExport}
                  className="h-8.5 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Export to Excel"
                >
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* 2. THE TABLE CARD (THE ONLY CARD ON THE PAGE) */}
            <div className="flex-1 min-h-0 bg-surface dark:bg-[#17161C] rounded-xl border border-border shadow-xs flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative scrollbar-overlay">
                <table className="w-full text-left border-collapse text-[14px]">
                  {/* Sticky Header with #34303F dark background */}
                  <thead className="sticky top-0 z-20 bg-[#34303F] text-white font-medium select-none shadow-xs h-12">
                    <tr>
                      <th className="py-3 px-4 font-medium text-white text-[14px] text-left">
                        Account Name
                      </th>
                      <th className="py-3 px-4 font-medium text-white text-[14px] text-left w-[160px] min-w-[160px]">
                        Category
                      </th>
                      <th className="py-3 px-4 font-medium text-white text-[14px] text-right w-[160px] min-w-[160px]">
                        Balance
                      </th>
                      <th className="py-3 px-4 font-medium text-white text-[14px] text-right w-[96px] min-w-[96px] pr-4">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  {/* Zebra Alternating Rows */}
                  <tbody className="divide-none text-[14px]">
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-16 text-center text-muted-foreground">
                          No ledger accounts found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      visibleRows.map((acc, index) => {
                        const isEven = index % 2 === 1;
                        const depth = acc.depth || 0;
                        const isGroup = acc.isGroup;
                        const isExpanded = acc.isExpanded;
                        const balance = Number(acc.balance || 0);

                        return (
                          <tr
                            key={acc.id}
                            className={cn(
                              'group transition-colors duration-120 h-[52px] border-b border-border/30',
                              isEven
                                ? 'bg-[#F9FAFB] dark:bg-[#1C1B22] hover:bg-[#F3F4F6] dark:hover:bg-[#24232C]'
                                : 'bg-white dark:bg-[#17161C] hover:bg-[#F3F4F6] dark:hover:bg-[#24232C]'
                            )}
                          >
                            {/* Column 1: Account Name + Tree Expander / Folder */}
                            <td className="px-4 py-2 text-[14px] text-foreground">
                              <div
                                className="flex items-center gap-2"
                                style={{ paddingLeft: `${depth * 20}px` }}
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (isGroup && e.key === 'ArrowRight' && !isExpanded) {
                                    e.preventDefault();
                                    toggleExpand(acc.id);
                                  } else if (isGroup && e.key === 'ArrowLeft' && isExpanded) {
                                    e.preventDefault();
                                    toggleExpand(acc.id);
                                  }
                                }}
                              >
                                {isGroup ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpand(acc.id);
                                    }}
                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-[#6B7280] shrink-0"
                                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                  >
                                    <ChevronRight
                                      className={cn(
                                        'w-4 h-4 transition-transform duration-150',
                                        isExpanded && 'rotate-90 text-[#111827] dark:text-[#EDEDED]'
                                      )}
                                    />
                                  </button>
                                ) : (
                                  <span className="w-5 shrink-0" />
                                )}

                                {isGroup && (
                                  <span className="text-amber-500/90 dark:text-amber-400 shrink-0">
                                    {isExpanded ? (
                                      <FolderOpen className="w-4 h-4" />
                                    ) : (
                                      <Folder className="w-4 h-4" />
                                    )}
                                  </span>
                                )}

                                <span
                                  className={cn(
                                    'truncate tracking-tight',
                                    isGroup
                                      ? 'font-semibold text-foreground text-[14px]'
                                      : 'font-normal text-foreground/90 text-[14px]'
                                  )}
                                >
                                  {acc.name}
                                </span>
                              </div>
                            </td>

                            {/* Column 2: Category Pill with dot */}
                            <td className="px-4 py-2 text-[14px] w-[160px] min-w-[160px]">
                              <StatusBadge status={acc.category} />
                            </td>

                            {/* Column 3: Balance (Right-aligned, tabular-nums, ink/grey/red) */}
                            <td className="px-4 py-2 text-[14px] text-right w-[160px] min-w-[160px] tabular-nums">
                              {balance === 0 ? (
                                <span className="text-[#9CA3AF] font-normal">₹0.00</span>
                              ) : balance < 0 ? (
                                <span className="text-[#DC2626] dark:text-[#F87171] font-medium">
                                  {formatIndianCurrency(balance)}
                                </span>
                              ) : (
                                <span className="text-[#111827] dark:text-[#EDEDED] font-medium">
                                  {formatIndianCurrency(balance)}
                                </span>
                              )}
                            </td>

                            {/* Column 4: Row Actions (Portal-based) */}
                            <td className="px-4 py-2 text-[14px] text-right w-[96px] min-w-[96px] pr-4">
                              <AccountRowActions
                                account={acc}
                                onEdit={handleEditAccount}
                                onAddSubAccount={handleAddSubAccount}
                                onToggleActive={handleToggleActive}
                                onDelete={() => handleDeleteAccount(acc.id)}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 3. PINNED 56px PAGINATION FOOTER */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalMatchingAccounts}
                pageSize={pageSize}
                pageSizeOptions={[10, 25, 50, 100, 'all']}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                entityName="accounts"
              />
            </div>
          </div>
        ) : activeTab === 'journal' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto space-y-4">
            {journalEntries.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground bg-surface rounded-xl border border-border max-w-lg mx-auto mt-8">
                <p className="font-semibold text-base mb-1">No journal entries recorded</p>
                <p className="text-xs">Create your first entry using the button above.</p>
              </div>
            ) : (
              journalEntries.map((je) => (
                <div key={je.id} className="bg-surface rounded-xl border border-border p-5 space-y-3 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        Reference: {je.reference || 'N/A'}
                      </h3>
                      <p className="text-xs text-muted-foreground">{je.description || 'No description'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
                      <Calendar className="w-3.5 h-3.5" /> {je.date ? je.date.split('T')[0] : 'N/A'}
                    </span>
                  </div>

                  <table className="w-full text-xs text-left border-t border-border mt-3">
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
                          <td className="py-2 text-right text-foreground font-semibold tabular-nums">
                            {l.debit > 0 ? formatIndianCurrency(Number(l.debit)) : '—'}
                          </td>
                          <td className="py-2 text-right text-foreground font-semibold tabular-nums">
                            {l.credit > 0 ? formatIndianCurrency(Number(l.credit)) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'trial' ? (
          <div className="flex-1 min-h-0 bg-surface rounded-xl border border-border shadow-xs flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-overlay">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead className="sticky top-0 z-20 bg-[#34303F] text-white select-none h-12 shadow-xs">
                  <tr>
                    <th className="py-3 px-4 font-medium text-white text-[14px]">Account Ledger</th>
                    <th className="py-3 px-4 font-medium text-white text-[14px] text-right w-44">Debit</th>
                    <th className="py-3 px-4 font-medium text-white text-[14px] text-right w-44">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.map((item, idx) => {
                    const isEven = idx % 2 === 1;
                    const bal = item.balance || 0;
                    return (
                      <tr
                        key={item.name}
                        className={cn(
                          'h-[52px] border-b border-border/30',
                          isEven ? 'bg-[#F9FAFB] dark:bg-[#1C1B22]' : 'bg-white dark:bg-[#17161C]'
                        )}
                      >
                        <td className="px-4 py-2 font-medium text-foreground">{item.name}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-foreground">
                          {bal > 0 ? formatIndianCurrency(bal) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-foreground">
                          {bal < 0 ? formatIndianCurrency(Math.abs(bal)) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'pl' ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-surface p-5 rounded-xl border border-border space-y-3 shadow-xs">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5">
                  Sales & Revenues
                </h3>
                <div className="space-y-2">
                  {profitLoss.revenue.map((r: any) => (
                    <div key={r.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{r.name}</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatIndianCurrency(Math.abs(r.balance))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface p-5 rounded-xl border border-border space-y-3 shadow-xs">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5">
                  Operating Expenses
                </h3>
                <div className="space-y-2">
                  {profitLoss.expense.map((e: any) => (
                    <div key={e.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{e.name}</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatIndianCurrency(e.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-surface p-5 rounded-xl border border-border flex justify-between items-center shadow-xs">
              <div>
                <h3 className="text-base font-bold text-foreground">Net Operating Profit</h3>
                <p className="text-xs text-muted-foreground">Matching revenue inflows and expense outflows</p>
              </div>
              <span
                className={cn(
                  'text-2xl font-black tabular-nums',
                  profitLoss.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {formatIndianCurrency(profitLoss.netProfit)}
              </span>
            </div>
          </div>
        ) : activeTab === 'bs' ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-surface p-5 rounded-xl border border-border space-y-3 shadow-xs">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5">
                  Assets Ledger
                </h3>
                <div className="space-y-2">
                  {balanceSheet.assets.map((a: any) => (
                    <div key={a.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatIndianCurrency(a.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface p-5 rounded-xl border border-border space-y-3 shadow-xs">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5">
                  Liabilities & Equity Ledger
                </h3>
                <div className="space-y-2">
                  {[...balanceSheet.liabilities, ...balanceSheet.equity].map((l: any) => (
                    <div key={l.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{l.name}</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatIndianCurrency(Math.abs(l.balance))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-surface p-5 rounded-xl border border-border flex justify-between items-center shadow-xs">
              <div>
                <h3 className="text-base font-bold text-foreground">Statement Integrity Check</h3>
                <p className="text-xs text-muted-foreground">Formula: Asset Balance === Liability + Equity</p>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-xs text-muted-foreground">Total Assets</p>
                  <p className="text-base font-bold text-foreground tabular-nums">
                    {formatIndianCurrency(balanceSheet.totalAssets)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Liabilities & Equity</p>
                  <p className="text-base font-bold text-accent tabular-nums">
                    {formatIndianCurrency(
                      Math.abs(balanceSheet.totalLiabilities) + Math.abs(balanceSheet.totalEquity)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-surface p-5 rounded-xl border border-border space-y-3 shadow-xs">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">
                  Operating Activities
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Inflow:</span>
                    <span className="font-semibold text-emerald-600 tabular-nums">
                      {formatIndianCurrency(cashFlow.operatingInflow)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Outflow:</span>
                    <span className="font-semibold text-rose-600 tabular-nums">
                      {formatIndianCurrency(cashFlow.operatingOutflow)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-bold">
                    <span className="text-foreground">Net Operating:</span>
                    <span
                      className={cn(
                        'tabular-nums',
                        cashFlow.operatingNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      )}
                    >
                      {formatIndianCurrency(cashFlow.operatingNet)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-surface p-5 rounded-xl border border-border space-y-3 shadow-xs">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">
                  Investing Activities
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Inflow:</span>
                    <span className="font-semibold text-emerald-600 tabular-nums">
                      {formatIndianCurrency(cashFlow.investingInflow)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Outflow:</span>
                    <span className="font-semibold text-rose-600 tabular-nums">
                      {formatIndianCurrency(cashFlow.investingOutflow)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-bold">
                    <span className="text-foreground">Net Investing:</span>
                    <span
                      className={cn(
                        'tabular-nums',
                        cashFlow.investingNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      )}
                    >
                      {formatIndianCurrency(cashFlow.investingNet)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-surface p-5 rounded-xl border border-border space-y-3 shadow-xs">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">
                  Financing Activities
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Inflow:</span>
                    <span className="font-semibold text-emerald-600 tabular-nums">
                      {formatIndianCurrency(cashFlow.financingInflow)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Outflow:</span>
                    <span className="font-semibold text-rose-600 tabular-nums">
                      {formatIndianCurrency(cashFlow.financingOutflow)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-bold">
                    <span className="text-foreground">Net Financing:</span>
                    <span
                      className={cn(
                        'tabular-nums',
                        cashFlow.financingNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      )}
                    >
                      {formatIndianCurrency(cashFlow.financingNet)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface p-5 rounded-xl border border-border flex justify-between items-center shadow-xs">
              <div>
                <h3 className="text-base font-bold text-foreground">Net Cash Flow Summary</h3>
                <p className="text-xs text-muted-foreground">Net change in cash and bank balances</p>
              </div>
              <span
                className={cn(
                  'text-2xl font-black tabular-nums',
                  cashFlow.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {formatIndianCurrency(cashFlow.netCashFlow)}
              </span>
            </div>
          </div>
        )}
      </PageLayout>

      {/* Account Modal (Create / Edit / Add Sub-account) */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsAccountModalOpen(false)}
          />
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-md z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
              <h2 className="font-bold text-base text-foreground">
                {editingAccount
                  ? 'Edit Ledger Account'
                  : parentAccountForSub
                  ? `Add Sub-account under "${parentAccountForSub.name}"`
                  : 'Create Ledger Account'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  {...accountForm.register('name')}
                  placeholder="e.g. Travel Overhead Expenses"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Financial Category Type *
                </label>
                <select
                  {...accountForm.register('category')}
                  disabled={Boolean(parentAccountForSub)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:opacity-60"
                >
                  <option value="ASSET">Asset (Cash, Bank, Inventory)</option>
                  <option value="LIABILITY">Liability (Loans, Payables)</option>
                  <option value="EQUITY">Equity (Share Capital, Retained Earnings)</option>
                  <option value="REVENUE">Revenue (Product Sales, Service Income)</option>
                  <option value="EXPENSE">Expense (Salary, Rent, Consumables)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Opening Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...accountForm.register('balance', { valueAsNumber: true })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
                >
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
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsJournalModalOpen(false)}
          />
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-3xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20 shrink-0">
              <h2 className="font-bold text-base text-foreground">Post Manual Journal Entry</h2>
              <button
                type="button"
                onClick={() => setIsJournalModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={journalForm.handleSubmit(handleJournalSubmit)}
              className="p-6 overflow-y-auto space-y-6 flex-1 text-left"
            >
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    {...journalForm.register('date')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Reference No / Voucher
                  </label>
                  <input
                    type="text"
                    {...journalForm.register('reference')}
                    placeholder="e.g. JV-001"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Description / Memo
                  </label>
                  <input
                    type="text"
                    {...journalForm.register('description')}
                    placeholder="Travel cost provision"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Voucher Rows */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Debit & Credit Line Items
                  </label>
                  <button
                    type="button"
                    onClick={() => append({ accountId: '', debit: 0, credit: 0 })}
                    className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-3 items-end bg-background/50 p-3 rounded-xl border border-border"
                    >
                      <div className="col-span-6">
                        <LedgerLookup
                          value={watchedLines[index]?.accountId || ''}
                          onChange={(val: any) => journalForm.setValue(`lines.${index}.accountId`, val)}
                          placeholder="Select account..."
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                          Debit
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...journalForm.register(`lines.${index}.debit` as const, {
                            valueAsNumber: true,
                          })}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                          Credit
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...journalForm.register(`lines.${index}.credit` as const, {
                            valueAsNumber: true,
                          })}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2 text-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          disabled={fields.length === 2}
                          className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg disabled:opacity-30 cursor-pointer"
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
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatIndianCurrency(totalDebit)}
                  </span>
                </div>
                <div className="flex justify-between w-64 text-muted-foreground">
                  <span>Total Credit:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatIndianCurrency(totalCredit)}
                  </span>
                </div>
                <div className="flex justify-between w-64 text-xs font-semibold pt-2">
                  <span className="text-muted-foreground">Unbalance Variance:</span>
                  <span
                    className={cn(
                      'tabular-nums',
                      Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                    )}
                  >
                    {formatIndianCurrency(Math.abs(totalDebit - totalCredit))}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Post Journal Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        isOpen={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        onConfirm={confirmDeleteAccount}
        entityName="Account"
        entityId={accountToDelete?.name}
        warningText="This action cannot be undone. Any ledger with historical transactions cannot be deleted."
      />
    </>
  );
};
