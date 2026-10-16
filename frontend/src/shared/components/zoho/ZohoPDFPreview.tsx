import React from 'react';
import { ChevronDown, Printer, Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZohoStatusText } from './ZohoStatusText';

export interface ZohoPDFPreviewProps {
  title?: string;
  status?: string;
  templateName?: string;
  onCustomize?: () => void;
  onChangeTemplate?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const ZohoPDFPreview: React.FC<ZohoPDFPreviewProps> = ({
  status,
  templateName = 'Standard Template',
  onCustomize,
  onChangeTemplate,
  onPrint,
  onDownload,
  children,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center py-6 px-4 bg-[#F8F9FB] min-h-full', className)}>
      {/* Top Toolbar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#2B2F36] rounded-[4px] text-xs font-medium cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Print</span>
            </button>
          )}

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#2B2F36] rounded-[4px] text-xs font-medium cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>PDF / Print</span>
            </button>
          )}
        </div>

        {onCustomize && (
          <button
            type="button"
            onClick={onCustomize}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] text-xs font-medium cursor-pointer transition-colors"
          >
            <span>Customize</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Document Sheet (White Card with corner status ribbon) */}
      <div className="w-full max-w-4xl bg-white border border-[#E5E7EB] rounded-[4px] shadow-sm relative overflow-hidden p-8 sm:p-12 mb-4 min-h-[700px]">
        {/* Status Ribbon (if status is provided) */}
        {status && (
          <div className="absolute top-4 right-4 flex items-center gap-2 select-none">
            <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Status:</span>
            <ZohoStatusText status={status} />
          </div>
        )}

        {/* Embedded document markup or print layout */}
        <div className="w-full">{children}</div>
      </div>

      {/* Template change link below */}
      <div className="text-xs text-[#6B7280] select-none">
        PDF Template: <span className="font-semibold text-[#2B2F36]">'{templateName}'</span>{' '}
        {onChangeTemplate && (
          <button
            type="button"
            onClick={onChangeTemplate}
            className="text-[#408DFB] hover:underline font-medium cursor-pointer ml-1"
          >
            Change
          </button>
        )}
      </div>
    </div>
  );
};
