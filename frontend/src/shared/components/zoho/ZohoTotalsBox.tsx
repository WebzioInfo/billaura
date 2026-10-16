import React from 'react';
import { HelpCircle, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ZOHO_TDS_OPTIONS = [
  { id: 'tds-0.1', name: 'TDS 0.1% (Sec 194Q)', rate: 0.1 },
  { id: 'tds-1', name: 'TDS 1% (Sec 194C)', rate: 1 },
  { id: 'tds-2', name: 'TDS 2% (Sec 194I - Plant & Machinery)', rate: 2 },
  { id: 'tds-5', name: 'TDS 5% (Sec 194J - Professional)', rate: 5 },
  { id: 'tds-10', name: 'TDS 10% (Sec 194J - Technical)', rate: 10 },
];

export const ZOHO_TCS_OPTIONS = [
  { id: 'tcs-0.075', name: 'TCS 0.075% (Sec 206C(1H))', rate: 0.075 },
  { id: 'tcs-0.1', name: 'TCS 0.1% (Sale of Goods)', rate: 0.1 },
  { id: 'tcs-1', name: 'TCS 1% (Scrap/Minerals)', rate: 1 },
  { id: 'tcs-5', name: 'TCS 5% (Overseas Remittance)', rate: 5 },
];

export interface ZohoTotalsBoxProps {
  subtotal: number;
  discount?: number;
  discountType?: '%' | 'amount';
  onDiscountChange?: (val: number, type: '%' | 'amount') => void;
  taxLines?: Array<{ label: string; amount: number }>;
  tdsTcsType?: 'TDS' | 'TCS' | 'NONE';
  tdsTcsAmount?: number;
  tdsTcsRate?: number;
  selectedTaxId?: string;
  onTdsTcsChange?: (type: 'TDS' | 'TCS' | 'NONE', val: number, rate?: number, taxId?: string) => void;
  adjustment?: number;
  onAdjustmentChange?: (val: number) => void;
  roundOff?: number;
  total: number;
  currencySymbol?: string;
  className?: string;
}

export const ZohoTotalsBox: React.FC<ZohoTotalsBoxProps> = ({
  subtotal,
  discount = 0,
  discountType = '%',
  onDiscountChange,
  taxLines = [],
  tdsTcsType = 'NONE',
  tdsTcsAmount = 0,
  tdsTcsRate = 0,
  selectedTaxId,
  onTdsTcsChange,
  adjustment = 0,
  onAdjustmentChange,
  roundOff = 0,
  total,
  currencySymbol = '₹',
  className,
}) => {
  const [internalTaxId, setInternalTaxId] = React.useState<string>(selectedTaxId || '');

  React.useEffect(() => {
    if (selectedTaxId !== undefined) {
      setInternalTaxId(selectedTaxId);
    }
  }, [selectedTaxId]);

  const formatCur = (val: number) =>
    `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleTypeSelect = (type: 'TDS' | 'TCS') => {
    if (!onTdsTcsChange) return;
    if (tdsTcsType === type) {
      // Toggle off
      onTdsTcsChange('NONE', 0, 0, '');
      setInternalTaxId('');
      return;
    }
    const list = type === 'TDS' ? ZOHO_TDS_OPTIONS : ZOHO_TCS_OPTIONS;
    const first = list[0];
    const amt = Number(((subtotal * first.rate) / 100).toFixed(2));
    setInternalTaxId(first.id);
    onTdsTcsChange(type, amt, first.rate, first.id);
  };

  const handleTaxSelect = (taxId: string) => {
    if (!onTdsTcsChange || tdsTcsType === 'NONE') return;
    setInternalTaxId(taxId);
    const list = tdsTcsType === 'TDS' ? ZOHO_TDS_OPTIONS : ZOHO_TCS_OPTIONS;
    const opt = list.find((t) => t.id === taxId);
    const rate = opt ? opt.rate : 0;
    const amt = Number(((subtotal * rate) / 100).toFixed(2));
    onTdsTcsChange(tdsTcsType, amt, rate, taxId);
  };

  return (
    <div
      className={cn(
        'w-full max-w-[360px] ml-auto text-xs text-[#2B2F36] space-y-2.5 select-none',
        className
      )}
    >
      {/* Sub Total */}
      <div className="flex items-center justify-between">
        <span className="text-[#6B7280]">Sub Total</span>
        <span className="font-medium text-[#2B2F36] tabular-nums">{formatCur(subtotal)}</span>
      </div>

      {/* Discount */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#6B7280]">Discount</span>
        <div className="flex items-center gap-1.5 justify-end">
          {onDiscountChange ? (
            <div className="flex items-center border border-[#CBD5E1] bg-white rounded-[4px] overflow-hidden h-7">
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={(e) =>
                  onDiscountChange(Number(e.target.value) || 0, discountType)
                }
                className="w-16 px-2 text-right text-xs outline-none"
                placeholder="0"
              />
              <button
                type="button"
                onClick={() =>
                  onDiscountChange(discount, discountType === '%' ? 'amount' : '%')
                }
                className="px-1.5 bg-[#EDF2F7] text-[10px] font-semibold text-[#4B5563] h-full border-l border-[#CBD5E1] hover:bg-[#E2E8F0] cursor-pointer"
              >
                {discountType === '%' ? '%' : currencySymbol}
              </button>
            </div>
          ) : (
            <span className="tabular-nums">{formatCur(discount)}</span>
          )}
        </div>
      </div>

      {/* Dynamic Tax Lines (CGST, SGST, IGST or GST) */}
      {taxLines.map((line, idx) => (
        <div key={idx} className="flex items-center justify-between text-[#6B7280]">
          <span>{line.label}</span>
          <span className="font-medium text-[#2B2F36] tabular-nums">{formatCur(line.amount)}</span>
        </div>
      ))}

      {/* TDS / TCS Option (Dynamic Zoho selector) */}
      {onTdsTcsChange && (
        <div className="pt-2 border-t border-[#E5E7EB] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tds_tcs_group"
                  checked={tdsTcsType === 'TDS'}
                  onChange={() => handleTypeSelect('TDS')}
                  className="w-3.5 h-3.5 text-[#408DFB] border-[#CBD5E1] focus:ring-0 cursor-pointer"
                />
                <span className={tdsTcsType === 'TDS' ? 'font-medium text-[#2B2F36]' : 'text-[#6B7280]'}>TDS</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tds_tcs_group"
                  checked={tdsTcsType === 'TCS'}
                  onChange={() => handleTypeSelect('TCS')}
                  className="w-3.5 h-3.5 text-[#408DFB] border-[#CBD5E1] focus:ring-0 cursor-pointer"
                />
                <span className={tdsTcsType === 'TCS' ? 'font-medium text-[#2B2F36]' : 'text-[#6B7280]'}>TCS</span>
              </label>
            </div>

            {tdsTcsType === 'NONE' && (
              <span className="text-[#9CA3AF] text-[11px]">- 0.00</span>
            )}
          </div>

          {tdsTcsType !== 'NONE' && (
            <div className="flex items-center justify-between gap-3 pt-0.5">
              <div className="flex-1 relative">
                <select
                  value={internalTaxId}
                  onChange={(e) => handleTaxSelect(e.target.value)}
                  className="w-full h-7 px-2 pr-6 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none cursor-pointer"
                >
                  <option value="">Select a Tax</option>
                  {(tdsTcsType === 'TDS' ? ZOHO_TDS_OPTIONS : ZOHO_TCS_OPTIONS).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <span className="font-medium text-[#2B2F36] tabular-nums text-right w-24">
                {tdsTcsType === 'TDS' ? '-' : '+'}
                {formatCur(Math.abs(tdsTcsAmount))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Adjustment line */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[#6B7280]">
          <span>Adjustment</span>
          <span
            title="Add any other +ve or -ve charges e.g. shipping, round-off or extra fee"
            className="cursor-help"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
          </span>
        </div>

        {onAdjustmentChange ? (
          <input
            type="number"
            value={adjustment || ''}
            onChange={(e) => onAdjustmentChange(Number(e.target.value) || 0)}
            placeholder="0.00"
            className="w-24 px-2 h-7 bg-white border border-[#CBD5E1] rounded-[4px] text-right text-xs outline-none focus:border-[#408DFB]"
          />
        ) : (
          <span className="font-medium text-[#2B2F36]">{formatCur(adjustment)}</span>
        )}
      </div>

      {/* Round Off (if not zero) */}
      {roundOff !== 0 && (
        <div className="flex items-center justify-between text-[#6B7280]">
          <span>Round Off</span>
          <span className="font-medium text-[#2B2F36]">{formatCur(roundOff)}</span>
        </div>
      )}

      {/* Total (₹) large bold */}
      <div className="flex items-center justify-between pt-2 border-t border-[#CBD5E1]">
        <span className="text-sm font-bold text-[#2B2F36]">
          Total ({currencySymbol})
        </span>
        <span className="text-base sm:text-lg font-bold text-[#2B2F36]">
          {formatCur(total)}
        </span>
      </div>
    </div>
  );
};
