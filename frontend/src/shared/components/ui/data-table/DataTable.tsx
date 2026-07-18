import React, { useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../Table';
import { Button } from '../Button';
import { Input } from '../Input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Settings2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as xlsx from 'xlsx';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string; // which column id to use for the global search filter
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
  searchPlaceholder?: string;
  totalItems?: number;
  toolbarExtras?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  exportFilename = 'export',
  onRowClick,
  pageCount,
  pagination,
  onPaginationChange,
  manualPagination,
  globalFilter: controlledGlobalFilter,
  onGlobalFilterChange,
  manualFiltering,
  emptyText,
  searchPlaceholder,
  totalItems,
  toolbarExtras,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
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
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      ...(pagination ? { pagination } : {}),
    },
  });

  const handleExport = () => {
    // Generate simple export from rows
    const rows = table.getFilteredRowModel().rows.map(row => {
      const obj: any = {};
      row.getVisibleCells().forEach(cell => {
        if (cell.column.id !== 'actions' && cell.column.id !== 'select') {
          obj[cell.column.columnDef.header as string] = cell.getValue();
        }
      });
      return obj;
    });
    
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    xlsx.writeFile(workbook, `${exportFilename}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between py-1.5 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1">
          {searchKey ? (
            <Input
              placeholder={searchPlaceholder || `Filter ${searchKey}...`}
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="max-w-xs"
            />
          ) : null}
          {toolbarExtras}
        </div>
        <div className="flex items-center space-x-1.5">
          <Button variant="outline" size="sm" onClick={handleExport} className="whitespace-nowrap">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
          
          {/* Column Visibility Dropdown could go here */}
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            <Settings2 className="mr-1.5 h-3.5 w-3.5" /> View
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-md border border-border bg-surface overflow-auto max-h-[calc(100vh-250px)] relative">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5 px-4 h-[44px]">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyText || "No results found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between px-2 pt-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {totalItems !== undefined ? (
            <>
              Showing {Math.min((table.getState().pagination.pageIndex * table.getState().pagination.pageSize) + 1, totalItems)}–{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, totalItems)} of {totalItems} total
            </>
          ) : (
            <>
              {table.getFilteredSelectedRowModel().rows.length} of{' '}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </>
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              className="h-8 w-[70px] rounded-md border border-border bg-transparent text-sm"
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
            >
              {[20, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
