import React from 'react';
import { Sparkles, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'card' | 'inline';
}

export function EmptyState({ 
  title, 
  description, 
  icon: Icon = Sparkles, 
  action,
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

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      variant === 'card' 
        ? "min-h-[120px] rounded-lg border border-dashed border-border bg-background/40 p-6" 
        : "min-h-[400px] p-8",
      className
    )}>
      <div className={cn(
        "flex items-center justify-center rounded-full bg-accent/10 text-accent mb-4",
        variant === 'card' ? "w-10 h-10" : "w-16 h-16"
      )}>
        <Icon className={variant === 'card' ? "w-5 h-5" : "w-8 h-8"} />
      </div>
      
      <h3 className={cn(
        "font-bold text-foreground tracking-tight",
        variant === 'card' ? "text-sm" : "text-xl"
      )}>
        {title}
      </h3>
      
      <p className={cn(
        "text-muted-foreground mt-2 max-w-sm",
        variant === 'card' ? "text-xs" : "text-sm"
      )}>
        {description}
      </p>
      
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}
