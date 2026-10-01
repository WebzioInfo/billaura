import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, StatusBadge, DateCell, CurrencyCell, Button } from '@/shared/components/ui';
import { Pagination } from '@/shared/components/ui/Pagination';
import { usePagination } from '@/shared/hooks/usePagination';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BankTransactionsList = () => {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/bank/transactions');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  // TODO: Endpoint /finance/bank/transactions should support server-side pagination (?page=&limit=)
  const {
    page,
    limit,
    paginatedData,
    totalPages,
    totalItems,
    setPage,
    setLimit,
  } = usePagination({
    data: transactions,
    tableKey: 'bank_transactions',
    defaultLimit: 25,
  });

  return (
    <PageLayout>
      <PageHeader
        title="Bank Transactions"
        count={transactions.length}
        primaryAction={
          <Button variant="primary">
            <ArrowLeftRight className="w-4 h-4 mr-1.5" /> Record Transfer
          </Button>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col bg-surface dark:bg-[#17161C] border border-border rounded-xl shadow-xs overflow-hidden mt-3">
        <div className="flex-1 min-h-0 overflow-auto scrollbar-overlay">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead className="sticky top-0 z-20 bg-[#34303F] dark:bg-[#1E1C26] text-white font-medium select-none shadow-xs h-12">
              <tr>
                <th className="pl-6 pr-4 py-3 text-white font-medium text-[14px]">Date</th>
                <th className="px-4 py-3 text-white font-medium text-[14px]">Account</th>
                <th className="px-4 py-3 text-white font-medium text-[14px]">Type</th>
                <th className="px-4 py-3 text-white font-medium text-[14px]">Description</th>
                <th className="px-4 py-3 text-white font-medium text-[14px] text-right">Amount</th>
                <th className="pr-6 pl-4 py-3 text-white font-medium text-[14px] text-center">Reconciled</th>
              </tr>
            </thead>
            <tbody className="divide-none text-[14px]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((txn: any, idx: number) => {
                  const isEven = idx % 2 === 1;
                  return (
                    <tr
                      key={txn.id}
                      className={cn(
                        'h-[52px] border-b border-border/30 transition-colors duration-120',
                        isEven
                          ? 'bg-[#F9FAFB] dark:bg-[#1C1B22] hover:bg-[#F3F4F6] dark:hover:bg-[#24232C]'
                          : 'bg-white dark:bg-[#17161C] hover:bg-[#F3F4F6] dark:hover:bg-[#24232C]'
                      )}
                    >
                      <td className="pl-6 pr-4 py-2">
                        <DateCell date={txn.date} />
                      </td>
                      <td className="px-4 py-2 font-medium text-foreground">{txn.bankAccount?.name || '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{txn.type}</td>
                      <td className="px-4 py-2 text-muted-foreground">{txn.description || txn.reference || '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <CurrencyCell amount={Number(txn.amount || 0)} className="tabular-nums font-semibold text-foreground" />
                      </td>
                      <td className="pr-6 pl-4 py-2 text-center">
                        <StatusBadge status={txn.isReconciled ? 'RECONCILED' : 'PENDING'} />
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
          entityName="transactions"
        />
      </div>
    </PageLayout>
  );
};
