import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import apiClient from '@/core/api';

export const InvoicePrintView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/sales/invoices')}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </button>
          <div className="h-4 w-px bg-border"></div>
          <h1 className="text-lg font-semibold text-foreground">
            Print Invoice
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-0">
        <iframe 
          src={`${import.meta.env.VITE_API_URL}/sales/invoices/${id}/pdf`}
          width="100%" 
          height="100%" 
          className="border-none"
          title="Invoice PDF"
        />
      </main>
    </div>
  );
};
