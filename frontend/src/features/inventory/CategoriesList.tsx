import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader } from '@/components/ui';
import { PageContainer, EmptyState } from '@/components/ui/LayoutComponents';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';

export const CategoriesList = () => {
  const queryClient = useQueryClient();

  const { data = [], isLoading: loading } = useQuery({
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
      toast.success('Category deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = async () => {
    const name = window.prompt('Enter category name:');
    if (!name) return;
    try {
      await apiClient.post('/inventory/categories', { name });
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleEdit = async (category: any) => {
    const name = window.prompt('Edit category name:', category.name);
    if (!name || name === category.name) return;
    try {
      await apiClient.patch(`/inventory/categories/${category.id}`, { name });
      toast.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update category');
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Product Categories"
        description="Organize your inventory with categories"
        primaryAction={
          <Button
            onClick={handleCreate}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Category
          </Button>
        }
      />

      {loading ? (
        <TableLoader cols={3} rows={5} className="mt-6 border border-border/80 bg-surface rounded-2xl" />
      ) : data.length === 0 ? (
        <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Categories Found"
            description="Start organizing your inventory by adding your first category."
            actionLabel="Add Category"
            onActionClick={handleCreate}
          />
        </div>
      ) : (
        <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-6 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-bold">Name</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                      Active
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
