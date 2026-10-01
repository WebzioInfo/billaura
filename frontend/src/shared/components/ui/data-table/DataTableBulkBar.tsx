import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
}

export interface DataTableBulkBarProps {
  selectedCount: number;
  onClear: () => void;
  actions?: BulkAction[];
  className?: string;
}

export const DataTableBulkBar: React.FC<DataTableBulkBarProps> = ({
  selectedCount,
  onClear,
  actions = [],
  className,
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#34303F] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 border border-white/10',
        className
      )}
    >
      <div className="flex items-center gap-2 pr-3 border-r border-white/20">
        <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
        <span className="text-xs font-medium">
          {selectedCount} selected
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {actions.map((act, idx) => (
          <button
            key={idx}
            type="button"
            onClick={act.onClick}
            disabled={act.isLoading}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50',
              act.variant === 'danger'
                ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            {act.icon}
            <span>{act.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onClear}
        className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer ml-1"
        title="Clear selection"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
