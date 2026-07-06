import React from 'react';

// Formats a number to Indian Rupee formatting (e.g., ₹12,450.50)
export const formatIndianRupee = (value: number | string | null | undefined, minimumFractionDigits = 2) => {
  if (value === null || value === undefined) return '₹0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0.00';
  
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  });
};

interface AmountTextProps {
  value: number | string | null | undefined;
  className?: string;
  isTotal?: boolean;
  isPositive?: boolean;
  isNegative?: boolean;
  minimumFractionDigits?: number;
}

export const AmountText: React.FC<AmountTextProps> = ({
  value,
  className = '',
  isTotal = false,
  isPositive = false,
  isNegative = false,
  minimumFractionDigits = 2
}) => {
  let colorClass = 'text-foreground';
  if (isPositive) colorClass = 'text-green-600 font-bold';
  else if (isNegative) colorClass = 'text-red-500 font-bold';
  else if (isTotal) colorClass = 'text-accent font-extrabold';

  const sizeClass = isTotal ? 'text-lg md:text-xl font-extrabold' : 'text-sm font-semibold';

  return (
    <span
      className={`tabular-nums font-mono ${sizeClass} ${colorClass} ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {formatIndianRupee(value, minimumFractionDigits)}
    </span>
  );
};

interface SummaryRowProps {
  label: React.ReactNode;
  value: number | string | null | undefined;
  isTotal?: boolean;
  isPositive?: boolean;
  isNegative?: boolean;
  className?: string;
  minimumFractionDigits?: number;
}

export const SummaryRow: React.FC<SummaryRowProps> = ({
  label,
  value,
  isTotal = false,
  isPositive = false,
  isNegative = false,
  className = '',
  minimumFractionDigits = 2
}) => {
  return (
    <div className={`flex justify-between items-center py-2.5 border-b border-border/20 last:border-b-0 ${isTotal ? 'border-t border-border/60 pt-4 mt-2' : ''} ${className}`}>
      <span className={`text-xs font-semibold text-muted-foreground ${isTotal ? 'text-foreground font-black text-sm uppercase' : ''}`}>
        {label}
      </span>
      <AmountText
        value={value}
        isTotal={isTotal}
        isPositive={isPositive}
        isNegative={isNegative}
        minimumFractionDigits={minimumFractionDigits}
      />
    </div>
  );
};

interface FinancialSummaryProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  title,
  children,
  className = ''
}) => {
  return (
    <div className={`bg-muted/15 border border-border/70 rounded-2xl p-6 space-y-4 shadow-sm w-full ${className}`}>
      {title && (
        <div className="font-extrabold text-foreground border-b border-border/50 pb-2 mb-3 uppercase tracking-wider text-xs">
          {title}
        </div>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
};
