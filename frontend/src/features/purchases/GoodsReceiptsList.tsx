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
            onClick={() => {}}
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
          onActionClick={() => {}}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-semibold py-4 px-6">Receipt No</TableHead>
                <TableHead className="font-semibold py-4 px-6">Date</TableHead>
                <TableHead className="font-semibold py-4 px-6">Vendor</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-right">Total Items</TableHead>
                <TableHead className="font-semibold py-4 px-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-semibold py-4 px-6">{item.receiptNo}</TableCell>
                  <TableCell className="py-4 px-6">{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell className="py-4 px-6 font-medium text-foreground">{item.businessPartner?.name || 'N/A'}</TableCell>
                  <TableCell className="font-bold py-4 px-6 text-right">{item.items?.length || 0}</TableCell>
                  <TableCell className="py-4 px-6">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'RECEIVED' ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'}`}>
                      {item.status}
                    </span>
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
