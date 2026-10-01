import React from 'react';
import { Plus, Package } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/shared/components/ui/LayoutComponents';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { StatusBadge, DateCell } from '@/shared/components/ui';

export const GoodsReceiptsList = () => {
  const navigate = useNavigate();
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['goods-receipts'],
    queryFn: async () => {
      const res = await apiClient.get('/goods-receipts');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Goods Receipts"
        description="Manage stock incoming from vendors"
        primaryAction={
          <Button 
            onClick={() => navigate('/goods-receipts/new')}
            className="flex items-center gap-2 font-bold px-5"
            variant="primary"
          >
            <Plus className="w-4 h-4" /> New Goods Receipt
          </Button>
        }
      />
      {loading ? (
        <LoadingState variant="table" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-muted-foreground" />}
          title="No goods receipts found"
          description="Create your first goods receipt to track incoming vendor stock."
          actionLabel="New Goods Receipt"
          onActionClick={() => navigate('/goods-receipts/new')}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6 pr-4">Receipt No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead align="right">Total Items</TableHead>
              <TableHead align="center" className="pr-6 pl-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="pl-6 pr-4 font-mono font-medium text-foreground">{item.receiptNo}</TableCell>
                <DateCell date={item.date} />
                <TableCell className="font-medium text-foreground">{item.businessPartner?.name || '—'}</TableCell>
                <TableCell align="right" className="text-muted-foreground">{item.items?.length || 0} lines</TableCell>
                <TableCell align="center" className="pr-6 pl-4">
                  <StatusBadge status={item.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageContainer>
  );
};
