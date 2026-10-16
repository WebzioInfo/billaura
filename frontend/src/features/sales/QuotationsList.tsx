import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  FileCheck,
  Lock,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
  FileText
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import {
  ZohoListTable,
  ZohoColumn,
  ZohoSplitDetail,
  ZohoSplitListItem,
  ZohoStatusText,
  ZohoViewOption,
  ZohoEmptyState
} from '@/shared/components/zoho';
import { ConfirmDialog } from '@/shared/components/ui';

const QUOTE_VIEWS: ZohoViewOption[] = [
  { id: 'ALL', label: 'All Quotes' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SENT', label: 'Sent' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'INVOICED', label: 'Invoiced' },
  { id: 'DECLINED', label: 'Declined' },
];

interface ColumnConfig {
  key: string;
  label: string;
  isLocked?: boolean;
}

const ALL_AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'date', label: 'Date', isLocked: true },
  { key: 'quotationNo', label: 'Quote Number', isLocked: true },
  { key: 'referenceNo', label: 'Reference#' },
  { key: 'customerName', label: 'Customer Name', isLocked: true },
  { key: 'status', label: 'Quote Status', isLocked: true },
  { key: 'amount', label: 'Total', isLocked: true },
  { key: 'acceptedDate', label: 'Accepted Date' },
  { key: 'crmPotentialName', label: 'CRM Potential Name' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'declinedDate', label: 'Declined Date' },
  { key: 'expiryDate', label: 'Expiry Date' },
  { key: 'salespersonName', label: 'Salesperson Name' },
  { key: 'subject', label: 'Subject' },
];

const DEFAULT_SELECTED_COLUMNS = [
  'date',
  'quotationNo',
  'referenceNo',
  'customerName',
  'status',
  'amount',
];

export const QuotationsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [search, setSearch] = useState<string>('');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quoteToDelete, setQuoteToDelete] = useState<any | null>(null);

  // Customize Columns state
  const [isCustomizeColumnsOpen, setIsCustomizeColumnsOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('billaura_quote_columns');
      return saved ? JSON.parse(saved) : DEFAULT_SELECTED_COLUMNS;
    } catch {
      return DEFAULT_SELECTED_COLUMNS;
    }
  });
  const [tempSelectedColumns, setTempSelectedColumns] = useState<string[]>(selectedColumnKeys);

  // Fetch Quotes from Backend
  const { data: quotesResponse, isLoading, refetch } = useQuery({
    queryKey: ['quotations', activeView, page, limit, search],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (activeView !== 'ALL') params.status = activeView;

      const res = await apiClient.get('/sales/quotations', { params });
      return res.data;
    },
    staleTime: 0,
  });

  const rawData = quotesResponse?.data !== undefined ? quotesResponse.data : quotesResponse;
  const quotes: any[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
  const meta = quotesResponse?.meta || rawData?.meta || {};
  const totalCount = meta.total ?? quotes.length;

  // Selected Quote for Split View
  const selectedQuote = useMemo(() => {
    if (!selectedQuoteId) return null;
    return quotes.find((q: any) => q.id === selectedQuoteId) || null;
  }, [selectedQuoteId, quotes]);

  // Transform for left split pane
  const splitItems: ZohoSplitListItem[] = useMemo(() => {
    return quotes.map((q: any) => {
      const custName = q.businessPartner?.name || 'Customer';
      const qNo = q.quotationNo || 'QT-DRAFT';
      const dateStr = q.date ? new Date(q.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
      const amountVal = Number(q.grandTotal || 0);

      return {
        id: q.id,
        name: custName,
        number: qNo,
        date: dateStr,
        amount: `₹${amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: q.status || 'DRAFT',
      };
    });
  }, [quotes]);

  // Build Table Columns based on customize columns selection
  const columns: ZohoColumn<any>[] = useMemo(() => {
    const cols: ZohoColumn<any>[] = [];

    if (selectedColumnKeys.includes('date')) {
      cols.push({
        key: 'date',
        label: 'Date',
        width: '110px',
        render: (row) => (
          <span className="text-[#2B2F36]">
            {row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
        ),
      });
    }

    if (selectedColumnKeys.includes('quotationNo')) {
      cols.push({
        key: 'quotationNo',
        label: 'Quote Number',
        isPrimary: true,
        width: '140px',
        render: (row) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sales/quotes/${row.id}`);
            }}
            className="text-[#408DFB] hover:underline font-mono text-xs font-semibold cursor-pointer text-left"
          >
            {row.quotationNo || 'DRAFT'}
          </button>
        ),
      });
    }

    if (selectedColumnKeys.includes('referenceNo')) {
      cols.push({
        key: 'referenceNo',
        label: 'Reference#',
        width: '130px',
        render: (row) => (
          <span className="text-[#6B7280] font-mono">
            {row.referenceNo || row.referenceNumber || '—'}
          </span>
        ),
      });
    }

    if (selectedColumnKeys.includes('customerName')) {
      cols.push({
        key: 'customerName',
        label: 'Customer Name',
        width: '220px',
        render: (row) => (
          <span className="font-medium text-[#2B2F36] truncate block" title={row.businessPartner?.name || '—'}>
            {row.businessPartner?.name || '—'}
          </span>
        ),
      });
    }

    if (selectedColumnKeys.includes('status')) {
      cols.push({
        key: 'status',
        label: 'Quote Status',
        width: '130px',
        render: (row) => <ZohoStatusText status={row.status || 'DRAFT'} />,
      });
    }

    if (selectedColumnKeys.includes('amount')) {
      cols.push({
        key: 'amount',
        label: 'Total',
        align: 'right',
        isNumeric: true,
        width: '130px',
        render: (row) => (
          <span className="font-medium text-[#2B2F36] tabular-nums">
            ₹{Number(row.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      });
    }

    // Optional columns
    if (selectedColumnKeys.includes('expiryDate')) {
      cols.push({
        key: 'expiryDate',
        label: 'Expiry Date',
        width: '120px',
        render: (row) => (
          <span className="text-[#6B7280]">
            {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('en-IN') : '—'}
          </span>
        ),
      });
    }

    if (selectedColumnKeys.includes('salespersonName')) {
      cols.push({
        key: 'salespersonName',
        label: 'Salesperson Name',
        width: '140px',
        render: (row) => (
          <span className="text-[#2B2F36]">
            {row.salesperson || 'ALI HASHIM'}
          </span>
        ),
      });
    }

    if (selectedColumnKeys.includes('subject')) {
      cols.push({
        key: 'subject',
        label: 'Subject',
        width: '180px',
        render: (row) => (
          <span className="text-[#6B7280] truncate block" title={row.subject || '—'}>
            {row.subject || '—'}
          </span>
        ),
      });
    }

    if (selectedColumnKeys.includes('acceptedDate')) {
      cols.push({
        key: 'acceptedDate',
        label: 'Accepted Date',
        width: '120px',
        render: (row) => (
          <span className="text-[#6B7280]">
            {row.acceptedDate ? new Date(row.acceptedDate).toLocaleDateString('en-IN') : '—'}
          </span>
        ),
      });
    }

    if (selectedColumnKeys.includes('crmPotentialName')) {
      cols.push({
        key: 'crmPotentialName',
        label: 'CRM Potential Name',
        width: '150px',
        render: (row) => (
          <span className="text-[#6B7280]">
            {row.crmPotentialName || '—'}
          </span>
        ),
      });
    }

    if (selectedColumnKeys.includes('companyName')) {
      cols.push({
        key: 'companyName',
        label: 'Company Name',
        width: '160px',
        render: (row) => (
          <span className="text-[#2B2F36] truncate block">
            {row.companyName || row.businessPartner?.companyName || '—'}
          </span>
        ),
      });
    }

    if (selectedColumnKeys.includes('declinedDate')) {
      cols.push({
        key: 'declinedDate',
        label: 'Declined Date',
        width: '120px',
        render: (row) => (
          <span className="text-[#6B7280]">
            {row.declinedDate ? new Date(row.declinedDate).toLocaleDateString('en-IN') : '—'}
          </span>
        ),
      });
    }

    return cols;
  }, [selectedColumnKeys]);

  // Actions
  const handleMarkStatus = async (id: string, newStatus: string) => {
    try {
      await apiClient.patch(`/sales/quotations/${id}/status`, { status: newStatus });
      notification.success(`Quotation marked as ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    } catch (err: any) {
      notification.error(err?.response?.data?.message || 'Failed to update quote status');
    }
  };

  const handleConvertToInvoice = (quote: any) => {
    navigate(`/invoices/new?customerId=${quote.businessPartnerId || quote.customerId}&quotationId=${quote.id}`);
  };

  // Open Customize Columns dialog
  const handleOpenCustomizeColumns = () => {
    setTempSelectedColumns([...selectedColumnKeys]);
    setColumnSearch('');
    setIsCustomizeColumnsOpen(true);
  };

  const handleSaveColumns = () => {
    setSelectedColumnKeys(tempSelectedColumns);
    localStorage.setItem('billaura_quote_columns', JSON.stringify(tempSelectedColumns));
    setIsCustomizeColumnsOpen(false);
    notification.success('Table columns updated successfully');
  };

  const handleToggleColumn = (key: string, isLocked?: boolean) => {
    if (isLocked) return;
    setTempSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden text-xs">
      {selectedQuote ? (
        <ZohoSplitDetail
          moduleTitle="All Quotes"
          items={splitItems}
          selectedId={selectedQuoteId || ''}
          onSelect={(id) => setSelectedQuoteId(id)}
          onNew={() => navigate('/quotations/new')}
          onClose={() => setSelectedQuoteId(null)}
          detailTitle={selectedQuote.quotationNo || 'DRAFT QUOTE'}
          detailActions={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate(`/quotations/${selectedQuote.id}/edit`)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkStatus(selectedQuote.id, 'SENT')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Send</span>
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
                onClick={() => handleConvertToInvoice(selectedQuote)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer shadow-none transition-colors"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Convert to Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setQuoteToDelete(selectedQuote)}
                className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#FEF2F2] rounded-[4px] text-[#6B7280] hover:text-[#E54B4B] cursor-pointer"
                title="Delete Quote"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        >
          <div className="p-6 overflow-y-auto space-y-6">
            {/* General Quote Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-[#E5E7EB] rounded-[4px] p-4 space-y-3 bg-white">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                  Quote Information
                </h4>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Customer Name</span>
                  <span className="font-medium text-[#2B2F36]">{selectedQuote.businessPartner?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Quote Date</span>
                  <span className="font-medium text-[#2B2F36]">
                    {selectedQuote.date ? new Date(selectedQuote.date).toLocaleDateString('en-IN') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Expiry Date</span>
                  <span className="font-medium text-[#2B2F36]">
                    {selectedQuote.expiryDate ? new Date(selectedQuote.expiryDate).toLocaleDateString('en-IN') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Reference#</span>
                  <span className="font-mono text-[#2B2F36]">{selectedQuote.referenceNo || '—'}</span>
                </div>
                {selectedQuote.salesperson && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Salesperson</span>
                    <span className="text-[#2B2F36]">{selectedQuote.salesperson}</span>
                  </div>
                )}
              </div>

              <div className="border border-[#E5E7EB] rounded-[4px] p-4 space-y-3 bg-white">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                  Status & Totals
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Status</span>
                  <ZohoStatusText status={selectedQuote.status || 'DRAFT'} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Total Value</span>
                  <span className="text-sm font-bold text-[#1E2540] tabular-nums">
                    ₹{Number(selectedQuote.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedQuote.placeOfSupply && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#6B7280]">Place of Supply</span>
                    <span className="text-[#2B2F36]">{selectedQuote.placeOfSupply}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                Line Items
              </h4>
              <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden bg-white">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase">
                      <th className="px-3 py-2 text-left">Item Details</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Discount</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {(selectedQuote.items || []).map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F9FAFB]">
                        <td className="px-3 py-2">
                          <span className="font-medium text-[#2B2F36] block">{it.product?.name || it.description || 'Item'}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{it.qty || 1} {it.unit || 'pcs'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">₹{Number(it.rate || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{it.discount || 0}%</td>
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
              className="text-base font-semibold text-[#1E2540] bg-transparent border-none focus:ring-0 cursor-pointer pr-6 py-0 appearance-none"
            >
              {QUOTE_VIEWS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ▾
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/quotations/new')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer shadow-none transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCustomizeColumns}
                className="p-1.5 border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] cursor-pointer transition-colors"
                title="Customize Columns"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => refetch()}
                className="p-1.5 border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] cursor-pointer transition-colors"
                title="Refresh Quotes"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Search Toolbar */}
          <div className="h-10 border-b border-[#E5E7EB] bg-[#F8F9FB] px-6 flex items-center justify-between text-xs text-[#2B2F36] shrink-0">
            <span className="text-[#6B7280]">
              Total Quotes: <strong>{totalCount}</strong>
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search quotes..."
                className="pl-8 pr-3 py-1 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none w-56"
              />
            </div>
          </div>

          <div className="flex-1 p-4 overflow-hidden min-h-0 bg-white">
            <ZohoListTable
              data={quotes}
              columns={columns}
              isLoading={isLoading}
              keyField="id"
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              onRowClick={(row) => navigate(`/sales/quotes/${row.id}`)}
              pagination={{
                currentPage: page,
                pageSize: limit,
                totalCount,
                onPageChange: (p) => setPage(p),
                onPageSizeChange: (l) => setLimit(l),
              }}
              emptyState={
                <ZohoEmptyState
                  title="No Quotes Found"
                  description="Create formal quotes for prospects and customers, then convert them directly into invoices once accepted."
                  createLabel="New Quote"
                  onCreate={() => navigate('/quotations/new')}
                />
              }
            />
          </div>
        </>
      )}

      {/* Customize Columns Modal */}
      {isCustomizeColumnsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4px] border border-[#E5E7EB] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#408DFB]" />
                <h3 className="text-sm font-semibold text-[#1E2540]">Customize Columns</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#6B7280]">
                  {tempSelectedColumns.length} of {ALL_AVAILABLE_COLUMNS.length} Selected
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomizeColumnsOpen(false)}
                  className="text-[#9CA3AF] hover:text-[#2B2F36] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search filter in modal */}
            <div className="p-4 border-b border-[#E5E7EB] bg-[#FAFBFD] shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                />
              </div>
            </div>

            {/* Columns list */}
            <div className="p-2 overflow-y-auto divide-y divide-[#F1F3F5] flex-1">
              {ALL_AVAILABLE_COLUMNS.filter((c) =>
                c.label.toLowerCase().includes(columnSearch.toLowerCase())
              ).map((col) => {
                const isSelected = tempSelectedColumns.includes(col.key);
                return (
                  <div
                    key={col.key}
                    onClick={() => handleToggleColumn(col.key, col.isLocked)}
                    className={`flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                      col.isLocked
                        ? 'opacity-80 cursor-default bg-[#F8F9FB]/50'
                        : 'cursor-pointer hover:bg-[#F8F9FB]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {col.isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleColumn(col.key, col.isLocked)}
                          className="w-3.5 h-3.5 rounded text-[#408DFB] border-[#CBD5E1] focus:ring-0 cursor-pointer"
                        />
                      )}
                      <span className={`text-xs ${isSelected ? 'font-medium text-[#2B2F36]' : 'text-[#6B7280]'}`}>
                        {col.label}
                      </span>
                    </div>
                    {col.isLocked && (
                      <span className="text-[10px] text-[#9CA3AF] font-medium bg-[#E5E7EB]/60 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#E5E7EB] bg-white flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveColumns}
                className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer shadow-none transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizeColumnsOpen(false)}
                className="px-3 py-1.5 bg-white border border-[#CBD5E1] text-[#2B2F36] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium cursor-pointer transition-colors shadow-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(quoteToDelete)}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={async () => {
          if (!quoteToDelete) return;
          try {
            await apiClient.delete(`/sales/quotations/${quoteToDelete.id}`);
            notification.success('Quote deleted successfully');
            setQuoteToDelete(null);
            setSelectedQuoteId(null);
            queryClient.invalidateQueries({ queryKey: ['quotations'] });
          } catch (err: any) {
            notification.error(err?.response?.data?.message || 'Failed to delete quote');
          }
        }}
        title="Delete Quote"
        message={`Are you sure you want to delete quote ${quoteToDelete?.quotationNo}?`}
        confirmText="Delete"
        loadingText="Deleting..."
        variant="danger"
      />
    </div>
  );
};

export default QuotationsList;
