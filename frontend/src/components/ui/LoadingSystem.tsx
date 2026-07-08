import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// 1. AppSpinner: Standard spinning icon
export const AppSpinner: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 20 }) => (
  <Loader2 className={`animate-spin text-accent ${className}`} size={size} />
);

// 2. PageLoader: Centered full-page or section-page loader
export const PageLoader: React.FC<{ 
  title?: string; 
  description?: string; 
  className?: string; 
}> = ({ 
  title = 'Loading Data...', 
  description = 'Fetching latest records...', 
  className = '' 
}) => (
  <div className={`flex flex-col items-center justify-center py-20 px-4 text-center space-y-3 w-full min-h-[300px] ${className}`}>
    <div className="relative flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
      <div className="absolute w-6 h-6 rounded-full bg-accent/10 animate-ping" />
    </div>
    <div className="space-y-1">
      <h3 className="font-bold text-sm text-foreground tracking-wide">{title}</h3>
      <p className="text-xs text-muted-foreground animate-pulse">{description}</p>
    </div>
  </div>
);

// 3. TableLoader: Renders animated skeleton rows matching typical lists
export const TableLoader: React.FC<{ 
  rows?: number; 
  cols?: number; 
  className?: string;
}> = ({ rows = 5, cols = 5, className = '' }) => (
  <div className={`w-full animate-pulse p-4 space-y-4 ${className}`}>
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
  <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse ${className}`}>
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
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse ${className}`}>
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
  <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse p-6 bg-surface border border-border rounded-2xl ${className}`}>
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

  useEffect(() => {
    if (!isAnimating) {
      setProgress(0);
      return;
    }

    setProgress(20);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + (100 - prev) * 0.15;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isAnimating]);

  if (!isAnimating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-accent/20">
      <div 
        className="h-full bg-accent transition-all duration-300 ease-out shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" 
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
