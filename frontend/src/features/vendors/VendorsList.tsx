import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Edit2, Trash2, MapPin, Building2, Phone } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { PageLayout } from '@/shared/components/layout/PageLayout';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button, IconButton, KpiCard, CurrencyCell, DeleteDialog } from '@/shared/components/ui';
import { DataTable } from '@/shared/components/ui/data-table/DataTable';
import { usePagination } from '@/shared/hooks/usePagination';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';

export const VendorsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [vendorToDelete, setVendorToDelete] = useState<any>(null);

  // Unified pagination
  const {
    page,
    limit,
    totalPages,
    totalItems,
    setPage,
    setLimit,
    resetPage,
  } = usePagination({
    tableKey: 'vendors',
    defaultLimit: 25,
    itemLabel: 'vendors',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', search, statusFilter, typeFilter, page, limit],
    queryFn: async () => {
      const res = await apiClient.get('/vendors', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          customerType: typeFilter || undefined,
          page,
          limit,
        }
      });
      return res.data || {};
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/vendors/${id}`);
    },
    onSuccess: () => {
      notification.success('Vendor deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error: any) => {
      notification.error(error.response?.data?.message || 'Failed to delete vendor');
    }
  });

  const vendors = data?.data?.items || data?.items || (Array.isArray(data?.data) ? data.data : []) || [];
  const serverTotal = data?.data?.total || data?.data?.totalItems || data?.meta?.totalItems || vendors.length || 0;
  const serverTotalPages = data?.data?.totalPages || data?.meta?.totalPages || Math.max(1, Math.ceil(serverTotal / limit));

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: 'bpCode',
      header: 'Vendor Code',
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-[#111827] dark:text-[#EDEDED]">
          {row.original.bpCode || row.original.vendorCode || '—'}
        </span>
      )
    },
    {
      accessorKey: 'name',
      header: 'Vendor Name',
      cell: ({ row }) => {
        const v = row.original;
        return (
          <div className="py-0.5">
            <button
              type="button"
              onClick={() => navigate(`/vendors/${v.id}`)}
              className="font-medium text-[#111827] dark:text-[#EDEDED] hover:underline text-left cursor-pointer transition-colors block truncate max-w-xs"
            >
              {v.name}
            </button>
            {v.tradeName && <span className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] block">{v.tradeName}</span>}
          </div>
        );
      }
    },
    {
      accessorKey: 'contact',
      header: 'Contact Info',
      cell: ({ row }) => (
        <div className="text-[13px] space-y-0.5">
          {row.original.email && (
            <span className="text-[#4B5563] dark:text-[#D1D5DB] flex items-center gap-1.5 truncate max-w-[180px]">
              <Building2 className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
              {row.original.email}
            </span>
          )}
          {row.original.phone && (
            <span className="text-[#6B7280] dark:text-[#9CA3AF] tabular-nums flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
              {row.original.phone}
            </span>
          )}
        </div>
      )
    },
    {
      accessorKey: 'gstin',
      header: 'GSTIN',
      cell: ({ row }) => (
        <span className="tabular-nums text-[13px] uppercase text-[#111827] dark:text-[#EDEDED]">
          {row.original.gstin || '—'}
        </span>
      )
    },
    {
      accessorKey: 'state',
      header: 'State',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-[13px] text-[#4B5563] dark:text-[#D1D5DB]">
          {row.original.state ? (
            <>
              <MapPin className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
              {row.original.state}
            </>
          ) : '—'}
        </div>
      )
    },
    {
      accessorKey: 'payableBalance',
      header: () => <div className="text-right">Outstanding</div>,
      cell: ({ row }) => (
        <CurrencyCell amount={Number(row.original.payableBalance || 0)} className="font-semibold text-foreground text-right" />
      )
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const v = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              icon={Eye}
              aria-label="View Vendor"
              tooltip="View Profile"
              size="dense"
              variant="ghost"
              onClick={() => navigate(`/vendors/${v.id}`)}
            />
            <IconButton
              icon={Edit2}
              aria-label="Edit Vendor"
              tooltip="Edit Vendor"
              size="dense"
              variant="ghost"
              onClick={() => navigate(`/vendors/${v.id}/edit`)}
            />
            <IconButton
              icon={Trash2}
              aria-label="Delete Vendor"
              tooltip="Delete Vendor"
              size="dense"
              variant="danger-ghost"
              onClick={() => setVendorToDelete(v)}
            />
          </div>
        );
      }
    }
  ], [navigate]);

  const toolbarExtras = (
    <div className="flex items-center gap-2">
      <select
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          resetPage();
        }}
        className="h-9 text-[13px] bg-background border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] px-2.5 text-foreground focus:outline-none cursor-pointer"
        aria-label="Filter status"
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>
    </div>
  );

  return (
    <PageLayout
      isLoading={isLoading && vendors.length === 0}
      loadingTitle="Loading Vendors..."
      loadingDescription="Fetching supplier directory and payables..."
    >
      <PageHeader
        title="Vendors"
        count={serverTotal}
        primaryAction={
          <Button
            onClick={() => navigate('/vendors/new')}
            variant="primary"
            size="md"
          >
            <Plus className="w-4 h-4" /> New Vendor
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 shrink-0 mb-3">
        <KpiCard
          label="Total Vendors"
          value={isLoading ? '—' : serverTotal.toLocaleString('en-IN')}
          helperText="Active suppliers and payees"
          isLoading={isLoading}
        />
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        totalItems={serverTotal}
        manualPagination={true}
        pageCount={serverTotalPages}
        pagination={{
          pageIndex: page - 1,
          pageSize: limit,
        }}
        onPaginationChange={(updater: any) => {
          const next = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize: limit }) : updater;
          if (next.pageIndex !== undefined) setPage(next.pageIndex + 1);
          if (next.pageSize !== undefined) setLimit(next.pageSize);
        }}
        isLoading={isLoading}
        storageKey="vendors"
        searchPlaceholder="Search vendors by name, code, GST..."
        globalFilter={search}
        onGlobalFilterChange={(val) => {
          setSearch(val);
          resetPage();
        }}
        toolbarExtras={toolbarExtras}
        exportFilename="Vendors_List"
        itemLabel="vendors"
        emptyText="No vendors found"
        emptyDescription="Create your first vendor to start issuing purchase orders and recording bills."
        emptyActionLabel="Create Vendor"
        onEmptyAction={() => navigate('/vendors/new')}
      />

      <DeleteDialog
        isOpen={!!vendorToDelete}
        onClose={() => setVendorToDelete(null)}
        onConfirm={async () => {
          if (vendorToDelete) {
            deleteMutation.mutate(vendorToDelete.id);
            setVendorToDelete(null);
          }
        }}
        entityName="Vendor"
        entityId={vendorToDelete?.name}
        warningText="WARNING: Deleting a vendor will remove them from the system. Ensure there are no active purchase orders or pending bills."
      />
    </PageLayout>
  );
};
