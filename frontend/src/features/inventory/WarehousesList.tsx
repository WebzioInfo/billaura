import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, StatusBadge } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';

export const WarehousesList = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Warehouses"
        description="Manage your physical storage locations and facilities"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Warehouse
          </button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 pr-4">Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Default</TableHead>
            <TableHead className="pr-6 pl-4">Status</TableHead>
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
                No warehouses found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((warehouse: any) => (
              <TableRow key={warehouse.id}>
                <TableCell className="pl-6 pr-4 font-semibold text-foreground">{warehouse.name}</TableCell>
                <TableCell className="text-muted-foreground">{warehouse.location || '—'}</TableCell>
                <TableCell>
                  {warehouse.isDefault ? (
                    <span className="font-semibold text-foreground">Yes</span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell className="pr-6 pl-4">
                  <StatusBadge status={warehouse.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
