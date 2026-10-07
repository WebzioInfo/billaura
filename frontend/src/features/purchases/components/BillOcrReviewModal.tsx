import React, { useState } from 'react';
import { 
  X, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, 
  ExternalLink, ZoomIn, ZoomOut, RotateCw, FileText, 
  PlusCircle, MinusCircle, ShieldCheck, Tag
} from 'lucide-react';
import { Button } from '@/shared/components/ui';

export interface OcrReviewItem {
  id: string;
  name: string;
  extractedDescription: string;
  classification?: string;
  matchedProductId?: string;
  matchedProductName?: string;
  matchStatus: 'EXISTING' | 'NEW' | 'SKIPPED' | 'NEEDS_REVIEW';
  hsnSac?: string;
  qty: number;
  unit: string;
  rate: number;
  discount: number;
  gstRate: number;
  taxAmount: number;
  lineTotal: number;
  createAsNewProduct: boolean;
  newProductData?: {
    name: string;
    description?: string;
    itemType: 'FINISHED_GOOD' | 'RAW_MATERIAL' | 'SERVICE';
    hsnCode?: string;
    gstRate: number;
    unit: string;
    isInventoryItem: boolean;
  };
}

interface BillOcrReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  documentMime: string;
  vendorName: string;
  vendorGstin?: string;
  matchedVendorName?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  items: OcrReviewItem[];
  onApplyVerification: (verifiedItems: OcrReviewItem[]) => void;
}

export const BillOcrReviewModal: React.FC<BillOcrReviewModalProps> = ({
  isOpen,
  onClose,
  documentUrl,
  documentName,
  documentMime,
  vendorName,
  vendorGstin,
  matchedVendorName,
  invoiceNumber,
  invoiceDate,
  dueDate,
  subtotal,
  taxTotal,
  grandTotal,
  items: initialItems,
  onApplyVerification,
}) => {
  const [items, setItems] = useState<OcrReviewItem[]>(initialItems);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Sync state if initialItems change when modal opens
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems, isOpen]);

  if (!isOpen) return null;

  const isPdf = documentMime?.includes('pdf') || documentUrl?.toLowerCase().endsWith('.pdf');

  // Toggle Create New Product vs. Skip
  const toggleCreateNewProduct = (index: number) => {
    setItems(prev => {
      const next = [...prev];
      const it = { ...next[index] };
      const newToggle = !it.createAsNewProduct;
      it.createAsNewProduct = newToggle;
      it.matchStatus = newToggle ? 'NEW' : 'SKIPPED';
      if (newToggle && !it.newProductData) {
        it.newProductData = {
          name: it.name || it.extractedDescription,
          description: it.extractedDescription,
          itemType: it.classification === 'SERVICE' ? 'SERVICE' : 'FINISHED_GOOD',
          hsnCode: it.hsnSac && it.hsnSac !== 'N/A' ? it.hsnSac : '',
          gstRate: it.gstRate || 18,
          unit: it.unit || 'NOS',
          isInventoryItem: it.classification !== 'SERVICE',
        };
      }
      next[index] = it;
      return next;
    });
  };

  // Update item field directly in review
  const handleItemFieldChange = (index: number, field: keyof OcrReviewItem, value: any) => {
    setItems(prev => {
      const next = [...prev];
      const it = { ...next[index], [field]: value };
      if (field === 'rate' || field === 'qty' || field === 'gstRate') {
        const lineNet = Number(it.rate || 0) * Number(it.qty || 1);
        const tax = (lineNet * Number(it.gstRate || 0)) / 100;
        it.taxAmount = Math.round(tax * 100) / 100;
        it.lineTotal = Math.round((lineNet + tax) * 100) / 100;
      }
      next[index] = it;
      return next;
    });
  };

  // Calculate sum of reviewed items
  const calculatedItemsTotal = items.reduce((sum, i) => sum + (Number(i.lineTotal) || 0), 0);
  const hasTotalDiscrepancy = grandTotal > 0 && Math.abs(calculatedItemsTotal - grandTotal) > 2;

  const handleConfirmAndApply = () => {
    onApplyVerification(items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Review & Verify Extracted Bill</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  AI OCR Verification
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Compare original uploaded bill against extracted accounting items before auto-filling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmAndApply}
              className="text-xs font-bold px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Verify & Apply to Form
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted ml-2"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Side-by-Side Review Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left Column: Original Bill Document Viewer */}
          <div className="lg:col-span-5 bg-zinc-950 flex flex-col border-b lg:border-b-0 lg:border-r border-border/80">
            {/* Viewer toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 text-white/90 text-xs">
              <span className="truncate max-w-[200px] font-mono text-[11px]">
                {documentName}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] text-zinc-400 font-mono w-10 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-300"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-300"
                  title="Rotate 90deg"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-300 ml-1"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Document display area */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[260px]">
              {isPdf ? (
                <iframe
                  src={documentUrl}
                  title="Vendor Bill Document"
                  className="w-full h-full min-h-[400px] rounded-lg border border-zinc-800"
                />
              ) : (
                <img
                  src={documentUrl}
                  alt="Original Vendor Bill"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-w-full max-h-full object-contain rounded shadow-lg origin-center"
                />
              )}
            </div>
          </div>

          {/* Right Column: Structured Extracted Information & Line Items */}
          <div className="lg:col-span-7 flex flex-col bg-background min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Header Extracted Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 border border-border/80 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Vendor
                </span>
                <div className="text-sm font-bold text-foreground truncate">
                  {matchedVendorName || vendorName || 'Unmatched Vendor'}
                </div>
                {vendorGstin && (
                  <div className="text-[11px] font-mono text-muted-foreground">
                    GSTIN: {vendorGstin}
                  </div>
                )}
                {matchedVendorName ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Catalog Match
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    New Vendor
                  </span>
                )}
              </div>

              <div className="p-3 bg-muted/30 border border-border/80 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Invoice Details
                </span>
                <div className="text-sm font-bold text-foreground">
                  {invoiceNumber || 'No Ref Number'}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Date: {invoiceDate || 'N/A'}
                </div>
                {dueDate && (
                  <div className="text-[10px] text-muted-foreground">
                    Due: {dueDate}
                  </div>
                )}
              </div>

              <div className="p-3 bg-muted/30 border border-border/80 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Extracted Grand Total
                </span>
                <div className="text-base font-extrabold text-foreground font-mono">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandTotal || calculatedItemsTotal)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Subtotal: ₹{subtotal} | Tax: ₹{taxTotal}
                </div>
              </div>
            </div>

            {/* Total Reconciliation Banner */}
            {hasTotalDiscrepancy ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Total Discrepancy Detected</div>
                  <div>
                    OCR bill header indicates {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandTotal)}, but sum of line items produces {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(calculatedItemsTotal)}. Review item rates and quantities below.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  OCR totals match calculated line items reconciliation.
                </span>
              </div>
            )}

            {/* Line Items Review Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Extracted Line Items</h4>
                  <p className="text-xs text-muted-foreground">
                    Every invoice row is classified. Choose whether unmatched items should be created in your catalog or kept as bill charges.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {items.length} item{items.length === 1 ? '' : 's'} detected
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 border border-border/80 rounded-xl bg-surface hover:border-primary/40 transition-colors space-y-3 shadow-sm"
                  >
                    {/* Item Top Bar */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground font-mono">
                            #{idx + 1}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {item.name}
                          </span>
                          {/* Classification Tag */}
                          {item.classification && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                              {item.classification}
                            </span>
                          )}
                        </div>
                        {/* Exact invoice description */}
                        {item.extractedDescription && item.extractedDescription !== item.name && (
                          <div className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded inline-block">
                            Invoice Raw Text: &ldquo;{item.extractedDescription}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {item.matchStatus === 'EXISTING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ✓ Matched: {item.matchedProductName || 'Catalog Item'}
                          </span>
                        ) : item.createAsNewProduct ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
                            <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                            Will Create New Product
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-border">
                            <MinusCircle className="w-3.5 h-3.5 text-zinc-500" />
                            ⊘ Product Creation Skipped
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Non-existing item decision banner */}
                    {item.matchStatus !== 'EXISTING' && (
                      <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            This item was not found in your Bill Aura product catalog.
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCreateNewProduct(idx)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              item.createAsNewProduct
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {item.createAsNewProduct ? 'Create as New Product: ON' : 'Create as New Product: OFF'}
                          </button>
                        </div>

                        {item.createAsNewProduct ? (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                            When saving this bill, a new {item.classification === 'SERVICE' ? 'Service' : 'Product'} will be added to your inventory catalog with HSN {item.hsnSac || 'N/A'}.
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground">
                            Item will be preserved on this vendor bill as a direct expense/charge without incrementing inventory stock levels.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Numeric Edit Controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => handleItemFieldChange(idx, 'qty', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Rate (INR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={e => handleItemFieldChange(idx, 'rate', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          GST %
                        </label>
                        <select
                          value={item.gstRate}
                          onChange={e => handleItemFieldChange(idx, 'gstRate', Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          HSN/SAC
                        </label>
                        <input
                          type="text"
                          value={item.hsnSac || 'N/A'}
                          onChange={e => handleItemFieldChange(idx, 'hsnSac', e.target.value)}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1 text-right">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Line Total
                        </label>
                        <div className="text-xs font-bold font-mono text-foreground pt-1.5">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.lineTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
