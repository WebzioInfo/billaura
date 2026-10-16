import React, { useState } from 'react';
import { X, Plus, Minus, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Package, Warehouse as WarehouseIcon } from 'lucide-react';
import { apiClient as api } from '@/core/api/apiClient';
import notification from '@/core/services/NotificationService';
import { useQueryClient } from '@tanstack/react-query';

export interface StockRowData {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  averageCost?: number;
  stockValue?: number;
  unit?: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
    barcode?: string;
    unit?: string;
    category?: { name: string };
  };
  warehouse?: {
    id: string;
    name: string;
    location?: string;
    isDefault?: boolean;
  };
}

interface UpdateStockModalProps {
  stockRow: StockRowData;
  onClose: () => void;
  onSuccess: () => void;
}

type AdjustmentType = 'ADD' | 'REMOVE' | 'SET_ACTUAL';

const REASON_PRESETS = [
  'Routine Stock Replenishment',
  'Physical Inventory Audit Variance',
  'Damaged / Expired Goods Write-off',
  'Internal Consumption',
  'Supplier Return Adjustment',
  'Customer Return Restock',
  'Initial Opening Stock Correction',
  'Other / Custom Reason',
];

export const UpdateStockModal: React.FC<UpdateStockModalProps> = ({
  stockRow,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('ADD');
  const [inputQuantity, setInputQuantity] = useState<string>('');
  const [selectedReasonPreset, setSelectedReasonPreset] = useState<string>(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentStock = Number(stockRow.quantity || 0);
  const unit = stockRow.unit || stockRow.product?.unit || 'PCS';
  const productName = stockRow.product?.name || 'Unnamed Product';
  const warehouseName = stockRow.warehouse?.name || 'General';

  const numInput = parseFloat(inputQuantity) || 0;

  // Real-time calculation of adjustment and resulting stock
  let qtyChange = 0;
  let resultingStock = currentStock;

  if (adjustmentType === 'ADD') {
    qtyChange = Math.abs(numInput);
    resultingStock = currentStock + qtyChange;
  } else if (adjustmentType === 'REMOVE') {
    qtyChange = -Math.abs(numInput);
    resultingStock = currentStock - Math.abs(numInput);
  } else if (adjustmentType === 'SET_ACTUAL') {
    qtyChange = numInput - currentStock;
    resultingStock = numInput;
  }

  const isRemovalNegative = adjustmentType === 'REMOVE' && resultingStock < 0;
  const isActualNegative = adjustmentType === 'SET_ACTUAL' && numInput < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form validations
    if (inputQuantity.trim() === '' || isNaN(numInput)) {
      const err = 'Please enter a valid quantity.';
      setErrorMessage(err);
      notification.error(err);
      return;
    }

    if ((adjustmentType === 'ADD' || adjustmentType === 'REMOVE') && numInput <= 0) {
      const err = 'Adjustment quantity must be greater than zero.';
      setErrorMessage(err);
      notification.error(err);
      return;
    }

    if (adjustmentType === 'SET_ACTUAL' && numInput < 0) {
      const err = 'Physical count cannot be negative.';
      setErrorMessage(err);
      notification.error(err);
      return;
    }

    if (adjustmentType === 'REMOVE' && resultingStock < 0) {
      const err = `Cannot remove ${Math.abs(numInput)} units. Resulting stock would be negative (${resultingStock} ${unit}).`;
      setErrorMessage(err);
      notification.error(err);
      return;
    }

    const finalReason = selectedReasonPreset === 'Other / Custom Reason'
      ? customReason.trim()
      : selectedReasonPreset;

    if (!finalReason) {
      const err = 'Please provide an adjustment reason.';
      setErrorMessage(err);
      notification.error(err);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/adjust', {
        productId: stockRow.productId,
        warehouseId: stockRow.warehouseId,
        adjustmentType,
        adjustmentQuantity: Math.abs(numInput),
        targetQuantity: adjustmentType === 'SET_ACTUAL' ? numInput : undefined,
        quantityChange: qtyChange,
        reason: finalReason,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      notification.success(
        `Stock updated for ${productName}: ${currentStock} → ${resultingStock} ${unit}`
      );

      // Invalidate relevant caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stocks'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['product-intelligence', stockRow.productId] }),
      ]);

      onSuccess();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Stock adjustment failed';
      setErrorMessage(errorMsg);
      notification.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={() => !isSubmitting && onClose()} 
      />

      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-xl z-10 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Update Stock Balance</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span>{warehouseName}</span>
                <span>•</span>
                <span className="font-mono">{stockRow.product?.sku || 'SKU N/A'}</span>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Target Product & Warehouse Card */}
          <div className="bg-muted/30 border border-border/80 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Target Item</span>
              <p className="font-bold text-sm sm:text-base text-foreground truncate" title={productName}>
                {productName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <WarehouseIcon className="w-3.5 h-3.5 text-accent" />
                  {warehouseName}
                </span>
                {stockRow.product?.category?.name && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium">
                    {stockRow.product.category.name}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Current Stock</span>
              <div className="flex items-baseline justify-end gap-1 font-mono">
                <span className={`text-xl sm:text-2xl font-black ${
                  currentStock < 0 ? 'text-red-500' : currentStock === 0 ? 'text-muted-foreground' : 'text-emerald-500'
                }`}>
                  {currentStock}
                </span>
                <span className="text-xs text-muted-foreground font-semibold">{unit}</span>
              </div>
            </div>
          </div>

          {/* Adjustment Type Tabs */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Adjustment Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'ADD' as const, label: 'Add Stock', icon: Plus, desc: 'Receive / Restock' },
                { type: 'REMOVE' as const, label: 'Remove Stock', icon: Minus, desc: 'Damage / Shrinkage' },
                { type: 'SET_ACTUAL' as const, label: 'Set Actual Stock', icon: CheckCircle2, desc: 'Physical Audit Count' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = adjustmentType === tab.type;
                return (
                  <button
                    key={tab.type}
                    type="button"
                    onClick={() => {
                      setAdjustmentType(tab.type);
                      setErrorMessage(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-accent bg-accent/10 ring-1 ring-accent text-accent shadow-xs'
                        : 'border-border bg-background hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {tab.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Input Field */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {adjustmentType === 'ADD' && 'Quantity to Add *'}
              {adjustmentType === 'REMOVE' && 'Quantity to Remove *'}
              {adjustmentType === 'SET_ACTUAL' && 'Verified Physical Stock Count *'}
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min={adjustmentType === 'SET_ACTUAL' ? 0 : 0.001}
                value={inputQuantity}
                onChange={(e) => {
                  setInputQuantity(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder={adjustmentType === 'SET_ACTUAL' ? 'e.g. 92' : 'e.g. 20'}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                required
                autoFocus
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground uppercase">
                {unit}
              </span>
            </div>

            {/* Live Calculation Preview Banner */}
            {inputQuantity.trim() !== '' && !isNaN(numInput) && (
              <div className={`mt-2.5 p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                isRemovalNegative || isActualNegative
                  ? 'bg-red-500/10 border-red-500/20 text-red-500'
                  : 'bg-accent/5 border-accent/15 text-foreground'
              }`}>
                <div className="flex items-center gap-2">
                  <span>Current: <strong>{currentStock}</strong></span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>
                    Adjustment: <strong className={qtyChange >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                      {qtyChange >= 0 ? `+${qtyChange}` : qtyChange}
                    </strong>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>New Balance: <strong className="text-accent underline">{resultingStock}</strong></span>
                </div>

                {adjustmentType === 'SET_ACTUAL' && (
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Diff: {qtyChange >= 0 ? `+${qtyChange}` : qtyChange}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Warning Message Banner if error or negative */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-500">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reason for Adjustment *
            </label>
            <select
              value={selectedReasonPreset}
              onChange={(e) => setSelectedReasonPreset(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              {REASON_PRESETS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

            {selectedReasonPreset === 'Other / Custom Reason' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter specific adjustment reason..."
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                required
              />
            )}
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Reference Document (Optional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Audit-2026-Q4, PO-889"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Internal Remarks (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Verified by audit inspector"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-border text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isRemovalNegative || isActualNegative}
              className="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 transition-all shadow-md shadow-accent/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Committing Adjustment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Stock Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
