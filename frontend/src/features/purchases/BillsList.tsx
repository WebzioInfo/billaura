import React from 'react';
import { Plus, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/components/ui/LayoutComponents';
import apiClient from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const BillsList = () => {
  const navigate = useNavigate();
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/bills');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Bills"
        description="Manage your purchase bills and expenses"
        primaryAction={
          <Button 
            onClick={() => navigate('/bills/new')}
            className="flex items-center gap-2 font-bold px-5"
            variant="primary"
          >
            <Plus className="w-4 h-4" /> New Bill
          </Button>
        }
      />
      {loading ? (
        <LoadingState variant="table" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-muted-foreground" />}
          title="No bills found"
          description="Create your first purchase bill to record vendor expenses."
          actionLabel="New Bill"
          onActionClick={() => navigate('/bills/new')}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-semibold py-4 px-6">Number</TableHead>
                <TableHead className="font-semibold py-4 px-6">Date</TableHead>
                <TableHead className="font-semibold py-4 px-6">Vendor</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-right">Total</TableHead>
                <TableHead className="font-semibold py-4 px-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-semibold py-4 px-6">{item.billNumber}</TableCell>
                  <TableCell className="py-4 px-6">{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell className="py-4 px-6 font-medium text-foreground">{item.vendor?.name}</TableCell>
                  <TableCell className="font-bold py-4 px-6 text-right">₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="py-4 px-6">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'PAID' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      {item.status}
                    </span>
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
