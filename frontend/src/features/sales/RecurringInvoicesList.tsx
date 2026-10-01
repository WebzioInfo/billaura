import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Download, Repeat } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton, StatusBadge, CurrencyCell, DateCell } from '@/shared/components/ui';
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
        <TableSkeleton rows={8} cols={6} className="mt-6" />
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
              <tr>
                <TableHead className="pl-6 pr-4">Next Run</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead align="right">Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead align="center">Status</TableHead>
                <TableHead align="right" className="pr-6 pl-4">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {invoices.map((inv: any) => (
                <TableRow key={inv.id} className="group">
                  <TableCell className="pl-6 pr-4">
                    <DateCell value={inv.nextRunDate} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-[#1F2937] dark:text-[#EDEDED] truncate max-w-xs">{inv.businessPartner?.name || '—'}</div>
                  </TableCell>
                  <TableCell align="right">
                    <CurrencyCell value={inv.grandTotal} isBold />
                  </TableCell>
                  <TableCell>
                    <span className="text-[#555555] dark:text-[#A1A1AA] text-xs font-medium">{inv.frequency}</span>
                  </TableCell>
                  <TableCell align="center">
                    <StatusBadge status={inv.status || 'ACTIVE'} />
                  </TableCell>
                  <TableCell align="right" className="pr-6 pl-4">
                    <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-120">
                      <button
                        type="button"
                        className="w-[30px] h-[30px] rounded-[6px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#E5E7EB] dark:hover:bg-[#374151] flex items-center justify-center cursor-pointer transition-colors"
                        title="Edit Profile"
                        onClick={() => handleEdit(inv)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="w-[30px] h-[30px] rounded-[6px] text-[#6B7280] hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center cursor-pointer transition-colors"
                        title="Cancel Recurring Invoice"
                        onClick={() => handleDeleteRequest(inv)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
