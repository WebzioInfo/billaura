import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { useQuery } from '@tanstack/react-query';

export const DeliveryNotesList = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['delivery-notes'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-notes');
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Delivery Notes"
        description="Track goods dispatched to customers"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Delivery Note
          </button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Note No</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Total Items</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={5}><div className="text-center py-8 text-muted-foreground">Loading...</div></TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={5}><div className="text-center py-8 text-muted-foreground">No delivery notes found</div></TableCell></TableRow>
          ) : data.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-semibold">{item.noteNo}</TableCell>
              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
              <TableCell>{item.businessPartner?.name || 'N/A'}</TableCell>
              <TableCell className="font-bold text-right">{item.items?.length || 0}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs ${item.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {item.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
