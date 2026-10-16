import React from 'react';
import { cn } from '@/lib/utils';

export interface ZohoStatusTextProps {
  status: string;
  className?: string;
  overdueDays?: number;
}

export const ZohoStatusText: React.FC<ZohoStatusTextProps> = ({
  status,
  className,
  overdueDays,
}) => {
  if (!status) return null;

  const upper = status.toUpperCase().trim();
  let colorClass = 'text-[#6B7280]'; // default draft/grey
  let displayLabel = upper;

  if (['PAID', 'CLOSED', 'INVOICED', 'ADJUSTED', 'COMPLETED', 'ACTIVE'].includes(upper)) {
    colorClass = 'text-[#1FAD6B]'; // green
  } else if (['SENT', 'ISSUED', 'OPEN', 'APPROVED', 'BILLED'].includes(upper)) {
    colorClass = 'text-[#2F80ED]'; // blue
  } else if (['OVERDUE', 'ACCEPTED', 'PENDING', 'PARTIAL', 'PARTIALLY_PAID'].includes(upper)) {
    colorClass = 'text-[#F76831]'; // orange
    if (upper === 'OVERDUE' && overdueDays && overdueDays > 0) {
      displayLabel = `OVERDUE BY ${overdueDays} DAYS`;
    }
  } else if (['DRAFT', 'VOID', 'CANCELLED', 'ARCHIVED'].includes(upper)) {
    colorClass = 'text-[#6B7280]'; // grey
  }

  return (
    <span
      className={cn(
        'font-semibold text-[11px] tracking-wider uppercase inline-block select-none',
        colorClass,
        className
      )}
    >
      {displayLabel}
    </span>
  );
};
