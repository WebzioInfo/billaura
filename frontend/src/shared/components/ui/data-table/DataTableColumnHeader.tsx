import React from 'react';
import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../Button';

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn('text-[14px] font-medium text-white', className)}>{title}</div>;
  }

  const isSorted = column.getIsSorted();

  return (
    <div
      className={cn('inline-flex items-center gap-1.5 cursor-pointer select-none group', className)}
      onClick={() => column.toggleSorting(isSorted === 'asc')}
    >
      <span className="text-[14px] font-medium text-white">{title}</span>
      <span
        className={cn(
          'transition-opacity text-white',
          isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
        )}
      >
        {isSorted === 'desc' ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : isSorted === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5" />
        )}
      </span>
    </div>
  );
}
