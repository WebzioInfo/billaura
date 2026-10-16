import React, { useRef } from 'react';
import { Paperclip, X, FileText, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttachmentFile {
  name: string;
  size?: number;
  url?: string;
  type?: string;
}

export interface ZohoAttachmentUploaderProps {
  files?: AttachmentFile[];
  onUpload?: (files: FileList | null) => void;
  onRemove?: (index: number) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  className?: string;
}

export const ZohoAttachmentUploader: React.FC<ZohoAttachmentUploaderProps> = ({
  files = [],
  onUpload,
  onRemove,
  maxFiles = 5,
  maxSizeMB = 10,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUpload) {
      onUpload(e.target.files);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] hover:bg-[#F8F9FB] text-[#2B2F36] rounded-[4px] text-xs font-medium cursor-pointer transition-colors"
        >
          <Paperclip className="w-3.5 h-3.5 text-[#6B7280]" />
          <span>Upload File</span>
          <ChevronDown className="w-3 h-3 text-[#6B7280]" />
        </button>

        <span className="text-[11px] text-[#6B7280]">
          You can upload a maximum of {maxFiles} files, {maxSizeMB}MB each
        </span>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px] text-xs text-[#2B2F36]"
            >
              <FileText className="w-3.5 h-3.5 text-[#408DFB]" />
              <span className="truncate max-w-[180px] font-medium">{file.name}</span>
              {file.size && (
                <span className="text-[10px] text-[#6B7280]">
                  ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                </span>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="text-[#6B7280] hover:text-[#E54B4B] p-0.5 cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
