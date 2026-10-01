import React from 'react';
import { AlignJustify, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TableDensity = 'comfortable' | 'compact';

export interface DataTableDensityToggleProps {
  density: TableDensity;
  onChange: (density: TableDensity) => void;
  className?: string;
}

export const DataTableDensityToggle: React.FC<DataTableDensityToggleProps> = ({
  density,
  onChange,
  className,
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center p-0.5 rounded-lg border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#1E1C26]',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange('comfortable')}
        title="Comfortable density (52px)"
        aria-label="Comfortable density"
        className={cn(
          'p-1.5 rounded-[6px] transition-colors cursor-pointer',
          density === 'comfortable'
            ? 'bg-[#34303F] text-white dark:bg-[#2B2A36]'
            : 'text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
        )}
      >
        <AlignJustify className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange('compact')}
        title="Compact density (40px)"
        aria-label="Compact density"
        className={cn(
          'p-1.5 rounded-[6px] transition-colors cursor-pointer',
          density === 'compact'
            ? 'bg-[#34303F] text-white dark:bg-[#2B2A36]'
            : 'text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
        )}
      >
        <List className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
