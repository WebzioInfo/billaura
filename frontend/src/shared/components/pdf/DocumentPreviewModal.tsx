import React, { useState, useEffect } from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import { PdfDocumentProps } from './PdfDownloadButton';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PdfDocumentProps;
  title?: string;
  filename?: string;
}

export function DocumentPreviewModal({ 
  isOpen, 
  onClose, 
  data, 
  title = 'Document Preview', 
  filename = 'document.pdf' 
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchPdf = async () => {
        try {
          setLoading(true);
          const response: any = await apiClient.post('/documents/standard/export', data, {
            responseType: 'blob'
          });
          const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } catch (error: any) {
          console.error('Failed to generate preview:', error);
          notification.error(error?.response?.data?.message || 'Failed to generate document preview');
        } finally {
          setLoading(false);
        }
      };
      fetchPdf();
    } else {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!pdfUrl) return;
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = filename || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notification.success('PDF downloaded successfully');
    } catch (_) {
      notification.error('Failed to download PDF');
    }
  };


  const handlePrint = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-md sm:p-4 md:p-6 lg:p-8 animate-in fade-in">
      <div className="flex flex-col h-full bg-surface rounded-2xl shadow-2xl overflow-hidden border border-border">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{filename}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !pdfUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground bg-surface border border-border rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Print</span>
            </button>
            
            <button
              onClick={handleDownload}
              disabled={loading || !pdfUrl}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            
            <div className="w-px h-5 bg-border mx-1" />
            
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-100/50 dark:bg-slate-950/50 p-4 overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-xs font-semibold text-muted-foreground animate-pulse">Generating Document PDF...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-xl shadow-xs border border-border bg-white"
              title={title}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-rose-500">
              Failed to load preview document
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
