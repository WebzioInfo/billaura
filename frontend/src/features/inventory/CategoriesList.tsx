import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Download, RefreshCw, BarChart2, CheckCircle2, XCircle, Package } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, StatusBadge } from '@/shared/components/ui';
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
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6 pr-4">Category Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead align="right">Products</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="right" className="pr-6 pl-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="pl-6 pr-4 font-medium text-foreground">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{c.name}</span>
                    {c.description && <span className="text-xs text-muted-foreground">{c.description}</span>}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {c.code || '—'}
                </TableCell>
                <TableCell align="right" className="tabular-nums font-medium text-foreground">
                  {c._count?.products || 0}
                </TableCell>
                <TableCell align="center">
                  <StatusBadge status={c.status || 'ACTIVE'} />
                </TableCell>
                <TableCell align="right" className="pr-6 pl-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[#EAEAEA] dark:hover:bg-neutral-800 transition-colors"
                      title="Edit Category"
                      onClick={() => handleEdit(c)}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-rose-600 hover:bg-[#EAEAEA] dark:hover:bg-neutral-800 transition-colors"
                      title="Delete Category"
                      onClick={() => handleDelete(c.id, c.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageContainer>
  );
};
