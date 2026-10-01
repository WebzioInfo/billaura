import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';

export const VendorsList = () => {
  const { data: vendors = [], isLoading: loading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/crm/vendors');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Vendors"
        description="Manage your vendors and suppliers" 
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Vendor
          </button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 pr-4">Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="pr-6 pl-4">Company</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="p-0">
                <TableLoader rows={5} />
              </TableCell>
            </TableRow>
          ) : vendors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                No vendors found
              </TableCell>
            </TableRow>
          ) : vendors.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="pl-6 pr-4 font-medium text-foreground">{c.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{c.email || '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{c.phone || '—'}</TableCell>
              <TableCell className="pr-6 pl-4 text-foreground">{c.companyName || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 