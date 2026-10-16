import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ShoppingBag,
  FileText,
  X,
  Edit2,
  RefreshCw,
  HelpCircle,
  Plus,
  Paperclip,
  Building,
  Search,
  Check,
  ExternalLink,
  Settings,
  Layers,
  MapPin,
  Phone,
  Mail,
  User,
  Info,
} from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  ZohoTransactionForm,
  ZohoItemTable,
  ZohoTotalsBox,
  ZohoFormFooter,
  ZohoAttachmentUploader,
  ZohoItemRow,
  AttachmentFile,
  ZOHO_TDS_OPTIONS,
  ZOHO_TCS_OPTIONS,
} from '@/shared/components/zoho';
import { ZohoModal } from '@/shared/components/zoho/ZohoModal';
import { PageLoader } from '@/shared/components/ui';

const PAYMENT_TERMS_LIST = [
  { value: 'Due on Receipt', days: 0 },
  { value: 'Net 15', days: 15 },
  { value: 'Net 30', days: 30 },
  { value: 'Net 45', days: 45 },
  { value: 'Net 60', days: 60 },
];

const SHIPMENT_PREFERENCES = [
  'Courier',
  'Road Transport',
  'Air Cargo',
  'Sea Freight',
  'Self Pickup',
];

const poItemSchema = z.object({
  productId: z.string().optional(),
  accountId: z.string().optional(),
  description: z.string().optional(),
  qty: z.coerce.number().min(0.0001, 'Qty must be > 0'),
  rate: z.coerce.number().min(0, 'Rate must be >= 0'),
  taxPercent: z.coerce.number().min(0).default(18),
  discount: z.coerce.number().min(0).default(0),
  unit: z.string().optional(),
});

const poSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  deliveryAddressType: z.enum(['ORGANIZATION', 'CUSTOMER']).default('ORGANIZATION'),
  deliveryCustomerId: z.string().optional(),
  orderNo: z.string().min(1, 'Purchase Order# is required'),
  referenceNo: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  deliveryDate: z.string().optional(),
  paymentTerms: z.string().default('Due on Receipt'),
  shipmentPreference: z.string().optional(),
  isRcm: z.boolean().default(false),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  discount: z.coerce.number().default(0),
  discountType: z.enum(['%', 'amount']).default('%'),
  adjustment: z.coerce.number().default(0),
  tdsTcsType: z.enum(['NONE', 'TDS', 'TCS']).default('NONE'),
  tdsTcsRate: z.coerce.number().default(0),
  tdsTcsAmount: z.coerce.number().default(0),
  tdsTcsTaxId: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'At least one line item is required'),
});

type POFormValues = z.infer<typeof poSchema>;

export const PurchaseOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { company } = useAuth();

  const isEditMode = Boolean(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'DRAFT' | 'SENT'>('SENT');
  const [attachedFiles, setAttachedFiles] = useState<AttachmentFile[]>([]);

  // Modals state
  const [isVendorSearchOpen, setIsVendorSearchOpen] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isBulkItemsModalOpen, setIsBulkItemsModalOpen] = useState(false);
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  const [bulkSelectedMap, setBulkSelectedMap] = useState<Record<string, number>>({});
  const [isEditOrgAddressModalOpen, setIsEditOrgAddressModalOpen] = useState(false);
  const [customOrgAddress, setCustomOrgAddress] = useState<string>('');

  const form = useForm<POFormValues>({
    resolver: zodResolver(poSchema) as any,
    defaultValues: {
      vendorId: '',
      deliveryAddressType: 'ORGANIZATION',
      deliveryCustomerId: '',
      orderNo: '',
      referenceNo: '',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: new Date().toISOString().split('T')[0],
      paymentTerms: 'Due on Receipt',
      shipmentPreference: '',
      isRcm: false,
      notes: 'Will be displayed on purchase order',
      termsConditions: '1. Goods must be delivered within the promised timeframe.\n2. Invoices must reference this PO number.',
      discount: 0,
      discountType: '%',
      adjustment: 0,
      tdsTcsType: 'NONE',
      tdsTcsRate: 0,
      tdsTcsAmount: 0,
      tdsTcsTaxId: '',
      items: [
        {
          productId: '',
          accountId: '',
          description: '',
          qty: 1,
          rate: 0,
          taxPercent: 18,
          discount: 0,
          unit: 'Pcs',
        },
      ],
    },
  });

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = form;
  const { append } = useFieldArray({ control, name: 'items' });

  // Master Data Queries
  const { data: vendorsData, isLoading: loadingVendors } = useQuery<any>({
    queryKey: ['vendors'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/vendors');
        return ensureArray(res);
      } catch (err: any) {
        notification.error('Failed to load vendors');
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: customersData, isLoading: loadingCustomers } = useQuery<any>({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/customers');
        return ensureArray(res);
      } catch (err: any) {
        notification.error('Failed to load customers');
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery<any>({
    queryKey: ['products'],
    queryFn: () => apiClient.get('/products'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: accountsData } = useQuery<any>({
    queryKey: ['accounts'],
    queryFn: () => apiClient.get('/accounts').catch(() => ({ data: [] })),
    staleTime: 5 * 60 * 1000,
  });

  const { data: meData } = useQuery<any>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: nextNoData } = useQuery<any>({
    queryKey: ['purchase-orders', 'next-number'],
    queryFn: async () => {
      try {
        const res: any = await apiClient.get('/purchase-orders/next-number');
        return res?.data?.data || res?.data || res;
      } catch (_) {
        return { nextNumber: `PO-${Date.now().toString().slice(-5)}` };
      }
    },
    staleTime: 0,
  });

  const { data: existingPo, isLoading: loadingExisting } = useQuery<any>({
    queryKey: ['purchase-order-edit', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get(`/purchase-orders/${id}`);
      return res?.data?.data || res?.data || res;
    },
    enabled: isEditMode,
  });

  const vendors = useMemo(() => ensureArray(vendorsData), [vendorsData]);
  const customers = useMemo(() => ensureArray(customersData), [customersData]);
  const products = useMemo(() => ensureArray(productsData), [productsData]);
  const accounts = useMemo(() => ensureArray(accountsData), [accountsData]);
  const companyProfile = company || meData?.data?.company || meData?.company || null;

  // Auto assign sequence
  useEffect(() => {
    const nextNum = nextNoData?.nextNumber || nextNoData?.data?.nextNumber;
    if (!isEditMode && nextNum && !watch('orderNo')) {
      setValue('orderNo', nextNum);
    }
  }, [nextNoData, isEditMode, setValue, watch]);

  // Set default org delivery address
  useEffect(() => {
    if (companyProfile && !customOrgAddress) {
      const parts = [
        companyProfile.address,
        companyProfile.state ? `${companyProfile.state}${companyProfile.pinCode ? ` - ${companyProfile.pinCode}` : ''}` : '',
        companyProfile.country || 'India',
        companyProfile.phone ? `Phone: ${companyProfile.phone}` : '',
      ].filter(Boolean);
      setCustomOrgAddress(parts.join('\n'));
    }
  }, [companyProfile, customOrgAddress]);

  // Pre-populate if editing
  useEffect(() => {
    if (isEditMode && existingPo) {
      if (existingPo.businessPartnerId || existingPo.vendorId) {
        setValue('vendorId', existingPo.businessPartnerId || existingPo.vendorId);
      }
      if (existingPo.orderNo) setValue('orderNo', existingPo.orderNo);
      if (existingPo.referenceNo) setValue('referenceNo', existingPo.referenceNo);
      if (existingPo.date) setValue('date', new Date(existingPo.date).toISOString().split('T')[0]);
      if (existingPo.expectedDeliveryDate || existingPo.deliveryDate) {
        setValue('deliveryDate', new Date(existingPo.expectedDeliveryDate || existingPo.deliveryDate).toISOString().split('T')[0]);
      }
      if (existingPo.paymentTerms) setValue('paymentTerms', existingPo.paymentTerms);
      if (existingPo.shipmentPreference) setValue('shipmentPreference', existingPo.shipmentPreference);
      if (existingPo.isRcm !== undefined) setValue('isRcm', Boolean(existingPo.isRcm));
      if (existingPo.deliveryAddressType) setValue('deliveryAddressType', existingPo.deliveryAddressType);
      if (existingPo.deliveryCustomerId) setValue('deliveryCustomerId', existingPo.deliveryCustomerId);
      if (existingPo.notes) setValue('notes', existingPo.notes);
      if (existingPo.termsConditions) setValue('termsConditions', existingPo.termsConditions);
      if (existingPo.discount !== undefined) setValue('discount', Number(existingPo.discount));
      if (existingPo.discountType) setValue('discountType', existingPo.discountType);
      if (existingPo.adjustment !== undefined) setValue('adjustment', Number(existingPo.adjustment));
      if (existingPo.tdsTcsType) setValue('tdsTcsType', existingPo.tdsTcsType);
      if (existingPo.tdsTcsRate !== undefined) setValue('tdsTcsRate', Number(existingPo.tdsTcsRate));
      if (existingPo.tdsTcsTaxId) setValue('tdsTcsTaxId', existingPo.tdsTcsTaxId);

      if (Array.isArray(existingPo.attachedFiles)) {
        setAttachedFiles(existingPo.attachedFiles);
      }

      if (Array.isArray(existingPo.items) && existingPo.items.length > 0) {
        setValue(
          'items',
          existingPo.items.map((it: any) => ({
            productId: it.productId || '',
            accountId: it.accountId || '',
            description: it.description || '',
            qty: Number(it.qty || 1),
            rate: Number(it.rate || 0),
            taxPercent: Number(it.taxPercent || 18),
            discount: Number(it.discount || 0),
            unit: it.unit || 'Pcs',
          }))
        );
      }
    }
  }, [isEditMode, existingPo, setValue]);

  const vendorId = watch('vendorId');
  const deliveryCustomerId = watch('deliveryCustomerId');
  const items = useWatch({ control, name: 'items' }) || [];
  const adjustmentValue = watch('adjustment') || 0;
  const discountVal = watch('discount') || 0;
  const discountTypeVal = watch('discountType') || '%';
  const tdsTcsTypeVal = watch('tdsTcsType') || 'NONE';
  const tdsTcsRateVal = watch('tdsTcsRate') || 0;
  const tdsTcsTaxIdVal = watch('tdsTcsTaxId') || '';
  const deliveryAddressType = watch('deliveryAddressType');

  const selectedVendor = useMemo(() => {
    return vendors.find((v: any) => v.id === vendorId);
  }, [vendorId, vendors]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === deliveryCustomerId);
  }, [deliveryCustomerId, customers]);

  // Vendor selection handler with auto-fill
  const handleVendorSelect = (vId: string) => {
    setValue('vendorId', vId, { shouldValidate: true, shouldDirty: true });
    if (!vId) return;

    const v = vendors.find((vend: any) => vend.id === vId);
    if (v) {
      if (v.paymentTerms) {
        handlePaymentTermsChange(v.paymentTerms);
      }
    }
  };

  const handlePaymentTermsChange = (term: string) => {
    setValue('paymentTerms', term);
    const d = watch('date') ? new Date(watch('date')) : new Date();
    if (isNaN(d.getTime())) return;
    const opt = PAYMENT_TERMS_LIST.find((o) => o.value === term);
    d.setDate(d.getDate() + (opt ? opt.days : 0));
    setValue('deliveryDate', d.toISOString().split('T')[0]);
  };

  // Live Calculations matching Zoho Books accounting rules
  const totals = useMemo(() => {
    let subtotal = 0;
    let lineDiscountTotal = 0;
    let taxTotal = 0;
    let totalQty = 0;

    (items || []).forEach((it: any) => {
      const qty = Number(it.qty) || 0;
      const rate = Number(it.rate) || 0;
      const disc = Number(it.discount) || 0;
      const taxRate = Number(it.taxPercent) || 0;

      const lineTotal = qty * rate;
      const lineDisc = (lineTotal * disc) / 100;
      const taxable = Math.max(0, lineTotal - lineDisc);
      const lineTax = (taxable * taxRate) / 100;

      subtotal += taxable;
      lineDiscountTotal += lineDisc;
      taxTotal += lineTax;
      totalQty += qty;
    });

    // Transaction discount
    let txnDiscountAmount = 0;
    if (discountTypeVal === '%') {
      txnDiscountAmount = (subtotal * Number(discountVal || 0)) / 100;
    } else {
      txnDiscountAmount = Number(discountVal || 0);
    }
    const afterDiscountSubtotal = Math.max(0, subtotal - txnDiscountAmount);

    // TDS or TCS
    let tdsTcsAmt = 0;
    if (tdsTcsTypeVal !== 'NONE' && tdsTcsRateVal > 0) {
      tdsTcsAmt = Number(((afterDiscountSubtotal * tdsTcsRateVal) / 100).toFixed(2));
    }

    let exactGrandTotal = afterDiscountSubtotal + taxTotal + Number(adjustmentValue || 0);
    if (tdsTcsTypeVal === 'TDS') {
      exactGrandTotal -= tdsTcsAmt;
    } else if (tdsTcsTypeVal === 'TCS') {
      exactGrandTotal += tdsTcsAmt;
    }

    exactGrandTotal = Math.max(0, exactGrandTotal);
    const roundedGrandTotal = Math.round(exactGrandTotal);
    const roundOff = Number((roundedGrandTotal - exactGrandTotal).toFixed(2));

    return {
      subtotal,
      lineDiscountTotal,
      txnDiscountAmount,
      taxTotal,
      tdsTcsAmount: tdsTcsAmt,
      roundOff,
      grandTotal: roundedGrandTotal,
      totalQty,
    };
  }, [items, adjustmentValue, discountVal, discountTypeVal, tdsTcsTypeVal, tdsTcsRateVal]);

  // Synchronize items with ZohoItemTable
  const zohoItems: ZohoItemRow[] = useMemo(() => {
    return (items || []).map((it: any, idx: number) => {
      const prod = products.find((p: any) => p.id === it.productId);
      const qty = Number(it.qty) || 1;
      const rate = Number(it.rate) || 0;
      const disc = Number(it.discount) || 0;
      const base = qty * rate;
      const discAmt = (base * disc) / 100;

      return {
        id: String(idx),
        productId: it.productId,
        accountId: it.accountId,
        name: prod?.name || it.description || '',
        description: it.description || '',
        quantity: qty,
        rate,
        discount: disc,
        discountType: '%',
        taxRate: Number(it.taxPercent) || 0,
        amount: Math.max(0, base - discAmt),
      };
    });
  }, [items, products]);

  const handleZohoItemsChange = (newRows: ZohoItemRow[]) => {
    const mapped = newRows.map((row) => {
      let discPercent = Number(row.discount) || 0;
      if (row.discountType === 'amount') {
        const lineTotal = (Number(row.quantity) || 1) * (Number(row.rate) || 0);
        discPercent = lineTotal > 0 ? ((Number(row.discount) || 0) / lineTotal) * 100 : 0;
      }
      return {
        productId: row.productId || '',
        accountId: row.accountId || '',
        description: row.description || row.name || '',
        qty: Number(row.quantity) || 1,
        rate: Number(row.rate) || 0,
        taxPercent: Number(row.taxRate ?? 18),
        discount: discPercent,
        unit: 'Pcs',
      };
    });
    setValue('items', mapped, { shouldValidate: true, shouldDirty: true });
  };

  // Add items in bulk logic
  const handleBulkAddConfirm = () => {
    const selectedIds = Object.keys(bulkSelectedMap).filter((id) => bulkSelectedMap[id] > 0);
    if (selectedIds.length === 0) {
      notification.warning('Please select at least one item');
      return;
    }

    const currentItems = [...items];
    // Remove initial empty placeholder if single empty row
    const cleanItems = currentItems.length === 1 && !currentItems[0].productId && !currentItems[0].description
      ? []
      : currentItems;

    selectedIds.forEach((prodId) => {
      const prod = products.find((p: any) => p.id === prodId);
      if (prod) {
        cleanItems.push({
          productId: prod.id,
          accountId: '',
          description: prod.name || prod.description || '',
          qty: bulkSelectedMap[prodId] || 1,
          rate: Number(prod.costPrice || prod.purchasePrice || prod.price || 0),
          taxPercent: Number(prod.taxRate || 18),
          discount: 0,
          unit: prod.unit || 'Pcs',
        });
      }
    });

    setValue('items', cleanItems, { shouldValidate: true, shouldDirty: true });
    setBulkSelectedMap({});
    setIsBulkItemsModalOpen(false);
    notification.success(`Added ${selectedIds.length} item(s) to purchase order`);
  };

  // Filtered lists for modals
  const filteredVendors = useMemo(() => {
    if (!vendorSearchTerm.trim()) return vendors;
    const q = vendorSearchTerm.toLowerCase();
    return vendors.filter((v: any) => {
      const name = (v.name || '').toLowerCase();
      const comp = (v.companyName || v.tradeName || '').toLowerCase();
      const gstin = (v.gstin || v.gstNumber || '').toLowerCase();
      const phone = (v.phone || v.mobile || '').toLowerCase();
      return name.includes(q) || comp.includes(q) || gstin.includes(q) || phone.includes(q);
    });
  }, [vendors, vendorSearchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return customers;
    const q = customerSearchTerm.toLowerCase();
    return customers.filter((c: any) => {
      const name = (c.name || '').toLowerCase();
      const comp = (c.companyName || c.tradeName || '').toLowerCase();
      const gstin = (c.gstin || c.gstNumber || '').toLowerCase();
      const phone = (c.phone || c.mobile || '').toLowerCase();
      return name.includes(q) || comp.includes(q) || gstin.includes(q) || phone.includes(q);
    });
  }, [customers, customerSearchTerm]);

  const filteredBulkProducts = useMemo(() => {
    if (!bulkSearchTerm.trim()) return products;
    const q = bulkSearchTerm.toLowerCase();
    return products.filter((p: any) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || p.code || '').toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [products, bulkSearchTerm]);

  const submitFormWithStatus = async (data: POFormValues, targetStatus: 'DRAFT' | 'SENT') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        businessPartnerId: data.vendorId,
        orderNo: data.orderNo.trim(),
        referenceNo: data.referenceNo || undefined,
        date: new Date(data.date).toISOString(),
        expectedDeliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString() : undefined,
        paymentTerms: data.paymentTerms,
        shipmentPreference: data.shipmentPreference,
        isRcm: data.isRcm,
        notes: data.notes,
        termsConditions: data.termsConditions,
        deliveryAddressType: data.deliveryAddressType,
        deliveryCustomerId: data.deliveryAddressType === 'CUSTOMER' ? data.deliveryCustomerId : undefined,
        deliveryCustomerName: data.deliveryAddressType === 'CUSTOMER' ? selectedCustomer?.name : undefined,
        deliveryCustomerAddress: data.deliveryAddressType === 'CUSTOMER' ? (selectedCustomer?.address || selectedCustomer?.shippingAddress || selectedCustomer?.billingAddress) : undefined,
        discount: data.discount,
        discountType: data.discountType,
        discountAmount: totals.txnDiscountAmount,
        adjustment: data.adjustment,
        tdsTcsType: data.tdsTcsType,
        tdsTcsRate: data.tdsTcsRate,
        tdsTcsAmount: totals.tdsTcsAmount,
        tdsTcsTaxId: data.tdsTcsTaxId,
        attachedFiles,
        status: targetStatus,
        items: data.items.map((it) => ({
          productId: it.productId || undefined,
          accountId: it.accountId || undefined,
          description: it.description?.trim() || products.find((p: any) => p.id === it.productId)?.name || 'General Item',
          qty: Number(it.qty) || 1,
          rate: Number(it.rate) || 0,
          taxPercent: Number(it.taxPercent) || 0,
          discount: Number(it.discount) || 0,
          unit: it.unit || 'Pcs',
        })),
      };

      if (isEditMode) {
        await apiClient.put(`/purchase-orders/${id}`, payload);
        notification.success('Purchase order updated successfully');
      } else {
        await apiClient.post('/purchase-orders', payload);
        notification.success(targetStatus === 'DRAFT' ? 'Purchase order draft saved' : 'Purchase order created and issued');
      }

      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-order-edit', id] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      navigate('/purchase-orders');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to save purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: POFormValues) => {
    await submitFormWithStatus(data, submitStatus);
  };

  if (loadingVendors || loadingProducts || (isEditMode && loadingExisting)) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <PageLoader title="Loading Purchase Order..." description="Fetching vendor and product details..." />
      </div>
    );
  }

  // Header Band: Vendor Name + Search Button + Dynamic Vendor Profile
  const headerBand = (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
          Vendor Name <span className="text-[#E54B4B]">*</span>
        </label>
        <div className="flex items-center gap-1.5 flex-1 max-w-lg">
          <select
            value={vendorId}
            onChange={(e) => handleVendorSelect(e.target.value)}
            className="flex-1 h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB] cursor-pointer"
          >
            <option value="">Select a Vendor</option>
            {vendors.map((v: any) => {
              const displayName = v.name || v.companyName || 'Unnamed Vendor';
              const detail = [v.companyName !== v.name ? v.companyName : null, v.gstin || v.gstNumber].filter(Boolean).join(' - ');
              return (
                <option key={v.id} value={v.id}>
                  {displayName} {detail ? `(${detail})` : ''}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            title="Search & select vendor"
            onClick={() => {
              setVendorSearchTerm('');
              setIsVendorSearchOpen(true);
            }}
            className="h-8 w-8 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {errors.vendorId && (
        <p className="text-[#E54B4B] text-[11px] sm:ml-40">{errors.vendorId.message}</p>
      )}

      {/* Selected Vendor Profile Badge */}
      {selectedVendor && (
        <div className="sm:ml-40 max-w-lg bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] p-2.5 text-xs text-[#334155] space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#1E293B]">
              {selectedVendor.name || selectedVendor.companyName}
            </span>
            {(selectedVendor.gstNumber || selectedVendor.gstin) && (
              <span className="bg-[#EFF6FF] text-[#2563EB] font-mono text-[10px] px-1.5 py-0.5 rounded border border-[#BFDBFE]">
                GSTIN: {selectedVendor.gstNumber || selectedVendor.gstin}
              </span>
            )}
          </div>
          {(selectedVendor.address || selectedVendor.billingAddress) && (
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              {typeof selectedVendor.billingAddress === 'object'
                ? [selectedVendor.billingAddress.street1, selectedVendor.billingAddress.city, selectedVendor.billingAddress.state].filter(Boolean).join(', ')
                : selectedVendor.address}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#64748B]">
            {selectedVendor.phone && <span>Phone: {selectedVendor.phone}</span>}
            {selectedVendor.email && <span>Email: {selectedVendor.email}</span>}
            {selectedVendor.paymentTerms && (
              <span className="text-[#0284C7] font-medium">Terms: {selectedVendor.paymentTerms}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Fields Grid
  const fieldsGrid = (
    <div className="space-y-4">
      {/* Delivery Address Radio + Dynamic Organization / Customer Block (Zoho Books Screenshot 1 & 2) */}
      <div className="flex flex-col sm:flex-row items-start gap-4 pt-1">
        <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 pt-0.5">
          Delivery Address <span className="text-[#E54B4B]">*</span>
        </label>

        <div className="space-y-2 flex-1 max-w-lg">
          {/* Radio Buttons */}
          <div className="flex items-center gap-6 text-xs text-[#2B2F36]">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="radio"
                value="ORGANIZATION"
                checked={deliveryAddressType === 'ORGANIZATION'}
                onChange={() => setValue('deliveryAddressType', 'ORGANIZATION')}
                className="text-[#408DFB] focus:ring-0 cursor-pointer"
              />
              <span className={deliveryAddressType === 'ORGANIZATION' ? 'font-medium text-[#2B2F36]' : 'text-gray-600'}>
                Organization
              </span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="radio"
                value="CUSTOMER"
                checked={deliveryAddressType === 'CUSTOMER'}
                onChange={() => setValue('deliveryAddressType', 'CUSTOMER')}
                className="text-[#408DFB] focus:ring-0 cursor-pointer"
              />
              <span className={deliveryAddressType === 'CUSTOMER' ? 'font-medium text-[#2B2F36]' : 'text-gray-600'}>
                Customer
              </span>
            </label>
          </div>

          {/* Organization Delivery Address Card */}
          {deliveryAddressType === 'ORGANIZATION' && (
            <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px] p-3 text-xs text-[#2B2F36] space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span>{companyProfile?.companyName || companyProfile?.name || 'biofixofficial'}</span>
                <button
                  type="button"
                  onClick={() => setIsEditOrgAddressModalOpen(true)}
                  className="text-[#6B7280] hover:text-[#408DFB] p-0.5 cursor-pointer"
                  title="Edit address"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-[#6B7280] leading-relaxed whitespace-pre-wrap font-mono">
                {customOrgAddress || companyProfile?.address || 'MC BUILDING\nBYPASS ROAD, KONDOTTY\nMALAPPURAM, Kerala\nIndia, 673638\n91-7510510947'}
              </p>
              <button
                type="button"
                onClick={() => setIsEditOrgAddressModalOpen(true)}
                className="text-[11px] text-[#408DFB] hover:underline font-medium cursor-pointer block pt-1"
              >
                Change destination to deliver
              </button>
            </div>
          )}

          {/* Customer Delivery Address Selection (Zoho Books Screenshot 2) */}
          {deliveryAddressType === 'CUSTOMER' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <select
                  value={deliveryCustomerId || ''}
                  onChange={(e) => setValue('deliveryCustomerId', e.target.value)}
                  className="flex-1 h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c: any) => {
                    const displayName = c.name || c.companyName || 'Unnamed Customer';
                    const extra = [c.companyName && c.companyName !== c.name ? c.companyName : null, c.phone].filter(Boolean).join(' - ');
                    return (
                      <option key={c.id} value={c.id}>
                        {displayName} {extra ? `(${extra})` : ''}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  title="Search & select customer"
                  onClick={() => {
                    setCustomerSearchTerm('');
                    setIsCustomerSearchOpen(true);
                  }}
                  className="h-8 w-8 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Exact Zoho Helper Notice */}
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Stock on Hand will not be affected only in case of dropshipments. Selecting the Customer option in the Deliver To field of a normal purchase order will have an effect on your stock level.
              </p>

              {/* Customer Address Details Card */}
              {selectedCustomer && (
                <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px] p-3 text-xs text-[#2B2F36] space-y-1">
                  <div className="font-semibold flex items-center justify-between">
                    <span>{selectedCustomer.name}</span>
                    {selectedCustomer.companyName && (
                      <span className="text-[11px] text-gray-500 font-normal">({selectedCustomer.companyName})</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6B7280] leading-relaxed whitespace-pre-wrap">
                    {selectedCustomer.address || selectedCustomer.shippingAddress || selectedCustomer.billingAddress || 'No primary street address registered'}
                  </p>
                  {selectedCustomer.phone && (
                    <p className="text-[11px] text-[#6B7280]">Phone: {selectedCustomer.phone}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCustomerSearchOpen(true)}
                    className="text-[11px] text-[#408DFB] hover:underline font-medium cursor-pointer block pt-1"
                  >
                    Change destination to deliver
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Order# + Reference# */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5 flex items-center justify-between">
            <span>Purchase Order# <span className="text-[#E54B4B]">*</span></span>
            {!isEditMode && (
              <button
                type="button"
                onClick={async () => {
                  const res = await apiClient.get('/purchase-orders/next-number').catch(() => ({ data: {} }));
                  if (res.data?.nextNumber) setValue('orderNo', res.data.nextNumber);
                }}
                className="text-[11px] text-[#408DFB] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Settings className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600" />
              </button>
            )}
          </label>
          <input
            type="text"
            {...register('orderNo')}
            placeholder="PO-00001"
            className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
          {errors.orderNo && <p className="text-[#E54B4B] text-[11px] mt-1">{errors.orderNo.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
            Reference#
          </label>
          <input
            type="text"
            {...register('referenceNo')}
            placeholder="Internal requisition or quote reference"
            className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
        </div>
      </div>

      {/* Order Date + Delivery Date & Payment Terms on same row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
            Date <span className="text-[#E54B4B]">*</span>
          </label>
          <input
            type="date"
            {...register('date')}
            onChange={(e) => {
              register('date').onChange(e);
              handlePaymentTermsChange(watch('paymentTerms'));
            }}
            className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[#2B2F36]">Delivery Date & Payment Terms</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              {...register('deliveryDate')}
              className="h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
            <select
              value={watch('paymentTerms')}
              onChange={(e) => handlePaymentTermsChange(e.target.value)}
              className="h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
            >
              {PAYMENT_TERMS_LIST.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Shipment Preference */}
      <div className="max-w-md">
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
          Shipment Preference
        </label>
        <select
          {...register('shipmentPreference')}
          className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
        >
          <option value="">Choose the shipment preference or type to add</option>
          {SHIPMENT_PREFERENCES.map((sp) => (
            <option key={sp} value={sp}>
              {sp}
            </option>
          ))}
        </select>
      </div>

      {/* Reverse Charge Checkbox */}
      <div className="pt-1">
        <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#2B2F36] select-none">
          <input
            type="checkbox"
            {...register('isRcm')}
            className="rounded border-[#CBD5E1] text-[#408DFB] focus:ring-0 cursor-pointer"
          />
          <span>This transaction is applicable for reverse charge</span>
        </label>
      </div>
    </div>
  );

  // Item Table
  const itemTable = (
    <ZohoItemTable
      items={zohoItems}
      onChange={handleZohoItemsChange}
      onAddItem={() => append({ productId: '', accountId: '', description: '', qty: 1, rate: 0, taxPercent: 18, discount: 0, unit: 'Pcs' })}
      onAddBulk={() => {
        setBulkSearchTerm('');
        setBulkSelectedMap({});
        setIsBulkItemsModalOpen(true);
      }}
      products={products}
      priceField="purchase"
      showAccountColumn={true}
      accountOptions={accounts.map((a: any) => ({ label: a.name || a.title, id: a.id }))}
      taxOptions={[
        { label: 'Non-Taxable (0%)', rate: 0, id: 'tax-0' },
        { label: 'GST (5%)', rate: 5, id: 'tax-5' },
        { label: 'GST (12%)', rate: 12, id: 'tax-12' },
        { label: 'GST (18%)', rate: 18, id: 'tax-18' },
        { label: 'GST (28%)', rate: 28, id: 'tax-28' },
      ]}
    />
  );

  // Totals Box with Zoho TDS / TCS Radio Toggle and Discount
  const totalsBox = (
    <ZohoTotalsBox
      subtotal={totals.subtotal}
      discount={discountVal}
      discountType={discountTypeVal}
      onDiscountChange={(val, type) => {
        setValue('discount', val);
        setValue('discountType', type);
      }}
      taxLines={[{ label: 'Tax Total', amount: totals.taxTotal }]}
      tdsTcsType={tdsTcsTypeVal}
      tdsTcsAmount={totals.tdsTcsAmount}
      tdsTcsRate={tdsTcsRateVal}
      selectedTaxId={tdsTcsTaxIdVal}
      onTdsTcsChange={(type, val, rate, taxId) => {
        setValue('tdsTcsType', type);
        setValue('tdsTcsRate', rate || 0);
        setValue('tdsTcsAmount', val || 0);
        setValue('tdsTcsTaxId', taxId || '');
      }}
      adjustment={adjustmentValue}
      onAdjustmentChange={(v) => setValue('adjustment', v)}
      roundOff={totals.roundOff}
      total={totals.grandTotal}
    />
  );

  // Notes, Terms & Attachments
  const notesAndTerms = (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
          Notes
        </label>
        <textarea
          rows={2}
          {...register('notes')}
          placeholder="Will be displayed on purchase order"
          className="w-full bg-white border border-[#CBD5E1] rounded-[4px] p-2.5 text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
        />
        <p className="text-[11px] text-[#6B7280] mt-0.5">Will be displayed on purchase order</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
          Terms & Conditions
        </label>
        <textarea
          rows={3}
          {...register('termsConditions')}
          placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
          className="w-full bg-white border border-[#CBD5E1] rounded-[4px] p-2.5 text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
          Attach File(s) to Purchase Order
        </label>
        <ZohoAttachmentUploader
          files={attachedFiles}
          onUpload={(files) => {
            if (!files) return;
            const newFiles = Array.from(files).map((f) => ({ name: f.name, size: f.size, type: f.type }));
            setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 10));
          }}
          onRemove={(idx) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
          maxFiles={10}
          maxSizeMB={10}
        />
      </div>

      <p className="text-[11px] text-gray-500 pt-1">
        Additional Fields: Start adding custom fields for your purchase orders by going to{' '}
        <span className="text-[#408DFB] hover:underline cursor-pointer" onClick={() => navigate('/settings')}>
          Settings → Purchases → Purchase Orders
        </span>.
      </p>
    </div>
  );

  const footer = (
    <ZohoFormFooter
      primaryActions={[
        {
          label: isEditMode ? 'Update Order' : 'Save and Send',
          onClick: () => {
            setSubmitStatus('SENT');
            handleSubmit((data) => submitFormWithStatus(data, 'SENT'))();
          },
          loading: isSubmitting && submitStatus === 'SENT',
          disabled: isSubmitting,
        },
      ]}
      secondaryActions={[
        {
          label: 'Save as Draft',
          onClick: () => {
            setSubmitStatus('DRAFT');
            handleSubmit((data) => submitFormWithStatus(data, 'DRAFT'))();
          },
          loading: isSubmitting && submitStatus === 'DRAFT',
          disabled: isSubmitting,
        },
        {
          label: 'Cancel',
          onClick: () => navigate('/purchase-orders'),
        },
      ]}
      templateName="Standard Template"
      onChangeTemplate={() => notification.info('Standard Template configured for Purchase Orders')}
      totalSummary={{
        totalAmount: totals.grandTotal,
        totalQuantity: totals.totalQty,
      }}
    />
  );

  return (
    <>
      <ZohoTransactionForm
        title={isEditMode ? 'Edit Purchase Order' : 'New Purchase Order'}
        icon={ShoppingBag}
        onClose={() => navigate('/purchase-orders')}
        onSettings={() => notification.info('Purchase Order sequence and preferences')}
        headerBand={headerBand}
        fieldsGrid={fieldsGrid}
        itemTable={itemTable}
        totalsBox={totalsBox}
        notesAndTerms={notesAndTerms}
        footer={footer}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit)();
        }}
      />

      {/* 1. Vendor Search Modal */}
      <ZohoModal
        isOpen={isVendorSearchOpen}
        onClose={() => {
          setIsVendorSearchOpen(false);
          setVendorSearchTerm('');
        }}
        title="Select Vendor"
        maxWidth="max-w-xl"
        secondaryAction={{
          label: 'Cancel',
          onClick: () => {
            setIsVendorSearchOpen(false);
            setVendorSearchTerm('');
          },
        }}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={vendorSearchTerm}
              onChange={(e) => setVendorSearchTerm(e.target.value)}
              placeholder="Search vendor by name, company, GSTIN, phone..."
              className="w-full h-9 pl-9 pr-8 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              autoFocus
            />
            {vendorSearchTerm && (
              <button
                type="button"
                onClick={() => setVendorSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-[4px] divide-y divide-gray-100 max-h-72 overflow-y-auto bg-white">
            {filteredVendors.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                {vendorSearchTerm ? `No vendors match "${vendorSearchTerm}"` : 'No vendors found'}
              </div>
            ) : (
              filteredVendors.map((v: any) => {
                const isSelected = v.id === vendorId;
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      handleVendorSelect(v.id);
                      setIsVendorSearchOpen(false);
                      setVendorSearchTerm('');
                    }}
                    className={cn(
                      'p-3 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors',
                      isSelected && 'bg-blue-50/90'
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#2B2F36]">
                          {v.name || v.companyName || 'Unnamed Vendor'}
                        </span>
                        {v.companyName && v.companyName !== v.name && (
                          <span className="text-[11px] text-gray-500">({v.companyName})</span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        {v.gstin && (
                          <span>
                            GSTIN: <span className="font-mono text-gray-700">{v.gstin}</span>
                          </span>
                        )}
                        {v.phone && <span>Phone: {v.phone}</span>}
                        {(v.state || v.placeOfSupply) && (
                          <span>State: {v.state || v.placeOfSupply}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 pl-3">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <span className="text-xs text-blue-600 font-medium hover:text-blue-800">
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
            <span>
              Showing {filteredVendors.length} of {vendors.length} vendors
            </span>
            <div className="flex items-center gap-3">
              {vendorId && (
                <button
                  type="button"
                  onClick={() => {
                    handleVendorSelect('');
                    setIsVendorSearchOpen(false);
                  }}
                  className="text-red-600 hover:text-red-800 underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
              <a
                href="/vendors/new"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                + New Vendor
              </a>
            </div>
          </div>
        </div>
      </ZohoModal>

      {/* 2. Customer Search Modal */}
      <ZohoModal
        isOpen={isCustomerSearchOpen}
        onClose={() => {
          setIsCustomerSearchOpen(false);
          setCustomerSearchTerm('');
        }}
        title="Select Customer"
        maxWidth="max-w-xl"
        secondaryAction={{
          label: 'Cancel',
          onClick: () => {
            setIsCustomerSearchOpen(false);
            setCustomerSearchTerm('');
          },
        }}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={customerSearchTerm}
              onChange={(e) => setCustomerSearchTerm(e.target.value)}
              placeholder="Search customer by name, company, phone, email, GSTIN..."
              className="w-full h-9 pl-9 pr-8 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              autoFocus
            />
            {customerSearchTerm && (
              <button
                type="button"
                onClick={() => setCustomerSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-[4px] divide-y divide-gray-100 max-h-72 overflow-y-auto bg-white">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                {customerSearchTerm ? `No customers match "${customerSearchTerm}"` : 'No customers found'}
              </div>
            ) : (
              filteredCustomers.map((c: any) => {
                const isSelected = c.id === deliveryCustomerId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setValue('deliveryCustomerId', c.id);
                      setIsCustomerSearchOpen(false);
                      setCustomerSearchTerm('');
                    }}
                    className={cn(
                      'p-3 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors',
                      isSelected && 'bg-blue-50/90'
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#2B2F36]">
                          {c.name || c.companyName || 'Unnamed Customer'}
                        </span>
                        {c.companyName && c.companyName !== c.name && (
                          <span className="text-[11px] text-gray-500">({c.companyName})</span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        {c.gstin && (
                          <span>
                            GSTIN: <span className="font-mono text-gray-700">{c.gstin}</span>
                          </span>
                        )}
                        {c.phone && <span>Phone: {c.phone}</span>}
                        {c.email && <span>Email: {c.email}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 pl-3">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <span className="text-xs text-blue-600 font-medium hover:text-blue-800">
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
            <span>
              Showing {filteredCustomers.length} of {customers.length} customers
            </span>
            <div className="flex items-center gap-3">
              {deliveryCustomerId && (
                <button
                  type="button"
                  onClick={() => {
                    setValue('deliveryCustomerId', '');
                    setIsCustomerSearchOpen(false);
                  }}
                  className="text-red-600 hover:text-red-800 underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
              <a
                href="/crm/customers/new"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                + New Customer
              </a>
            </div>
          </div>
        </div>
      </ZohoModal>

      {/* 3. Bulk Items Modal */}
      <ZohoModal
        isOpen={isBulkItemsModalOpen}
        onClose={() => setIsBulkItemsModalOpen(false)}
        title="Add Items in Bulk"
        maxWidth="max-w-2xl"
        primaryAction={{
          label: 'Add to Purchase Order',
          onClick: handleBulkAddConfirm,
          disabled: Object.values(bulkSelectedMap).filter((q) => q > 0).length === 0,
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsBulkItemsModalOpen(false),
        }}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={bulkSearchTerm}
              onChange={(e) => setBulkSearchTerm(e.target.value)}
              placeholder="Search items by name, SKU or code..."
              className="w-full h-9 pl-9 pr-8 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              autoFocus
            />
            {bulkSearchTerm && (
              <button
                type="button"
                onClick={() => setBulkSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-[4px] divide-y divide-gray-100 max-h-80 overflow-y-auto bg-white">
            {filteredBulkProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">No products match your search</div>
            ) : (
              filteredBulkProducts.map((p: any) => {
                const qty = bulkSelectedMap[p.id] || 0;
                const isSelected = qty > 0;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'p-2.5 flex items-center justify-between gap-3 text-xs transition-colors',
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50'
                    )}
                  >
                    <label className="flex items-center gap-3 flex-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          setBulkSelectedMap((prev) => ({
                            ...prev,
                            [p.id]: e.target.checked ? (prev[p.id] || 1) : 0,
                          }));
                        }}
                        className="rounded border-[#CBD5E1] text-[#408DFB] focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-[#2B2F36]">{p.name}</div>
                        <div className="text-[11px] text-gray-500">
                          Price: ₹{Number(p.costPrice || p.purchasePrice || p.price || 0).toFixed(2)} | Unit: {p.unit || 'Pcs'}
                          {p.sku && ` | SKU: ${p.sku}`}
                        </div>
                      </div>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={qty || 1}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setBulkSelectedMap((prev) => ({
                            ...prev,
                            [p.id]: val,
                          }));
                        }}
                        disabled={!isSelected}
                        className="w-16 h-7 px-2 border border-gray-300 rounded-[4px] text-right text-xs bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="text-[11px] text-gray-500 flex items-center justify-between">
            <span>
              {Object.values(bulkSelectedMap).filter((q) => q > 0).length} product(s) selected
            </span>
          </div>
        </div>
      </ZohoModal>

      {/* 4. Edit Organization Delivery Address Modal */}
      <ZohoModal
        isOpen={isEditOrgAddressModalOpen}
        onClose={() => setIsEditOrgAddressModalOpen(false)}
        title="Edit Delivery Address"
        maxWidth="max-w-md"
        primaryAction={{
          label: 'Apply to this Order',
          onClick: () => setIsEditOrgAddressModalOpen(false),
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsEditOrgAddressModalOpen(false),
        }}
      >
        <div className="space-y-3">
          <p className="text-[11px] text-gray-600">
            Specify the delivery destination address for this purchase order:
          </p>
          <textarea
            rows={5}
            value={customOrgAddress}
            onChange={(e) => setCustomOrgAddress(e.target.value)}
            className="w-full bg-white border border-[#CBD5E1] rounded-[4px] p-2.5 text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] font-mono leading-relaxed"
            placeholder="Address Line 1&#10;City, State, PIN&#10;Phone Number"
          />
        </div>
      </ZohoModal>
    </>
  );
};

export default PurchaseOrderForm;
