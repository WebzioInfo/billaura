import React from 'react';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  label: string;
  value: string | number;
  helperText?: string;
  indicatorDot?: 'collected' | 'outstanding' | 'overdue' | null;
  isLoading?: boolean;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  helperText,
  indicatorDot,
  isLoading = false,
  className,
}) => {
  const dotColorClass = {
    collected: 'bg-[#16A34A] dark:bg-[#22C55E]',
    outstanding: 'bg-[#D97706] dark:bg-[#F59E0B]',
    overdue: 'bg-[#DC2626] dark:bg-[#EF4444]',
  };

  return (
    <div
      className={cn(
        'bg-surface dark:bg-[#1E1C26] rounded-[10px] border border-[#E5E7EB] dark:border-[#26262A] px-4 py-3.5 flex flex-col justify-between select-none h-[84px] shadow-xs',
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        {indicatorDot && dotColorClass[indicatorDot] && (
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColorClass[indicatorDot])} />
        )}
        <span className="text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] uppercase tracking-[0.04em] truncate">
          {label}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-1 animate-pulse">
          <div className="h-5 w-24 bg-muted/40 rounded" />
          <div className="h-2.5 w-16 bg-muted/20 rounded" />
        </div>
      ) : (
        <div>
          <div className="text-[22px] font-semibold leading-tight text-[#111827] dark:text-[#F3F4F6] tracking-tight tabular-nums">
            {value}
          </div>
          {helperText && (
            <div className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF] truncate mt-0.5 leading-none">
              {helperText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
