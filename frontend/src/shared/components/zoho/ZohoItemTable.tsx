import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  GripVertical,
  MoreVertical,
  X,
  Plus,
  Barcode,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ZohoItemRow {
  id?: string;
  productId?: string;
  name: string;
  description?: string;
  accountId?: string;
  customerId?: string;
  quantity: number;
  rate: number;
  discount: number;
  discountType?: '%' | 'amount';
  taxRate?: number;
  taxId?: string;
  amount: number;
}

export interface ZohoItemTableProps {
  items: ZohoItemRow[];
  onChange: (items: ZohoItemRow[]) => void;
  onAddItem: () => void;
  onAddBulk?: () => void;
  onScanItem?: () => void;
  onAddLandedCost?: () => void;
  products?: any[];
  taxOptions?: Array<{ label: string; rate: number; id: string }>;
  accountOptions?: Array<{ label: string; id: string }>;
  customerOptions?: Array<{ label: string; id: string }>;
  showAccountColumn?: boolean;
  showCustomerColumn?: boolean;
  currencySymbol?: string;
  priceField?: 'purchase' | 'selling';
  className?: string;
}

export const ZohoItemTable: React.FC<ZohoItemTableProps> = ({
  items,
  onChange,
  onAddItem,
  onAddBulk,
  onScanItem,
  onAddLandedCost,
  products = [],
  taxOptions = [],
  accountOptions = [],
  customerOptions = [],
  showAccountColumn = false,
  showCustomerColumn = false,
  currencySymbol = '₹',
  priceField = 'selling',
  className,
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const updateDropdownPos = useCallback(() => {
    if (activeInputRef.current && openIndex !== null) {
      const rect = activeInputRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 320);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const isUp = spaceBelow < 220 && spaceAbove > spaceBelow;

      setDropdownPos({
        top: isUp ? Math.max(8, rect.top - 224) : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
      });
    }
  }, [openIndex]);

  useEffect(() => {
    if (openIndex === null) return;
    updateDropdownPos();
    const onScroll = () => updateDropdownPos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [openIndex, updateDropdownPos]);

  useEffect(() => {
    const handleMouseDownOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        openIndex !== null &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        activeInputRef.current &&
        !activeInputRef.current.contains(target)
      ) {
        setOpenIndex(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDownOutside);
    return () => document.removeEventListener('mousedown', handleMouseDownOutside);
  }, [openIndex]);

  const handleRowChange = (index: number, field: keyof ZohoItemRow, val: any) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: val };

    if (field === 'name') {
      row.productId = '';
    }

    // Auto recalculate row amount
    const qty = Number(row.quantity) || 0;
    const rate = Number(row.rate) || 0;
    const base = qty * rate;

    let discountVal = Number(row.discount) || 0;
    if (row.discountType === '%') {
      discountVal = (base * discountVal) / 100;
    }
    const taxable = Math.max(0, base - discountVal);
    row.amount = taxable;

    updated[index] = row;
    onChange(updated);
  };

  const handleSelectProduct = (index: number, p: any) => {
    const updated = [...items];
    const qty = Number(updated[index].quantity) || 1;
    const rawRate = priceField === 'purchase'
      ? (p.costPrice ?? p.purchasePrice ?? p.price ?? p.sellingPrice ?? 0)
      : (p.sellingPrice ?? p.purchasePrice ?? p.price ?? 0);
    const rate = Number(rawRate);
    const taxRate = Number(p.taxRate ?? (p.gstRate ?? 18));
    const base = qty * rate;
    const discountVal = updated[index].discountType === '%' 
      ? (base * (Number(updated[index].discount) || 0)) / 100 
      : (Number(updated[index].discount) || 0);

    updated[index] = {
      ...updated[index],
      productId: p.id,
      name: p.name,
      description: p.description || p.name || '',
      rate,
      taxRate,
      amount: Math.max(0, base - discountVal),
    };
    onChange(updated);
    setOpenIndex(null);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      // Clear row instead of removing if only 1 exists
      onChange([
        {
          name: '',
          description: '',
          quantity: 1,
          rate: 0,
          discount: 0,
          discountType: '%',
          amount: 0,
        },
      ]);
      return;
    }
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('w-full border border-[#E5E7EB] rounded-[4px] overflow-hidden', className)}>
      {/* Header Band: "Item Table" with Bulk Actions / Scan Item on right */}
      <div className="bg-[#F8F9FB] border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
          Item Table
        </h4>

        <div className="flex items-center gap-4 text-xs">
          {onScanItem && (
            <button
              type="button"
              onClick={onScanItem}
              className="inline-flex items-center gap-1.5 text-[#408DFB] hover:underline font-medium cursor-pointer"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Scan Item</span>
            </button>
          )}

          {onAddBulk && (
            <button
              type="button"
              onClick={onAddBulk}
              className="inline-flex items-center gap-1.5 text-[#408DFB] hover:underline font-medium cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Actions</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Grid */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F8F9FB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-left">
              <th className="w-8 px-2 py-2 text-center"></th>
              <th className="px-3 py-2 min-w-[240px]">Item Details</th>
              {showAccountColumn && (
                <th className="px-3 py-2 w-40">Account</th>
              )}
              <th className="px-3 py-2 w-24 text-right">Quantity</th>
              <th className="px-3 py-2 w-28 text-right">Rate</th>
              <th className="px-3 py-2 w-32 text-right">Discount</th>
              <th className="px-3 py-2 w-36 text-left">Tax</th>
              {showCustomerColumn && (
                <th className="px-3 py-2 w-40">Customer Details</th>
              )}
              <th className="px-3 py-2 w-28 text-right">Amount</th>
              <th className="w-10 px-2 py-2 text-center"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E5E7EB]">
            {items.map((row, index) => (
              <tr
                key={row.id || index}
                className="group hover:bg-[#F9FAFB] transition-colors"
              >
                {/* Drag handle */}
                <td className="px-2 py-2 text-center cursor-grab text-[#9CA3AF] hover:text-[#4B5563]">
                  <GripVertical className="w-3.5 h-3.5 mx-auto" />
                </td>

                {/* Item Details (Name & optional description) */}
                <td className="px-3 py-2 align-top">
                  <div className="space-y-1 relative">
                    <input
                      type="text"
                      ref={(el) => {
                        if (openIndex === index) {
                          activeInputRef.current = el;
                        }
                      }}
                      value={row.name}
                      onFocus={(e) => {
                        activeInputRef.current = e.currentTarget;
                        setOpenIndex(index);
                        updateDropdownPos();
                      }}
                      onChange={(e) => {
                        activeInputRef.current = e.currentTarget;
                        handleRowChange(index, 'name', e.target.value);
                        setOpenIndex(index);
                        updateDropdownPos();
                      }}
                      placeholder="Type or click to select an item."
                      className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] select-text"
                    />

                    {/* Product Search Results Dropdown Portal */}
                    {openIndex === index && products.length > 0 && dropdownPos && createPortal(
                      <div
                        ref={dropdownRef}
                        style={{
                          position: 'fixed',
                          top: dropdownPos.top,
                          left: dropdownPos.left,
                          width: dropdownPos.width,
                          zIndex: 99999,
                        }}
                        className="max-h-56 overflow-y-auto bg-white border border-[#CBD5E1] rounded-[4px] shadow-2xl divide-y divide-[#F1F5F9] animate-in fade-in-50 duration-75"
                      >
                        {products
                          .filter(
                            (p) =>
                              !row.name ||
                              p.name?.toLowerCase().includes(row.name.toLowerCase()) ||
                              p.sku?.toLowerCase().includes(row.name.toLowerCase()) ||
                              p.hsnCode?.toLowerCase().includes(row.name.toLowerCase())
                          )
                          .slice(0, 15)
                          .map((p) => {
                            const pStock = p.stocks
                              ? p.stocks.reduce((acc: number, s: any) => acc + Number(s.availableQuantity ?? s.quantity ?? 0), 0)
                              : 0;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectProduct(index, p);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-[#F8F9FB] transition-colors cursor-pointer flex flex-col gap-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-xs text-[#2B2F36] truncate">{p.name}</span>
                                  <span className="text-xs font-semibold text-[#408DFB] shrink-0">
                                    {currencySymbol}{(Number(
                                      priceField === 'purchase'
                                        ? (p.costPrice ?? p.purchasePrice ?? p.price ?? p.sellingPrice ?? 0)
                                        : (p.sellingPrice ?? p.purchasePrice ?? p.price ?? 0)
                                    )).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-[#6B7280]">
                                  {p.sku && <span>SKU: {p.sku}</span>}
                                  {p.hsnCode && <span>HSN: {p.hsnCode}</span>}
                                  {p.isTrackStock !== false && !p.isService && (
                                    <span className={pStock > 0 ? 'text-[#10B981] font-medium' : 'text-[#EF4444] font-medium'}>
                                      Stock: {pStock}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </div>,
                      document.body
                    )}

                    {/* Selected Product Stock & HSN badge */}
                    {(() => {
                      const selectedProd = products.find((p) => p.id === row.productId || p.name === row.name);
                      if (!selectedProd) return null;
                      const pStock = selectedProd.stocks
                        ? selectedProd.stocks.reduce((acc: number, s: any) => acc + Number(s.availableQuantity ?? s.quantity ?? 0), 0)
                        : 0;
                      return (
                        <div className="text-[10px] text-[#6B7280] flex items-center gap-2 pt-0.5 select-none">
                          {selectedProd.hsnCode && <span>HSN: <strong className="text-[#2B2F36]">{selectedProd.hsnCode}</strong></span>}
                          {selectedProd.isTrackStock !== false && !selectedProd.isService ? (
                            <span>• Stock: <strong className={pStock > 0 ? "text-[#10B981]" : "text-[#EF4444]"}>{pStock}</strong></span>
                          ) : (
                            <span className="text-slate-400 italic">• Service</span>
                          )}
                        </div>
                      );
                    })()}

                    <textarea
                      value={row.description || ''}
                      onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                      placeholder="Add item description..."
                      rows={1}
                      className="w-full px-2 py-1 bg-white border border-[#E5E7EB] rounded-[4px] text-[11px] text-[#4B5563] outline-none resize-y focus:border-[#408DFB]"
                    />
                  </div>
                </td>

                {/* Account (if enabled) */}
                {showAccountColumn && (
                  <td className="px-3 py-2 align-top">
                    <select
                      value={row.accountId || ''}
                      onChange={(e) => handleRowChange(index, 'accountId', e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                    >
                      <option value="">Select Account</option>
                      {accountOptions.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.label}
                        </option>
                      ))}
                    </select>
                  </td>
                )}

                {/* Quantity */}
                <td className="px-3 py-2 align-top text-right">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={row.quantity ?? 1}
                    onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                    className="w-20 h-8 px-2 text-right bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </td>

                {/* Rate */}
                <td className="px-3 py-2 align-top text-right">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={row.rate || ''}
                    onChange={(e) => handleRowChange(index, 'rate', e.target.value)}
                    placeholder="0.00"
                    className="w-24 h-8 px-2 text-right bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </td>

                {/* Discount (Value + % / amount toggle) */}
                <td className="px-3 py-2 align-top text-right">
                  <div className="inline-flex items-center border border-[#CBD5E1] rounded-[4px] overflow-hidden h-8 bg-white">
                    <input
                      type="number"
                      min="0"
                      value={row.discount || ''}
                      onChange={(e) => handleRowChange(index, 'discount', e.target.value)}
                      placeholder="0"
                      className="w-14 px-1.5 text-right text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleRowChange(
                          index,
                          'discountType',
                          row.discountType === 'amount' ? '%' : 'amount'
                        )
                      }
                      className="px-1.5 bg-[#EDF2F7] text-[10px] font-semibold text-[#4B5563] h-full border-l border-[#CBD5E1] hover:bg-[#E2E8F0] cursor-pointer"
                    >
                      {row.discountType === 'amount' ? currencySymbol : '%'}
                    </button>
                  </div>
                </td>

                {/* Tax Dropdown */}
                <td className="px-3 py-2 align-top">
                  <select
                    value={row.taxRate ?? ''}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      handleRowChange(
                        index,
                        'taxRate',
                        selectedVal ? Number(selectedVal) : undefined
                      );
                    }}
                    className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  >
                    <option value="">Select a Tax</option>
                    {taxOptions.map((tax, tIdx) => (
                      <option key={`${tax.id}-${tIdx}`} value={tax.rate}>
                        {tax.label}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Customer Details (for billable items) */}
                {showCustomerColumn && (
                  <td className="px-3 py-2 align-top">
                    <select
                      value={row.customerId || ''}
                      onChange={(e) => handleRowChange(index, 'customerId', e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                    >
                      <option value="">Select Customer</option>
                      {customerOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                )}

                {/* Amount */}
                <td className="px-3 py-2 align-top text-right font-medium text-[#2B2F36] pt-3.5">
                  {currencySymbol}
                  {(row.amount || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>

                {/* Row Hover Red X and Options */}
                <td className="px-2 py-2 align-top text-center pt-3.5">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-[#E54B4B] p-1 rounded transition-opacity cursor-pointer"
                    title="Remove row"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Add Buttons */}
      <div className="bg-[#F8F9FB] border-t border-[#E5E7EB] px-4 py-2.5 flex items-center gap-3">
        {/* + Add New Row Split Button */}
        <div className="inline-flex items-center rounded-[4px] overflow-hidden border border-[#CBD5E1] bg-white">
          <button
            type="button"
            onClick={onAddItem}
            className="px-3 py-1.5 text-xs font-semibold text-[#2B2F36] hover:bg-[#F8F9FB] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#408DFB]" />
            <span>Add New Row</span>
          </button>
        </div>

        {onAddBulk && (
          <button
            type="button"
            onClick={onAddBulk}
            className="text-xs font-semibold text-[#408DFB] hover:underline cursor-pointer"
          >
            + Add Items in Bulk
          </button>
        )}

        {onAddLandedCost && (
          <button
            type="button"
            onClick={onAddLandedCost}
            className="text-xs font-semibold text-[#408DFB] hover:underline cursor-pointer ml-2"
          >
            + Add Landed Cost
          </button>
        )}
      </div>
    </div>
  );
};
