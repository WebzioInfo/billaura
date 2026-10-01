import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  action?: React.ReactNode;
  actionLabel?: string;
  onActionClick?: () => void;
  className?: string;
  variant?: 'default' | 'card' | 'inline';
}

export function EmptyState({ 
  title, 
  description, 
  icon, 
  action,
  actionLabel,
  onActionClick,
  className,
  variant = 'default'
}: EmptyStateProps) {
  
  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center justify-center p-4 text-center text-sm text-muted-foreground italic", className)}>
        {description}
      </div>
    );
  }

  const renderIcon = () => {
    if (!icon) {
      return <Sparkles className={variant === 'card' ? "w-5 h-5" : "w-8 h-8"} />;
    }
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className={variant === 'card' ? "w-5 h-5" : "w-8 h-8"} />;
  };

  const actionNode = action || (actionLabel && onActionClick ? (
    <Button onClick={onActionClick} variant="primary" size="sm" className="font-semibold px-4">
      {actionLabel}
    </Button>
  ) : null);

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      variant === 'card' 
        ? "min-h-[120px] rounded-xl border border-dashed border-border bg-background/40 p-6" 
        : "min-h-[360px] p-8",
      className
    )}>
      <div className={cn(
        "flex items-center justify-center rounded-2xl bg-accent/10 text-accent mb-4 transition-transform duration-200 hover:scale-105",
        variant === 'card' ? "w-10 h-10" : "w-16 h-16"
      )}>
        {renderIcon()}
      </div>
      
      <h3 className={cn(
        "font-semibold text-foreground tracking-tight",
        variant === 'card' ? "text-sm" : "text-lg"
      )}>
        {title}
      </h3>
      
      <p className={cn(
        "text-muted-foreground mt-1.5 max-w-sm text-xs leading-relaxed",
        variant === 'card' ? "text-[11px]" : "text-sm"
      )}>
        {description}
      </p>
      
      {actionNode && (
        <div className="mt-5">
          {actionNode}
        </div>
      )}

      {variant === 'default' && (
        <div className="mt-8 pt-3 border-t border-border/40 w-full max-w-[200px] text-center opacity-60">
          <span className="text-[9px] text-muted-foreground font-mono select-none tracking-wider">
            Bill Aura &bull; A Product by Webzio
          </span>
        </div>
      )}
    </div>
  );
}

