import React from 'react';
import { cn } from '@/lib/utils';

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  density?: 'comfortable' | 'compact';
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 10,
  cols = 11,
  density = 'comfortable',
  className,
}) => {
  const rowHeightClass = density === 'compact' ? 'h-10' : 'h-[52px]';

  return (
    <div className={cn('w-full border-collapse animate-pulse select-none', className)}>
      {/* Dark Header Skeleton */}
      <div className="h-14 bg-[#34303F] dark:bg-[#1E1C26] flex items-center px-6 gap-6">
        <div className="w-4 h-4 bg-white/20 rounded-[4px] shrink-0" />
        <div className="w-24 h-4 bg-white/20 rounded" />
        <div className="w-20 h-4 bg-white/20 rounded" />
        <div className="flex-1 h-4 bg-white/20 rounded" />
        <div className="w-20 h-4 bg-white/20 rounded" />
        <div className="w-20 h-4 bg-white/20 rounded" />
        <div className="w-20 h-4 bg-white/20 rounded" />
        <div className="w-20 h-4 bg-white/20 rounded" />
        <div className="w-20 h-4 bg-white/20 rounded" />
        <div className="w-20 h-4 bg-white/20 rounded" />
        <div className="w-20 h-4 bg-white/20 rounded" />
      </div>

      {/* 10 Zebra Skeleton Rows */}
      <div>
        {Array.from({ length: rows }).map((_, rowIdx) => {
          const isEven = rowIdx % 2 === 1;
          return (
            <div
              key={rowIdx}
              className={cn(
                'flex items-center px-6 gap-6 transition-colors',
                rowHeightClass,
                isEven
                  ? 'bg-[#F5F5F5] dark:bg-[#1C1B22]'
                  : 'bg-white dark:bg-[#17161C]'
              )}
            >
              <div className="w-4 h-4 bg-black/10 dark:bg-white/10 rounded-[4px] shrink-0" />
              <div className="w-24 h-4 bg-black/10 dark:bg-white/10 rounded shrink-0" />
              <div className="w-20 h-3.5 bg-black/10 dark:bg-white/10 rounded shrink-0" />
              <div className="flex-1 h-4 bg-black/10 dark:bg-white/10 rounded shrink-0" />
              <div className="w-20 h-5 bg-black/10 dark:bg-white/10 rounded-full shrink-0" />
              <div className="w-20 h-4 bg-black/10 dark:bg-white/10 rounded shrink-0" />
              <div className="w-24 h-4 bg-black/10 dark:bg-white/10 rounded shrink-0" />
              <div className="w-20 h-4 bg-black/10 dark:bg-white/10 rounded shrink-0" />
              <div className="w-20 h-5 bg-black/10 dark:bg-white/10 rounded-full shrink-0" />
              <div className="w-24 h-3.5 bg-black/10 dark:bg-white/10 rounded shrink-0" />
              <div className="w-20 h-6 bg-black/10 dark:bg-white/10 rounded shrink-0 ml-auto" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
