import React, { useState, useRef, useEffect } from 'react';
import { Columns } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

export interface ColumnVisibilityMenuProps {
  columns: ColumnOption[];
  onToggleColumn: (columnId: string) => void;
  className?: string;
}

export const ColumnVisibilityMenu: React.FC<ColumnVisibilityMenuProps> = ({
  columns,
  onToggleColumn,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'h-9 px-2.5 rounded-[8px] border border-[#D1D5DB] dark:border-[#374151] bg-surface dark:bg-[#1E1C26] text-[#1F2937] dark:text-[#EDEDED] text-[12px] font-medium hover:bg-[#F3F4F6] dark:hover:bg-[#26262A] flex items-center gap-1.5 cursor-pointer transition-colors duration-120',
          isOpen && 'bg-[#F3F4F6] dark:bg-[#26262A]'
        )}
        title="View columns"
        aria-label="View columns"
        aria-expanded={isOpen}
      >
        <Columns className="w-3.5 h-3.5 text-[#4B5563]" />
        <span className="hidden sm:inline">Columns</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-48 bg-surface dark:bg-[#1E1C26] rounded-[8px] border border-[#D1D5DB] dark:border-[#374151] shadow-md p-1.5 z-50 animate-in fade-in duration-100 select-none text-[12px]">
          <div className="text-[11px] font-semibold text-[#6B7280] px-2 py-1 uppercase tracking-wider">
            Toggle Columns
          </div>
          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {columns.map((col) => (
              <label
                key={col.id}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 rounded-[6px] cursor-pointer transition-colors text-[12px]',
                  col.required
                    ? 'opacity-50 cursor-not-allowed text-[#9CA3AF]'
                    : 'hover:bg-[#F3F4F6] dark:hover:bg-[#26262A] text-[#1F2937] dark:text-[#EDEDED]'
                )}
              >
                <span>{col.label}</span>
                <input
                  type="checkbox"
                  checked={col.visible}
                  disabled={col.required}
                  onChange={() => !col.required && onToggleColumn(col.id)}
                  className="rounded border-[#D1D5DB] dark:border-[#374151] text-[#34303F] accent-[#34303F] dark:accent-[#EDEDED] h-3.5 w-3.5 cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
