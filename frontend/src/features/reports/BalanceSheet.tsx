import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export const BalanceSheet = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['reports', 'balance-sheet'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/balance-sheet');
      return res.data || [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Balance Sheet"
        description="Comprehensive asset and liability overview"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        }
      />
      <div className="glass-panel rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={2}><div className="text-center py-8 text-muted-foreground">Loading...</div></TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={2}><div className="text-center py-8 text-muted-foreground">No data found</div></TableCell></TableRow>
            ) : data.map((item: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{item.accountName}</TableCell>
                <TableCell className="text-right font-bold">${item.balance}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
