import React from 'react';
import { cn } from '@/lib/utils';
import { resolveSemanticStatus } from './data-table/statusMap';

export interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className,
  showDot = true,
}) => {
  const config = resolveSemanticStatus(status);
  const displayLabel = label || config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium select-none whitespace-nowrap leading-none transition-colors duration-120',
        className
      )}
      style={{
        backgroundColor: `var(--status-${config.type}-bg, ${config.light.bg})`,
        color: `var(--status-${config.type}-text, ${config.light.text})`,
      }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: `var(--status-${config.type}-dot, ${config.light.dot})` }}
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
