import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Download, ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { TableLoader } from '@/shared/components/ui/LoadingSystem';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { ConfirmDialog } from '@/shared/components/ui/action-system/ConfirmDialog';
import { BrandFormModal } from './BrandFormModal';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useDebounce } from '@/shared/hooks/useDebounce';

export const BrandsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['brands', debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      
      const res = await apiClient.get('/inventory/brands', { params });
      return res.data?.data || res.data || { items: [] };
    }
  });

  const brands = Array.isArray(data) ? data : data?.items || [];
  
  // Calculate stats
  const totalBrands = brands.length;
  const activeBrands = brands.filter((b: any) => b.status === 'ACTIVE').length;
  const inactiveBrands = totalBrands - activeBrands;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/inventory/brands/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      notification.success('Brand deactivated successfully');
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to deactivate brand');
      setIsDeleteDialogOpen(false);
    }
  });

  const handleCreate = () => {
    setSelectedBrand(null);
    setIsFormOpen(true);
  };

  const handleEdit = (brand: any) => {
    setSelectedBrand(brand);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (brand: any) => {
    setBrandToDelete(brand);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (brandToDelete) {
      deleteMutation.mutate(brandToDelete.id);
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Brands Management"
        description="Manage product brands, manufacturers, and their details"
        primaryAction={
          <Button onClick={handleCreate} variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Brand
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
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Brands</p>
            <h3 className="text-2xl font-bold text-foreground">{isLoading ? '-' : totalBrands}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Search className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Active Brands</p>
            <h3 className="text-2xl font-bold text-green-600">{isLoading ? '-' : activeBrands}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Inactive Brands</p>
            <h3 className="text-2xl font-bold text-slate-500">{isLoading ? '-' : inactiveBrands}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-500">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by Brand Name, Code or Description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-background border border-border rounded-lg p-1">
            <button 
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'ALL' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
            >
              All
            </button>
            <button 
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'ACTIVE' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'INACTIVE' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Inactive
            </button>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableLoader cols={6} rows={5} className="mt-6 border border-border/80 bg-surface rounded-2xl" />
      ) : brands.length === 0 ? (
        <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Brands Found"
            description={searchTerm ? `No brands match your search '${searchTerm}'` : "Start organizing your products by adding your first brand."}
            actionLabel={searchTerm ? "Clear Search" : "Add Brand"}
            onActionClick={searchTerm ? () => setSearchTerm('') : handleCreate}
          />
        </div>
      ) : (
        <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-6 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-bold w-[250px]">Brand Info</TableHead>
                <TableHead className="font-bold">Code</TableHead>
                <TableHead className="font-bold text-center">Products</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Created</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand: any) => (
                <TableRow key={brand.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border overflow-hidden">
                        {brand.logoUrl ? (
                          <img src={brand.logoUrl} alt={brand.brandName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">
                            {brand.brandName?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{brand.brandName}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {brand.description || (brand.website ? <a href={brand.website} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">{brand.website} <ArrowUpRight className="w-3 h-3" /></a> : 'No description')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded border border-border/50">
                      {brand.brandCode}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="info">{brand._count?.products || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    {brand.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(brand.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2"
                        title="Edit"
                        onClick={() => handleEdit(brand)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Deactivate"
                        onClick={() => handleDeleteRequest(brand)}
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

      {/* Forms & Dialogs */}
      <BrandFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        brand={selectedBrand} 
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Deactivate Brand"
        message={`Are you sure you want to deactivate the brand "${brandToDelete?.brandName}"? It will no longer be available for new products.`}
        confirmText="Deactivate"
        variant="danger"
        
      />
    </PageContainer>
  );
};
