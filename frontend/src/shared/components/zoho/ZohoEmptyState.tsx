import React from 'react';
import { Plus, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ZohoEmptyStateProps {
  title: string;
  description: string;
  createLabel?: string;
  onCreate?: () => void;
  importLabel?: string;
  onImport?: () => void;
  className?: string;
}

export const ZohoEmptyState: React.FC<ZohoEmptyStateProps> = ({
  title,
  description,
  createLabel,
  onCreate,
  importLabel,
  onImport,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto select-none',
        className
      )}
    >
      <h3 className="text-base font-semibold text-[#2B2F36] mb-1.5">{title}</h3>
      <p className="text-xs text-[#6B7280] max-w-md leading-relaxed mb-6">{description}</p>

      <div className="flex items-center gap-4">
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{createLabel || 'CREATE'}</span>
          </button>
        )}

        {onImport && (
          <button
            type="button"
            onClick={onImport}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#408DFB] hover:underline cursor-pointer py-2"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{importLabel || 'Import'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
