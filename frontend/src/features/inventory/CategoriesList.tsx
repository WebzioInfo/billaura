import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Download, RefreshCw, BarChart2, CheckCircle2, XCircle, Package } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader } from '@/shared/components/ui';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui';
import { Input } from '@/shared/components/ui/Input';

export const CategoriesList = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/categories');
      const items = res.data?.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/inventory/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      notification.success('Category deleted successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete category');
    }
  });

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await dialog.confirmDelete(
      'Delete Category?',
      `Are you sure you want to delete category "${name}"?`
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = async () => {
    const name = await dialog.prompt(
      'New Category',
      '',
      'Enter category name'
    );
    if (!name) return;
    try {
      await apiClient.post('/inventory/categories', { name });
      notification.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleEdit = async (category: any) => {
    const name = await dialog.prompt(
      'Edit Category',
      category.name,
      'Enter category name'
    );
    if (!name || name === category.name) return;
    try {
      await apiClient.patch(`/inventory/categories/${category.id}`, { name });
      notification.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to update category');
    }
  };

  // Export removed as it is not implemented

  const filteredData = useMemo(() => {
    return data.filter((c: any) => {
      const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  // KPIs
  const totalCategories = data.length;
  const activeCategories = data.filter((c: any) => c.status === 'ACTIVE').length;
  const inactiveCategories = data.filter((c: any) => c.status === 'INACTIVE').length;
  const totalProductsLinked = data.reduce((acc: number, c: any) => acc + (c._count?.products || 0), 0);

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Product Categories"
        description="Organize your inventory with categories"
        primaryAction={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2 opacity-50 cursor-not-allowed" title="Available in a future release." disabled>
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button onClick={handleCreate} variant="primary" size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> New Category
            </Button>
          </div>
        }
      />

      {/* KPIs Section */}
      {!isLoading && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Categories</p>
              <h3 className="text-2xl font-bold mt-1">{totalCategories}</h3>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active</p>
              <h3 className="text-2xl font-bold mt-1">{activeCategories}</h3>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Inactive</p>
              <h3 className="text-2xl font-bold mt-1">{inactiveCategories}</h3>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Products Linked</p>
              <h3 className="text-2xl font-bold mt-1">{totalProductsLinked}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Command Bar */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface p-3 rounded-xl border border-border shadow-sm">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search categories by name or code..." 
            className="pl-9 w-full sm:max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            className="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 w-full sm:w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <TableLoader cols={5} rows={5} className="mt-4 border border-border/80 bg-surface rounded-2xl" />
      ) : filteredData.length === 0 ? (
        <div className="mt-4 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Categories Found"
            description={searchTerm || statusFilter !== 'ALL' ? 'Try adjusting your search or filters.' : 'Start organizing your inventory by adding your first category.'}
            actionLabel={searchTerm || statusFilter !== 'ALL' ? 'Clear Filters' : 'Add Category'}
            onActionClick={searchTerm || statusFilter !== 'ALL' ? () => { setSearchTerm(''); setStatusFilter('ALL'); } : handleCreate}
          />
        </div>
      ) : (
        <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-4 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-bold">Category Name</TableHead>
                <TableHead className="font-bold">Code</TableHead>
                <TableHead className="font-bold">Products</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-medium text-foreground">
                    <div className="flex flex-col">
                      <span>{c.name}</span>
                      {c.description && <span className="text-xs text-muted-foreground">{c.description}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.code ? <span className="font-mono text-xs px-2 py-1 bg-muted rounded">{c.code}</span> : <span className="text-muted-foreground text-xs">-</span>}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{c._count?.products || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${c.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {c.status || 'ACTIVE'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2"
                        title="Edit"
                        onClick={() => handleEdit(c)}
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
