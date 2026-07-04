import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export const DayBook = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['reports', 'day-book'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/day-book');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Day Book"
        description="Daily transaction register for all accounting entries"
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
              <TableHead>Date</TableHead>
              <TableHead>Voucher No</TableHead>
              <TableHead>Voucher Type</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6}><div className="text-center py-8 text-muted-foreground">Loading...</div></TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={6}><div className="text-center py-8 text-muted-foreground">No entries for today</div></TableCell></TableRow>
            ) : data.map((item: any, i) => (
              <TableRow key={i}>
                <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium text-accent">{item.voucherNo}</TableCell>
                <TableCell>{item.voucherType}</TableCell>
                <TableCell>{item.accountName}</TableCell>
                <TableCell className="text-right text-green-600">${item.debit}</TableCell>
                <TableCell className="text-right text-red-600">${item.credit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
