import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  variant?: 'ghost' | 'secondary' | 'danger-ghost' | 'primary';
  size?: 'sm' | 'md' | 'dense';
  tooltip?: string;
  isLoading?: boolean;
  'aria-label': string; // strictly required for accessibility
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className = '',
      variant = 'ghost',
      size = 'md',
      tooltip,
      isLoading = false,
      icon: Icon,
      children,
      disabled,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-[8px] transition-colors duration-120 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed shrink-0';

    const variants = {
      ghost:
        'bg-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111827] dark:hover:bg-[#26262A] dark:hover:text-[#EDEDED]',
      secondary:
        'bg-white dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111827] dark:hover:bg-[#26262A] dark:hover:text-[#EDEDED]',
      'danger-ghost':
        'bg-transparent text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-rose-950/30',
      primary:
        'bg-[#111827] text-white hover:bg-[#1F2937] dark:bg-[#F3F4F6] dark:text-[#111827] dark:hover:bg-[#E5E7EB]',
    };

    const sizes = {
      dense: 'w-7 h-7 text-[14px]',
      sm: 'w-7 h-7 text-[14px]',
      md: 'w-8 h-8 text-[16px]',
    };

    const iconSize = size === 'dense' || size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
      <button
        ref={ref}
        title={tooltip || ariaLabel}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        disabled={isLoading || disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn(iconSize, 'animate-spin')} />
        ) : React.isValidElement(Icon) ? (
          Icon
        ) : Icon ? (
          // @ts-expect-error ComponentType
          <Icon className={iconSize} />
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
