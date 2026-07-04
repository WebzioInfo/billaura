import React from 'react';
import { formatIndianCurrency } from '../../../../utils/currencyFormatter';

export interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  discount?: number;
  cgstPercent?: number;
  cgstAmount?: number;
  sgstPercent?: number;
  sgstAmount?: number;
  igstPercent?: number;
  igstAmount?: number;
  total: number;
}

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  isIgst: boolean;
}

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({ items, isIgst }) => {
  return (
    <table className="w-full text-sm border-collapse print-table border border-gray-300 mb-4">
      <thead className="bg-gray-100 text-gray-800">
        <tr>
          <th className="border p-2 text-left w-8" rowSpan={2}>#</th>
          <th className="border p-2 text-left" rowSpan={2}>Item & Description</th>
          <th className="border p-2 text-left" rowSpan={2}>HSN<br/>/SAC</th>
          <th className="border p-2 text-right" rowSpan={2}>Qty</th>
          <th className="border p-2 text-right" rowSpan={2}>Rate</th>
          {!isIgst ? (
            <>
              <th className="border p-1 text-center" colSpan={2}>CGST</th>
              <th className="border p-1 text-center" colSpan={2}>SGST</th>
            </>
          ) : (
            <th className="border p-1 text-center" colSpan={2}>IGST</th>
          )}
          <th className="border p-2 text-right" rowSpan={2}>Amount</th>
        </tr>
        <tr>
          {!isIgst ? (
            <>
              <th className="border p-1 text-right">%</th>
              <th className="border p-1 text-right">Amt</th>
              <th className="border p-1 text-right">%</th>
              <th className="border p-1 text-right">Amt</th>
            </>
          ) : (
            <>
              <th className="border p-1 text-right">%</th>
              <th className="border p-1 text-right">Amt</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={item.id} className="text-gray-700">
            <td className="border p-2 text-center align-top">{index + 1}</td>
            <td className="border p-2 align-top">
              <div className="font-semibold">{item.name}</div>
              {item.description && <div className="text-xs text-gray-500 mt-1">{item.description}</div>}
            </td>
            <td className="border p-2 align-top">{item.hsn}</td>
            <td className="border p-2 text-right align-top">
              {item.quantity.toFixed(2)}<br/>
              <span className="text-xs text-gray-500">{item.unit}</span>
            </td>
            <td className="border p-2 text-right align-top">{formatIndianCurrency(item.rate).replace('₹', '')}</td>
            
            {!isIgst ? (
              <>
                <td className="border p-2 text-right align-top">{item.cgstPercent}%</td>
                <td className="border p-2 text-right align-top">{item.cgstAmount ? formatIndianCurrency(item.cgstAmount).replace('₹', '') : '0.00'}</td>
                <td className="border p-2 text-right align-top">{item.sgstPercent}%</td>
                <td className="border p-2 text-right align-top">{item.sgstAmount ? formatIndianCurrency(item.sgstAmount).replace('₹', '') : '0.00'}</td>
              </>
            ) : (
              <>
                <td className="border p-2 text-right align-top">{item.igstPercent}%</td>
                <td className="border p-2 text-right align-top">{item.igstAmount ? formatIndianCurrency(item.igstAmount).replace('₹', '') : '0.00'}</td>
              </>
            )}
            
            <td className="border p-2 text-right align-top">{formatIndianCurrency(item.total).replace('₹', '')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
