import React, { useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface FiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onApply: () => void;
  onReset: () => void;
  children: React.ReactNode;
  activeCount?: number;
  className?: string;
}

export const FiltersDrawer: React.FC<FiltersDrawerProps> = ({
  isOpen,
  onClose,
  title = 'Advanced Filters',
  onApply,
  onReset,
  children,
  activeCount = 0,
  className,
}) => {
  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        className={cn(
          'relative w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col z-10 h-full overflow-hidden animate-in slide-in-from-right duration-250 ease-out',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-drawer-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="filters-drawer-title"
                className="font-bold text-sm sm:text-base text-foreground tracking-tight"
              >
                {title}
              </h3>
              {activeCount > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {activeCount} filter{activeCount > 1 ? 's' : ''} currently active
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {children}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <Button
            type="button"
            onClick={onReset}
            variant="outline"
            size="sm"
            className="px-3 text-xs"
          >
            Reset All
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              size="sm"
              className="px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onApply}
              variant="primary"
              size="sm"
              className="px-4 text-xs font-semibold"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
