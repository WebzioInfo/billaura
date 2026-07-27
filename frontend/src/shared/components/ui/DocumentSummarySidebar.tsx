import React from 'react';

const formatIndianCurrency = (amount: number) => {
  const rounded = Math.abs(amount) < 0.005 ? 0 : amount;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
};

export interface TaxSummaryLine {
  rate: number;
  taxableValue: number;
  taxAmount: number;
}

export interface DocumentTotals {
  totalQty: number;
  numItems: number;
  rawSubTotal: number;
  totalDiscountAmount: number;
  subTotal: number;
  isInterState: boolean;
  igstTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  roundOff: number;
  grandTotal: number;
  taxSummary: TaxSummaryLine[];
}

interface DocumentSummarySidebarProps {
  totals: DocumentTotals;
  invoiceType: string;
  docType?: string;
  currencySymbol: string;
  title?: string;
  className?: string;
}

export const DocumentSummarySidebar: React.FC<DocumentSummarySidebarProps> = ({
  totals,
  invoiceType,
  docType,
  currencySymbol,
  title = 'Document Summary',
  className = '',
}) => {
  const isNonGst = docType === 'BILL_OF_SUPPLY' || docType === 'EXEMPT_SUPPLY' || docType === 'NIL_RATED_INVOICE' || docType === 'EXPORT_INVOICE' || invoiceType === 'NO_TAX';

  return (
    <div className={`w-full space-y-4 bg-muted/20 border border-border/60 rounded-2xl p-6 ${className}`}>
      <div className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 mb-3">{title}</div>
      
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex justify-between text-xs border-b border-dashed border-border/50 pb-2 mb-2">
          <span>Total Quantity / Items</span>
          <span className="font-semibold text-foreground">{totals.totalQty} Units / {totals.numItems} Items</span>
        </div>

        <div className="flex justify-between">
          <span>Subtotal Gross</span>
          <span>{currencySymbol}{formatIndianCurrency(totals.rawSubTotal)}</span>
        </div>
        {totals.totalDiscountAmount > 0 && (
          <div className="flex justify-between text-green-600 font-medium">
            <span>Discount Saved</span>
            <span>-{currencySymbol}{formatIndianCurrency(totals.totalDiscountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-dashed border-border/50 pt-2 text-foreground font-medium">
          <span>Taxable Base Subtotal</span>
          <span>{currencySymbol}{formatIndianCurrency(totals.subTotal)}</span>
        </div>
        
        {!isNonGst && (
          <>
            {totals.isInterState ? (
              <div className="flex justify-between text-xs">
                <span>Integrated GST (IGST)</span>
                <span>{currencySymbol}{formatIndianCurrency(totals.igstTotal)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span>Central GST (CGST)</span>
                  <span>{currencySymbol}{formatIndianCurrency(totals.cgstTotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>State GST (SGST)</span>
                  <span>{currencySymbol}{formatIndianCurrency(totals.sgstTotal)}</span>
                </div>
              </>
            )}
          </>
        )}

        {totals.roundOff !== 0 && (
          <div className="flex justify-between text-xs border-t border-dashed border-border/40 pt-1">
            <span>Round Off</span>
            <span>{totals.roundOff > 0 ? '+' : ''}{currencySymbol}{formatIndianCurrency(totals.roundOff)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between font-bold text-lg pt-3 border-t border-border text-foreground">
        <span>Grand Total</span>
        <span>{currencySymbol}{formatIndianCurrency(totals.grandTotal)}</span>
      </div>

      {/* Grouped Tax Summary matrix */}
      {totals.taxSummary && totals.taxSummary.length > 0 && !isNonGst && (
        <div className="mt-4 pt-3 border-t border-dashed border-border/50 text-[10px] space-y-1">
          <div className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">GST Breakdown matrix</div>
          {totals.taxSummary.map((sm) => (
            <div key={sm.rate} className="flex justify-between text-muted-foreground">
              <span>GST @ {sm.rate}% (Taxable: {currencySymbol}{formatIndianCurrency(sm.taxableValue)})</span>
              <span>{currencySymbol}{formatIndianCurrency(sm.taxAmount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
