import React from 'react';

interface Address {
  name: string;
  address: string;
  gstin?: string;
  phone?: string;
  stateCode?: string;
  country?: string;
}

interface InvoiceCustomerInfoProps {
  billing: Address;
  shipping?: Address;
}

export const InvoiceCustomerInfo: React.FC<InvoiceCustomerInfoProps> = ({ billing, shipping }) => {
  const shipTo = shipping && shipping.address ? shipping : billing;

  return (
    <div className="w-full flex text-sm mb-4 border">
      <div className="w-1/2 flex flex-col border-r">
        <div className="bg-gray-100 px-2 py-1 font-semibold border-b text-gray-800">Bill To</div>
        <div className="p-2 flex flex-col gap-0.5">
          <span className="font-bold uppercase">{billing.name}</span>
          <span className="whitespace-pre-line text-gray-700">{billing.address}</span>
          {billing.stateCode && <span className="text-gray-700">{billing.stateCode}</span>}
          {billing.country && <span className="text-gray-700">{billing.country}</span>}
          {billing.gstin && <span className="text-gray-700 mt-1">GSTIN: {billing.gstin}</span>}
          {billing.phone && <span className="text-gray-700">{billing.phone}</span>}
        </div>
      </div>
      <div className="w-1/2 flex flex-col">
        <div className="bg-gray-100 px-2 py-1 font-semibold border-b text-gray-800">Ship To</div>
        <div className="p-2 flex flex-col gap-0.5">
          <span className="font-bold uppercase">{shipTo.name}</span>
          <span className="whitespace-pre-line text-gray-700">{shipTo.address}</span>
          {shipTo.stateCode && <span className="text-gray-700">{shipTo.stateCode}</span>}
          {shipTo.country && <span className="text-gray-700">{shipTo.country}</span>}
          {shipTo.gstin && <span className="text-gray-700 mt-1">GSTIN: {shipTo.gstin}</span>}
          {shipTo.phone && <span className="text-gray-700">{shipTo.phone}</span>}
        </div>
      </div>
    </div>
  );
};
