import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import apiClient from '@/services/api';
import { useSessionStore } from '@/features/auth/stores/sessionStore';

const invoiceItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  description: z.string().optional(),
  qty: z.coerce.number().min(1, 'Qty must be >= 1'),
  rate: z.coerce.number().min(0, 'Rate must be >= 0'),
  taxPercent: z.coerce.number().min(0).default(0),
});

const invoiceSchema = z.object({
  invoiceType: z.enum(['B2B', 'B2C', 'NO_TAX']),
  customerId: z.string().min(1, 'Select a customer'),
  date: z.string().nonempty('Select date'),
  dueDate: z.string().optional(),
  placeOfSupply: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export const InvoiceForm = () => {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, formState: { errors }, setValue } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema as any) as any,
    defaultValues: {
      invoiceType: 'B2B',
      date: new Date().toISOString().split('T')[0],
      items: [{ productId: '', description: '', qty: 1, rate: 0, taxPercent: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const invoiceType = watch('invoiceType');
  const items = watch('items');

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          apiClient.get('/customers'),
          apiClient.get('/inventory/products')
        ]);
        const customersList = custRes.data?.data || custRes.data || [];
        const productsList = prodRes.data?.data || prodRes.data || [];
        setCustomers(Array.isArray(customersList) ? customersList : []);
        setProducts(Array.isArray(productsList) ? productsList : []);
      } catch (err) {
        console.error("Failed to load invoice dependencies", err);
      }
    };
    loadDependencies();
  }, []);

  const calculateTotals = () => {
    let subTotal = 0;
    let taxTotal = 0;
    
    items.forEach((item) => {
      const amount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
      subTotal += amount;
      
      if (invoiceType !== 'NO_TAX') {
        taxTotal += (amount * (Number(item.taxPercent) || 0)) / 100;
      }
    });

    return {
      subTotal,
      taxTotal,
      grandTotal: subTotal + taxTotal
    };
  };

  const { subTotal, taxTotal, grandTotal } = calculateTotals();

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`items.${index}.rate`, product.sellingPrice || 0);
      setValue(`items.${index}.description`, product.description || '');
      // In a real scenario, map product tax group to taxPercent
      setValue(`items.${index}.taxPercent`, 18); // Defaulting to 18% for demo
    }
  };

  const onSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    try {
      // Map B2B/B2C to backend schema types
      let backendType = 'TAX_INVOICE';
      if (data.invoiceType === 'B2C') backendType = 'RETAIL_INVOICE';
      if (data.invoiceType === 'NO_TAX') backendType = 'BILL_OF_SUPPLY';

      const payload = {
        customerId: data.customerId,
        date: new Date(data.date).toISOString(),
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        invoiceType: backendType,
        placeOfSupply: data.placeOfSupply,
        items: data.items.map(item => ({
          productId: item.productId,
          description: item.description,
          qty: Number(item.qty),
          rate: Number(item.rate),
          taxPercent: data.invoiceType === 'NO_TAX' ? 0 : Number(item.taxPercent),
        }))
      };

      await apiClient.post('/sales/invoices', payload);
      navigate('/app/invoices');
    } catch (err) {
      console.error(err);
      alert('Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Create Invoice"
        description="Draft a new sales invoice"
        primaryAction={
          <button 
            type="button"
            onClick={() => navigate('/app/invoices')}
            className="bg-secondary text-foreground px-4 py-2 rounded-md text-sm flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Invoices
          </button>
        }
      />
      
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-border space-y-6 text-left">
          
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <FileText className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-lg">Invoice Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice Type</label>
              <select {...register('invoiceType')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                <option value="B2B">B2B (Tax Invoice)</option>
                <option value="B2C">B2C (Retail Invoice)</option>
                <option value="NO_TAX">No Tax (Bill of Supply)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer *</label>
              <select {...register('customerId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                <option value="">Select Customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice #</label>
              <input type="text" value="Auto-generated" disabled className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice Date *</label>
              <input type="date" {...register('date')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Due Date</label>
              <input type="date" {...register('dueDate')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
            </div>

            {invoiceType === 'B2B' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Place of Supply (GSTIN)</label>
                <input type="text" {...register('placeOfSupply')} placeholder="e.g. Maharashtra (27)" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-border space-y-6 text-left overflow-x-auto">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-semibold text-lg">Line Items</h3>
            <button 
              type="button" 
              onClick={() => append({ productId: '', description: '', qty: 1, rate: 0, taxPercent: 0 })}
              className="text-sm text-accent hover:text-accent/80 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="pb-3 font-semibold text-left w-1/3">Product / Service</th>
                <th className="pb-3 font-semibold text-right w-24">Qty</th>
                <th className="pb-3 font-semibold text-right w-32">Rate</th>
                {invoiceType !== 'NO_TAX' && <th className="pb-3 font-semibold text-right w-24">Tax %</th>}
                <th className="pb-3 font-semibold text-right w-32">Amount</th>
                <th className="pb-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fields.map((field, index) => {
                const qty = Number(watch(`items.${index}.qty`)) || 0;
                const rate = Number(watch(`items.${index}.rate`)) || 0;
                const amount = qty * rate;

                return (
                  <tr key={field.id}>
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
                    </td>
                    <td className="py-3 px-2">
                      <input 
                        type="number" 
                        {...register(`items.${index}.qty`)} 
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-right focus:outline-none focus:border-accent" 
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input 
                        type="number" 
                        {...register(`items.${index}.rate`)} 
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-right focus:outline-none focus:border-accent" 
                      />
                    </td>
                    {invoiceType !== 'NO_TAX' && (
                      <td className="py-3 px-2">
                        <select 
                          {...register(`items.${index}.taxPercent`)} 
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-right focus:outline-none focus:border-accent"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                    )}
                    <td className="py-3 pl-4 text-right font-medium">
                      ₹{amount.toFixed(2)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 p-2 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-end pt-6 border-t border-border mt-4">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>
              {invoiceType !== 'NO_TAX' && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax Amount</span>
                  <span>₹{taxTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-3 border-t border-border text-foreground">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pb-12">
          <button type="button" onClick={() => navigate('/app/invoices')} className="px-6 py-2 rounded-lg border border-border bg-background hover:bg-secondary text-sm font-medium transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save & Issue Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};
