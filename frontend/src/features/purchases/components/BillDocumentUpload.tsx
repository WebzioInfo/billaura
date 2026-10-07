import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileText, Camera, Eye, RefreshCw, Trash2, 
  CheckCircle2, AlertCircle, Sparkles, Loader2, Image as ImageIcon 
} from 'lucide-react';
import { Button } from '@/shared/components/ui';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { CameraCaptureModal } from './CameraCaptureModal';

export interface UploadedBillDocument {
  id: string;
  originalFileName: string;
  secureUrl: string;
  fileSize: number;
  mimeType: string;
  cloudinaryPublicId: string;
  ocrStatus: 'UPLOADED' | 'PROCESSING' | 'EXTRACTED' | 'VERIFIED' | 'FAILED';
  confidence?: number;
  ocrData?: any;
}

interface BillDocumentUploadProps {
  currentDocument?: UploadedBillDocument | null;
  onExtractionSuccess: (extractionData: any, document: UploadedBillDocument) => void;
  onDocumentRemoved: () => void;
  onOpenViewer: (url: string, fileName: string, mimeType: string) => void;
  disabled?: boolean;
}

type StepState = 'IDLE' | 'UPLOADING' | 'EXTRACTING' | 'MATCHING' | 'DONE' | 'ERROR';

export const BillDocumentUpload: React.FC<BillDocumentUploadProps> = ({
  currentDocument,
  onExtractionSuccess,
  onDocumentRemoved,
  onOpenViewer,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [stepState, setStepState] = useState<StepState>('IDLE');
  const [stepMessage, setStepMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    // 1. Validate file format
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      notification.error('Unsupported file format. Please upload JPG, PNG, WEBP, or PDF.');
      return;
    }

    // 2. Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      notification.error('File exceeds 15MB limit.');
      return;
    }

    setErrorMessage(null);
    setStepState('UPLOADING');
    setStepMessage('Uploading bill securely to Cloudinary...');

    try {
      // Step A: Upload to Cloudinary via backend API
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await apiClient.post('/purchases/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedDoc: UploadedBillDocument = uploadRes.data?.data || uploadRes.data;

      // Step B: Trigger OCR extraction
      setStepState('EXTRACTING');
      setStepMessage('Reading bill with AI OCR & Document Engine...');

      try {
        const extractRes = await apiClient.post(`/purchases/documents/${uploadedDoc.id}/extract`);
        const resultData = extractRes.data?.data || extractRes.data;

        setStepState('MATCHING');
        setStepMessage('Matching vendors & catalog line items...');

        // Short smooth delay for UX
        setTimeout(() => {
          setStepState('DONE');
          notification.success('Bill extracted successfully! Review the auto-filled fields below.');
          onExtractionSuccess(resultData.extraction, resultData.attachment);
        }, 500);
      } catch (ocrError: any) {
        // OCR failed, but document was saved!
        setStepState('ERROR');
        const msg = ocrError.response?.data?.message || 'Automatic OCR reading failed. Your image is safely saved.';
        setErrorMessage(msg);
        notification.warning('Could not extract text automatically. You can enter details manually.');
        // Pass document even if extraction failed so image remains attached
        onExtractionSuccess(null, { ...uploadedDoc, ocrStatus: 'FAILED' });
      }
    } catch (uploadError: any) {
      setStepState('ERROR');
      const msg = uploadError.response?.data?.message || 'Failed to upload bill file.';
      setErrorMessage(msg);
      notification.error(msg);
    }
  };

  const handleRetryOcr = async () => {
    if (!currentDocument?.id) return;
    setErrorMessage(null);
    setStepState('EXTRACTING');
    setStepMessage('Re-processing OCR on document...');

    try {
      const extractRes = await apiClient.post(`/purchases/documents/${currentDocument.id}/extract`);
      const resultData = extractRes.data?.data || extractRes.data;
      setStepState('DONE');
      notification.success('OCR extracted successfully!');
      onExtractionSuccess(resultData.extraction, resultData.attachment);
    } catch (err: any) {
      setStepState('ERROR');
      const msg = err.response?.data?.message || 'OCR re-run failed.';
      setErrorMessage(msg);
      notification.error(msg);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || stepState === 'UPLOADING' || stepState === 'EXTRACTING') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.target.value = ''; // Reset input
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isBusy = stepState === 'UPLOADING' || stepState === 'EXTRACTING' || stepState === 'MATCHING';

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        disabled={disabled || isBusy}
      />

      {/* Real Web Media Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => processFile(file)}
      />

      {/* State A: Processing Loader */}
      {isBusy && (
        <div className="border-2 border-dashed border-primary/40 bg-primary/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
          <div className="relative mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <Sparkles className="w-4 h-4 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h4 className="text-base font-bold text-foreground">{stepMessage}</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Bill Aura is parsing header fields, tax breakups, and line entries with precision.
          </p>
          <div className="flex items-center gap-2 mt-4 text-[11px] text-muted-foreground font-mono">
            <span className={stepState === 'UPLOADING' ? 'text-primary font-bold' : 'text-emerald-500'}>1. Upload</span>
            <span>→</span>
            <span className={stepState === 'EXTRACTING' ? 'text-primary font-bold' : stepState === 'MATCHING' ? 'text-emerald-500' : ''}>2. OCR</span>
            <span>→</span>
            <span className={stepState === 'MATCHING' ? 'text-primary font-bold' : ''}>3. Match Catalog</span>
          </div>
        </div>
      )}

      {/* State B: Document Attached Preview */}
      {!isBusy && currentDocument && (
        <div className="border border-border/80 bg-surface rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              {currentDocument.mimeType?.includes('pdf') ? (
                <FileText className="w-6 h-6 text-primary" />
              ) : (
                <ImageIcon className="w-6 h-6 text-primary" />
              )}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground truncate max-w-xs sm:max-w-md">
                  {currentDocument.originalFileName}
                </span>
                {currentDocument.ocrStatus === 'EXTRACTED' || currentDocument.ocrStatus === 'VERIFIED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    OCR Extracted
                  </span>
                ) : currentDocument.ocrStatus === 'FAILED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Manual Entry Active
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(currentDocument.fileSize)}</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">Stored on Cloudinary</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenViewer(currentDocument.secureUrl, currentDocument.originalFileName, currentDocument.mimeType)}
              className="text-xs font-semibold"
            >
              <Eye className="w-3.5 h-3.5 mr-1 text-primary" />
              Preview Document
            </Button>

            {currentDocument.ocrStatus === 'FAILED' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetryOcr}
                className="text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Retry OCR
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
              title="Replace bill with another file"
            >
              Replace
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDocumentRemoved}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="Remove bill document"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}

      {/* State C: Drag and Drop Upload Area (Idle) */}
      {!isBusy && !currentDocument && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/10 shadow-inner'
              : 'border-border/80 hover:border-primary/60 bg-muted/10 hover:bg-muted/20'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary transition-transform hover:scale-105">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">
                Upload Vendor Bill for Auto-Extraction
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Drag and drop your vendor bill or invoice here, or click to browse files
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="text-xs font-bold shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                Select File
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCameraOpen(true);
                }}
                className="text-xs font-medium"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Scan via Camera
              </Button>
            </div>

            <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-center gap-3">
              <span>Supported: JPG, PNG, WEBP, PDF</span>
              <span>•</span>
              <span>Max: 15MB</span>
              <span>•</span>
              <span className="text-primary font-semibold">Instant AI Parsing</span>
            </div>

            {errorMessage && (
              <div className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg p-2.5 mt-2">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
