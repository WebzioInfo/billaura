import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building,
  Printer,
  CheckCircle2,
  XCircle,
  Send,
  FileCheck,
  MapPin,
  Mail,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { PageContainer } from '@/shared/components/ui/LayoutComponents';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button, StatusBadge, CurrencyCell } from '@/shared/components/ui';
import { PageLoader } from '@/shared/components/ui/LoadingSystem';
import { DataTableError } from '@/shared/components/ui/data-table/DataTableError';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';
import { formatDate } from '@/shared/utils/formatters';

export const QuotationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const {
    data: quotation,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      const res = await apiClient.get(`/sales/quotations/${id}`);
      return res.data?.data || res.data || null;
    },
    enabled: !!id,
  });

  useDynamicTitle(quotation ? `Quotation: ${quotation.quotationNo}` : 'Quotation Details');

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiClient.patch(`/sales/quotations/${id}/status`, { status: newStatus });
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-summary'] });
      notification.success(`Quotation marked as ${newStatus}`);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to update quotation status');
    },
    onSettled: () => {
      setIsUpdatingStatus(false);
    },
  });

  const handleUpdateStatus = (status: string) => {
    setIsUpdatingStatus(true);
    statusMutation.mutate(status);
  };

  const handleConvertToInvoice = () => {
    if (!quotation) return;
    // Navigate to invoice creation with pre-populated customer
    navigate(`/invoices/new?customerId=${quotation.businessPartnerId}&quotationId=${quotation.id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/quotations')}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quotations
          </Button>
        </div>
        <PageLoader title="Loading Quotation..." description="Fetching quotation details and line items" />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/quotations')}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quotations
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-[360px]">
          <DataTableError
            message={(error as any)?.response?.data?.message || (error as Error)?.message || 'Failed to load quotation.'}
            onRetry={() => refetch()}
          />
        </div>
      </PageContainer>
    );
  }

  if (!quotation) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/quotations')}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quotations
          </Button>
        </div>
        <EmptyState
          title="Quotation Not Found"
          description="The requested quotation does not exist or you do not have permission to view it."
          actionLabel="Back to Quotations"
          onActionClick={() => navigate('/quotations')}
        />
      </PageContainer>
    );
  }

  const bp = quotation.businessPartner || {};
  const items = quotation.items || [];
  const status = quotation.status || 'DRAFT';

  return (
    <PageContainer>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/quotations')}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quotations
          </Button>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus('SENT')}
              disabled={isUpdatingStatus}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Mark as Sent
            </Button>
          )}

          {status !== 'ACCEPTED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus('ACCEPTED')}
              disabled={isUpdatingStatus}
              className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Accept Quotation
            </Button>
          )}

          {status !== 'REJECTED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus('REJECTED')}
              disabled={isUpdatingStatus}
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleConvertToInvoice}
            className="gap-1.5"
          >
            <FileCheck className="w-3.5 h-3.5" /> Convert to Invoice
          </Button>
        </div>
      </div>

      {/* Main Quotation Title & Meta */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {quotation.quotationNo}
              </h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Created on {formatDate(quotation.createdAt || quotation.date)}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Quotation Total
            </span>
            <div className="text-2xl font-bold text-foreground">
              <CurrencyCell value={quotation.grandTotal} isBold />
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Customer Card */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" /> Customer Details
            </div>
            <div className="bg-background/50 border border-border/60 rounded-lg p-3 space-y-1.5">
              <div className="font-semibold text-foreground text-sm">{bp.name || '—'}</div>
              {bp.email && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-muted-foreground" /> {bp.email}
                </div>
              )}
              {bp.phone && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-muted-foreground" /> {bp.phone}
                </div>
              )}
              {bp.gstin && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="font-mono font-medium text-[11px] bg-muted/60 px-1.5 py-0.5 rounded">
                    GSTIN: {bp.gstin}
                  </span>
                </div>
              )}
              {bp.address && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-muted-foreground" /> {bp.address}
                </div>
              )}
            </div>
          </div>

          {/* Quotation Details */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Document Overview
            </div>
            <div className="bg-background/50 border border-border/60 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Quotation Date:</span>
                <span className="font-medium text-foreground">{formatDate(quotation.date)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Place of Supply:</span>
                <span className="font-medium text-foreground">{quotation.placeOfSupply || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tax Mode:</span>
                <span className="font-medium text-foreground">{quotation.taxMode || 'CGST_SGST'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-foreground">{status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm mb-4">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" /> Line Items ({items.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#34303F] text-white dark:bg-[#1E1C26]">
              <tr>
                <th className="py-2.5 px-4 font-semibold w-12 text-center">#</th>
                <th className="py-2.5 px-4 font-semibold">Item & Description</th>
                <th className="py-2.5 px-4 font-semibold text-right w-24">Qty</th>
                <th className="py-2.5 px-4 font-semibold text-right w-28">Rate</th>
                <th className="py-2.5 px-4 font-semibold text-right w-24">Tax %</th>
                <th className="py-2.5 px-4 font-semibold text-right w-28">Tax Amount</th>
                <th className="py-2.5 px-4 font-semibold text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {items.map((item: any, idx: number) => (
                <tr key={item.id || idx} className="hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-4 text-center text-muted-foreground">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-foreground">
                      {item.product?.name || item.description || 'Product'}
                    </div>
                    {item.product?.sku && (
                      <div className="text-[10px] text-muted-foreground font-mono">
                        SKU: {item.product.sku}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-foreground">
                    {Number(item.qty).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-foreground">
                    <CurrencyCell value={item.rate} />
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    {Number(item.taxPercent || 0)}%
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    <CurrencyCell value={item.taxAmount} />
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-foreground">
                    <CurrencyCell value={item.total} isBold />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="p-4 bg-background/40 border-t border-border flex flex-col sm:flex-row justify-between gap-4">
          <div className="text-xs text-muted-foreground max-w-md space-y-1">
            {quotation.gstBreakup?.notes && (
              <div>
                <span className="font-semibold text-foreground">Notes: </span>
                {quotation.gstBreakup.notes}
              </div>
            )}
            {quotation.gstBreakup?.termsConditions && (
              <div className="whitespace-pre-line">
                <span className="font-semibold text-foreground">Terms: </span>
                {quotation.gstBreakup.termsConditions}
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-medium text-foreground">
                <CurrencyCell value={quotation.subTotal} />
              </span>
            </div>
            {Number(quotation.cgstAmount || 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>CGST:</span>
                <span><CurrencyCell value={quotation.cgstAmount} /></span>
              </div>
            )}
            {Number(quotation.sgstAmount || 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>SGST:</span>
                <span><CurrencyCell value={quotation.sgstAmount} /></span>
              </div>
            )}
            {Number(quotation.igstAmount || 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>IGST:</span>
                <span><CurrencyCell value={quotation.igstAmount} /></span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Total Tax:</span>
              <span className="font-medium text-foreground">
                <CurrencyCell value={quotation.taxTotal || quotation.totalTaxAmount} />
              </span>
            </div>
            <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-foreground">
              <span>Grand Total:</span>
              <span><CurrencyCell value={quotation.grandTotal} isBold /></span>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
