import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface InvoiceQRCodeProps {
  value: string;
}

export const InvoiceQRCode: React.FC<InvoiceQRCodeProps> = ({ value }) => {
  return (
    <div className="border border-gray-200 p-1 bg-white inline-block">
      <QRCodeSVG value={value} size={100} level="M" />
    </div>
  );
};
