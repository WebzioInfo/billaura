import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Trash2, Copy, Save, AlertCircle, ShoppingCart,
  Building, Calendar, FileText, Landmark, FileCheck, HelpCircle, Loader2, Info
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer, LoadingState, FinancialSummary, SummaryRow } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { Button, Input, Select, FormErrorDisplay } from '@/components/ui';
import apiClient from '@/services/api';
import notification from '@/services/NotificationService';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const poSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  orderNo: z.string().min(1, 'Purchase Invoice Number is required'),
  date: z.string().min(1, 'Order Date is required'),
  referenceNo: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  placeOfSupply: z.string().optional(),
});
type POFormValues = z.infer<typeof poSchema>;

interface Vendor {
  id: string;
  name: string;
  customerCode?: string;
  gstNumber?: string;
  gstin?: string;
  address?: string;
  state?: string;
  phone?: string;
  email?: string;
  receivableBalance?: number;
  payableBalance?: number;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  hsnCode?: string;
  unit: string;
  purchasePrice: number;
  gstRate?: number;
  reorderLevel?: number;
  stocks?: Array<{
    id: string;
    warehouseId: string;
    quantity: number;
  }>;
}

interface FormLineItem {
  keyId: string;
  productId: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  discount: number; // percentage
  taxPercent: number; // GST percentage
}

export const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();

  const isEditMode = pathname.endsWith('/edit');
  const isDuplicateMode = searchParams.get('duplicate') === 'true';

  const [saving, setSaving] = useState(false);

  const form = useAsyncForm<POFormValues>(
    {
      resolver: zodResolver(poSchema as any) as any,
      defaultValues: {
        vendorId: '',
        orderNo: '',
        date: new Date().toISOString().split('T')[0],
        referenceNo: '',
        billingAddress: '',
        shippingAddress: '',
        placeOfSupply: '',
      }
    },
    null,
    () => ({})
  );

  const { register, handleFormSubmit, formState: { errors }, watch, setValue } = form;

  const vendorId = watch('vendorId');
  const orderNo = watch('orderNo');
  const date = watch('date');
  const referenceNo = watch('referenceNo');
  const billingAddress = watch('billingAddress');
  const shippingAddress = watch('shippingAddress');
  const placeOfSupply = watch('placeOfSupply');

  const [notes, setNotes] = useState('');
  const [taxMode, setTaxMode] = useState<'CGST_SGST' | 'IGST' | 'NO_TAX'>('CGST_SGST');
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [status, setStatus] = useState<'DRAFT' | 'SENT' | 'ACCEPTED' | 'CANCELLED'>('DRAFT');

  // Dynamic grid rows
  const [items, setItems] = useState<FormLineItem[]>([
    { keyId: 'init-row-0', productId: '', description: '', qty: 1, unit: 'Pcs', rate: 0, discount: 0, taxPercent: 18 }
  ]);

  // Fetch Master Data
  const { data: vendors = [], isLoading: loadingVendors } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/vendors');
      const list = res.data?.data || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products');
      const list = res.data?.data || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  const { data: meData } = useQuery<any>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me'),
  });

  const companyProfile = meData?.data?.company || meData?.company || { name: 'Your Company', address: '', email: '', state: '' };

  // Fetch Next suggested PO number
  const { data: nextNoData } = useQuery({
    queryKey: ['purchase-orders', 'next-number'],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders/next-number');
      const payload = res.data?.data || res.data || {};
      return payload;
    },
    enabled: !id && !isDuplicateMode
  });

  useEffect(() => {
    if (nextNoData?.nextNumber && !id && !isDuplicateMode) {
      setValue('orderNo', nextNoData.nextNumber);
    }
  }, [nextNoData, id, isDuplicateMode]);

  // Load existing PO for edit or duplicate
  const loadId = id || searchParams.get('poId');
  const { data: existingPo, isLoading: loadingPo } = useQuery({
    queryKey: ['purchase-order', loadId],
    queryFn: async () => {
      if (!loadId) return null;
      const res = await apiClient.get(`/purchase-orders/${loadId}`);
      return res.data?.data || res.data || null;
    },
    enabled: !!loadId,
  });

  // Populate form fields if editing or duplicating
  useEffect(() => {
    if (!existingPo) return;

    setValue('vendorId', existingPo.businessPartnerId);
    setTaxMode(existingPo.taxMode);
    setValue('placeOfSupply', existingPo.placeOfSupply || '');
    setValue('billingAddress', existingPo.billingAddress || '');
    setValue('shippingAddress', existingPo.shippingAddress || '');
    if (existingPo.billingAddress && existingPo.shippingAddress) {
      setSameAsBilling(existingPo.billingAddress === existingPo.shippingAddress);
    }
    setStatus(existingPo.status);

    if (!isDuplicateMode) {
      setValue('orderNo', existingPo.orderNo);
      setValue('date', existingPo.date.split('T')[0]);
    } else {
      setValue('date', new Date().toISOString().split('T')[0]);
    }

    const meta = existingPo.gstBreakup || {};
    setValue('referenceNo', meta.referenceNo || '');
    setNotes(meta.notes || '');

    if (existingPo.items && Array.isArray(existingPo.items)) {
      setItems(existingPo.items.map((i: any, index: number) => ({
        keyId: `loaded-row-${index}`,
        productId: i.productId || '',
        description: i.description || '',
        qty: Number(i.qty),
        unit: i.product?.unit || i.unit || 'Pcs',
        rate: Number(i.rate),
        discount: 0,
        taxPercent: Number(i.taxPercent || 0)
      })));
    }
  }, [existingPo, isDuplicateMode]);

  useEffect(() => {
    if (sameAsBilling) {
      setValue('shippingAddress', billingAddress || '');
    }
  }, [billingAddress, sameAsBilling]);

  const selectedVendor = useMemo(() => {
    return vendors.find(v => v.id === vendorId) || null;
  }, [vendorId, vendors]);

  const handleVendorChange = (vId: string) => {
    setValue('vendorId', vId);
    const v = vendors.find(x => x.id === vId);
    if (v) {
      setValue('billingAddress', v.address || '');
      if (sameAsBilling) {
        setValue('shippingAddress', v.address || '');
      }
      setValue('placeOfSupply', v.state || '');

      // Determine tax mode based on vendor state and company state
      const compState = companyProfile?.state || '';
      const vendState = v.state || '';
      if (compState.toLowerCase() === vendState.toLowerCase()) {
        setTaxMode('CGST_SGST');
      } else {
        setTaxMode('IGST');
      }
    }
  };

  const handleProductChange = (index: number, pId: string) => {
    const list = [...items];
    const p = products.find(prod => prod.id === pId);
    if (p) {
      list[index].productId = pId;
      list[index].description = p.name;
      list[index].rate = p.purchasePrice || 0;
      list[index].taxPercent = p.gstRate || 18;
      list[index].unit = p.unit || 'Pcs';
    } else {
      list[index].productId = '';
      list[index].description = '';
      list[index].rate = 0;
      list[index].unit = 'Pcs';
    }
    setItems(list);
  };

  const handleLineChange = (index: number, field: keyof FormLineItem, val: any) => {
    const list = [...items];
    list[index] = { ...list[index], [field]: val };
    setItems(list);
  };

  const addRow = () => {
    setItems([...items, {
      keyId: `row-${Date.now()}-${items.length}`,
      productId: '',
      description: '',
      qty: 1,
      unit: 'Pcs',
      rate: 0,
      discount: 0,
      taxPercent: 18
    }]);
  };

  const removeRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const duplicateRow = (index: number) => {
    const row = items[index];
    setItems([
      ...items.slice(0, index + 1),
      {
        ...row,
        keyId: `dup-${Date.now()}-${index}`,
      },
      ...items.slice(index + 1)
    ]);
  };

  // Real-Time Summary Engine
  const summary = useMemo(() => {
    let subTotal = 0;
    let totalDiscount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    items.forEach(item => {
      const gross = item.qty * item.rate;
      const discAmt = gross * (item.discount / 100);
      const taxable = gross - discAmt;
      const tax = taxable * (item.taxPercent / 100);

      subTotal += gross;
      totalDiscount += discAmt;

      if (taxMode === 'CGST_SGST') {
        cgst += tax / 2;
        sgst += tax / 2;
      } else if (taxMode === 'IGST') {
        igst += tax;
      }
    });

    const taxableValue = subTotal - totalDiscount;
    const taxTotal = cgst + sgst + igst;
    const rawGrandTotal = taxableValue + taxTotal;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = grandTotal - rawGrandTotal;

    return {
      subTotal,
      totalDiscount,
      taxableValue,
      cgst,
      sgst,
      igst,
      taxTotal,
      roundOff,
      grandTotal
    };
  }, [items, taxMode]);

  const handleSubmit = async (data: POFormValues) => {
    if (!data.vendorId) {
      notification.error('Vendor / Supplier selection is required');
      return;
    }

    if (!data.orderNo) {
      notification.error('Purchase Invoice Number is required');
      return;
    }

    const invalidRow = items.find(i => !i.productId || i.qty <= 0 || i.rate <= 0);
    if (invalidRow) {
      notification.error('All line items must have a product, quantity > 0, and rate > 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        businessPartnerId: data.vendorId,
        orderNo: data.orderNo,
        date: new Date(data.date).toISOString(),
        taxMode,
        placeOfSupply: data.placeOfSupply,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        notes: notes || undefined,
        referenceNo: data.referenceNo || undefined,
        status: isEditMode ? undefined : 'DRAFT',
        items: items.map(i => ({
          productId: i.productId,
          description: i.description,
          qty: i.qty,
          rate: i.rate,
          taxPercent: i.taxPercent,
        }))
      };

      if (id && isEditMode) {
        await apiClient.patch(`/purchase-orders/${id}`, payload);
        notification.success('Purchase Order updated successfully');
      } else {
        await apiClient.post('/purchase-orders', payload);
        notification.success('Purchase Order recorded successfully');
      }

      navigate('/purchase-orders');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to save purchase order');
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingVendors || loadingProducts || (!!loadId && loadingPo);

  if (loading) {
    return (
      <PageContainer maxWidth="7xl">
        <LoadingState variant="form" />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title={isEditMode ? 'Edit Purchase Order' : isDuplicateMode ? 'Duplicate Purchase Order' : 'New Purchase Order'}
        description="Configure vendor procurement details and track stock updates"
        backTo={{ label: 'Purchase Orders', path: '/purchase-orders' }}
      />

      <form id="poForm" onSubmit={handleFormSubmit(handleSubmit as any)} className="space-y-6 text-left">
        {/* Vendor & Details Block */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
          <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5 border-b border-border pb-3">
            <ShoppingCart className="w-5 h-5 text-accent" /> Vendor & Purchase Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Select
                label="Vendor Supplier"
                required
                disabled={isEditMode}
                {...register('vendorId')}
                onChange={(e: any) => handleVendorChange(e.target.value)}
                options={[
                  { value: "", label: "Select Vendor..." },
                  ...vendors.map(v => ({ value: v.id, label: v.name }))
                ]}
              />
              <FormErrorDisplay error={errors.vendorId} />
            </div>

            <div>
              <Input
                label="Purchase Invoice Number"
                required
                {...register('orderNo')}
                placeholder="e.g. INV-001 or PUR-2026-001"
                className="font-bold font-mono"
              />
              <FormErrorDisplay error={errors.orderNo} />
            </div>

            <div>
              <Input
                label="Order Date"
                type="date"
                required
                {...register('date')}
              />
              <FormErrorDisplay error={errors.date} />
            </div>
          </div>

          {/* Supplier details panel */}
          {selectedVendor && (
            <div className="bg-muted/30 border border-border/60 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">GSTIN / Tax ID</span>
                <span className="font-semibold text-foreground">{selectedVendor.gstin || selectedVendor.gstNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Place of Supply</span>
                <span className="font-semibold text-foreground">{placeOfSupply || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Supplier Email</span>
                <span className="font-semibold text-foreground">{selectedVendor.email || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Supplier Phone</span>
                <span className="font-semibold text-foreground">{selectedVendor.phone || 'N/A'}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Input
                label="Ref Number / Quotation"
                {...register('referenceNo')}
                placeholder="e.g. Supplier Quote Ref"
              />
              <FormErrorDisplay error={errors.referenceNo} />
            </div>

            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Billing Address</label>
              <textarea
                rows={1}
                {...register('billingAddress')}
                placeholder="Billing address details"
                className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent resize-none text-muted-foreground"
              />
              <FormErrorDisplay error={errors.billingAddress} />
            </div>

            <div className="md:col-span-1">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Shipping Address</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={e => setSameAsBilling(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent w-3.5 h-3.5"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase select-none">Same as Billing</span>
                </label>
              </div>
              <textarea
                rows={1}
                {...register('shippingAddress')}
                disabled={sameAsBilling}
                placeholder="Shipping address details"
                className={`w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent resize-none text-muted-foreground ${sameAsBilling ? 'opacity-60 cursor-not-allowed bg-muted/20' : ''}`}
              />
              <FormErrorDisplay error={errors.shippingAddress} />
            </div>
          </div>
        </div>

        {/* Dynamic Items Grid */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
              <Building className="w-5 h-5 text-accent" /> Purchase Items Grid
            </h3>
            <Button
              onClick={addRow}
              type="button"
              variant="outline"
              className="text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:bg-accent/5 hover:text-accent hover:border-accent/30"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </Button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
                  <th className="pb-3 font-bold text-left w-1/3">Product / Service</th>
                  <th className="pb-3 font-bold text-right w-20">Qty</th>
                  <th className="pb-3 font-bold text-center w-24">Unit</th>
                  <th className="pb-3 font-bold text-right w-28">Purchase Rate</th>
                  <th className="pb-3 font-bold text-right w-24">Discount %</th>
                  {taxMode !== 'NO_TAX' && <th className="pb-3 font-bold text-right w-24">GST %</th>}
                  <th className="pb-3 font-bold text-right w-32">Total Amount</th>
                  <th className="pb-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((item, index) => {
                  const gross = item.qty * item.rate;
                  const discAmt = gross * (item.discount / 100);
                  const taxable = gross - discAmt;
                  const tax = taxMode === 'NO_TAX' ? 0 : taxable * (item.taxPercent / 100);
                  const rowTotal = taxable + tax;

                  return (
                    <tr key={item.keyId} className="hover:bg-muted/10 transition-colors">
                      <td className="py-4 pr-3">
                        <select
                          value={item.productId}
                          onChange={e => handleProductChange(index, e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                        >
                          <option value="">Select Product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} {p.sku ? `(SKU: ${p.sku})` : ''}</option>
                          ))}
                        </select>

                        {(() => {
                          const pObj = products.find(p => p.id === item.productId);
                          if (!pObj) return null;
                          const totalStock = pObj.stocks ? pObj.stocks.reduce((acc, s) => acc + Number(s.quantity || 0), 0) : 0;
                          return (
                            <div className="text-[10px] text-muted-foreground mt-1 flex gap-2 pl-1 select-none">
                              <span>HSN: <strong className="text-foreground">{pObj.hsnCode || 'N/A'}</strong></span>
                              <span>•</span>
                              <span>Available Stock: <strong className={totalStock > 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>{totalStock} {pObj.unit}</strong></span>
                              <span>•</span>
                              <span>Reorder Level: <strong className="text-amber-600">{pObj.reorderLevel || 0}</strong></span>
                            </div>
                          );
                        })()}

                        <input
                          type="text"
                          placeholder="Line description / specifications..."
                          value={item.description}
                          onChange={e => handleLineChange(index, 'description', e.target.value)}
                          className="w-full mt-1.5 px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-accent text-muted-foreground"
                        />
                      </td>
                      <td className="py-4 px-1">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => handleLineChange(index, 'qty', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-right focus:outline-none focus:border-accent font-bold font-mono"
                        />
                      </td>
                      <td className="py-4 px-1">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => handleLineChange(index, 'unit', e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:border-accent text-muted-foreground"
                        />
                      </td>
                      <td className="py-4 px-1">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-mono">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={e => handleLineChange(index, 'rate', Number(e.target.value))}
                            className="w-full pl-6 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-right focus:outline-none focus:border-accent font-mono"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount}
                          onChange={e => handleLineChange(index, 'discount', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-right focus:outline-none focus:border-accent font-mono"
                        />
                      </td>
                      {taxMode !== 'NO_TAX' && (
                        <td className="py-4 px-1">
                          <select
                            value={item.taxPercent}
                            onChange={e => handleLineChange(index, 'taxPercent', Number(e.target.value))}
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
                      <td className="py-4 pl-3 text-right font-bold text-foreground font-mono">
                        ₹{rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 pl-2 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => duplicateRow(index)}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer rounded-lg hover:bg-red-50/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border mt-4">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Terms, Notes & Conditions</label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Insert payment policies, terms, shipping deadlines or general terms for PO reference..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/10"
                />
              </div>

              {selectedVendor && (
                <div className="bg-muted/30 border border-border/60 rounded-xl p-4 text-xs space-y-1.5 max-w-sm">
                  <p className="font-extrabold text-foreground border-b border-border pb-1 mb-2 uppercase">Supplier Account Summary</p>
                  <p className="flex justify-between"><span>Supplier:</span> <span className="font-bold text-foreground">{selectedVendor.name}</span></p>
                  <p className="flex justify-between"><span>Outstanding Balance:</span> <span className="font-bold text-red-500 font-mono">₹{Number(selectedVendor.payableBalance || 0).toLocaleString('en-IN')}</span></p>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="flex justify-end items-start w-full">
              <FinancialSummary title="Purchase Summary">
                <SummaryRow label="Gross Subtotal" value={summary.subTotal} />
                {summary.totalDiscount > 0 && (
                  <SummaryRow label="Discount Saved" value={-summary.totalDiscount} isPositive />
                )}
                <SummaryRow label="Taxable Value" value={summary.taxableValue} />

                {taxMode === 'CGST_SGST' && summary.cgst > 0 && (
                  <>
                    <SummaryRow label="Input CGST" value={summary.cgst} className="pl-4 border-b-0 py-1" />
                    <SummaryRow label="Input SGST" value={summary.sgst} className="pl-4 border-b-0 py-1" />
                  </>
                )}

                {taxMode === 'IGST' && summary.igst > 0 && (
                  <SummaryRow label="Input IGST" value={summary.igst} className="pl-4 border-b-0 py-1" />
                )}

                {summary.taxTotal > 0 && (
                  <SummaryRow label="Total Tax" value={summary.taxTotal} />
                )}

                {Math.abs(summary.roundOff) > 0 && (
                  <SummaryRow label="Round Off" value={summary.roundOff} />
                )}

                <SummaryRow label="Grand Total" value={summary.grandTotal} isTotal />

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/purchase-orders')}
                    className="flex-1 font-bold text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving}
                    className="flex-1 bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/15 font-bold text-xs flex items-center justify-center gap-1"
                  >
                    {saving && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                    <Save className="w-4 h-4" />
                    Save Order
                  </Button>
                </div>
              </FinancialSummary>
            </div>
          </div>
        </div>
      </form>
    </PageContainer>
  );
};
