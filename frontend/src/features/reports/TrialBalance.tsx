import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageContainer, EmptyState, LoadingState, AmountText } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { Download, BarChart2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export const TrialBalance = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['reports', 'trial-balance'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/trial-balance');
      return res.data || [];
    }
  });

  const handleExport = () => {
    if (!data.length) return;
    const headers = ['Account Name', 'Debit', 'Credit'];
    const rows = data.map((item: any) => [
      `"${(item.accountName || '').replace(/"/g, '""')}"`,
      Number(item.debit || 0).toFixed(2),
      Number(item.credit || 0).toFixed(2),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trial_balance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageContainer
      maxWidth="7xl"
      isLoading={loading && data.length === 0}
      loadingTitle="Loading Trial Balance..."
      loadingDescription="Compiling general ledger balances..."
    >
      <PageHeader
        title="Trial Balance"
        description="Real-time trial balance reporting"
        primaryAction={
          <Button 
            onClick={handleExport}
            disabled={!data.length || loading}
            className="flex items-center gap-2 font-bold px-5"
            variant="outline"
          >
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />
      {loading ? (
        <LoadingState variant="table" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<BarChart2 className="w-8 h-8 text-muted-foreground" />}
          title="No data found"
          description="Trial balance ledger balances will populate when transactions are registered."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-foreground">{item.accountName}</TableCell>
                <TableCell className="text-right">
                  <AmountText value={item.debit} className={Number(item.debit) > 0 ? "text-foreground font-semibold" : "text-muted-foreground opacity-40 font-normal"} />
                </TableCell>
                <TableCell className="text-right">
                  <AmountText value={item.credit} className={Number(item.credit) > 0 ? "text-foreground font-semibold" : "text-muted-foreground opacity-40 font-normal"} />
                </TableCell>
              </TableRow>
            ))}
            {data.length > 0 && (
              <TableRow isTotalRow>
                <TableCell className="font-semibold text-foreground">Total</TableCell>
                <TableCell className="text-right">
                  <AmountText value={data.reduce((acc: number, item: any) => acc + (Number(item.debit) || 0), 0)} isTotal />
                </TableCell>
                <TableCell className="text-right">
                  <AmountText value={data.reduce((acc: number, item: any) => acc + (Number(item.credit) || 0), 0)} isTotal />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </PageContainer>
  );
};
