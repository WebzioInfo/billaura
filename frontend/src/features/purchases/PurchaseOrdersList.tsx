import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Filter, Eye, Edit2, Copy, Trash2, 
  XCircle, ShoppingCart
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { PageLayout } from '@/shared/components/layout/PageLayout';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button, IconButton, KpiCard, DeleteDialog, StatusBadge, CurrencyCell, DateCell, SearchableSelect } from '@/shared/components/ui';
import { DataTable } from '@/shared/components/ui/data-table/DataTable';
import { usePagination } from '@/shared/hooks/usePagination';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { formatIndianCurrency } from '@/lib/utils';

export const PurchaseOrdersList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const [showFilters, setShowFilters] = useState(false);
  const [poToDelete, setPoToDelete] = useState<any>(null);

  // Fetch Master Data
  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/vendors');
      const list = res.data?.data || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      const list = res.data?.data || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  // Query parameters for API
  const queryParams = useMemo(() => {
    return {
      search: search || undefined,
      status: status || undefined,
      vendorId: vendorId || undefined,
      warehouseId: warehouseId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      amountMin: amountMin || undefined,
      amountMax: amountMax || undefined,
      limit: 200
    };
  }, [search, status, vendorId, warehouseId, startDate, endDate, amountMin, amountMax]);

  const { data: poResponse, isLoading: loadingPo } = useQuery<any>({
    queryKey: ['purchase-orders', queryParams],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders', { params: queryParams });
      return res.data?.data || res.data || { items: [], total: 0 };
    }
  });

  const poList = useMemo(() => {
    const list = poResponse?.items || (Array.isArray(poResponse?.data) ? poResponse.data : poResponse?.data?.items) || [];
    return Array.isArray(list) ? list : [];
  }, [poResponse]);

  // Compute live KPI metrics from total queried list
  const kpis = useMemo(() => {
    const totalCount = poList.length;
    let totalValue = 0;
    let outstandingValue = 0;
    let completed = 0;

    poList.forEach(po => {
      const gTotal = Number(po.grandTotal || 0);
      totalValue += gTotal;
      if (po.status === 'PARTIAL') outstandingValue += gTotal;
      if (po.status === 'CONVERTED') completed++;
    });

    return { totalCount, totalValue, outstandingValue, completed };
  }, [poList]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/purchase-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      notification.success('Purchase order deleted successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete purchase order');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/purchase-orders/${id}/status`, { status: 'CANCELLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      notification.success('Purchase order cancelled successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to cancel purchase order');
    }
  });

  const handleCancelPo = (id: string) => {
    if (window.confirm('Are you sure you want to cancel this purchase order?')) {
      cancelMutation.mutate(id);
    }
  };

  const handleDuplicate = (po: any) => {
    navigate(`/purchase-orders/new?duplicate=${po.id}`);
  };

  // Unified pagination (Client-side slicing for POs; TODO: endpoint should support server-side pagination)
  const {
    page,
    limit,
    totalPages,
    totalItems,
    setPage,
    setLimit,
    resetPage,
    paginatedData,
  } = usePagination({
    tableKey: 'purchase-orders',
    data: poList,
    itemLabel: 'purchase orders',
  });

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'orderNo',
      header: 'PO Number',
      cell: ({ row }) => (
        <Link
          to={`/purchase-orders/${row.original.id}`}
          className="tabular-nums font-medium text-[#111827] dark:text-[#EDEDED] hover:underline"
        >
          {row.original.orderNo}
        </Link>
      )
    },
    {
      accessorKey: 'businessPartner',
      header: 'Vendor Supplier',
      cell: ({ row }) => (
        <span className="font-medium text-[#111827] dark:text-[#EDEDED]">
          {row.original.businessPartner?.name || '—'}
        </span>
      )
    },
    {
      accessorKey: 'date',
      header: 'Order Date',
      cell: ({ row }) => <DateCell date={row.original.date} />
    },
    {
      accessorKey: 'items',
      header: () => <div className="text-right">Lines</div>,
      cell: ({ row }) => (
        <div className="text-right text-[#6B7280] dark:text-[#9CA3AF] tabular-nums text-[13px]">
          {row.original.items?.length || 0} lines
        </div>
      )
    },
    {
      accessorKey: 'grandTotal',
      header: () => <div className="text-right">Grand Total</div>,
      cell: ({ row }) => (
        <CurrencyCell
          amount={Number(row.original.grandTotal || 0)}
          className="font-semibold text-foreground text-right"
        />
      )
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <StatusBadge status={row.original.status} />
        </div>
      )
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              icon={Eye}
              aria-label="View Details"
              tooltip="View Details"
              size="dense"
              variant="ghost"
              onClick={() => navigate(`/purchase-orders/${item.id}`)}
            />
            {item.status !== 'CANCELLED' && item.status !== 'CONVERTED' && (
              <IconButton
                icon={Edit2}
                aria-label="Edit Order"
                tooltip="Edit Order"
                size="dense"
                variant="ghost"
                onClick={() => navigate(`/purchase-orders/${item.id}/edit`)}
              />
            )}
            <IconButton
              icon={Copy}
              aria-label="Duplicate Order"
              tooltip="Duplicate Order"
              size="dense"
              variant="ghost"
              onClick={() => handleDuplicate(item)}
            />
            {item.status !== 'CANCELLED' && item.status !== 'CONVERTED' && (
              <IconButton
                icon={XCircle}
                aria-label="Cancel Order"
                tooltip="Cancel Order"
                size="dense"
                variant="danger-ghost"
                onClick={() => handleCancelPo(item.id)}
              />
            )}
            {item.status === 'DRAFT' && (
              <IconButton
                icon={Trash2}
                aria-label="Delete Draft"
                tooltip="Delete Draft"
                size="dense"
                variant="danger-ghost"
                onClick={() => setPoToDelete(item)}
              />
            )}
          </div>
        );
      }
    }
  ], [navigate]);

  return (
    <>
      <PageLayout
        isLoading={loadingPo && poList.length === 0}
        loadingTitle="Loading Purchase Orders..."
        loadingDescription="Fetching purchase orders and commitments..."
      >
        <PageHeader
          title="Purchase Orders"
          count={kpis.totalCount}
          primaryAction={
            <Button
              onClick={() => navigate('/purchase-orders/new')}
              variant="primary"
              size="md"
            >
              <Plus className="w-4 h-4" /> New Purchase Order
            </Button>
          }
        />

        {/* KPI Cards section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 shrink-0 mb-3 text-left">
          <KpiCard
            label="Total Purchase Value"
            value={`₹${formatIndianCurrency(kpis.totalValue)}`}
            helperText={`Across ${kpis.totalCount} purchase orders`}
            isLoading={loadingPo}
          />
          <KpiCard
            label="Pending Delivery Value"
            value={`₹${formatIndianCurrency(kpis.outstandingValue)}`}
            helperText="Pending incoming fulfillment"
            isLoading={loadingPo}
          />
          <KpiCard
            label="Completed Orders"
            value={kpis.completed.toString()}
            helperText="Fully received orders"
            indicatorDot="collected"
            isLoading={loadingPo}
          />
        </div>

        {/* Expanded filters panel */}
        {showFilters && (
          <div className="bg-surface border border-border p-3.5 rounded-xl shadow-xs shrink-0 mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <SearchableSelect
                label="Supplier"
                placeholder="All Suppliers"
                searchPlaceholder="Search supplier..."
                value={vendorId}
                onChange={val => { setVendorId(val); resetPage(); }}
                options={vendors}
                mapOption={(v: any) => ({ label: v.name, value: v.id })}
                clearable
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">PO Status</label>
              <select
                value={status}
                onChange={e => { setStatus(e.target.value); resetPage(); }}
                className="w-full h-9 bg-background border border-border rounded-[6px] px-2 text-[13px] text-foreground focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Approved / Confirmed</option>
                <option value="PARTIAL">Partially Received</option>
                <option value="CONVERTED">Fully Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <SearchableSelect
                label="Warehouse"
                placeholder="All Warehouses"
                searchPlaceholder="Search warehouse..."
                value={warehouseId}
                onChange={val => { setWarehouseId(val); resetPage(); }}
                options={warehouses}
                mapOption={(w: any) => ({ label: w.name, value: w.id })}
                clearable
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setVendorId('');
                  setStatus('');
                  setWarehouseId('');
                  setStartDate('');
                  setEndDate('');
                  setAmountMin('');
                  setAmountMax('');
                  setSearch('');
                  resetPage();
                }}
                className="w-full h-8 text-[13px]"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={paginatedData}
          totalItems={totalItems}
          manualPagination={true}
          pagination={{
            pageIndex: page - 1,
            pageSize: limit,
          }}
          onPaginationChange={(updater: any) => {
            const next = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize: limit }) : updater;
            if (next.pageIndex !== undefined) setPage(next.pageIndex + 1);
            if (next.pageSize !== undefined) setLimit(next.pageSize);
          }}
          isLoading={loadingPo}
          storageKey="purchase-orders"
          searchPlaceholder="Search by PO number or supplier name..."
          globalFilter={search}
          onGlobalFilterChange={(val) => {
            setSearch(val);
            resetPage();
          }}
          toolbarExtras={
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setShowFilters(!showFilters)}
              className="text-[13px]"
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {(status || vendorId || warehouseId || startDate || endDate || amountMin || amountMax) && (
                <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
              )}
            </Button>
          }
          exportFilename="Purchase_Orders_List"
          itemLabel="purchase orders"
          emptyText="No purchase orders found"
          emptyDescription="Create your first purchase order to start procurement flows."
          emptyActionLabel="New Purchase Order"
          onEmptyAction={() => navigate('/purchase-orders/new')}
        />
      </PageLayout>

      <DeleteDialog
        isOpen={!!poToDelete}
        onClose={() => setPoToDelete(null)}
        onConfirm={async () => {
          deleteMutation.mutate(poToDelete.id);
          setPoToDelete(null);
        }}
        entityName="Purchase Order"
        entityId={poToDelete?.orderNo}
        warningText="This action cannot be undone."
      />
    </>
  );
};
