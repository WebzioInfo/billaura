import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { KpiCard, Button, StatusBadge, CurrencyCell, Pagination } from '@/shared/components/ui';
import { usePagination } from '@/shared/hooks/usePagination';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BankingDashboard = () => {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['banking-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/bank/stats');
      return res.data;
    }
  });

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/bank/accounts');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  // TODO: Endpoint /finance/bank/accounts should support server-side pagination (?page=&limit=)
  const {
    page,
    limit,
    paginatedData,
    totalPages,
    totalItems,
    setPage,
    setLimit,
  } = usePagination({
    data: accounts,
    tableKey: 'bank_accounts',
    defaultLimit: 25,
  });

  return (
    <PageLayout>
      <PageHeader
        title="Cash & Bank"
        count={accounts.length}
        primaryAction={
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-1.5" /> Add Bank Account
          </Button>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
        <KpiCard
          label="Total Balance"
          value={
            loadingStats
              ? '...'
              : `₹${Number(stats?.totalBalance || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
          }
          indicatorDot="collected"
          isLoading={loadingStats}
        />
        <KpiCard
          label="Active Accounts"
          value={loadingStats ? '...' : String(stats?.activeAccounts || 0)}
          indicatorDot="outstanding"
          isLoading={loadingStats}
        />
      </div>

      {/* Table Card (The single card, fully dark-theme aware) */}
      <div className="flex-1 min-h-0 flex flex-col bg-surface dark:bg-[#17161C] border border-border rounded-xl shadow-xs overflow-hidden mt-3">
        <div className="flex-1 min-h-0 overflow-auto scrollbar-overlay">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead className="sticky top-0 z-20 bg-[#34303F] dark:bg-[#1E1C26] text-white font-medium select-none shadow-xs h-12">
              <tr>
                <th className="pl-6 pr-4 py-3 text-white font-medium text-[14px]">Account Name</th>
                <th className="px-4 py-3 text-white font-medium text-[14px]">Bank</th>
                <th className="px-4 py-3 text-white font-medium text-[14px]">Account No</th>
                <th className="px-4 py-3 text-white font-medium text-[14px] text-right">Current Balance</th>
                <th className="pr-6 pl-4 py-3 text-white font-medium text-[14px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-none text-[14px]">
              {loadingAccounts ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    Loading accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    No bank accounts found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((account: any, idx: number) => {
                  const isEven = idx % 2 === 1;
                  return (
                    <tr
                      key={account.id}
                      className={cn(
                        'h-[52px] border-b border-border/30 transition-colors duration-120',
                        isEven
                          ? 'bg-[#F9FAFB] dark:bg-[#1C1B22] hover:bg-[#F3F4F6] dark:hover:bg-[#24232C]'
                          : 'bg-white dark:bg-[#17161C] hover:bg-[#F3F4F6] dark:hover:bg-[#24232C]'
                      )}
                    >
                      <td className="pl-6 pr-4 py-2 font-medium text-foreground">{account.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{account.bankName || '—'}</td>
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {account.accountNumber || '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <CurrencyCell
                          amount={Number(account.currentBalance || 0)}
                          className="tabular-nums font-semibold text-foreground"
                        />
                      </td>
                      <td className="pr-6 pl-4 py-2 text-center">
                        <StatusBadge status={account.status || 'ACTIVE'} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          entityName="bank accounts"
        />
      </div>
    </PageLayout>
  );
};
