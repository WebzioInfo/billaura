import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';

export interface PageHeaderProps {
  title: string;
  count?: number | string | null;
  description?: string; // Kept for contract compatibility, rendered as info tooltip if needed
  info?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>; // Ignored per standard (already in top bar)
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  status?: React.ReactNode;
  backTo?: {
    label?: string;
    path?: string;
  } | string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  count,
  description,
  info,
  primaryAction,
  secondaryAction,
  secondaryActions,
  actions,
  children,
  className = '',
  status,
  backTo,
}) => {
  const navigate = useNavigate();

  // Set document title to "<Title> - Bill Aura"
  useEffect(() => {
    if (title) {
      document.title = `${title} - Bill Aura`;
    }
  }, [title]);

  const helpText = info || description;

  const handleBack = () => {
    if (typeof backTo === 'string') {
      navigate(backTo);
    } else if (backTo && backTo.path) {
      navigate(backTo.path);
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      className={cn(
        'h-12 w-full flex items-center justify-between shrink-0 select-none transition-colors mb-3',
        className
      )}
    >
      {/* Left: Back button (if detail page) + Title + Count Chip + Status + Optional Help Info */}
      <div className="flex items-center gap-2.5 min-w-0">
        {backTo && (
          <IconButton
            icon={ArrowLeft}
            aria-label="Back"
            tooltip={typeof backTo === 'object' && backTo?.label ? backTo.label : 'Go back'}
            onClick={handleBack}
            size="dense"
            variant="ghost"
            className="mr-0.5"
          />
        )}

        <h1 className="text-[20px] leading-[28px] font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#EDEDED] truncate">
          {title}
        </h1>

        {count !== undefined && count !== null && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium leading-[16px] bg-[#F3F4F6] text-[#4B5563] dark:bg-[#26262C] dark:text-[#A1A1AA] tabular-nums shrink-0">
            {count}
          </span>
        )}

        {status && <div className="ml-1 shrink-0">{status}</div>}

        {helpText && (
          <span
            title={helpText}
            className="text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer ml-0.5 transition-colors"
            aria-label={helpText}
          >
            <Info className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
          </span>
        )}
      </div>

      {/* Right: Actions Group */}
      <div className="flex items-center gap-2 shrink-0">
        {secondaryAction}
        {secondaryActions}
        {actions}
        {children}
        {primaryAction}
      </div>
    </div>
  );
};
