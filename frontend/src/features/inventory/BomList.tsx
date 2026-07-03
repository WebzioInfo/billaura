import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { useQuery } from '@tanstack/react-query';

export const BomList = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['bom'],
    queryFn: async () => {
      const res = await apiClient.get('/bom');
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Bill of Materials"
        description="Manage product recipes and manufacturing requirements"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New BOM
          </button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recipe Name</TableHead>
            <TableHead>Output Product</TableHead>
            <TableHead>Items Count</TableHead>
            <TableHead>Total Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">Loading BOMs...</TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No Bill of Materials found.</TableCell>
            </TableRow>
          ) : (
            data.map((bom: any) => (
              <TableRow key={bom.id}>
                <TableCell className="font-medium">{bom.name}</TableCell>
                <TableCell>{bom.product?.name || 'N/A'}</TableCell>
                <TableCell>{bom.items?.length || 0}</TableCell>
                <TableCell>${Number(bom.totalCost || 0).toFixed(2)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
