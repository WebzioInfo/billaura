import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  footer?: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'md', footer }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full mx-4',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Modal Dialog Container */}
      <div 
        className={cn(
          'relative w-full bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden',
          'animate-in zoom-in-95 fade-in duration-200 ease-out',
          maxWidthClasses[maxWidth]
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="font-semibold text-base text-foreground tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Main Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-border/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

