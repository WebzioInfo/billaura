import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/shared/components/ui/Checkbox';

export interface ZohoColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  isNumeric?: boolean;
  isPrimary?: boolean; // if true, renders with blue link styling
  emptyFallback?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface ZohoBulkAction {
  label: string;
  onClick: (selectedIds: string[]) => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'danger';
}

export interface ZohoPaginationConfig {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface ZohoListTableProps<T> {
  columns: ZohoColumn<T>[];
  data: T[];
  keyField?: keyof T | ((row: T) => string);
  selectedIds?: string[];
  onSelectChange?: (selectedIds: string[]) => void;
  onRowClick?: (row: T) => void;
  bulkActions?: ZohoBulkAction[];
  pagination?: ZohoPaginationConfig;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onColumnChooserClick?: () => void;
  searchPlaceholder?: string;
  onSearchChange?: (val: string) => void;
  className?: string;
}

export function ZohoListTable<T>({
  columns,
  data,
  keyField = 'id' as any,
  selectedIds = [],
  onSelectChange,
  onRowClick,
  bulkActions,
  pagination,
  isLoading = false,
  emptyState,
  onColumnChooserClick,
  searchPlaceholder = 'Search in list...',
  onSearchChange,
  className,
}: ZohoListTableProps<T>) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const getRowKey = (row: T, index: number): string => {
    if (typeof keyField === 'function') {
      return keyField(row);
    }
    const val = (row as any)[keyField];
    return val !== undefined && val !== null ? String(val) : String(index);
  };

  const isAllSelected =
    data.length > 0 &&
    data.every((row, idx) => selectedIds.includes(getRowKey(row, idx)));
  const isSomeSelected = selectedIds.length > 0;

  const handleSelectAll = () => {
    if (!onSelectChange) return;
    if (isAllSelected) {
      onSelectChange([]);
    } else {
      const allIds = data.map((row, idx) => getRowKey(row, idx));
      onSelectChange(allIds);
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectChange) return;
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectChange([...selectedIds, id]);
    }
  };

  const handleSearchSubmit = (val: string) => {
    setSearchValue(val);
    if (onSearchChange) onSearchChange(val);
  };

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col bg-white border border-[#E5E7EB] rounded-[4px] overflow-hidden select-none',
        className
      )}
    >
      {/* 1. Header (Swaps with Bulk Action Bar when items selected) */}
      <div className="shrink-0 bg-[#F8F9FB] border-b border-[#E5E7EB] z-10">
        {isSomeSelected && bulkActions && bulkActions.length > 0 ? (
          /* Bulk Action Bar */
          <div className="flex items-center justify-between px-3 h-10 bg-[#EDF2F7] text-xs">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                className="w-3.5 h-3.5 rounded-[2px] border-[#CBD5E1] text-[#408DFB] focus:ring-0 cursor-pointer"
              />
              <span className="font-semibold text-[#2B2F36]">
                {selectedIds.length} Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              {bulkActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => action.onClick(selectedIds)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-medium cursor-pointer transition-colors',
                      action.variant === 'danger'
                        ? 'text-[#E54B4B] hover:bg-[#FEF2F2] border-[#FCA5A5]'
                        : 'text-[#2B2F36] hover:bg-[#F8F9FB]'
                    )}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{action.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => onSelectChange && onSelectChange([])}
                className="p-1 text-[#6B7280] hover:text-[#2B2F36] rounded cursor-pointer"
                title="Deselect All"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Standard Fixed Table Header (36px, #F9FAFB, 11px uppercase weight 600 #6B7280) */
          <div className="flex items-center text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider h-9 px-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
            {/* Column Chooser Icon + Select All Checkbox */}
            <div className="flex items-center gap-2 w-12 shrink-0">
              {onColumnChooserClick && (
                <button
                  type="button"
                  onClick={onColumnChooserClick}
                  className="p-1 text-[#6B7280] hover:text-[#408DFB] rounded-[2px] cursor-pointer"
                  title="Customize Columns"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              )}
              {onSelectChange && (
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={!isAllSelected && isSomeSelected}
                  onChange={handleSelectAll}
                />
              )}
            </div>

            {/* Dynamic Columns */}
            <div className="flex-1 flex items-center min-w-0 pr-8">
              {columns.map((col) => (
                <div
                  key={col.key}
                  style={{ width: col.width || 'auto' }}
                  className={cn(
                    'px-3 truncate select-none',
                    !col.width && 'flex-1',
                    col.align === 'right' || col.isNumeric
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  )}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Far Right Search Toggle */}
            <div className="w-8 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSearchActive(!isSearchActive)}
                className={cn(
                  'p-1 text-[#6B7280] hover:text-[#408DFB] transition-colors rounded-[2px] cursor-pointer',
                  isSearchActive && 'text-[#408DFB]'
                )}
                title="Search Table"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Expandable in-table search bar */}
        {isSearchActive && (
          <div className="px-3 py-2 border-t border-[#E5E7EB] bg-white flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchValue}
              onChange={(e) => handleSearchSubmit(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-xs text-[#2B2F36] placeholder-[#9CA3AF] bg-transparent outline-none"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => handleSearchSubmit('')}
                className="text-[#6B7280] hover:text-[#2B2F36] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Scrollable Rows Container (Only rows scroll, thin scrollbar) */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 divide-y divide-[#E5E7EB] bg-white">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#6B7280]">
            <div className="inline-block w-5 h-5 border-2 border-[#408DFB] border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading records...</p>
          </div>
        ) : data.length === 0 ? (
          emptyState || (
            <div className="p-16 text-center text-xs text-[#6B7280]">
              No records found.
            </div>
          )
        ) : (
          data.map((row, index) => {
            const rowKey = getRowKey(row, index);
            const isSelected = selectedIds.includes(rowKey);

            return (
              <div
                key={rowKey}
                onClick={() => onRowClick && onRowClick(row)}
                className={cn(
                  'group flex items-center px-3 min-h-[41px] text-[13px] font-normal text-[#2B2F36] transition-colors cursor-pointer select-none',
                  isSelected
                    ? 'bg-[#F0F5FF]'
                    : 'hover:bg-[#F5F7FA]'
                )}
              >
                {/* Row Select Checkbox */}
                <div
                  className="flex items-center gap-2 w-12 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="w-3.5" />
                  {onSelectChange && (
                    <Checkbox
                      checked={isSelected}
                      onChange={(checked, e) => handleSelectRow(rowKey, e as any)}
                    />
                  )}
                </div>

                {/* Row Data Columns */}
                <div className="flex-1 flex items-center min-w-0 pr-8">
                  {columns.map((col) => {
                    const cellContent = col.render
                      ? col.render(row, index)
                      : (row as any)[col.key];

                    const displayContent =
                      cellContent !== null && cellContent !== undefined && cellContent !== ''
                        ? cellContent
                        : (col.emptyFallback !== undefined ? col.emptyFallback : '');

                    return (
                      <div
                        key={col.key}
                        style={{ width: col.width || 'auto' }}
                        className={cn(
                          'px-3 truncate',
                          !col.width && 'flex-1',
                          col.align === 'right' || col.isNumeric
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left',
                          col.isPrimary && 'text-[#408DFB] hover:underline'
                        )}
                      >
                        {displayContent}
                      </div>
                    );
                  })}
                </div>

                {/* Row-End Small Blue Circular Chevron on Hover */}
                <div className="w-8 shrink-0 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 rounded-full bg-[#EBF3FF] flex items-center justify-center text-[#408DFB]">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Fixed Bottom Pagination Bar (Total, Per page, Page x of y) */}
      {pagination && (
        <div className="shrink-0 flex items-center justify-between px-4 h-10 bg-[#F8F9FB] border-t border-[#E5E7EB] text-[12px] text-[#6B7280]">
          {/* Left: Total Count and Page Size */}
          <div className="flex items-center gap-4">
            <span>
              Total: <span className="font-medium text-[#2B2F36]">{pagination.totalCount}</span>
            </span>

            {pagination.onPageSizeChange && (
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) =>
                    pagination.onPageSizeChange &&
                    pagination.onPageSizeChange(Number(e.target.value))
                  }
                  className="bg-white border border-[#CBD5E1] rounded-[4px] px-2 py-0.5 text-[12px] text-[#2B2F36] focus:outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>

          {/* Right: Page Navigation */}
          <div className="flex items-center gap-2">
            <span>
              Page <span className="font-medium text-[#2B2F36]">{pagination.currentPage}</span> of{' '}
              {Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.currentPage <= 1}
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                className="p-1 rounded-[4px] border border-[#CBD5E1] bg-white text-[#2B2F36] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={
                  pagination.currentPage >=
                  Math.ceil(pagination.totalCount / pagination.pageSize)
                }
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                className="p-1 rounded-[4px] border border-[#CBD5E1] bg-white text-[#2B2F36] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
