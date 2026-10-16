import React from 'react';
import { X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ZohoTransactionFormProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClose: () => void;
  onSettings?: () => void;
  headerBand?: React.ReactNode;
  fieldsGrid: React.ReactNode;
  itemTable: React.ReactNode;
  totalsBox?: React.ReactNode;
  notesAndTerms?: React.ReactNode;
  attachments?: React.ReactNode;
  bottomContent?: React.ReactNode;
  footer: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export const ZohoTransactionForm: React.FC<ZohoTransactionFormProps> = ({
  title,
  icon: Icon,
  onClose,
  onSettings,
  headerBand,
  fieldsGrid,
  itemTable,
  totalsBox,
  notesAndTerms,
  attachments,
  bottomContent,
  footer,
  onSubmit,
  className,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        'w-full h-full flex flex-col bg-white overflow-hidden select-none',
        className
      )}
    >
      {/* 1. Title Row with Icon + Title + Settings Gear + Red X Close */}
      <div className="h-12 px-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="w-5 h-5 text-[#408DFB]" />}
          <h1 className="text-base font-semibold text-[#2B2F36]">{title}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSettings || (() => {})}
            className="p-1 rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            title="Configure Preferences"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#6B7280] hover:text-[#E54B4B] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            title="Close and exit form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Form Body (Page never scrolls, only form body scrolls) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
        {/* Customer/Vendor Header Band */}
        {headerBand && (
          <div className="border-b border-[#E5E7EB] bg-white px-8 py-4">
            <div className="w-full max-w-[1040px]">
              {headerBand}
            </div>
          </div>
        )}

        {/* Form Content Area */}
        <div className="px-8 py-6 space-y-6 w-full max-w-[1040px]">
          {/* Two-Column Label/Input Grid */}
          <div className="space-y-4">{fieldsGrid}</div>

          {/* Thin Section Separator */}
          <hr className="border-t border-[#E5E7EB]" />

          {/* Item Table Section */}
          <div className="space-y-2">{itemTable}</div>

          {/* Bottom Split: Left = Notes/Terms/Attachments, Right = TotalsBox */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-2">
            {/* Notes, Terms & Attachments */}
            <div className="md:col-span-6 space-y-5">
              {notesAndTerms}
              {attachments}
            </div>

            {/* Totals Box on Right */}
            {totalsBox && (
              <div className="md:col-span-6 flex justify-end">
                {totalsBox}
              </div>
            )}
          </div>

          {bottomContent && (
            <div className="pt-2">{bottomContent}</div>
          )}
        </div>
      </div>

      {/* 3. Pinned Form Footer */}
      <div className="shrink-0">{footer}</div>
    </form>
  );
};
