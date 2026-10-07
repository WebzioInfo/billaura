import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Mail, Phone } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button, IconButton } from '@/shared/components/ui';
import { DataTable } from '@/shared/components/ui/data-table';
import { usePagination } from '@/shared/hooks/usePagination';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const CustomersList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const { data: crm = [], isLoading: loading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      const items = res.data?.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      notification.success('Customer deleted successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete customer');
    }
  });

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await dialog.confirmDelete(
      'Delete Customer?',
      `Are you sure you want to delete customer "${name}"? This action cannot be undone.`
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const filteredCustomers = useMemo(() => {
    return crm.filter((c: any) => {
      const matchesSearch =
        !searchTerm ||
        (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.bpCode && c.bpCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType =
        selectedType === 'ALL' ||
        (c.customerType && c.customerType.toUpperCase() === selectedType.toUpperCase());

      return matchesSearch && matchesType;
    });
  }, [crm, searchTerm, selectedType]);

  const customerTypes = useMemo(() => {
    const types = new Set<string>();
    crm.forEach((c: any) => {
      if (c.customerType) types.add(c.customerType);
    });
    return Array.from(types);
  }, [crm]);

  // Unified pagination (Client-side slicing for customers; TODO: endpoint should support server-side pagination)
  const {
    page,
    limit,
    totalPages,
    totalItems,
    setPage,
    setLimit,
    paginatedData,
  } = usePagination({
    tableKey: 'customers',
    data: filteredCustomers,
    itemLabel: 'customers',
  });

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'bpCode',
      header: 'Code',
      cell: ({ row }) => (
        <span className="tabular-nums text-[13px] font-medium text-[#111827] dark:text-[#EDEDED]">
          {row.original.bpCode || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Customer Name',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="py-0.5">
            <button
              type="button"
              onClick={() => navigate(`/customers/${c.id}`)}
              className="font-medium text-[#111827] dark:text-[#EDEDED] hover:underline text-left cursor-pointer truncate block max-w-xs transition-colors"
            >
              {c.name}
            </button>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {c.customerType && (
                <span className="inline-block text-[11px] font-medium bg-[#F3F4F6] dark:bg-[#27272A] text-[#4B5563] dark:text-[#D1D5DB] px-1.5 py-0.5 rounded-[4px]">
                  {c.customerType}
                </span>
              )}
              {c.customerSegment && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[11px] font-medium text-white ${c.customerSegment.color || 'bg-slate-500'}`}>
                  {c.customerSegment.name}
                </span>
              )}
              {c.customerDepartment && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[11px] font-medium text-[#1E40AF] bg-[#DBEAFE] dark:bg-blue-950/40 dark:text-blue-300">
                  {c.customerDepartment.name}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'tradeName',
      header: 'Trade Name / GSTIN',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div>
            <div className="text-[14px] text-[#111827] dark:text-[#EDEDED]">{c.tradeName || '—'}</div>
            <div className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">{c.gstin || 'No GSTIN'}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'contact',
      header: 'Contact Details',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div>
            <div className="text-[13px] flex items-center gap-1.5">
              {c.email ? (
                <>
                  <Mail className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] shrink-0" />
                  <span className="truncate max-w-[180px] text-[#4B5563] dark:text-[#D1D5DB]">{c.email}</span>
                </>
              ) : (
                <span className="text-[#9CA3AF]">—</span>
              )}
            </div>
            {c.phone && (
              <div className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] tabular-nums flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-[#6B7280] dark:text-[#9CA3AF] shrink-0" />
                <span>{c.phone}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              icon={Eye}
              aria-label="View Customer"
              tooltip="View Customer"
              size="dense"
              variant="ghost"
              onClick={() => navigate(`/customers/${c.id}`)}
            />
            <IconButton
              icon={Edit}
              aria-label="Edit Customer"
              tooltip="Edit Customer"
              size="dense"
              variant="ghost"
              onClick={() => navigate(`/customers/${c.id}/edit`)}
            />
            <IconButton
              icon={Trash2}
              aria-label="Delete Customer"
              tooltip="Delete Customer"
              size="dense"
              variant="danger-ghost"
              onClick={() => handleDelete(c.id, c.name)}
            />
          </div>
        );
      },
    },
  ], [navigate]);

  return (
    <PageLayout
      isLoading={loading && crm.length === 0}
      loadingTitle="Loading Customers..."
      loadingDescription="Fetching customer directory and accounts..."
    >
      <PageHeader
        title="Customers"
        count={crm.length}
        primaryAction={
          <Button
            onClick={() => navigate('/customers/new')}
            variant="primary"
            size="md"
          >
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        }
      />

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
        isLoading={loading}
        storageKey="customers"
        searchPlaceholder="Search by name, code, GST, phone..."
        globalFilter={searchTerm}
        onGlobalFilterChange={setSearchTerm}
        itemLabel="customers"
        emptyText="No customers found"
        emptyDescription="Manage your client list and billing relationships by adding your first customer."
        emptyActionLabel="Add First Customer"
        onEmptyAction={() => navigate('/customers/new')}
        toolbarExtras={
          customerTypes.length > 0 ? (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-9 text-[13px] bg-background border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] px-2.5 text-foreground focus:outline-none cursor-pointer"
              aria-label="Filter customer type"
            >
              <option value="ALL">All Types</option>
              {customerTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : null
        }
      />
    </PageLayout>
  );
};
