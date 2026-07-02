import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, ArrowLeft, Save, FileText, Eye, X, Loader2, Info 
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import apiClient from '@/services/api';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { toast } from 'sonner';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", 
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
  "Ladakh", "Lakshadweep", "Puducherry"
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (INR)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP)' },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt', days: 0 },
  { value: 'NET_15', label: 'Net 15', days: 15 },
  { value: 'NET_30', label: 'Net 30', days: 30 },
  { value: 'NET_45', label: 'Net 45', days: 45 },
  { value: 'NET_60', label: 'Net 60', days: 60 },
];

const invoiceItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  description: z.string().optional(),
  qty: z.coerce.number().min(1, 'Qty must be >= 1'),
  rate: z.coerce.number().min(0, 'Rate must be >= 0'),
  taxPercent: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).max(100, 'Discount must be <= 100').default(0),
  unit: z.string().optional(),
});

const invoiceSchema = z.object({
  invoiceType: z.enum(['B2B', 'B2C', 'NO_TAX']),
  customerId: z.string().min(1, 'Select a customer'),
  date: z.string().nonempty('Select date'),
  dueDate: z.string().optional(),
  paymentTerms: z.string().default('NET_30'),
  currency: z.string().default('INR'),
  placeOfSupply: z.string().optional(),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

import { useQuery } from '@tanstack/react-query';

export const InvoiceForm = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'DRAFT' | 'SENT'>('SENT');

  // React Query cached fetches for master data dependencies
  const { data: meData, error: meError, isLoading: meLoading } = useQuery<any>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: customersData, error: custError, isLoading: custLoading } = useQuery<any>({
    queryKey: ['customers'],
    queryFn: () => apiClient.get('/customers'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: productsData, error: prodError, isLoading: prodLoading } = useQuery<any>({
    queryKey: ['products'],
    queryFn: () => apiClient.get('/inventory/products'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: unitsData, error: unitsError, isLoading: unitsLoading } = useQuery<any>({
    queryKey: ['units'],
    queryFn: () => apiClient.get('/units').catch(() => []),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Memoize data conversions to ensure component updates stay performant
  const customers = useMemo(() => {
    const list = customersData?.data || customersData || [];
    return Array.isArray(list) ? list : [];
  }, [customersData]);

  const products = useMemo(() => {
    const list = productsData?.data || productsData || [];
    return Array.isArray(list) ? list : [];
  }, [productsData]);

  const units = useMemo(() => {
    const list = unitsData?.data || unitsData || [];
    return Array.isArray(list) ? list : [];
  }, [unitsData]);

  const companyProfile = useMemo(() => {
    return meData?.company || meData?.data?.company || null;
  }, [meData]);

  const isLoading = meLoading || custLoading || prodLoading || unitsLoading;

  // Single unified error toast handler to prevent toast flooding
  const hasError = meError || custError || prodError || unitsError;
  useEffect(() => {
    if (hasError) {
      toast.error("Failed to load customer or product master data");
    }
  }, [hasError]);

  const { register, control, handleSubmit, watch, formState: { errors }, setValue } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema as any) as any,
    defaultValues: {
      invoiceType: 'B2B',
      date: new Date().toISOString().split('T')[0],
      paymentTerms: 'NET_30',
      currency: 'INR',
      items: [{ productId: '', description: '', qty: 1, rate: 0, taxPercent: 18, discount: 0, unit: 'Pcs' }],
      termsConditions: "1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% per annum will be charged if payment is not received within due date.",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const invoiceType = watch('invoiceType');
  const items = watch('items');
  const invoiceDate = watch('date');
  const paymentTerms = watch('paymentTerms');
  const customerId = watch('customerId');
  const selectedPlaceOfSupply = watch('placeOfSupply');
  const selectedCurrencyCode = watch('currency');

  const currencySymbol = CURRENCIES.find(c => c.code === selectedCurrencyCode)?.symbol || '₹';

  // Update Place of Supply automatically when Customer is selected
  useEffect(() => {
    if (customerId && customers.length > 0) {
      const selectedCust = customers.find(c => c.id === customerId);
      if (selectedCust) {
        const stateToSet = selectedCust.state || selectedCust.placeOfSupply || '';
        setValue('placeOfSupply', stateToSet);
      }
    }
  }, [customerId, customers, setValue]);

  // Calculate Due Date based on Payment Terms & Invoice Date
  useEffect(() => {
    if (invoiceDate && paymentTerms) {
      const option = PAYMENT_TERMS_OPTIONS.find(o => o.value === paymentTerms);
      if (option) {
        const baseDate = new Date(invoiceDate);
        baseDate.setDate(baseDate.getDate() + option.days);
        setValue('dueDate', baseDate.toISOString().split('T')[0]);
      }
    }
  }, [invoiceDate, paymentTerms, setValue]);

  // Perform tax breakdown & calculations (memoized to prevent render recalculation loops)
  const totals = useMemo(() => {
    let rawSubTotal = 0;
    let totalDiscountAmount = 0;
    let totalTaxAmount = 0;
    let totalCgstAmount = 0;
    let totalSgstAmount = 0;
    let totalIgstAmount = 0;

    const companyState = companyProfile?.state?.trim().toLowerCase() || '';
    const supplyState = selectedPlaceOfSupply?.trim().toLowerCase() || '';
    const isInterState = supplyState && companyState && supplyState !== companyState;

    const taxSummaryMap: Record<number, { taxableValue: number; taxAmount: number }> = {};

    items.forEach((item) => {
      const rate = Number(item.rate) || 0;
      const qty = Number(item.qty) || 0;
      const discountPercent = Number(item.discount) || 0;
      const taxRate = Number(item.taxPercent) || 0;

      const lineTotal = rate * qty;
      const lineDiscount = lineTotal * (discountPercent / 100);
      const taxableValue = lineTotal - lineDiscount;
      
      let lineTax = 0;
      if (invoiceType !== 'NO_TAX') {
        lineTax = (taxableValue * taxRate) / 100;
      }

      rawSubTotal += lineTotal;
      totalDiscountAmount += lineDiscount;
      totalTaxAmount += lineTax;

      if (invoiceType !== 'NO_TAX') {
        if (isInterState) {
          totalIgstAmount += lineTax;
        } else {
          totalCgstAmount += lineTax / 2;
          totalSgstAmount += lineTax / 2;
        }
      }

      // Group totals for summary breakdown
      if (taxRate > 0 && invoiceType !== 'NO_TAX') {
        if (!taxSummaryMap[taxRate]) {
          taxSummaryMap[taxRate] = { taxableValue: 0, taxAmount: 0 };
        }
        taxSummaryMap[taxRate].taxableValue += taxableValue;
        taxSummaryMap[taxRate].taxAmount += lineTax;
      }
    });

    const finalSubTotal = rawSubTotal - totalDiscountAmount;

    return {
      rawSubTotal,
      totalDiscountAmount,
      subTotal: finalSubTotal,
      taxTotal: totalTaxAmount,
      cgstTotal: totalCgstAmount,
      sgstTotal: totalSgstAmount,
      igstTotal: totalIgstAmount,
      grandTotal: finalSubTotal + totalTaxAmount,
      isInterState,
      taxSummary: Object.entries(taxSummaryMap).map(([rate, vals]) => ({
        rate: Number(rate),
        ...vals
      }))
    };
  }, [items, invoiceType, selectedPlaceOfSupply, companyProfile]);

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`items.${index}.rate`, product.sellingPrice || 0);
      setValue(`items.${index}.description`, product.description || product.name || '');
      setValue(`items.${index}.taxPercent`, product.taxRate || product.gstRate || 18);
      // Auto-populate unit from product master
      if (product.unit) {
        setValue(`items.${index}.unit`, product.unit.abbreviation || product.unit.name || 'Pcs');
      } else {
        setValue(`items.${index}.unit`, 'Pcs');
      }
    }
  };

  const onSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    try {
      let backendType = 'TAX_INVOICE';
      if (data.invoiceType === 'B2C') backendType = 'RETAIL_INVOICE';
      if (data.invoiceType === 'NO_TAX') backendType = 'BILL_OF_SUPPLY';

      const payload = {
        customerId: data.customerId,
        date: new Date(data.date).toISOString(),
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        invoiceType: backendType,
        placeOfSupply: data.placeOfSupply,
        status: submitStatus,
        items: data.items.map(item => {
          const discountPercent = Number(item.discount) || 0;
          const rate = Number(item.rate);
          // Standardize discount mapping inside rate or descriptive line
          const originalLineTotal = rate * Number(item.qty);
          const lineDiscount = originalLineTotal * (discountPercent / 100);
          const finalTaxableRate = (originalLineTotal - lineDiscount) / Number(item.qty);

          return {
            productId: item.productId,
            description: discountPercent > 0 
              ? `${item.description || ''} (Discount ${discountPercent}%)`
              : item.description,
            qty: Number(item.qty),
            rate: finalTaxableRate, // Save rate post-discount to match backend expectations
            taxPercent: data.invoiceType === 'NO_TAX' ? 0 : Number(item.taxPercent),
          };
        }),
        notes: data.notes,
        termsConditions: data.termsConditions,
      };

      await apiClient.post('/sales/invoices', payload);
      toast.success(
        submitStatus === 'DRAFT' 
          ? 'Invoice draft saved successfully!' 
          : 'Invoice created and issued successfully!'
      );
      navigate('/invoices');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create sales invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-6 animate-pulse">
        <div className="h-10 w-1/4 bg-muted rounded-md mb-8"></div>
        <div className="glass-panel p-6 rounded-2xl border border-border h-64 bg-muted/40"></div>
        <div className="glass-panel p-6 rounded-2xl border border-border h-96 bg-muted/40"></div>
      </div>
    );
  }

  const selectedCustomerName = customers.find(c => c.id === customerId)?.name || 'N/A';
  const selectedCustomerAddress = customers.find(c => c.id === customerId)?.address || 'N/A';

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Create Invoice"
        description="Draft or issue a premium sales invoice"
        primaryAction={
          <button 
            type="button"
            onClick={() => navigate('/invoices')}
            className="bg-secondary text-foreground hover:bg-secondary/80 px-4 py-2 rounded-xl text-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Invoices
          </button>
        }
      />
      
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Main Details Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-border space-y-6 text-left shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <FileText className="w-5 h-5 text-accent animate-pulse" />
            <h3 className="font-semibold text-lg text-foreground">General Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice Type</label>
              <select {...register('invoiceType')} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                <option value="B2B">B2B (Tax Invoice)</option>
                <option value="B2C">B2C (Retail Invoice)</option>
                <option value="NO_TAX">No Tax (Bill of Supply)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer *</label>
              <select {...register('customerId')} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                <option value="">Select Customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.gstNumber ? `(${c.gstNumber})` : ''}</option>)}
              </select>
              {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice #</label>
              <input type="text" value="Auto-generated sequence" disabled className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice Date *</label>
              <input type="date" {...register('date')} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Terms</label>
              <select {...register('paymentTerms')} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                {PAYMENT_TERMS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Due Date</label>
              <input type="date" {...register('dueDate')} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Currency</label>
              <select {...register('currency')} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Place of Supply (GST Destination)</label>
              <select {...register('placeOfSupply')} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                <option value="">Select State...</option>
                {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-accent" /> 
                Intra-state CGST/SGST applies if place of supply matches business location ({companyProfile?.state || 'Not set'}). Otherwise IGST applies.
              </p>
            </div>
          </div>
        </div>

        {/* Line Items Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-border space-y-6 text-left shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-semibold text-lg text-foreground">Line Items</h3>
            <button 
              type="button" 
              onClick={() => append({ productId: '', description: '', qty: 1, rate: 0, taxPercent: 18, discount: 0, unit: 'Pcs' })}
              className="text-xs bg-accent/10 text-accent hover:bg-accent/20 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Line
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="pb-3 font-semibold text-left w-1/3">Product / Service</th>
                  <th className="pb-3 font-semibold text-right w-20">Qty</th>
                  <th className="pb-3 font-semibold text-center w-24">Unit</th>
                  <th className="pb-3 font-semibold text-right w-28">Rate</th>
                  <th className="pb-3 font-semibold text-right w-24">Discount %</th>
                  {invoiceType !== 'NO_TAX' && <th className="pb-3 font-semibold text-right w-24">GST %</th>}
                  <th className="pb-3 font-semibold text-right w-28">Taxable Val</th>
                  <th className="pb-3 font-semibold text-right w-28">Total Amount</th>
                  <th className="pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fields.map((field, index) => {
                  const qty = Number(watch(`items.${index}.qty`)) || 0;
                  const rate = Number(watch(`items.${index}.rate`)) || 0;
                  const discountPercent = Number(watch(`items.${index}.discount`)) || 0;
                  const taxPercent = Number(watch(`items.${index}.taxPercent`)) || 0;

                  const originalLineTotal = qty * rate;
                  const lineDiscount = originalLineTotal * (discountPercent / 100);
                  const taxableValue = originalLineTotal - lineDiscount;
                  const taxAmount = invoiceType === 'NO_TAX' ? 0 : (taxableValue * taxPercent) / 100;
                  const rowTotal = taxableValue + taxAmount;

                  return (
                    <tr key={field.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 pr-4">
                        <select 
                          {...register(`items.${index}.productId`)} 
                          onChange={(e) => {
                            register(`items.${index}.productId`).onChange(e);
                            handleProductSelect(index, e.target.value);
                          }}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                        >
                          <option value="">Select Item...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {errors.items?.[index]?.productId && <p className="text-red-500 text-xs mt-1">{errors.items[index].productId?.message}</p>}
                        
                        <input 
                          type="text" 
                          placeholder="Line description details..."
                          {...register(`items.${index}.description`)}
                          className="w-full mt-1.5 px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-accent text-muted-foreground"
                        />
                      </td>
                      <td className="py-3 px-1">
                        <input 
                          type="number" 
                          {...register(`items.${index}.qty`)} 
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-right focus:outline-none focus:border-accent" 
                        />
                      </td>
                      <td className="py-3 px-1">
                        <select 
                          {...register(`items.${index}.unit`)}
                          className="w-full px-2 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-accent"
                        >
                          <option value="Pcs">Pcs</option>
                          <option value="Box">Box</option>
                          <option value="Kgs">Kgs</option>
                          <option value="Ltr">Ltr</option>
                          <option value="Nos">Nos</option>
                          {units.map(u => <option key={u.id} value={u.abbreviation || u.name}>{u.name}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-1">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">{currencySymbol}</span>
                          <input 
                            type="number" 
                            step="0.01"
                            {...register(`items.${index}.rate`)} 
                            className="w-full pl-6 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-right focus:outline-none focus:border-accent" 
                          />
                        </div>
                      </td>
                      <td className="py-3 px-1">
                        <input 
                          type="number" 
                          max="100"
                          {...register(`items.${index}.discount`)} 
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-right focus:outline-none focus:border-accent" 
                        />
                      </td>
                      {invoiceType !== 'NO_TAX' && (
                        <td className="py-3 px-1">
                          <select 
                            {...register(`items.${index}.taxPercent`)} 
                            className="w-full px-2 py-2 bg-background border border-border rounded-lg text-sm text-right focus:outline-none focus:border-accent"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                      )}
                      <td className="py-3 px-2 text-right font-medium text-muted-foreground">
                        {currencySymbol}{taxableValue.toFixed(2)}
                      </td>
                      <td className="py-3 pl-4 text-right font-semibold text-foreground">
                        {currencySymbol}{rowTotal.toFixed(2)}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 p-2 cursor-pointer rounded-lg hover:bg-red-50/10">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Notes and Terms Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border mt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer Notes</label>
                <textarea 
                  rows={2}
                  {...register('notes')}
                  placeholder="Provide additional context or reference details for the client..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Terms & Conditions</label>
                <textarea 
                  rows={3}
                  {...register('termsConditions')}
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/10 text-muted-foreground"
                />
              </div>
            </div>

            {/* Calculations Summary Panel */}
            <div className="flex justify-end items-start">
              <div className="w-full max-w-sm space-y-4 bg-muted/20 border border-border/60 rounded-2xl p-6">
                <div className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 mb-3">Invoice Summary</div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Subtotal Gross</span>
                    <span>{currencySymbol}{totals.rawSubTotal.toFixed(2)}</span>
                  </div>
                  {totals.totalDiscountAmount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Discount Saved</span>
                      <span>-{currencySymbol}{totals.totalDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-dashed border-border/50 pt-2 text-foreground font-medium">
                    <span>Taxable Base Subtotal</span>
                    <span>{currencySymbol}{totals.subTotal.toFixed(2)}</span>
                  </div>
                  
                  {invoiceType !== 'NO_TAX' && (
                    <>
                      {totals.isInterState ? (
                        <div className="flex justify-between text-xs">
                          <span>Integrated GST (IGST)</span>
                          <span>{currencySymbol}{totals.igstTotal.toFixed(2)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-xs">
                            <span>Central GST (CGST)</span>
                            <span>{currencySymbol}{totals.cgstTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>State GST (SGST)</span>
                            <span>{currencySymbol}{totals.sgstTotal.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-between font-bold text-lg pt-3 border-t border-border text-foreground">
                  <span>Grand Total</span>
                  <span>{currencySymbol}{totals.grandTotal.toFixed(2)}</span>
                </div>

                {/* Grouped Tax Summary matrix */}
                {totals.taxSummary.length > 0 && invoiceType !== 'NO_TAX' && (
                  <div className="mt-4 pt-3 border-t border-dashed border-border/50 text-[10px] space-y-1">
                    <div className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">GST Breakdown matrix</div>
                    {totals.taxSummary.map((sm) => (
                      <div key={sm.rate} className="flex justify-between text-muted-foreground">
                        <span>GST @ {sm.rate}% (Taxable: {currencySymbol}{sm.taxableValue.toFixed(2)})</span>
                        <span>{currencySymbol}{sm.taxAmount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pb-12">
          <button 
            type="button" 
            onClick={() => navigate('/invoices')} 
            className="px-6 py-2.5 rounded-xl border border-border bg-background hover:bg-secondary text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button 
            type="button" 
            onClick={() => setIsPreviewOpen(true)}
            className="px-6 py-2.5 rounded-xl border border-border bg-background hover:bg-secondary text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-muted-foreground" />
            Preview
          </button>

          <button 
            type="submit" 
            disabled={isSubmitting}
            onClick={() => setSubmitStatus('DRAFT')}
            className="px-6 py-2.5 rounded-xl border border-accent/20 bg-accent/5 hover:bg-accent/10 text-accent text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && submitStatus === 'DRAFT' && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Draft
          </button>

          <button 
            type="submit" 
            disabled={isSubmitting}
            onClick={() => setSubmitStatus('SENT')}
            className="px-6 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && submitStatus === 'SENT' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save & Issue Invoice
              </>
            )}
          </button>
        </div>
      </form>

      {/* Invoice PDF-style Preview Overlay */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col my-8 max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-surface">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-lg">Sales Document Preview</h3>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Document Body Area */}
            <div className="p-8 overflow-y-auto space-y-8 text-left bg-white dark:bg-[#0c0c0c] text-slate-800 dark:text-slate-200">
              
              {/* Top Banner */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-2xl font-bold uppercase tracking-wide text-foreground">
                    {invoiceType === 'NO_TAX' ? 'Bill of Supply' : 'Tax Invoice'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">FY 2026-2027 Workspace Document</p>
                </div>
                {companyProfile?.companyName && (
                  <div className="text-right">
                    <h5 className="font-bold text-lg text-foreground">{companyProfile.companyName}</h5>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{companyProfile.address}</p>
                    {companyProfile.gstin && <p className="text-xs text-accent font-semibold mt-1">GSTIN: {companyProfile.gstin}</p>}
                  </div>
                )}
              </div>

              <div className="h-px bg-border/80"></div>

              {/* Bill To & Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bill To</div>
                  <div className="font-bold text-foreground text-base">{selectedCustomerName}</div>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{selectedCustomerAddress}</div>
                  {selectedPlaceOfSupply && <div className="text-xs text-muted-foreground">State: {selectedPlaceOfSupply}</div>}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block font-semibold text-muted-foreground uppercase tracking-wider">Document No</span>
                    <span className="text-sm font-bold text-foreground">INV-XXXXX (Auto)</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-muted-foreground uppercase tracking-wider">Document Date</span>
                    <span className="text-sm font-semibold text-foreground">{invoiceDate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-muted-foreground uppercase tracking-wider">Payment Terms</span>
                    <span className="text-sm font-semibold text-foreground">
                      {PAYMENT_TERMS_OPTIONS.find(o => o.value === paymentTerms)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold text-muted-foreground uppercase tracking-wider">Due Date</span>
                    <span className="text-sm font-bold text-foreground">{watch('dueDate') || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-border/80 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-4 text-left"># Description / Product</th>
                      <th className="py-2.5 px-2 text-right">Qty</th>
                      <th className="py-2.5 px-2 text-center">Unit</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-2 text-right">Disc %</th>
                      {invoiceType !== 'NO_TAX' && <th className="py-2.5 px-2 text-right">GST %</th>}
                      <th className="py-2.5 px-4 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.map((it, idx) => {
                      const prodName = products.find(p => p.id === it.productId)?.name || 'Select Product...';
                      const rate = Number(it.rate) || 0;
                      const qty = Number(it.qty) || 0;
                      const disc = Number(it.discount) || 0;
                      const gst = Number(it.taxPercent) || 0;

                      const gross = rate * qty;
                      const savings = gross * (disc / 100);
                      const taxable = gross - savings;
                      const tax = invoiceType === 'NO_TAX' ? 0 : (taxable * gst) / 100;
                      const total = taxable + tax;

                      return (
                        <tr key={idx} className="hover:bg-muted/5">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">{prodName}</div>
                            {it.description && <div className="text-[10px] text-muted-foreground mt-0.5">{it.description}</div>}
                          </td>
                          <td className="py-3 px-2 text-right">{qty}</td>
                          <td className="py-3 px-2 text-center">{it.unit || 'Pcs'}</td>
                          <td className="py-3 px-3 text-right">{currencySymbol}{rate.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right text-green-600 font-medium">{disc > 0 ? `${disc}%` : '0%'}</td>
                          {invoiceType !== 'NO_TAX' && <td className="py-3 px-2 text-right">{gst}%</td>}
                          <td className="py-3 px-4 text-right font-bold text-foreground">{currencySymbol}{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summaries Panel */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="max-w-md space-y-3 text-xs text-muted-foreground">
                  {watch('notes') && (
                    <div>
                      <div className="font-semibold text-foreground uppercase tracking-wider mb-1 text-[10px]">Document Notes</div>
                      <p className="whitespace-pre-wrap">{watch('notes')}</p>
                    </div>
                  )}
                  {watch('termsConditions') && (
                    <div>
                      <div className="font-semibold text-foreground uppercase tracking-wider mb-1 text-[10px]">Terms & Conditions</div>
                      <p className="whitespace-pre-wrap border-t border-border pt-1.5">{watch('termsConditions')}</p>
                    </div>
                  )}
                </div>

                <div className="w-full md:w-80 space-y-2 text-xs border border-border/60 rounded-xl p-4 bg-muted/5 shrink-0">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Gross</span>
                    <span>{currencySymbol}{totals.rawSubTotal.toFixed(2)}</span>
                  </div>
                  {totals.totalDiscountAmount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Discount Saved</span>
                      <span>-{currencySymbol}{totals.totalDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border/40 pt-1.5 font-semibold text-foreground">
                    <span>Taxable Base Value</span>
                    <span>{currencySymbol}{totals.subTotal.toFixed(2)}</span>
                  </div>
                  
                  {invoiceType !== 'NO_TAX' && (
                    <>
                      {totals.isInterState ? (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Integrated GST (IGST)</span>
                          <span>{currencySymbol}{totals.igstTotal.toFixed(2)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Central GST (CGST)</span>
                            <span>{currencySymbol}{totals.cgstTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>State GST (SGST)</span>
                            <span>{currencySymbol}{totals.sgstTotal.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div className="flex justify-between font-bold text-sm text-foreground border-t border-border pt-2">
                    <span>Grand Total Due</span>
                    <span>{currencySymbol}{totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="flex justify-end px-6 py-4 border-t border-border shrink-0 bg-surface gap-3">
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="px-5 py-2 rounded-xl border border-border bg-background hover:bg-secondary text-sm font-medium transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
