import React from 'react';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/shared/components/ui/LoadingSystem';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  header?: React.ReactNode;
  subNav?: React.ReactNode;
  className?: string;
  noGutter?: boolean;
  scrollable?: boolean;
  isLoading?: boolean;
  loadingTitle?: string;
  loadingDescription?: string;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

export const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  (
    {
      children,
      header,
      subNav,
      className = '',
      noGutter = false,
      scrollable = true,
      isLoading = false,
      loadingTitle,
      loadingDescription,
      isError = false,
      errorMessage,
      onRetry,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full flex-1 min-h-full flex flex-col bg-background text-foreground',
          !scrollable && 'h-full overflow-hidden',
          !noGutter && 'px-[var(--page-gutter)] pt-[var(--page-gutter)] pb-6',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[360px] w-full">
            <PageLoader title={loadingTitle} description={loadingDescription} />
          </div>
        ) : isError ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 w-full min-h-[360px] animate-in fade-in duration-200">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="font-semibold text-sm text-foreground">Unable to load page</h3>
              <p className="text-xs text-muted-foreground">
                {errorMessage || 'An error occurred while loading this view. Please try again.'}
              </p>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-muted/60 text-foreground transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Retry</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {header}
            {subNav && <div className="shrink-0 -mt-2 mb-3">{subNav}</div>}
            {children}
          </>
        )}
      </div>
    );
  }
);

PageLayout.displayName = 'PageLayout';
