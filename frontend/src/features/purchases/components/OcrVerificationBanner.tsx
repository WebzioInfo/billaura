import React from 'react';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, Sparkles, 
  ExternalLink, Eye, ShieldCheck, RefreshCw, X 
} from 'lucide-react';
import { Button } from '@/shared/components/ui';

interface OcrVerificationBannerProps {
  isVerified: boolean;
  onVerify: () => void;
  onOpenViewer: () => void;
  onResetOcr?: () => void;
  ocrTotal?: number;
  calculatedTotal: number;
  warnings?: Array<{ code: string; message: string; severity: string }>;
  duplicateInfo?: {
    isPossibleDuplicate: boolean;
    existingBillId?: string;
    existingPurchaseNo?: string;
    existingInvoiceNo?: string;
  };
  matchedVendorName?: string;
}

export const OcrVerificationBanner: React.FC<OcrVerificationBannerProps> = ({
  isVerified,
  onVerify,
  onOpenViewer,
  onResetOcr,
  ocrTotal,
  calculatedTotal,
  warnings = [],
  duplicateInfo,
  matchedVendorName,
}) => {
  const hasTotalMismatch = ocrTotal !== undefined && Math.abs(ocrTotal - calculatedTotal) > 2;

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${
      isVerified
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
        : 'bg-primary/5 border-primary/20 text-foreground'
    }`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Status & Checklist */}
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Bill Information Verified by User
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                <Sparkles className="w-3.5 h-3.5" />
                AI / OCR Bill Extracted — Verification Required
              </span>
            )}

            {matchedVendorName && (
              <span className="text-xs text-muted-foreground">
                Matched Vendor: <strong className="text-foreground">{matchedVendorName}</strong>
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {isVerified
              ? 'All extracted vendor, invoice, line item, and tax fields have been reviewed and unlocked for accounting posting.'
              : 'Please carefully verify Vendor, Invoice Number, Billing Date, Line Items, Rates, GST %, and Totals against the source document before saving.'}
          </p>

          {/* Warnings List */}
          {warnings.length > 0 && (
            <div className="space-y-1 pt-1">
              {warnings.map((w, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-1.5 text-xs font-medium rounded-lg p-2 ${
                    w.severity === 'warning'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                      : 'bg-muted/50 text-muted-foreground border border-border'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total Discrepancy Box */}
          {hasTotalMismatch && (
            <div className="flex items-start gap-2 text-xs font-semibold rounded-lg p-2.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div>
                <span>Total Discrepancy Detected: </span>
                <span>Original Invoice Grand Total: <strong>₹{ocrTotal?.toLocaleString()}</strong></span>
                <span className="mx-2">•</span>
                <span>Form Calculated Total: <strong>₹{calculatedTotal?.toLocaleString()}</strong></span>
                <p className="text-[11px] font-normal text-rose-600/90 dark:text-rose-400/90 mt-0.5">
                  Difference of ₹{Math.abs((ocrTotal || 0) - calculatedTotal).toLocaleString()}. Check line rates, discounts, or tax percentages.
                </p>
              </div>
            </div>
          )}

          {/* Duplicate Alert */}
          {duplicateInfo?.isPossibleDuplicate && (
            <div className="flex items-start gap-2 text-xs font-semibold rounded-lg p-2.5 bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span>Potential Duplicate Bill: </span>
                <span>An existing purchase bill <strong>{duplicateInfo.existingPurchaseNo}</strong> has the same invoice number <strong>#{duplicateInfo.existingInvoiceNo}</strong>.</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenViewer}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <Eye className="w-3.5 h-3.5" />
            Inspect Original Bill
          </Button>

          {!isVerified ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onVerify}
              className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Verify & Continue
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onVerify}
              className="flex items-center gap-1 text-xs"
              title="Click to re-open verification review"
            >
              <RefreshCw className="w-3 h-3" />
              Edit & Re-verify
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
