import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
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

export const BankTransactionsList: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<string>('All Transactions');
  const [search, setSearch] = useState<string>('');

  const { data: transactions = [], isLoading } = useQuery<any[]>({
    queryKey: ['bank-transactions'],
    queryFn: async () => {
      const res = await api.get<any>('/finance/bank/transactions');
      const items = res.data || res || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const filteredTransactions = useMemo(() => {
    let list = transactions;

    if (activeView === 'Uncategorised') {
      list = list.filter((t) => !t.category && !t.accountId);
    } else if (activeView === 'Categorised') {
      list = list.filter((t) => Boolean(t.category || t.accountId));
    } else if (activeView === 'Reconciled') {
      list = list.filter((t) => Boolean(t.isReconciled || t.reconciled || t.status === 'RECONCILED'));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.reference && t.reference.toLowerCase().includes(q)) ||
          (t.bankAccount?.name && t.bankAccount.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [transactions, activeView, search]);

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
      key: 'account',
      label: 'ACCOUNT',
      width: '20%',
      render: (row: any) => (
        <span className="font-semibold text-gray-900 truncate block">
          {row.bankAccount?.name || 'Bank Account'}
        </span>
      ),
    },
    {
      key: 'details',
      label: 'TRANSACTION DETAILS',
      width: '30%',
      render: (row: any) => (
        <div className="truncate">
          <span className="font-medium text-gray-800 block truncate">
            {row.description || row.narration || row.reference || '—'}
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
      width: '12%',
      render: (row: any) => {
        const isCredit = row.type === 'DEPOSIT' || row.type === 'CREDIT' || Number(row.credit || 0) > 0;
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
      key: 'amount',
      label: 'AMOUNT',
      width: '14%',
      align: 'right' as const,
      render: (row: any) => {
        const amt = Number(row.amount || row.debit || row.credit || 0);
        return <span className="font-mono text-gray-900 font-semibold">{formatINR(amt)}</span>;
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

  const TXN_VIEWS = [
    { id: 'All Transactions', label: 'All Transactions' },
    { id: 'Uncategorised', label: 'Uncategorised' },
    { id: 'Categorised', label: 'Categorised' },
    { id: 'Reconciled', label: 'Reconciled' },
  ];

  return (
    <div className="flex flex-col h-full bg-white select-none">
      <ZohoPageHeader
        title="Bank Transactions"
        views={TXN_VIEWS}
        activeViewId={activeView}
        onViewChange={(v) => setActiveView(v)}
        newAction={{
          label: 'Record Transfer',
          onClick: () => navigate('/journal-entries/new'),
        }}
      />

      <div className="flex-1 min-h-0 flex flex-col">
        <ZohoListTable
          columns={columns}
          data={filteredTransactions}
          keyField={(row: any) => row.id}
          isLoading={isLoading}
          emptyState={<div className="p-12 text-center text-xs text-gray-400">No bank transactions found.</div>}
          pagination={{
            currentPage: 1,
            totalCount: filteredTransactions.length,
            pageSize: filteredTransactions.length || 25,
            onPageChange: () => {},
            onPageSizeChange: () => {},
          }}
        />
      </div>
    </div>
  );
};
