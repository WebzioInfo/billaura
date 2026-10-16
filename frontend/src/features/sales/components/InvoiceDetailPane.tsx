import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Edit,
  Mail,
  Printer,
  Download,
  Share2,
  CreditCard,
  MoreVertical,
  Paperclip,
  MessageSquare,
  Copy,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Calendar,
  Building2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Send,
  Ban,
  Check,
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { downloadInvoicePdf, printInvoicePdf } from '@/shared/utils/invoicePdf';
import { SpreadsheetInvoiceDocument, formatPlaceOfSupply } from '@/shared/components/documents/SpreadsheetInvoiceDocument';
import { ConfirmDialog } from '@/shared/components/ui';

interface InvoiceDetailPaneProps {
  invoiceId: string;
  onClose: () => void;
  onInvoiceUpdated?: () => void;
}

export const InvoiceDetailPane: React.FC<InvoiceDetailPaneProps> = ({
  invoiceId,
  onClose,
  onInvoiceUpdated,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // PDF View Toggle state (persisted in localStorage)
  const [showPdfView, setShowPdfView] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('invoice-show-pdf-view');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleTogglePdfView = (checked: boolean) => {
    setShowPdfView(checked);
    try {
      localStorage.setItem('invoice-show-pdf-view', String(checked));
    } catch (_) {}
  };

  // Dropdown menus
  const [isSendMenuOpen, setIsSendMenuOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isPdfMenuOpen, setIsPdfMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Close dropdowns on outside click
  const sendMenuRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const pdfMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sendMenuRef.current && !sendMenuRef.current.contains(e.target as Node)) {
        setIsSendMenuOpen(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setIsShareMenuOpen(false);
      }
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setIsPdfMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch Full Invoice Details
  const {
    data: invoice,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/sales/invoices/${invoiceId}`);
      return res?.data?.data || res?.data || res;
    },
    enabled: Boolean(invoiceId),
  });

  // 2. Fetch Company Profile
  const { data: company } = useQuery({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/auth/me');
      return res?.company || res?.data?.company || res?.data || res;
    },
    staleTime: 60000,
  });

  // Financial calculations
  const grandTotal = Number(invoice?.grandTotal || 0);
  const amountPaid = Number(invoice?.amountPaid || 0);
  const outstanding = Number(
    invoice?.outstandingAmount !== undefined
      ? invoice.outstandingAmount
      : Math.max(0, grandTotal - amountPaid)
  );

  // Handlers
  const handlePrint = async () => {
    if (!invoice) return;
    try {
      setIsPrinting(true);
      await printInvoicePdf(invoice.id);
    } catch (err: any) {
      notification.error(err.message || 'Failed to print invoice');
    } finally {
      setIsPrinting(false);
      setIsPdfMenuOpen(false);
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;
    try {
      setIsDownloading(true);
      notification.info('Preparing invoice PDF download...');
      await downloadInvoicePdf(invoice.id, invoice.invoiceNo);
      notification.success('Invoice PDF downloaded successfully');
    } catch (err: any) {
      notification.error(err.message || 'Failed to download invoice PDF');
    } finally {
      setIsDownloading(false);
      setIsPdfMenuOpen(false);
    }
  };

  const handleMarkAsSent = async () => {
    if (!invoice) return;
    try {
      await apiClient.post(`/sales/invoices/${invoice.id}/mark-sent`);
      notification.success('Invoice marked as Sent');
      refetch();
      await erpInvalidate.invoice(queryClient, { invoiceId: invoice.id });
      onInvoiceUpdated?.();
    } catch {
      try {
        await apiClient.put(`/sales/invoices/${invoice.id}`, { status: 'SENT' });
        notification.success('Invoice marked as Sent');
        refetch();
        await erpInvalidate.invoice(queryClient, { invoiceId: invoice.id });
        onInvoiceUpdated?.();
      } catch (err: any) {
        notification.error(err?.response?.data?.message || 'Failed to update invoice status');
      }
    } finally {
      setIsSendMenuOpen(false);
    }
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/invoices/${invoice?.id}`;
    navigator.clipboard.writeText(url);
    notification.success('Invoice link copied to clipboard');
    setIsShareMenuOpen(false);
  };

  const handleVoidInvoice = async () => {
    if (!invoice) return;
    try {
      await apiClient.put(`/sales/invoices/${invoice.id}`, { status: 'VOID' });
      notification.success('Invoice marked as Void');
      refetch();
      await erpInvalidate.invoice(queryClient, { invoiceId: invoice.id });
      onInvoiceUpdated?.();
      setShowVoidDialog(false);
    } catch (err: any) {
      notification.error(err?.response?.data?.message || 'Failed to void invoice');
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    try {
      await apiClient.delete(`/sales/invoices/${invoice.id}`);
      notification.success('Invoice deleted successfully');
      await erpInvalidate.invoice(queryClient, { invoiceId: invoice.id });
      onInvoiceUpdated?.();
      setShowDeleteDialog(false);
      onClose();
    } catch (err: any) {
      notification.error(err?.response?.data?.message || 'Failed to delete invoice');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-[#6B7280] space-y-2">
        <div className="w-8 h-8 border-2 border-[#408DFB] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center p-6 space-y-3">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="font-semibold text-sm text-[#1E2540]">Failed to load invoice</h3>
        <p className="text-xs text-[#6B7280]">
          The invoice could not be found or failed to load.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3 py-1.5 bg-[#408DFB] text-white text-xs font-semibold rounded-[4px]"
        >
          Retry
        </button>
      </div>
    );
  }

  const customer = invoice.businessPartner || invoice.customer;
  const isPaid = invoice.status === 'PAID';
  const isCancelled = invoice.status === 'CANCELLED' || invoice.status === 'VOID';
  const canRecordPayment = !isPaid && !isCancelled && invoice.status !== 'DRAFT';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8F9FB] overflow-hidden text-xs select-none">
      {/* 1. TOP HEADER TOOLBAR (Exact 2-Row Zoho Layout) */}
      <div className="bg-white border-b border-[#E5E7EB] shrink-0 sticky top-0 z-30">
        {/* ROW 1: Main Title + Attachment, Comments, Close */}
        <div className="h-11 px-6 border-b border-[#F3F4F6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-[#1E2540] tracking-tight">
              {invoice.invoiceNo || 'DRAFT INVOICE'}
            </h1>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tracking-wider ${
                invoice.status === 'PAID'
                  ? 'bg-green-100 text-green-800'
                  : invoice.status === 'PARTIAL'
                  ? 'bg-amber-100 text-amber-800'
                  : invoice.status === 'SENT'
                  ? 'bg-blue-100 text-blue-800'
                  : invoice.status === 'VOID' || invoice.status === 'CANCELLED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Attachments */}
            <button
              type="button"
              className="p-1.5 text-[#6B7280] hover:text-[#1E2540] hover:bg-[#F3F4F6] rounded-[4px] transition-colors relative cursor-pointer"
              title="Attachments"
            >
              <Paperclip className="w-4 h-4" />
              {invoice.attachments && invoice.attachments.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#408DFB] text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {invoice.attachments.length}
                </span>
              )}
            </button>

            {/* Comments / History */}
            <button
              type="button"
              className="p-1.5 text-[#6B7280] hover:text-[#1E2540] hover:bg-[#F3F4F6] rounded-[4px] transition-colors relative cursor-pointer"
              title="Comments & History"
            >
              <MessageSquare className="w-4 h-4" />
              {invoice.auditLogs && invoice.auditLogs.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#408DFB] text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {invoice.auditLogs.length}
                </span>
              )}
            </button>

            {/* Close 'X' button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#6B7280] hover:text-[#E54B4B] hover:bg-red-50 rounded-[4px] transition-colors cursor-pointer ml-1"
              title="Close Detail View"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ROW 2: Primary Actions Bar */}
        <div className="h-10 px-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Edit */}
            <button
              type="button"
              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Edit</span>
            </button>

            {/* Send Menu */}
            <div className="relative" ref={sendMenuRef}>
              <button
                type="button"
                onClick={() => setIsSendMenuOpen(!isSendMenuOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Send</span>
                <ChevronDown className="w-3 h-3 text-[#6B7280]" />
              </button>

              {isSendMenuOpen && (
                <div className="absolute left-0 mt-1 w-44 bg-white border border-[#E5E7EB] rounded-[4px] shadow-lg py-1 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSendMenuOpen(false);
                      const email = customer?.email || '';
                      window.location.href = `mailto:${email}?subject=Invoice ${invoice.invoiceNo}&body=Please find attached invoice ${invoice.invoiceNo} for ₹${grandTotal.toFixed(2)}.`;
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] text-xs text-[#2B2F36] flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>Send Email</span>
                  </button>
                  {invoice.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={handleMarkAsSent}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] text-xs text-[#2B2F36] flex items-center gap-2 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Mark as Sent</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Share Menu */}
            <div className="relative" ref={shareMenuRef}>
              <button
                type="button"
                onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Share</span>
                <ChevronDown className="w-3 h-3 text-[#6B7280]" />
              </button>

              {isShareMenuOpen && (
                <div className="absolute left-0 mt-1 w-40 bg-white border border-[#E5E7EB] rounded-[4px] shadow-lg py-1 z-40">
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] text-xs text-[#2B2F36] flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>Copy Link</span>
                  </button>
                </div>
              )}
            </div>

            {/* PDF / Print Menu */}
            <div className="relative" ref={pdfMenuRef}>
              <button
                type="button"
                onClick={() => setIsPdfMenuOpen(!isPdfMenuOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>PDF / Print</span>
                <ChevronDown className="w-3 h-3 text-[#6B7280]" />
              </button>

              {isPdfMenuOpen && (
                <div className="absolute left-0 mt-1 w-44 bg-white border border-[#E5E7EB] rounded-[4px] shadow-lg py-1 z-40">
                  <button
                    type="button"
                    disabled={isPrinting}
                    onClick={handlePrint}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] text-xs text-[#2B2F36] flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>{isPrinting ? 'Printing...' : 'Print'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={handleDownload}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] text-xs text-[#2B2F36] flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>{isDownloading ? 'Downloading...' : 'PDF'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Record Payment (Prominent Blue Button) */}
            {canRecordPayment && (
              <button
                type="button"
                onClick={() => navigate(`/invoices/${invoice.id}/payment`)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer shadow-xs transition-colors ml-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}

            {/* More Actions Menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] cursor-pointer transition-colors"
                title="More Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute left-0 mt-1 w-44 bg-white border border-[#E5E7EB] rounded-[4px] shadow-lg py-1 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      navigate(`/invoices/new?duplicateId=${invoice.id}`);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] text-xs text-[#2B2F36] flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>Duplicate Invoice</span>
                  </button>

                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setShowVoidDialog(true);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] text-xs text-[#6B7280] hover:text-amber-600 flex items-center gap-2 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Void Invoice</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-[#F3F4F6]" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setShowDeleteDialog(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-xs text-[#E54B4B] flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Invoice</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sub-Action: Show PDF View Toggle */}
          <div className="flex items-center gap-4 text-xs text-[#6B7280]">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#1E2540]">
              <input
                type="checkbox"
                checked={showPdfView}
                onChange={(e) => handleTogglePdfView(e.target.checked)}
                className="rounded border-[#CBD5E1] text-[#408DFB] focus:ring-0 cursor-pointer"
              />
              <span>Show PDF View</span>
            </label>
          </div>
        </div>
      </div>

      {/* 2. SCROLLABLE DOCUMENT WORKSPACE */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-[800px] mx-auto space-y-6">
          {/* Main Document / Alternative Details View */}
          {showPdfView ? (
            /* A. FORMATTED PAPER DOCUMENT (Spreadsheet Template) */
            <div className="transition-all duration-200">
              <SpreadsheetInvoiceDocument
                invoice={invoice}
                company={company}
                showStatusRibbon={true}
              />
            </div>
          ) : (
            /* B. STRUCTURED ACCOUNTING DETAILS CARD (When PDF View is unchecked — NEVER BLANK!) */
            <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 shadow-xs space-y-6 text-xs text-[#1E2540]">
              {/* Financial KPI Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px]">
                <div>
                  <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block">
                    Invoice Total
                  </span>
                  <span className="text-base font-bold text-[#1E2540]">
                    ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block">
                    Amount Paid
                  </span>
                  <span className="text-base font-bold text-[#16A34A]">
                    ₹ {amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block">
                    Balance Due
                  </span>
                  <span
                    className={`text-base font-bold ${
                      outstanding > 0 ? 'text-[#E54B4B]' : 'text-green-600'
                    }`}
                  >
                    ₹ {outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block">
                    Due Date
                  </span>
                  <span className="text-xs font-semibold text-[#1E2540] mt-1 block">
                    {invoice.dueDate
                      ? new Date(invoice.dueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Customer & Billing Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#6B7280] mb-2">
                    Customer Information
                  </h4>
                  <p className="text-sm font-bold text-[#2563EB]">{customer?.name || 'Customer'}</p>
                  {customer?.companyName && (
                    <p className="text-xs text-[#6B7280] mt-0.5">{customer.companyName}</p>
                  )}
                  {customer?.gstin && (
                    <p className="font-mono text-xs text-[#1E2540] mt-1">
                      GSTIN: <strong>{customer.gstin}</strong>
                    </p>
                  )}
                  {customer?.pan && (
                    <p className="font-mono text-xs text-[#6B7280]">PAN: {customer.pan}</p>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#6B7280] mb-2">
                    Billing Address
                  </h4>
                  <p className="leading-relaxed text-[#4B5563] whitespace-pre-line">
                    {invoice.billingAddress || customer?.address || 'No address specified'}
                  </p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#6B7280] mb-2">
                  Line Items ({invoice.items?.length || 0})
                </h4>
                <div className="overflow-x-auto border border-[#E5E7EB] rounded-[4px]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
                      <tr>
                        <th className="py-2 px-3">Item & Description</th>
                        <th className="py-2 px-3 text-center">HSN/SAC</th>
                        <th className="py-2 px-3 text-right">Qty</th>
                        <th className="py-2 px-3 text-right">Rate</th>
                        <th className="py-2 px-3 text-right">Tax%</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {(invoice.items || []).map((item: any, idx: number) => (
                        <tr key={item.id || idx}>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-[#1E2540] block">
                              {item.product?.name || item.description || 'Item'}
                            </span>
                            {item.notes && (
                              <span className="text-[11px] text-[#6B7280]">{item.notes}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[#6B7280]">
                            {item.hsn || item.product?.hsnCode || '—'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {item.qty || item.quantity || 1} {item.unit || 'pcs'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            ₹{Number(item.rate || item.unitPrice || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {item.taxPercent || item.taxRate || 0}%
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[#1E2540] font-mono">
                            ₹{Number(item.total || (item.qty * item.rate) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes & Terms */}
              {(invoice.notes || invoice.terms) && (
                <div className="pt-2 border-t border-[#E5E7EB] space-y-2">
                  {invoice.notes && (
                    <div>
                      <span className="font-semibold text-[#6B7280] text-[11px] block">Notes</span>
                      <p className="text-[#4B5563] mt-0.5">{invoice.notes}</p>
                    </div>
                  )}
                  {invoice.terms && (
                    <div>
                      <span className="font-semibold text-[#6B7280] text-[11px] block">
                        Terms & Conditions
                      </span>
                      <p className="text-[#4B5563] mt-0.5 whitespace-pre-line">{invoice.terms}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Template Info Link (Matching Zoho Screenshot) */}
          <div className="text-right text-xs text-[#6B7280] pt-1">
            <span>PDF Template: &apos;Spreadsheet Template&apos; </span>
            <button
              type="button"
              onClick={() => navigate('/settings/templates?type=INVOICE')}
              className="text-[#408DFB] hover:underline font-medium cursor-pointer"
            >
              Change
            </button>
          </div>

          {/* 3. SECTION: MORE INFORMATION */}
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E2540] border-b border-[#F3F4F6] pb-2">
              More Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
              <div>
                <span className="text-[#6B7280] block text-[11px]">Salesperson</span>
                <span className="font-semibold text-[#1E2540] mt-0.5 block">
                  {invoice.salesperson || invoice.gstBreakup?.salesperson || 'Anas'}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] block text-[11px]">Payment Terms</span>
                <span className="font-semibold text-[#1E2540] mt-0.5 block">
                  {invoice.paymentTerms || 'Due on Receipt'}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] block text-[11px]">Place Of Supply</span>
                <span className="font-semibold text-[#1E2540] mt-0.5 block">
                  {formatPlaceOfSupply(invoice.placeOfSupply || company?.state || 'Kerala')}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] block text-[11px]">Customer Reference</span>
                <span className="font-semibold text-[#1E2540] mt-0.5 block font-mono">
                  {invoice.orderNo || invoice.referenceNo || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. SECTION: PAYMENT INFORMATION */}
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E2540]">
                Payment Information
              </h3>
              {canRecordPayment && (
                <button
                  type="button"
                  onClick={() => navigate(`/invoices/${invoice.id}/payment`)}
                  className="text-xs text-[#408DFB] hover:text-[#2563EB] font-semibold cursor-pointer"
                >
                  + Record Payment
                </button>
              )}
            </div>

            {invoice.receiptAllocations && invoice.receiptAllocations.length > 0 ? (
              <div className="overflow-x-auto border border-[#E5E7EB] rounded-[4px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
                    <tr>
                      <th className="py-2 px-3">Receipt #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Payment Mode</th>
                      <th className="py-2 px-3">Reference / UTR</th>
                      <th className="py-2 px-3 text-right">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {invoice.receiptAllocations.map((alloc: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-mono font-semibold text-[#408DFB]">
                          {alloc.receipt?.receiptNo || `REC-${idx + 1}`}
                        </td>
                        <td className="py-2 px-3 text-[#4B5563]">
                          {alloc.receipt?.date
                            ? new Date(alloc.receipt.date).toLocaleDateString('en-IN')
                            : alloc.createdAt
                            ? new Date(alloc.createdAt).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-[#4B5563]">
                          {alloc.receipt?.paymentMethod || 'Bank Transfer'}
                        </td>
                        <td className="py-2 px-3 text-[#4B5563] font-mono">
                          {alloc.receipt?.referenceNo || '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-green-700 font-mono">
                          ₹{Number(alloc.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-[#F8F9FB] rounded-[4px] border border-[#E5E7EB] text-center text-[#6B7280] text-xs">
                No payments have been recorded for this invoice yet.
                {canRecordPayment && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/invoices/${invoice.id}/payment`)}
                      className="px-3 py-1 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Record Payment Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. SECTION: JOURNAL (Matching Zoho Books Screenshot) */}
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E2540] border-b border-[#F3F4F6] pb-2">
              Journal
            </h3>

            {invoice.status === 'DRAFT' ? (
              <div className="text-xs text-[#6B7280] italic py-2">
                Journal entries will not be available for Invoices in the Draft state.
              </div>
            ) : invoice.journalEntries && invoice.journalEntries.length > 0 ? (
              <div className="space-y-4">
                {invoice.journalEntries.map((je: any) => (
                  <div key={je.id} className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
                    <div className="px-3 py-2 bg-[#F8F9FB] border-b border-[#E5E7EB] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1E2540]">
                          Journal #{je.entryNo || je.reference || 'JN-001'}
                        </span>
                        <span className="text-[#6B7280]">
                          • {je.date ? new Date(je.date).toLocaleDateString('en-IN') : ''}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                        POSTED
                      </span>
                    </div>

                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 border-b border-[#E5E7EB] text-[#6B7280]">
                        <tr>
                          <th className="py-1.5 px-3">Account</th>
                          <th className="py-1.5 px-3 text-right w-28">Debit (₹)</th>
                          <th className="py-1.5 px-3 text-right w-28">Credit (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {(je.lines || []).map((line: any, lIdx: number) => (
                          <tr key={lIdx}>
                            <td className="py-1.5 px-3">
                              <span className="font-medium text-[#1E2540]">
                                {line.account?.name || line.description || 'Account'}
                              </span>
                              {line.description && line.description !== line.account?.name && (
                                <span className="text-[11px] text-[#6B7280] block">
                                  {line.description}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-medium text-[#1E2540]">
                              {Number(line.debit || 0) > 0 ? Number(line.debit).toFixed(2) : '—'}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-medium text-[#1E2540]">
                              {Number(line.credit || 0) > 0 ? Number(line.credit).toFixed(2) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              /* Simulated Authorized Double Entry Preview when posted */
              <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden text-xs">
                <div className="px-3 py-2 bg-[#F8F9FB] border-b border-[#E5E7EB] flex items-center justify-between">
                  <span className="font-semibold text-[#1E2540]">
                    System General Ledger Entry • {new Date(invoice.date).toLocaleDateString('en-IN')}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                    POSTED
                  </span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-[#E5E7EB] text-[#6B7280]">
                    <tr>
                      <th className="py-1.5 px-3">Account</th>
                      <th className="py-1.5 px-3 text-right w-28">Debit (₹)</th>
                      <th className="py-1.5 px-3 text-right w-28">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    <tr>
                      <td className="py-1.5 px-3 font-medium text-[#1E2540]">
                        Accounts Receivable ({customer?.name || 'Customer'})
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-[#1E2540]">
                        {grandTotal.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-[#6B7280]">—</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-medium text-[#1E2540] pl-6">
                        Sales Revenue
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-[#6B7280]">—</td>
                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-[#1E2540]">
                        {Number(invoice.subTotal || 0).toFixed(2)}
                      </td>
                    </tr>
                    {Number(invoice.cgstTotal || 0) > 0 && (
                      <tr>
                        <td className="py-1.5 px-3 font-medium text-[#1E2540] pl-6">
                          Output CGST (9%)
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-[#6B7280]">—</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-[#1E2540]">
                          {Number(invoice.cgstTotal).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {Number(invoice.sgstTotal || 0) > 0 && (
                      <tr>
                        <td className="py-1.5 px-3 font-medium text-[#1E2540] pl-6">
                          Output SGST (9%)
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-[#6B7280]">—</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-[#1E2540]">
                          {Number(invoice.sgstTotal).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {Number(invoice.igstTotal || 0) > 0 && (
                      <tr>
                        <td className="py-1.5 px-3 font-medium text-[#1E2540] pl-6">
                          Output IGST (18%)
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-[#6B7280]">—</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-[#1E2540]">
                          {Number(invoice.igstTotal).toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 6. SECTION: AUDIT & ACTIVITY TIMELINE */}
          {invoice.auditLogs && invoice.auditLogs.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E2540] border-b border-[#F3F4F6] pb-2">
                Activity & History
              </h3>
              <div className="divide-y divide-[#F3F4F6]">
                {invoice.auditLogs.map((log: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#1E2540] block">
                        {log.action?.replace(/_/g, ' ') || 'Invoice Action'}
                      </span>
                      <span className="text-[11px] text-[#6B7280]">
                        By {log.userName || log.userEmail || 'System'}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6B7280]">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteInvoice}
        title="Delete Invoice"
        message={`Are you sure you want to permanently delete invoice ${invoice.invoiceNo}? This action cannot be undone.`}
        confirmText="Delete Permanently"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showVoidDialog}
        onClose={() => setShowVoidDialog(false)}
        onConfirm={handleVoidInvoice}
        title="Void Invoice"
        message={`Are you sure you want to mark invoice ${invoice.invoiceNo} as Void? Accounting entries will be reversed.`}
        confirmText="Void Invoice"
        variant="danger"
      />
    </div>
  );
};
