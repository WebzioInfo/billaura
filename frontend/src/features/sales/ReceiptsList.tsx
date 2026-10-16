import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  Mail,
  Printer,
  FileText,
  CreditCard,
  Ban,
  CheckCircle2
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import {
  ZohoListTable,
  ZohoColumn,
  ZohoSplitDetail,
  ZohoSplitListItem,
  ZohoStatusText,
  ZohoPDFPreview,
  ZohoViewOption,
  ZohoEmptyState
} from '@/shared/components/zoho';
import { ConfirmDialog } from '@/shared/components/ui';

const PAYMENT_VIEWS: ZohoViewOption[] = [
  { id: 'ALL', label: 'All Payments Received' },
  { id: 'PAID', label: 'Paid' },
  { id: 'DRAFT', label: 'Draft' },
];

export const ReceiptsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [search, setSearch] = useState<string>('');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [receiptToVoid, setReceiptToVoid] = useState<any | null>(null);

  // Fetch unified receipts
  const { data: receiptsResponse, isLoading, refetch } = useQuery({
    queryKey: ['receipts-unified', activeView, page, limit, search],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit,
        type: 'SALES',
      };
      if (search.trim()) params.search = search.trim();
      if (activeView !== 'ALL') params.status = activeView;

      const res = await apiClient.get('/receipts/unified', { params });
      return res.data || {};
    },
    staleTime: 0,
  });

  const receipts: any[] =
    receiptsResponse?.data?.items ||
    receiptsResponse?.items ||
    (Array.isArray(receiptsResponse?.data) ? receiptsResponse.data : []);
  const totalCount =
    receiptsResponse?.data?.total ||
    receiptsResponse?.data?.totalItems ||
    receiptsResponse?.meta?.totalItems ||
    receipts.length ||
    0;

  const selectedReceipt = useMemo(() => {
    if (!selectedReceiptId) return null;
    return receipts.find((r: any) => r.id === selectedReceiptId || r.rawId === selectedReceiptId) || null;
  }, [selectedReceiptId, receipts]);

  const splitItems: ZohoSplitListItem[] = useMemo(() => {
    return receipts.map((r: any) => {
      const custName = r.businessPartnerName || r.customerName || 'Customer';
      const rcpNo = r.receiptNo || 'RCP-DRAFT';
      const dateStr = r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
      const amountVal = Number(r.amount || 0);

      return {
        id: r.id || r.rawId,
        name: custName,
        number: rcpNo,
        date: dateStr,
        amount: `₹${amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: r.status || 'PAID',
      };
    });
  }, [receipts]);

  // Columns: Date, Payment #, Type, Reference Number, Customer Name, Invoice#, Mode, Amount, Unused Amount, Status (PAID green)
  const columns: ZohoColumn<any>[] = [
    {
      key: 'date',
      label: 'Date',
      width: '100px',
      render: (row) => (
        <span className="text-[#2B2F36]">
          {row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'receiptNo',
      label: 'Payment #',
      isPrimary: true,
      width: '130px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedReceiptId(row.id || row.rawId);
          }}
          className="text-[#408DFB] hover:underline font-mono text-xs font-semibold cursor-pointer text-left"
        >
          {row.receiptNo || 'RCP-DRAFT'}
        </button>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      width: '100px',
      render: (row) => <span className="text-[#2B2F36]">{row.type || 'Invoice Payment'}</span>,
    },
    {
      key: 'referenceNo',
      label: 'Reference Number',
      width: '130px',
      render: (row) => (
        <span className="text-[#6B7280] font-mono">{row.referenceNo || '—'}</span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer Name',
      width: '180px',
      render: (row) => (
        <span className="font-medium text-[#2B2F36] truncate block" title={row.businessPartnerName || row.customerName || '—'}>
          {row.businessPartnerName || row.customerName || '—'}
        </span>
      ),
    },
    {
      key: 'invoiceNo',
      label: 'Invoice#',
      width: '120px',
      render: (row) => (
        <span className="text-[#6B7280] font-mono">{row.invoiceNo || row.allocatedInvoiceNos || '—'}</span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Mode',
      width: '110px',
      render: (row) => (
        <span className="text-[#2B2F36] capitalize">
          {(row.paymentMethod || 'Cash').toLowerCase().replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      isNumeric: true,
      width: '120px',
      render: (row) => (
        <span className="font-medium text-[#2B2F36] tabular-nums">
          ₹{Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'unusedAmount',
      label: 'Unused Amount',
      align: 'right',
      isNumeric: true,
      width: '120px',
      render: (row) => (
        <span className="text-[#6B7280] tabular-nums">
          ₹{Number(row.unusedAmount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (row) => <ZohoStatusText status={row.status || 'PAID'} />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden text-xs">
      {selectedReceipt ? (
        <ZohoSplitDetail
          moduleTitle="All Payments Received"
          items={splitItems}
          selectedId={selectedReceiptId || ''}
          onSelect={(id) => setSelectedReceiptId(id)}
          onNew={() => navigate('/receipts/new')}
          onClose={() => setSelectedReceiptId(null)}
          detailTitle={selectedReceipt.receiptNo || 'PAYMENT'}
          detailActions={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate(`/receipts/${selectedReceipt.id || selectedReceipt.rawId}/edit`)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptToVoid(selectedReceipt)}
                className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#FEF2F2] rounded-[4px] text-[#6B7280] hover:text-[#E54B4B] cursor-pointer"
                title="Void Payment"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        >
          <div className="p-6 space-y-6 text-xs text-[#2B2F36]">
            {/* Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-[#E5E7EB] rounded-[4px] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                  Payment Details
                </h4>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Customer Name</span>
                  <span className="font-medium">{selectedReceipt.businessPartnerName || selectedReceipt.customerName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Payment Date</span>
                  <span className="font-medium">{selectedReceipt.date ? new Date(selectedReceipt.date).toLocaleDateString('en-IN') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Payment Mode</span>
                  <span className="font-medium capitalize">{(selectedReceipt.paymentMethod || 'Cash').toLowerCase().replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Reference#</span>
                  <span className="font-mono">{selectedReceipt.referenceNo || '—'}</span>
                </div>
              </div>

              <div className="border border-[#E5E7EB] rounded-[4px] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                  Amount Summary
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Status</span>
                  <ZohoStatusText status={selectedReceipt.status || 'PAID'} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Amount Received</span>
                  <span className="text-base font-bold text-[#16A34A] tabular-nums">
                    ₹{Number(selectedReceipt.amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ZohoSplitDetail>
      ) : (
        /* Full List View */
        <>
          <div className="h-12 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 shrink-0">
            <select
              value={activeView}
              onChange={(e) => {
                setActiveView(e.target.value);
                setPage(1);
              }}
              className="text-base font-semibold text-[#1E2540] bg-transparent border-none focus:ring-0 cursor-pointer pr-6 py-0"
            >
              {PAYMENT_VIEWS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ▾
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/receipts/new')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer shadow-none transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>

              <button
                type="button"
                onClick={() => refetch()}
                className="p-1.5 border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] cursor-pointer"
                title="Refresh Payments"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="h-10 border-b border-[#E5E7EB] bg-[#F8F9FB] px-6 flex items-center justify-between text-xs text-[#2B2F36] shrink-0">
            <span className="text-[#6B7280]">Total Payments: <strong>{totalCount}</strong></span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search payments..."
                className="pl-8 pr-3 py-1 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none w-56"
              />
            </div>
          </div>

          <div className="flex-1 p-4 overflow-hidden min-h-0 bg-white">
            <ZohoListTable
              data={receipts}
              columns={columns}
              isLoading={isLoading}
              keyField="id"
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              onRowClick={(row) => setSelectedReceiptId(row.id || row.rawId)}
              pagination={{
                currentPage: page,
                pageSize: limit,
                totalCount,
                onPageChange: (p) => setPage(p),
                onPageSizeChange: (l) => setLimit(l),
              }}
              emptyState={
                <ZohoEmptyState
                  title="No Payments Received Found"
                  description="Record customer payments against unpaid invoices or customer advances."
                  createLabel="Record Payment"
                  onCreate={() => navigate('/receipts/new')}
                />
              }
            />
          </div>
        </>
      )}

      {/* Void Dialog */}
      <ConfirmDialog
        isOpen={Boolean(receiptToVoid)}
        onClose={() => setReceiptToVoid(null)}
        onConfirm={async () => {
          if (!receiptToVoid) return;
          try {
            await apiClient.delete(`/receipts/${receiptToVoid.rawId || receiptToVoid.id}`);
            notification.success('Payment voided and reversed successfully');
            setReceiptToVoid(null);
            setSelectedReceiptId(null);
            queryClient.invalidateQueries({ queryKey: ['receipts-unified'] });
          } catch (err: any) {
            notification.error(err?.response?.data?.message || 'Failed to void payment');
          }
        }}
        title="Void Payment"
        message={`Are you sure you want to void payment receipt ${receiptToVoid?.receiptNo}? All applied invoice balances will be restored.`}
        confirmText="Void Payment"
        loadingText="Voiding..."
        variant="danger"
      />
    </div>
  );
};

export default ReceiptsList;
