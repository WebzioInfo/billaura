import { useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UsePaginationOptions<T> {
  tableKey?: string;
  defaultLimit?: number;
  data?: T[];
  totalItems?: number;
  itemLabel?: string;
  onPageChangeEffect?: (page: number) => void;
}

export interface UsePaginationReturn<T> {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  setPage: (newPage: number) => void;
  setLimit: (newLimit: number) => void;
  resetPage: () => void;
  paginatedData: T[];
  paginationProps: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (newPage: number) => void;
    onPageSizeChange: (newLimit: number) => void;
    itemLabel?: string;
  };
}

export function usePagination<T = any>(options: UsePaginationOptions<T> = {}): UsePaginationReturn<T> {
  const {
    tableKey = 'default',
    defaultLimit = 25,
    data,
    totalItems: externalTotal,
    itemLabel,
    onPageChangeEffect,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Read saved limit from localStorage or fallback
  const getStoredLimit = useCallback((): number => {
    try {
      const stored = localStorage.getItem(`billaura_limit_${tableKey}`);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if ([10, 25, 50, 100].includes(parsed)) {
          return parsed;
        }
      }
    } catch {
      // localStorage may fail in private mode
    }
    return defaultLimit;
  }, [tableKey, defaultLimit]);

  // Current page from URL params
  const paramPage = parseInt(searchParams.get('page') || '1', 10);
  const rawPage = isNaN(paramPage) || paramPage < 1 ? 1 : paramPage;

  // Current limit from URL params or localStorage
  const paramLimit = parseInt(searchParams.get('limit') || '', 10);
  const limit = !isNaN(paramLimit) && [10, 25, 50, 100].includes(paramLimit)
    ? paramLimit
    : getStoredLimit();

  // Determine total items (from server total or local data array)
  const isServerSide = externalTotal !== undefined;
  const totalItems = isServerSide ? (externalTotal ?? 0) : (data?.length ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  // Clamp page if it exceeds total pages (e.g. after filtering or deletion)
  const page = totalItems > 0 && rawPage > totalPages ? totalPages : rawPage;

  // If clamped page differs from URL, update URL quietly
  useEffect(() => {
    if (totalItems > 0 && rawPage > totalPages) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('page', String(totalPages));
        return next;
      }, { replace: true });
    }
  }, [totalItems, rawPage, totalPages, setSearchParams]);

  // Scroll to top of table on page change
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Attempt to scroll table container or top
    const tableContainer = document.querySelector('[data-table-scroll-container]');
    if (tableContainer) {
      tableContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    onPageChangeEffect?.(page);
  }, [page, onPageChangeEffect]);

  const setPage = useCallback((newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(validPage));
      return next;
    });
  }, [totalPages, setSearchParams]);

  const setLimit = useCallback((newLimit: number) => {
    try {
      localStorage.setItem(`billaura_limit_${tableKey}`, String(newLimit));
    } catch {
      // Ignore storage errors
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('limit', String(newLimit));
      next.set('page', '1'); // Reset to page 1 on limit change
      return next;
    });
  }, [tableKey, setSearchParams]);

  const resetPage = useCallback(() => {
    setSearchParams(prev => {
      if (prev.get('page') === '1') return prev;
      const next = new URLSearchParams(prev);
      next.set('page', '1');
      return next;
    });
  }, [setSearchParams]);

  // Client-side pagination data slicing (TODO: API should eventually support server-side pagination for all tables)
  const paginatedData = useMemo(() => {
    if (!data) return [];
    if (isServerSide) {
      // Server returned page slice already
      return data;
    }
    // Client-side slice
    const startIndex = (page - 1) * limit;
    return data.slice(startIndex, startIndex + limit);
  }, [data, isServerSide, page, limit]);

  return {
    page,
    limit,
    totalPages,
    totalItems,
    setPage,
    setLimit,
    resetPage,
    paginatedData,
    paginationProps: {
      currentPage: page,
      totalPages,
      totalItems,
      pageSize: limit,
      onPageChange: setPage,
      onPageSizeChange: setLimit,
      itemLabel,
    },
  };
}
