import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Printer, Trash2, Edit3, Eye, SlidersHorizontal, Receipt as ReceiptIcon
} from 'lucide-react';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button, IconButton, KpiCard, DeleteDialog, StatusBadge, TypeBadge, CurrencyCell, DateCell } from '@/shared/components/ui';
import { DataTable } from '@/shared/components/ui/data-table/DataTable';
import { usePagination } from '@/shared/hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { formatIndianCurrency } from '@/lib/utils';

export const ReceiptsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  
  // Advanced filters state
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [receiptToVoid, setReceiptToVoid] = useState<any>(null);

  // Unified pagination hook
  const {
    page,
    limit,
    totalPages,
    totalItems,
    setPage,
    setLimit,
    resetPage,
  } = usePagination({
    tableKey: 'receipts',
    defaultLimit: 25,
    itemLabel: 'receipts',
  });

  const { data, isLoading: loading, refetch: fetchReceipts } = useQuery({
    queryKey: [
      'receipts-unified', 
      search, 
      statusFilter, 
      methodFilter, 
      typeFilter,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      page, 
      limit
    ],
    queryFn: async () => {
      const res = await apiClient.get('/receipts/unified', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          paymentMethod: methodFilter || undefined,
          type: typeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minAmount: minAmount || undefined,
          maxAmount: maxAmount || undefined,
          page,
          limit,
        }
      });
      return res.data || {};
    }
  });

  const receipts = data?.data?.items || data?.items || (Array.isArray(data?.data) ? data.data : []);
  const serverTotal = data?.data?.total || data?.data?.totalItems || data?.meta?.totalItems || receipts.length || 0;
  const serverTotalPages = data?.data?.totalPages || data?.meta?.totalPages || Math.max(1, Math.ceil(serverTotal / limit));

  const handlePrint = async (id: string) => {
    try {
      const res = await apiClient.post(`/receipts/${id}/print`);
      notification.success(res.data?.message || 'Receipt sent to printer spool');
    } catch {
      notification.error('Failed to trigger receipt print');
    }
  };

  const handleVoid = async () => {
    if (!receiptToVoid) return;
    try {
      await apiClient.delete(`/receipts/${receiptToVoid.rawId}`);
      if (receiptToVoid.type === 'PURCHASE') {
        await erpInvalidate.purchaseReceipt(queryClient, {
          vendorId: receiptToVoid.businessPartnerId || receiptToVoid.vendorId,
          accountId: receiptToVoid.bankAccountId || receiptToVoid.accountId,
        });
      } else if (receiptToVoid.type === 'EXPENSE') {
        await erpInvalidate.expenseReceipt(queryClient, {
          accountId: receiptToVoid.bankAccountId || receiptToVoid.accountId,
        });
      } else {
        await erpInvalidate.salesReceipt(queryClient, {
          customerId: receiptToVoid.businessPartnerId || receiptToVoid.customerId,
          accountId: receiptToVoid.bankAccountId || receiptToVoid.accountId,
        });
      }
      notification.success('Receipt voided and reversed successfully');
      fetchReceipts();
    } catch {
      notification.error('Failed to void receipt');
    } finally {
      setReceiptToVoid(null);
    }
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <TypeBadge type={row.original.type || 'PAYMENT_RECEIPT'} />
    },
    {
      accessorKey: 'receiptNo',
      header: 'Voucher No',
      cell: ({ row }) => <span className="tabular-nums font-medium text-[#111827] dark:text-[#EDEDED]">{row.original.receiptNo}</span>
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => <DateCell value={row.original.date} />
    },
    {
      accessorKey: 'partyName',
      header: 'Party',
      cell: ({ row }) => <span className="font-medium text-[#111827] dark:text-[#EDEDED]">{row.original.partyName}</span>
    },
    {
      accessorKey: 'paymentLedgerName',
      header: 'Payment Ledger',
      cell: ({ row }) => <span className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF]">{row.original.paymentLedgerName}</span>
    },
    {
      accessorKey: 'expenseLedgerName',
      header: 'Expense Ledger',
      cell: ({ row }) => <span className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF]">{row.original.expenseLedgerName || '—'}</span>
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => <CurrencyCell value={row.original.amount} isBold />
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <StatusBadge status={row.original.status || 'COMPLETED'} />
        </div>
      )
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const r = row.original;
        const isSales = r.type === 'SALES';

        if (!isSales) {
          return (
            <span className="text-[11px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-[4px]">
              Managed in {r.type === 'PURCHASE' ? 'Purchases' : 'Expenses'}
            </span>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              icon={Eye}
              aria-label="View Receipt"
              tooltip="View Receipt"
              size="dense"
              variant="ghost"
              onClick={() => navigate(`/receipts/${r.rawId}`)}
            />
            <IconButton
              icon={Edit3}
              aria-label="Edit Receipt"
              tooltip="Edit Receipt"
              size="dense"
              variant="ghost"
              onClick={() => navigate(`/receipts/${r.rawId}/edit`)}
            />
            <IconButton
              icon={Printer}
              aria-label="Print Receipt"
              tooltip="Print Receipt"
              size="dense"
              variant="ghost"
              onClick={() => handlePrint(r.rawId)}
            />
            {r.status === 'COMPLETED' && (
              <IconButton
                icon={Trash2}
                aria-label="Delete Receipt"
                tooltip="Delete Receipt"
                size="dense"
                variant="danger-ghost"
                onClick={() => setReceiptToVoid(r)}
              />
            )}
          </div>
        );
      }
    }
  ], [navigate]);

  const totalSalesReceived = useMemo(() => {
    return receipts
      .filter((r: any) => r.type === 'SALES')
      .reduce((acc: number, curr: any) => acc + (curr.status === 'COMPLETED' ? Number(curr.amount) : 0), 0);
  }, [receipts]);

  const totalExpenseAmount = useMemo(() => {
    return receipts
      .filter((r: any) => r.type === 'EXPENSE')
      .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
  }, [receipts]);

  const toolbarExtras = (
    <div className="flex items-center gap-2">
      <select
        value={typeFilter}
        onChange={(e) => {
          setTypeFilter(e.target.value);
          resetPage();
        }}
        className="h-9 text-[13px] bg-background border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] px-2.5 text-foreground focus:outline-none cursor-pointer"
        aria-label="Filter Type"
      >
        <option value="">All Types</option>
        <option value="SALES">Sales Receipts</option>
        <option value="PURCHASE">Purchase Payments</option>
        <option value="EXPENSE">Expense Payments</option>
      </select>

      <Button
        variant={showAdvanced ? 'primary' : 'secondary'}
        size="md"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-[13px]"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filters
      </Button>
    </div>
  );

  return (
    <PageLayout>
      <PageHeader
        title="Payments Received"
        count={serverTotal}
        primaryAction={
          <Button
            onClick={() => navigate('/receipts/new')}
            variant="primary"
            size="md"
          >
            <Plus className="w-4 h-4" /> New Receipt
          </Button>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0 mb-3">
        <KpiCard
          label="Total Received (Sales)"
          value={`₹${formatIndianCurrency(totalSalesReceived)}`}
          helperText="Completed customer receipts"
          isLoading={loading}
        />
        <KpiCard
          label="Total Records"
          value={serverTotal.toLocaleString('en-IN')}
          helperText="Matching vouchers"
          isLoading={loading}
        />
        <KpiCard
          label="Approved Expenses"
          value={`₹${formatIndianCurrency(totalExpenseAmount)}`}
          helperText="Posted expense payments"
          isLoading={loading}
        />
      </div>

      {/* Expandable Advanced Filters Drawer / Section */}
      {showAdvanced && (
        <div className="bg-surface border border-border p-3.5 rounded-xl shadow-xs shrink-0 mb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                resetPage();
              }}
              className="w-full h-8 bg-background border border-border rounded-[6px] px-2 text-[13px] text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                resetPage();
              }}
              className="w-full h-8 bg-background border border-border rounded-[6px] px-2 text-[13px] text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Min Amount (₹)</label>
            <input
              type="number"
              placeholder="Min"
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                resetPage();
              }}
              className="w-full h-8 bg-background border border-border rounded-[6px] px-2 text-[13px] text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Max Amount (₹)</label>
            <input
              type="number"
              placeholder="Max"
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value);
                resetPage();
              }}
              className="w-full h-8 bg-background border border-border rounded-[6px] px-2 text-[13px] text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Payment Method</label>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                resetPage();
              }}
              className="w-full h-8 bg-background border border-border rounded-[6px] px-2 text-[13px] text-foreground focus:outline-none"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setTypeFilter('');
                setStatusFilter('');
                setMethodFilter('');
                setStartDate('');
                setEndDate('');
                setMinAmount('');
                setMaxAmount('');
                setSearch('');
                resetPage();
              }}
              variant="secondary"
              size="sm"
              className="w-full h-8 text-[13px]"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={receipts}
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
        isLoading={loading}
        storageKey="receipts"
        searchPlaceholder="Search receipt no or customer..."
        globalFilter={search}
        onGlobalFilterChange={(val) => {
          setSearch(val);
          resetPage();
        }}
        toolbarExtras={toolbarExtras}
        exportFilename="Receipts_List"
        itemLabel="receipts"
        emptyText="No receipts found"
        emptyDescription="Record a receipt to allocate and post payment entries."
        emptyActionLabel="Record First Receipt"
        onEmptyAction={() => navigate('/receipts/new')}
      />

      <DeleteDialog
        isOpen={!!receiptToVoid}
        onClose={() => setReceiptToVoid(null)}
        onConfirm={handleVoid}
        entityName="Receipt"
        entityId={receiptToVoid?.receiptNo}
        warningText="This action cannot be undone. This will void the payment receipt and reverse all general ledger entry balances."
      />
    </PageLayout>
  );
};
