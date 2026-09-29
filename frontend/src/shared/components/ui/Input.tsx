import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, leftIcon, rightIcon, required, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full h-9 bg-surface border rounded-md text-xs text-foreground placeholder:text-slate-400',
              'transition-all duration-150 shadow-2xs',
              'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent',
              leftIcon ? 'pl-9' : 'px-3',
              rightIcon ? 'pr-9' : 'px-3',
              error ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-border',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-slate-400 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

