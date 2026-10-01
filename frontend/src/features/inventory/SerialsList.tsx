import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, StatusBadge } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';

export const SerialsList = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['serials'],
    queryFn: async () => {
      const res = await apiClient.get('/serials');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Serial Numbers"
        description="Track individual item serials and warranty lifecycle"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Register Serial
          </button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 pr-4">Serial No</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead align="center" className="pr-6 pl-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="p-0">
                <TableLoader rows={4} />
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-sm text-muted-foreground">
                No serial numbers found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((serial: any) => (
              <TableRow key={serial.id}>
                <TableCell className="pl-6 pr-4 font-mono font-medium text-foreground">{serial.serialNo}</TableCell>
                <TableCell className="font-semibold text-foreground">{serial.product?.name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{serial.warehouse?.name || '—'}</TableCell>
                <TableCell align="center" className="pr-6 pl-4">
                  <StatusBadge status={serial.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
