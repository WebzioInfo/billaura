import React from 'react';
import { formatIndianCurrency } from '../../../../utils/currencyFormatter';
import { numberToWords } from '../../../../utils/numberToWords';

interface InvoiceSummaryProps {
  totals: {
    subtotal: number;
    cgstAmount?: number;
    cgstPercent?: number;
    sgstAmount?: number;
    sgstPercent?: number;
    igstAmount?: number;
    igstPercent?: number;
    discount?: number;
    roundOff?: number;
    grandTotal: number;
    paidAmount?: number;
    balanceDue: number;
  };
  isIgst: boolean;
}

export const InvoiceSummary: React.FC<InvoiceSummaryProps> = ({ totals, isIgst }) => {
  return (
    <div className="w-full flex border mb-4">
      <div className="w-1/2 p-2 border-r flex flex-col">
        <span className="text-gray-600 text-sm">Total In Words</span>
        <span className="font-bold text-sm italic">{numberToWords(totals.grandTotal)}</span>
      </div>
      <div className="w-1/2 flex flex-col">
        <div className="flex justify-between p-1 px-4 text-sm">
          <span className="text-gray-700">Sub Total</span>
          <span className="font-medium">{formatIndianCurrency(totals.subtotal).replace('₹', '')}</span>
        </div>
        {totals.discount && totals.discount > 0 ? (
          <div className="flex justify-between p-1 px-4 text-sm">
            <span className="text-gray-700">Discount</span>
            <span className="font-medium">-{formatIndianCurrency(totals.discount).replace('₹', '')}</span>
          </div>
        ) : null}
        
        {!isIgst ? (
          <>
            <div className="flex justify-between p-1 px-4 text-sm">
              <span className="text-gray-700">CGST ({totals.cgstPercent || 0}%)</span>
              <span className="font-medium">{formatIndianCurrency(totals.cgstAmount || 0).replace('₹', '')}</span>
            </div>
            <div className="flex justify-between p-1 px-4 text-sm">
              <span className="text-gray-700">SGST ({totals.sgstPercent || 0}%)</span>
              <span className="font-medium">{formatIndianCurrency(totals.sgstAmount || 0).replace('₹', '')}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between p-1 px-4 text-sm">
            <span className="text-gray-700">IGST ({totals.igstPercent || 0}%)</span>
            <span className="font-medium">{formatIndianCurrency(totals.igstAmount || 0).replace('₹', '')}</span>
          </div>
        )}

        {totals.roundOff ? (
          <div className="flex justify-between p-1 px-4 text-sm">
            <span className="text-gray-700">Round Off</span>
            <span className="font-medium">{totals.roundOff > 0 ? '+' : ''}{totals.roundOff.toFixed(2)}</span>
          </div>
        ) : null}

        <div className="flex justify-between p-1 px-4 font-bold text-sm bg-gray-50 border-t">
          <span>Total</span>
          <span>{formatIndianCurrency(totals.grandTotal)}</span>
        </div>
        
        {totals.paidAmount && totals.paidAmount > 0 ? (
          <div className="flex justify-between p-1 px-4 text-sm border-t">
            <span className="text-gray-700">Paid Amount</span>
            <span className="font-medium">{formatIndianCurrency(totals.paidAmount)}</span>
          </div>
        ) : null}

        <div className="flex justify-between p-1 px-4 font-bold text-sm border-t">
          <span>Balance Due</span>
          <span>{formatIndianCurrency(totals.balanceDue)}</span>
        </div>
      </div>
    </div>
  );
};
