import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';

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

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Banking Dashboard"
        description="Manage your bank accounts and monitor liquidity"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Bank Account
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-white border rounded-lg shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Balance</p>
            <p className="text-2xl font-bold">${loadingStats ? '...' : Number(stats?.totalBalance || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="p-6 bg-white border rounded-lg shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Accounts</p>
            <p className="text-2xl font-bold">{loadingStats ? '...' : stats?.activeAccounts || 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Account No</TableHead>
              <TableHead>Current Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingAccounts ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4">Loading accounts...</TableCell></TableRow>
            ) : accounts.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4 text-gray-500">No bank accounts found.</TableCell></TableRow>
            ) : (
              accounts.map((account: any) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.bankName || 'N/A'}</TableCell>
                  <TableCell>{account.accountNumber || 'N/A'}</TableCell>
                  <TableCell className="font-semibold">${Number(account.currentBalance).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{account.status}</span>
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
