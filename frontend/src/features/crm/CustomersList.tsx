import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader } from '@/components/ui';
import { PageContainer, EmptyState } from '@/components/ui/LayoutComponents';
import apiClient from '@/services/api';
import notification from '@/services/NotificationService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';

export const CustomersList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: crm = [], isLoading: loading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      const items = res.data?.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      notification.success('Customer deleted successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete customer');
    }
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Customers"
        description="Manage your customers and clients"
        primaryAction={
          <Button
            onClick={() => navigate('/app/customers/new')}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        }
      />

      {loading ? (
        <TableLoader cols={5} rows={5} className="mt-6 border border-border/80 bg-surface rounded-2xl" />
      ) : crm.length === 0 ? (
        <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Customers Found"
            description="Manage your client list and billing relationships by adding your first customer."
            actionLabel="Add First Customer"
            onActionClick={() => navigate('/app/customers/new')}
          />
        </div>
      ) : (
        <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-6 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-bold">Code</TableHead>
                <TableHead className="font-bold">Name</TableHead>
                <TableHead className="font-bold">Company / GST</TableHead>
                <TableHead className="font-bold">Contact</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crm.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.bpCode || '-'}</TableCell>
                  <TableCell className="font-semibold text-foreground">
                    <button
                      onClick={() => navigate(`/app/customers/${c.id}`)}
                      className="hover:underline text-left cursor-pointer"
                    >
                      {c.name}
                    </button>
                    {c.customerType && (
                      <span className="block text-[10px] uppercase text-muted-foreground mt-0.5">{c.customerType}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">{c.tradeName || '-'}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.gstin || 'No GST'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{c.email || '-'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">{c.phone || '-'}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2"
                        title="View"
                        onClick={() => navigate(`/app/customers/${c.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2"
                        title="Edit"
                        onClick={() => navigate(`/app/customers/${c.id}/edit`)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                        onClick={() => handleDelete(c.id, c.name)}
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
    </PageContainer>
  );
};


