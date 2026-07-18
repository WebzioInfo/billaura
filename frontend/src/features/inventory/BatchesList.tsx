import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
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
            <TableHead>Batch No</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Mfg Date</TableHead>
            <TableHead>Exp Date</TableHead>
            <TableHead>Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">Loading batches...</TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No batches found.</TableCell>
            </TableRow>
          ) : (
            data.map((batch: any) => (
              <TableRow key={batch.id}>
                <TableCell className="font-medium">{batch.batchNo}</TableCell>
                <TableCell>{batch.product?.name || 'N/A'}</TableCell>
                <TableCell>{batch.warehouse?.name || 'N/A'}</TableCell>
                <TableCell>{batch.mfgDate ? new Date(batch.mfgDate).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>{batch.expDate ? new Date(batch.expDate).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>{Number(batch.qty).toFixed(2)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
