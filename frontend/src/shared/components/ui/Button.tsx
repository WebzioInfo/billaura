import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-ghost' | 'link' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-[8px] select-none transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap';
    
    const variants = {
      // Solid #111827, white text, hover #1F2937
      primary: 'bg-[#111827] text-white hover:bg-[#1F2937] active:bg-[#030712] dark:bg-[#F3F4F6] dark:text-[#111827] dark:hover:bg-[#E5E7EB]',
      // White background, 1px border #D1D5DB, ink text, hover #F3F4F6
      secondary: 'bg-white dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] text-[#111827] dark:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#26262A] active:bg-[#E5E7EB]',
      // Alias outline to secondary
      outline: 'bg-white dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] text-[#111827] dark:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#26262A] active:bg-[#E5E7EB]',
      // Transparent, ink/grey text, hover #F3F4F6
      ghost: 'bg-transparent text-[#4B5563] dark:text-[#A1A1AA] hover:bg-[#F3F4F6] hover:text-[#111827] dark:hover:bg-[#26262A] dark:hover:text-[#EDEDED] active:bg-[#E5E7EB]',
      // Solid #DC2626, white text
      danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B]',
      // Red text with hover #FEF2F2
      'danger-ghost': 'bg-transparent text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-rose-950/30 active:bg-rose-100',
      // Ink text with underline on hover
      link: 'bg-transparent text-[#111827] dark:text-[#F3F4F6] hover:underline p-0 h-auto font-medium',
      // Accent fallback for branding
      accent: 'bg-[#34303F] text-white hover:bg-[#262330] active:bg-[#1C1A24]',
    };

    const sizes = {
      sm: 'h-8 px-2.5 text-[13px] gap-2',
      md: 'h-9 px-3 text-[14px] gap-2',
      lg: 'h-10 px-4 text-[14px] gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], variant !== 'link' && sizes[size], className)}
        disabled={isLoading || disabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export const MemoizedButton = React.memo(Button);

