import React from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-surface rounded-xl border border-border shadow-xs overflow-hidden transition-shadow duration-200 hover:shadow-sm', className)} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 py-4 border-b border-border/70 flex items-center justify-between gap-3', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('font-semibold text-base text-foreground tracking-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-xs text-muted-foreground mt-0.5', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 py-3 border-t border-border/70 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

