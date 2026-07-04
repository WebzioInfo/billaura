import React from 'react';
import { Plus, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/components/ui/LayoutComponents';
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
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Invoices"
        description="Manage your sales invoices"
        primaryAction={
          <Button 
            onClick={() => navigate('/invoices/new')}
            className="flex items-center gap-2 font-bold px-5"
            variant="primary"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        }
      />
      {loading ? (
        <LoadingState variant="table" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-muted-foreground" />}
          title="No invoices found"
          description="Create your first invoice to get started."
          actionLabel="New Invoice"
          onActionClick={() => navigate('/invoices/new')}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-semibold py-4 px-6">Number</TableHead>
                <TableHead className="font-semibold py-4 px-6">Date</TableHead>
                <TableHead className="font-semibold py-4 px-6">Client</TableHead>
                <TableHead className="font-semibold py-4 px-6">Total</TableHead>
                <TableHead className="font-semibold py-4 px-6">Status</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-semibold py-4 px-6">{item.invoiceNumber}</TableCell>
                  <TableCell className="py-4 px-6">{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell className="py-4 px-6">{item.customer?.name}</TableCell>
                  <TableCell className="font-bold py-4 px-6">₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="py-4 px-6">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'PAID' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        onClick={() => navigate(`/invoices/${item.id}/print`)}
                        variant="outline"
                        size="sm"
                        className="h-8"
                      >
                        View / Print
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
};
