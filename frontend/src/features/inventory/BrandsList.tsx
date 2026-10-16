import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Download, ArrowUpRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/shared/components/ui/action-system/ConfirmDialog';
import { BrandFormModal } from './BrandFormModal';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { ExportService } from '@/core/services/ExportService';
import { cn } from '@/lib/utils';

export const BrandsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['brands', debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await apiClient.get('/inventory/brands', { params });
      return res.data?.data || res.data || { items: [] };
    },
  });

  const brands = Array.isArray(data) ? data : data?.items || [];

  // Calculate stats
  const totalBrands = brands.length;
  const activeBrands = brands.filter((b: any) => b.status === 'ACTIVE' || !b.status).length;
  const inactiveBrands = totalBrands - activeBrands;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/inventory/brands/${id}`),
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: ['brands'] });
      } catch {
        notification.warning('Brand deactivated successfully, but could not refresh list. Please refresh the page.');
        setIsDeleteDialogOpen(false);
        setBrandToDelete(null);
        return;
      }
      notification.success('Brand deactivated successfully');
      setIsDeleteDialogOpen(false);
      setBrandToDelete(null);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Unable to deactivate brand. Please try again.');
    },
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

  const confirmDelete = async () => {
    if (brandToDelete) {
      await deleteMutation.mutateAsync(brandToDelete.id);
    }
  };

  const handleExport = () => {
    if (brands.length === 0) {
      notification.warning('No brands to export');
      return;
    }
    const headers = ['Brand Name', 'Code', 'Description', 'Website', 'Products', 'Status', 'Created Date'];
    const rows = brands.map((b: any) => ({
      'Brand Name': b.brandName || b.name || '',
      Code: b.brandCode || b.code || '',
      Description: b.description || '',
      Website: b.website || '',
      Products: b._count?.products || 0,
      Status: b.status || 'ACTIVE',
      'Created Date': b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '',
    }));
    ExportService.exportCsv('Brands_List.csv', rows, headers);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white text-[#2B2F36] overflow-y-auto">
      {/* 1. Page Header (Zoho Books Style) */}
      <div className="px-6 py-4 border-b border-[#E5E7EB] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[#2B2F36] leading-tight">
              Brands Management
            </h1>
            <span className="px-2 py-0.5 rounded-[4px] bg-[#F3F4F6] text-[#6B7280] text-xs font-medium">
              {totalBrands}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage product brands, manufacturers, and manufacturer details
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="h-8 px-3 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#2B2F36] rounded-[4px] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export Records"
          >
            <Download className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={handleCreate}
            className="h-8 px-3.5 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Brand</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Zoho Summary Strip */}
      <div className="px-6 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] flex flex-wrap items-center gap-6 text-xs text-[#6B7280] shrink-0">
        <div className="flex items-center gap-1.5">
          <span>Total Brands:</span>
          <strong className="text-[#2B2F36] font-semibold">{totalBrands}</strong>
        </div>
        <span className="text-[#D1D5DB]">•</span>
        <div className="flex items-center gap-1.5">
          <span>Active:</span>
          <strong className="text-[#2B2F36] font-semibold">{activeBrands}</strong>
        </div>
        <span className="text-[#D1D5DB]">•</span>
        <div className="flex items-center gap-1.5">
          <span>Inactive:</span>
          <strong className="text-[#2B2F36] font-semibold">{inactiveBrands}</strong>
        </div>
      </div>

      {/* 3. Main Content: Toolbar + Full-Width Table */}
      <div className="p-6 space-y-4 flex-1 flex flex-col min-h-0">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by brand name, code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 px-2.5 bg-white border border-[#D1D5DB] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="text-xs text-[#6B7280]">
              Showing <strong className="text-[#2B2F36] font-medium">{brands.length}</strong> brands
            </div>
          </div>
        </div>

        {/* Clean Full-Width Table */}
        <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider h-9">
                  <th className="px-4 py-2 font-semibold w-[280px]">Brand Information</th>
                  <th className="px-4 py-2 font-semibold">Code</th>
                  <th className="px-4 py-2 font-semibold text-right">Products</th>
                  <th className="px-4 py-2 font-semibold text-center">Status</th>
                  <th className="px-4 py-2 font-semibold">Created Date</th>
                  <th className="px-4 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-[#6B7280]">
                      <div className="inline-block w-5 h-5 border-2 border-[#408DFB] border-t-transparent rounded-full animate-spin mb-2" />
                      <p>Loading brands...</p>
                    </td>
                  </tr>
                ) : brands.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-[#6B7280]">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-[#2B2F36]">No brands found</p>
                        <p className="text-xs text-[#6B7280]">
                          {searchTerm || statusFilter !== 'ALL'
                            ? `No brands match your filter criteria.`
                            : 'Start organizing your products by adding your first brand.'}
                        </p>
                        {searchTerm || statusFilter !== 'ALL' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('');
                              setStatusFilter('ALL');
                            }}
                            className="mt-2 text-xs text-[#408DFB] hover:underline cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCreate}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-[#408DFB] text-white rounded-[4px] text-xs font-medium cursor-pointer shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Brand</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  brands.map((brand: any) => {
                    const isActive = brand.status === 'ACTIVE' || !brand.status;
                    const brandTitle = brand.brandName || brand.name || 'Unnamed Brand';
                    const brandCode = brand.brandCode || brand.code || '—';
                    const brandDesc = brand.description;
                    const brandWeb = brand.website;

                    return (
                      <tr key={brand.id} className="hover:bg-[#F5F7FA] transition-colors min-h-[41px]">
                        <td className="px-4 py-2.5 font-medium text-[#2B2F36]">
                          <div className="flex flex-col">
                            <span className="font-medium text-[#2B2F36]">{brandTitle}</span>
                            {brandDesc && (
                              <span className="text-[11px] text-[#6B7280] truncate max-w-[240px]">
                                {brandDesc}
                              </span>
                            )}
                            {brandWeb && !brandDesc && (
                              <a
                                href={brandWeb.startsWith('http') ? brandWeb : `https://${brandWeb}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-[#408DFB] hover:underline inline-flex items-center gap-0.5 truncate max-w-[240px]"
                              >
                                <span>{brandWeb}</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280]">
                          {brandCode}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#2B2F36] font-medium">
                          {brand._count?.products || 0}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[11px] font-medium bg-[#ECFDF5] text-[#059669]">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[11px] font-medium bg-[#F3F4F6] text-[#6B7280]">
                              INACTIVE
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280] text-xs">
                          {brand.createdAt ? new Date(brand.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(brand)}
                              className="p-1.5 text-[#6B7280] hover:text-[#408DFB] hover:bg-[#EBF3FF] rounded-[4px] transition-colors cursor-pointer"
                              title="Edit Brand"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(brand)}
                              disabled={deleteMutation.isPending && brandToDelete?.id === brand.id}
                              className="p-1.5 text-[#6B7280] hover:text-[#E54B4B] hover:bg-[#FEF2F2] rounded-[4px] transition-colors cursor-pointer"
                              title="Deactivate Brand"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Forms & Dialogs */}
      <BrandFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        brand={selectedBrand}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setIsDeleteDialogOpen(false);
            setBrandToDelete(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Deactivate Brand"
        message={`Are you sure you want to deactivate the brand "${brandToDelete?.brandName || brandToDelete?.name}"? It will no longer be available for new products.`}
        confirmText="Deactivate"
        loadingText="Deactivating..."
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default BrandsList;
