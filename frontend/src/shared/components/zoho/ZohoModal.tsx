import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ZohoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryAction?: {
    label?: string;
    onClick?: () => void;
  };
  maxWidth?: string; // e.g. 'max-w-md', 'max-w-xl', 'max-w-2xl'
  className?: string;
}

export const ZohoModal: React.FC<ZohoModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  maxWidth = 'max-w-lg',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-150">
      <div
        className={cn(
          'w-full bg-white rounded-[4px] border border-[#E5E7EB] shadow-lg flex flex-col overflow-hidden max-h-[90vh]',
          maxWidth,
          className
        )}
      >
        {/* Title row with red close X */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB] bg-[#F8F9FB] select-none">
          <h3 className="text-sm font-semibold text-[#2B2F36]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#6B7280] hover:text-[#E54B4B] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs text-[#2B2F36] space-y-4">
          {children}
        </div>

        {/* Footer buttons */}
        {(primaryAction || secondaryAction) && (
          <div className="flex items-center justify-start gap-2.5 px-5 py-3 border-t border-[#E5E7EB] bg-[#F8F9FB] select-none">
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled || primaryAction.loading}
                className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] disabled:bg-[#93C5FD] text-white rounded-[4px] text-xs font-medium cursor-pointer transition-colors shadow-2xs"
              >
                {primaryAction.loading ? 'Processing...' : primaryAction.label}
              </button>
            )}

            <button
              type="button"
              onClick={secondaryAction?.onClick || onClose}
              className="px-4 py-1.5 bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#2B2F36] rounded-[4px] text-xs font-medium cursor-pointer transition-colors"
            >
              {secondaryAction?.label || 'Cancel'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
