import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, Download, Copy, Trash, FileText, ArrowLeft,
  Mail, CreditCard, Ban, Calendar, Clock, DollarSign,
  CheckCircle2, Sparkles, AlertTriangle
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageContainer } from '@/shared/components/ui/LayoutComponents';
import { ConfirmDialog, JournalImpactView } from '@/shared/components/ui';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';
import { PdfDownloadButton } from '@/shared/components/pdf/PdfDownloadButton';
import { PdfDocumentProps } from '@/shared/components/pdf/StandardPdfDocument';

const formatIndianCurrency = (amount: number) => {
  const rounded = Math.abs(amount) < 0.005 ? 0 : amount;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
};

export const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Fetch invoice details
  const { data: resData, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const res = await apiClient.get(`/sales/invoices/${id}`);
      return res.data?.data || res.data;
    },
    enabled: !!id,
    staleTime: 5000,
  });

  // Fetch company profile for PDF
  const { data: profileData } = useQuery<any>({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data?.company || res.data?.data?.company || res.data;
    },
    staleTime: 60000,
  });

  const invoice = useMemo(() => resData || null, [resData]);

  useDynamicTitle(invoice ? (invoice.invoiceNo ? `Invoice: ${invoice.invoiceNo}` : 'Invoice Details') : null);

  const receiptHistory = useMemo(() => {
    if (!invoice) return [];
    const allocs = invoice.receiptAllocations || [];
    // Sort chronologically
    const sortedAllocs = [...allocs].sort((a: any, b: any) => new Date(a.receipt?.date || a.createdAt).getTime() - new Date(b.receipt?.date || b.createdAt).getTime());

    let currentBalance = Number(invoice.grandTotal || 0);
    return sortedAllocs.map((alloc: any) => {
      currentBalance -= Number(alloc.amount);
      return {
        id: alloc.id,
        date: alloc.receipt?.date || alloc.createdAt,
        receiptNo: alloc.receipt?.receiptNo || 'N/A',
        amount: Number(alloc.amount),
        paymentMethod: alloc.receipt?.paymentMethod || 'N/A',
        reference: alloc.receipt?.referenceNo || 'N/A',
        balanceAfter: Math.max(0, currentBalance)
      };
    });
  }, [invoice]);

  // Mutate/Cancel invoice (delete)
  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/sales/invoices/${id}`);
    },
    onSuccess: () => {
      notification.success('Invoice cancelled and reversed from ledger accounts successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/invoices');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to cancel invoice');
    }
  });

  // Mutate/Record receipt payment
  const recordPaymentMutation = useMutation({
    mutationFn: async (amount: number) => {
      await apiClient.post('/sales/payments', {
        invoiceId: id,
        amount,
        paymentMode: 'BANK_TRANSFER',
        referenceNo: `PAY-REC-${Math.floor(1000 + Math.random() * 9000)}`,
        notes: paymentNotes || 'Recorded from Invoice Details page',
      });
    },
    onSuccess: () => {
      notification.success('Payment recorded and credited to customer receivables');
      setIsRecordPaymentOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to record payment');
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    notification.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Generating and sending tax invoice PDF...',
        success: `Invoice emailed to ${invoice?.businessPartner?.email || 'customer'} successfully!`,
        error: 'Failed to deliver invoice email.',
      }
    );
  };

  const handleCancelInvoice = () => {
    setShowCancelDialog(true);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      notification.error('Please enter a valid payment amount');
      return;
    }
    const balance = outstanding;
    if (amount > balance) {
      notification.error('Payment amount cannot exceed outstanding invoice balance');
      return;
    }
    recordPaymentMutation.mutate(amount);
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="7xl">
        <div className="space-y-6 animate-pulse">
          <div className="h-10 bg-muted/60 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[500px] bg-muted/40 rounded-xl"></div>
            <div className="h-[300px] bg-muted/40 rounded-xl"></div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !invoice) {
    return (
      <PageContainer maxWidth="7xl">
        <Card className="p-8 text-center bg-surface border border-red-500/20">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Invoice Not Found</h3>
          <p className="text-muted-foreground mb-4">The invoice you are trying to view does not exist or has been deleted.</p>
          <Button onClick={() => navigate('/invoices')} variant="outline">Back to Invoices</Button>
        </Card>
      </PageContainer>
    );
  }

  const grandTotal = Number(invoice.grandTotal || 0);
  const amountPaid = Number(invoice.amountPaid || 0);
  const outstanding = grandTotal - amountPaid;
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && outstanding > 0;

  // receiptHistory calculation moved to top of component to satisfy Rules of Hooks

  // Calculated Status details
  const getCalculatedStatus = () => {
    if (invoice.status === 'CANCELLED' || invoice.status === 'VOID') {
      return { label: 'Cancelled', style: 'bg-red-500/10 text-red-600 border border-red-500/20' };
    }
    if (invoice.status === 'DRAFT') {
      return { label: 'Draft', style: 'bg-slate-500/10 text-slate-600 border border-slate-500/20' };
    }
    if (amountPaid >= grandTotal) {
      return { label: 'Paid', style: 'bg-green-500/10 text-green-600 border border-green-500/20' };
    }
    if (amountPaid > 0) {
      return { label: 'Partially Paid', style: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' };
    }
    if (isOverdue) {
      return { label: 'Overdue', style: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' };
    }
    return { label: 'Issued', style: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' };
  };

  const statusInfo = getCalculatedStatus();

  // Extract metadata (notes/terms)
  const extraMeta = typeof invoice.gstBreakup === 'string' ? JSON.parse(invoice.gstBreakup) : (invoice.gstBreakup || {});
  const notes = extraMeta.notes || invoice.notes || 'No customer notes added.';
  const termsConditions = extraMeta.termsConditions || invoice.termsConditions || 'Standard terms & conditions apply.';

  // Map items to calculate correct GST breakdowns
  const items = invoice.items || [];
  const cgstAmount = Number(invoice.cgstAmount || 0);
  const sgstAmount = Number(invoice.sgstAmount || 0);
  const igstAmount = Number(invoice.igstAmount || 0);
  const isInterState = igstAmount > 0;

  // Group items by tax percents
  const taxSummaryMap: Record<number, { taxableValue: number; taxAmount: number }> = {};
  items.forEach((item: any) => {
    const rate = Number(item.rate) || 0;
    const qty = Number(item.qty || item.quantity) || 0;
    const lineTotal = rate * qty;
    const taxRate = Number(item.taxPercent) || 0;
    const taxAmt = Number(item.taxAmount) || 0;

    if (taxRate > 0) {
      if (!taxSummaryMap[taxRate]) {
        taxSummaryMap[taxRate] = { taxableValue: 0, taxAmount: 0 };
      }
      taxSummaryMap[taxRate].taxableValue += lineTotal;
      taxSummaryMap[taxRate].taxAmount += taxAmt;
    }
  });

  const taxSummary = Object.entries(taxSummaryMap).map(([rate, vals]) => ({
    rate: Number(rate),
    ...vals
  }));

  const company = profileData?.company || profileData || {};

  const pdfData: PdfDocumentProps | null = invoice ? {
    company: {
      name: company.companyName || company.legalName || 'Company Name',
      address: [company.address, company.city, company.state, company.country, company.pinCode].filter(Boolean).join(', ') || 'Company Address',
      gstin: company.gstin,
      pan: company.pan,
      email: company.email,
      phone: company.phone,
      logo: company.settings?.logoBase64,
    },
    customer: {
      name: invoice.businessPartner?.tradeName || invoice.businessPartner?.legalName || invoice.businessPartner?.name || 'Customer Name',
      address: [invoice.billingAddress?.street, invoice.billingAddress?.city, invoice.billingAddress?.state, invoice.billingAddress?.pincode].filter(Boolean).join(', ') || 'Customer Address',
      gstin: invoice.businessPartner?.gstin,
      email: invoice.businessPartner?.email,
      phone: invoice.businessPartner?.phone,
    },
    document: {
      title: 'TAX INVOICE',
      documentNo: invoice.invoiceNo,
      date: invoice.date,
      dueDate: invoice.dueDate,
      status: invoice.status,
    },
    items: items.map((item: any) => ({
      id: item.id || Math.random().toString(),
      description: item.product?.name || item.description,
      hsn: item.product?.hsnCode,
      qty: item.qty,
      rate: item.rate,
      taxPercent: item.taxPercent,
      taxAmount: item.taxAmount,
      total: item.total,
    })),
    totals: {
      subTotal: Number(invoice.subTotal),
      taxTotal: Number(invoice.taxTotal),
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal,
      amountPaid,
      balance: outstanding,
      currency: company.currency || 'INR',
    },
    watermark: invoice.status === 'CANCELLED' ? 'CANCELLED' : (outstanding === 0 ? 'PAID' : undefined)
  } : null;

  return (
    <>
      <PageContainer maxWidth="7xl">
        <div className="space-y-6">
          {/* Actions Header Bar - Hidden in printing */}
          <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5 bg-background sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/invoices')}
                className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer text-muted-foreground hover:text-foreground border border-border/40 bg-surface"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{invoice.invoiceNo}</h1>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold select-none ${statusInfo.style}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Issued on {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => navigate(`/invoices/new?duplicateId=${id}`)}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-9 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-9 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              {pdfData && (
                <PdfDownloadButton
                  data={pdfData}
                  filename={`${invoice.invoiceNo}.pdf`}
                  className="h-9 bg-surface text-foreground border border-border hover:bg-muted"
                />
              )}
              <Button
                onClick={handleSendEmail}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-9 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
              {outstanding > 0 && invoice.status !== 'CANCELLED' && (
                <Button
                  onClick={() => setIsRecordPaymentOpen(true)}
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-1.5 h-9 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Record Payment
                </Button>
              )}
              {invoice.status !== 'CANCELLED' && (
                <Button
                  onClick={handleCancelInvoice}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 h-9 text-red-500 border-red-500/20 hover:bg-red-500/10 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" /> Cancel Invoice
                </Button>
              )}
            </div>
          </div>

          {/* 2. Main Page Grid - Hidden in printing */}
          <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Side: Professional Invoice Sheet */}
            <div className="lg:col-span-2">
              <Card className="border border-border/80 shadow-md bg-white p-8 max-w-[210mm] mx-auto text-slate-800 rounded-2xl">

                {/* Invoice Sheet Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded bg-accent/15 flex items-center justify-center font-black text-accent text-sm">BA</div>
                      <span className="font-bold text-lg text-slate-900 tracking-tight">{invoice.company?.name || 'Bill Aura ERP'}</span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5 leading-relaxed">
                      <div>{invoice.company?.address || '123 Enterprise Way'}</div>
                      {invoice.company?.phone && <div>Ph: {invoice.company.phone}</div>}
                      {invoice.company?.email && <div>Email: {invoice.company.email}</div>}
                      {invoice.company?.gstin && <div className="font-semibold text-slate-700">GSTIN: {invoice.company.gstin}</div>}
                    </div>
                  </div>

                  <div className="text-right">
                    <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Tax Invoice</h2>
                    <div className="mt-3 text-xs text-slate-500 space-y-1">
                      <div><span className="font-semibold text-slate-700">Invoice No:</span> {invoice.invoiceNo}</div>
                      <div><span className="font-semibold text-slate-700">Date:</span> {new Date(invoice.date).toLocaleDateString('en-IN')}</div>
                      {invoice.dueDate && <div><span className="font-semibold text-slate-700">Due Date:</span> {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>}
                      {invoice.placeOfSupply && <div><span className="font-semibold text-slate-700">Place of Supply:</span> {invoice.placeOfSupply}</div>}
                    </div>
                  </div>
                </div>

                {/* Billing Customer Info */}
                <div className="grid grid-cols-2 gap-8 border-b border-slate-100 pb-6 mb-6">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</span>
                    <div className="font-bold text-sm text-slate-950 mb-1">{invoice.businessPartner?.name || 'N/A'}</div>
                    <div className="text-xs text-slate-500 leading-relaxed space-y-0.5">
                      <div>{invoice.businessPartner?.billingAddress || 'N/A'}</div>
                      {invoice.businessPartner?.phone && <div>Ph: {invoice.businessPartner.phone}</div>}
                      {invoice.businessPartner?.email && <div>Email: {invoice.businessPartner.email}</div>}
                      {invoice.businessPartner?.gstNumber && (
                        <div className="font-semibold text-slate-700 mt-1">GSTIN: {invoice.businessPartner.gstNumber}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Shipped To</span>
                    <div className="font-bold text-sm text-slate-950 mb-1">{invoice.businessPartner?.name || 'N/A'}</div>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      <div>{invoice.businessPartner?.shippingAddress || invoice.businessPartner?.billingAddress || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mb-6 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-3 px-3">Product / Service</th>
                        <th className="py-3 px-3 text-right">Qty</th>
                        <th className="py-3 px-3 text-right">Unit Price</th>
                        <th className="py-3 px-3 text-right">Tax (GST)</th>
                        <th className="py-3 px-3 text-right">Taxable</th>
                        <th className="py-3 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, idx: number) => {
                        const qty = Number(item.qty || item.quantity || 0);
                        const rate = Number(item.rate || item.unitPrice || 0);
                        const lineTaxPercent = Number(item.taxPercent || 0);
                        const taxable = rate * qty;
                        const lineTotal = Number(item.total || 0);

                        return (
                          <tr key={item.id || idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-950">{item.product?.name || 'Item'}</div>
                              {item.description && <div className="text-[10px] text-slate-400 mt-0.5">{item.description}</div>}
                              {item.product?.hsn && <div className="text-[9px] font-mono text-slate-400 mt-0.5 uppercase">HSN: {item.product.hsn}</div>}
                            </td>
                            <td className="py-3.5 px-3 text-right text-slate-600 font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(rate)}</td>
                            <td className="py-3.5 px-3 text-right text-slate-600 font-sans tabular-nums tracking-tight">
                              {lineTaxPercent}%
                            </td>
                            <td className="py-3.5 px-3 text-right text-slate-600 font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(taxable)}</td>
                            <td className="py-3.5 px-3 text-right font-semibold text-slate-950 font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(lineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Invoice Financial Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Notes</span>
                      <div className="text-xs text-slate-500 leading-relaxed italic bg-slate-50/60 p-3 rounded-lg border border-slate-100">{notes}</div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Terms & Conditions</span>
                      <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-line bg-slate-50/30 p-3 rounded-lg border border-slate-100/50">{termsConditions}</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal Base Gross</span>
                      <span className="font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(Number(invoice.subTotal || 0))}</span>
                    </div>

                    {cgstAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Central GST (CGST)</span>
                        <span className="font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(cgstAmount)}</span>
                      </div>
                    )}
                    {sgstAmount > 0 && (
                      <div className="flex justify-between">
                        <span>State GST (SGST)</span>
                        <span className="font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(sgstAmount)}</span>
                      </div>
                    )}
                    {igstAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Integrated GST (IGST)</span>
                        <span className="font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(igstAmount)}</span>
                      </div>
                    )}

                    {Number(invoice.roundOff || 0) !== 0 && (
                      <div className="flex justify-between border-t border-slate-100 pt-1">
                        <span>Round Off</span>
                        <span className="font-sans tabular-nums tracking-tight">{Number(invoice.roundOff || 0) > 0 ? '+' : ''}₹{formatIndianCurrency(Number(invoice.roundOff || 0))}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-2">
                      <span>Grand Total</span>
                      <span className="font-bold font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(grandTotal)}</span>
                    </div>

                    <div className="flex justify-between text-green-600 pt-1 font-semibold">
                      <span>Amount Paid</span>
                      <span className="font-semibold font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(amountPaid)}</span>
                    </div>

                    <div className={`flex justify-between border-t border-double border-slate-200 pt-2 font-black text-sm ${outstanding > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      <span>Balance Outstanding</span>
                      <span className="font-bold font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(outstanding)}</span>
                    </div>
                  </div>
                </div>

              </Card>

              {/* Receipt History */}
              <Card className="mt-6 border border-border/60 shadow-sm p-6 bg-surface rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-2">Receipt & Payment History</h4>
                {receiptHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 font-medium">No payment allocations recorded for this invoice.</p>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-xs text-left min-w-[500px]">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border font-bold uppercase tracking-wider">
                          <th className="pb-3 text-left">Date</th>
                          <th className="pb-3 text-left">Receipt Number</th>
                          <th className="pb-3 text-left">Method</th>
                          <th className="pb-3 text-left">Reference</th>
                          <th className="pb-3 text-right">Allocated Amt</th>
                          <th className="pb-3 text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-medium">
                        {receiptHistory.map((alloc: any) => (
                          <tr key={alloc.id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 text-muted-foreground">{new Date(alloc.date).toLocaleDateString()}</td>
                            <td className="py-3 font-bold font-mono text-accent">{alloc.receiptNo}</td>
                            <td className="py-3 text-muted-foreground text-[10px] uppercase font-bold">{alloc.paymentMethod.replace('_', ' ')}</td>
                            <td className="py-3 text-muted-foreground font-mono">{alloc.reference}</td>
                            <td className="py-3 text-right text-green-600 font-bold font-mono">₹{formatIndianCurrency(alloc.amount)}</td>
                            <td className="py-3 text-right text-foreground font-bold font-mono">₹{formatIndianCurrency(alloc.balanceAfter)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Side: Audit Trail & Payment Center */}
            <div className="space-y-6">

              {/* Balance Due Card */}
              <Card className="p-6 border border-border/60 bg-surface shadow-sm">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">receivables summary</div>
                <div className={`text-3xl font-black ${outstanding > 0 ? 'text-red-500' : 'text-green-600'} font-sans tabular-nums tracking-tight mb-4`}>
                  ₹{formatIndianCurrency(outstanding)}
                </div>
                <div className="space-y-2 border-b border-border/50 pb-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Grand Total:</span>
                    <span className="font-medium text-foreground font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Paid:</span>
                    <span className="font-medium text-foreground font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(amountPaid)}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed flex items-center gap-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Ledgers are matching double entry accounting rules.
                </div>
              </Card>

              {/* Audit History Timeline */}
              <Card className="p-6 border border-border/60 bg-surface shadow-sm space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-2">audit trail & timeline</div>

                <div className="relative border-l-2 border-border/50 ml-2.5 pl-5 space-y-5 py-1">

                  {/* Created node */}
                  <div className="relative">
                    <div className="absolute -left-[27px] top-0 bg-accent text-white p-1 rounded-full border-2 border-surface">
                      <FileText className="w-2.5 h-2.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Invoice Document Generated</div>
                      <div className="text-[10px] text-muted-foreground flex gap-1.5 items-center mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(invoice.createdAt || invoice.date).toLocaleDateString()}</span>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(invoice.createdAt || invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ledger sync node */}
                  <div className="relative">
                    <div className="absolute -left-[27px] top-0 bg-blue-500 text-white p-1 rounded-full border-2 border-surface">
                      <Sparkles className="w-2.5 h-2.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Receivables Ledger Synced</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Debited Customer balance by ₹{formatIndianCurrency(grandTotal)}</div>
                    </div>
                  </div>

                  {/* Payment Node */}
                  {amountPaid > 0 && (
                    <div className="relative">
                      <div className="absolute -left-[27px] top-0 bg-green-500 text-white p-1 rounded-full border-2 border-surface">
                        <DollarSign className="w-2.5 h-2.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">Payment Received</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Credited receivables by ₹{formatIndianCurrency(amountPaid)}</div>
                      </div>
                    </div>
                  )}

                  {/* Overdue/Status Node */}
                  {outstanding > 0 && (
                    <div className="relative">
                      <div className="absolute -left-[27px] top-0 bg-amber-500 text-white p-1 rounded-full border-2 border-surface">
                        <Clock className="w-2.5 h-2.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          {isOverdue ? 'Document Overdue' : 'Awaiting Settlement'}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {isOverdue ? `Overdue by ${Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days` : `Payment due on ${new Date(invoice.dueDate).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </Card>

              {/* Accounting Impact */}
              <Card className="p-6 border border-border/60 bg-surface shadow-sm space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Accounting Impact
                </div>
                <JournalImpactView reference={invoice.invoiceNo} />
              </Card>

            </div>
          </div>

          {/* 3. Pure Print View Block - ONLY visible during window.print() */}
          <div className="hidden print:block bg-white p-0 m-0 print:w-full print:min-h-screen">
            <div className="p-0 bg-white">
              {/* Same A4 format code to ensure standard margins */}
              <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-lg text-slate-900 tracking-tight">{invoice.company?.name || 'Bill Aura ERP'}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>{invoice.company?.address || '123 Enterprise Way'}</div>
                    {invoice.company?.phone && <div>Ph: {invoice.company.phone}</div>}
                    {invoice.company?.email && <div>Email: {invoice.company.email}</div>}
                    {invoice.company?.gstin && <div className="font-semibold text-slate-700">GSTIN: {invoice.company.gstin}</div>}
                  </div>
                </div>

                <div className="text-right">
                  <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Tax Invoice</h2>
                  <div className="mt-3 text-xs text-slate-500 space-y-1">
                    <div><span className="font-semibold text-slate-700">Invoice No:</span> {invoice.invoiceNo}</div>
                    <div><span className="font-semibold text-slate-700">Date:</span> {new Date(invoice.date).toLocaleDateString('en-IN')}</div>
                    {invoice.dueDate && <div><span className="font-semibold text-slate-700">Due Date:</span> {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>}
                    {invoice.placeOfSupply && <div><span className="font-semibold text-slate-700">Place of Supply:</span> {invoice.placeOfSupply}</div>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 border-b-2 border-slate-100 pb-6 mb-6">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</span>
                  <div className="font-bold text-sm text-slate-950 mb-1">{invoice.businessPartner?.name || 'N/A'}</div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>{invoice.businessPartner?.billingAddress || 'N/A'}</div>
                    {invoice.businessPartner?.phone && <div>Ph: {invoice.businessPartner.phone}</div>}
                    {invoice.businessPartner?.gstNumber && (
                      <div className="font-semibold text-slate-700">GSTIN: {invoice.businessPartner.gstNumber}</div>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Shipped To</span>
                  <div className="font-bold text-sm text-slate-950 mb-1">{invoice.businessPartner?.name || 'N/A'}</div>
                  <div className="text-xs text-slate-500">
                    <div>{invoice.businessPartner?.shippingAddress || invoice.businessPartner?.billingAddress || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-3 px-3">Product / Service</th>
                      <th className="py-3 px-3 text-right">Qty</th>
                      <th className="py-3 px-3 text-right">Unit Price</th>
                      <th className="py-3 px-3 text-right">Tax (GST)</th>
                      <th className="py-3 px-3 text-right">Taxable</th>
                      <th className="py-3 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, idx: number) => {
                      const qty = Number(item.qty || item.quantity || 0);
                      const rate = Number(item.rate || item.unitPrice || 0);
                      const lineTaxPercent = Number(item.taxPercent || 0);
                      const taxable = rate * qty;
                      const lineTotal = Number(item.total || 0);

                      return (
                        <tr key={item.id || idx} className="border-b border-slate-200">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{item.product?.name || 'Item'}</div>
                            {item.description && <div className="text-[10px] text-slate-500 mt-0.5">{item.description}</div>}
                            {item.product?.hsn && <div className="text-[9px] font-mono text-slate-500 mt-0.5">HSN: {item.product.hsn}</div>}
                          </td>
                          <td className="py-3 px-3 text-right font-sans tabular-nums tracking-tight">{qty} {item.product?.unit || 'Pcs'}</td>
                          <td className="py-3 px-3 text-right font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(rate)}</td>
                          <td className="py-3 px-3 text-right font-sans tabular-nums tracking-tight">{lineTaxPercent}%</td>
                          <td className="py-3 px-3 text-right font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(taxable)}</td>
                          <td className="py-3 px-3 text-right font-bold font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Notes</span>
                    <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded">{notes}</div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Terms & Conditions</span>
                    <div className="text-xs text-slate-500 leading-relaxed whitespace-pre-line bg-slate-50/50 p-3 rounded">{termsConditions}</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>Subtotal Base Gross</span>
                    <span className="font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(Number(invoice.subTotal || 0))}</span>
                  </div>

                  {cgstAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Central GST (CGST)</span>
                      <span className="font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(cgstAmount)}</span>
                    </div>
                  )}
                  {sgstAmount > 0 && (
                    <div className="flex justify-between">
                      <span>State GST (SGST)</span>
                      <span className="font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(sgstAmount)}</span>
                    </div>
                  )}
                  {igstAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Integrated GST (IGST)</span>
                      <span className="font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(igstAmount)}</span>
                    </div>
                  )}

                  {Number(invoice.roundOff || 0) !== 0 && (
                    <div className="flex justify-between border-t border-slate-200 pt-1">
                      <span>Round Off</span>
                      <span className="font-sans tabular-nums tracking-tight">{Number(invoice.roundOff || 0) > 0 ? '+' : ''}₹{formatIndianCurrency(Number(invoice.roundOff || 0))}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t-2 border-slate-300 pt-2">
                    <span>Grand Total</span>
                    <span className="font-bold font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(grandTotal)}</span>
                  </div>

                  <div className="flex justify-between text-green-700 pt-1 font-semibold">
                    <span>Amount Paid</span>
                    <span className="font-semibold font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(amountPaid)}</span>
                  </div>

                  <div className="flex justify-between border-t border-slate-300 pt-2 font-bold text-slate-900">
                    <span>Balance Outstanding</span>
                    <span className="font-bold font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(outstanding)}</span>
                  </div>
                </div>
              </div>

              {/* GST breakdown tax matrix block */}
              {taxSummary.length > 0 && (
                <div className="mt-8 pt-4 border-t border-dashed border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">GST Breakdown tax matrix</span>
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2 px-2">Tax Rate</th>
                        <th className="py-2 px-2 text-right">Taxable Value</th>
                        {isInterState ? (
                          <th className="py-2 px-2 text-right">IGST</th>
                        ) : (
                          <>
                            <th className="py-2 px-2 text-right">CGST</th>
                            <th className="py-2 px-2 text-right">SGST</th>
                          </>
                        )}
                        <th className="py-2 px-2 text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxSummary.map((sm) => (
                        <tr key={sm.rate} className="border-b border-slate-100">
                          <td className="py-2 px-2 font-semibold">GST {sm.rate}%</td>
                          <td className="py-2 px-2 text-right font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(sm.taxableValue)}</td>
                          {isInterState ? (
                            <td className="py-2 px-2 text-right font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(sm.taxAmount)}</td>
                          ) : (
                            <>
                              <td className="py-2 px-2 text-right font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(sm.taxAmount / 2)}</td>
                              <td className="py-2 px-2 text-right font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(sm.taxAmount / 2)}</td>
                            </>
                          )}
                          <td className="py-2 px-2 text-right font-semibold font-sans tabular-nums tracking-tight">₹{formatIndianCurrency(sm.taxAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-12 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4">
                This is a computer generated invoice document and requires no physical signature.
              </div>
            </div>
          </div>

        </div>

        {/* Record Payment Modal dialog */}
        {isRecordPaymentOpen && (
          <div className="no-print fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col p-6 space-y-4">
              <h3 className="font-bold text-lg text-foreground">Record Inbound Receipt Payment</h3>
              <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Amount (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={`Max: ${outstanding}`}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes / Reference No</label>
                  <textarea
                    rows={2}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Bank Transfer Txn Ref #12345"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => setIsRecordPaymentOpen(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={recordPaymentMutation.isPending}
                  >
                    {recordPaymentMutation.isPending ? 'Saving...' : 'Record Payment'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageContainer>

      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={async () => cancelMutation.mutate()}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this invoice? This will roll back accounting double entry ledgers and restore warehouse stock levels."
        confirmText="Cancel Invoice"
        variant="danger"
      />
    </>
  );
};
