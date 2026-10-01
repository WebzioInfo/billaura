import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as xlsx from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../Table';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTablePagination } from './DataTablePagination';
import { DataTableBulkBar, BulkAction } from './DataTableBulkBar';
import { DataTableEmpty } from './DataTableEmpty';
import { DataTableSkeleton } from './DataTableSkeleton';
import { DataTableError } from './DataTableError';
import { TableDensity } from './DataTableDensityToggle';
import { ColumnItem } from './DataTableColumnToggle';

export interface DataTableProps<TData, TValue = any> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  exportFilename?: string;
  onRowClick?: (row: TData) => void;
  pageCount?: number;
  pagination?: { pageIndex: number; pageSize: number };
  onPaginationChange?: any;
  manualPagination?: boolean;
  globalFilter?: string;
  onGlobalFilterChange?: (val: string) => void;
  manualFiltering?: boolean;
  emptyText?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  totalItems?: number;
  toolbarExtras?: React.ReactNode;
  primaryAction?: React.ReactNode;
  filterTabs?: React.ReactNode;
  filterDropdowns?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  storageKey?: string;
  defaultDensity?: TableDensity;
  embedded?: boolean;
  enableRowSelection?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  bulkActions?: BulkAction[];
  containerClassName?: string;
  showToolbar?: boolean;
  showPagination?: boolean;
  totalRow?: React.ReactNode;
  itemLabel?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  exportFilename = 'export',
  onRowClick,
  pageCount,
  pagination,
  onPaginationChange,
  manualPagination,
  globalFilter: controlledGlobalFilter,
  onGlobalFilterChange,
  manualFiltering,
  emptyText = 'No records found',
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  totalItems,
  toolbarExtras,
  primaryAction,
  filterTabs,
  filterDropdowns,
  isLoading = false,
  error = null,
  onRetry,
  storageKey,
  defaultDensity = 'comfortable',
  embedded = false,
  enableRowSelection = false,
  selectedIds,
  onSelectedIdsChange,
  bulkActions = [],
  containerClassName = '',
  showToolbar = true,
  showPagination = true,
  totalRow,
  itemLabel,
}: DataTableProps<TData, TValue>) {
  // Density state (persisted per storageKey if available)
  const densityKey = storageKey ? `datatable_density_${storageKey}` : null;
  const [density, setDensity] = useState<TableDensity>(() => {
    if (densityKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(densityKey);
      if (saved === 'compact' || saved === 'comfortable') return saved;
    }
    return defaultDensity;
  });

  const handleDensityChange = (d: TableDensity) => {
    setDensity(d);
    if (densityKey && typeof window !== 'undefined') {
      localStorage.setItem(densityKey, d);
    }
  };

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] = useState({});
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');

  const globalFilter = controlledGlobalFilter !== undefined ? controlledGlobalFilter : internalGlobalFilter;
  const setGlobalFilter = onGlobalFilterChange || setInternalGlobalFilter;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination,
    manualFiltering,
    pageCount,
    onPaginationChange,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setInternalRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection: internalRowSelection,
      globalFilter,
      ...(pagination ? { pagination } : {}),
    },
  });

  // Extract toggleable columns for toolbar
  const toggleableColumns: ColumnItem[] = useMemo(() => {
    return table
      .getAllLeafColumns()
      .filter((col) => col.id !== 'actions' && col.id !== 'select')
      .map((col) => ({
        id: col.id,
        label: typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id,
        visible: col.getIsVisible(),
      }));
  }, [table, columnVisibility]);

  const handleToggleColumn = (id: string) => {
    const col = table.getColumn(id);
    if (col) {
      col.toggleVisibility(!col.getIsVisible());
    }
  };

  const handleResetColumns = () => {
    table.resetColumnVisibility();
  };

  // Export handler
  const handleExport = () => {
    const rows = table.getFilteredRowModel().rows.map((row) => {
      const obj: any = {};
      row.getVisibleCells().forEach((cell) => {
        if (cell.column.id !== 'actions' && cell.column.id !== 'select') {
          const headerName =
            typeof cell.column.columnDef.header === 'string'
              ? cell.column.columnDef.header
              : cell.column.id;
          obj[headerName] = cell.getValue();
        }
      });
      return obj;
    });

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    xlsx.writeFile(workbook, `${exportFilename}.xlsx`);
  };

  // Pagination metrics
  const currentPageIndex = pagination ? pagination.pageIndex : table.getState().pagination.pageIndex;
  const currentPageSize = pagination ? pagination.pageSize : table.getState().pagination.pageSize;
  const calculatedTotalItems = totalItems !== undefined ? totalItems : table.getFilteredRowModel().rows.length;
  const calculatedTotalPages = pageCount !== undefined ? pageCount : table.getPageCount();

  const handlePageChange = (newPage: number) => {
    if (onPaginationChange) {
      onPaginationChange({ pageIndex: newPage - 1, pageSize: currentPageSize });
    } else {
      table.setPageIndex(newPage - 1);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (onPaginationChange) {
      onPaginationChange({ pageIndex: 0, pageSize: newSize });
    } else {
      table.setPageSize(newSize);
    }
  };

  // Selection metrics
  const selectedCount = selectedIds ? selectedIds.length : Object.keys(internalRowSelection).length;
  const handleClearSelection = () => {
    if (onSelectedIdsChange) onSelectedIdsChange([]);
    setInternalRowSelection({});
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full gap-3">
      {/* TOOLBAR */}
      {showToolbar && (
        <DataTableToolbar
          searchQuery={searchKey ? (globalFilter ?? '') : undefined}
          onSearchChange={searchKey ? setGlobalFilter : undefined}
          searchPlaceholder={searchPlaceholder || `Search ${searchKey || 'records'}...`}
          filterTabs={filterTabs}
          filterDropdowns={
            <>
              {filterDropdowns}
              {toolbarExtras}
            </>
          }
          columns={toggleableColumns.length > 0 ? toggleableColumns : undefined}
          onColumnToggle={handleToggleColumn}
          onColumnReset={handleResetColumns}
          density={density}
          onDensityChange={handleDensityChange}
          onExport={handleExport}
          exportLabel="Export"
          primaryAction={primaryAction}
        />
      )}

      {/* TABLE CONTAINER */}
      <div
        className={cn(
          'w-full flex-1 min-h-0 overflow-hidden bg-white dark:bg-[#17161C] border border-[#E8E8EC] dark:border-[#2A2933] flex flex-col',
          embedded ? 'rounded-lg border-opacity-80' : 'rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)]',
          containerClassName
        )}
      >
        <div data-table-scroll-container className="flex-1 min-h-0 overflow-auto relative">
          {isLoading ? (
            <DataTableSkeleton rows={currentPageSize || 10} density={density} />
          ) : error ? (
            <DataTableError message={error} onRetry={onRetry} />
          ) : table.getRowModel().rows.length === 0 ? (
            <DataTableEmpty
              title={emptyText}
              description={emptyDescription}
              actionLabel={emptyActionLabel}
              onAction={onEmptyAction}
            />
          ) : (
            <table className="w-full text-left border-collapse text-[14px]">
              <thead
                className={cn(
                  'sticky top-0 bg-[#34303F] dark:bg-[#1E1C26] text-white font-medium z-20 select-none shadow-xs',
                  density === 'compact' ? 'h-10 text-[13px]' : 'h-14 text-[14px]'
                )}
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isSortable = header.column.getCanSort();
                      const isSorted = header.column.getIsSorted();

                      return (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                          className={cn(
                            'py-3 px-4 font-medium text-white whitespace-nowrap text-[14px]',
                            header.id === 'actions' && 'sticky right-0 z-20 bg-[#34303F] dark:bg-[#1E1C26] text-right',
                            header.id === 'select' && 'sticky left-0 z-20 bg-[#34303F] dark:bg-[#1E1C26] w-12 text-center',
                            isSortable && 'cursor-pointer hover:text-white/90 select-none group'
                          )}
                          aria-sort={isSorted ? (isSorted === 'asc' ? 'ascending' : 'descending') : undefined}
                        >
                          <div className={cn('flex items-center gap-1.5', header.id === 'actions' && 'justify-end')}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                            {isSortable && (
                              <span
                                className={cn(
                                  'transition-opacity',
                                  isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
                                )}
                              >
                                {isSorted === 'desc' ? (
                                  <ChevronDown className="w-4 h-4 text-white" />
                                ) : (
                                  <ChevronUp className="w-4 h-4 text-white" />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-none text-[14px]">
                {table.getRowModel().rows.map((row, rowIdx) => {
                  const isEven = rowIdx % 2 === 1;
                  const isSelected = row.getIsSelected();

                  // Row background classes for zebra + hover + selected
                  const rowBgClass = isSelected
                    ? 'bg-[#ECECF1] dark:bg-[#2B2A36]'
                    : isEven
                    ? 'bg-[#F5F5F5] dark:bg-[#1C1B22] hover:bg-[#EFEFF1] dark:hover:bg-[#24232C]'
                    : 'bg-white dark:bg-[#17161C] hover:bg-[#EFEFF1] dark:hover:bg-[#24232C]';

                  // Sticky cell background classes to keep zebra pattern seamless
                  const stickyCellBgClass = isSelected
                    ? 'bg-[#ECECF1] dark:bg-[#2B2A36]'
                    : isEven
                    ? 'bg-[#F5F5F5] dark:bg-[#1C1B22] group-hover:bg-[#EFEFF1] dark:group-hover:bg-[#24232C]'
                    : 'bg-white dark:bg-[#17161C] group-hover:bg-[#EFEFF1] dark:group-hover:bg-[#24232C]';

                  return (
                    <tr
                      key={row.id}
                      onClick={() => onRowClick && onRowClick(row.original)}
                      className={cn(
                        'group transition-colors duration-120 text-[14px]',
                        density === 'compact' ? 'h-10' : 'h-[52px]',
                        rowBgClass,
                        onRowClick && 'cursor-pointer'
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isActionCol = cell.column.id === 'actions';
                        const isSelectCol = cell.column.id === 'select';

                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              'px-4 py-2 text-[14px] text-[#555555] dark:text-[#A1A1AA]',
                              isActionCol && 'sticky right-0 z-10 text-right',
                              isSelectCol && 'sticky left-0 z-10 text-center w-12',
                              (isActionCol || isSelectCol) && stickyCellBgClass
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {totalRow}
              </tbody>
            </table>
          )}
        </div>

        {/* PINNED PAGINATION FOOTER */}
        {showPagination && !isLoading && !error && table.getRowModel().rows.length > 0 && (
          <DataTablePagination
            currentPage={currentPageIndex + 1}
            totalPages={calculatedTotalPages}
            totalItems={calculatedTotalItems}
            pageSize={currentPageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            itemLabel={itemLabel}
          />
        )}
      </div>

      {/* FLOATING BULK BAR */}
      <DataTableBulkBar
        selectedCount={selectedCount}
        onClear={handleClearSelection}
        actions={bulkActions}
      />
    </div>
  );
}
