import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, Plus, Trash2, Copy, Save, AlertCircle, ShoppingCart, 
  Building, Calendar, FileText, Landmark, FileCheck, HelpCircle, Loader2, Info
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer, LoadingState } from '@/components/ui/LayoutComponents';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import apiClient from '@/services/api';
import { toast } from 'sonner';

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
  paymentTerms?: string;
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

  // Form Fields
  const [vendorId, setVendorId] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [taxMode, setTaxMode] = useState<'CGST_SGST' | 'IGST' | 'NO_TAX'>('CGST_SGST');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
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
      setOrderNo(nextNoData.nextNumber);
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

    setVendorId(existingPo.businessPartnerId);
    setTaxMode(existingPo.taxMode);
    setPlaceOfSupply(existingPo.placeOfSupply || '');
    setBillingAddress(existingPo.billingAddress || '');
    setShippingAddress(existingPo.shippingAddress || '');
    if (existingPo.billingAddress && existingPo.shippingAddress) {
      setSameAsBilling(existingPo.billingAddress === existingPo.shippingAddress);
    }
    setStatus(existingPo.status);

    if (!isDuplicateMode) {
      setOrderNo(existingPo.orderNo);
      setDate(existingPo.date.split('T')[0]);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
    }

    const meta = existingPo.gstBreakup || {};
    setReferenceNo(meta.referenceNo || '');
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

  // Synchronize billing to shipping if Same as Billing is checked
  useEffect(() => {
    if (sameAsBilling) {
      setShippingAddress(billingAddress);
    }
  }, [billingAddress, sameAsBilling]);

  const selectedVendor = useMemo(() => {
    return vendors.find(v => v.id === vendorId) || null;
  }, [vendorId, vendors]);

  // Auto fill vendor details
  const handleVendorChange = (vId: string) => {
    setVendorId(vId);
    const v = vendors.find(x => x.id === vId);
    if (v) {
      setBillingAddress(v.address || '');
      if (sameAsBilling) {
        setShippingAddress(v.address || '');
      }
      setPlaceOfSupply(v.state || '');
      
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId) {
      toast.error('Vendor / Supplier selection is required');
      return;
    }

    if (!orderNo) {
      toast.error('Purchase Invoice Number is required');
      return;
    }

    const invalidRow = items.find(i => !i.productId || i.qty <= 0 || i.rate <= 0);
    if (invalidRow) {
      toast.error('All line items must have a product, quantity > 0, and rate > 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        businessPartnerId: vendorId,
        orderNo,
        date: new Date(date).toISOString(),
        taxMode,
        placeOfSupply,
        billingAddress,
        shippingAddress,
        notes: notes || undefined,
        referenceNo: referenceNo || undefined,
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
        toast.success('Purchase Order updated successfully');
      } else {
        await apiClient.post('/purchase-orders', payload);
        toast.success('Purchase Order recorded successfully');
      }

      navigate('/purchase-orders');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save purchase order');
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

      <form onSubmit={handleSubmit} className="space-y-6 text-left">
        {/* Vendor & Details Block */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
          <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5 border-b border-border pb-3">
            <ShoppingCart className="w-5 h-5 text-accent" /> Vendor & Purchase Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Vendor Supplier *</label>
              <select
                value={vendorId}
                onChange={e => handleVendorChange(e.target.value)}
                required
                disabled={isEditMode}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent"
              >
                <option value="">Select Vendor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Purchase Invoice Number *</label>
              <input
                type="text"
                value={orderNo}
                onChange={e => setOrderNo(e.target.value)}
                required
                placeholder="e.g. INV-001 or PUR-2026-001"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent font-bold font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Order Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent"
              />
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
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Ref Number / Quotation</label>
              <input
                type="text"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="e.g. Supplier Quote Ref"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Billing Address</label>
              <textarea
                rows={1}
                value={billingAddress}
                onChange={e => setBillingAddress(e.target.value)}
                placeholder="Billing address details"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent resize-none text-muted-foreground"
              />
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
                value={sameAsBilling ? billingAddress : shippingAddress}
                onChange={e => setShippingAddress(e.target.value)}
                disabled={sameAsBilling}
                placeholder="Shipping address details"
                className={`w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent resize-none text-muted-foreground ${sameAsBilling ? 'opacity-60 cursor-not-allowed bg-muted/20' : ''}`}
              />
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
                  <p className="flex justify-between"><span>Payment Terms:</span> <span className="text-muted-foreground">{selectedVendor.paymentTerms || 'Due on Receipt'}</span></p>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="flex justify-end items-start">
              <div className="w-full space-y-4 bg-muted/20 border border-border/60 rounded-2xl p-6 text-sm">
                <div className="font-extrabold text-foreground border-b border-border/50 pb-2 mb-3 uppercase tracking-wider text-xs">Purchase Summary</div>
                
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Gross Subtotal</span>
                  <span className="font-mono">₹{summary.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {summary.totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium text-xs">
                    <span>Discount Saved</span>
                    <span className="font-mono">-₹{summary.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground text-xs border-t border-border/40 pt-2">
                  <span>Taxable Value</span>
                  <span className="font-mono">₹{summary.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {taxMode === 'CGST_SGST' && summary.cgst > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground text-[11px] pl-2 font-mono">
                      <span>Input CGST</span>
                      <span>₹{summary.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-[11px] pl-2 font-mono">
                      <span>Input SGST</span>
                      <span>₹{summary.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}

                {taxMode === 'IGST' && summary.igst > 0 && (
                  <div className="flex justify-between text-muted-foreground text-[11px] pl-2 font-mono">
                    <span>Input IGST</span>
                    <span>₹{summary.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {summary.taxTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground text-xs pt-1 border-t border-border/30">
                    <span>Total Tax</span>
                    <span className="font-mono">₹{summary.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {Math.abs(summary.roundOff) > 0 && (
                  <div className="flex justify-between text-muted-foreground text-[11px] font-mono">
                    <span>Round Off Offset</span>
                    <span>{summary.roundOff > 0 ? '+' : ''}₹{summary.roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-extrabold text-foreground border-t border-border/60 pt-3">
                  <span>Grand Total</span>
                  <span className="text-accent font-sans">₹{summary.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

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
              </div>
            </div>
          </div>
        </div>
      </form>
    </PageContainer>
  );
};
