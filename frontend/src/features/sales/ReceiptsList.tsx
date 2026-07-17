import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Printer, Trash2, Edit3,
  DollarSign, CheckCircle, RefreshCw, Eye, Receipt, SlidersHorizontal,
  MoreVertical
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { PageContainer, EmptyState, LoadingState, AmountText, TableLoader, SummaryCardLoader } from '@/components/ui';
import { DeleteDialog } from '@/components/ui';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import apiClient from '@/services/api';
import notification from '@/services/NotificationService';
import { useQuery } from '@tanstack/react-query';

interface RowActionsProps {
  r: any;
  navigate: any;
  handlePrint: (id: string) => void;
  setReceiptToVoid: (r: any) => void;
}

const RowActions = ({ r, navigate, handlePrint, setReceiptToVoid }: RowActionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [isOpen]);

  const isSales = r.type === 'SALES';

  if (!isSales) {
    return (
      <span className="text-[10px] text-muted-foreground font-semibold font-sans bg-muted px-2.5 py-1 rounded-lg border border-border/40">
        Managed in {r.type === 'PURCHASE' ? 'Purchases' : 'Expenses'}
      </span>
    );
  }

  return (
    <div className="relative flex justify-end items-center" ref={dropdownRef}>
      {/* Desktop / Tablet Layout: Horizontal row */}
      <div className="hidden sm:flex items-center gap-2">
        {/* View */}
        <button
          type="button"
          onClick={() => navigate(`/receipts/${r.rawId}`)}
          title="View Receipt"
          aria-label="View Receipt"
          className="h-[36px] w-[36px] rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground transition-all duration-200 hover:text-blue-500 hover:bg-blue-50/50 hover:border-blue-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Edit */}
        <button
          type="button"
          onClick={() => navigate(`/receipts/${r.rawId}/edit`)}
          title="Edit Receipt"
          aria-label="Edit Receipt"
          className="h-[36px] w-[36px] rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground transition-all duration-200 hover:text-accent hover:bg-accent/5 hover:border-accent/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {/* Print */}
        <button
          type="button"
          onClick={() => handlePrint(r.rawId)}
          title="Print Receipt"
          aria-label="Print Receipt"
          className="h-[36px] w-[36px] rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground transition-all duration-200 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* Delete / Void */}
        {r.status === 'COMPLETED' && (
          <button
            type="button"
            onClick={() => setReceiptToVoid(r)}
            title="Delete Receipt"
            aria-label="Delete Receipt"
            className="h-[36px] w-[36px] rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground transition-all duration-200 hover:text-white hover:bg-red-600 hover:border-red-600 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile Layout: 3-dot dropdown menu */}
      <div className="flex sm:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open Actions Menu"
          className="h-[36px] w-[36px] rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground transition-all duration-200 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-10 z-50 w-44 bg-surface border border-border rounded-xl shadow-lg py-1 text-left">
            <button
              type="button"
              onClick={() => {
                navigate(`/receipts/${r.rawId}`);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-muted-foreground" /> View Receipt
            </button>

            <button
              type="button"
              onClick={() => {
                navigate(`/receipts/${r.rawId}/edit`);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-muted-foreground" /> Edit Receipt
            </button>

            <button
              type="button"
              onClick={() => {
                handlePrint(r.rawId);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-muted-foreground" /> Print Receipt
            </button>

            {r.status === 'COMPLETED' && (
              <button
                type="button"
                onClick={() => {
                  setReceiptToVoid(r);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50/50 transition-colors cursor-pointer border-t border-border/40 mt-1 pt-2"
              >
                <Trash2 className="w-4 h-4 text-red-600" /> Delete Receipt
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ReceiptsList = () => {
  const navigate = useNavigate();
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
  
  // Enterprise pagination state
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [receiptToVoid, setReceiptToVoid] = useState<any>(null);

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
      pagination.pageIndex, 
      pagination.pageSize
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
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize
        }
      });
      return res.data || {};
    }
  });

  const receipts = data?.data?.items || data?.items || (Array.isArray(data?.data) ? data.data : []);
  const totalPagesValue = data?.data?.totalPages || data?.meta?.totalPages || 1;
  const totalItemsValue = data?.data?.total || data?.data?.totalItems || data?.meta?.totalItems || receipts.length || 0;

  useEffect(() => {
    setTotalPages(totalPagesValue);
    setTotalItems(totalItemsValue);
  }, [totalPagesValue, totalItemsValue]);

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
      cell: ({ row }) => {
        const type = row.original.type;
        let badgeStyle = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
        if (type === 'PURCHASE') {
          badgeStyle = 'bg-green-500/10 text-green-500 border border-green-500/20';
        } else if (type === 'EXPENSE') {
          badgeStyle = 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
        }
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${badgeStyle}`}>
            {type}
          </span>
        );
      }
    },
    {
      accessorKey: 'receiptNo',
      header: 'Voucher No',
      cell: ({ row }) => <span className="font-mono font-bold text-foreground">{row.original.receiptNo}</span>
    },
    {
      accessorKey: 'date',
      header: () => <div className="text-center">Date</div>,
      cell: ({ row }) => <div className="text-center font-mono text-xs">{new Date(row.original.date).toLocaleDateString()}</div>
    },
    {
      accessorKey: 'partyName',
      header: 'Party',
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.partyName}</span>
    },
    {
      accessorKey: 'paymentLedgerName',
      header: 'Payment Ledger',
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.paymentLedgerName}</span>
    },
    {
      accessorKey: 'expenseLedgerName',
      header: 'Expense Ledger',
      cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.expenseLedgerName}</span>
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <AmountText value={row.original.amount} />
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => {
        const s = row.original.status;
        let style = 'bg-muted/10 text-muted-foreground';
        if (s === 'COMPLETED') style = 'bg-green-500/10 text-green-500';
        else if (s === 'PENDING') style = 'bg-amber-500/10 text-amber-500';
        else if (s === 'VOID') style = 'bg-red-500/10 text-red-500';
        
        return (
          <div className="text-center">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${style}`}>
              {s}
            </span>
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <RowActions
          r={row.original}
          navigate={navigate}
          handlePrint={handlePrint}
          setReceiptToVoid={setReceiptToVoid}
        />
      )
    }
  ], [navigate]);

  const toolbarExtras = (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <div className="relative max-w-xs w-[240px]">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search receipt no or customer..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination(prev => ({ ...prev, pageIndex: 0 }));
          }}
          className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1 text-xs focus:outline-none focus:border-accent"
        />
      </div>

      <Button
        onClick={() => setShowAdvanced(!showAdvanced)}
        variant={showAdvanced ? 'primary' : 'outline'}
        size="sm"
        className="flex items-center gap-1 text-xs h-7.5"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
      </Button>

      <Button onClick={() => fetchReceipts()} variant="outline" size="sm" className="h-7 w-7 p-0 rounded-md" title="Refresh">
        <RefreshCw className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  return (
    <>
    <PageContainer maxWidth="full">
      <PageHeader
        title="Payment Receipts"
        primaryAction={
          <Button
            onClick={() => navigate('/receipts/new')}
            className="flex items-center gap-1 font-semibold"
            variant="primary"
          >
            <Plus className="w-3.5 h-3.5" /> New Receipt
          </Button>
        }
      />

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="bg-surface border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-sm text-left mb-4">
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-sans">Receipt Type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
              }}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="SALES">Sales Receipts</option>
              <option value="PURCHASE">Purchase Payments</option>
              <option value="EXPENSE">Expense Claims</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-sans">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
              }}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-sans">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
              }}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-sans">Min Amount (₹)</label>
            <input
              type="number"
              placeholder="Min"
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
              }}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-sans">Max Amount (₹)</label>
            <input
              type="number"
              placeholder="Max"
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value);
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
              }}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-sans">Payment Method</label>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
              }}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-sans">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
              }}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="VOID">Voided</option>
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
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
              }}
              variant="outline"
              size="sm"
              className="w-full text-xs py-2.5 rounded-lg"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* Quick Stats Banner */}
      {loading ? (
        <SummaryCardLoader count={3} className="grid-cols-1 md:grid-cols-3 gap-2 mb-4" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <div className="bg-surface border border-border p-2.5 rounded-md flex flex-col justify-between shadow-sm h-[68px]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1">💰 Total Received (SALES)</span>
            </div>
            <h3 className="text-base font-bold text-foreground leading-none mt-1">
              ₹{receipts.filter((r: any) => r.type === 'SALES').reduce((acc: number, curr: any) => acc + (curr.status === 'COMPLETED' ? Number(curr.amount) : 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="bg-surface border border-border p-2.5 rounded-md flex flex-col justify-between shadow-sm h-[68px]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1">✔️ Total Items</span>
            </div>
            <h3 className="text-base font-bold text-foreground leading-none mt-1">
              {totalItems} Receipts
            </h3>
          </div>
          <div className="bg-surface border border-border p-2.5 rounded-md flex flex-col justify-between shadow-sm h-[68px]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1">⏳ Total Expenses Approved</span>
            </div>
            <h3 className="text-base font-bold text-foreground leading-none mt-1">
              ₹{receipts.filter((r: any) => r.type === 'EXPENSE').reduce((acc: number, curr: any) => acc + Number(curr.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      )}

      {loading ? (
        <TableLoader cols={6} rows={6} className="bg-surface border border-border rounded-xl" />
      ) : receipts.length === 0 && !search && !statusFilter && !methodFilter && !typeFilter && !startDate && !endDate && !minAmount && !maxAmount ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-muted-foreground" />}
          title="No receipts found"
          description="Record a receipt to allocate and post payment entries."
          actionLabel="Record First Receipt"
          onActionClick={() => navigate('/receipts/new')}
        />
      ) : (
        <DataTable
          columns={columns}
          data={receipts}
          toolbarExtras={toolbarExtras}
          exportFilename="Receipts_List"
          manualPagination={true}
          pageCount={totalPages}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalItems={totalItems}
          emptyText="No receipts match the selected filters."
        />
      )}
    </PageContainer>

    <DeleteDialog
      isOpen={!!receiptToVoid}
      onClose={() => setReceiptToVoid(null)}
      onConfirm={handleVoid}
      entityName="Receipt"
      entityId={receiptToVoid?.receiptNo}
      warningText="This action cannot be undone. This will void the payment receipt and reverse all general ledger entry balances."
    />
    </>
  );
};
