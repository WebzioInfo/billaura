import React, { useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal, Download, Bell, CheckSquare, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatusTabItem {
  id: string;
  label: string;
  count?: number;
}

export interface ActiveFilterChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusTabs: StatusTabItem[];
  activeStatus: string;
  onStatusChange: (statusId: string) => void;
  documentTypes?: Array<{ value: string; label: string }>;
  activeDocType?: string;
  onDocTypeChange?: (docType: string) => void;
  datePresets?: Array<{ id: string; label: string }>;
  activeDatePreset?: string;
  onDatePresetChange?: (presetId: string) => void;
  onOpenMoreFilters: () => void;
  moreFiltersCount?: number;
  activeFilters?: ActiveFilterChip[];
  onClearAllFilters?: () => void;
  columnVisibilityTrigger?: React.ReactNode;
  selectedCount?: number;
  onBulkDownloadPdf?: () => void;
  onBulkSendReminder?: () => void;
  onBulkMarkPaid?: () => void;
  onClearSelection?: () => void;
  density?: 'comfortable' | 'compact';
  onDensityChange?: (density: 'comfortable' | 'compact') => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search invoice or customer...',
  statusTabs,
  activeStatus,
  onStatusChange,
  documentTypes,
  activeDocType = '',
  onDocTypeChange,
  datePresets,
  activeDatePreset = '',
  onDatePresetChange,
  onOpenMoreFilters,
  moreFiltersCount = 0,
  activeFilters = [],
  onClearAllFilters,
  columnVisibilityTrigger,
  selectedCount = 0,
  onBulkDownloadPdf,
  onBulkSendReminder,
  onBulkMarkPaid,
  onClearSelection,
  density = 'comfortable',
  onDensityChange,
  className,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      {selectedCount > 0 ? (
        /* Slim Bulk Action Bar replacing toolbar */
        <div className="h-9 px-3 rounded-[8px] border border-[#D1D5DB] dark:border-[#374151] bg-[#ECECF1] dark:bg-[#2B2A36] flex items-center justify-between text-[13px] select-none animate-in fade-in duration-100">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#1F2937] dark:text-[#EDEDED] tabular-nums">
              {selectedCount} selected
            </span>
            <span className="text-[#9CA3AF]">·</span>
            {onBulkDownloadPdf && (
              <button
                type="button"
                onClick={onBulkDownloadPdf}
                className="text-[#1F2937] dark:text-[#EDEDED] hover:underline flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <Download className="w-3.5 h-3.5 text-[#4B5563]" />
                <span>Download PDFs</span>
              </button>
            )}
            <span className="text-[#9CA3AF]">·</span>
            {onBulkSendReminder && (
              <button
                type="button"
                onClick={onBulkSendReminder}
                className="text-[#1F2937] dark:text-[#EDEDED] hover:underline flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <Bell className="w-3.5 h-3.5 text-[#4B5563]" />
                <span>Send reminder</span>
              </button>
            )}
            <span className="text-[#9CA3AF]">·</span>
            {onBulkMarkPaid && (
              <button
                type="button"
                onClick={onBulkMarkPaid}
                className="text-[#1F2937] dark:text-[#EDEDED] hover:underline flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#4B5563]" />
                <span>Mark paid</span>
              </button>
            )}
          </div>

          {onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#1F2937] dark:hover:text-[#EDEDED] text-[12px] font-medium cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      ) : (
        /* Standard Single Row Toolbar (36px controls) */
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2 h-auto xl:h-9">
          {/* Left: Search input */}
          <div className="relative w-full xl:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-8 h-9 text-[13px] bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] text-[#1F2937] dark:text-[#EDEDED] placeholder:text-[#6B7280] focus:outline-none focus:border-[#34303F] dark:focus:border-[#EDEDED] transition-colors duration-120"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
              {search ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="text-[#6B7280] hover:text-[#1F2937] dark:hover:text-[#EDEDED] cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="text-[10px] font-mono text-[#6B7280] select-none">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Center: Status Tabs as Simple Text Tabs with counts */}
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide py-1 xl:py-0 select-none">
            {statusTabs.map((tab) => {
              const isActive = activeStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStatusChange(tab.id)}
                  className={cn(
                    'relative h-9 px-1 text-[13px] transition-colors duration-120 whitespace-nowrap cursor-pointer flex items-center gap-1.5 select-none',
                    isActive
                      ? 'text-[#111827] dark:text-[#EDEDED] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#34303F] dark:after:bg-[#EDEDED]'
                      : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#EDEDED] font-normal'
                  )}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] tabular-nums font-normal">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Selects & Menus (36px, 8px radius, ghost outline) */}
          <div className="flex items-center gap-2 shrink-0">
            {documentTypes && onDocTypeChange && (
              <select
                value={activeDocType}
                onChange={(e) => onDocTypeChange(e.target.value)}
                className="h-9 px-2.5 text-[12px] font-medium bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] text-[#1F2937] dark:text-[#EDEDED] focus:outline-none cursor-pointer"
                aria-label="Filter by document type"
              >
                {documentTypes.map((t) => (
                  <option key={t.value} value={t.value} className="bg-surface text-foreground">
                    {t.label}
                  </option>
                ))}
              </select>
            )}

            {datePresets && onDatePresetChange && (
              <select
                value={activeDatePreset}
                onChange={(e) => onDatePresetChange(e.target.value)}
                className="h-9 px-2.5 text-[12px] font-medium bg-surface dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-[8px] text-[#1F2937] dark:text-[#EDEDED] focus:outline-none cursor-pointer"
                aria-label="Filter by date"
              >
                <option value="" className="bg-surface text-foreground">All Dates</option>
                {datePresets.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-foreground">
                    {p.label}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={onOpenMoreFilters}
              className="h-9 px-2.5 rounded-[8px] border border-[#D1D5DB] dark:border-[#374151] bg-surface dark:bg-[#1E1C26] text-[#1F2937] dark:text-[#EDEDED] text-[12px] font-medium hover:bg-[#F3F4F6] dark:hover:bg-[#26262A] flex items-center gap-1.5 cursor-pointer transition-colors duration-120"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#4B5563]" />
              <span className="hidden sm:inline">Filters</span>
              {moreFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#34303F] text-white dark:bg-[#EDEDED] dark:text-[#0A0A0A] text-[10px] font-semibold flex items-center justify-center">
                  {moreFiltersCount}
                </span>
              )}
            </button>

            {/* Density Toggle (Comfortable / Compact) */}
            {onDensityChange && (
              <button
                type="button"
                onClick={() => onDensityChange(density === 'compact' ? 'comfortable' : 'compact')}
                className="h-9 px-2.5 rounded-[8px] border border-[#D1D5DB] dark:border-[#374151] bg-surface dark:bg-[#1E1C26] text-[#1F2937] dark:text-[#EDEDED] text-[12px] font-medium hover:bg-[#F3F4F6] dark:hover:bg-[#26262A] flex items-center gap-1.5 cursor-pointer transition-colors duration-120"
                title={`Switch to ${density === 'compact' ? 'Comfortable' : 'Compact'} density`}
                aria-label="Toggle density"
              >
                {density === 'compact' ? (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-[#4B5563]" />
                    <span className="hidden lg:inline">Comfortable</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-[#4B5563]" />
                    <span className="hidden lg:inline">Compact</span>
                  </>
                )}
              </button>
            )}

            {/* Single Columns / View Menu */}
            {columnVisibilityTrigger}
          </div>
        </div>
      )}

      {/* Active Filter Chips beneath toolbar */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[12px]">
          {activeFilters.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] bg-[#ECECF1] dark:bg-[#2B2A36] border border-[#D1D5DB] dark:border-[#374151] text-[#1F2937] dark:text-[#EDEDED]"
            >
              <span className="text-[#4B5563] dark:text-[#A1A1AA]">{chip.label}:</span>
              <span className="font-medium">{chip.value}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="text-[#6B7280] hover:text-[#1F2937] dark:hover:text-[#EDEDED] cursor-pointer ml-0.5"
                title={`Remove ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {onClearAllFilters && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="text-[12px] text-[#4B5563] hover:text-[#111827] dark:hover:text-[#EDEDED] underline ml-1 cursor-pointer font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};
