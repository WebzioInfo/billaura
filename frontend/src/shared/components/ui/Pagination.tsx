import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: (number | 'all')[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  entityName?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel,
  entityName,
  className,
}) => {
  const displayLabel = entityName || itemLabel || 'records';
  const isAll = pageSize >= (totalItems || 1) && pageSize >= 500;
  const startItem = totalItems === 0 ? 0 : isAll ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = isAll ? totalItems : Math.min(currentPage * pageSize, totalItems);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && currentPage > 1) {
      e.preventDefault();
      onPageChange(currentPage - 1);
    } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
      e.preventDefault();
      onPageChange(currentPage + 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onPageChange(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      onPageChange(totalPages);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="navigation"
      aria-label="Pagination"
      className={cn(
        'h-14 border-t border-[#EEEEEE] dark:border-[#26262A] px-6 flex items-center justify-between text-[14px] select-none bg-surface dark:bg-[#17161C] focus:outline-none shrink-0 transition-colors',
        className
      )}
    >
      {/* Left: "Showing 1-25 of 27 records" */}
      <div className="text-[#555555] dark:text-[#A1A1AA] font-normal tabular-nums text-[13px] sm:text-[14px]">
        <div className="sr-only" aria-live="polite">
          Showing {startItem} to {endItem} of {totalItems} {displayLabel}
        </div>
        {totalItems > 0 ? (
          <span>
            Showing <strong className="font-medium text-[#111827] dark:text-[#EDEDED]">{startItem}–{endItem}</strong> of{' '}
            <strong className="font-medium text-[#111827] dark:text-[#EDEDED]">{totalItems}</strong> {displayLabel}
          </span>
        ) : (
          <span>Showing 0 of 0 {displayLabel}</span>
        )}
      </div>

      {/* Right: Page size select + Page controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-[#555555] dark:text-[#A1A1AA]">
          <span className="hidden md:inline text-[13px]">Rows per page</span>
          <select
            value={pageSize >= 10000 ? 'all' : pageSize}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all') {
                onPageSizeChange(totalItems > 0 ? Math.max(totalItems, 10000) : 10000);
              } else {
                onPageSizeChange(Number(val));
              }
            }}
            className="h-8 px-2 rounded-[6px] bg-transparent border border-[#D1D5DB] dark:border-[#374151] text-[#111827] dark:text-[#EDEDED] text-[13px] font-medium focus:outline-none cursor-pointer"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-surface text-foreground">
                {opt === 'all' ? 'All' : opt}
              </option>
            ))}
          </select>
        </div>

        {/* Compact page navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#555555] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#26262A] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#555555] cursor-pointer disabled:cursor-not-allowed transition-colors duration-120"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-6 h-8 flex items-center justify-center text-[#9CA3AF] text-[13px]"
                  >
                    …
                  </span>
                );
              }

              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'w-8 h-8 rounded-[8px] text-[13px] font-medium transition-colors duration-120 cursor-pointer flex items-center justify-center tabular-nums',
                    isActive
                      ? 'bg-[#34303F] text-white dark:bg-[#1E1C26] dark:text-white shadow-xs'
                      : 'text-[#555555] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#26262A]'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Page ${p}`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#555555] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#26262A] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#555555] cursor-pointer disabled:cursor-not-allowed transition-colors duration-120"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
