import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, Eye, Edit2, Trash2, Users, MapPin, Building2, Phone } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer, EmptyState, LoadingState, TableLoader, SummaryCardLoader } from '@/shared/components/ui';
import { DataTable } from '@/shared/components/ui/data-table/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/shared/components/ui/Button';
import { DeleteDialog } from '@/shared/components/ui';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';

export const VendorsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Pagination
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [vendorToDelete, setVendorToDelete] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vendors', search, statusFilter, typeFilter, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      const res = await apiClient.get('/vendors', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          customerType: typeFilter || undefined,
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize
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
  const totalPages = data?.data?.totalPages || data?.meta?.totalPages || 1;
  const totalItems = data?.data?.total || data?.data?.totalItems || data?.meta?.totalItems || vendors.length || 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: 'bpCode',
      header: 'Vendor Code',
      cell: ({ row }) => <span className="font-mono font-medium text-foreground">{row.original.bpCode || row.original.vendorCode}</span>
    },
    {
      accessorKey: 'name',
      header: 'Vendor Name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.original.name}</span>
          {row.original.tradeName && <span className="text-xs text-muted-foreground">{row.original.tradeName}</span>}
        </div>
      )
    },
    {
      accessorKey: 'contact',
      header: 'Contact Info',
      cell: ({ row }) => (
        <div className="flex flex-col text-sm space-y-1 mt-1">
          {row.original.email && <span className="text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> {row.original.email}</span>}
          {row.original.phone && <span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {row.original.phone}</span>}
        </div>
      )
    },
    {
      accessorKey: 'gstin',
      header: 'GSTIN',
      cell: ({ row }) => <span className="font-mono text-sm uppercase">{row.original.gstin || '-'}</span>
    },
    {
      accessorKey: 'state',
      header: 'State',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {row.original.state ? <><MapPin className="w-3.5 h-3.5" /> {row.original.state}</> : '-'}
        </div>
      )
    },
    {
      accessorKey: 'payableBalance',
      header: () => <div className="text-right">Outstanding</div>,
      cell: ({ row }) => (
        <div className="text-right font-semibold text-foreground">
          {formatCurrency(Number(row.original.payableBalance || 0))}
        </div>
      )
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const v = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => navigate(`/vendors/${v.id}`)}
              variant="outline"
              size="sm"
              title="View Profile"
              className="h-8 flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> <span className="hidden xl:inline">View</span>
            </Button>
            <Button
              onClick={() => navigate(`/vendors/${v.id}/edit`)}
              variant="outline"
              size="sm"
              title="Edit Vendor"
              className="h-8 w-8 p-0"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={() => setVendorToDelete(v)}
              variant="outline"
              size="sm"
              title="Delete Vendor"
              className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900/50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      }
    }
  ], [navigate]);

  const toolbarExtras = (
    <div className="flex flex-1 flex-wrap items-center gap-3">
      <div className="relative max-w-sm w-[280px]">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination(prev => ({ ...prev, pageIndex: 0 }));
          }}
          className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          setPagination(prev => ({ ...prev, pageIndex: 0 }));
        }}
        className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>

      <Button onClick={() => refetch()} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl" title="Refresh">
        <RefreshCw className="w-4 h-4" />
      </Button>

      <div className="ml-auto flex items-center">
        <Button
          onClick={() => navigate('/vendors/new')}
          className="flex items-center gap-2 font-bold px-5 h-9 rounded-xl"
          variant="primary"
        >
          <Plus className="w-4 h-4" /> New Vendor
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <PageContainer maxWidth="7xl">
        <PageHeader
          title="Vendors"
          description="Manage supplier records, purchasing relationships, and outstanding payables."
        />

        {isLoading ? (
          <SummaryCardLoader count={1} className="grid-cols-1 md:grid-cols-3 gap-6 mb-6" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-surface border border-border p-6 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-500"><Users className="w-6 h-6" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Vendors</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{totalItems}</h3>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <TableLoader cols={6} rows={6} className="bg-surface border border-border rounded-xl" />
        ) : vendors.length === 0 && !search && !statusFilter && !typeFilter ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-muted-foreground" />}
            title="No vendors found"
            description="Create your first vendor to start issuing purchase orders and recording bills."
            actionLabel="Create Vendor"
            onActionClick={() => navigate('/vendors/new')}
          />
        ) : (
          <DataTable
            columns={columns}
            data={vendors}
            toolbarExtras={toolbarExtras}
            exportFilename="Vendors_List"
            manualPagination={true}
            pageCount={totalPages}
            pagination={pagination}
            onPaginationChange={setPagination}
            totalItems={totalItems}
            emptyText="No vendors match the selected filters."
          />
        )}
      </PageContainer>
      
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
    </>
  );
};
