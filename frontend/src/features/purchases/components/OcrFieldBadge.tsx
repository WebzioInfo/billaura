import React from 'react';
import { Sparkles, Check, AlertTriangle, AlertCircle } from 'lucide-react';

interface OcrFieldBadgeProps {
  status?: 'extracted' | 'modified' | 'unmodified';
  confidence?: number; // 0.0 - 1.0
  className?: string;
}

export const OcrFieldBadge: React.FC<OcrFieldBadgeProps> = ({
  status,
  confidence,
  className = '',
}) => {
  if (!status || status === 'unmodified') return null;

  if (status === 'modified') {
    return (
      <span
        title="Value modified and manually confirmed by user"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 ${className}`}
      >
        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        Verified
      </span>
    );
  }

  // Extracted with confidence
  let confText = 'Extracted';
  let confBadgeClass = 'bg-primary/10 text-primary border-primary/20';
  let ConfIcon = Sparkles;

  if (confidence !== undefined) {
    if (confidence >= 0.85) {
      confText = 'High confidence';
      confBadgeClass = 'bg-primary/10 text-primary border-primary/20';
      ConfIcon = Sparkles;
    } else if (confidence >= 0.65) {
      confText = 'Review needed';
      confBadgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      ConfIcon = AlertTriangle;
    } else {
      confText = 'Low confidence';
      confBadgeClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      ConfIcon = AlertCircle;
    }
  }

  return (
    <span
      title={`AI Extracted (${confidence ? Math.round(confidence * 100) + '%' : 'OCR'})`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${confBadgeClass} ${className}`}
    >
      <ConfIcon className="w-3 h-3" />
      {confText}
    </span>
  );
};
