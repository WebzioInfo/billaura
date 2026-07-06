import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Printer, Trash2, Edit3,
  DollarSign, CheckCircle, RefreshCw, Eye, Receipt
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { PageContainer, EmptyState, LoadingState, AmountText } from '@/components/ui';
import { DeleteDialog } from '@/components/ui';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export const ReceiptsList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  
  // Enterprise pagination state
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [receiptToVoid, setReceiptToVoid] = useState<any>(null);

  const { data, isLoading: loading, refetch: fetchReceipts } = useQuery({
    queryKey: ['receipts', search, statusFilter, methodFilter, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      const res = await apiClient.get('/receipts', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          paymentMethod: methodFilter || undefined,
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
      toast.success(res.data?.message || 'Receipt sent to printer spool');
    } catch {
      toast.error('Failed to trigger receipt print');
    }
  };

  const handleVoid = async () => {
    if (!receiptToVoid) return;
    try {
      await apiClient.delete(`/receipts/${receiptToVoid.id}`);
      toast.success('Receipt voided and reversed successfully');
      fetchReceipts();
    } catch {
      toast.error('Failed to void receipt');
    } finally {
      setReceiptToVoid(null);
    }
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: 'receiptNo',
      header: 'Receipt No',
      cell: ({ row }) => <span className="font-mono font-bold text-foreground">{row.original.receiptNo}</span>
    },
    {
      accessorKey: 'date',
      header: () => <div className="text-center">Date</div>,
      cell: ({ row }) => <div className="text-center">{new Date(row.original.date).toLocaleDateString()}</div>
    },
    {
      accessorKey: 'businessPartner.name',
      header: 'Customer',
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.businessPartner?.name || 'N/A'}</span>
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Method',
      cell: ({ row }) => <span className="text-xs font-semibold">{row.original.paymentMethod}</span>
    },
    {
      accessorKey: 'account.name',
      header: 'Account Ledger',
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.account?.name || 'N/A'}</span>
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
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => navigate(`/receipts/${r.id}`)}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1.5 hover:bg-accent/10 hover:text-accent hover:border-accent"
              title="View Receipt"
            >
              <Eye className="w-3.5 h-3.5" /> <span className="hidden xl:inline">View</span>
            </Button>
            <Button
              onClick={() => navigate(`/receipts/${r.id}/edit`)}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1.5 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500"
              title="Edit Receipt"
            >
              <Edit3 className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Edit</span>
            </Button>
            <Button
              onClick={() => handlePrint(r.id)}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1.5 hover:bg-purple-500/10 hover:text-purple-600 hover:border-purple-500"
              title="Print PDF"
            >
              <Printer className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Print</span>
            </Button>
            {r.status === 'COMPLETED' && (
              <Button
                onClick={() => setReceiptToVoid(r)}
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5 text-red-600 hover:bg-red-500/10 hover:border-red-500"
                title="Void Receipt"
              >
                <Trash2 className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Void</span>
              </Button>
            )}
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
          placeholder="Search receipt no or customer..."
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
        <option value="COMPLETED">Completed</option>
        <option value="VOID">Voided</option>
      </select>

      <select
        value={methodFilter}
        onChange={(e) => {
          setMethodFilter(e.target.value);
          setPagination(prev => ({ ...prev, pageIndex: 0 }));
        }}
        className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
      >
        <option value="">All Methods</option>
        <option value="CASH">Cash</option>
        <option value="BANK_TRANSFER">Bank Transfer</option>
        <option value="UPI">UPI</option>
        <option value="CHEQUE">Cheque</option>
        <option value="CREDIT_CARD">Credit Card</option>
      </select>

      <Button onClick={() => fetchReceipts()} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl" title="Refresh">
        <RefreshCw className="w-4 h-4" />
      </Button>

      <div className="ml-auto flex items-center">
        <Button
          onClick={() => navigate('/receipts/new')}
          className="flex items-center gap-2 font-bold px-5 h-9 rounded-xl"
          variant="primary"
        >
          <Plus className="w-4 h-4" /> New Receipt
        </Button>
      </div>
    </div>
  );

  return (
    <>
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Payment Receipts"
        description="View and manage money collections and invoice allocation audits."
      />

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-surface border border-border p-6 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-500"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Received</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              ₹{receipts.reduce((acc: number, curr: any) => acc + (curr.status === 'COMPLETED' ? Number(curr.amount) : 0), 0).toLocaleString('en-IN')}
            </h3>
          </div>
        </div>
        <div className="bg-surface border border-border p-6 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3.5 bg-accent/10 rounded-xl text-accent"><CheckCircle className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Receipts</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {receipts.filter((r: any) => r.status === 'COMPLETED').length} / {totalItems}
            </h3>
          </div>
        </div>
      </div>

      {loading && receipts.length === 0 ? (
        <LoadingState variant="table" />
      ) : receipts.length === 0 && !search && !statusFilter && !methodFilter ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-muted-foreground" />}
          title="No receipts found"
          description="Record a customer payment receipt to allocate invoice balances."
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
        warningText="This action reverses all ledger and customer balance changes."
      />
    </>
  );
};

