import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, DateCell } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';

export const BatchesList = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await apiClient.get('/batches');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Inventory Batches"
        description="Track product batches, manufacturing and expiry dates"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Batch
          </button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 pr-4">Batch No</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Mfg Date</TableHead>
            <TableHead>Exp Date</TableHead>
            <TableHead align="right" className="pr-6 pl-4">Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="p-0">
                <TableLoader rows={4} />
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                No batches found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((batch: any) => (
              <TableRow key={batch.id}>
                <TableCell className="pl-6 pr-4 font-mono font-medium text-foreground">{batch.batchNo}</TableCell>
                <TableCell className="font-semibold text-foreground">{batch.product?.name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{batch.warehouse?.name || '—'}</TableCell>
                <DateCell date={batch.mfgDate} />
                <DateCell date={batch.expDate} />
                <TableCell align="right" className="pr-6 pl-4 font-mono tabular-nums font-medium text-foreground">
                  {Number(batch.qty || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
