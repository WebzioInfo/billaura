import React from 'react';
import { cn } from '@/lib/utils';

export const Table = ({ className = '', children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-auto bg-surface border border-border rounded-sm">
    <table className={cn("w-full text-left text-[13px] border-collapse", className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("sticky top-0 bg-surface border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold z-10 shadow-sm", className)} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y divide-border/50 [&>tr:nth-child(even)]:bg-muted/10", className)} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ className = '', children, hover = true, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { hover?: boolean }) => (
  <tr className={cn(hover ? "hover:bg-accent/5 transition-colors" : "", className)} {...props}>
    {children}
  </tr>
);

export const TableHead = ({ className = '', children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("py-2 px-3 font-semibold align-middle whitespace-nowrap", className)} {...props}>
    {children}
  </th>
);

export const TableCell = ({ className = '', children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("py-1.5 px-3 align-middle", className)} {...props}>
    {children}
  </td>
);
