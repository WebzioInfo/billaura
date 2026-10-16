import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/NotificationService';
import {
  Plus,
  Landmark,
  Wallet,
  CreditCard,
  Upload,
  CheckCircle2,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Loader2,
  FileText,
  Search,
  ExternalLink,
} from 'lucide-react';
import { apiClient as api } from '@/core/api/apiClient';
import {
  ZohoPageHeader,
  ZohoListTable,
  ZohoStatusText,
} from '@/shared/components/zoho';

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

export const BankingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Selected bank account ID (null means All Accounts)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [txnFilter, setTxnFilter] = useState<'ALL' | 'UNCATEGORISED' | 'CATEGORISED' | 'RECONCILED'>('ALL');
  const [searchTxn, setSearchTxn] = useState<string>('');

  // Add Bank Account Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [accountType, setAccountType] = useState<'CURRENT' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH'>('CURRENT');
  const [accountName, setAccountName] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');

  // Import Statement Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Queries
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['banking-stats'],
    queryFn: async () => {
      const res = await api.get<any>('/finance/bank/stats');
      return res.data || res;
    },
  });

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery<any[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get<any>('/finance/bank/accounts');
      const items = res.data || res || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const { data: allTransactions = [], isLoading: loadingTransactions } = useQuery<any[]>({
    queryKey: ['bank-transactions'],
    queryFn: async () => {
      const res = await api.get<any>('/finance/bank/transactions');
      const items = res.data || res || [];
      return Array.isArray(items) ? items : [];
    },
  });

  // Default select first account once loaded
  React.useEffect(() => {
    if (accounts.length > 0 && selectedAccountId === null) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;
  }, [accounts, selectedAccountId]);

  // Filter transactions for selected account and status
  const filteredTransactions = useMemo(() => {
    let list = allTransactions;
    if (selectedAccountId) {
      list = list.filter((t) => t.bankAccountId === selectedAccountId || t.bankAccount?.id === selectedAccountId);
    }

    if (txnFilter !== 'ALL') {
      list = list.filter((t) => {
        const isRec = Boolean(t.isReconciled || t.reconciled || t.status === 'RECONCILED');
        if (txnFilter === 'RECONCILED') return isRec;
        if (txnFilter === 'UNCATEGORISED') return !t.category && !t.accountId;
        if (txnFilter === 'CATEGORISED') return Boolean(t.category || t.accountId);
        return true;
      });
    }

    if (searchTxn.trim()) {
      const q = searchTxn.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.reference && t.reference.toLowerCase().includes(q)) ||
          (t.type && t.type.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allTransactions, selectedAccountId, txnFilter, searchTxn]);

  // Create Bank Account Mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: accountName.trim(),
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        ifsc: ifsc.trim() || undefined,
        accountType,
        openingBalance: parseFloat(openingBalance) || 0,
        currentBalance: parseFloat(openingBalance) || 0,
      };
      return await api.post('/finance/bank/accounts', payload);
    },
    onSuccess: (newAcc: any) => {
      notification.success('Bank account created successfully');
      setIsAddModalOpen(false);
      setAccountName('');
      setBankName('');
      setAccountNumber('');
      setIfsc('');
      setOpeningBalance('0');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['banking-stats'] });
      if (newAcc?.id) setSelectedAccountId(newAcc.id);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to create bank account');
    },
  });

  // Table Columns
  const columns = [
    {
      key: 'date',
      label: 'DATE',
      width: '12%',
      render: (row: any) => (
        <span className="text-gray-600 text-xs">
          {row.date ? new Date(row.date).toLocaleDateString('en-IN') : '—'}
        </span>
      ),
    },
    {
      key: 'details',
      label: 'DETAILS',
      width: '34%',
      render: (row: any) => (
        <div className="truncate">
          <span className="font-medium text-gray-900 block truncate">
            {row.description || row.narration || row.reference || 'Bank Transaction'}
          </span>
          {row.reference && (
            <span className="text-[11px] text-gray-400 font-mono">Ref: {row.reference}</span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'TYPE',
      width: '14%',
      render: (row: any) => {
        const isCredit = row.type === 'DEPOSIT' || row.type === 'CREDIT' || (Number(row.credit || 0) > 0);
        return (
          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
            {isCredit ? (
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
            )}
            {row.type || (isCredit ? 'Deposit' : 'Withdrawal')}
          </span>
        );
      },
    },
    {
      key: 'debit',
      label: 'DEBITS',
      width: '14%',
      align: 'right' as const,
      render: (row: any) => {
        const amt = row.debit !== undefined ? Number(row.debit) : row.type === 'WITHDRAWAL' ? Number(row.amount) : 0;
        return amt > 0 ? (
          <span className="font-mono text-gray-900 font-medium">{formatINR(amt)}</span>
        ) : (
          <span className="text-gray-300">—</span>
        );
      },
    },
    {
      key: 'credit',
      label: 'CREDITS',
      width: '14%',
      align: 'right' as const,
      render: (row: any) => {
        const amt = row.credit !== undefined ? Number(row.credit) : row.type === 'DEPOSIT' ? Number(row.amount) : 0;
        return amt > 0 ? (
          <span className="font-mono text-emerald-700 font-semibold">{formatINR(amt)}</span>
        ) : (
          <span className="text-gray-300">—</span>
        );
      },
    },
    {
      key: 'status',
      label: 'STATUS',
      width: '12%',
      align: 'center' as const,
      render: (row: any) => {
        const isRec = Boolean(row.isReconciled || row.reconciled || row.status === 'RECONCILED');
        const isCat = Boolean(row.category || row.accountId || row.status === 'CATEGORISED');
        const statusText = isRec ? 'RECONCILED' : isCat ? 'CATEGORISED' : 'UNCATEGORISED';
        return <ZohoStatusText status={statusText} />;
      },
    },
  ];

  const BANK_VIEWS = [
    { id: 'Active Accounts', label: 'Active Accounts' },
    { id: 'All Accounts', label: 'All Accounts' },
  ];

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Zoho Page Header */}
      <ZohoPageHeader
        title="Banking"
        views={BANK_VIEWS}
        activeViewId="Active Accounts"
        onViewChange={() => {}}
        newAction={{
          label: '+ Add Bank/Cash Account',
          onClick: () => setIsAddModalOpen(true),
        }}
        moreActions={[
          { label: 'Import Statement', onClick: () => setIsImportModalOpen(true) },
          { label: 'Reconcile Account', onClick: () => navigate('/reconciliation') },
        ]}
      />

      {/* Account Cards Row */}
      <div className="bg-[#F8F9FB] border-b border-[#E5E7EB] px-6 py-4 overflow-x-auto [scrollbar-width:none]">
        <div className="flex items-center gap-4 min-w-max">
          {accounts.map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            const bal = Number(acc.currentBalance || acc.balance || 0);

            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`w-64 p-3.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-[#408DFB] shadow-sm ring-1 ring-[#408DFB]'
                    : 'bg-white border-[#E5E7EB] hover:border-gray-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded bg-blue-50 text-[#408DFB] flex items-center justify-center shrink-0">
                      {acc.accountType === 'CASH' ? (
                        <Wallet className="w-3.5 h-3.5" />
                      ) : acc.accountType === 'CREDIT_CARD' ? (
                        <CreditCard className="w-3.5 h-3.5" />
                      ) : (
                        <Landmark className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="font-semibold text-xs text-gray-900 truncate">
                      {acc.name}
                    </span>
                  </div>
                  {acc.accountType && (
                    <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      {acc.accountType}
                    </span>
                  )}
                </div>

                <div className="text-base font-bold text-gray-900 font-mono mb-1">
                  {formatINR(bal)}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>{acc.bankName || 'Bank Account'}</span>
                  {acc.accountNumber && (
                    <span className="font-mono">•••• {acc.accountNumber.slice(-4)}</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Account Card */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-48 h-[106px] rounded-lg border border-dashed border-gray-300 hover:border-[#408DFB] bg-white/70 hover:bg-blue-50/20 text-xs text-gray-600 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-50 text-[#408DFB] flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <span className="font-medium text-[#408DFB]">+ New Account</span>
          </button>
        </div>
      </div>

      {/* Per-Account Subheader & Actions */}
      <div className="px-6 py-3 border-b border-[#E5E7EB] bg-white flex flex-wrap items-center justify-between gap-4">
        {/* Left Filter Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 mr-2">
            {selectedAccount ? selectedAccount.name : 'All Accounts'}
          </span>
          <div className="inline-flex rounded border border-[#E5E7EB] bg-gray-50 p-0.5 text-xs">
            {(['ALL', 'UNCATEGORISED', 'CATEGORISED', 'RECONCILED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTxnFilter(tab)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                  txnFilter === tab
                    ? 'bg-white shadow-xs text-[#408DFB] font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTxn}
              onChange={(e) => setSearchTxn(e.target.value)}
              placeholder="Search transactions..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D1D5DB] rounded focus:outline-none focus:ring-1 focus:ring-[#408DFB] w-48"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-[#D1D5DB] hover:bg-gray-50 text-gray-700 rounded flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-gray-500" /> Import Statement
          </button>

          <button
            type="button"
            onClick={() => navigate('/reconciliation')}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-[#D1D5DB] hover:bg-gray-50 text-[#408DFB] rounded flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Reconcile
          </button>
        </div>
      </div>

      {/* Transactions ListTable */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ZohoListTable
          columns={columns}
          data={filteredTransactions}
          keyField={(row: any) => row.id}
          isLoading={loadingTransactions}
          emptyState={<div className="p-12 text-center text-xs text-gray-400">No transactions found for this bank account.</div>}
          pagination={{
            currentPage: 1,
            totalCount: filteredTransactions.length,
            pageSize: filteredTransactions.length || 25,
            onPageChange: () => {},
            onPageSizeChange: () => {},
          }}
        />
      </div>

      {/* Add Bank / Cash Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-gray-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">Add Bank or Cash Account</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Account Type</label>
                <select
                  value={accountType}
                  onChange={(e: any) => setAccountType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB] bg-white"
                >
                  <option value="CURRENT">Current Account</option>
                  <option value="SAVINGS">Savings Account</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="CASH">Petty Cash Account</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. HDFC Operations Current A/c"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
                />
              </div>

              {accountType !== 'CASH' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. 50200012345678"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB] font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">IFSC / Routing Code</label>
                    <input
                      type="text"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value)}
                      placeholder="e.g. HDFC0000240"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB] font-mono uppercase"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-gray-700 font-medium mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB] font-mono text-right"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-1.5 text-xs bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createAccountMutation.mutate()}
                disabled={createAccountMutation.isPending || !accountName.trim()}
                className="px-5 py-1.5 text-xs bg-[#408DFB] text-white rounded font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
              >
                {createAccountMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Statement Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">Import Bank Statement</h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50/50 hover:bg-blue-50/20 transition-colors">
                <Upload className="w-8 h-8 text-[#408DFB] mx-auto mb-2" />
                <p className="font-semibold text-gray-800">Upload statement file (CSV, OFX, QIF, CAMT.053)</p>
                <p className="text-[11px] text-gray-500 mt-1">Maximum file size: 10MB</p>
                <input type="file" className="mt-4 text-xs mx-auto" />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-1.5 text-xs bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
