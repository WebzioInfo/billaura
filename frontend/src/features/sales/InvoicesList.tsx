import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Trash2,
  Edit,
  Mail,
  Printer,
  Share2,
  CreditCard,
  CheckCircle2,
  FileText,
  Paperclip,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  X,
  Send
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { downloadInvoicePdf, printInvoicePdf } from '@/shared/utils/invoicePdf';
import {
  ZohoListTable,
  ZohoColumn,
  ZohoSplitDetail,
  ZohoSplitListItem,
  ZohoStatusText,
  ZohoPDFPreview,
  ZohoPageHeader,
  ZohoViewOption,
  ZohoEmptyState
} from '@/shared/components/zoho';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { InvoiceDetailPane } from './components/InvoiceDetailPane';
import { ConfirmDialog } from '@/shared/components/ui';

const INVOICE_VIEWS: ZohoViewOption[] = [
  { id: 'ALL', label: 'All Invoices' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SENT', label: 'Sent / Issued' },
  { id: 'PARTIAL', label: 'Partially Paid' },
  { id: 'PAID', label: 'Paid' },
  { id: 'OVERDUE', label: 'Overdue' },
];

export const InvoicesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query State
  const viewParam = searchParams.get('view') || 'ALL';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limitParam = parseInt(searchParams.get('limit') || '25', 10);
  const searchParam = searchParams.get('search') || '';
  const { id: routeId } = useParams<{ id?: string }>();
  const idParam = searchParams.get('id') || routeId;

  const [activeView, setActiveView] = useState<string>(viewParam);
  const [page, setPage] = useState<number>(pageParam);
  const [limit, setLimit] = useState<number>(limitParam);
  const [search, setSearch] = useState<string>(searchParam);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(idParam || null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (routeId && routeId !== selectedInvoiceId) {
      setSelectedInvoiceId(routeId);
    }
  }, [routeId]);

  // Modals
  const [recordPaymentInvoice, setRecordPaymentInvoice] = useState<any | null>(null);
  const [invoiceToRestore, setInvoiceToRestore] = useState<any | null>(null);
  const [invoiceToDeletePermanently, setInvoiceToDeletePermanently] = useState<any | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState<boolean>(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState<boolean>(false);

  // Permissions
  const user = useSessionStore((state) => state.user);
  const permissions = useSessionStore((state) => state.permissions);
  const canCreate =
    user?.globalRole === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    permissions?.includes('sales.create' as any);
  const canDelete =
    user?.globalRole === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    permissions?.includes('sales.delete' as any) ||
    permissions?.includes('sales.invoices.delete' as any) ||
    !permissions ||
    permissions.length === 0;

  // Sync to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeView !== 'ALL') params.set('view', activeView);
    if (page > 1) params.set('page', String(page));
    if (limit !== 25) params.set('limit', String(limit));
    if (search.trim()) params.set('search', search.trim());
    if (selectedInvoiceId) params.set('id', selectedInvoiceId);
    setSearchParams(params, { replace: true });
  }, [activeView, page, limit, search, selectedInvoiceId, setSearchParams]);

  // Fetch Invoices
  const { data: invoicesResponse, isLoading, refetch } = useQuery({
    queryKey: ['invoices', activeView, page, limit, search],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit,
        sortBy: 'date',
        sortOrder: 'desc',
      };
      if (search.trim()) params.search = search.trim();
      if (activeView !== 'ALL') params.status = activeView;

      const res = await apiClient.get('/sales/invoices', { params });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const invoices = useMemo(() => {
    if (!invoicesResponse) return [];
    if (Array.isArray(invoicesResponse.data)) return invoicesResponse.data;
    if (Array.isArray(invoicesResponse.data?.data)) return invoicesResponse.data.data;
    if (Array.isArray(invoicesResponse.data?.items)) return invoicesResponse.data.items;
    if (Array.isArray(invoicesResponse.items)) return invoicesResponse.items;
    if (Array.isArray(invoicesResponse)) return invoicesResponse;
    return [];
  }, [invoicesResponse]);

  const meta = invoicesResponse?.meta || invoicesResponse?.data?.meta || {};
  const totalCount = meta.total ?? meta.totalItems ?? invoices.length;

  // Currently selected invoice details
  const selectedInvoice = useMemo(() => {
    if (!selectedInvoiceId) return null;
    return invoices.find((inv: any) => inv.id === selectedInvoiceId) || { id: selectedInvoiceId };
  }, [selectedInvoiceId, invoices]);

  // Transform invoices for SplitDetail left pane
  const splitItems: ZohoSplitListItem[] = useMemo(() => {
    return invoices.map((inv: any) => {
      const custName = inv.businessPartner?.name || inv.customer?.name || 'Customer';
      const invNo = inv.invoiceNo || 'INV-DRAFT';
      const dateStr = inv.date ? new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
      const amountVal = Number(inv.grandTotal || 0);

      return {
        id: inv.id,
        name: custName,
        number: invNo,
        date: dateStr,
        amount: `₹${amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: inv.status || 'DRAFT',
      };
    });
  }, [invoices]);

  // Check Overdue status text
  const getStatusDisplay = (inv: any) => {
    const status = inv.status || 'DRAFT';
    if (status === 'PAID') return 'PAID';
    if (status === 'PARTIAL') return 'PARTIALLY PAID';
    if (status === 'SENT') {
      if (inv.dueDate) {
        const due = new Date(inv.dueDate);
        const today = new Date();
        due.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          return `OVERDUE BY ${diffDays} DAYS`;
        }
      }
      return 'SENT';
    }
    return status;
  };

  // Table Columns matching Prompt 04:
  // Date, Invoice#, Order Number, Customer Name, Status, Due Date, Amount, Balance Due
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
      label: 'Invoice#',
      isPrimary: true,
      width: '140px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInvoiceId(row.id);
          }}
          className="text-[#408DFB] hover:underline font-mono text-xs font-semibold cursor-pointer text-left"
        >
          {row.invoiceNo || 'DRAFT'}
        </button>
      ),
    },
    {
      key: 'orderNumber',
      label: 'Order Number',
      width: '120px',
      render: (row) => (
        <span className="text-[#6B7280] font-mono">
          {row.orderNo || row.referenceNo || '—'}
        </span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer Name',
      width: '200px',
      render: (row) => (
        <span className="font-medium text-[#2B2F36] truncate block" title={row.businessPartner?.name || '—'}>
          {row.businessPartner?.name || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '140px',
      render: (row) => <ZohoStatusText status={getStatusDisplay(row)} />,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      width: '100px',
      render: (row) => (
        <span className="text-[#6B7280]">
          {row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
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
          ₹{Number(row.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'balanceDue',
      label: 'Balance Due',
      align: 'right',
      isNumeric: true,
      width: '120px',
      render: (row) => {
        const bal = Number(row.outstandingAmount !== undefined ? row.outstandingAmount : (row.grandTotal || 0) - (row.amountPaid || 0));
        return (
          <span className={`font-semibold tabular-nums ${bal > 0 ? 'text-[#E54B4B]' : 'text-[#16A34A]'}`}>
            ₹{Math.max(0, bal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
  ];

  // Actions
  const handleMarkAsSent = async (invoiceId: string) => {
    try {
      await apiClient.post(`/sales/invoices/${invoiceId}/mark-sent`);
      notification.success('Invoice marked as Sent');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch {
      // Fallback update status
      try {
        await apiClient.put(`/sales/invoices/${invoiceId}`, { status: 'SENT' });
        notification.success('Invoice marked as Sent');
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } catch (err: any) {
        notification.error(err?.response?.data?.message || 'Failed to update invoice status');
      }
    }
  };

  const handleDeleteInvoice = async (invoice: any) => {
    setInvoiceToDeletePermanently(invoice);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden text-xs">
      {selectedInvoice ? (
        /* Split View Inspector */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Invoice Navigation Panel */}
          <div className="w-[340px] md:w-[360px] border-r border-[#E5E7EB] bg-white flex flex-col h-full shrink-0">
            {/* Header: View selector, New Invoice (+) and options */}
            <div className="h-11 px-3 border-b border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#2B2F36]">
                <select
                  value={activeView}
                  onChange={(e) => {
                    setActiveView(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent font-semibold text-xs text-[#2B2F36] hover:text-[#408DFB] cursor-pointer focus:outline-none"
                >
                  {INVOICE_VIEWS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => navigate('/invoices/new')}
                    className="w-6 h-6 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                    title="New Invoice"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className="p-1 text-[#6B7280] hover:text-[#2B2F36] rounded-[4px] cursor-pointer"
                  title="List Options"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sub-bar showing category/filter status title like Zoho Books ("DRAFT", "ALL INVOICES", etc.) */}
            <div className="px-3 py-1.5 bg-[#FAFBFD] border-b border-[#F0F2F5] text-[10px] font-semibold text-[#8B95A5] uppercase tracking-wider">
              {INVOICE_VIEWS.find((v) => v.id === activeView)?.label || 'INVOICES'}
            </div>

            {/* Scrollable Invoices List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#F1F3F6]">
              {splitItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#6B7280]">
                  No invoices found in this view
                </div>
              ) : (
                splitItems.map((item) => {
                  const isSelected = item.id === selectedInvoiceId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedInvoiceId(item.id)}
                      className={`p-3 cursor-pointer transition-colors text-xs space-y-1 ${
                        isSelected
                          ? 'bg-[#F0F5FF] border-l-4 border-[#408DFB]'
                          : 'hover:bg-[#F9FAFB] border-l-4 border-transparent'
                      }`}
                    >
                      {/* Top line: Customer Name (bold) & Amount */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#1E2540] truncate max-w-[190px]" title={item.name}>
                          {item.name}
                        </span>
                        {item.amount !== undefined && (
                          <span className="font-medium text-[#1E2540] tabular-nums shrink-0">
                            {item.amount}
                          </span>
                        )}
                      </div>

                      {/* Second line: invoice number • date */}
                      <div className="text-[11px] text-[#6B7280] flex items-center gap-1 font-mono">
                        <span>{item.number}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                      </div>

                      {/* Third line: Status tag */}
                      <div>
                        <ZohoStatusText status={item.status} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Invoice Workspace */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white min-w-0">
            <InvoiceDetailPane
              invoiceId={selectedInvoice.id}
              onClose={() => {
                setSelectedInvoiceId(null);
                if (routeId) {
                  navigate('/invoices');
                }
              }}
              onInvoiceUpdated={() => {
                refetch();
                queryClient.invalidateQueries({ queryKey: ['invoices'] });
              }}
            />
          </div>
        </div>
      ) : (
        /* Full List View */
        <>
          {/* Zoho Header with view dropdown and split + New button */}
          <div className="h-12 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 shrink-0">
            {/* View Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={activeView}
                onChange={(e) => {
                  setActiveView(e.target.value);
                  setPage(1);
                }}
                className="text-base font-semibold text-[#1E2540] bg-transparent border-none focus:ring-0 cursor-pointer pr-6 py-0"
              >
                {INVOICE_VIEWS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ▾
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Split + New Button */}
              <div className="relative inline-flex rounded-[4px] shadow-none">
                <button
                  type="button"
                  onClick={() => navigate('/invoices/new')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-l-[4px] text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewMenuOpen(!newMenuOpen)}
                  className="px-2 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-r-[4px] border-l border-white/20 text-xs cursor-pointer transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {newMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#E5E7EB] rounded-[4px] shadow-lg py-1 z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setNewMenuOpen(false);
                        navigate('/invoices/new');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#2B2F36] hover:bg-[#F8F9FB]"
                    >
                      New Tax Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMenuOpen(false);
                        navigate('/proformas/new');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#2B2F36] hover:bg-[#F8F9FB]"
                    >
                      New Proforma Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMenuOpen(false);
                        navigate('/recurring-invoices');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#2B2F36] hover:bg-[#F8F9FB]"
                    >
                      Recurring Invoices
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMenuOpen(false);
                        navigate('/credit-notes/new');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#2B2F36] hover:bg-[#F8F9FB]"
                    >
                      New Credit Note
                    </button>
                  </div>
                )}
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => refetch()}
                className="p-1.5 border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] cursor-pointer"
                title="Refresh Invoices"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* More Actions Menu */}
              <button
                type="button"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="p-1.5 border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] cursor-pointer"
                title="More Actions"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="h-10 border-b border-[#E5E7EB] bg-[#F8F9FB] px-6 flex items-center justify-between text-xs text-[#2B2F36] shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[#6B7280]">Total Invoices: <strong>{totalCount}</strong></span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search invoices..."
                className="pl-8 pr-3 py-1 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none w-56"
              />
            </div>
          </div>

          {/* Main Table Container */}
          <div className="flex-1 p-4 overflow-hidden min-h-0 bg-white">
            <ZohoListTable
              data={invoices}
              columns={columns}
              isLoading={isLoading}
              keyField="id"
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              onRowClick={(row) => setSelectedInvoiceId(row.id)}
              pagination={{
                currentPage: page,
                pageSize: limit,
                totalCount,
                onPageChange: (p) => setPage(p),
                onPageSizeChange: (l) => setLimit(l),
              }}
              emptyState={
                <ZohoEmptyState
                  title="No Invoices Found"
                  description="Create customer invoices, track collections, send payment reminders, and record payments."
                  createLabel="New Invoice"
                  onCreate={() => navigate('/invoices/new')}
                />
              }
            />
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      {recordPaymentInvoice && (
        <RecordPaymentModal
          isOpen={Boolean(recordPaymentInvoice)}
          onClose={() => setRecordPaymentInvoice(null)}
          invoice={recordPaymentInvoice}
          onSuccess={() => {
            setRecordPaymentInvoice(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            notification.success('Payment recorded successfully');
          }}
        />
      )}

      {/* Delete Permanently Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(invoiceToDeletePermanently)}
        onClose={() => setInvoiceToDeletePermanently(null)}
        onConfirm={async () => {
          if (!invoiceToDeletePermanently) return;
          try {
            await apiClient.delete(`/sales/invoices/${invoiceToDeletePermanently.id}`);
            notification.success('Invoice deleted successfully.');
            setInvoiceToDeletePermanently(null);
            setSelectedInvoiceId(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          } catch (err: any) {
            notification.error(err?.response?.data?.message || 'Invoice could not be deleted.');
          }
        }}
        title="Delete Invoice"
        message={`Are you sure you want to permanently delete invoice ${invoiceToDeletePermanently?.invoiceNo}?`}
        confirmText="Delete"
        loadingText="Deleting..."
        variant="danger"
      />
    </div>
  );
};

export default InvoicesList;
