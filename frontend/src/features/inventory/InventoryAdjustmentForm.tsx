import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Package, 
  Layers, 
  Upload, 
  Paperclip,
  Check,
  ChevronDown
} from 'lucide-react';
import { apiClient as api } from '@/core/api/apiClient';
import notification from '@/core/services/NotificationService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AdjustmentItemRow {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  unit?: string;
  availableQuantity: number;
  newQuantityOnHand: number;
  quantityAdjusted: number;
  costPrice?: number;
  currentValue?: number;
  changedValue?: number;
  adjustedValue?: number;
}

interface InventoryAdjustmentFormProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'QUANTITY' | 'VALUE';
}

const REASON_OPTIONS = [
  'Stocktaking results',
  'Damaged goods',
  'Stock on fire',
  'Stolen goods',
  'Product returned',
  'Inventory write-off',
  'Routine Stock Replenishment',
  'Physical Inventory Audit Variance',
  'Internal Consumption',
  'Initial Opening Stock Correction',
  'Other / Custom Reason',
];

export const InventoryAdjustmentForm: React.FC<InventoryAdjustmentFormProps> = ({
  isOpen = true,
  onClose,
  onSuccess,
  initialMode = 'QUANTITY',
}) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'QUANTITY' | 'VALUE'>(initialMode);
  const [referenceNumber, setReferenceNumber] = useState<string>(() => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `ADJ-${randomSuffix}`;
  });
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [account, setAccount] = useState<string>('Cost of Goods Sold');
  const [reason, setReason] = useState<string>(REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [files, setFiles] = useState<Array<{ name: string; size?: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bulkModalOpen, setBulkModalOpen] = useState<boolean>(false);

  // Switching adjustment mode dynamically
  const handleModeChange = (newMode: 'QUANTITY' | 'VALUE') => {
    setMode(newMode);
    if (newMode === 'VALUE') {
      setRows((prev) =>
        prev.map((r) => {
          if (!r.productId) return r;
          const cost = Number(r.costPrice || 0);
          const curVal = Number(((r.availableQuantity || 0) * cost).toFixed(2));
          const changed = r.changedValue !== undefined && r.changedValue !== 0 ? r.changedValue : curVal;
          const adj = r.adjustedValue !== undefined ? r.adjustedValue : Number((changed - curVal).toFixed(2));
          return {
            ...r,
            currentValue: curVal,
            changedValue: changed,
            adjustedValue: adj,
          };
        })
      );
    }
  };

  const handleUpload = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).map((f) => ({
      name: f.name,
      size: f.size,
    }));
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res: any = await api.get('/warehouses');
      return res.data || res || [];
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res: any = await api.get('/products');
      const items = res.data || res || [];
      return Array.isArray(items) ? items : [];
    },
  });

  // Set default warehouse
  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      const def = warehouses.find((w: any) => w.isDefault) || warehouses[0];
      setSelectedWarehouseId(def.id);
    }
  }, [warehouses, selectedWarehouseId]);

  // Rows of items
  const [rows, setRows] = useState<AdjustmentItemRow[]>([
    {
      id: 'row-1',
      productId: '',
      productName: '',
      availableQuantity: 0,
      newQuantityOnHand: 0,
      quantityAdjusted: 0,
      currentValue: 0,
      changedValue: 0,
      adjustedValue: 0,
    },
  ]);

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random()}`,
        productId: '',
        productName: '',
        availableQuantity: 0,
        newQuantityOnHand: 0,
        quantityAdjusted: 0,
        currentValue: 0,
        changedValue: 0,
        adjustedValue: 0,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) {
      setRows([
        {
          id: `row-${Date.now()}`,
          productId: '',
          productName: '',
          availableQuantity: 0,
          newQuantityOnHand: 0,
          quantityAdjusted: 0,
          currentValue: 0,
          changedValue: 0,
          adjustedValue: 0,
        },
      ]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleProductSelect = (rowId: string, productId: string) => {
    const prod = products.find((p: any) => p.id === productId);
    if (!prod) return;

    // Calculate available quantity
    let avail = 0;
    if (prod.stocks && Array.isArray(prod.stocks)) {
      if (selectedWarehouseId) {
        const whStock = prod.stocks.find((s: any) => s.warehouseId === selectedWarehouseId);
        avail = whStock ? Number(whStock.quantity || 0) : 0;
      } else {
        avail = prod.stocks.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);
      }
    } else {
      avail = Number(prod.stock ?? prod.currentStock ?? 0);
    }

    const cost = Number(prod.purchasePrice || prod.costPrice || 0);
    const curVal = Number((avail * cost).toFixed(2));

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          unit: prod.unit || 'pcs',
          availableQuantity: avail,
          newQuantityOnHand: avail,
          quantityAdjusted: 0,
          costPrice: cost,
          currentValue: curVal,
          changedValue: curVal,
          adjustedValue: 0,
        };
      })
    );
  };

  // Quantity mode handlers
  const handleQuantityAdjustedChange = (rowId: string, val: string) => {
    const adj = parseFloat(val) || 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          quantityAdjusted: adj,
          newQuantityOnHand: r.availableQuantity + adj,
        };
      })
    );
  };

  const handleNewQuantityChange = (rowId: string, val: string) => {
    const newQty = parseFloat(val) || 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          newQuantityOnHand: newQty,
          quantityAdjusted: newQty - r.availableQuantity,
        };
      })
    );
  };

  // Value mode handlers
  const handleChangedValueChange = (rowId: string, val: string) => {
    const newVal = parseFloat(val) || 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const cur = r.currentValue || 0;
        return {
          ...r,
          changedValue: newVal,
          adjustedValue: Number((newVal - cur).toFixed(2)),
        };
      })
    );
  };

  const handleAdjustedValueChange = (rowId: string, val: string) => {
    const adj = parseFloat(val) || 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const cur = r.currentValue || 0;
        return {
          ...r,
          adjustedValue: adj,
          changedValue: Number((cur + adj).toFixed(2)),
        };
      })
    );
  };

  const handleBulkAdd = (selectedIds: string[]) => {
    const newItems: AdjustmentItemRow[] = [];
    for (const pid of selectedIds) {
      const prod = products.find((p: any) => p.id === pid);
      if (!prod) continue;
      let avail = 0;
      if (prod.stocks && Array.isArray(prod.stocks)) {
        if (selectedWarehouseId) {
          const whStock = prod.stocks.find((s: any) => s.warehouseId === selectedWarehouseId);
          avail = whStock ? Number(whStock.quantity || 0) : 0;
        } else {
          avail = prod.stocks.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);
        }
      } else {
        avail = Number(prod.stock ?? prod.currentStock ?? 0);
      }
      const cost = Number(prod.purchasePrice || prod.costPrice || 0);
      const curVal = Number((avail * cost).toFixed(2));

      newItems.push({
        id: `row-${Date.now()}-${pid}`,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        unit: prod.unit || 'pcs',
        availableQuantity: avail,
        newQuantityOnHand: avail,
        quantityAdjusted: 0,
        costPrice: cost,
        currentValue: curVal,
        changedValue: curVal,
        adjustedValue: 0,
      });
    }

    if (newItems.length > 0) {
      setRows((prev) => {
        const filtered = prev.filter((r) => r.productId);
        return [...filtered, ...newItems];
      });
    }
    setBulkModalOpen(false);
  };

  const handleSave = async (isDraft: boolean) => {
    // Validation based on active mode
    const activeRows = mode === 'QUANTITY' 
      ? rows.filter((r) => r.productId && r.quantityAdjusted !== 0)
      : rows.filter((r) => r.productId && (r.adjustedValue !== 0 || r.changedValue !== r.currentValue));

    if (!isDraft && activeRows.length === 0) {
      notification.error(
        mode === 'QUANTITY'
          ? 'Please select at least one item and enter a quantity adjustment.'
          : 'Please select at least one item and enter a value adjustment.'
      );
      return;
    }

    if (!selectedWarehouseId) {
      notification.error('Please select a warehouse.');
      return;
    }

    const finalReason = reason === 'Other / Custom Reason' ? customReason.trim() : reason;
    if (!finalReason) {
      notification.error('Please specify a reason for adjustment.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isDraft) {
        // Save draft locally
        const draftKey = `billaura_adj_draft_${Date.now()}`;
        const draftData = {
          id: draftKey,
          referenceNumber,
          date,
          account,
          reason: finalReason,
          description,
          warehouseId: selectedWarehouseId,
          mode,
          status: 'DRAFT',
          items: rows.filter((r) => r.productId),
          createdAt: new Date().toISOString(),
        };
        const drafts = JSON.parse(localStorage.getItem('billaura_adjustment_drafts') || '[]');
        drafts.unshift(draftData);
        localStorage.setItem('billaura_adjustment_drafts', JSON.stringify(drafts));

        notification.success(`Adjustment ${referenceNumber} saved as Draft.`);
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      // Convert to Adjusted (execute stock update backend mutations)
      for (const row of activeRows) {
        if (mode === 'QUANTITY') {
          const adjType = row.quantityAdjusted > 0 ? 'ADD' : 'REMOVE';
          await api.post('/inventory/adjust', {
            productId: row.productId,
            warehouseId: selectedWarehouseId,
            adjustmentType: adjType,
            adjustmentQuantity: Math.abs(row.quantityAdjusted),
            targetQuantity: row.newQuantityOnHand,
            quantityChange: row.quantityAdjusted,
            reason: finalReason,
            reference: referenceNumber,
            notes: description.trim() 
              ? `[Mode: QUANTITY] [Ref: ${referenceNumber}] [Qty Adj: ${row.quantityAdjusted > 0 ? '+' : ''}${row.quantityAdjusted} ${row.unit || 'pcs'}] ${description.trim()}` 
              : `[Mode: QUANTITY] [Ref: ${referenceNumber}] [Qty Adj: ${row.quantityAdjusted > 0 ? '+' : ''}${row.quantityAdjusted} ${row.unit || 'pcs'}]`,
          });
        } else {
          // Value adjustment
          await api.post('/inventory/adjust', {
            productId: row.productId,
            warehouseId: selectedWarehouseId,
            quantityChange: 0,
            reason: finalReason,
            reference: referenceNumber,
            notes: description.trim()
              ? `[Mode: VALUE] [Ref: ${referenceNumber}] [Val Adj: ${(row.adjustedValue || 0) > 0 ? '+' : ''}${row.adjustedValue}] [Current Val: ${row.currentValue}, Changed Val: ${row.changedValue}] ${description.trim()}`
              : `[Mode: VALUE] [Ref: ${referenceNumber}] [Val Adj: ${(row.adjustedValue || 0) > 0 ? '+' : ''}${row.adjustedValue}] [Current Val: ${row.currentValue}, Changed Val: ${row.changedValue}]`,
          });
        }
      }

      notification.success(`Inventory adjustment ${referenceNumber} processed successfully.`);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stocks'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      ]);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      notification.error(err?.response?.data?.message || err?.message || 'Failed to apply adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden text-xs text-[#2B2F36]">
      {/* Top Header Bar */}
      <div className="h-12 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-[#1E2540]">New Adjustment</h2>
          <span className="text-[11px] text-[#6B7280] font-mono bg-[#F8F9FB] px-2 py-0.5 rounded border border-[#E5E7EB]">
            {referenceNumber}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#6B7280] hover:text-[#2B2F36] p-1.5 rounded-[4px] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-5xl mx-auto w-full">
        {/* Upper Form Fields */}
        <div className="space-y-4">
          {/* Mode of adjustment */}
          <div className="flex items-start gap-6">
            <label className="w-44 pt-1 text-xs font-medium text-[#2B2F36]">Mode of adjustment</label>
            <div className="flex flex-col gap-2">
              <label 
                htmlFor="mode-quantity"
                className="flex items-center gap-2 cursor-pointer text-xs text-[#2B2F36] select-none"
              >
                <input
                  type="radio"
                  id="mode-quantity"
                  name="adjustmentMode"
                  value="QUANTITY"
                  checked={mode === 'QUANTITY'}
                  onChange={() => handleModeChange('QUANTITY')}
                  className="w-4 h-4 text-[#408DFB] border-[#CBD5E1] focus:ring-0 cursor-pointer"
                />
                <span>Quantity Adjustment</span>
              </label>
              <label 
                htmlFor="mode-value"
                className="flex items-center gap-2 cursor-pointer text-xs text-[#2B2F36] select-none"
              >
                <input
                  type="radio"
                  id="mode-value"
                  name="adjustmentMode"
                  value="VALUE"
                  checked={mode === 'VALUE'}
                  onChange={() => handleModeChange('VALUE')}
                  className="w-4 h-4 text-[#408DFB] border-[#CBD5E1] focus:ring-0 cursor-pointer"
                />
                <span>Value Adjustment</span>
              </label>
            </div>
          </div>

          {/* Reference Number */}
          <div className="flex items-center gap-6">
            <label className="w-44 text-xs text-[#2B2F36]">Reference Number</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-80 h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
            />
          </div>

          {/* Date* */}
          <div className="flex items-center gap-6">
            <label className="w-44 text-xs text-[#2B2F36]">
              Date<span className="text-[#DC2626] ml-0.5">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-80 h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none bg-white"
            />
          </div>

          {/* Account* */}
          <div className="flex items-center gap-6">
            <label className="w-44 text-xs text-[#2B2F36]">
              Account<span className="text-[#DC2626] ml-0.5">*</span>
            </label>
            <div className="w-80 relative">
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full h-8 px-3 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none appearance-none cursor-pointer"
              >
                <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                <option value="Inventory Asset">Inventory Asset</option>
                <option value="Stock Adjustment Account">Stock Adjustment Account</option>
                <option value="Direct Expenses">Direct Expenses</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Reason* */}
          <div className="flex items-center gap-6">
            <label className="w-44 text-xs text-[#2B2F36]">
              Reason<span className="text-[#DC2626] ml-0.5">*</span>
            </label>
            <div className="w-80 relative">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-8 px-3 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">Select a reason</option>
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {reason === 'Other / Custom Reason' && (
            <div className="flex items-center gap-6">
              <label className="w-44 text-xs text-[#2B2F36]">
                Custom Reason<span className="text-[#DC2626] ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter custom reason"
                className="w-80 h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
              />
            </div>
          )}

          {/* Warehouse* */}
          <div className="flex items-center gap-6">
            <label className="w-44 text-xs text-[#2B2F36]">
              Warehouse<span className="text-[#DC2626] ml-0.5">*</span>
            </label>
            <div className="w-80 relative">
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full h-8 px-3 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none appearance-none cursor-pointer"
              >
                {warehouses.map((wh: any) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} {wh.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Description */}
          <div className="flex items-start gap-6">
            <label className="w-44 pt-1.5 text-xs text-[#2B2F36]">Description</label>
            <div className="w-80">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Max. 500 characters"
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none resize-y"
              />
              <span className="text-[11px] text-[#9CA3AF] block text-right mt-0.5">
                {description.length}/500
              </span>
            </div>
          </div>
        </div>

        {/* Item Table Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1E2540]">Item Table</span>
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-[#408DFB] hover:underline font-medium cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 rounded-full border border-[#408DFB] p-0.5" />
              <span>Bulk Actions</span>
            </button>
          </div>

          <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left font-medium">ITEM DETAILS</th>
                  {mode === 'QUANTITY' ? (
                    <>
                      <th className="px-4 py-2.5 text-right font-medium w-40">QUANTITY AVAILABLE</th>
                      <th className="px-4 py-2.5 text-right font-medium w-44">NEW QUANTITY ON HAND</th>
                      <th className="px-4 py-2.5 text-right font-medium w-44">QUANTITY ADJUSTED</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-2.5 text-right font-medium w-40">CURRENT VALUE</th>
                      <th className="px-4 py-2.5 text-right font-medium w-44">CHANGED VALUE</th>
                      <th className="px-4 py-2.5 text-right font-medium w-44">ADJUSTED VALUE</th>
                    </>
                  )}
                  <th className="w-8 px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {rows.map((row) => (
                  <tr key={row.id} className="group hover:bg-[#F9FAFB]">
                    {/* ITEM DETAILS */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded border border-[#CBD5E1] bg-[#F8F9FB] flex items-center justify-center shrink-0 text-[#9CA3AF]">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex-1 relative">
                          <select
                            value={row.productId}
                            onChange={(e) => handleProductSelect(row.id, e.target.value)}
                            className="w-full h-8 px-2.5 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="">Type or click to select an item.</option>
                            {products.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.sku ? `(${p.sku})` : ''}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </td>

                    {/* Mode-Dependent Columns */}
                    {mode === 'QUANTITY' ? (
                      <>
                        {/* QUANTITY AVAILABLE */}
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs text-[#2B2F36]">
                          {row.productId ? (
                            <span>
                              {Number(row.availableQuantity).toFixed(2)} {row.unit || ''}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>

                        {/* NEW QUANTITY ON HAND */}
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            step="any"
                            disabled={!row.productId}
                            value={row.productId ? row.newQuantityOnHand : ''}
                            onChange={(e) => handleNewQuantityChange(row.id, e.target.value)}
                            placeholder="0.00"
                            className="w-32 h-8 px-2.5 text-right border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none disabled:bg-[#F8F9FB] disabled:text-[#9CA3AF]"
                          />
                        </td>

                        {/* QUANTITY ADJUSTED */}
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            step="any"
                            disabled={!row.productId}
                            value={row.productId ? (row.quantityAdjusted || '') : ''}
                            onChange={(e) => handleQuantityAdjustedChange(row.id, e.target.value)}
                            placeholder="Eg. +10, -10"
                            className={`w-32 h-8 px-2.5 text-right border border-[#CBD5E1] rounded-[4px] text-xs font-medium focus:border-[#408DFB] focus:outline-none disabled:bg-[#F8F9FB] disabled:text-[#9CA3AF] ${
                              row.quantityAdjusted > 0
                                ? 'text-[#16A34A]'
                                : row.quantityAdjusted < 0
                                ? 'text-[#DC2626]'
                                : 'text-[#2B2F36]'
                            }`}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        {/* CURRENT VALUE */}
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs text-[#2B2F36]">
                          {row.productId ? (
                            <span>
                              {Number(row.currentValue || 0).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>

                        {/* CHANGED VALUE */}
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            step="any"
                            disabled={!row.productId}
                            value={row.productId ? (row.changedValue ?? '') : ''}
                            onChange={(e) => handleChangedValueChange(row.id, e.target.value)}
                            placeholder="0.00"
                            className="w-32 h-8 px-2.5 text-right border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none disabled:bg-[#F8F9FB] disabled:text-[#9CA3AF]"
                          />
                        </td>

                        {/* ADJUSTED VALUE */}
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            step="any"
                            disabled={!row.productId}
                            value={row.productId ? (row.adjustedValue || '') : ''}
                            onChange={(e) => handleAdjustedValueChange(row.id, e.target.value)}
                            placeholder="Eg. +10, -10"
                            className={`w-32 h-8 px-2.5 text-right border border-[#CBD5E1] rounded-[4px] text-xs font-medium focus:border-[#408DFB] focus:outline-none disabled:bg-[#F8F9FB] disabled:text-[#9CA3AF] ${
                              (row.adjustedValue || 0) > 0
                                ? 'text-[#16A34A]'
                                : (row.adjustedValue || 0) < 0
                                ? 'text-[#DC2626]'
                                : 'text-[#2B2F36]'
                            }`}
                          />
                        </td>
                      </>
                    )}

                    {/* Delete row */}
                    <td className="px-2 py-2.5 text-center">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#DC2626] p-1 rounded hover:bg-[#FEF2F2] transition-all cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Sub-row in table: Select a project / Reporting Tags */}
            <div className="px-4 py-2 bg-[#FAFBFD] border-t border-[#E5E7EB] flex items-center gap-4 text-xs text-[#6B7280]">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 hover:text-[#2B2F36] cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Select a project</span>
                <ChevronDown className="w-3 h-3 text-[#9CA3AF]" />
              </button>
              <span className="text-[#D1D5DB]">|</span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 hover:text-[#2B2F36] cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Reporting Tags</span>
                <ChevronDown className="w-3 h-3 text-[#9CA3AF]" />
              </button>
            </div>
          </div>

          {/* Action buttons right under table */}
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#408DFB] cursor-pointer transition-colors shadow-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Row</span>
            </button>
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#408DFB] cursor-pointer transition-colors shadow-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Items in Bulk</span>
            </button>
          </div>
        </div>

        {/* Attach File(s) Section */}
        <div className="mt-8 pt-4 border-t border-[#E5E7EB]">
          <p className="text-xs text-[#2B2F36] font-medium mb-2">Attach File(s) to inventory adjustment</p>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Upload File</span>
              <ChevronDown className="w-3 h-3 text-[#6B7280]" />
              <input
                type="file"
                multiple
                onChange={(e) => handleUpload(e.target.files)}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-1.5">You can upload a maximum of 5 files, 10MB each</p>

          {/* Display attached files if any */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#F8F9FB] border border-[#E5E7EB] rounded text-xs text-[#2B2F36]"
                >
                  <Paperclip className="w-3 h-3 text-[#6B7280]" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="text-[#9CA3AF] hover:text-[#DC2626] ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Item Selection Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4px] border border-[#E5E7EB] shadow-xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#1E2540]">Add Items in Bulk</h3>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="text-[#6B7280] hover:text-[#2B2F36]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-[#E5E7EB]">
              {products.map((p: any) => (
                <label
                  key={p.id}
                  className="flex items-center justify-between py-2 px-1 hover:bg-[#F8F9FB] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`bulk-${p.id}`}
                      className="rounded text-[#408DFB] focus:ring-[#408DFB]"
                    />
                    <span className="font-medium text-xs text-[#2B2F36]">{p.name}</span>
                    {p.sku && <span className="text-[11px] text-[#6B7280]">({p.sku})</span>}
                  </div>
                  <span className="text-[11px] text-[#6B7280] tabular-nums">
                    ₹{Number(p.purchasePrice || 0).toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-3 py-1.5 border border-[#CBD5E1] rounded-[4px] text-xs font-medium text-[#2B2F36] hover:bg-[#F8F9FB]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const checked: string[] = [];
                  products.forEach((p: any) => {
                    const el = document.getElementById(`bulk-${p.id}`) as HTMLInputElement;
                    if (el && el.checked) checked.push(p.id);
                  });
                  handleBulkAdd(checked);
                }}
                className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold"
              >
                Add Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Form Footer */}
      <div className="h-14 border-t border-[#E5E7EB] bg-white px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(true)}
            className="px-4 py-2 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-none"
          >
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#2B2F36] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors shadow-none"
          >
            {isSubmitting ? 'Processing...' : 'Convert to Adjusted'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#2B2F36] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium cursor-pointer transition-colors shadow-none"
          >
            Cancel
          </button>
        </div>
        <div className="text-[11px] text-[#6B7280]">
          Total rows: <span className="font-semibold text-[#2B2F36]">{rows.filter((r) => r.productId).length}</span>
        </div>
      </div>
    </div>
  );
};

export default InventoryAdjustmentForm;
