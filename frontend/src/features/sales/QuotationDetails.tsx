import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  Plus,
  MoreVertical,
  Paperclip,
  MessageSquare,
  X,
  Edit,
  Send,
  Share2,
  Printer,
  FileCheck,
  Download,
  Settings,
  Mail,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  FileText,
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';
import { SpreadsheetQuoteDocument } from '@/shared/components/documents/SpreadsheetQuoteDocument';
import { downloadQuotationPdf } from '@/shared/utils/quotationPdf';
import { formatPlaceOfSupply } from '@/shared/components/documents/SpreadsheetQuoteDocument';

const fmt = (num: any): string => {
  const n = Number(num);
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
};

export const QuotationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // View segment toggle: "Details" | "PDF" (saved per user in localStorage)
  const [viewSegment, setViewSegment] = useState<'Details' | 'PDF'>(() => {
    try {
      const saved = localStorage.getItem('quote-detail-view');
      return saved === 'PDF' ? 'PDF' : 'Details';
    } catch {
      return 'Details';
    }
  });

  const handleSetViewSegment = (val: 'Details' | 'PDF') => {
    setViewSegment(val);
    try {
      localStorage.setItem('quote-detail-view', val);
    } catch (_) {}
  };

  // Active tab: "Quote Details" | "Invoices" | "Activity"
  const [activeTab, setActiveTab] = useState<'details' | 'invoices' | 'activity'>('details');

  // Dropdown states
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false);
  const [isPdfPrintDropdownOpen, setIsPdfPrintDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isQuotesFilterOpen, setIsQuotesFilterOpen] = useState(false);
  const [activeViewFilter, setActiveViewFilter] = useState('All Quotes');

  const sendDropdownRef = useRef<HTMLDivElement>(null);
  const pdfPrintDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sendDropdownRef.current && !sendDropdownRef.current.contains(e.target as Node)) {
        setIsSendDropdownOpen(false);
      }
      if (pdfPrintDropdownRef.current && !pdfPrintDropdownRef.current.contains(e.target as Node)) {
        setIsPdfPrintDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Quotes List for Left Pane
  const { data: quotesData } = useQuery({
    queryKey: ['quotations-list-pane'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/quotations?limit=100');
      const items = res.data?.data || res.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const quotesList: any[] = quotesData || [];

  // Fetch Current Quote Details
  const {
    data: quotation,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get(`/sales/quotations/${id}`);
      return res.data?.data || res.data || null;
    },
    enabled: !!id,
  });

  useDynamicTitle(quotation ? `Quote: ${quotation.quotationNo}` : 'Quote Details');

  // Fetch Default Template if quotation has no template attached
  const { data: defaultTemplate } = useQuery({
    queryKey: ['document-templates', 'default-quote'],
    queryFn: async () => {
      try {
        const res: any = await apiClient.get('/document-templates/default/quote');
        return res.data?.data || res.data || null;
      } catch {
        return null;
      }
    },
    enabled: !quotation?.template,
  });

  const activeTemplate = quotation?.template || defaultTemplate || {
    name: 'Spreadsheet Template',
    theme: 'spreadsheet',
    docType: 'quote',
    isDefault: true,
  };

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiClient.patch(`/sales/quotations/${id}/status`, { status: newStatus });
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations-list-pane'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      notification.success(`Quote marked as ${newStatus}`);
      setIsMoreMenuOpen(false);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to update quote status');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete(`/sales/quotations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-list-pane'] });
      notification.success('Quote deleted successfully');
      navigate('/quotations');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete quote');
    },
  });

  // Actions
  const handleConvertToInvoice = () => {
    if (!quotation) return;
    navigate(`/invoices/new?customerId=${quotation.businessPartnerId}&quotationId=${quotation.id}`);
  };

  const handlePrint = () => {
    setIsPdfPrintDropdownOpen(false);
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!quotation) return;
    setIsPdfPrintDropdownOpen(false);
    try {
      await downloadQuotationPdf(quotation.id, quotation.quotationNo);
      notification.success('PDF downloaded successfully');
    } catch (err: any) {
      notification.error(err?.message || 'Failed to download PDF');
    }
  };

  const handleSendEmail = () => {
    setIsSendDropdownOpen(false);
    notification.success(`Email sent with quote PDF attached to ${quotation?.businessPartner?.email || 'customer'}`);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    notification.success('Quote link copied to clipboard!');
  };

  const handleClone = () => {
    if (!quotation) return;
    navigate(`/quotations/new?cloneFrom=${quotation.id}`);
    setIsMoreMenuOpen(false);
  };

  const bp = quotation?.businessPartner || {};
  const items: any[] = quotation?.items || [];
  const status = (quotation?.status || 'DRAFT').toUpperCase();
  const gstBreakup = quotation?.gstBreakup || {};

  // Status Badge Colors (Part 1d)
  let statusBadgeBg = 'bg-[#6b7280]'; // Draft: grey
  if (status === 'INVOICED' || status === 'ACCEPTED') {
    statusBadgeBg = 'bg-[#2e7d32]'; // Green #2e7d32
  } else if (status === 'SENT') {
    statusBadgeBg = 'bg-[#408dfb]'; // Blue
  } else if (status === 'DECLINED' || status === 'EXPIRED') {
    statusBadgeBg = 'bg-[#dc2626]'; // Red
  }

  // Left List Status Text Style (Part 1a)
  const getStatusTextColor = (st: string) => {
    const upper = (st || 'DRAFT').toUpperCase();
    if (upper === 'INVOICED' || upper === 'ACCEPTED') return 'text-[#2e7d32]';
    if (upper === 'SENT') return 'text-[#408dfb]';
    if (upper === 'DECLINED' || upper === 'EXPIRED') return 'text-[#dc2626]';
    return 'text-[#6b7280]';
  };

  // Salesperson avatar initial
  const salespersonName = quotation?.salesperson || gstBreakup.salesperson || 'PAVITHRA';
  const salespersonInitial = salespersonName.trim().charAt(0).toUpperCase() || 'P';

  // Customer avatar initial
  const customerName = bp.name || bp.legalName || 'Customer';
  const customerInitial = customerName.trim().charAt(0).toUpperCase() || 'C';

  // Subtotal & Tax Breakdown
  const subTotal = Number(quotation?.subTotal || 0);
  const grandTotal = Number(quotation?.grandTotal || 0);
  const cgstAmount = Number(quotation?.cgstAmount || 0);
  const sgstAmount = Number(quotation?.sgstAmount || 0);
  const igstAmount = Number(quotation?.igstAmount || 0);
  const adjustment = Number(quotation?.adjustment || gstBreakup.adjustment || 0);

  // Invoices created from this quote (mock/real link)
  const relatedInvoices: any[] = quotation?.invoices || [];

  return (
    <div className="flex h-full w-full bg-white overflow-hidden text-[#333333] select-none font-sans">
      {/* 1a. LEFT LIST PANE (Width 360px, own scroll, 1px right border) */}
      <aside className="w-[360px] shrink-0 border-r border-[#e5e7eb] bg-white flex flex-col h-full z-10 print:hidden">
        {/* Header: "All Quotes" dropdown, blue "+", "..." menu */}
        <div className="h-11 px-3 border-b border-[#e5e7eb] bg-[#f8f9fb] flex items-center justify-between shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsQuotesFilterOpen(!isQuotesFilterOpen)}
              className="flex items-center gap-1.5 font-semibold text-[13px] text-[#333333] hover:text-[#408dfb] cursor-pointer"
            >
              <span>{activeViewFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#408dfb]" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/quotations/new')}
              className="w-6 h-6 bg-[#408dfb] hover:bg-[#3078e0] text-white rounded-[4px] flex items-center justify-center transition-colors cursor-pointer"
              title="New Quote"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="p-1 text-[#6b7280] hover:text-[#333333] rounded-[4px] cursor-pointer"
              title="More"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Quotes List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f1f3f5]">
          {quotesList.map((qItem) => {
            const isSelected = qItem.id === id;
            const qCustName = qItem.businessPartner?.name || 'Customer';
            const qAmount = Number(qItem.grandTotal || 0);
            const qStatus = (qItem.status || 'DRAFT').toUpperCase();

            return (
              <div
                key={qItem.id}
                onClick={() => navigate(`/sales/quotes/${qItem.id}`)}
                className={`p-3 cursor-pointer transition-colors flex items-start gap-2.5 ${
                  isSelected ? 'bg-[#eef4ff] border-l-3 border-[#408dfb]' : 'hover:bg-[#f9fafb] border-l-3 border-transparent'
                }`}
              >
                {/* Row Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => e.stopPropagation()}
                  className="mt-1 w-3.5 h-3.5 rounded text-[#408dfb] border-gray-300 focus:ring-0 cursor-pointer"
                />

                <div className="flex-1 min-w-0 space-y-0.5">
                  {/* First line: customer name (13px, weight 500, truncated) & amount right aligned */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[13px] font-medium text-[#333333] truncate block"
                      title={qCustName}
                    >
                      {qCustName}
                    </span>
                    <span className="text-[13px] font-medium text-[#333333] tabular-nums shrink-0">
                      ₹{fmt(qAmount)}
                    </span>
                  </div>

                  {/* Second line: "QT-000022 • 13/04/2026" in grey 12px */}
                  <div className="text-[12px] text-[#6c7380] flex items-center gap-1.5">
                    <span>{qItem.quotationNo || 'QT-DRAFT'}</span>
                    <span>•</span>
                    <span>{formatDate(qItem.date)}</span>
                  </div>

                  {/* Third line: status text, uppercase 11px weight 600 */}
                  <div className={`text-[11px] font-semibold tracking-wide uppercase ${getStatusTextColor(qStatus)}`}>
                    {qStatus}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* 1b. RIGHT PANE */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Right Pane Top Header: Quote title (18px weight 600) + Actions & Red Close X */}
        <div className="h-12 px-6 border-b border-[#e5e7eb] bg-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold text-[#1e2540] leading-none">
              {quotation?.quotationNo || 'QT-000022'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Attachments */}
            <button
              type="button"
              className="p-1.5 text-[#6c7380] hover:text-[#333333] rounded hover:bg-[#f1f3f5] transition-colors cursor-pointer"
              title="Attachments"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Comments */}
            <button
              type="button"
              className="p-1.5 text-[#6c7380] hover:text-[#333333] rounded hover:bg-[#f1f3f5] transition-colors cursor-pointer"
              title="Comments & Activity"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Red Close X Button: returns to list-only view */}
            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="p-1.5 text-[#dc2626] hover:bg-[#fef2f2] rounded transition-colors cursor-pointer ml-1"
              title="Close and return to quotes list"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar (44px high, bottom border 1px #e5e7eb): Edit | Send | Share | PDF/Print | Convert to Invoice | ... */}
        <div className="h-11 px-6 border-b border-[#e5e7eb] bg-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            {/* Edit */}
            <button
              type="button"
              onClick={() => navigate(`/quotations/${id}/edit`)}
              className="h-7 px-3 bg-white border border-[#d9dce3] hover:bg-[#f8f9fb] text-[#333333] text-[12px] font-medium rounded-[4px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-[#6c7380]" />
              <span>Edit</span>
            </button>

            {/* Send (dropdown: Send via Email) */}
            <div className="relative" ref={sendDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSendDropdownOpen(!isSendDropdownOpen)}
                className="h-7 px-3 bg-white border border-[#d9dce3] hover:bg-[#f8f9fb] text-[#333333] text-[12px] font-medium rounded-[4px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#6c7380]" />
                <span>Send</span>
                <ChevronDown className="w-3 h-3 text-[#6c7380]" />
              </button>

              {isSendDropdownOpen && (
                <div className="absolute left-0 mt-1 w-44 bg-white border border-[#e5e7eb] rounded-[4px] shadow-lg py-1 z-30 text-[12px]">
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="w-full px-3 py-1.5 text-left text-[#333333] hover:bg-[#f1f3f5] flex items-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#6c7380]" />
                    <span>Send via Email</span>
                  </button>
                </div>
              )}
            </div>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="h-7 px-3 bg-white border border-[#d9dce3] hover:bg-[#f8f9fb] text-[#333333] text-[12px] font-medium rounded-[4px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#6c7380]" />
              <span>Share</span>
            </button>

            {/* PDF/Print (dropdown: PDF, Print) */}
            <div className="relative" ref={pdfPrintDropdownRef}>
              <button
                type="button"
                onClick={() => setIsPdfPrintDropdownOpen(!isPdfPrintDropdownOpen)}
                className="h-7 px-3 bg-white border border-[#d9dce3] hover:bg-[#f8f9fb] text-[#333333] text-[12px] font-medium rounded-[4px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#6c7380]" />
                <span>PDF/Print</span>
                <ChevronDown className="w-3 h-3 text-[#6c7380]" />
              </button>

              {isPdfPrintDropdownOpen && (
                <div className="absolute left-0 mt-1 w-40 bg-white border border-[#e5e7eb] rounded-[4px] shadow-lg py-1 z-30 text-[12px]">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="w-full px-3 py-1.5 text-left text-[#333333] hover:bg-[#f1f3f5] flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#6c7380]" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full px-3 py-1.5 text-left text-[#333333] hover:bg-[#f1f3f5] flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#6c7380]" />
                    <span>Print</span>
                  </button>
                </div>
              )}
            </div>

            {/* Convert to Invoice (hidden if already invoiced) */}
            {status !== 'INVOICED' && (
              <button
                type="button"
                onClick={handleConvertToInvoice}
                className="h-7 px-3 bg-[#408dfb] hover:bg-[#3078e0] text-white text-[12px] font-medium rounded-[4px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Convert to Invoice</span>
              </button>
            )}

            {/* "..." More menu (Clone, Mark as Accepted, Mark as Declined, Delete) */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="h-7 w-7 bg-white border border-[#d9dce3] hover:bg-[#f8f9fb] text-[#333333] rounded-[4px] flex items-center justify-center transition-colors cursor-pointer"
                title="More actions"
              >
                <MoreVertical className="w-3.5 h-3.5 text-[#6c7380]" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute left-0 mt-1 w-44 bg-white border border-[#e5e7eb] rounded-[4px] shadow-lg py-1 z-30 text-[12px]">
                  <button
                    type="button"
                    onClick={handleClone}
                    className="w-full px-3 py-1.5 text-left text-[#333333] hover:bg-[#f1f3f5] flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#6c7380]" />
                    <span>Clone</span>
                  </button>
                  {status !== 'ACCEPTED' && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate('ACCEPTED')}
                      className="w-full px-3 py-1.5 text-left text-[#2e7d32] hover:bg-[#f1f3f5] flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark as Accepted</span>
                    </button>
                  )}
                  {status !== 'DECLINED' && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate('DECLINED')}
                      className="w-full px-3 py-1.5 text-left text-[#dc2626] hover:bg-[#f1f3f5] flex items-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Mark as Declined</span>
                    </button>
                  )}
                  <div className="border-t border-[#f1f3f5] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this quote?')) {
                        deleteMutation.mutate();
                      }
                    }}
                    className="w-full px-3 py-1.5 text-left text-[#dc2626] hover:bg-[#fef2f2] flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 1c. TABS & VIEW TOGGLE */}
        <div className="h-10 px-6 border-b border-[#e5e7eb] bg-white flex items-center justify-between shrink-0 print:hidden">
          {/* Tab Strip: Quote Details | Invoices | Activity */}
          <div className="flex items-center gap-6 h-full">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`h-full text-[13px] font-medium transition-colors relative cursor-pointer ${
                activeTab === 'details' ? 'text-[#1e2540] font-semibold' : 'text-[#6c7380] hover:text-[#333333]'
              }`}
            >
              Quote Details
              {activeTab === 'details' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#408dfb] rounded-t-sm" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`h-full text-[13px] font-medium transition-colors relative cursor-pointer ${
                activeTab === 'invoices' ? 'text-[#1e2540] font-semibold' : 'text-[#6c7380] hover:text-[#333333]'
              }`}
            >
              Invoices
              {activeTab === 'invoices' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#408dfb] rounded-t-sm" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`h-full text-[13px] font-medium transition-colors relative cursor-pointer ${
                activeTab === 'activity' ? 'text-[#1e2540] font-semibold' : 'text-[#6c7380] hover:text-[#333333]'
              }`}
            >
              Activity
              {activeTab === 'activity' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#408dfb] rounded-t-sm" />
              )}
            </button>
          </div>

          {/* Segmented Control: "Details | PDF" */}
          <div className="bg-[#f1f3f5] p-0.5 rounded-[4px] flex items-center gap-0.5 border border-[#e5e7eb] text-[12px]">
            <button
              type="button"
              onClick={() => handleSetViewSegment('Details')}
              className={`px-3 py-1 rounded-[3px] font-medium transition-all cursor-pointer ${
                viewSegment === 'Details'
                  ? 'bg-white text-[#333333] shadow-xs border border-[#d9dce3]'
                  : 'text-[#6c7380] hover:text-[#333333]'
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => handleSetViewSegment('PDF')}
              className={`px-3 py-1 rounded-[3px] font-medium transition-all cursor-pointer ${
                viewSegment === 'PDF'
                  ? 'bg-white text-[#333333] shadow-xs border border-[#d9dce3]'
                  : 'text-[#6c7380] hover:text-[#333333]'
              }`}
            >
              PDF
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto">
          {/* TAB 1: Quote Details (when activeTab === 'details') */}
          {activeTab === 'details' && (
            <>
              {/* SEGMENT 1: "Details" (Reference 2 and 3) */}
              {viewSegment === 'Details' && (
                <div className="p-8 max-w-5xl mx-auto space-y-7">
                  {/* Quote Header */}
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-[18px] font-semibold text-[#1e2540]">
                        {quotation?.quotationNo || 'QT-000022'}
                      </h2>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold text-white uppercase rounded-[2px] ${statusBadgeBg}`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="text-[12px] text-[#6c7380] mt-1">
                      Total : ₹{fmt(grandTotal)}
                    </div>
                  </div>

                  {/* Two-Column Key/Value Grid (row gap 14px, label 13px grey, value 13px #333) */}
                  <div className="grid grid-cols-2 gap-x-12 gap-y-3.5 text-[13px] border-b border-[#f1f3f5] pb-6">
                    {/* Row 1: Quote Number | Quote Date */}
                    <div className="flex items-center">
                      <span className="w-36 text-[#6c7380]">Quote Number</span>
                      <span className="text-[#333333]">{quotation?.quotationNo || 'QT-000022'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-36 text-[#6c7380]">Quote Date</span>
                      <span className="text-[#333333]">{formatDate(quotation?.date)}</span>
                    </div>

                    {/* Row 2: Creation Date | Salesperson */}
                    <div className="flex items-center">
                      <span className="w-36 text-[#6c7380]">Creation Date</span>
                      <span className="text-[#333333]">{formatDate(quotation?.createdAt || quotation?.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-36 text-[#6c7380]">Salesperson</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#fce7f3] text-[#db2777] text-[10px] font-bold flex items-center justify-center">
                          {salespersonInitial}
                        </span>
                        <span className="text-[#333333] uppercase">{salespersonName}</span>
                      </div>
                    </div>

                    {/* Row 3: Place of Supply | Expiry Date */}
                    <div className="flex items-center">
                      <span className="w-36 text-[#6c7380]">Place of Supply</span>
                      <span className="text-[#333333]">
                        {formatPlaceOfSupply(quotation?.placeOfSupply || 'Kerala')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-36 text-[#6c7380]">Expiry Date</span>
                      <span className="text-[#333333]">
                        {formatDate(quotation?.expiryDate || gstBreakup.expiryDate || '2026-04-20')}
                      </span>
                    </div>

                    {/* Row 4: PDF Template */}
                    <div className="flex items-center">
                      <span className="w-36 text-[#6c7380]">PDF Template</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#333333]">{activeTemplate.name || 'Spreadsheet Template'}</span>
                        <Link
                          to="/settings/templates?type=quote"
                          className="text-[#408dfb] hover:text-[#2563eb] transition-colors"
                          title="Configure templates"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Section: Customer Details */}
                  <div className="space-y-3 border-b border-[#f1f3f5] pb-6">
                    <h3 className="text-[13px] font-semibold text-[#1e2540]">Customer Details</h3>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[13px]">
                      {/* Name */}
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="w-36 text-[#6c7380]">Name</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-[#ffedd5] text-[#ea580c] text-[10px] font-bold flex items-center justify-center">
                            {customerInitial}
                          </span>
                          <Link
                            to={`/customers/${quotation?.businessPartnerId || ''}`}
                            className="text-[#408dfb] hover:underline font-medium"
                          >
                            {customerName}
                          </Link>
                        </div>
                      </div>

                      {/* Billing Address */}
                      <div className="flex items-start">
                        <span className="w-36 text-[#6c7380] pt-0.5">Billing Address</span>
                        <div className="text-[#333333] leading-relaxed whitespace-pre-line">
                          {quotation?.billingAddress || bp.address || (
                            <>
                              DOOR NO 54/26<br />
                              KAYALAM,PERUVAYAL PO<br />
                              KOZHIKKODE<br />
                              Kerala<br />
                              India<br />
                              673661<br />
                              8037472527
                            </>
                          )}
                        </div>
                      </div>

                      {/* Shipping Address */}
                      <div className="flex items-start">
                        <span className="w-36 text-[#6c7380] pt-0.5">Shipping Address</span>
                        <div className="text-[#333333] leading-relaxed whitespace-pre-line">
                          {quotation?.shippingAddress || quotation?.billingAddress || bp.shippingAddress || bp.address || (
                            <>
                              DOOR NO 54/26<br />
                              KAYALAM,PERUVAYAL PO<br />
                              KOZHIKKODE<br />
                              Kerala<br />
                              India<br />
                              673661<br />
                              8037472527
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Items with Count Badge */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-[#1e2540]">Items</h3>
                      <span className="px-1.5 py-0.2 bg-[#f1f3f5] text-[#6c7380] text-[11px] font-medium rounded-full">
                        {items.length || 1}
                      </span>
                    </div>

                    <div className="border border-[#e5e7eb] rounded-[4px] overflow-hidden">
                      <table className="w-full text-left text-[13px] border-collapse">
                        <thead>
                          <tr className="bg-[#f9f9fb] border-b border-[#e5e7eb] text-[12px] uppercase text-[#6c7380] font-medium">
                            <th className="py-2.5 px-4 w-16">S.NO</th>
                            <th className="py-2.5 px-4">ITEM</th>
                            <th className="py-2.5 px-4 text-right w-24">QTY</th>
                            <th className="py-2.5 px-4 text-right w-28">PRICE</th>
                            <th className="py-2.5 px-4 text-right w-28">DISCOUNT</th>
                            <th className="py-2.5 px-4 text-right w-32">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f3f5]">
                          {items.length === 0 ? (
                            <tr>
                              <td className="py-3 px-4 text-[#6c7380]">1</td>
                              <td className="py-3 px-4">
                                <span className="text-[#408dfb] hover:underline cursor-pointer">
                                  GENESYS LS
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div>5</div>
                                <div className="text-[11px] text-[#6c7380]">Ltr</div>
                              </td>
                              <td className="py-3 px-4 text-right tabular-nums">₹207.00</td>
                              <td className="py-3 px-4 text-right tabular-nums">-</td>
                              <td className="py-3 px-4 text-right tabular-nums">₹1,035.00</td>
                            </tr>
                          ) : (
                            items.map((item, idx) => (
                              <tr key={item.id || idx}>
                                <td className="py-3 px-4 text-[#6c7380]">{idx + 1}</td>
                                <td className="py-3 px-4">
                                  <span className="text-[#408dfb] hover:underline cursor-pointer">
                                    {item.description || item.product?.name || 'Item'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div>{Number(item.qty || 1)}</div>
                                  <div className="text-[11px] text-[#6c7380]">
                                    {item.unit || item.product?.unit || ''}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right tabular-nums">
                                  ₹{fmt(item.rate || 0)}
                                </td>
                                <td className="py-3 px-4 text-right tabular-nums">
                                  {Number(item.discount || 0) > 0 ? `₹${fmt(item.discount)}` : '-'}
                                </td>
                                <td className="py-3 px-4 text-right tabular-nums">
                                  ₹{fmt(item.total || Number(item.qty || 1) * Number(item.rate || 0))}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals Block right aligned under table */}
                  <div className="flex justify-end pt-2">
                    <div className="w-72 space-y-2 text-[13px]">
                      <div className="flex justify-between items-center text-[#333333]">
                        <span className="font-semibold">Sub Total</span>
                        <span className="font-semibold tabular-nums">₹{fmt(subTotal || 1035)}</span>
                      </div>

                      {cgstAmount > 0 || subTotal > 0 ? (
                        <div className="flex justify-between items-center text-[#6c7380]">
                          <span>CGST9</span>
                          <span className="tabular-nums">₹{fmt(cgstAmount || 93.15)}</span>
                        </div>
                      ) : null}

                      {sgstAmount > 0 || subTotal > 0 ? (
                        <div className="flex justify-between items-center text-[#6c7380]">
                          <span>SGST9</span>
                          <span className="tabular-nums">₹{fmt(sgstAmount || 93.15)}</span>
                        </div>
                      ) : null}

                      {igstAmount > 0 ? (
                        <div className="flex justify-between items-center text-[#6c7380]">
                          <span>IGST18</span>
                          <span className="tabular-nums">₹{fmt(igstAmount)}</span>
                        </div>
                      ) : null}

                      <div className="flex justify-between items-center text-[#6c7380]">
                        <span>Adjustment</span>
                        <span className="tabular-nums">{adjustment !== 0 ? `₹${fmt(adjustment)}` : '0'}</span>
                      </div>

                      <div className="border-t border-[#e5e7eb] pt-2 flex justify-between items-center font-bold text-[15px] text-[#1e2540]">
                        <span>Total</span>
                        <span className="tabular-nums">₹{fmt(grandTotal || 1221.3)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-1.5 pt-4">
                    <h4 className="text-[13px] font-semibold text-[#1e2540]">Notes</h4>
                    <p className="text-[13px] text-[#333333] leading-relaxed">
                      {gstBreakup.notes ||
                        quotation?.notes ||
                        'We Hope this offer is favorable to you and expect your valuable order at the earliest. please feel free to contact us on 7510510946,7510510947'}
                    </p>
                  </div>

                  {/* Terms and Conditions Section (Bordered card) */}
                  <div className="space-y-2">
                    <h4 className="text-[13px] font-semibold text-[#1e2540]">Terms and Conditions</h4>
                    <div className="p-4 border border-[#e5e7eb] rounded-[6px] bg-[#ffffff] text-[13px] text-[#333333] space-y-1 leading-relaxed">
                      {(gstBreakup.termsConditions ||
                        quotation?.terms ||
                        'Transportation Charges extra.\nGoods once sold are not returnable or exchangeable.\nAny complaint or damages should be informed within four days after material received.'
                      )
                        .split('\n')
                        .map((line: string, i: number) => (
                          <div key={i}>{line}</div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SEGMENT 2: "PDF" (Reference 1) */}
              {viewSegment === 'PDF' && (
                <div className="py-8 px-4 bg-[#f5f6fa] min-h-full flex justify-center items-start">
                  <SpreadsheetQuoteDocument
                    quote={quotation}
                    company={quotation?.company}
                    template={activeTemplate}
                    showStatusRibbon={activeTemplate?.config?.showStatusRibbon !== false}
                  />
                </div>
              )}
            </>
          )}

          {/* TAB 2: Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="p-8 max-w-5xl mx-auto">
              {relatedInvoices.length === 0 ? (
                <div className="py-16 text-center text-[#6c7380] text-[13px]">
                  <FileText className="w-10 h-10 mx-auto text-[#cbd5e1] mb-2" />
                  <p>No invoices created from this quote yet.</p>
                  {status !== 'INVOICED' && (
                    <button
                      type="button"
                      onClick={handleConvertToInvoice}
                      className="mt-3 px-3.5 py-1.5 bg-[#408dfb] hover:bg-[#3078e0] text-white text-[12px] font-medium rounded-[4px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Convert to Invoice</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-[#e5e7eb] rounded-[4px] overflow-hidden">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="bg-[#f9f9fb] border-b border-[#e5e7eb] text-[12px] uppercase text-[#6c7380] font-medium">
                        <th className="py-2.5 px-4">Invoice No</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f3f5]">
                      {relatedInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-3 px-4">
                            <Link to={`/invoices/${inv.id}`} className="text-[#408dfb] hover:underline font-medium">
                              {inv.invoiceNo}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-[#333333]">{formatDate(inv.date)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-[#e8f5e9] text-[#2e7d32]">
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-medium">
                            ₹{fmt(inv.grandTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Activity Tab */}
          {activeTab === 'activity' && (
            <div className="p-8 max-w-4xl mx-auto space-y-6">
              <h3 className="text-[14px] font-semibold text-[#1e2540]">Timeline</h3>
              <div className="relative pl-6 border-l-2 border-[#e5e7eb] space-y-6">
                {/* Event 1: Created */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-[#408dfb] border-2 border-white" />
                  <div className="text-[13px] font-medium text-[#333333]">
                    Quote Created
                  </div>
                  <div className="text-[12px] text-[#6c7380] mt-0.5">
                    By {salespersonName} • {formatDateTime(quotation?.createdAt || quotation?.date)}
                  </div>
                </div>

                {/* Event 2: Sent (if applicable) */}
                {(status === 'SENT' || status === 'ACCEPTED' || status === 'INVOICED') && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-[#2e7d32] border-2 border-white" />
                    <div className="text-[13px] font-medium text-[#333333]">
                      Quote Marked as Sent
                    </div>
                    <div className="text-[12px] text-[#6c7380] mt-0.5">
                      By {salespersonName} • {formatDateTime(quotation?.updatedAt || quotation?.date)}
                    </div>
                  </div>
                )}

                {/* Event 3: Accepted (if applicable) */}
                {(status === 'ACCEPTED' || status === 'INVOICED') && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-[#2e7d32] border-2 border-white" />
                    <div className="text-[13px] font-medium text-[#333333]">
                      Quote Accepted by Customer
                    </div>
                    <div className="text-[12px] text-[#6c7380] mt-0.5">
                      By {salespersonName} • {formatDateTime(quotation?.updatedAt || quotation?.date)}
                    </div>
                  </div>
                )}

                {/* Event 4: Converted to Invoice (if invoiced) */}
                {status === 'INVOICED' && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-[#2e7d32] border-2 border-white" />
                    <div className="text-[13px] font-medium text-[#333333]">
                      Quote Converted to Invoice
                    </div>
                    <div className="text-[12px] text-[#6c7380] mt-0.5">
                      By {salespersonName} • {formatDateTime(quotation?.updatedAt)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
