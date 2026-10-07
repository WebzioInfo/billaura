import React from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, StatusBadge, CurrencyCell, DateCell } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/shared/components/ui/LayoutComponents';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const SalesOrdersList = () => {
  const navigate = useNavigate();
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/sales-orders');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <PageContainer
      maxWidth="7xl"
      isLoading={loading && data.length === 0}
      loadingTitle="Loading Sales Orders..."
      loadingDescription="Fetching customer orders and fulfillments..."
    >
      <PageHeader
        title="Sales Orders"
        description="Manage your customer sales orders and fulfillments"
        primaryAction={
          <Button 
            onClick={() => navigate('/sales-orders/new')}
            className="flex items-center gap-2 font-bold px-5"
            variant="primary"
          >
            <Plus className="w-4 h-4" /> New Sales Order
          </Button>
        }
      />
      {loading ? (
        <LoadingState variant="table" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-8 h-8 text-muted-foreground" />}
          title="No sales orders found"
          description="Create your first sales order to track customer orders."
          actionLabel="New Sales Order"
          onActionClick={() => navigate('/sales-orders/new')}
        />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead className="pl-6 pr-4">Order No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead align="right">Total</TableHead>
              <TableHead align="center" className="pr-6 pl-4">Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {data.map((item: any) => (
              <TableRow key={item.id} className="group cursor-pointer" onClick={() => navigate(`/sales-orders/${item.id}`)}>
                <TableCell className="pl-6 pr-4 font-medium text-[#1F2937] dark:text-[#EDEDED]">{item.orderNo}</TableCell>
                <TableCell><DateCell value={item.date} /></TableCell>
                <TableCell className="font-medium text-[#1F2937] dark:text-[#EDEDED]">{item.businessPartner?.name || '—'}</TableCell>
                <TableCell align="right"><CurrencyCell value={item.grandTotal} isBold /></TableCell>
                <TableCell align="center" className="pr-6 pl-4">
                  <StatusBadge status={item.status || 'OPEN'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageContainer>
  );
};
