import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { useQuery } from '@tanstack/react-query';

export const PurchaseOrdersList = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders');
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Purchase Orders"
        description="Manage vendor purchase orders and incoming stock"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Purchase Order
          </button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order No</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={5}><div className="text-center py-8 text-muted-foreground">Loading...</div></TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={5}><div className="text-center py-8 text-muted-foreground">No purchase orders found</div></TableCell></TableRow>
          ) : data.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-semibold">{item.orderNo}</TableCell>
              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
              <TableCell>{item.businessPartner?.name || 'N/A'}</TableCell>
              <TableCell className="font-bold text-right">${item.grandTotal}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs ${item.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
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
