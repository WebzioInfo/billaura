import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader } from '@/components/ui';
import { PageContainer, EmptyState } from '@/components/ui/LayoutComponents';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import ProductFormModal from './ProductFormModal';

export const ProductsList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products');
      const items = res.data?.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const openNewModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Products"
        description="Manage your inventory items and services"
        primaryAction={
          <Button
            onClick={openNewModal}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Product
          </Button>
        }
      />

      {loading ? (
        <TableLoader cols={5} rows={5} className="mt-6 border border-border/80 bg-surface rounded-2xl" />
      ) : data.length === 0 ? (
        <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Products Found"
            description="Start managing your inventory by adding your first product or service."
            actionLabel="Add Product"
            onActionClick={openNewModal}
          />
        </div>
      ) : (
        <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-6 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-bold">Code/SKU</TableHead>
                <TableHead className="font-bold">Name</TableHead>
                <TableHead className="font-bold">Category</TableHead>
                <TableHead className="font-bold text-right">Selling Price</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku || '-'}</TableCell>
                  <TableCell className="font-semibold text-foreground">
                    <div>{p.name}</div>
                    {p.itemType && (
                      <span className="block text-[10px] uppercase text-muted-foreground mt-0.5">{p.itemType.replace('_', ' ')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{p.category?.name || '-'}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(p.sellingPrice).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2"
                        title="Edit"
                        onClick={() => openEditModal(p)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                        onClick={() => handleDelete(p.id, p.name)}
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

      {isModalOpen && (
        <ProductFormModal 
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          product={selectedProduct}
        />
      )}
    </PageContainer>
  );
};
