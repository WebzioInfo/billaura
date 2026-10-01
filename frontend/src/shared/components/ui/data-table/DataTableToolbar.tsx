import React from 'react';
import { Search, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTableDensityToggle, TableDensity } from './DataTableDensityToggle';
import { DataTableColumnToggle, ColumnItem } from './DataTableColumnToggle';

export interface DataTableToolbarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filterTabs?: React.ReactNode;
  filterDropdowns?: React.ReactNode;
  columns?: ColumnItem[];
  onColumnToggle?: (id: string) => void;
  onColumnReset?: () => void;
  density?: TableDensity;
  onDensityChange?: (density: TableDensity) => void;
  onExport?: () => void;
  exportLabel?: string;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  className?: string;
}

export const DataTableToolbar: React.FC<DataTableToolbarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterTabs,
  filterDropdowns,
  columns,
  onColumnToggle,
  onColumnReset,
  density,
  onDensityChange,
  onExport,
  exportLabel = 'Export',
  primaryAction,
  secondaryActions,
  className,
}) => {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 py-1', className)}>
      {/* Left: Search input + custom dropdowns */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
        {onSearchChange !== undefined && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#9CA3AF] pointer-events-none" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-9 pl-9 pr-3 text-xs bg-white dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-lg text-[#1F2937] dark:text-[#EDEDED] placeholder-[#6B7280] dark:placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#34303F] dark:focus:ring-white transition-colors"
            />
          </div>
        )}

        {filterTabs}
        {filterDropdowns}
      </div>

      {/* Right: Controls & actions */}
      <div className="flex items-center gap-2 shrink-0">
        {secondaryActions}

        {density && onDensityChange && (
          <DataTableDensityToggle density={density} onChange={onDensityChange} />
        )}

        {columns && onColumnToggle && (
          <DataTableColumnToggle
            columns={columns}
            onToggle={onColumnToggle}
            onReset={onColumnReset}
          />
        )}

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="h-9 px-3 text-xs font-medium border border-[#D1D5DB] dark:border-[#374151] rounded-lg bg-white dark:bg-[#1E1C26] text-[#1F2937] dark:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#2B2A36] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />
            <span>{exportLabel}</span>
          </button>
        )}

        {primaryAction}
      </div>
    </div>
  );
};
