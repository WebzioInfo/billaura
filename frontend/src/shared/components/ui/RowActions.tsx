import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  Download,
  Printer,
  MoreHorizontal,
  Edit2,
  Copy,
  CreditCard,
  Bell,
  Share2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RowActionsProps {
  onView: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
  onPrint: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onRecordPayment?: () => void;
  onSendReminder?: () => void;
  onShareLink?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const RowActions: React.FC<RowActionsProps> = ({
  onView,
  onDownload,
  isDownloading = false,
  onPrint,
  onEdit,
  onDuplicate,
  onRecordPayment,
  onSendReminder,
  onShareLink,
  onCancel,
  className,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <div
      className={cn(
        'relative flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-120',
        className
      )}
    >
      {/* View Eye (30px) */}
      <button
        type="button"
        onClick={onView}
        className="w-[30px] h-[30px] rounded-[6px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#E5E7EB] dark:hover:bg-[#374151] flex items-center justify-center cursor-pointer transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34303F]"
        title="View details"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>

      {/* Download (30px) */}
      <button
        type="button"
        onClick={onDownload}
        disabled={isDownloading}
        className="w-[30px] h-[30px] rounded-[6px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#E5E7EB] dark:hover:bg-[#374151] flex items-center justify-center cursor-pointer transition-colors duration-120 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34303F]"
        title="Download PDF"
      >
        {isDownloading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#111827] dark:text-[#EDEDED]" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Print (30px) */}
      <button
        type="button"
        onClick={onPrint}
        className="w-[30px] h-[30px] rounded-[6px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#E5E7EB] dark:hover:bg-[#374151] flex items-center justify-center cursor-pointer transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34303F]"
        title="Print document"
      >
        <Printer className="w-3.5 h-3.5" />
      </button>

      {/* Overflow "⋯" (30px) */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={cn(
            'w-[30px] h-[30px] rounded-[6px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#E5E7EB] dark:hover:bg-[#374151] flex items-center justify-center cursor-pointer transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34303F]',
            isMenuOpen && 'bg-[#E5E7EB] dark:bg-[#374151] text-[#111827]'
          )}
          title="More actions"
          aria-expanded={isMenuOpen}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-8 w-44 bg-surface rounded-[8px] border border-[#E8E8EC] dark:border-[#26262A] shadow-md py-1 z-50 divide-y divide-[#E8E8EC] dark:divide-[#26262A] select-none text-[12px]">
            <div className="py-0.5">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit();
                  }}
                  className="w-full px-2.5 py-1.5 text-left text-[#111827] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#24232C] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Edit</span>
                </button>
              )}
              {onDuplicate && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDuplicate();
                  }}
                  className="w-full px-2.5 py-1.5 text-left text-[#111827] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#24232C] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Duplicate</span>
                </button>
              )}
              {onRecordPayment && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onRecordPayment();
                  }}
                  className="w-full px-2.5 py-1.5 text-left text-[#111827] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#24232C] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Record payment</span>
                </button>
              )}
              {onSendReminder && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onSendReminder();
                  }}
                  className="w-full px-2.5 py-1.5 text-left text-[#111827] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#24232C] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Bell className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Send reminder</span>
                </button>
              )}
              {onShareLink && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onShareLink();
                  }}
                  className="w-full px-2.5 py-1.5 text-left text-[#111827] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#24232C] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Copy link</span>
                </button>
              )}
            </div>

            {onCancel && (
              <div className="py-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onCancel();
                  }}
                  className="w-full px-2.5 py-1.5 text-left text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D]/20 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF4444]" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
