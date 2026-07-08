import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

// 1. PageContainer
interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}

export const PageContainer = ({ className, maxWidth = '7xl', children, ...props }: PageContainerProps) => {
  const maxWidthClasses = {
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-[1600px]', // standard 1600px width
    full: 'max-w-full',
  };
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pt-3 pb-4 text-left text-foreground bg-background min-h-screen space-y-3.5",
        maxWidthClasses[maxWidth],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// 2. Section
export const Section = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-3", className)} {...props}>
    {children}
  </div>
);

// 3. FormSection
export const FormSection = ({ title, children, className, ...props }: { title?: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-surface border border-border rounded-lg p-4 space-y-3 shadow-sm", className)} {...props}>
    {title && (
      <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground border-b border-border pb-1.5 flex items-center gap-2">
        {title}
      </h3>
    )}
    {children}
  </div>
);

// 4. EmptyState
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
}

export const EmptyState = ({ icon, title, description, actionLabel, onActionClick }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center p-6 text-center bg-surface border border-border rounded-lg shadow-sm space-y-2.5 w-full">
    <div className="p-2 bg-muted/30 text-muted-foreground rounded-md">
      {icon || <AlertCircle className="w-6 h-6 text-muted-foreground" />}
    </div>
    <div className="space-y-1 max-w-sm">
      <h3 className="font-bold text-sm text-foreground">{title}</h3>
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
    {actionLabel && onActionClick && (
      <Button onClick={onActionClick} variant="primary" size="sm" className="mt-1 font-bold px-4">
        {actionLabel}
      </Button>
    )}
  </div>
);

// 5. LoadingState
interface LoadingStateProps {
  variant?: 'default' | 'table' | 'form' | 'card';
}

export const LoadingState = ({ variant = 'default' }: LoadingStateProps) => {
  if (variant === 'table') {
    return (
      <div className="space-y-4 w-full animate-pulse p-4">
        <div className="h-10 bg-muted/40 rounded-lg w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-muted/20 rounded-lg w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (variant === 'form') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse p-6 bg-surface border border-border rounded-2xl">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted/40 rounded w-1/4" />
            <div className="h-10 bg-muted/20 rounded-lg w-full" />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl p-6 space-y-3">
            <div className="h-4 bg-muted/40 rounded w-1/3" />
            <div className="h-8 bg-muted/20 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-12 w-full">
      <Loader2 className="w-6 h-6 animate-spin text-accent" />
    </div>
  );
};

// 6. BackNavigation
interface BackNavigationProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  to?: string;
}

export const BackNavigation = ({ label, to, className, ...props }: BackNavigationProps) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };
  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        "group flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-2 self-start",
        className
      )}
      {...props}
    >
      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
      Back to {label}
    </button>
  );
};

// 7. ActionBar
export const ActionBar = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex justify-end items-center gap-3 border-t border-border pt-3 mt-3", className)} {...props}>
    {children}
  </div>
);

// 8. Breadcrumb
interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const Breadcrumb = ({ items, className }: { items: BreadcrumbItem[]; className?: string }) => {
  const navigate = useNavigate();
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-1 text-xs text-muted-foreground mb-2", className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-0.5 text-muted-foreground/60">/</span>}
          {item.href && index !== items.length - 1 ? (
            <button
              type="button"
              onClick={() => navigate(item.href!)}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-semibold text-foreground">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
