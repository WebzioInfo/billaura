import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/utils/toast';
import apiClient from '@/services/api';
import { Button, Input, Select } from '@/components/ui';
import { Loader2, Save, FileText, Settings, RefreshCw } from 'lucide-react';

const DOCUMENT_TYPES = [
  { id: 'INVOICE', label: 'Sales Invoice', prefix: 'INV-{YY}-' },
  { id: 'QUOTATION', label: 'Quotation', prefix: 'QT-{YY}-' },
  { id: 'RECEIPT', label: 'Payment Receipt', prefix: 'REC-{YY}-' },
  { id: 'PURCHASE_ORDER', label: 'Purchase Order', prefix: 'PO-{YY}-' },
  { id: 'BILL', label: 'Purchase Bill', prefix: 'BILL-{YY}-' },
  { id: 'PAYMENT', label: 'Payment Made', prefix: 'PAY-{YY}-' },
  { id: 'JOURNAL', label: 'Journal Entry', prefix: 'JV-{YY}-' },
];

export const DocumentNumbering = () => {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState('INVOICE');
  const [formData, setFormData] = useState({
    prefix: '',
    suffix: '',
    padding: 6,
    currentNumber: 0,
    resetLogic: 'NEVER',
    sequenceType: 'SEQUENTIAL',
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['sequence-config', activeType],
    queryFn: async () => {
      const res = await apiClient.get(`/sequences/config/${activeType}`);
      const data = res.data?.data;
      if (data) {
        setFormData({
          prefix: data.prefix || '',
          suffix: data.suffix || '',
          padding: data.padding || 6,
          currentNumber: data.currentNumber || 0,
          resetLogic: data.resetLogic || 'NEVER',
          sequenceType: data.sequenceType || 'SEQUENTIAL',
        });
      } else {
        // Defaults if none exist
        const defaultType = DOCUMENT_TYPES.find(d => d.id === activeType);
        setFormData({
          prefix: defaultType?.prefix || '',
          suffix: '',
          padding: 6,
          currentNumber: 0,
          resetLogic: 'YEARLY',
          sequenceType: 'SEQUENTIAL',
        });
      }
      return data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiClient.post(`/sequences/config/${activeType}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Sequence settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['sequence-config'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save sequence settings');
    }
  });

  const generatePreview = () => {
    const { prefix, suffix, padding, currentNumber, sequenceType } = formData;
    const now = new Date();
    const year = now.getFullYear().toString();
    const shortYear = year.substring(2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    const formattedPrefix = (prefix || '')
      .replace(/{YYYY}/g, year)
      .replace(/{YY}/g, shortYear)
      .replace(/{MM}/g, month);

    const formattedSuffix = (suffix || '')
      .replace(/{YYYY}/g, year)
      .replace(/{YY}/g, shortYear)
      .replace(/{MM}/g, month);

    if (sequenceType === 'RANDOM') {
      return `${formattedPrefix}X8F29K${formattedSuffix}`;
    }

    const numStr = (currentNumber + 1).toString().padStart(padding, '0');
    return `${formattedPrefix}${numStr}${formattedSuffix}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Document Numbering</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure sequence rules for each document type in your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document Type Selector */}
        <div className="lg:col-span-1 space-y-2">
          {DOCUMENT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeType === type.id 
                ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
                : 'hover:bg-muted text-foreground border border-transparent'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeType === type.id ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 text-left text-sm font-medium">{type.label}</div>
            </button>
          ))}
        </div>

        {/* Configuration Form */}
        <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6 shadow-sm">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Live Preview */}
              <div className="bg-muted/50 p-6 rounded-xl border border-border/50 text-center space-y-2">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Next Number Preview</div>
                <div className="text-3xl font-bold text-primary font-mono">{generatePreview()}</div>
                <div className="text-xs text-muted-foreground max-w-md mx-auto mt-2">
                  Supports dynamic variables: {"{YYYY}"} (2026), {"{YY}"} (26), {"{MM}"} (07).
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Prefix"
                  value={formData.prefix}
                  onChange={e => setFormData({ ...formData, prefix: e.target.value })}
                  placeholder="e.g. INV-{YY}-"
                />
                
                <Input
                  label="Suffix"
                  value={formData.suffix}
                  onChange={e => setFormData({ ...formData, suffix: e.target.value })}
                  placeholder="e.g. /MUM"
                />

                <Select
                  label="Number Padding (Length)"
                  value={formData.padding.toString()}
                  onChange={e => setFormData({ ...formData, padding: parseInt(e.target.value) })}
                  options={[
                    { label: '4 Digits (0001)', value: '4' },
                    { label: '5 Digits (00001)', value: '5' },
                    { label: '6 Digits (000001)', value: '6' },
                    { label: '7 Digits (0000001)', value: '7' },
                  ]}
                />

                <Select
                  label="Reset Logic"
                  value={formData.resetLogic}
                  onChange={e => setFormData({ ...formData, resetLogic: e.target.value })}
                  options={[
                    { label: 'Never Reset', value: 'NEVER' },
                    { label: 'Reset Yearly', value: 'YEARLY' },
                    { label: 'Reset Monthly', value: 'MONTHLY' },
                  ]}
                />

                <div className="md:col-span-2">
                  <Input
                    label="Current Sequence Value (Last Generated)"
                    type="number"
                    value={formData.currentNumber.toString()}
                    onChange={e => setFormData({ ...formData, currentNumber: parseInt(e.target.value) || 0 })}
                    helperText="Changing this will affect the next generated document. Use with caution."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button
                  variant="primary"
                  onClick={() => saveMutation.mutate(formData)}
                  disabled={saveMutation.isPending}
                  className="gap-2"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Sequence Rules
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
