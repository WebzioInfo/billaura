import React from 'react';
import { InvoiceQRCode } from './InvoiceQRCode';

interface InvoiceTermsProps {
  notes?: string;
  termsAndConditions?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifsc: string;
    branch?: string;
  };
  qrData?: string;
}

export const InvoiceTerms: React.FC<InvoiceTermsProps> = ({ notes, termsAndConditions, bankDetails, qrData }) => {
  return (
    <div className="w-full flex border mb-4 text-sm">
      <div className="w-2/3 p-2 border-r flex flex-col gap-4">
        {notes && (
          <div>
            <div className="font-semibold text-gray-700">Notes</div>
            <div className="text-gray-600 whitespace-pre-line">{notes}</div>
          </div>
        )}
        
        {bankDetails && (
          <div>
            <div className="font-semibold text-gray-700 uppercase">{bankDetails.accountName}</div>
            <div className="text-gray-600">ACCOUNT NUMBER: {bankDetails.accountNumber}</div>
            <div className="text-gray-600">{bankDetails.bankName}</div>
            <div className="text-gray-600">IFSC: {bankDetails.ifsc}</div>
            {bankDetails.branch && <div className="text-gray-600 uppercase">{bankDetails.branch} BRANCH</div>}
          </div>
        )}

        {termsAndConditions && (
          <div>
            <div className="font-semibold text-gray-700">Terms & Conditions</div>
            <div className="text-gray-600 whitespace-pre-line">{termsAndConditions}</div>
          </div>
        )}

        {qrData && (
          <div className="flex gap-4 items-center mt-2">
            <InvoiceQRCode value={qrData} />
            <div className="text-xs text-gray-500 w-16 leading-tight">Scan to Pay</div>
          </div>
        )}
      </div>
      <div className="w-1/3 flex flex-col justify-end p-2 items-center text-center">
        <div className="border-t w-3/4 border-gray-400 pt-1 text-gray-700 mt-16">
          Authorized Signature
        </div>
      </div>
    </div>
  );
};
