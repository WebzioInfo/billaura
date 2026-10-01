import React from 'react';
import { cn } from '@/lib/utils';

export interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  header?: React.ReactNode;
  subNav?: React.ReactNode;
  className?: string;
  noGutter?: boolean;
}

export const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  ({ children, header, subNav, className = '', noGutter = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden bg-background text-foreground',
          !noGutter && 'px-[var(--page-gutter)] pt-[var(--page-gutter)] pb-4',
          className
        )}
        {...props}
      >
        {header}
        {subNav && <div className="shrink-0 -mt-2 mb-3">{subNav}</div>}
        {children}
      </div>
    );
  }
);

PageLayout.displayName = 'PageLayout';
