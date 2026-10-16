import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as xlsx from 'xlsx';
import notification from '@/core/services/NotificationService';
import {
  Plus,
  Search,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Lock,
  Settings,
  MoreVertical,
  ExternalLink,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { apiClient as api } from '@/core/api/apiClient';
import {
  ZohoPageHeader,
  ZohoListTable,
  ZohoSplitDetail,
  ZohoFormFooter,
} from '@/shared/components/zoho';

// Indian Currency Formatter
const formatINR = (val: number, forceDecimals = true) => {
  const isNegative = val < 0;
  const abs = Math.abs(val);
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: forceDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(abs);
  return isNegative ? `-${formatted}` : formatted;
};

export interface AccountNode {
  id: string;
  name: string;
  code?: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  accountType?: string;
  balance?: number;
  isGroup?: boolean;
  parentId?: string | null;
  parent?: { id: string; name: string; code?: string } | null;
  children?: AccountNode[];
  depth?: number;
  isSystem?: boolean;
  documentsCount?: number;
  description?: string;
  isActive?: boolean;
}

// Explanations for Create Account Modal dark tooltip card
const ACCOUNT_TYPE_TOOLTIPS: Record<string, { label: string; desc: string; normalBalance: string }> = {
  ASSET: {
    label: 'Asset',
    desc: 'Tracks the economic resources owned by your business that will provide future financial benefits, such as cash, bank accounts, inventory, and accounts receivable.',
    normalBalance: 'Debit (Dr)',
  },
  LIABILITY: {
    label: 'Liability',
    desc: 'Tracks financial obligations, debts, loans, vendor payables, and statutory taxes owed to third parties or statutory authorities.',
    normalBalance: 'Credit (Cr)',
  },
  EQUITY: {
    label: 'Equity',
    desc: 'Represents the owner’s net residual stake in the business, including initial capital introduced, drawings, and accumulated retained earnings.',
    normalBalance: 'Credit (Cr)',
  },
  REVENUE: {
    label: 'Income / Revenue',
    desc: 'Tracks gross inflows from core operating activities including product sales, service consulting fees, discounts earned, and interest income.',
    normalBalance: 'Credit (Cr)',
  },
  EXPENSE: {
    label: 'Expense',
    desc: 'Tracks operational expenditures, bills, salaries, rent, and overhead costs incurred in running business operations.',
    normalBalance: 'Debit (Dr)',
  },
};

export const ChartOfAccounts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Active View Switcher: Active Accounts, All Accounts, Inactive Accounts, Transaction Locking
  const [activeView, setActiveView] = useState<string>('Active Accounts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<AccountNode | null>(null);
  const [currencyMode, setCurrencyMode] = useState<'BCY' | 'FCY'>('BCY');

  // Tree expansion state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Create / Edit Account Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<AccountNode | null>(null);
  const [modalCategory, setModalCategory] = useState<string>('EXPENSE');
  const [modalName, setModalName] = useState<string>('');
  const [modalCode, setModalCode] = useState<string>('');
  const [modalParentId, setModalParentId] = useState<string>('');
  const [modalDescription, setModalDescription] = useState<string>('');
  const [modalWatchlist, setModalWatchlist] = useState<boolean>(false);

  // Transaction Locking State
  const [lockDate, setLockDate] = useState<string>('2026-03-31');
  const [lockReason, setLockReason] = useState<string>('Financial year end closing audit');
  const [isLocked, setIsLocked] = useState<boolean>(true);

  // Queries: Chart of Accounts Tree
  const { data: treeData = [], isLoading } = useQuery<AccountNode[]>({
    queryKey: ['accounts-tree'],
    queryFn: async () => {
      const res = await api.get<any>('/accounts/tree');
      return res.data || res || [];
    },
  });

  // Flat Accounts Lookup for parent account selector
  const { data: flatAccounts = [] } = useQuery<AccountNode[]>({
    queryKey: ['accounts-lookup-full'],
    queryFn: async () => {
      const res = await api.get<any>('/accounts/lookup', { params: { limit: 250 } });
      return res.data || res || [];
    },
  });

  // Recent transactions for the selected account in SplitDetail
  const { data: inquiryData, isLoading: loadingInquiry } = useQuery({
    queryKey: ['account-inquiry', selectedAccount?.id],
    queryFn: async () => {
      if (!selectedAccount?.id) return null;
      const res = await api.get<any>(`/accounts/${selectedAccount.id}/inquiry`, {
        params: { limit: 15 },
      });
      return res.data || res;
    },
    enabled: Boolean(selectedAccount?.id),
  });

  // Expand all parent nodes by default when tree data loads
  useEffect(() => {
    if (treeData && treeData.length > 0 && expandedIds.size === 0) {
      const initial = new Set<string>();
      const addGroups = (nodes: AccountNode[]) => {
        nodes.forEach((n) => {
          if (n.children && n.children.length > 0) {
            initial.add(n.id);
            addGroups(n.children);
          }
        });
      };
      addGroups(treeData);
      setExpandedIds(initial);
    }
  }, [treeData]);

  // Toggle expand/collapse for a parent account node
  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Flatten tree based on active view, search, and expansion state
  const flattenedAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result: AccountNode[] = [];

    const walk = (nodes: AccountNode[], depth = 0, parentName = '') => {
      nodes.forEach((node) => {
        const matchesSearch =
          !q ||
          node.name.toLowerCase().includes(q) ||
          (node.code && node.code.toLowerCase().includes(q)) ||
          node.category.toLowerCase().includes(q);

        const isActive = (node as any).isActive !== false;
        const matchesView =
          activeView === 'All Accounts'
            ? true
            : activeView === 'Inactive Accounts'
            ? !isActive
            : isActive;

        const hasChildren = Boolean(node.children && node.children.length > 0);
        const isExpanded = q ? true : expandedIds.has(node.id);

        if (matchesSearch && matchesView) {
          result.push({
            ...node,
            depth,
            parent: parentName ? ({ name: parentName } as any) : node.parent,
          });
        }

        if (hasChildren && (isExpanded || q)) {
          walk(node.children!, depth + 1, node.name);
        }
      });
    };

    walk(treeData);
    return result;
  }, [treeData, searchQuery, activeView, expandedIds]);

  // Handle open create account modal
  const handleOpenCreate = (parentAcc?: AccountNode) => {
    setEditingAccount(null);
    setModalCategory(parentAcc ? parentAcc.category : 'EXPENSE');
    setModalName('');
    setModalCode('');
    setModalParentId(parentAcc ? parentAcc.id : '');
    setModalDescription('');
    setModalWatchlist(false);
    setIsModalOpen(true);
  };

  // Handle open edit account modal
  const handleOpenEdit = (acc: AccountNode) => {
    setEditingAccount(acc);
    setModalCategory(acc.category);
    setModalName(acc.name);
    setModalCode(acc.code || '');
    setModalParentId(acc.parentId || '');
    setModalDescription(acc.description || '');
    setModalWatchlist(false);
    setIsModalOpen(true);
  };

  // Create / Update Account Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: modalName.trim(),
        code: modalCode.trim() || undefined,
        category: modalCategory,
        parentId: modalParentId || undefined,
        description: modalDescription.trim() || undefined,
      };

      if (editingAccount) {
        return await api.patch(`/accounts/${editingAccount.id}`, payload);
      }
      return await api.post('/accounts', payload);
    },
    onSuccess: () => {
      notification.success(
        editingAccount ? 'Account updated successfully!' : 'New account created successfully!'
      );
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-lookup-full'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save account');
    },
  });

  // Delete Account Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/accounts/${id}`);
    },
    onSuccess: () => {
      notification.success('Account deleted successfully');
      setSelectedAccount(null);
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-lookup-full'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete account');
    },
  });

  // Export to Excel
  const handleExport = () => {
    if (!flattenedAccounts.length) {
      notification.warning('No accounts to export');
      return;
    }
    const data = flattenedAccounts.map((a) => ({
      'Account Name': `${'  '.repeat(a.depth || 0)}${a.name}`,
      'Account Code': a.code || '',
      'Account Type': a.category,
      'Parent Account': a.parent?.name || '',
      Balance: a.balance || 0,
    }));
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Chart of Accounts');
    xlsx.writeFile(workbook, `Chart_of_Accounts_${new Date().toISOString().split('T')[0]}.xlsx`);
    notification.success('Exported Chart of Accounts to Excel');
  };

  // Convert accounts to SplitDetail items
  const splitItems = useMemo(() => {
    return flattenedAccounts.map((acc) => {
      const bal = Number(acc.balance || 0);
      const isDr = acc.category === 'ASSET' || acc.category === 'EXPENSE' ? bal >= 0 : bal < 0;
      return {
        id: acc.id,
        name: acc.name,
        number: acc.code || acc.category,
        date: acc.category,
        amount: `${formatINR(bal)} (${isDr ? 'Dr' : 'Cr'})`,
        status: acc.category,
      };
    });
  }, [flattenedAccounts]);

  // Compute balance indicator string for selected account
  const selectedBalanceString = useMemo(() => {
    if (!selectedAccount) return '';
    const bal = Number(selectedAccount.balance || 0);
    const isDr =
      selectedAccount.category === 'ASSET' || selectedAccount.category === 'EXPENSE'
        ? bal >= 0
        : bal < 0;
    return `${formatINR(bal)} (${isDr ? 'Dr' : 'Cr'})`;
  }, [selectedAccount]);

  // Recent transactions list from inquiryData
  const recentTransactions = useMemo(() => {
    const list = inquiryData?.transactions || inquiryData?.lines || inquiryData?.data || [];
    return Array.isArray(list) ? list.slice(0, 8) : [];
  }, [inquiryData]);

  const ACCOUNT_VIEWS = [
    { id: 'Active Accounts', label: 'Active Accounts' },
    { id: 'All Accounts', label: 'All Accounts' },
    { id: 'Inactive Accounts', label: 'Inactive Accounts' },
    { id: 'Transaction Locking', label: 'Transaction Locking' },
  ];

  // Render Transaction Locking View
  if (activeView === 'Transaction Locking') {
    return (
      <div className="flex flex-col h-full bg-white select-none">
        <ZohoPageHeader
          title="Transaction Locking"
          views={ACCOUNT_VIEWS}
          activeViewId={activeView}
          onViewChange={(view) => setActiveView(view)}
        />
        <div className="flex-1 max-w-3xl p-8 space-y-6">
          <div className="flex items-start gap-4 p-4 bg-blue-50/70 border border-blue-200 rounded text-xs text-blue-900">
            <ShieldCheck className="w-5 h-5 text-[#408DFB] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Lock Accounting Transactions</p>
              <p className="text-gray-600 leading-relaxed">
                Once transactions are locked, users will not be allowed to create, edit, or delete
                any transactions on or before the specified lock date. This prevents accidental
                modifications after fiscal year end or statutory audit signoff.
              </p>
            </div>
          </div>

          <div className="border border-[#E5E7EB] rounded-md p-6 space-y-5 bg-[#F8F9FB]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
                  Locking Status
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
                      isLocked
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {isLocked ? 'Transactions Locked' : 'Transactions Unlocked'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsLocked(!isLocked);
                  notification.success(
                    isLocked ? 'Transactions have been unlocked' : 'Transactions have been locked'
                  );
                }}
                className={`px-4 py-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  isLocked
                    ? 'bg-white border border-[#D1D5DB] text-gray-700 hover:bg-gray-100'
                    : 'bg-[#408DFB] text-white hover:bg-blue-600'
                }`}
              >
                {isLocked ? 'Unlock Transactions' : 'Lock Transactions'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-[#E5E7EB]">
              <div>
                <label className="block text-gray-700 font-medium mb-1.5">
                  Lock transactions on and before
                </label>
                <input
                  type="date"
                  value={lockDate}
                  disabled={!isLocked}
                  onChange={(e) => setLockDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1.5">
                  Reason for locking
                </label>
                <input
                  type="text"
                  value={lockReason}
                  disabled={!isLocked}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="e.g. FY 2025-26 Tax Audit Complete"
                  className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render SplitDetail View when an account is selected
  if (selectedAccount) {
    return (
      <ZohoSplitDetail
        moduleTitle="Active Accounts"
        items={splitItems}
        selectedId={selectedAccount.id}
        onSelect={(id) => {
          const acc = flattenedAccounts.find((a) => a.id === id);
          if (acc) setSelectedAccount(acc);
        }}
        onNew={() => handleOpenCreate()}
        onClose={() => setSelectedAccount(null)}
        detailTitle={selectedAccount.name}
        detailActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenEdit(selectedAccount)}
              className="px-3 py-1 bg-white border border-[#D1D5DB] hover:bg-gray-50 text-gray-700 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-gray-500" /> Edit
            </button>
            <button
              type="button"
              onClick={() => navigate(`/accounting/ledger/${selectedAccount.id}`)}
              className="px-3 py-1 bg-white border border-[#D1D5DB] hover:bg-gray-50 text-[#408DFB] rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Full Ledger
            </button>
          </div>
        }
      >
        <div className="p-6 space-y-6 text-xs text-gray-700">
          {/* Header Block: Type (small) + Name (large) */}
          <div className="border-b border-[#E5E7EB] pb-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              {selectedAccount.category} ACCOUNT
            </span>
            <h2 className="text-xl font-bold text-[#1E2540]">{selectedAccount.name}</h2>
            {selectedAccount.code && (
              <span className="inline-block mt-1 text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                Code: {selectedAccount.code}
              </span>
            )}
          </div>

          {/* CLOSING BALANCE Large Blue */}
          <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-md p-4">
            <div className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider mb-1">
              Closing Balance
            </div>
            <div className="text-2xl font-bold text-[#408DFB] font-mono tracking-tight">
              {selectedBalanceString}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Normal balance: {ACCOUNT_TYPE_TOOLTIPS[selectedAccount.category]?.normalBalance || 'Debit'}
            </div>
          </div>

          {/* Description */}
          {selectedAccount.description && (
            <div className="space-y-1">
              <span className="font-semibold text-gray-600">Description</span>
              <p className="text-gray-700 leading-relaxed">{selectedAccount.description}</p>
            </div>
          )}

          {/* Dashed divider */}
          <div className="border-t border-dashed border-[#D1D5DB]" />

          {/* Recent Transactions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Transactions</h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">Currency:</span>
                <div className="inline-flex rounded border border-[#D1D5DB] bg-gray-50 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCurrencyMode('BCY')}
                    className={`px-2 py-0.5 rounded font-medium ${
                      currencyMode === 'BCY' ? 'bg-white shadow-xs text-[#408DFB]' : 'text-gray-500'
                    }`}
                  >
                    BCY (₹)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrencyMode('FCY')}
                    className={`px-2 py-0.5 rounded font-medium ${
                      currencyMode === 'FCY' ? 'bg-white shadow-xs text-[#408DFB]' : 'text-gray-500'
                    }`}
                  >
                    FCY
                  </button>
                </div>
              </div>
            </div>

            {loadingInquiry ? (
              <div className="py-8 text-center text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#408DFB] mb-1" />
                <span>Loading recent transactions...</span>
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-[#E5E7EB] rounded bg-gray-50 text-gray-500">
                No transactions recorded for this account.
              </div>
            ) : (
              <div className="border border-[#E5E7EB] rounded overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-gray-500 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Transaction Details</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Debit</th>
                      <th className="py-2 px-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {recentTransactions.map((tx: any, idx: number) => (
                      <tr key={tx.id || idx} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-600">
                          {tx.date ? new Date(tx.date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="py-2 px-3 font-medium text-gray-800">
                          {tx.narration || tx.description || tx.reference || 'Journal Entry'}
                        </td>
                        <td className="py-2 px-3 text-gray-500">{tx.voucherType || 'Journal'}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">
                          {tx.debit ? formatINR(Number(tx.debit)) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">
                          {tx.credit ? formatINR(Number(tx.credit)) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="text-right pt-2">
              <button
                type="button"
                onClick={() => navigate(`/accounting/ledger/${selectedAccount.id}`)}
                className="text-xs text-[#408DFB] hover:underline font-semibold"
              >
                Show more details →
              </button>
            </div>
          </div>
        </div>
      </ZohoSplitDetail>
    );
  }

  // Define Columns for ZohoListTable
  const columns = [
    {
      key: 'lock',
      label: '',
      width: '40px',
      align: 'center' as const,
      render: (row: AccountNode) => {
        if (row.isSystem || row.depth === 0) {
          return (
            <span title="System Account">
              <Lock className="w-3.5 h-3.5 text-gray-400 mx-auto" />
            </span>
          );
        }
        return (
          <input
            type="checkbox"
            className="rounded text-[#408DFB] cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        );
      },
    },
    {
      key: 'name',
      label: 'ACCOUNT NAME',
      width: '35%',
      render: (row: AccountNode) => {
        const indentPx = (row.depth || 0) * 20;
        const hasChildren = Boolean(row.children && row.children.length > 0);
        const isExpanded = expandedIds.has(row.id);

        return (
          <div
            style={{ paddingLeft: `${indentPx}px` }}
            className="flex items-center gap-1.5 py-1"
          >
            {row.depth && row.depth > 0 ? (
              <span className="text-gray-300 font-mono text-xs select-none">└──</span>
            ) : null}

            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(row.id, e)}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-500"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}

            {hasChildren ? (
              <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : null}

            <span
              onClick={() => setSelectedAccount(row)}
              className="text-[#408DFB] hover:underline font-medium cursor-pointer truncate"
            >
              {row.name}
            </span>
          </div>
        );
      },
    },
    {
      key: 'code',
      label: 'ACCOUNT CODE',
      width: '15%',
      render: (row: AccountNode) => (
        <span className="font-mono text-xs text-gray-600">{row.code || '—'}</span>
      ),
    },
    {
      key: 'category',
      label: 'ACCOUNT TYPE',
      width: '18%',
      render: (row: AccountNode) => (
        <span className="text-xs text-gray-700 font-medium">
          {ACCOUNT_TYPE_TOOLTIPS[row.category]?.label || row.category}
        </span>
      ),
    },
    {
      key: 'documents',
      label: 'DOCUMENTS',
      width: '12%',
      align: 'center' as const,
      render: (row: AccountNode) => (
        <span className="text-[11px] text-gray-400">
          {row.documentsCount ? `${row.documentsCount} docs` : '—'}
        </span>
      ),
    },
    {
      key: 'parent',
      label: 'PARENT ACCOUNT NAME',
      width: '15%',
      render: (row: AccountNode) => (
        <span className="text-xs text-gray-500 truncate">{row.parent?.name || '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '50px',
      align: 'right' as const,
      render: (row: AccountNode) => {
        if (row.isSystem) return null;
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => handleOpenCreate(row)}
              title="Add sub-account"
              className="p-1 text-gray-400 hover:text-[#408DFB] rounded"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              title="Edit Account"
              className="p-1 text-gray-400 hover:text-gray-700 rounded"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Zoho Page Header with View Switcher */}
      <ZohoPageHeader
        title={activeView}
        views={ACCOUNT_VIEWS}
        activeViewId={activeView}
        onViewChange={(view) => setActiveView(view)}
        newAction={{
          label: '+ New Account',
          onClick: () => handleOpenCreate(),
        }}
        moreActions={[
          { label: 'Sort by Name', onClick: () => {} },
          { label: 'Sort by Code', onClick: () => {} },
          { label: 'Sort by Type', onClick: () => {} },
          { label: 'Import Chart of Accounts', onClick: () => {} },
          { label: 'Export Chart of Accounts', onClick: handleExport },
        ]}
      />

      {/* Main List Table */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ZohoListTable
          columns={columns}
          data={flattenedAccounts}
          keyField={(row: AccountNode) => row.id}
          isLoading={isLoading}
          onRowClick={(row) => setSelectedAccount(row)}
          emptyState={<div className="p-12 text-center text-xs text-gray-400">No accounts found in this view.</div>}
          pagination={{
            currentPage: 1,
            totalCount: flattenedAccounts.length,
            pageSize: flattenedAccounts.length || 25,
            onPageChange: () => {},
            onPageSizeChange: () => {},
          }}
        />
      </div>

      {/* Create / Edit Account Modal (Side-by-side with dark tooltip explanation card) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">
                {editingAccount ? 'Edit Account' : 'Create Account'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Left Inputs + Right Dark Card */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 space-y-4">
                {/* Account Type */}
                <div>
                  <label className="block text-gray-700 font-medium mb-1">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB] bg-white"
                  >
                    <option value="ASSET">Asset</option>
                    <option value="LIABILITY">Liability</option>
                    <option value="EQUITY">Equity</option>
                    <option value="REVENUE">Income / Revenue</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>

                {/* Account Name */}
                <div>
                  <label className="block text-gray-700 font-medium mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    placeholder="e.g. Traveling Expenses"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
                  />
                </div>

                {/* Account Code with dashed-underline label */}
                <div>
                  <label className="inline-block text-gray-700 font-medium mb-1 border-b border-dashed border-gray-400 cursor-help" title="Numeric identifier for GL indexing">
                    Account Code
                  </label>
                  <input
                    type="text"
                    value={modalCode}
                    onChange={(e) => setModalCode(e.target.value)}
                    placeholder="e.g. 6020"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
                  />
                </div>

                {/* Parent Account (when sub-account is allowed) */}
                <div>
                  <label className="block text-gray-700 font-medium mb-1">
                    Parent Account
                  </label>
                  <select
                    value={modalParentId}
                    onChange={(e) => setModalParentId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB] bg-white"
                  >
                    <option value="">None (Top-Level Account)</option>
                    {flatAccounts
                      .filter((a) => a.category === modalCategory && a.id !== editingAccount?.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} {a.code ? `(${a.code})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Description (max 500) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-700 font-medium">Description</label>
                    <span className="text-[11px] text-gray-400">{modalDescription.length}/500</span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                    placeholder="Provide additional details regarding account scope..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB] resize-none"
                  />
                </div>

                {/* Watchlist Checkbox */}
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={modalWatchlist}
                    onChange={(e) => setModalWatchlist(e.target.checked)}
                    className="rounded text-[#408DFB]"
                  />
                  <span>Add to the watchlist on my dashboard</span>
                </label>
              </div>

              {/* Right Side Dark Tooltip Card */}
              <div className="bg-[#1E2540] text-white p-4 rounded-md shadow-md text-xs space-y-3">
                <div className="flex items-center gap-1.5 text-blue-300 font-semibold uppercase text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{ACCOUNT_TYPE_TOOLTIPS[modalCategory]?.label}</span>
                </div>
                <p className="text-gray-200 leading-relaxed text-[11px]">
                  {ACCOUNT_TYPE_TOOLTIPS[modalCategory]?.desc}
                </p>
                <div className="pt-2 border-t border-gray-700/60 text-[11px] text-gray-400">
                  Normal Balance:{' '}
                  <span className="text-white font-semibold">
                    {ACCOUNT_TYPE_TOOLTIPS[modalCategory]?.normalBalance}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 text-xs bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !modalName.trim()}
                className="px-5 py-1.5 text-xs bg-[#408DFB] text-white rounded font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
              >
                {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
