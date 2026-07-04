import React from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export const InvoicesList = () => {
  const navigate = useNavigate();

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/invoices');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Invoices"
        description="Manage your sales invoices"
        primaryAction={
          <button 
            onClick={() => navigate('/invoices/new')}
            className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={6}><div className="text-center py-8 text-muted-foreground">Loading...</div></TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={6}><div className="text-center py-8 text-muted-foreground">No invoices found</div></TableCell></TableRow>
          ) : data.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-semibold">{item.invoiceNumber}</TableCell>
              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
              <TableCell>{item.customer?.name}</TableCell>
              <TableCell className="font-bold">${item.totalAmount}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs ${item.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => navigate(`/invoices/${item.id}/print`)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-300"
                  >
                    View / Print
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
