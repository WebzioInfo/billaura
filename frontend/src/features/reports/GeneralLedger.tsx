import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { Button } from '@/shared/components/ui/Button';
import { CurrencyCell, DateCell } from '@/shared/components/ui/data-table/cells';
import { PageContainer, PageLoader } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export const GeneralLedger = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['reports', 'general-ledger'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/general-ledger');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  if (loading && data.length === 0) {
    return (
      <PageContainer maxWidth="7xl">
        <PageLoader title="Loading General Ledger..." description="Fetching full transaction history across accounts..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="General Ledger"
        description="Detailed transaction history across all accounts"
        primaryAction={
          <Button variant="outline" className="flex items-center gap-2 font-medium">
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data found</TableCell></TableRow>
          ) : data.map((item: any, i: number) => (
            <TableRow key={i}>
              <TableCell><DateCell value={item.date} /></TableCell>
              <TableCell className="font-medium text-foreground">{item.accountName}</TableCell>
              <TableCell className="text-muted-foreground">{item.description}</TableCell>
              <TableCell className="text-right">
                <CurrencyCell amount={Number(item.debit) || 0} />
              </TableCell>
              <TableCell className="text-right">
                <CurrencyCell amount={Number(item.credit) || 0} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageContainer>
  );
};


