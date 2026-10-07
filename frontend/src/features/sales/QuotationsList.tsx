import React, { useState, useMemo } from 'react';
import { Plus, Eye, Trash2, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';

import { PageLayout } from '@/shared/components/layout/PageLayout';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button, IconButton, KpiCard, StatusBadge, CurrencyCell, DateCell } from '@/shared/components/ui';
import { DataTable } from '@/shared/components/ui/data-table';
import { DataTableError } from '@/shared/components/ui/data-table/DataTableError';
import { ConfirmDialog } from '@/shared/components/ui/action-system/ConfirmDialog';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useDebounce } from '@/shared/hooks/useDebounce';

type QuotationStatusFilter = 'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export const QuotationsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<QuotationStatusFilter>('ALL');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<any>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 1. Fetch Authoritative Quotations Summary Counts
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['quotations-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/quotations/summary');
      return res.data?.data || res.data || { total: 0, draft: 0, sent: 0, accepted: 0, rejected: 0 };
    },
    staleTime: 30000,
  });

  // 2. Fetch Quotations with Pagination & Filtering
  const {
    data: listData,
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['quotations', page, pageSize, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit: Math.min(pageSize, 100),
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await apiClient.get('/sales/quotations', { params });
      const rawData = res.data?.data !== undefined ? res.data.data : res.data;
      const items = Array.isArray(rawData) ? rawData : rawData?.items || [];
      const meta = res.data?.meta || {
        total: items.length,
        page,
        limit: pageSize,
        totalPages: Math.ceil(items.length / pageSize) || 1,
      };

      return { items, meta };
    },
  });

  const quotations: any[] = listData?.items || [];
  const totalItems = listData?.meta?.total ?? 0;

  // Stats from authoritative summary endpoint or fallback
  const totalQuotations = summaryData?.total ?? totalItems;
  const draftQuotations = summaryData?.draft ?? 0;
  const sentQuotations = summaryData?.sent ?? 0;
  const acceptedQuotations = summaryData?.accepted ?? 0;
  const rejectedQuotations = summaryData?.rejected ?? 0;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/sales/quotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-summary'] });
      notification.success('Quotation deactivated successfully');
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to deactivate quotation');
      setIsDeleteDialogOpen(false);
    },
  });

  const handleCreate = () => navigate('/quotations/new');
  const handleView = (quotation: any) => navigate(`/quotations/${quotation.id}`);

  const handleDeleteRequest = (quotation: any) => {
    setQuotationToDelete(quotation);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (quotationToDelete) {
      deleteMutation.mutate(quotationToDelete.id);
    }
  };

  const handleRetryAll = () => {
    refetchList();
    refetchSummary();
  };

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => <DateCell value={row.original.date} />,
    },
    {
      accessorKey: 'quotationNo',
      header: 'Quotation No',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleView(row.original);
          }}
          className="tabular-nums font-medium text-accent hover:underline text-left cursor-pointer"
        >
          {row.original.quotationNo}
        </button>
      ),
    },
    {
      accessorKey: 'businessPartner',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="font-medium text-[#111827] dark:text-[#EDEDED] truncate max-w-xs">
          {row.original.businessPartner?.name || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'grandTotal',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => <CurrencyCell value={row.original.grandTotal} isBold />,
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <StatusBadge status={row.original.status || 'DRAFT'} />
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const q = row.original;
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <IconButton
              icon={Eye}
              aria-label="View Quotation Details"
              tooltip="View Details"
              size="dense"
              variant="ghost"
              onClick={() => handleView(q)}
            />
            <IconButton
              icon={Trash2}
              aria-label="Deactivate Quotation"
              tooltip="Deactivate Quotation"
              size="dense"
              variant="danger-ghost"
              onClick={() => handleDeleteRequest(q)}
            />
          </div>
        );
      },
    },
  ], [navigate]);

  const toolbarExtras = (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {([
        { id: 'ALL', label: 'All', count: summaryData?.total },
        { id: 'DRAFT', label: 'Draft', count: summaryData?.draft },
        { id: 'SENT', label: 'Sent', count: summaryData?.sent },
        { id: 'ACCEPTED', label: 'Accepted', count: summaryData?.accepted },
        { id: 'REJECTED', label: 'Rejected', count: summaryData?.rejected },
      ] as const).map(({ id, label, count }) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            setStatusFilter(id as QuotationStatusFilter);
            setPage(1);
          }}
          className={`h-8 px-2.5 text-[12px] font-medium rounded-[6px] transition-colors cursor-pointer flex items-center gap-1.5 ${
            statusFilter === id
              ? 'bg-[#34303F] text-white dark:bg-[#1E1C26]'
              : 'text-[#4B5563] dark:text-[#A1A1AA] hover:bg-[#F3F4F6] dark:hover:bg-[#26262A]'
          }`}
        >
          <span>{label}</span>
          {count !== undefined && !isSummaryLoading && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                statusFilter === id
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <PageLayout
      isLoading={isListLoading && !listData}
      loadingTitle="Loading Quotations..."
      loadingDescription="Fetching quotation pipeline and estimates..."
    >
      <PageHeader
        title="Quotations"
        count={totalQuotations}
        primaryAction={
          <Button onClick={handleCreate} variant="primary" size="md">
            <Plus className="w-4 h-4" /> New Quotation
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 shrink-0 mb-3">
        <KpiCard
          label="Total Quotations"
          value={isSummaryLoading ? '—' : totalQuotations.toLocaleString('en-IN')}
          helperText="All recorded estimates"
          isLoading={isSummaryLoading}
        />
        <KpiCard
          label="Drafts"
          value={isSummaryLoading ? '—' : draftQuotations.toLocaleString('en-IN')}
          helperText="Pending submission"
          isLoading={isSummaryLoading}
        />
        <KpiCard
          label="Sent"
          value={isSummaryLoading ? '—' : sentQuotations.toLocaleString('en-IN')}
          helperText="Awaiting customer approval"
          isLoading={isSummaryLoading}
        />
        <KpiCard
          label="Accepted"
          value={isSummaryLoading ? '—' : acceptedQuotations.toLocaleString('en-IN')}
          helperText="Customer accepted"
          indicatorDot="collected"
          isLoading={isSummaryLoading}
        />
      </div>

      <DataTable
        columns={columns}
        data={quotations}
        totalItems={totalItems}
        manualPagination={true}
        pagination={{
          pageIndex: page - 1,
          pageSize,
        }}
        onPaginationChange={(updater: any) => {
          const next =
            typeof updater === 'function'
              ? updater({ pageIndex: page - 1, pageSize })
              : updater;
          if (next.pageIndex !== undefined) setPage(next.pageIndex + 1);
          if (next.pageSize !== undefined) setPageSize(next.pageSize);
        }}
        isLoading={isListLoading}
        error={
          isListError
            ? (listError as any)?.response?.data?.message ||
              (listError as Error)?.message ||
              'Unable to load quotations. Please try again.'
            : null
        }
        onRetry={handleRetryAll}
        onRowClick={handleView}
        storageKey="quotations"
        searchPlaceholder="Search by Quotation No or Customer..."
        globalFilter={searchTerm}
        onGlobalFilterChange={(val) => {
          setSearchTerm(val);
          setPage(1);
        }}
        toolbarExtras={toolbarExtras}
        exportFilename="Quotations_List"
        itemLabel="quotations"
        emptyText="No quotations found"
        emptyDescription={
          statusFilter !== 'ALL' || debouncedSearch
            ? 'No quotations match your current filter criteria.'
            : 'Create your first quotation to send estimates to customers.'
        }
        emptyActionLabel="Create Quotation"
        onEmptyAction={handleCreate}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Deactivate Quotation"
        message={`Are you sure you want to deactivate the quotation "${quotationToDelete?.quotationNo}"?`}
        confirmText="Deactivate"
        variant="danger"
      />
    </PageLayout>
  );
};
