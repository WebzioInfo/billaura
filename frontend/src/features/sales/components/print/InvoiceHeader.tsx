import React from 'react';

interface InvoiceHeaderProps {
  company: {
    logo?: string;
    name: string;
    address: string;
    gstin: string;
    phone: string;
    email: string;
  };
  invoice: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    paymentTerms?: string;
    placeOfSupply?: string;
    salesPerson?: string;
  };
}

export const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({ company, invoice }) => {
  return (
    <div className="w-full flex flex-col mb-4">
      {/* Top row: Logo and Company Info */}
      <div className="flex justify-between items-start border-b pb-4">
        <div className="flex gap-4 items-center">
          {company.logo ? (
            <img src={company.logo} alt="Company Logo" className="h-16 object-contain" />
          ) : (
            <div className="h-16 w-32 bg-gray-200 flex items-center justify-center font-bold text-2xl text-gray-500">
              {company.name.substring(0, 3).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="font-bold text-lg m-0 p-0 uppercase text-gray-800">{company.name}</h1>
            <p className="text-sm m-0 p-0 text-gray-700 max-w-xs">{company.address}</p>
            <p className="text-sm m-0 p-0 text-gray-700">{company.email}</p>
            {company.gstin && <p className="text-sm m-0 p-0 text-gray-700">GSTIN: {company.gstin}</p>}
            {company.phone && <p className="text-sm m-0 p-0 text-gray-700">{company.phone}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-semibold m-0 p-0 uppercase tracking-widest text-gray-800">TAX INVOICE</h2>
        </div>
      </div>

      {/* Details row */}
      <div className="flex w-full text-sm border-b pb-2 pt-2">
        <div className="w-1/2 flex flex-col gap-1 pr-4 border-r">
          <div className="flex"><span className="w-32 text-gray-600">Invoice Number</span><span className="font-medium">: {invoice.invoiceNumber}</span></div>
          <div className="flex"><span className="w-32 text-gray-600">Invoice Date</span><span className="font-medium">: {invoice.invoiceDate}</span></div>
          {invoice.paymentTerms && <div className="flex"><span className="w-32 text-gray-600">Terms</span><span className="font-medium">: {invoice.paymentTerms}</span></div>}
          {invoice.dueDate && <div className="flex"><span className="w-32 text-gray-600">Due Date</span><span className="font-medium">: {invoice.dueDate}</span></div>}
        </div>
        <div className="w-1/2 flex flex-col gap-1 pl-4">
          {invoice.placeOfSupply && <div className="flex"><span className="w-32 text-gray-600">Place of Supply</span><span className="font-medium">: {invoice.placeOfSupply}</span></div>}
          {invoice.salesPerson && <div className="flex"><span className="w-32 text-gray-600">Sales person</span><span className="font-medium">: {invoice.salesPerson}</span></div>}
        </div>
      </div>
    </div>
  );
};
