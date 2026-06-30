import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';

export const InvoiceForm = () => {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Create Invoice"
        description="Draft a new sales invoice"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md text-sm">
            Save Invoice
          </button>
        }
      />
      <div className="glass-panel p-6 rounded-2xl border border-border">
        <p className="text-muted-foreground text-sm">Invoice form implementation goes here.</p>
      </div>
    </div>
  );
};
