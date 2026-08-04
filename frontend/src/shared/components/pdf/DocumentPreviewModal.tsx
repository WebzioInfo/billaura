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
          const response = await apiClient.post('/documents/standard/export', data, {
            responseType: 'blob'
          });
          const url = URL.createObjectURL(response.data);
          setPdfUrl(url);
        } catch (error) {
          console.error('Failed to generate preview:', error);
          notification.error('Failed to generate preview');
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

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    link.click();
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col h-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{filename}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !pdfUrl}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            
            <button
              onClick={handleDownload}
              disabled={loading || !pdfUrl}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            
            <div className="w-px h-6 bg-slate-300 mx-2" />
            
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-100/50 p-4 overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600 animate-pulse">Generating Enterprise Document...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg shadow-sm border border-slate-200 bg-white"
              title={title}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-red-500">
              Failed to load preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
