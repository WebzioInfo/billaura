import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none';
    
    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-slate-800 shadow-xs border border-slate-900/10 dark:hover:bg-slate-200',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-slate-200/70 border border-slate-200/80 dark:border-slate-800',
      outline: 'border border-border bg-surface text-foreground hover:bg-slate-50 hover:border-slate-300 shadow-xs dark:hover:bg-slate-800/50',
      ghost: 'bg-transparent text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-xs border border-red-700/20',
      accent: 'bg-accent text-accent-foreground hover:bg-accent-hover shadow-xs border border-indigo-600/20',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-xs font-semibold gap-2',
      lg: 'h-10 px-5 text-sm font-semibold gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export const MemoizedButton = React.memo(Button);

