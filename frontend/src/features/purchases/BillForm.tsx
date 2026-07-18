import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Plus, Trash2, Copy, Save, AlertCircle, ShoppingCart, 
  Building, Calendar, FileText, Landmark, FileCheck, HelpCircle
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer, LoadingState } from '@/shared/components/ui/LayoutComponents';
import { Card } from '@/shared/components/ui/Card';
import { Button, Input, Select, FormErrorDisplay } from '@/shared/components/ui';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useAsyncForm } from '@/shared/hooks/useAsyncForm';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const billSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  date: z.string().min(1, 'Billing Date is required'),
  dueDate: z.string().optional(),
  reference: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  placeOfSupply: z.string().optional(),
});
type BillFormValues = z.infer<typeof billSchema>;

interface Vendor {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  state?: string;
}

interface Product {
  id: string;
  name: string;
  hsnCode?: string;
  unit: string;
  purchasePrice: number;
  taxRate?: number;
  gstRate?: number;
}

interface Warehouse {
  id: string;
  name: string;
  isDefault: boolean;
}

interface FormLineItem {
  keyId: string; // React list rendering unique key
  productId: string;
  description: string;
  hsnCode: string;
  qty: number;
  unit: string;
  rate: number;
  discount: number; // percentage
  taxPercent: number; // GST percentage
  warehouseId: string;
}

export const BillForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const editId = searchParams.get('edit');
  const duplicateId = searchParams.get('duplicate');
  const isEditMode = !!editId;
  const isDuplicateMode = !!duplicateId;

  // Form State
  const form = useAsyncForm<BillFormValues>(
    {
      resolver: zodResolver(billSchema as any) as any,
      defaultValues: {
        vendorId: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        reference: '',
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
  const date = watch('date');
  const dueDate = watch('dueDate');
  const reference = watch('reference');
  const billingAddress = watch('billingAddress');
  const shippingAddress = watch('shippingAddress');
  const placeOfSupply = watch('placeOfSupply');

  const [taxMode, setTaxMode] = useState<'CGST_SGST' | 'IGST'>('CGST_SGST');
  const [isRcm, setIsRcm] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState<FormLineItem[]>([
    {
      keyId: 'initial-row-1',
      productId: '',
      description: '',
      hsnCode: 'N/A',
      qty: 1,
      unit: 'PCS',
      rate: 0,
      discount: 0,
      taxPercent: 18,
      warehouseId: ''
    }
  ]);

  // Fetch Master Data
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/vendors');
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products');
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  const { data: meData } = useQuery<any>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me'),
  });

  const companyProfile = meData?.data?.company || meData?.company || { name: 'Your Company', address: 'N/A', email: 'N/A', state: '' };

  // Load existing bill for Edit or Duplicate
  const loadBillId = editId || duplicateId;
  const { data: existingBill, isLoading: loadingExisting } = useQuery({
    queryKey: ['bill', loadBillId],
    queryFn: async () => {
      if (!loadBillId) return null;
      const res = await apiClient.get(`/purchases/${loadBillId}`);
      return res.data?.data || res.data || null;
    },
    enabled: !!loadBillId,
  });

  // Load from Purchase Order
  const poId = searchParams.get('poId');
  const { data: existingPo, isLoading: loadingPo } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: async () => {
      if (!poId) return null;
      const res = await apiClient.get(`/purchase-orders/${poId}`);
      return res.data || null;
    },
    enabled: !!poId,
  });

  const [shouldSkipStock, setShouldSkipStock] = useState(false);

  // Populate existing bill data
  useEffect(() => {
    if (!existingBill) return;

    setValue('vendorId', existingBill.vendorId);
    setValue('reference', isDuplicateMode ? '' : (existingBill.reference || ''));
    setValue('billingAddress', existingBill.billingAddress || '');
    setValue('shippingAddress', existingBill.shippingAddress || '');
    setValue('placeOfSupply', existingBill.placeOfSupply || '');
    setTaxMode(existingBill.igstAmount > 0 ? 'IGST' : 'CGST_SGST');
    setIsRcm(existingBill.isRcm || false);

    // Populate custom metadata
    if (existingBill.gstBreakup) {
      setWarehouseId(existingBill.gstBreakup.warehouseId || '');
      setNotes(existingBill.gstBreakup.notes || '');
      if (!isDuplicateMode) {
        setValue('dueDate', existingBill.gstBreakup.dueDate || '');
      }
    }

    if (existingBill.date && !isDuplicateMode) {
      setValue('date', existingBill.date.split('T')[0]);
    }

    // Populate line items
    if (existingBill.items && Array.isArray(existingBill.items)) {
      const mappedItems = existingBill.items.map((i: any, index: number) => {
        let textDesc = i.description || '';
        let discountPercent = 0;
        try {
          if (i.description.startsWith('{') && i.description.endsWith('}')) {
            const parsed = JSON.parse(i.description);
            textDesc = parsed.text || '';
            discountPercent = parsed.discount || 0;
          }
        } catch (e) {}

        return {
          keyId: `loaded-row-${index}`,
          productId: i.productId || '',
          description: textDesc,
          hsnCode: i.product?.hsnCode || 'N/A',
          qty: Number(i.qty),
          unit: i.product?.unit || 'PCS',
          rate: Number(i.rate),
          discount: discountPercent,
          taxPercent: Number(i.taxPercent),
          warehouseId: existingBill.gstBreakup?.warehouseId || ''
        };
      });
      setItems(mappedItems.length > 0 ? mappedItems : items);
    }
  }, [existingBill, isDuplicateMode]);

  // Populate from PO
  useEffect(() => {
    if (!existingPo) return;

    setValue('vendorId', existingPo.businessPartnerId);
    setValue('billingAddress', existingPo.billingAddress || '');
    setValue('shippingAddress', existingPo.shippingAddress || '');
    setValue('placeOfSupply', existingPo.placeOfSupply || '');
    setTaxMode(existingPo.taxMode);

    const poMeta = existingPo.gstBreakup || {};
    setWarehouseId(poMeta.warehouseId || '');
    setNotes(poMeta.notes || '');
    
    // Pass skipStockUpdate flag inside gstBreakup metadata so bill saves without incrementing stock again if received!
    const shouldSkip = existingPo.status === 'PARTIAL' || existingPo.status === 'CONVERTED';
    setShouldSkipStock(shouldSkip);

    if (existingPo.items && Array.isArray(existingPo.items)) {
      setItems(existingPo.items.map((i: any, index: number) => ({
        keyId: `po-row-${index}`,
        productId: i.productId || '',
        description: i.description || '',
        hsnCode: i.product?.hsnCode || 'N/A',
        qty: Number(i.qty),
        unit: i.product?.unit || 'PCS',
        rate: Number(i.rate),
        discount: 0,
        taxPercent: Number(i.taxPercent || 0),
        warehouseId: poMeta.warehouseId || '',
      })));
    }
  }, [existingPo]);

  // Set default warehouse when list loads
  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      const def = warehouses.find(w => w.isDefault);
      setWarehouseId(def ? def.id : warehouses[0].id);
    }
  }, [warehouses]);

  // Set default place of supply & addresses when vendor is selected
  const handleVendorChange = (id: string) => {
    setValue('vendorId', id);
    const v = vendors.find(vendor => vendor.id === id);
    if (v) {
      setValue('billingAddress', v.address || '');
      setValue('shippingAddress', v.address || '');
      setValue('placeOfSupply', v.state || '');

      // Auto check tax mode
      const compState = companyProfile?.state?.trim().toLowerCase() || '';
      const supplyState = (v.state || '').trim().toLowerCase();
      if (supplyState && compState && supplyState !== compState) {
        setTaxMode('IGST');
      } else {
        setTaxMode('CGST_SGST');
      }
    }
  };

  // Line item change handlers
  const handleLineChange = (index: number, field: keyof FormLineItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // Auto populate rate/details when product changes
    if (field === 'productId') {
      const p = products.find(prod => prod.id === value);
      if (p) {
        updated[index].description = p.name;
        updated[index].hsnCode = p.hsnCode || 'N/A';
        updated[index].rate = Number(p.purchasePrice || 0);
        updated[index].unit = p.unit || 'PCS';
        updated[index].taxPercent = Number(p.taxRate || p.gstRate || 18);
      }
    }

    setItems(updated);
  };

  const addLine = () => {
    setItems([
      ...items,
      {
        keyId: `new-row-${Date.now()}`,
        productId: '',
        description: '',
        hsnCode: 'N/A',
        qty: 1,
        unit: 'PCS',
        rate: 0,
        discount: 0,
        taxPercent: 18,
        warehouseId: warehouseId
      }
    ]);
  };

  const removeLine = (index: number) => {
    if (items.length === 1) {
      notification.warning('A purchase bill must contain at least one line item');
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const duplicateLine = (index: number) => {
    const original = items[index];
    setItems([
      ...items,
      {
        ...original,
        keyId: `dup-row-${Date.now()}`
      }
    ]);
  };

  // Math totals calculation
  const totals = React.useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    items.forEach(item => {
      const rate = Number(item.rate || 0);
      const qty = Number(item.qty || 0);
      const lineGross = rate * qty;
      const discAmt = (lineGross * Number(item.discount || 0)) / 100;
      const lineNet = lineGross - discAmt;
      const lineTax = (lineNet * Number(item.taxPercent || 0)) / 100;

      subtotal += lineNet;
      discountTotal += discAmt;
      taxTotal += lineTax;
    });

    const rawGrandTotal = subtotal + taxTotal;
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundOff = roundedGrandTotal - rawGrandTotal;

    const cgst = taxMode === 'CGST_SGST' ? taxTotal / 2 : 0;
    const sgst = taxMode === 'CGST_SGST' ? taxTotal / 2 : 0;
    const igst = taxMode === 'IGST' ? taxTotal : 0;

    return {
      subtotal,
      discountTotal,
      taxTotal,
      cgst,
      sgst,
      igst,
      roundOff,
      grandTotal: roundedGrandTotal
    };
  }, [items, taxMode]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditMode) {
        await apiClient.put(`/purchases/${editId}`, payload);
      } else {
        await apiClient.post('/purchases', payload);
      }
    },
    onSuccess: () => {
      notification.success(isEditMode ? 'Vendor bill updated successfully' : 'Vendor bill created successfully');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      navigate('/bills');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save purchase bill');
    }
  });

  const handleSave = (data: BillFormValues) => {
    // Validations
    if (!data.vendorId) {
      notification.error('Please select a vendor');
      return;
    }
    if (!date) {
      notification.error('Please select a billing date');
      return;
    }
    const emptyProductIdx = items.findIndex(i => !i.productId);
    if (emptyProductIdx !== -1) {
      notification.error(`Please select a product for line item ${emptyProductIdx + 1}`);
      return;
    }
    const zeroQtyIdx = items.findIndex(i => Number(i.qty) <= 0);
    if (zeroQtyIdx !== -1) {
      notification.error(`Quantity must be greater than zero for line item ${zeroQtyIdx + 1}`);
      return;
    }

    // Build Payload
    const payload = {
      vendorId: data.vendorId,
      date: new Date(data.date).toISOString(),
      reference: data.reference,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      placeOfSupply: data.placeOfSupply,
      taxMode,
      isRcm,
      gstBreakup: {
        dueDate: data.dueDate || undefined,
        warehouseId: warehouseId || undefined,
        notes: notes || undefined,
        roundOff: totals.roundOff,
        skipStockUpdate: shouldSkipStock || undefined
      },
      items: items.map(i => ({
        productId: i.productId,
        description: i.description,
        qty: Number(i.qty),
        rate: Number(i.rate),
        taxPercent: Number(i.taxPercent),
        discount: Number(i.discount)
      }))
    };

    saveMutation.mutate(payload);
  };

  if (loadBillId && loadingExisting) {
    return <LoadingState variant="form" />;
  }

  return (
    <PageContainer maxWidth="7xl">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/bills')}
              className="p-2 hover:bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                {isEditMode ? 'Edit Vendor Bill' : isDuplicateMode ? 'Duplicate Bill' : 'New Vendor Bill'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEditMode ? `Updating transaction fields for ${existingBill?.purchaseNo}` : 'Record vendor purchases, ledger liabilities, and stock inputs.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/bills')}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="billForm"
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-lg shadow-primary/10 flex items-center gap-1.5 px-5 py-2.5"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Bill'}
            </Button>
          </div>
        </div>

        <form id="billForm" onSubmit={handleFormSubmit(handleSave as any)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Blocks (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vendor & Bill Info */}
            <Card className="p-6 space-y-4">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5 border-b border-border pb-3">
                <ShoppingCart className="w-5 h-5 text-primary" /> Vendor & Billing Details
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Select
                    label="Vendor"
                    required
                    {...register('vendorId')}
                    onChange={(e: any) => handleVendorChange(e.target.value)}
                    options={[
                      { value: "", label: "Select Vendor" },
                      ...vendors.map(v => ({ value: v.id, label: v.name }))
                    ]}
                  />
                  <FormErrorDisplay error={errors.vendorId} />
                </div>

                <div className="space-y-1.5">
                  <Input
                    label="Place of Supply / State"
                    {...register('placeOfSupply')}
                    placeholder="Auto-filled state code"
                  />
                  <FormErrorDisplay error={errors.placeOfSupply} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Input
                    label="Billing Date"
                    type="date"
                    required
                    {...register('date')}
                  />
                  <FormErrorDisplay error={errors.date} />
                </div>

                <div className="space-y-1.5">
                  <Input
                    label="Due Date"
                    type="date"
                    {...register('dueDate')}
                  />
                  <FormErrorDisplay error={errors.dueDate} />
                </div>

                <div className="space-y-1.5">
                  <Input
                    label="Vendor Reference / Invoice No"
                    {...register('reference')}
                    placeholder="e.g. INV/2026/001"
                  />
                  <FormErrorDisplay error={errors.reference} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Billing Address</label>
                  <textarea
                    rows={2}
                    {...register('billingAddress')}
                    placeholder="Vendor invoice billing address"
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
                  />
                  <FormErrorDisplay error={errors.billingAddress} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shipping Address</label>
                  <textarea
                    rows={2}
                    {...register('shippingAddress')}
                    placeholder="Material delivery destination address"
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
                  />
                  <FormErrorDisplay error={errors.shippingAddress} />
                </div>
              </div>
            </Card>

            {/* Items Grid Layout */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                  <Building className="w-5 h-5 text-primary" /> Purchase Items Grid
                </h3>
                <Button 
                  onClick={addLine}
                  type="button" 
                  variant="outline" 
                  className="text-xs font-bold flex items-center gap-1 hover:bg-primary/5 hover:text-primary hover:border-primary/40"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => {
                  const lineGross = Number(item.rate || 0) * Number(item.qty || 0);
                  const lineDiscount = (lineGross * Number(item.discount || 0)) / 100;
                  const lineNet = lineGross - lineDiscount;
                  const lineTax = (lineNet * Number(item.taxPercent || 0)) / 100;
                  const lineTotal = lineNet + lineTax;

                  return (
                    <div key={item.keyId} className="p-4 border border-border/80 rounded-xl bg-muted/10 space-y-3 relative group">
                      {/* Row Header */}
                      <div className="flex items-center justify-between border-b border-border/30 pb-2">
                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Item line {index + 1}</span>
                        <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => duplicateLine(index)}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer"
                            title="Duplicate Line"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-red-500 rounded cursor-pointer"
                            title="Delete Line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Row Grid inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Product</label>
                          <select
                            value={item.productId}
                            onChange={e => handleLineChange(index, 'productId', e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">Select Product</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
                          <input
                            type="text"
                            placeholder="Specifications / Notes"
                            value={item.description}
                            onChange={e => handleLineChange(index, 'description', e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="md:col-span-1.5 space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">HSN Code</label>
                          <input
                            type="text"
                            readOnly
                            value={item.hsnCode}
                            className="w-full px-2 py-1.5 bg-muted text-muted-foreground border border-border rounded-lg text-xs font-mono"
                          />
                        </div>

                        <div className="md:col-span-1.5 space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={e => handleLineChange(index, 'qty', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Rate (INR)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={e => handleLineChange(index, 'rate', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      {/* Row Grid tax discount calculations */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-12 gap-3 items-center pt-2">
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Discount (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={e => handleLineChange(index, 'discount', Number(e.target.value))}
                            className="w-full px-2 py-1 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">GST Tax (%)</label>
                          <select
                            value={item.taxPercent}
                            onChange={e => handleLineChange(index, 'taxPercent', Number(e.target.value))}
                            className="w-full px-2 py-1 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="0">0% (Nil Rated)</option>
                            <option value="5">5% GST</option>
                            <option value="12">12% GST</option>
                            <option value="18">18% GST</option>
                            <option value="28">28% GST</option>
                          </select>
                        </div>

                        <div className="md:col-span-3 text-right">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">Tax Amount</div>
                          <div className="text-xs font-mono font-medium text-foreground">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(lineTax)}</div>
                        </div>

                        <div className="md:col-span-3 text-right">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">Line Total</div>
                          <div className="text-xs font-mono font-bold text-primary">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(lineTotal)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Sticky Right Side Block (Totals and Settings) */}
          <div className="space-y-6">
            {/* Header Configuration */}
            <Card className="p-6 space-y-4">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5 border-b border-border pb-3">
                <Landmark className="w-5 h-5 text-primary" /> Settings & Place
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Destination Warehouse</label>
                  <select
                    value={warehouseId}
                    onChange={e => setWarehouseId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-semibold"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">GST Route Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTaxMode('CGST_SGST')}
                      className={`px-3 py-2 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        taxMode === 'CGST_SGST' 
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' 
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Intrastate (CGST/SGST)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxMode('IGST')}
                      className={`px-3 py-2 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        taxMode === 'IGST' 
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' 
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Interstate (IGST)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 px-0.5 border border-border/40 rounded-lg p-2.5 bg-muted/10">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground">Reverse Charge (RCM)</span>
                    <span className="text-[10px] text-muted-foreground">GST is paid by receiver</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isRcm}
                    onChange={e => setIsRcm(e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary rounded"
                  />
                </div>
              </div>
            </Card>

            {/* Calculations & Summary */}
            <Card className="p-6 space-y-4">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5 border-b border-border pb-3">
                <FileCheck className="w-5 h-5 text-primary" /> Financial Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal before tax:</span>
                  <span className="font-semibold text-foreground font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.subtotal)}</span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Item Discounts:</span>
                  <span className="font-semibold text-red-500 font-mono">-{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.discountTotal)}</span>
                </div>

                {taxMode === 'CGST_SGST' ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Input CGST:</span>
                      <span className="font-semibold text-foreground font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.cgst)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Input SGST:</span>
                      <span className="font-semibold text-foreground font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.sgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Input IGST:</span>
                    <span className="font-semibold text-foreground font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.igst)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Round Off:</span>
                  <span className="font-semibold text-foreground font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.roundOff)}</span>
                </div>

                <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-3">
                  <span>Grand Total (INR):</span>
                  <span className="text-primary text-base font-black font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.grandTotal)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Internal Billing Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Enter additional terms or ledger descriptions..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button
                  type="submit"
                  form="billForm"
                  disabled={saveMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-lg shadow-primary/10 flex items-center justify-center gap-1.5 py-3 transition-transform active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  {saveMutation.isPending ? 'Posting Transaction...' : 'Save & Post Ledger'}
                </Button>
                <div className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Generates stock entries & GL journal bookings.
                </div>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </PageContainer>
  );
};
