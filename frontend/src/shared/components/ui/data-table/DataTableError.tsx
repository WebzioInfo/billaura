import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const DataTableError: React.FC<DataTableErrorProps> = ({
  message = 'Failed to load records. Please verify your connection.',
  onRetry,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-10 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-[#DC2626] mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-[15px] font-semibold text-[#111827] dark:text-[#EDEDED]">Unable to load data</h3>
      <p className="text-xs text-[#DC2626] dark:text-[#F87171] max-w-sm mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#1E1C26] text-[#1F2937] dark:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#2B2A36] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
