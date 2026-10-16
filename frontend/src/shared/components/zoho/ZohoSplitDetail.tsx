import React from 'react';
import {
  ChevronDown,
  Plus,
  MoreVertical,
  Paperclip,
  MessageSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZohoStatusText } from './ZohoStatusText';

export interface ZohoSplitListItem {
  id: string;
  name: string;
  amount?: string | number;
  number: string;
  date: string;
  status: string;
}

export interface ZohoSplitDetailProps {
  moduleTitle: string;
  items: ZohoSplitListItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onNew?: () => void;
  onClose: () => void;
  detailTitle: string;
  detailActions?: React.ReactNode;
  attachmentCount?: number;
  commentCount?: number;
  onAttachmentClick?: () => void;
  onCommentClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const ZohoSplitDetail: React.FC<ZohoSplitDetailProps> = ({
  moduleTitle,
  items,
  selectedId,
  onSelect,
  onNew,
  onClose,
  detailTitle,
  detailActions,
  attachmentCount = 0,
  commentCount = 0,
  onAttachmentClick,
  onCommentClick,
  children,
  className,
}) => {
  return (
    <div className={cn('w-full h-full flex overflow-hidden bg-white select-none', className)}>
      {/* LEFT PANE: Narrow Compact List (~340px) */}
      <div className="w-80 md:w-[340px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col h-full">
        {/* Left Header */}
        <div className="h-11 px-3 border-b border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-1.5 font-semibold text-xs text-[#2B2F36] hover:text-[#408DFB] cursor-pointer"
          >
            <span>{moduleTitle}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
          </button>

          <div className="flex items-center gap-1">
            {onNew && (
              <button
                type="button"
                onClick={onNew}
                className="w-6 h-6 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] flex items-center justify-center transition-colors cursor-pointer"
                title="Create New"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              className="p-1 text-[#6B7280] hover:text-[#2B2F36] rounded-[4px] cursor-pointer"
              title="More Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Left Scrollable Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
          {items.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'p-3 cursor-pointer transition-colors text-xs space-y-1',
                  isSelected
                    ? 'bg-[#F0F5FF] border-l-3 border-[#408DFB]'
                    : 'hover:bg-[#F9FAFB] border-l-3 border-transparent'
                )}
              >
                {/* Top line: Bold Name & Amount on right */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#2B2F36] truncate max-w-[190px]">
                    {item.name}
                  </span>
                  {item.amount !== undefined && (
                    <span className="font-medium text-[#2B2F36]">
                      {typeof item.amount === 'number'
                        ? `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : item.amount}
                    </span>
                  )}
                </div>

                {/* Second line: number • date */}
                <div className="text-[11px] text-[#6B7280]">
                  <span>{item.number}</span>
                  <span className="mx-1">•</span>
                  <span>{item.date}</span>
                </div>

                {/* Third line: Coloured status text */}
                <div>
                  <ZohoStatusText status={item.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANE: Detail Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Top Detail Header Toolbar */}
        <div className="h-11 px-4 border-b border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm font-semibold text-[#2B2F36] truncate">
              {detailTitle}
            </h2>
            {detailActions && (
              <div className="flex items-center gap-2">{detailActions}</div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Attachment Icon */}
            <button
              type="button"
              onClick={onAttachmentClick}
              className="relative p-1 text-[#6B7280] hover:text-[#2B2F36] rounded-[4px] cursor-pointer"
              title="Attachments"
            >
              <Paperclip className="w-4 h-4" />
              {attachmentCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#408DFB] text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {attachmentCount}
                </span>
              )}
            </button>

            {/* Comments Icon */}
            <button
              type="button"
              onClick={onCommentClick}
              className="relative p-1 text-[#6B7280] hover:text-[#2B2F36] rounded-[4px] cursor-pointer"
              title="Comments & History"
            >
              <MessageSquare className="w-4 h-4" />
              {commentCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#408DFB] text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {commentCount}
                </span>
              )}
            </button>

            {/* Red X Close Button (Closes split view and returns to list) */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[4px] text-[#6B7280] hover:text-[#E54B4B] hover:bg-[#FEF2F2] transition-colors cursor-pointer ml-1"
              title="Close and return to list"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Scrollable Detail Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
