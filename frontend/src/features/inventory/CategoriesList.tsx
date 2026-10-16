import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Download, RefreshCw } from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExportService } from '@/core/services/ExportService';
import { cn } from '@/lib/utils';

export const CategoriesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/categories');
      const items = res.data?.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/inventory/categories/${id}`);
    },
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: ['categories'] });
      } catch {
        notification.warning('Category deleted successfully, but could not refresh list. Please refresh the page.');
        return;
      }
      notification.success('Category deleted successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Unable to delete category. Please try again.');
    },
  });

  const handleDelete = async (id: string, name: string) => {
    if (deleteMutation.isPending) return;
    const confirmed = await dialog.confirmDelete(
      'Delete Category?',
      `Are you sure you want to permanently delete category "${name}"?`
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

  // Export CSV
  const handleExport = () => {
    if (filteredData.length === 0) {
      notification.warning('No categories to export');
      return;
    }
    const headers = ['Category Name', 'Code', 'Products', 'Status'];
    const rows = filteredData.map((c: any) => ({
      'Category Name': c.name || '',
      Code: c.code || '',
      Products: c._count?.products || 0,
      Status: c.status || 'ACTIVE',
    }));
    ExportService.exportCsv('Categories_List.csv', rows, headers);
  };

  const filteredData = useMemo(() => {
    return data.filter((c: any) => {
      const matchesSearch =
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  // KPIs
  const totalCategories = data.length;
  const activeCategories = data.filter((c: any) => c.status === 'ACTIVE' || !c.status).length;
  const inactiveCategories = totalCategories - activeCategories;
  const totalProductsLinked = data.reduce(
    (acc: number, c: any) => acc + (c._count?.products || 0),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white text-[#2B2F36] overflow-y-auto">
      {/* 1. Page Header (Zoho Books Style) */}
      <div className="px-6 py-4 border-b border-[#E5E7EB] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[#2B2F36] leading-tight">
              Product Categories
            </h1>
            <span className="px-2 py-0.5 rounded-[4px] bg-[#F3F4F6] text-[#6B7280] text-xs font-medium">
              {totalCategories}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Organize and classify products across sales, purchases, and reporting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-3 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#2B2F36] rounded-[4px] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-[#6B7280]', isFetching && 'animate-spin')} />
            <span>Refresh</span>
          </button>

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
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Zoho Summary Strip */}
      <div className="px-6 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] flex flex-wrap items-center gap-6 text-xs text-[#6B7280] shrink-0">
        <div className="flex items-center gap-1.5">
          <span>Total Categories:</span>
          <strong className="text-[#2B2F36] font-semibold">{totalCategories}</strong>
        </div>
        <span className="text-[#D1D5DB]">•</span>
        <div className="flex items-center gap-1.5">
          <span>Active:</span>
          <strong className="text-[#2B2F36] font-semibold">{activeCategories}</strong>
        </div>
        <span className="text-[#D1D5DB]">•</span>
        <div className="flex items-center gap-1.5">
          <span>Inactive:</span>
          <strong className="text-[#2B2F36] font-semibold">{inactiveCategories}</strong>
        </div>
        <span className="text-[#D1D5DB]">•</span>
        <div className="flex items-center gap-1.5">
          <span>Products Linked:</span>
          <strong className="text-[#2B2F36] font-semibold">{totalProductsLinked}</strong>
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
              placeholder="Search categories by name or code..."
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
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2.5 bg-white border border-[#D1D5DB] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="text-xs text-[#6B7280]">
              Showing <strong className="text-[#2B2F36] font-medium">{filteredData.length}</strong> of{' '}
              {totalCategories}
            </div>
          </div>
        </div>

        {/* Clean Full-Width Table */}
        <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider h-9">
                  <th className="px-4 py-2 font-semibold">Category Name</th>
                  <th className="px-4 py-2 font-semibold">Code</th>
                  <th className="px-4 py-2 font-semibold text-right">Products</th>
                  <th className="px-4 py-2 font-semibold text-center">Status</th>
                  <th className="px-4 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-xs text-[#6B7280]">
                      <div className="inline-block w-5 h-5 border-2 border-[#408DFB] border-t-transparent rounded-full animate-spin mb-2" />
                      <p>Loading categories...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-xs text-[#6B7280]">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-[#2B2F36]">No categories found</p>
                        <p className="text-xs text-[#6B7280]">
                          {searchTerm || statusFilter !== 'ALL'
                            ? 'Try clearing your search query or filters.'
                            : 'Start organizing your inventory by adding your first category.'}
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
                            <span>Add Category</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((c: any) => {
                    const isActive = c.status === 'ACTIVE' || !c.status;
                    return (
                      <tr key={c.id} className="hover:bg-[#F5F7FA] transition-colors min-h-[41px]">
                        <td className="px-4 py-2.5 font-medium text-[#2B2F36]">
                          <div className="flex flex-col">
                            <span className="font-medium text-[#2B2F36]">{c.name}</span>
                            {c.description && (
                              <span className="text-[11px] text-[#6B7280]">{c.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280]">
                          {c.code || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#2B2F36] font-medium">
                          {c._count?.products || 0}
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
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(c)}
                              className="p-1.5 text-[#6B7280] hover:text-[#408DFB] hover:bg-[#EBF3FF] rounded-[4px] transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id, c.name)}
                              disabled={deleteMutation.isPending && deleteMutation.variables === c.id}
                              className="p-1.5 text-[#6B7280] hover:text-[#E54B4B] hover:bg-[#FEF2F2] rounded-[4px] transition-colors cursor-pointer"
                              title="Delete Category"
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
    </div>
  );
};

export default CategoriesList;
