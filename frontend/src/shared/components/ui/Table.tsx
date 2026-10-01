import React from 'react';
import { cn } from '@/lib/utils';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
  embedded?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className = '', containerClassName = '', embedded = false, children, ...props }, ref) => (
    <div
      className={cn(
        'w-full overflow-hidden bg-white dark:bg-[#17161C] border border-[#E8E8EC] dark:border-[#2A2933]',
        embedded
          ? 'rounded-lg border-opacity-80'
          : 'rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)]',
        containerClassName
      )}
    >
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={cn('w-full text-left text-[14px] border-collapse', className)}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  )
);
Table.displayName = 'Table';

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  embedded?: boolean;
}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className = '', embedded = false, children, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        'sticky top-0 bg-[#34303F] dark:bg-[#1E1C26] text-white font-medium z-20 select-none',
        embedded ? 'h-11 text-[13px]' : 'h-14 text-[14px]',
        className
      )}
      {...props}
    >
      {children}
    </thead>
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', children, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn(
        'text-[14px] [&>tr:nth-child(even)]:bg-[#F5F5F5] dark:[&>tr:nth-child(even)]:bg-[#1C1B22] [&>tr:nth-child(odd)]:bg-white dark:[&>tr:nth-child(odd)]:bg-[#17161C]',
        className
      )}
      {...props}
    >
      {children}
    </tbody>
  )
);
TableBody.displayName = 'TableBody';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
  isTotalRow?: boolean;
  isSelected?: boolean;
  density?: 'comfortable' | 'compact';
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className = '', hover = true, isTotalRow = false, isSelected = false, density = 'comfortable', children, ...props }, ref) => {
    const heightClass = density === 'compact' ? 'h-10' : 'h-[52px]';

    return (
      <tr
        ref={ref}
        className={cn(
          'transition-colors duration-120 text-[14px]',
          heightClass,
          isTotalRow
            ? '!bg-[#EDEDF0] dark:!bg-[#24232C] font-semibold text-[#111827] dark:text-white border-t-2 border-[#D1D5DB] dark:border-[#374151]'
            : isSelected
            ? '!bg-[#ECECF1] dark:!bg-[#2B2A36]'
            : hover
            ? 'hover:bg-[#EFEFF1] dark:hover:bg-[#24232C]'
            : '',
          className
        )}
        {...props}
      >
        {children}
      </tr>
    );
  }
);
TableRow.displayName = 'TableRow';

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
  sticky?: 'left' | 'right';
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className = '', align = 'left', sticky, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        scope="col"
        className={cn(
          'py-3 px-4 font-medium text-white whitespace-nowrap text-[14px]',
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
          sticky === 'left' && 'sticky left-0 z-20 bg-[#34303F] dark:bg-[#1E1C26]',
          sticky === 'right' && 'sticky right-0 z-20 bg-[#34303F] dark:bg-[#1E1C26]',
          className
        )}
        {...props}
      >
        {children}
      </th>
    );
  }
);
TableHead.displayName = 'TableHead';

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
  sticky?: 'left' | 'right';
  isStickyBackground?: boolean;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className = '', align = 'left', sticky, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          'py-2 px-4 align-middle text-[14px] text-[#555555] dark:text-[#A1A1AA]',
          align === 'right' ? 'text-right tabular-nums' : align === 'center' ? 'text-center' : 'text-left',
          sticky === 'left' && 'sticky left-0 z-10 bg-inherit',
          sticky === 'right' && 'sticky right-0 z-10 bg-inherit',
          className
        )}
        {...props}
      >
        {children}
      </td>
    );
  }
);
TableCell.displayName = 'TableCell';
