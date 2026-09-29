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
    <div className={cn("mb-6 pb-4 border-b border-border/60", className)}>
      {backTo && (
        <BackNavigation label={backTo.label} to={backTo.path} className="mb-2" />
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-xs text-muted-foreground mb-1">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  {item.href && index !== breadcrumbs.length - 1 ? (
                    <Link to={item.href} className="hover:text-foreground transition-colors font-medium">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {description && (
              <span className="hidden md:inline text-xs text-muted-foreground font-normal border-l border-border/80 pl-3">
                {description}
              </span>
            )}
          </div>
          {description && (
            <p className="md:hidden text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
      {children}
    </div>
  );
};

