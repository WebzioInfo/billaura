import React, { useState } from 'react';
import { X, History, TrendingUp, TrendingDown, RefreshCw, Calendar, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '@/core/api/apiClient';

interface StockTransactionsModalProps {
  productId: string;
  productName: string;
  sku?: string;
  warehouseName?: string;
  onClose: () => void;
}

export const StockTransactionsModal: React.FC<StockTransactionsModalProps> = ({
  productId,
  productName,
  sku,
  warehouseName,
  onClose,
}) => {
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['stock-transactions', productId, page],
    queryFn: async () => {
      const res: any = await api.get('/inventory/transactions', {
        params: { productId, page, limit },
      });
      return res.data || res;
    },
    enabled: Boolean(productId),
  });

  const transactions = response?.data || [];
  const meta = response?.meta || { page: 1, limit, total: 0, totalPages: 1 };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">
            Purchase Stock In
          </span>
        );
      case 'SALE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
            Sales Stock Out
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 uppercase tracking-wider">
            Stock Adjustment
          </span>
        );
      case 'RETURN':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
            Sales Return
          </span>
        );
      case 'OPENING_STOCK':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 uppercase tracking-wider">
            Opening Balance
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border uppercase tracking-wider">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-4xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Inventory Transaction Ledger</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{productName}</span>
                {sku && <span>• SKU: {sku}</span>}
                {warehouseName && <span>• Warehouse: {warehouseName}</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">Loading transaction ledger history...</p>
            </div>
          ) : isError ? (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Failed to load transaction history</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-1.5 bg-accent text-accent-foreground text-xs font-semibold rounded-xl hover:bg-accent/90 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-border/80 rounded-2xl">
              <History className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">No Stock Movements Recorded</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No purchase receipts, sales invoices, or stock adjustments have been posted for this product yet.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Movement Type</th>
                      <th className="py-3 px-4 text-right">Quantity Changed</th>
                      <th className="py-3 px-4 text-right">Resulting Balance</th>
                      <th className="py-3 px-4">Reference / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {transactions.map((tx: any) => {
                      const qtyChange = Number(tx.quantityChange || 0);
                      const isPositive = qtyChange > 0;
                      const isNegative = qtyChange < 0;

                      return (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono">
                            {formatDate(tx.date || tx.createdAt)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getMovementTypeBadge(tx.type)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold">
                            <span className={`inline-flex items-center gap-1 ${
                              isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
                            }`}>
                              {isPositive && <TrendingUp className="w-3.5 h-3.5" />}
                              {isNegative && <TrendingDown className="w-3.5 h-3.5" />}
                              {isPositive ? `+${qtyChange}` : qtyChange}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-muted-foreground text-[11px]">
                                {Number(tx.quantityBefore || 0)} →
                              </span>
                              <span className="font-bold text-foreground">
                                {Number(tx.quantityAfter || 0)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="truncate text-foreground font-medium" title={tx.notes || tx.referenceType || '—'}>
                              {tx.notes || (tx.referenceType ? `${tx.referenceType} #${tx.referenceId?.slice(-6) || ''}` : '—')}
                            </div>
                            {tx.referenceType && (
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                Ref: {tx.referenceType}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer with pagination */}
        <div className="px-6 py-3.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
          <span>
            Total Entries: <strong className="text-foreground">{meta.total}</strong>
          </span>

          {meta.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-medium"
              >
                Previous
              </button>
              <span className="font-mono text-foreground font-semibold">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-medium"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
