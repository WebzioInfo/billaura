import React, { useState, useRef, useEffect } from 'react';
import { Columns3, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColumnItem {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

export interface DataTableColumnToggleProps {
  columns: ColumnItem[];
  onToggle: (id: string) => void;
  onReset?: () => void;
  className?: string;
}

export const DataTableColumnToggle: React.FC<DataTableColumnToggleProps> = ({
  columns,
  onToggle,
  onReset,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={cn('relative inline-block text-left', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 text-xs font-medium border border-[#D1D5DB] dark:border-[#374151] rounded-lg bg-white dark:bg-[#1E1C26] text-[#1F2937] dark:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#2B2A36] flex items-center gap-1.5 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <Columns3 className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />
        <span>Columns</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1C1B22] border border-[#E8E8EC] dark:border-[#2A2933] rounded-xl shadow-lg z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-[#E8E8EC] dark:border-[#2A2933] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#111827] dark:text-white">Toggle Columns</span>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="text-[11px] text-[#34303F] dark:text-[#93C5FD] hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {columns.map((col) => (
              <label
                key={col.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-xs text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#24232C] cursor-pointer transition-colors',
                  col.required && 'opacity-60 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                    col.visible
                      ? 'bg-[#34303F] border-[#34303F] text-white dark:bg-[#EDEDED] dark:border-[#EDEDED] dark:text-[#111827]'
                      : 'border-[#D1D5DB] dark:border-[#4B5563]'
                  )}
                >
                  {col.visible && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <input
                  type="checkbox"
                  checked={col.visible}
                  disabled={col.required}
                  onChange={() => onToggle(col.id)}
                  className="sr-only"
                />
                <span className="truncate">{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
