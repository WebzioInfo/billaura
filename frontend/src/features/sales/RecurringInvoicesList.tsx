import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Download, Repeat } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { TableLoader } from '@/shared/components/ui/LoadingSystem';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { ConfirmDialog } from '@/shared/components/ui/action-system/ConfirmDialog';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

export const RecurringInvoicesList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'CANCELED'>('ALL');
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['recurring-invoices', debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      
      const res = await apiClient.get('/sales/recurring-invoices', { params });
      return res.data?.data || res.data || { items: [] };
    }
  });

  const invoices = Array.isArray(data) ? data : data?.items || [];
  
  const activeCount = invoices.filter((i: any) => i.status === 'ACTIVE').length;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/sales/recurring-invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
      notification.success('Recurring Invoice canceled successfully');
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to cancel invoice');
      setIsDeleteDialogOpen(false);
    }
  });

  const handleCreate = () => navigate('/recurring-invoices/new');
  const handleEdit = (invoice: any) => navigate(`/recurring-invoices/${invoice.id}/edit`);

  const handleDeleteRequest = (invoice: any) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteMutation.mutate(invoiceToDelete.id);
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Recurring Invoices"
        description="Automate your billing with subscription and recurring invoices"
        primaryAction={
          <Button onClick={handleCreate} variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Recurring Invoice
          </Button>
        }
        secondaryAction={
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Active</p>
            <h3 className="text-2xl font-bold text-foreground">{isLoading ? '-' : activeCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Repeat className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by Customer..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      {isLoading ? (
        <TableLoader cols={6} rows={5} className="mt-6 border border-border/80 bg-surface rounded-2xl" />
      ) : invoices.length === 0 ? (
        <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Recurring Invoices"
            description="You have not set up any recurring billing profiles."
            actionLabel="Create First Profile"
            onActionClick={handleCreate}
          />
        </div>
      ) : (
        <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-6 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-bold">Next Run</TableHead>
                <TableHead className="font-bold">Customer</TableHead>
                <TableHead className="font-bold text-right">Amount</TableHead>
                <TableHead className="font-bold">Frequency</TableHead>
                <TableHead className="font-bold text-center">Status</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv: any) => (
                <TableRow key={inv.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="text-muted-foreground">
                    {new Date(inv.nextRunDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{inv.businessPartner?.name || 'Unknown'}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{inv.frequency}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={inv.status === 'ACTIVE' ? 'success' : 'default'}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" className="px-2" onClick={() => handleEdit(inv)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="px-2 text-destructive" onClick={() => handleDeleteRequest(inv)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Cancel Recurring Invoice"
        message="Are you sure you want to cancel this recurring billing profile?"
        confirmText="Cancel Profile"
        variant="danger"
        
      />
    </PageContainer>
  );
};
