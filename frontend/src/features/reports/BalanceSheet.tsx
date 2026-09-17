import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageContainer, EmptyState, LoadingState, AmountText } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { Download, Landmark } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export const BalanceSheet = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['reports', 'balance-sheet'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/balance-sheet');
      return res.data || [];
    }
  });

  const handleExport = () => {
    if (!data.length) return;
    const headers = ['Account Name', 'Balance'];
    const rows = data.map((item: any) => [
      `"${(item.accountName || '').replace(/"/g, '""')}"`,
      Number(item.balance || 0).toFixed(2),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `balance_sheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Balance Sheet"
        description="Comprehensive asset and liability overview"
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
          icon={<Landmark className="w-8 h-8 text-muted-foreground" />}
          title="No data found"
          description="Balance sheet postings will generate when double-entry journals are recorded."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/15 border-b border-border">
                <TableHead className="font-semibold py-4 px-6">Account Name</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: any, i: number) => (
                <TableRow key={i} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-medium py-4 px-6 text-foreground">{item.accountName}</TableCell>
                  <TableCell className="text-right py-4 px-6">
                    <AmountText value={item.balance} isTotal={item.accountName.toLowerCase().includes('total')} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
};
