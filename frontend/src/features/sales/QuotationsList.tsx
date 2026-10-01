import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';

import { PageLayout } from '@/shared/components/layout/PageLayout';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button, IconButton, KpiCard, StatusBadge, CurrencyCell, DateCell } from '@/shared/components/ui';
import { DataTable } from '@/shared/components/ui/data-table';
import { ConfirmDialog } from '@/shared/components/ui/action-system/ConfirmDialog';
import { usePagination } from '@/shared/hooks/usePagination';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useDebounce } from '@/shared/hooks/useDebounce';

export const QuotationsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'>('ALL');
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<any>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: any = { limit: 200 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      
      const res = await apiClient.get('/sales/quotations', { params });
      return res.data?.data || res.data || { items: [] };
    }
  });

  const quotations: any[] = Array.isArray(data) ? data : data?.items || [];
  
  // Calculate stats
  const totalQuotations = quotations.length;
  const draftQuotations = quotations.filter((q: any) => q.status === 'DRAFT').length;
  const acceptedQuotations = quotations.filter((q: any) => q.status === 'ACCEPTED').length;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/sales/quotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      notification.success('Quotation deactivated successfully');
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to deactivate quotation');
      setIsDeleteDialogOpen(false);
    }
  });

  const handleCreate = () => navigate('/quotations/new');
  const handleEdit = (quotation: any) => navigate(`/quotations/${quotation.id}/edit`);

  const handleDeleteRequest = (quotation: any) => {
    setQuotationToDelete(quotation);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (quotationToDelete) {
      deleteMutation.mutate(quotationToDelete.id);
    }
  };

  // Unified pagination (Client-side slicing for quotations; TODO: endpoint should support server-side pagination)
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
    tableKey: 'quotations',
    data: quotations,
    itemLabel: 'quotations',
  });

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => <DateCell value={row.original.date} />
    },
    {
      accessorKey: 'quotationNo',
      header: 'Quotation No',
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-[#111827] dark:text-[#EDEDED]">
          {row.original.quotationNo}
        </span>
      )
    },
    {
      accessorKey: 'businessPartner',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="font-medium text-[#111827] dark:text-[#EDEDED] truncate max-w-xs">
          {row.original.businessPartner?.name || '—'}
        </div>
      )
    },
    {
      accessorKey: 'grandTotal',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => <CurrencyCell value={row.original.grandTotal} isBold />
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <StatusBadge status={row.original.status || 'DRAFT'} />
        </div>
      )
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const q = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              icon={Edit}
              aria-label="Edit Quotation"
              tooltip="Edit Quotation"
              size="dense"
              variant="ghost"
              onClick={() => handleEdit(q)}
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
      }
    }
  ], [navigate]);

  const toolbarExtras = (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {(['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] as const).map((status) => (
        <button
          key={status}
          onClick={() => {
            setStatusFilter(status);
            resetPage();
          }}
          className={`h-8 px-2.5 text-[12px] font-medium rounded-[6px] transition-colors cursor-pointer ${
            statusFilter === status
              ? 'bg-[#34303F] text-white dark:bg-[#1E1C26]'
              : 'text-[#4B5563] dark:text-[#A1A1AA] hover:bg-[#F3F4F6] dark:hover:bg-[#26262A]'
          }`}
        >
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  );

  return (
    <PageLayout>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0 mb-3">
        <KpiCard
          label="Total Quotations"
          value={isLoading ? '—' : totalQuotations.toLocaleString('en-IN')}
          helperText="All recorded estimates"
          isLoading={isLoading}
        />
        <KpiCard
          label="Drafts"
          value={isLoading ? '—' : draftQuotations.toLocaleString('en-IN')}
          helperText="Pending submission"
          isLoading={isLoading}
        />
        <KpiCard
          label="Accepted"
          value={isLoading ? '—' : acceptedQuotations.toLocaleString('en-IN')}
          helperText="Customer accepted"
          indicatorDot="collected"
          isLoading={isLoading}
        />
      </div>

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
        isLoading={isLoading}
        storageKey="quotations"
        searchPlaceholder="Search by Quotation No or Customer..."
        globalFilter={searchTerm}
        onGlobalFilterChange={(val) => {
          setSearchTerm(val);
          resetPage();
        }}
        toolbarExtras={toolbarExtras}
        exportFilename="Quotations_List"
        itemLabel="quotations"
        emptyText="No quotations found"
        emptyDescription="Create your first quotation to send estimates to customers."
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
