import React, { useState } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCw, RotateCcw, Maximize2, Download, 
  ExternalLink, X, RefreshCw, FileText
} from 'lucide-react';
import { Button } from '@/shared/components/ui';

interface BillOcrReviewViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  fileName?: string;
  mimeType?: string;
}

export const BillOcrReviewViewer: React.FC<BillOcrReviewViewerProps> = ({
  isOpen,
  onClose,
  documentUrl,
  fileName = 'vendor-bill',
  mimeType = 'image/jpeg',
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !documentUrl) return null;

  const isPdf = mimeType.includes('pdf') || documentUrl.toLowerCase().endsWith('.pdf');

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] bg-surface rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground truncate max-w-xs sm:max-w-md">
              {fileName}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              (Original Source Document)
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isPdf && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs font-mono font-medium text-muted-foreground w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                  title="Rotate 90°"
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetZoom}
                  title="Reset Zoom & Rotation"
                  className="h-8 px-2 text-xs"
                >
                  Reset
                </Button>
              </>
            )}

            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center h-8 px-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
              title="Open full size in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open Full
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors ml-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer content */}
        <div className="flex-1 overflow-auto bg-slate-900/10 dark:bg-slate-950/50 p-4 flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={documentUrl}
              title="PDF Document Viewer"
              className="w-full h-full rounded-lg border border-border bg-white shadow-sm"
            />
          ) : (
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-4">
              <img
                src={documentUrl}
                alt="Uploaded Invoice"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md border border-border/60 bg-white"
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground flex justify-between items-center">
          <span>This original bill image is securely archived and attached to the accounting transaction.</span>
          <Button variant="primary" size="sm" onClick={onClose} className="h-7 text-xs">
            Done Reviewing
          </Button>
        </div>
      </div>
    </div>
  );
};
