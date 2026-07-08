import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BackNavigation } from './LayoutComponents';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  backTo?: {
    label: string;
    path?: string;
  };
}

export const PageHeader = ({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryAction,
  children,
  className,
  backTo,
}: PageHeaderProps) => {
  return (
    <div className={cn("mb-3 border-b border-border/40 pb-2", className)}>
      {backTo && (
        <BackNavigation label={backTo.label} to={backTo.path} className="mb-1" />
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-[11px] text-muted-foreground mb-0.5">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="text-muted-foreground/60">/</span>}
                  {item.href && index !== breadcrumbs.length - 1 ? (
                    <Link to={item.href} className="hover:text-foreground transition-colors font-medium">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-foreground/80">{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">{title}</h1>
            {description && (
              <span className="hidden md:inline text-xs text-muted-foreground font-normal border-l border-border pl-2 leading-tight">
                {description}
              </span>
            )}
          </div>
          {description && (
            <p className="md:hidden text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
      {children}
    </div>
  );
};
