import React from 'react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '../StatusBadge';
import { TypeBadge } from '../TypeBadge';

// ============================================================================
// HELPERS
// ============================================================================

export const formatIndianCurrency = (amount: number | string | null | undefined): string => {
  const num = Number(amount || 0);
  const rounded = Math.abs(num) < 0.005 ? 0 : num;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
};

export const formatIndianDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getDueDateHint = (dueDateStr?: string | Date | null, isPaid = false) => {
  if (isPaid || !dueDateStr) return null;
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return { text: `${days}d overdue`, type: 'overdue' as const };
  }
  if (diffDays === 0) {
    return { text: 'Due today', type: 'today' as const };
  }
  if (diffDays <= 7) {
    return { text: `Due in ${diffDays}d`, type: 'soon' as const };
  }
  return { text: `Due in ${diffDays}d`, type: 'normal' as const };
};

// ============================================================================
// CELL COMPONENTS
// ============================================================================

export interface CurrencyCellProps {
  value?: number | string | null;
  amount?: number | string | null;
  variant?: 'auto' | 'neutral' | 'positive' | 'negative' | 'warning' | 'settled';
  className?: string;
  prefix?: string;
  isBold?: boolean;
}

export const CurrencyCell: React.FC<CurrencyCellProps> = ({
  value,
  amount,
  variant = 'neutral',
  className,
  prefix = '₹',
  isBold = false,
}) => {
  const actualVal = amount !== undefined ? amount : value;
  const num = Number(actualVal || 0);

  let colorClass = 'text-[#1F2937] dark:text-[#EDEDED]';
  if (variant === 'positive') {
    colorClass = 'text-[#15803D] dark:text-[#4ADE80]';
  } else if (variant === 'negative') {
    colorClass = 'text-[#DC2626] dark:text-[#F87171]';
  } else if (variant === 'warning') {
    colorClass = 'text-[#D97706] dark:text-[#FBBF24]';
  } else if (variant === 'settled' || (variant === 'auto' && Math.abs(num) < 0.01)) {
    colorClass = 'text-[#9CA3AF] dark:text-[#71717A]';
  } else if (variant === 'auto') {
    if (num < 0) colorClass = 'text-[#DC2626] dark:text-[#F87171]';
    else if (num > 0) colorClass = 'text-[#111827] dark:text-[#F3F4F6]';
  }

  return (
    <div className={cn('text-right tabular-nums whitespace-nowrap text-[14px]', isBold ? 'font-semibold' : 'font-normal', colorClass, className)}>
      {prefix}{formatIndianCurrency(num)}
    </div>
  );
};

export interface DateCellProps {
  value?: string | Date | null;
  date?: string | Date | null;
  className?: string;
}

export const DateCell: React.FC<DateCellProps> = ({ value, date, className }) => {
  const actualDate = date !== undefined ? date : value;
  return (
    <span className={cn('text-[#555555] dark:text-[#A1A1AA] whitespace-nowrap text-[14px] font-normal', className)}>
      {formatIndianDate(actualDate)}
    </span>
  );
};

export interface RelativeDueCellProps {
  value?: string | Date | null;
  dueDate?: string | Date | null;
  isPaid?: boolean;
  className?: string;
}

export const RelativeDueCell: React.FC<RelativeDueCellProps> = ({ value, dueDate, isPaid = false, className }) => {
  const actualDue = dueDate !== undefined ? dueDate : value;
  if (isPaid || !actualDue) {
    return <span className="text-[#9CA3AF] text-[14px]">—</span>;
  }

  const hint = getDueDateHint(actualDue, isPaid);

  return (
    <div className={cn('flex items-center gap-1.5 whitespace-nowrap text-[14px]', className)}>
      <span className="text-[#555555] dark:text-[#A1A1AA]">{formatIndianDate(value)}</span>
      {hint && (
        <span
          className={cn(
            'text-[12px] tabular-nums font-normal',
            hint.type === 'overdue'
              ? 'text-[#DC2626] dark:text-[#F87171]'
              : hint.type === 'today' || hint.type === 'soon'
              ? 'text-[#D97706] dark:text-[#FBBF24]'
              : 'text-[#555555] dark:text-[#A1A1AA]'
          )}
        >
          ({hint.text})
        </span>
      )}
    </div>
  );
};

export interface TextCellProps {
  value?: React.ReactNode;
  className?: string;
  tooltip?: string;
  isBold?: boolean;
}

export const TextCell: React.FC<TextCellProps> = ({ value, className, tooltip, isBold = false }) => {
  const titleText = tooltip || (typeof value === 'string' ? value : undefined);
  return (
    <span
      title={titleText}
      className={cn(
        'truncate block text-[14px]',
        isBold ? 'font-medium text-[#1F2937] dark:text-[#EDEDED]' : 'text-[#555555] dark:text-[#A1A1AA]',
        className
      )}
    >
      {value || '—'}
    </span>
  );
};

export interface LinkCellProps {
  value: React.ReactNode;
  onClick?: () => void;
  className?: string;
  isStrikethrough?: boolean;
}

export const LinkCell: React.FC<LinkCellProps> = ({ value, onClick, className, isStrikethrough = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'font-medium text-[14px] text-[#1F2937] dark:text-[#EDEDED] hover:underline text-left cursor-pointer transition-colors tabular-nums whitespace-nowrap',
        isStrikethrough && 'line-through text-[#6B7280] dark:text-[#9CA3AF]',
        className
      )}
    >
      {value}
    </button>
  );
};

export { StatusBadge, TypeBadge };
