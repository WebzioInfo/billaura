import React from 'react';
import { Layers } from 'lucide-react'; // Or any icon if provided

export const InvoiceFooter: React.FC = () => {
  return (
    <div className="w-full mt-auto pt-4 flex items-center justify-between text-xs text-gray-500 pb-2">
      <div className="flex items-center gap-1 font-semibold uppercase tracking-wide">
        POWERED BY 
        <Layers size={16} className="text-blue-500 ml-1" />
        <span className="text-gray-800">BILL AURA</span>
      </div>
      <div>1</div>
    </div>
  );
};
