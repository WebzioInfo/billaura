import React from 'react';
import { Check, X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkActionItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'accent' | 'danger';
}

export interface FloatingBulkBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkActionItem[];
  itemLabel?: string;
  className?: string;
}

export const FloatingBulkBar: React.FC<FloatingBulkBarProps> = ({
  selectedCount,
  onClear,
  actions,
  itemLabel = 'invoice',
  className,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[calc(100%-2rem)] bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md text-foreground rounded-2xl border border-border shadow-xl p-2.5 px-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 ring-1 ring-slate-900/5 dark:ring-white/10',
        className
      )}
      role="region"
      aria-label="Bulk actions"
    >
      {/* Selected Counter */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
          <Check className="w-3.5 h-3.5" />
        </div>
        <div className="text-xs font-semibold">
          <span className="tabular-nums font-bold text-accent">{selectedCount}</span>{' '}
          {itemLabel}
          {selectedCount > 1 ? 's' : ''} selected
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {actions.map((act) => {
          const Icon = act.icon;
          const variantClasses = {
            default:
              'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border-border',
            accent:
              'bg-accent hover:bg-accent-hover text-accent-foreground border-transparent shadow-xs',
            danger:
              'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          };

          return (
            <button
              key={act.id}
              type="button"
              onClick={act.onClick}
              disabled={act.disabled}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs',
                variantClasses[act.variant || 'default']
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{act.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onClear}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
          title="Clear Selection"
          aria-label="Clear Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
