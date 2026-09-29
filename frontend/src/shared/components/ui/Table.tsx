import React from 'react';
import { cn } from '@/lib/utils';

export const Table = ({ className = '', children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto bg-surface border border-border rounded-xl shadow-2xs">
    <table className={cn("w-full text-left text-xs border-collapse", className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold z-10 backdrop-blur-xs", className)} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y divide-border/60 [&>tr:nth-child(even)]:bg-slate-50/30 dark:[&>tr:nth-child(even)]:bg-slate-900/20", className)} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ className = '', children, hover = true, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { hover?: boolean }) => (
  <tr className={cn(hover ? "hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors duration-150" : "", className)} {...props}>
    {children}
  </tr>
);

export const TableHead = ({ className = '', children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("py-2.5 px-3.5 font-semibold align-middle whitespace-nowrap text-muted-foreground", className)} {...props}>
    {children}
  </th>
);

export const TableCell = ({ className = '', children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("py-2.5 px-3.5 align-middle text-slate-700 dark:text-slate-200", className)} {...props}>
    {children}
  </td>
);


