import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, CurrencyCell } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';

export const BomList = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['bom'],
    queryFn: async () => {
      const res = await apiClient.get('/bom');
      const items = res.data || [];
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
            <TableHead className="pl-6 pr-4">Recipe Name</TableHead>
            <TableHead>Output Product</TableHead>
            <TableHead align="right">Items Count</TableHead>
            <TableHead align="right" className="pr-6 pl-4">Total Cost</TableHead>
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
                No Bill of Materials found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((bom: any) => (
              <TableRow key={bom.id}>
                <TableCell className="pl-6 pr-4 font-semibold text-foreground">{bom.name}</TableCell>
                <TableCell className="text-foreground">{bom.product?.name || '—'}</TableCell>
                <TableCell align="right" className="tabular-nums font-mono text-muted-foreground">{bom.items?.length || 0}</TableCell>
                <CurrencyCell amount={Number(bom.totalCost || 0)} className="pr-6 pl-4 font-semibold text-foreground" />
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};


