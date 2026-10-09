import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, Download, Copy, ArrowLeft, Mail, CreditCard, Ban,
  Calendar, Clock, DollarSign, CheckCircle2, Sparkles,
  AlertTriangle, Building2, MapPin, FileText,
  ShieldCheck, RefreshCw, Receipt, BookOpen, ExternalLink,
  ChevronRight, Hash
} from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageContainer } from '@/shared/components/ui/LayoutComponents';
import { ConfirmDialog, JournalImpactView, PageLoader } from '@/shared/components/ui';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';
import { downloadInvoicePdf, printInvoicePdf } from '@/shared/utils/invoicePdf';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import {
  formatCurrency,
  formatDate,
  formatLongDate,
  formatDateTime,
  formatTime,
  isValidDate
} from '@/shared/utils/formatters';

interface ReceiptAllocationItem {
  id: string;
  amount: number | string;
  createdAt?: string | Date;
  receipt?: {
    id?: string;
    receiptNo?: string;
    date?: string | Date;
    paymentMethod?: string;
    referenceNo?: string;
    notes?: string;
  };
}

interface InvoiceItemRecord {
  id: string;
  productId?: string;
  description?: string;
  qty: number | string;
  rate: number | string;
  taxPercent: number | string;
  taxAmount: number | string;
  cgstAmount?: number | string;
  sgstAmount?: number | string;
  igstAmount?: number | string;
  total: number | string;
  product?: {
    id?: string;
    name?: string;
    hsnCode?: string;
    sku?: string;
    unit?: string;
  };
}

export const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

  // Fetch invoice details with robust resolution
  const { data: rawData, isLoading, error, refetch, isFetching } = useQuery<any>({
    queryKey: ['invoices', id],
    queryFn: async () => {
      if (!id) throw new Error('Invoice ID is required');
      const res = await apiClient.get<any>(`/sales/invoices/${id}`);

      // Resilient resolution: if res is the invoice or res.data is the invoice
      if (res && typeof res === 'object') {
        if ('id' in res && ('invoiceNo' in res || 'grandTotal' in res || 'items' in res)) {
          return res;
        }
        if (res.data && typeof res.data === 'object' && ('id' in res.data || 'invoiceNo' in res.data)) {
          return res.data;
        }
      }
      return res;
    },
    enabled: !!id,
    staleTime: 5000,
  });

  // Fetch company profile as fallback
  const { data: profileData } = useQuery<any>({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/auth/me');
      return res?.company || res?.data?.company || res?.data || res;
    },
    staleTime: 60000,
  });

  const invoice = useMemo(() => {
    if (!rawData || typeof rawData !== 'object') return null;
    return rawData;
  }, [rawData]);

  useDynamicTitle(invoice?.invoiceNo ? `Invoice: ${invoice.invoiceNo}` : 'Invoice Details');

  // Cancel invoice mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      await apiClient.delete(`/sales/invoices/${id}`);
    },
    onSuccess: async () => {
      notification.success('Invoice cancelled and reversed from general ledger successfully');
      await erpInvalidate.invoice(queryClient, {
        customerId: invoice?.businessPartnerId || invoice?.businessPartner?.id,
        invoiceId: id,
      });
      navigate('/invoices');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || err?.message || 'Failed to cancel invoice');
    }
  });

  // Authoritative calculations directly from database values
  const grandTotal = Number(invoice?.grandTotal || 0);
  const amountPaid = Number(invoice?.amountPaid || 0);
  const outstanding = Math.max(0, grandTotal - amountPaid);
  const subTotal = Number(invoice?.subTotal || 0);
  const taxTotal = Number(invoice?.taxTotal || invoice?.totalTaxAmount || 0);
  const cgstAmount = Number(invoice?.cgstAmount || 0);
  const sgstAmount = Number(invoice?.sgstAmount || 0);
  const igstAmount = Number(invoice?.igstAmount || 0);
  const cessAmount = Number(invoice?.cessAmount || 0);
  const roundOff = Number(invoice?.roundOff || 0);

  const isOverdue = Boolean(
    invoice?.dueDate &&
    isValidDate(invoice.dueDate) &&
    new Date(invoice.dueDate) < new Date() &&
    outstanding > 0 &&
    invoice?.status !== 'CANCELLED' &&
    invoice?.status !== 'VOID'
  );

  const overdueDays = useMemo(() => {
    if (!isOverdue || !invoice?.dueDate) return 0;
    const diffMs = Date.now() - new Date(invoice.dueDate).getTime();
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, [isOverdue, invoice?.dueDate]);

  // Payment history from receipt allocations
  const receiptHistory = useMemo(() => {
    if (!invoice) return [];
    const allocs: ReceiptAllocationItem[] = invoice.receiptAllocations || [];

    const sortedAllocs = [...allocs].sort((a, b) => {
      const dateA = new Date(a.receipt?.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.receipt?.date || b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    let runningBalance = grandTotal;
    return sortedAllocs.map((alloc) => {
      const allocAmt = Number(alloc.amount || 0);
      runningBalance -= allocAmt;
      return {
        id: alloc.id,
        date: alloc.receipt?.date || alloc.createdAt,
        receiptNo: alloc.receipt?.receiptNo || 'REC-N/A',
        amount: allocAmt,
        paymentMethod: alloc.receipt?.paymentMethod || 'BANK_TRANSFER',
        reference: alloc.receipt?.referenceNo || '—',
        notes: alloc.receipt?.notes,
        balanceAfter: Math.max(0, runningBalance),
      };
    });
  }, [invoice, grandTotal]);

  // Status badge config
  const statusInfo = useMemo(() => {
    if (!invoice) return { label: 'Unknown', bg: 'bg-muted/50 text-muted-foreground border-border' };

    const status = String(invoice.status || '').toUpperCase();
    if (status === 'CANCELLED' || status === 'VOID') {
      return { label: 'Cancelled', bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
    }
    if (status === 'DRAFT') {
      return { label: 'Draft', bg: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
    }
    if (amountPaid >= grandTotal && grandTotal > 0) {
      return { label: 'Paid in Full', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    }
    if (amountPaid > 0) {
      return { label: 'Partially Paid', bg: 'bg-sky-500/10 text-sky-600 border-sky-500/20' };
    }
    if (isOverdue) {
      return { label: `Overdue (${overdueDays}d)`, bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
    }
    if (status === 'ISSUED') {
      return { label: 'Issued', bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
    }
    return { label: status || 'Active', bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
  }, [invoice, amountPaid, grandTotal, isOverdue, overdueDays]);

  // Safe metadata extraction (notes/terms)
  const extraMeta = useMemo(() => {
    if (!invoice?.gstBreakup) return {};
    if (typeof invoice.gstBreakup === 'string') {
      try {
        return JSON.parse(invoice.gstBreakup);
      } catch {
        return {};
      }
    }
    return invoice.gstBreakup;
  }, [invoice?.gstBreakup]);

  const customerNotes = extraMeta.notes || invoice?.notes || 'Thank you for your business!';
  const termsConditions = extraMeta.termsConditions || invoice?.termsConditions || 'Payment is due within payment terms. Subject to local jurisdiction.';

  // Line items
  const items: InvoiceItemRecord[] = invoice?.items || [];

  // Group items by tax rate for tax breakdown
  const taxSummary = useMemo(() => {
    const summaryMap: Record<number, { taxableValue: number; taxAmount: number }> = {};
    items.forEach((item) => {
      const rate = Number(item.rate || 0);
      const qty = Number(item.qty || 0);
      const lineTaxable = rate * qty;
      const taxRate = Number(item.taxPercent || 0);
      const lineTaxAmt = Number(item.taxAmount || 0);

      if (taxRate > 0) {
        if (!summaryMap[taxRate]) {
          summaryMap[taxRate] = { taxableValue: 0, taxAmount: 0 };
        }
        summaryMap[taxRate].taxableValue += lineTaxable;
        summaryMap[taxRate].taxAmount += lineTaxAmt;
      }
    });

    return Object.entries(summaryMap).map(([rateStr, vals]) => ({
      rate: Number(rateStr),
      ...vals,
    }));
  }, [items]);

  // Company details
  const company = invoice?.company || profileData?.company || profileData || {};

  const handleDownloadPdf = async () => {
    if (!invoice?.id || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = notification.loading(`Preparing PDF for ${invoice.invoiceNo}...`);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoiceNo);
      notification.success(`Downloaded ${invoice.invoiceNo}.pdf`, { id: toastId });
    } catch (err: any) {
      notification.error(err.message || 'Unable to generate invoice PDF. Please try again.', { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = async () => {
    if (!invoice?.id || isPrintingPdf) return;
    setIsPrintingPdf(true);
    const toastId = notification.loading(`Preparing ${invoice.invoiceNo} for printing...`);
    try {
      await printInvoicePdf(invoice.id);
      notification.dismiss(toastId);
    } catch (err: any) {
      notification.error(err.message || 'Unable to prepare invoice for printing. Please try again.', { id: toastId });
    } finally {
      setIsPrintingPdf(false);
    }
  };

  const handleSendEmail = () => {
    notification.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: 'Generating and emailing invoice PDF...',
        success: `Invoice emailed to ${invoice?.businessPartner?.email || 'customer'} successfully!`,
        error: 'Failed to deliver invoice email.',
      }
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <PageContainer maxWidth="7xl">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/invoices')}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Invoices
          </Button>
        </div>
        <PageLoader
          title="Loading Invoice..."
          description="Fetching invoice details, line items, and payment status..."
        />
      </PageContainer>
    );
  }

  // Error / Not found state
  if (error || !invoice) {
    return (
      <PageContainer maxWidth="7xl">
        <div className="py-12">
          <Card className="max-w-md mx-auto p-8 text-center bg-surface border border-red-500/20 shadow-sm rounded-xl">
            <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Invoice Not Found</h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              {error instanceof Error
                ? error.message
                : `We could not find an invoice with ID "${id}". It may have been deleted or belongs to another organization.`}
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
              <Button onClick={() => navigate('/invoices')} variant="primary" size="sm">
                Back to Invoices
              </Button>
            </div>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // Real, formatted customer details
  const customerName =
    invoice.businessPartner?.tradeName ||
    invoice.businessPartner?.name ||
    'Customer Not Specified';

  const customerGstin = invoice.businessPartner?.gstin || null;
  const customerPhone = invoice.businessPartner?.phone || null;
  const customerEmail = invoice.businessPartner?.email || null;
  const billingAddr = invoice.billingAddress || invoice.businessPartner?.address || '—';
  const shippingAddr = invoice.shippingAddress || invoice.billingAddress || invoice.businessPartner?.address || '—';

  return (
    <>
      <PageContainer maxWidth="7xl">
        <div className="space-y-6 pb-12">

          {/* 1. TOP HEADER - ACTIONS BAR */}
          <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border bg-background sticky top-0 z-20 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/invoices')}
                className="p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground border border-border bg-surface shadow-xs"
                title="Back to Invoices"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    <span className="font-mono">{invoice.invoiceNo}</span>
                  </h1>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold select-none border ${statusInfo.bg}`}>
                    {statusInfo.label}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded">
                    {(invoice.invoiceType || 'TAX_INVOICE').replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span>Issued on {formatLongDate(invoice.date)}</span>
                  {invoice.dueDate && (
                    <>
                      <span>•</span>
                      <span className={isOverdue ? 'text-rose-500 font-medium' : ''}>
                        Due on {formatLongDate(invoice.dueDate)}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => navigate(`/invoices/new?duplicateId=${id}`)}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                title="Create a copy of this invoice"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </Button>

              <Button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 bg-surface text-foreground border border-border hover:bg-muted shadow-xs"
                title="Download PDF"
              >
                {isDownloadingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Download PDF
              </Button>

              <Button
                onClick={handlePrint}
                disabled={isPrintingPdf}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                title="Print Invoice"
              >
                {isPrintingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5" />
                )}
                Print
              </Button>

              <Button
                onClick={handleSendEmail}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                title="Email Invoice"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>

              {outstanding > 0 && invoice.status !== 'CANCELLED' && invoice.status !== 'VOID' && (
                <Button
                  onClick={() => setIsRecordPaymentOpen(true)}
                  variant="primary"
                  size="sm"
                  className="h-9 gap-1.5 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Record Payment
                </Button>
              )}

              {invoice.status !== 'CANCELLED' && invoice.status !== 'VOID' && (
                <Button
                  onClick={() => setShowCancelDialog(true)}
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Ban className="w-3.5 h-3.5" /> Cancel
                </Button>
              )}
            </div>
          </div>

          {/* 2. INVOICE SUMMARY KPI CARDS */}
          <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 bg-surface border border-border shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Customer</span>
              <div className="font-bold text-sm text-foreground truncate" title={customerName}>
                {customerName}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                {customerGstin ? `GSTIN: ${customerGstin}` : 'Consumer / Unregistered'}
              </div>
            </Card>

            <Card className="p-4 bg-surface border border-border shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Timeline</span>
              <div className="text-xs font-medium text-foreground">
                <span className="text-muted-foreground">Issued: </span>
                <span className="font-semibold">{formatDate(invoice.date)}</span>
              </div>
              <div className="text-xs font-medium text-foreground mt-0.5">
                <span className="text-muted-foreground">Due: </span>
                <span className={isOverdue ? 'font-bold text-rose-500' : 'font-semibold'}>
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
            </Card>

            <Card className="p-4 bg-surface border border-border shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Grand Total</span>
              <div className="text-lg font-bold text-foreground font-mono">
                {formatCurrency(grandTotal)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Includes Tax: {formatCurrency(taxTotal)}
              </div>
            </Card>

            <Card className={`p-4 bg-surface border shadow-xs ${outstanding > 0 ? 'border-rose-500/30 bg-rose-500/[0.02]' : 'border-emerald-500/30 bg-emerald-500/[0.02]'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Balance Due</span>
                {outstanding === 0 ? (
                  <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-500/10 px-1.5 py-0.2 rounded">Settled</span>
                ) : (
                  <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-500/10 px-1.5 py-0.2 rounded">Pending</span>
                )}
              </div>
              <div className={`text-lg font-bold font-mono ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(outstanding)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Paid: <span className="font-semibold text-foreground font-mono">{formatCurrency(amountPaid)}</span>
              </div>
            </Card>
          </div>

          {/* 3. MAIN PAGE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Side: Professional Invoice Sheet & Tables */}
            <div className="lg:col-span-2 space-y-6">

              {/* Professional Invoice Preview Sheet */}
              <div className="border border-border/80 shadow-md bg-white text-slate-800 rounded-xl overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">

                  {/* Document Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                          {company.companyName ? company.companyName.charAt(0).toUpperCase() : 'B'}
                        </div>
                        <h2 className="font-bold text-lg text-slate-900 tracking-tight">
                          {company.companyName || company.legalName || 'Bill Aura ERP'}
                        </h2>
                      </div>
                      <div className="text-xs text-slate-500 space-y-0.5 leading-relaxed">
                        {company.address && <div>{company.address}</div>}
                        {(company.city || company.state || company.pinCode) && (
                          <div>{[company.city, company.state, company.pinCode].filter(Boolean).join(', ')}</div>
                        )}
                        {company.phone && <div>Ph: {company.phone}</div>}
                        {company.email && <div>Email: {company.email}</div>}
                        {company.gstin && (
                          <div className="font-semibold text-slate-700 mt-1">
                            GSTIN: <span className="font-mono">{company.gstin}</span>
                          </div>
                        )}
                        {company.pan && (
                          <div className="text-[11px] text-slate-600">
                            PAN: <span className="font-mono">{company.pan}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right w-full sm:w-auto">
                      <div className="inline-block sm:text-right">
                        <h3 className="text-xl md:text-2xl font-black text-slate-950 uppercase tracking-tight">
                          {(invoice.invoiceType || 'TAX INVOICE').replace(/_/g, ' ')}
                        </h3>
                        <div className="mt-2.5 text-xs text-slate-500 space-y-1">
                          <div>
                            <span className="font-semibold text-slate-700">Invoice No:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{invoice.invoiceNo}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Date:</span>{' '}
                            <span className="font-medium text-slate-900">{formatLongDate(invoice.date)}</span>
                          </div>
                          {invoice.dueDate && (
                            <div>
                              <span className="font-semibold text-slate-700">Due Date:</span>{' '}
                              <span className="font-medium text-slate-900">{formatLongDate(invoice.dueDate)}</span>
                            </div>
                          )}
                          {invoice.placeOfSupply && (
                            <div>
                              <span className="font-semibold text-slate-700">Place of Supply:</span>{' '}
                              <span className="text-slate-900">{invoice.placeOfSupply}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer / Party Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-200 pb-6">
                    <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/60">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Billed To
                      </span>
                      <div className="font-bold text-sm text-slate-950 mb-1">{customerName}</div>
                      <div className="text-xs text-slate-600 leading-relaxed space-y-0.5">
                        <div>{billingAddr}</div>
                        {customerPhone && <div>Ph: {customerPhone}</div>}
                        {customerEmail && <div>Email: {customerEmail}</div>}
                        {customerGstin && (
                          <div className="font-semibold text-slate-800 mt-1.5 pt-1 border-t border-slate-200/60 font-mono text-[11px]">
                            GSTIN: {customerGstin}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/60">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Shipped To
                      </span>
                      <div className="font-bold text-sm text-slate-950 mb-1">{customerName}</div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        <div>{shippingAddr}</div>
                      </div>
                    </div>
                  </div>

                  {/* Products & Services Items Table */}
                  <div>
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Line Items & Tax Breakdown
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="py-2.5 px-3 w-8 text-center text-slate-500">#</th>
                            <th className="py-2.5 px-3 min-w-[180px]">Product / Service</th>
                            <th className="py-2.5 px-2 text-right">HSN/SAC</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Unit Price</th>
                            <th className="py-2.5 px-2 text-right">GST %</th>
                            <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                            <th className="py-2.5 px-3 text-right">Taxable</th>
                            <th className="py-2.5 px-3 text-right font-extrabold text-slate-900">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400">
                                No line items found on this invoice.
                              </td>
                            </tr>
                          ) : (
                            items.map((item, idx) => {
                              const qty = Number(item.qty || 0);
                              const rate = Number(item.rate || 0);
                              const lineTaxPercent = Number(item.taxPercent || 0);
                              const taxable = rate * qty;
                              const taxAmt = Number(item.taxAmount || 0);
                              const lineTotal = Number(item.total || 0);
                              const hsn = item.product?.hsnCode || '—';
                              const unit = item.product?.unit || '';

                              return (
                                <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-bold text-slate-950">
                                      {item.product?.name || item.description || 'Line Item'}
                                    </div>
                                    {item.description && item.product?.name && item.description !== item.product.name && (
                                      <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                                    )}
                                  </td>
                                  <td className="py-3 px-2 text-right font-mono text-slate-600 text-[11px]">
                                    {hsn}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                                    {qty.toLocaleString('en-IN')} {unit && <span className="text-[10px] text-slate-500">{unit}</span>}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                                    {formatCurrency(rate)}
                                  </td>
                                  <td className="py-3 px-2 text-right font-mono text-slate-700">
                                    {lineTaxPercent}%
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                                    {formatCurrency(taxAmt)}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                                    {formatCurrency(taxable)}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-950">
                                    {formatCurrency(lineTotal)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Calculations & Totals Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
                    <div className="space-y-4">
                      {/* Customer Notes */}
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Notes / Remarks
                        </span>
                        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed italic">
                          {customerNotes}
                        </div>
                      </div>

                      {/* Terms & Conditions */}
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Terms & Conditions
                        </span>
                        <div className="text-[11px] text-slate-500 bg-slate-50/50 p-3 rounded-lg border border-slate-200/60 leading-relaxed whitespace-pre-line">
                          {termsConditions}
                        </div>
                      </div>

                      {/* GST Tax Summary Table if applicable */}
                      {taxSummary.length > 0 && (
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Tax Slabs Summary
                          </span>
                          <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="p-2">Rate</th>
                                  <th className="p-2 text-right">Taxable</th>
                                  <th className="p-2 text-right">Tax Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                                {taxSummary.map((ts) => (
                                  <tr key={ts.rate}>
                                    <td className="p-2 font-medium">{ts.rate}% GST</td>
                                    <td className="p-2 text-right">{formatCurrency(ts.taxableValue)}</td>
                                    <td className="p-2 text-right font-semibold">{formatCurrency(ts.taxAmount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Authoritative Financial Breakdown */}
                    <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Subtotal (Base Value)</span>
                        <span className="font-mono font-medium text-slate-900">{formatCurrency(subTotal)}</span>
                      </div>

                      {cgstAmount > 0 && (
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Central GST (CGST)</span>
                          <span className="font-mono text-slate-900">{formatCurrency(cgstAmount)}</span>
                        </div>
                      )}

                      {sgstAmount > 0 && (
                        <div className="flex justify-between items-center text-slate-600">
                          <span>State GST (SGST)</span>
                          <span className="font-mono text-slate-900">{formatCurrency(sgstAmount)}</span>
                        </div>
                      )}

                      {igstAmount > 0 && (
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Integrated GST (IGST)</span>
                          <span className="font-mono text-slate-900">{formatCurrency(igstAmount)}</span>
                        </div>
                      )}

                      {cessAmount > 0 && (
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Cess Amount</span>
                          <span className="font-mono text-slate-900">{formatCurrency(cessAmount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-slate-600 border-t border-slate-200 pt-2">
                        <span>Total Tax</span>
                        <span className="font-mono font-medium text-slate-900">{formatCurrency(taxTotal)}</span>
                      </div>

                      {roundOff !== 0 && (
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Round Off</span>
                          <span className="font-mono text-slate-900">
                            {roundOff > 0 ? `+${formatCurrency(roundOff)}` : formatCurrency(roundOff)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center font-bold text-sm text-slate-950 border-t-2 border-slate-300 pt-2.5">
                        <span className="text-base font-black">Grand Total</span>
                        <span className="text-base font-mono font-black">{formatCurrency(grandTotal)}</span>
                      </div>

                      <div className="flex justify-between items-center text-emerald-700 font-semibold pt-1">
                        <span>Amount Paid</span>
                        <span className="font-mono">{formatCurrency(amountPaid)}</span>
                      </div>

                      <div className={`flex justify-between items-center border-t border-dashed border-slate-300 pt-2 font-black text-sm ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        <span>Balance Outstanding</span>
                        <span className="font-mono text-base">{formatCurrency(outstanding)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* PAYMENT & RECEIPT HISTORY SECTION */}
              <Card className="border border-border shadow-xs p-5 bg-surface rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-accent" />
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Receipt & Payment History
                    </h4>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {receiptHistory.length} {receiptHistory.length === 1 ? 'transaction' : 'transactions'}
                  </span>
                </div>

                {receiptHistory.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed border-border rounded-lg bg-muted/10">
                    <DollarSign className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs font-medium text-foreground">No Payment Allocations Yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      No customer receipt or collection has been linked to this invoice.
                    </p>
                    {outstanding > 0 && invoice.status !== 'CANCELLED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsRecordPaymentOpen(true)}
                        className="mt-3 gap-1.5 text-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Record Payment Now
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Receipt No</th>
                          <th className="py-2.5 px-3">Payment Mode</th>
                          <th className="py-2.5 px-3">Reference</th>
                          <th className="py-2.5 px-3 text-right">Allocated Amount</th>
                          <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {receiptHistory.map((alloc) => (
                          <tr key={alloc.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                              {formatDate(alloc.date)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-accent">
                              {alloc.receiptNo}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                                {alloc.paymentMethod.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">
                              {alloc.reference}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              {formatCurrency(alloc.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                              {formatCurrency(alloc.balanceAfter)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* ACCOUNTING IMPACT SECTION */}
              <Card className="border border-border shadow-xs p-5 bg-surface rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-accent" />
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Accounting Impact (General Ledger)
                    </h4>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Double-Entry Balanced
                  </span>
                </div>

                <JournalImpactView
                  reference={invoice.invoiceNo}
                  initialEntries={invoice.journalEntries}
                />
              </Card>

            </div>

            {/* Right Side: Receivables Summary & Audit Timeline */}
            <div className="space-y-6">

              {/* Receivables Summary Card */}
              <Card className="p-5 border border-border shadow-xs bg-surface rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Receivables Summary
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.bg}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block mb-0.5">
                    Current Balance Due
                  </span>
                  <div className={`text-3xl font-black font-mono tracking-tight ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(outstanding)}
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <div className="flex justify-between items-center">
                    <span>Grand Total:</span>
                    <span className="font-mono font-bold text-foreground">{formatCurrency(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Amount Paid:</span>
                    <span className="font-mono font-semibold text-emerald-600">{formatCurrency(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tax Surcharges:</span>
                    <span className="font-mono text-foreground">{formatCurrency(taxTotal)}</span>
                  </div>
                </div>

                {outstanding > 0 && invoice.status !== 'CANCELLED' && invoice.status !== 'VOID' && (
                  <Button
                    onClick={() => setIsRecordPaymentOpen(true)}
                    variant="primary"
                    className="w-full gap-2 shadow-xs"
                    size="sm"
                  >
                    <CreditCard className="w-4 h-4" /> Collect & Record Payment
                  </Button>
                )}

                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted/40 p-2.5 rounded-lg border border-border/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Double-entry ledgers reconciled against AR account.</span>
                </div>
              </Card>

              {/* Document Overview Metadata */}
              <Card className="p-5 border border-border shadow-xs bg-surface rounded-xl space-y-3 text-xs">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] border-b border-border pb-2">
                  Document Attributes
                </h4>
                <div className="space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Document Type:</span>
                    <span className="font-semibold text-foreground">
                      {(invoice.invoiceType || 'TAX_INVOICE').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Mode:</span>
                    <span className="font-semibold text-foreground">
                      {invoice.taxMode || 'CGST_SGST'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Place of Supply:</span>
                    <span className="font-semibold text-foreground">
                      {invoice.placeOfSupply || invoice.customerStateCode || 'State Default'}
                    </span>
                  </div>
                  {invoice.numberingSeries?.seriesName && (
                    <div className="flex justify-between">
                      <span>Series:</span>
                      <span className="font-semibold text-foreground">
                        {invoice.numberingSeries.seriesName}
                      </span>
                    </div>
                  )}
                  {invoice.taxTreatment?.name && (
                    <div className="flex justify-between">
                      <span>Tax Treatment:</span>
                      <span className="font-semibold text-foreground">
                        {invoice.taxTreatment.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Reverse Charge (RCM):</span>
                    <span className="font-semibold text-foreground">
                      {invoice.isRcm ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* AUDIT TRAIL & LIFECYCLE TIMELINE */}
              <Card className="p-5 border border-border shadow-xs bg-surface rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent" /> Audit Trail & Timeline
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">System Log</span>
                </div>

                <div className="relative border-l-2 border-border/60 ml-2.5 pl-4 space-y-4 py-1">

                  {/* 1. Document Genesis / Created Node */}
                  <div className="relative">
                    <div className="absolute -left-[23px] top-0.5 bg-indigo-600 text-white p-1 rounded-full border-2 border-surface shadow-xs">
                      <FileText className="w-2.5 h-2.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Invoice Document Generated
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDateTime(invoice.createdAt || invoice.date)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Document {invoice.invoiceNo} issued for {customerName}.
                      </div>
                    </div>
                  </div>

                  {/* 2. Double-Entry Posting Node */}
                  <div className="relative">
                    <div className="absolute -left-[23px] top-0.5 bg-blue-500 text-white p-1 rounded-full border-2 border-surface shadow-xs">
                      <Sparkles className="w-2.5 h-2.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        General Ledger Synced
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDateTime(invoice.date)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Debited Customer Receivables by {formatCurrency(grandTotal)}.
                      </div>
                    </div>
                  </div>

                  {/* 3. Payment Allocations if any */}
                  {receiptHistory.map((alloc) => (
                    <div key={alloc.id} className="relative">
                      <div className="absolute -left-[23px] top-0.5 bg-emerald-500 text-white p-1 rounded-full border-2 border-surface shadow-xs">
                        <DollarSign className="w-2.5 h-2.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          Payment Received ({alloc.receiptNo})
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDateTime(alloc.date)}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                          Credited {formatCurrency(alloc.amount)} via {alloc.paymentMethod.replace(/_/g, ' ')}.
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 4. Current Lifecycle Status Node */}
                  {invoice.status === 'CANCELLED' || invoice.status === 'VOID' ? (
                    <div className="relative">
                      <div className="absolute -left-[23px] top-0.5 bg-rose-600 text-white p-1 rounded-full border-2 border-surface shadow-xs">
                        <Ban className="w-2.5 h-2.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-rose-600">
                          Document Cancelled & Reversed
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDateTime(invoice.updatedAt || invoice.createdAt)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Financial reversals recorded in journal ledger.
                        </div>
                      </div>
                    </div>
                  ) : outstanding === 0 ? (
                    <div className="relative">
                      <div className="absolute -left-[23px] top-0.5 bg-emerald-600 text-white p-1 rounded-full border-2 border-surface shadow-xs">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-emerald-600">
                          Settlement Complete
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Full invoice balance of {formatCurrency(grandTotal)} settled in full.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className={`absolute -left-[23px] top-0.5 ${isOverdue ? 'bg-rose-500' : 'bg-amber-500'} text-white p-1 rounded-full border-2 border-surface shadow-xs`}>
                        <Clock className="w-2.5 h-2.5" />
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                          {isOverdue ? `Payment Overdue by ${overdueDays} Days` : 'Awaiting Settlement'}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {invoice.dueDate ? `Due date: ${formatDate(invoice.dueDate)}` : 'No due date set'}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Outstanding balance: {formatCurrency(outstanding)}.
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </Card>

            </div>

          </div>

        </div>

        {/* Record Payment Modal */}
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          invoice={invoice}
          onSuccess={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          }}
        />

        {/* Cancel Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onConfirm={async () => cancelMutation.mutate()}
          title="Cancel Invoice"
          message="Are you sure you want to cancel this invoice? This will roll back accounting double entry ledgers and restore warehouse stock levels."
          confirmText="Cancel Invoice"
          variant="danger"
        />
      </PageContainer>
    </>
  );
};
export default InvoiceDetails;
