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
  RotateCcw
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

const CN_VIEWS: ZohoViewOption[] = [
  { id: 'ALL', label: 'All Credit Notes' },
  { id: 'OPEN', label: 'Open' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'DRAFT', label: 'Draft' },
];

export const CreditNotesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [search, setSearch] = useState<string>('');
  const [selectedCnId, setSelectedCnId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [noteToDelete, setNoteToDelete] = useState<any | null>(null);

  // Fetch Credit Notes
  const { data: cnResponse, isLoading, refetch } = useQuery({
    queryKey: ['credit-notes', activeView, page, limit, search],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit,
        documentType: 'CREDIT_NOTE',
      };
      if (search.trim()) params.search = search.trim();
      if (activeView !== 'ALL') params.status = activeView;

      const res = await apiClient.get('/sales/invoices', { params });
      return res.data;
    },
    staleTime: 0,
  });

  const rawData = cnResponse?.data !== undefined ? cnResponse.data : cnResponse;
  const creditNotes: any[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
  const meta = cnResponse?.meta || rawData?.meta || {};
  const totalCount = meta.total ?? creditNotes.length;

  const selectedNote = useMemo(() => {
    if (!selectedCnId) return null;
    return creditNotes.find((cn: any) => cn.id === selectedCnId) || null;
  }, [selectedCnId, creditNotes]);

  const splitItems: ZohoSplitListItem[] = useMemo(() => {
    return creditNotes.map((cn: any) => {
      const custName = cn.businessPartner?.name || 'Customer';
      const cnNo = cn.invoiceNo || 'CN-DRAFT';
      const dateStr = cn.date ? new Date(cn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
      const amountVal = Number(cn.grandTotal || 0);

      return {
        id: cn.id,
        name: custName,
        number: cnNo,
        date: dateStr,
        amount: `₹${amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: cn.status === 'PAID' ? 'CLOSED' : cn.status || 'OPEN',
      };
    });
  }, [creditNotes]);

  // Columns: Date, Credit Note#, Reference#, Customer Name, Invoice#, Status (OPEN / CLOSED), Amount, Balance
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
      key: 'invoiceNo',
      label: 'Credit Note#',
      isPrimary: true,
      width: '130px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCnId(row.id);
          }}
          className="text-[#408DFB] hover:underline font-mono text-xs font-semibold cursor-pointer text-left"
        >
          {row.invoiceNo || 'CN-DRAFT'}
        </button>
      ),
    },
    {
      key: 'referenceNo',
      label: 'Reference#',
      width: '120px',
      render: (row) => (
        <span className="text-[#6B7280] font-mono">{row.referenceNo || '—'}</span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer Name',
      width: '180px',
      render: (row) => (
        <span className="font-medium text-[#2B2F36] truncate block" title={row.businessPartner?.name || '—'}>
          {row.businessPartner?.name || '—'}
        </span>
      ),
    },
    {
      key: 'invoiceRef',
      label: 'Invoice#',
      width: '120px',
      render: (row) => (
        <span className="text-[#6B7280] font-mono">{row.originalInvoiceNo || '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (row) => {
        const displayStatus = row.status === 'PAID' ? 'CLOSED' : row.status || 'OPEN';
        return <ZohoStatusText status={displayStatus} />;
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      isNumeric: true,
      width: '120px',
      render: (row) => (
        <span className="font-medium text-[#2B2F36] tabular-nums">
          ₹{Number(row.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      isNumeric: true,
      width: '120px',
      render: (row) => {
        const bal = Number(row.outstandingAmount !== undefined ? row.outstandingAmount : row.grandTotal || 0);
        return (
          <span className="font-semibold text-[#16A34A] tabular-nums">
            ₹{Math.max(0, bal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden text-xs">
      {selectedNote ? (
        <ZohoSplitDetail
          moduleTitle="All Credit Notes"
          items={splitItems}
          selectedId={selectedCnId || ''}
          onSelect={(id) => setSelectedCnId(id)}
          onNew={() => navigate('/credit-notes/new')}
          onClose={() => setSelectedCnId(null)}
          detailTitle={selectedNote.invoiceNo || 'CREDIT NOTE'}
          detailActions={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate(`/credit-notes/${selectedNote.id}/edit`)}
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
                onClick={() => setNoteToDelete(selectedNote)}
                className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#FEF2F2] rounded-[4px] text-[#6B7280] hover:text-[#E54B4B] cursor-pointer"
                title="Delete Credit Note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        >
          <div className="p-6 space-y-6 text-xs text-[#2B2F36]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-[#E5E7EB] rounded-[4px] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                  Customer & Details
                </h4>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Customer Name</span>
                  <span className="font-medium">{selectedNote.businessPartner?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Date</span>
                  <span className="font-medium">{selectedNote.date ? new Date(selectedNote.date).toLocaleDateString('en-IN') : '—'}</span>
                </div>
              </div>

              <div className="border border-[#E5E7EB] rounded-[4px] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                  Credit Summary
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Status</span>
                  <ZohoStatusText status={selectedNote.status === 'PAID' ? 'CLOSED' : selectedNote.status || 'OPEN'} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Credit Total</span>
                  <span className="text-base font-bold text-[#1E2540] tabular-nums">
                    ₹{Number(selectedNote.grandTotal || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                Items Credited
              </h4>
              <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase">
                      <th className="px-3 py-2 text-left">Item Details</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {(selectedNote.items || []).map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-[#F9FAFB]">
                        <td className="px-3 py-2 font-medium">{it.product?.name || it.description || 'Item'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{it.qty || 1}</td>
                        <td className="px-3 py-2 text-right tabular-nums">₹{Number(it.rate || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">₹{Number(it.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              {CN_VIEWS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ▾
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/credit-notes/new')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer shadow-none transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>

              <button
                type="button"
                onClick={() => refetch()}
                className="p-1.5 border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] cursor-pointer"
                title="Refresh Credit Notes"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="h-10 border-b border-[#E5E7EB] bg-[#F8F9FB] px-6 flex items-center justify-between text-xs text-[#2B2F36] shrink-0">
            <span className="text-[#6B7280]">Total Credit Notes: <strong>{totalCount}</strong></span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search credit notes..."
                className="pl-8 pr-3 py-1 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none w-56"
              />
            </div>
          </div>

          <div className="flex-1 p-4 overflow-hidden min-h-0 bg-white">
            <ZohoListTable
              data={creditNotes}
              columns={columns}
              isLoading={isLoading}
              keyField="id"
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              onRowClick={(row) => setSelectedCnId(row.id)}
              pagination={{
                currentPage: page,
                pageSize: limit,
                totalCount,
                onPageChange: (p) => setPage(p),
                onPageSizeChange: (l) => setLimit(l),
              }}
              emptyState={
                <ZohoEmptyState
                  title="No Credit Notes Found"
                  description="Record customer sales returns, rate differences, or credit allowances."
                  createLabel="New Credit Note"
                  onCreate={() => navigate('/credit-notes/new')}
                />
              }
            />
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(noteToDelete)}
        onClose={() => setNoteToDelete(null)}
        onConfirm={async () => {
          if (!noteToDelete) return;
          try {
            await apiClient.delete(`/sales/invoices/${noteToDelete.id}`);
            notification.success('Credit note deleted successfully');
            setNoteToDelete(null);
            setSelectedCnId(null);
            queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
          } catch (err: any) {
            notification.error(err?.response?.data?.message || 'Failed to delete credit note');
          }
        }}
        title="Delete Credit Note"
        message={`Are you sure you want to delete credit note ${noteToDelete?.invoiceNo}?`}
        confirmText="Delete"
        loadingText="Deleting..."
        variant="danger"
      />
    </div>
  );
};

export default CreditNotesList;
