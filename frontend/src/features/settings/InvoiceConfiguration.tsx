import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer } from '@/shared/components/ui/LayoutComponents';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { Plus, Tag, Percent, Binary, CheckCircle2 } from 'lucide-react';

export const InvoiceConfiguration: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'categories' | 'tax' | 'series'>('categories');

  // Categories query
  const { data: categoriesData, isLoading: catLoading } = useQuery({
    queryKey: ['invoice-categories'],
    queryFn: () => apiClient.get('/invoice-config/categories')
  });

  // Tax Treatments query
  const { data: taxData, isLoading: taxLoading } = useQuery({
    queryKey: ['tax-treatments'],
    queryFn: () => apiClient.get('/invoice-config/tax-treatments')
  });

  // Series query
  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ['numbering-series'],
    queryFn: () => apiClient.get('/invoice-config/numbering-series')
  });

  const categories = categoriesData?.data?.items || categoriesData?.data || [];
  const taxTreatments = taxData?.data?.items || taxData?.data || [];
  const seriesList = seriesData?.data?.items || seriesData?.data || [];

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Invoice Classification & Engine Settings"
        description="Configure rules for Sales Invoice categories, tax treatments, and numbering series."
      />

      <div className="flex gap-4 border-b border-border pb-2 mb-6">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'categories' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted/10'
          }`}
        >
          <Tag className="w-4 h-4" />
          Invoice Categories
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'tax' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted/10'
          }`}
        >
          <Percent className="w-4 h-4" />
          Tax Treatments
        </button>
        <button
          onClick={() => setActiveTab('series')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'series' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted/10'
          }`}
        >
          <Binary className="w-4 h-4" />
          Numbering Series
        </button>
      </div>

      {activeTab === 'categories' && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-foreground">Configured Categories</h3>
          </div>
          <div className="divide-y divide-border">
            {categories.map((cat: any) => (
              <div key={cat.id} className="py-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-foreground">{cat.name} <span className="text-xs text-muted-foreground">({cat.code})</span></h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.description || 'No description provided'}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium">
                    {cat.taxTreatment?.name || 'Default Tax'}
                  </span>
                  <span className="bg-muted text-foreground px-2.5 py-1 rounded-full font-mono">
                    {cat.numberingSeries?.prefix || 'INV-'}
                  </span>
                </div>
              </div>
            ))}
            {categories.length === 0 && !catLoading && (
              <div className="text-center py-8 text-muted-foreground text-sm">No categories configured yet.</div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'tax' && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-foreground">Tax Treatments</h3>
          </div>
          <div className="divide-y divide-border">
            {taxTreatments.map((tax: any) => (
              <div key={tax.id} className="py-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-foreground">{tax.name} <span className="text-xs text-muted-foreground">({tax.code})</span></h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Type: {tax.treatmentType}</p>
                </div>
                <div className="text-xs font-semibold text-accent">
                  IGST: {tax.igstRate}% | CGST: {tax.cgstRate}% | SGST: {tax.sgstRate}%
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'series' && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-foreground">Multi-Series Numbering Sequences</h3>
          </div>
          <div className="divide-y divide-border">
            {seriesList.map((ser: any) => (
              <div key={ser.id} className="py-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-foreground">{ser.name} <span className="text-xs text-muted-foreground">({ser.code})</span></h4>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">Pattern: {ser.numberFormat}</p>
                </div>
                <div className="text-xs font-mono font-bold text-accent">
                  Current Count: {ser.currentNumber}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageContainer>
  );
};
