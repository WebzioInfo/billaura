import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';

export const BillForm = () => {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Create Bill"
        description="Record a new purchase bill"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md text-sm">
            Save Bill
          </button>
        }
      />
      <div className="glass-panel p-6 rounded-2xl border border-border">
        <p className="text-muted-foreground text-sm">Bill form implementation goes here.</p>
      </div>
    </div>
  );
};
