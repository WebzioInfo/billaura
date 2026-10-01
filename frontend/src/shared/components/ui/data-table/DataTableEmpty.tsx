import React from 'react';
import { SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableEmptyProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const DataTableEmpty: React.FC<DataTableEmptyProps> = ({
  title = 'No records found',
  description = 'Try adjusting your search terms or filters to find what you need.',
  actionLabel = 'Clear filters',
  onAction,
  icon,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-[#F3F4F6] dark:bg-[#27272A] flex items-center justify-center text-[#9CA3AF] mb-3">
        {icon || <SearchX className="w-6 h-6" />}
      </div>
      <h3 className="text-[15px] font-semibold text-[#111827] dark:text-[#EDEDED]">{title}</h3>
      {description && (
        <p className="text-xs text-[#555555] dark:text-[#A1A1AA] max-w-sm mt-1 mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#1E1C26] text-[#1F2937] dark:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#2B2A36] transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
