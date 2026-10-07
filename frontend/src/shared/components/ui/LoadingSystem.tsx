import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// 1. AppSpinner: Standard spinning icon
export const AppSpinner: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 20 }) => (
  <Loader2 className={cn('animate-spin text-accent', className)} size={size} />
);

// 2. PageLoader: Centered full-page or section-page loader
export const PageLoader: React.FC<{ 
  title?: string; 
  description?: string; 
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  title = 'Loading Data...', 
  description = 'Fetching latest records...', 
  className = '',
  size = 'md'
}) => (
  <div 
    role="status"
    aria-live="polite"
    className={cn(
      "flex flex-col items-center justify-center text-center space-y-3.5 w-full select-none animate-in fade-in duration-300",
      size === 'sm' ? "py-8 min-h-[160px]" : size === 'lg' ? "py-28 min-h-[460px]" : "py-16 min-h-[320px]",
      className
    )}
  >
    <div className="relative flex items-center justify-center">
      {/* Subtle ambient glow behind spinner */}
      <div className="absolute w-14 h-14 rounded-full bg-accent/10 blur-md pointer-events-none" />
      
      {/* Outer glowing primary spinner ring */}
      <div className="w-11 h-11 rounded-full border-2 border-border/40 border-t-accent animate-spin" />
      
      {/* Inner reverse spinner accent */}
      <div className="absolute w-6 h-6 rounded-full border-2 border-dotted border-accent/40 animate-spin [animation-direction:reverse] [animation-duration:3s]" />
      
      {/* Center pulsing core accent dot */}
      <div className="absolute w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)] animate-pulse" />
    </div>

    <div className="space-y-1 max-w-sm px-4">
      {title && (
        <h3 className="font-semibold text-[13.5px] text-foreground tracking-tight">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-[11.5px] text-muted-foreground/85 leading-relaxed font-normal">
          {description}
        </p>
      )}
    </div>
  </div>
);

// 2b. PageLoadingBoundary: High-level boundary helper for page modules
export interface PageLoadingBoundaryProps {
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
  error?: any;
  onRetry?: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const PageLoadingBoundary: React.FC<PageLoadingBoundaryProps> = ({
  isLoading,
  isError = false,
  errorMessage,
  error,
  onRetry,
  title = 'Loading Data...',
  description = 'Fetching latest records...',
  children,
  className = '',
}) => {
  if (isLoading) {
    return <PageLoader title={title} description={description} className={className} />;
  }

  if (isError) {
    const displayMsg =
      errorMessage ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to load records. Please try again.');

    return (
      <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 w-full min-h-[320px] animate-in fade-in duration-200", className)}>
        <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="font-semibold text-sm text-foreground">Unable to load data</h3>
          <p className="text-xs text-muted-foreground">{displayMsg}</p>
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
    );
  }

  return <>{children}</>;
};

// 3. TableLoader: Renders animated skeleton rows matching typical lists
export const TableLoader: React.FC<{ 
  rows?: number; 
  cols?: number; 
  className?: string;
}> = ({ rows = 5, cols = 5, className = '' }) => (
  <div className={cn("w-full animate-pulse p-4 space-y-4", className)}>
    {/* Header Skeleton */}
    <div className="h-10 bg-muted/40 rounded-xl w-full flex items-center px-4 gap-4">
      {Array.from({ length: cols }).map((_, idx) => (
        <div 
          key={idx} 
          className="h-3 bg-muted/60 rounded-md" 
          style={{ width: `${100 / cols - 4}%` }} 
        />
      ))}
    </div>
    {/* Rows Skeletons */}
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div 
          key={rowIdx} 
          className="h-14 bg-muted/10 border border-border/20 rounded-xl w-full flex items-center px-4 gap-4"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div 
              key={colIdx} 
              className="h-3.5 bg-muted/20 rounded-md" 
              style={{ width: `${100 / cols - 4}%` }} 
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// 4. CardLoader: Standard content panel skeleton
export const CardLoader: React.FC<{ count?: number; className?: string }> = ({ count = 3, className = '' }) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse", className)}>
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        <div className="h-4 bg-muted/30 rounded w-1/3" />
        <div className="h-8 bg-muted/10 rounded w-2/3" />
        <div className="space-y-2 pt-2">
          <div className="h-3 bg-muted/10 rounded w-full" />
          <div className="h-3 bg-muted/10 rounded w-5/6" />
        </div>
      </div>
    ))}
  </div>
);

// 5. SummaryCardLoader: Metric & KPI panel shimmer loader
export const SummaryCardLoader: React.FC<{ count?: number; className?: string }> = ({ count = 3, className = '' }) => (
  <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse", className)}>
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="bg-surface border border-border rounded-2xl p-6 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-3 bg-muted/30 rounded w-1/2" />
          <div className="w-8 h-8 rounded-xl bg-muted/20" />
        </div>
        <div className="h-7 bg-muted/20 rounded w-3/4" />
        <div className="h-3 bg-muted/10 rounded w-1/3" />
      </div>
    ))}
  </div>
);

// 6. FormLoader: Shimmer block matching form fields
export const FormLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse p-6 bg-surface border border-border rounded-2xl", className)}>
    {Array.from({ length: 4 }).map((_, idx) => (
      <div key={idx} className="space-y-2">
        <div className="h-3 bg-muted/30 rounded w-1/4" />
        <div className="h-10 bg-muted/10 rounded-xl w-full" />
      </div>
    ))}
  </div>
);

// 7. DropdownLoader: Small inline lookup loader
export const DropdownLoader: React.FC<{ text?: string }> = ({ text = 'Loading choices...' }) => (
  <div className="flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground select-none">
    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
    <span className="animate-pulse">{text}</span>
  </div>
);

// 8. TopProgressBar: Top linear routing & fetch loader
export const TopProgressBar: React.FC<{ isAnimating: boolean }> = ({ isAnimating }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let fadeTimer: NodeJS.Timeout | null = null;

    if (isAnimating) {
      setVisible(true);
      setProgress((prev) => (prev > 0 ? prev : 25));

      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + (100 - prev) * 0.15;
        });
      }, 150);
    } else {
      // Complete bar to 100% then hide smoothly
      setProgress(100);
      fadeTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [isAnimating]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] bg-transparent pointer-events-none select-none">
      <div 
        className="h-full bg-accent transition-all duration-200 ease-out shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]" 
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
