import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Download, FileText, CheckCircle2 } from 'lucide-react';
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

export const QuotationsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'>('ALL');
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<any>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      
      const res = await apiClient.get('/sales/quotations', { params });
      return res.data?.data || res.data || { items: [] };
    }
  });

  const quotations = Array.isArray(data) ? data : data?.items || [];
  
  // Calculate stats
  const totalQuotations = quotations.length;
  const draftQuotations = quotations.filter((q: any) => q.status === 'DRAFT').length;
  const acceptedQuotations = quotations.filter((q: any) => q.status === 'ACCEPTED').length;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/sales/quotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      notification.success('Quotation deactivated successfully');
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to deactivate quotation');
      setIsDeleteDialogOpen(false);
    }
  });

  const handleCreate = () => navigate('/quotations/new');

  const handleEdit = (quotation: any) => navigate(`/quotations/${quotation.id}/edit`);

  const handleDeleteRequest = (quotation: any) => {
    setQuotationToDelete(quotation);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (quotationToDelete) {
      deleteMutation.mutate(quotationToDelete.id);
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Quotations"
        description="Manage sales quotations and estimates for your customers"
        primaryAction={
          <Button onClick={handleCreate} variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Quotation
          </Button>
        }
        secondaryAction={
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Quotations</p>
            <h3 className="text-2xl font-bold text-foreground">{isLoading ? '-' : totalQuotations}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <FileText className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Drafts</p>
            <h3 className="text-2xl font-bold text-amber-600">{isLoading ? '-' : draftQuotations}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Accepted</p>
            <h3 className="text-2xl font-bold text-green-600">{isLoading ? '-' : acceptedQuotations}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by Quotation No or Customer..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-background border border-border rounded-lg p-1 overflow-x-auto whitespace-nowrap">
            {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'].map((status) => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === status ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableLoader cols={6} rows={5} className="mt-6 border border-border/80 bg-surface rounded-2xl" />
      ) : quotations.length === 0 ? (
        <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Quotations Found"
            description={searchTerm ? `No quotations match your search '${searchTerm}'` : "Create your first quotation to send estimates to customers."}
            actionLabel={searchTerm ? "Clear Search" : "Create Quotation"}
            onActionClick={searchTerm ? () => setSearchTerm('') : handleCreate}
          />
        </div>
      ) : (
        <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-6 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Quotation No</TableHead>
                <TableHead className="font-bold">Customer</TableHead>
                <TableHead className="font-bold text-right">Amount</TableHead>
                <TableHead className="font-bold text-center">Status</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((q: any) => (
                <TableRow key={q.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="text-muted-foreground">
                    {new Date(q.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{q.quotationNo}</span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{q.businessPartner?.name || 'Unknown'}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{Number(q.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={q.status === 'ACCEPTED' ? 'success' : q.status === 'DRAFT' ? 'default' : 'warning'}>
                      {q.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2"
                        title="Edit"
                        onClick={() => handleEdit(q)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                        onClick={() => handleDeleteRequest(q)}
                      >
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
        title="Deactivate Quotation"
        message={`Are you sure you want to deactivate the quotation "${quotationToDelete?.quotationNo}"?`}
        confirmText="Deactivate"
        variant="danger"
        
      />
    </PageContainer>
  );
};
