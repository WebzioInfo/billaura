import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';

export const BankTransactionsList = () => {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/bank/transactions');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Bank Transactions"
        description="View all deposits, withdrawals, and transfers"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <ArrowLeftRight className="w-4 h-4" /> Record Transfer
          </button>
        }
      />

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reconciled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4">Loading transactions...</TableCell></TableRow>
            ) : transactions.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4 text-gray-500">No transactions found.</TableCell></TableRow>
            ) : (
              transactions.map((txn: any) => (
                <TableRow key={txn.id}>
                  <TableCell>{new Date(txn.date).toLocaleDateString()}</TableCell>
                  <TableCell>{txn.bankAccount?.name || 'Unknown'}</TableCell>
                  <TableCell>{txn.type}</TableCell>
                  <TableCell>{txn.description || txn.reference || '-'}</TableCell>
                  <TableCell className="font-semibold">${Number(txn.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    {txn.isReconciled ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Yes</span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
