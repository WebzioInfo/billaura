import React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormAction {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
}

export interface ZohoFormFooterProps {
  primaryActions: FormAction[];
  secondaryActions?: FormAction[];
  makeRecurring?: {
    label?: string;
    onClick: () => void;
  };
  templateName?: string;
  onChangeTemplate?: () => void;
  totalSummary?: {
    totalAmount?: number;
    totalQuantity?: number;
    currencySymbol?: string;
  };
  className?: string;
}

export const ZohoFormFooter: React.FC<ZohoFormFooterProps> = ({
  primaryActions,
  secondaryActions,
  makeRecurring,
  templateName = 'Standard Template',
  onChangeTemplate,
  totalSummary,
  className,
}) => {
  const curSymbol = totalSummary?.currencySymbol || '₹';

  return (
    <div
      className={cn(
        'sticky bottom-0 left-0 right-0 z-20 bg-white border-t border-[#E5E7EB] px-6 py-2.5 flex items-center justify-between shadow-xs select-none',
        className
      )}
    >
      {/* Left: Action Buttons */}
      <div className="flex items-center gap-2">
        {primaryActions.map((action, idx) => (
          <button
            key={idx}
            type={action.type || 'button'}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] disabled:bg-[#93C5FD] text-white rounded-[4px] text-xs font-medium cursor-pointer transition-colors shadow-2xs"
          >
            {action.loading ? 'Saving...' : action.label}
          </button>
        ))}

        {secondaryActions?.map((action, idx) => (
          <button
            key={idx}
            type={action.type || 'button'}
            onClick={action.onClick}
            disabled={action.disabled}
            className="px-4 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] text-[#2B2F36] rounded-[4px] text-xs font-medium cursor-pointer transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Right: Recurring / Template / Totals Quick Summary */}
      <div className="flex items-center gap-4 text-xs text-[#6B7280]">
        {makeRecurring && (
          <button
            type="button"
            onClick={makeRecurring.onClick}
            className="text-[#408DFB] hover:underline font-medium cursor-pointer inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{makeRecurring.label || 'Make Recurring'}</span>
          </button>
        )}

        {onChangeTemplate && (
          <div className="hidden sm:inline-block">
            PDF Template: <span className="font-medium text-[#2B2F36]">'{templateName}'</span>{' '}
            <button
              type="button"
              onClick={onChangeTemplate}
              className="text-[#408DFB] hover:underline cursor-pointer ml-1"
            >
              Change
            </button>
          </div>
        )}

        {totalSummary && (
          <div className="text-right text-[11px] leading-tight text-[#2B2F36] border-l border-[#E5E7EB] pl-4">
            <div>
              Total Amount: {curSymbol}{' '}
              {(totalSummary.totalAmount || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            {totalSummary.totalQuantity !== undefined && (
              <div className="text-[#6B7280]">
                Total Quantity: {totalSummary.totalQuantity}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
