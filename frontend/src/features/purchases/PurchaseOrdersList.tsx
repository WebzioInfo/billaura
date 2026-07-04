import React from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/components/ui/LayoutComponents';
import apiClient from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const PurchaseOrdersList = () => {
  const navigate = useNavigate();
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Purchase Orders"
        description="Manage vendor purchase orders and incoming stock"
        primaryAction={
          <Button 
            onClick={() => {}}
            className="flex items-center gap-2 font-bold px-5"
            variant="primary"
          >
            <Plus className="w-4 h-4" /> New Purchase Order
          </Button>
        }
      />
      {loading ? (
        <LoadingState variant="table" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-8 h-8 text-muted-foreground" />}
          title="No purchase orders found"
          description="Create your first purchase order to track vendor orders."
          actionLabel="New Purchase Order"
          onActionClick={() => {}}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-semibold py-4 px-6">Order No</TableHead>
                <TableHead className="font-semibold py-4 px-6">Date</TableHead>
                <TableHead className="font-semibold py-4 px-6">Vendor</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-right">Total</TableHead>
                <TableHead className="font-semibold py-4 px-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-semibold py-4 px-6">{item.orderNo}</TableCell>
                  <TableCell className="py-4 px-6">{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell className="py-4 px-6 font-medium text-foreground">{item.businessPartner?.name || 'N/A'}</TableCell>
                  <TableCell className="font-bold py-4 px-6 text-right">₹{Number(item.grandTotal || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="py-4 px-6">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'COMPLETED' ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'}`}>
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
