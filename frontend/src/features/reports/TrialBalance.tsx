import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/components/ui/LayoutComponents';
import apiClient from '@/services/api';
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

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Trial Balance"
        description="Real-time trial balance reporting"
        primaryAction={
          <Button 
            onClick={() => {}}
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-semibold py-4 px-6">Account Name</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-right">Debit</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: any, i: number) => (
                <TableRow key={i} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-medium py-4 px-6 text-foreground">{item.accountName}</TableCell>
                  <TableCell className="text-right py-4 px-6">₹{Number(item.debit || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right py-4 px-6">₹{Number(item.credit || 0).toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
};
