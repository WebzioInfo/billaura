import React from 'react';
import { Plus, Truck } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, StatusBadge, DateCell } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/shared/components/ui/LayoutComponents';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const DeliveryNotesList = () => {
  const navigate = useNavigate();
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['delivery-notes'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-notes');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <PageContainer
      maxWidth="7xl"
      isLoading={loading && data.length === 0}
      loadingTitle="Loading Delivery Notes..."
      loadingDescription="Fetching delivery notes and challans..."
    >
      <PageHeader
        title="Delivery Notes"
        description="Track goods dispatched to customers"
        primaryAction={
          <Button 
            onClick={() => navigate('/delivery-notes/new')}
            className="flex items-center gap-2 font-bold px-5"
            variant="primary"
          >
            <Plus className="w-4 h-4" /> New Delivery Note
          </Button>
        }
      />
      {loading ? (
        <LoadingState variant="table" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-8 h-8 text-muted-foreground" />}
          title="No delivery notes found"
          description="Create your first delivery note to track dispatches."
          actionLabel="New Delivery Note"
          onActionClick={() => navigate('/delivery-notes/new')}
        />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead className="pl-6 pr-4">Note No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead align="right">Total Items</TableHead>
              <TableHead align="center" className="pr-6 pl-4">Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {data.map((item: any) => (
              <TableRow key={item.id} className="group cursor-pointer" onClick={() => navigate(`/delivery-notes/${item.id}`)}>
                <TableCell className="pl-6 pr-4 font-medium text-[#1F2937] dark:text-[#EDEDED]">{item.noteNo}</TableCell>
                <TableCell><DateCell value={item.date} /></TableCell>
                <TableCell className="font-medium text-[#1F2937] dark:text-[#EDEDED]">{item.businessPartner?.name || '—'}</TableCell>
                <TableCell align="right" className="font-medium text-[#111827] dark:text-[#EDEDED] tabular-nums">{item.items?.length || 0}</TableCell>
                <TableCell align="center" className="pr-6 pl-4">
                  <StatusBadge status={item.status || 'SHIPPED'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageContainer>
  );
};
