import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
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
            <TableHead>Serial No</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">Loading serials...</TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No serial numbers found.</TableCell>
            </TableRow>
          ) : (
            data.map((serial: any) => (
              <TableRow key={serial.id}>
                <TableCell className="font-medium">{serial.serialNo}</TableCell>
                <TableCell>{serial.product?.name || 'N/A'}</TableCell>
                <TableCell>{serial.warehouse?.name || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    serial.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 
                    serial.status === 'SOLD' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {serial.status}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
