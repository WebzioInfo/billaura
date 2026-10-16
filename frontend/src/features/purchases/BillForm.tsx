import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Receipt,
  FileText,
  X,
  Search,
  Plus,
  Building2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Check,
} from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import {
  ZohoTransactionForm,
  ZohoItemTable,
  ZohoTotalsBox,
  ZohoFormFooter,
  ZohoAttachmentUploader,
  ZohoItemRow,
  AttachmentFile,
  ZohoModal,
} from '@/shared/components/zoho';
import { PageLoader } from '@/shared/components/ui';

const billItemSchema = z.object({
  productId: z.string().optional(),
  accountId: z.string().optional(),
  customerId: z.string().optional(),
  description: z.string().optional(),
  qty: z.coerce.number().min(0.0001, 'Qty must be > 0'),
  rate: z.coerce.number().min(0, 'Rate must be >= 0'),
  taxPercent: z.coerce.number().min(0).default(18),
  discount: z.coerce.number().min(0).default(0),
  unit: z.string().optional(),
});

const billSchema = z.object({
  vendorId: z.string().min(1, 'Vendor Name is required'),
  billNumber: z.string().min(1, 'Bill# is required'),
  orderNumber: z.string().optional(),
  date: z.string().min(1, 'Bill Date is required'),
  dueDate: z.string().optional(),
  paymentTerms: z.string().default('Due on Receipt'),
  isRcm: z.boolean().default(false),
  subject: z.string().max(250, 'Enter a subject within 250 characters').optional(),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  discount: z.coerce.number().default(0),
  discountType: z.enum(['%', 'amount']).default('%'),
  adjustment: z.coerce.number().default(0),
  tdsTcsType: z.enum(['NONE', 'TDS', 'TCS']).default('NONE'),
  tdsTcsRate: z.coerce.number().default(0),
  tdsTcsAmount: z.coerce.number().default(0),
  tdsTcsTaxId: z.string().optional(),
  items: z.array(billItemSchema).min(1, 'At least one line item is required'),
});

type BillFormValues = z.infer<typeof billSchema>;

export const BillForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'DRAFT' | 'OPEN'>('OPEN');
  const [attachedFiles, setAttachedFiles] = useState<AttachmentFile[]>([]);

  // Modals state
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  const [isCreateTermModalOpen, setIsCreateTermModalOpen] = useState(false);
  const [newTermName, setNewTermName] = useState('');
  const [newTermDays, setNewTermDays] = useState<number | ''>('');
  const [isCreatingTerm, setIsCreatingTerm] = useState(false);

  const [isBulkItemsModalOpen, setIsBulkItemsModalOpen] = useState(false);
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  const [bulkSelectedMap, setBulkSelectedMap] = useState<Record<string, number>>({});

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billSchema) as any,
    defaultValues: {
      vendorId: '',
      billNumber: '',
      orderNumber: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      paymentTerms: 'Due on Receipt',
      isRcm: false,
      subject: '',
      notes: '',
      termsConditions: '',
      discount: 0,
      discountType: '%',
      adjustment: 0,
      tdsTcsType: 'NONE',
      tdsTcsRate: 0,
      tdsTcsAmount: 0,
      items: [
        {
          productId: '',
          accountId: '',
          customerId: '',
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

  // 1. Master Data Queries
  const { data: vendorsData, isLoading: loadingVendors } = useQuery<any>({
    queryKey: ['vendors'],
    queryFn: () => apiClient.get('/vendors'),
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

  const { data: customersData } = useQuery<any>({
    queryKey: ['customers'],
    queryFn: () => apiClient.get('/customers').catch(() => ({ data: [] })),
    staleTime: 5 * 60 * 1000,
  });

  const { data: nextNoData } = useQuery<any>({
    queryKey: ['bills', 'next-number'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/purchases/next-number');
        return res?.data?.data || res?.data || res;
      } catch (_) {
        return { nextNumber: `BILL-${Date.now().toString().slice(-5)}` };
      }
    },
    staleTime: 0,
  });

  const { data: paymentTermsData = [] } = useQuery<Array<{ name: string; days: number }>>({
    queryKey: ['purchases', 'payment-terms'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/purchases/payment-terms');
        const data = res?.data?.data || res?.data || [];
        return Array.isArray(data) ? data : [];
      } catch (_) {
        return [
          { name: 'Due on Receipt', days: 0 },
          { name: 'Net 15', days: 15 },
          { name: 'Net 30', days: 30 },
          { name: 'Net 45', days: 45 },
          { name: 'Net 60', days: 60 },
          { name: 'Due end of the month', days: 30 },
          { name: 'Due end of next month', days: 60 },
        ];
      }
    },
  });

  const { data: taxRatesData = [] } = useQuery<any[]>({
    queryKey: ['tax-rates'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/accounting/tax-rates');
        const data = res?.data?.data || res?.data || [];
        return Array.isArray(data) ? data : [];
      } catch (_) {
        return [];
      }
    },
  });

  // Edit Data Query
  const { data: existingBill, isLoading: loadingExisting } = useQuery<any>({
    queryKey: ['bill-edit', editId],
    queryFn: async () => {
      if (!editId) return null;
      const res = await apiClient.get(`/purchases/${editId}`);
      return res?.data?.data || res?.data || res;
    },
    enabled: isEditMode,
  });

  // Source Purchase Order Query if converting
  const poIdParam = searchParams.get('poId');
  const { data: sourcePo } = useQuery<any>({
    queryKey: ['purchase-order-source', poIdParam],
    queryFn: async () => {
      if (!poIdParam) return null;
      const res = await apiClient.get(`/purchase-orders/${poIdParam}`);
      return res?.data?.data || res?.data || null;
    },
    enabled: !!poIdParam && !isEditMode,
  });

  const vendors = useMemo(() => ensureArray(vendorsData), [vendorsData]);
  const products = useMemo(() => ensureArray(productsData), [productsData]);
  const accounts = useMemo(() => ensureArray(accountsData), [accountsData]);
  const customers = useMemo(() => ensureArray(customersData), [customersData]);

  const vendorId = watch('vendorId');
  const selectedVendor = useMemo(() => {
    return vendors.find((v: any) => v.id === vendorId);
  }, [vendorId, vendors]);

  // Load Purchase Orders for this Vendor
  const { data: vendorPOs = [] } = useQuery<any[]>({
    queryKey: ['purchase-orders', 'by-vendor', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      try {
        const res = await apiClient.get('/purchase-orders', { params: { vendorId } });
        const list = res?.data?.data || res?.data || [];
        return Array.isArray(list) ? list : [];
      } catch (_) {
        return [];
      }
    },
    enabled: !!vendorId,
  });

  // Next bill sequence assignment
  useEffect(() => {
    if (!isEditMode && nextNoData?.nextNumber && !watch('billNumber')) {
      setValue('billNumber', nextNoData.nextNumber);
    }
  }, [nextNoData, isEditMode, setValue, watch]);

  // Pre-populate if editing
  useEffect(() => {
    if (isEditMode && existingBill) {
      if (existingBill.vendorId || existingBill.businessPartnerId) {
        setValue('vendorId', existingBill.vendorId || existingBill.businessPartnerId);
      }
      if (existingBill.purchaseNo) setValue('billNumber', existingBill.purchaseNo);
      if (existingBill.orderNumber || existingBill.reference) {
        setValue('orderNumber', existingBill.orderNumber || existingBill.reference);
      }
      if (existingBill.date) setValue('date', new Date(existingBill.date).toISOString().split('T')[0]);
      if (existingBill.dueDate) setValue('dueDate', new Date(existingBill.dueDate).toISOString().split('T')[0]);
      if (existingBill.paymentTerms) setValue('paymentTerms', existingBill.paymentTerms);
      if (existingBill.isRcm !== undefined) setValue('isRcm', Boolean(existingBill.isRcm));
      if (existingBill.subject) setValue('subject', existingBill.subject);
      if (existingBill.notes) setValue('notes', existingBill.notes);
      if (existingBill.termsConditions) setValue('termsConditions', existingBill.termsConditions);
      if (existingBill.adjustment !== undefined) setValue('adjustment', Number(existingBill.adjustment));
      if (existingBill.tdsTcsType) setValue('tdsTcsType', existingBill.tdsTcsType);
      if (existingBill.tdsTcsRate) setValue('tdsTcsRate', Number(existingBill.tdsTcsRate));
      if (existingBill.tdsTcsAmount) setValue('tdsTcsAmount', Number(existingBill.tdsTcsAmount));

      if (Array.isArray(existingBill.items) && existingBill.items.length > 0) {
        setValue(
          'items',
          existingBill.items.map((it: any) => ({
            productId: it.productId || '',
            accountId: it.accountId || '',
            customerId: it.customerId || '',
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
  }, [isEditMode, existingBill, setValue]);

  // Pre-populate if converting from Purchase Order
  useEffect(() => {
    if (sourcePo && !isEditMode) {
      if (sourcePo.businessPartnerId) {
        setValue('vendorId', sourcePo.businessPartnerId, { shouldValidate: true });
      }
      if (sourcePo.orderNo) {
        setValue('orderNumber', sourcePo.orderNo);
      }
      if (sourcePo.paymentTerms) {
        handlePaymentTermsChange(sourcePo.paymentTerms);
      }
      if (sourcePo.notes) {
        setValue('notes', sourcePo.notes);
      }
      if (sourcePo.termsConditions) {
        setValue('termsConditions', sourcePo.termsConditions);
      }
      if (sourcePo.isRcm !== undefined) {
        setValue('isRcm', Boolean(sourcePo.isRcm));
      }
      if (Array.isArray(sourcePo.items) && sourcePo.items.length > 0) {
        const poMapped = sourcePo.items.map((it: any) => ({
          productId: it.productId || '',
          accountId: it.accountId || '',
          customerId: '',
          description: it.description || it.product?.name || '',
          qty: Number(it.qty || it.quantity || 1),
          rate: Number(it.rate || it.unitPrice || 0),
          taxPercent: Number(it.taxPercent || it.taxRate || 18),
          discount: Number(it.discount || 0),
          unit: it.unit || 'Pcs',
        }));
        setValue('items', poMapped, { shouldValidate: true, shouldDirty: true });
      }
      notification.success(`Loaded Purchase Order ${sourcePo.orderNo} into Bill`);
    }
  }, [sourcePo, isEditMode]);

  // Handle vendor select
  const handleVendorSelect = (selectedId: string) => {
    setValue('vendorId', selectedId, { shouldValidate: true });
    setValue('orderNumber', ''); // reset PO link on vendor change
    const found = vendors.find((v: any) => v.id === selectedId);
    if (found?.paymentTerms) {
      handlePaymentTermsChange(found.paymentTerms);
    }
  };

  // Payment terms and due date recalculation
  const handlePaymentTermsChange = (term: string) => {
    setValue('paymentTerms', term);
    const d = watch('date') ? new Date(watch('date')) : new Date();
    if (isNaN(d.getTime())) return;
    const opt = paymentTermsData.find((o) => o.name === term);
    const daysToAdd = opt ? opt.days : 0;
    d.setDate(d.getDate() + daysToAdd);
    setValue('dueDate', d.toISOString().split('T')[0]);
  };

  // Recalculate due date when Bill Date changes
  const handleDateChange = (newDateStr: string) => {
    setValue('date', newDateStr);
    const d = new Date(newDateStr);
    if (isNaN(d.getTime())) return;
    const curTerm = watch('paymentTerms');
    const opt = paymentTermsData.find((o) => o.name === curTerm);
    const daysToAdd = opt ? opt.days : 0;
    d.setDate(d.getDate() + daysToAdd);
    setValue('dueDate', d.toISOString().split('T')[0]);
  };

  // Link selected Purchase Order
  const handlePurchaseOrderSelect = async (poNumber: string) => {
    setValue('orderNumber', poNumber);
    if (!poNumber) return;

    const po = vendorPOs.find((p: any) => (p.orderNo || p.purchaseNo) === poNumber);
    if (po) {
      if (po.paymentTerms) handlePaymentTermsChange(po.paymentTerms);
      if (po.notes && !watch('notes')) setValue('notes', po.notes);

      // Fetch full PO with line items
      try {
        const fullRes = await apiClient.get(`/purchase-orders/${po.id}`);
        const fullPo = fullRes?.data?.data || fullRes?.data || po;
        if (Array.isArray(fullPo.items) && fullPo.items.length > 0) {
          const poMappedItems = fullPo.items.map((it: any) => ({
            productId: it.productId || '',
            accountId: it.accountId || '',
            customerId: '',
            description: it.description || it.product?.name || '',
            qty: Number(it.qty || it.quantity || 1),
            rate: Number(it.rate || it.unitPrice || 0),
            taxPercent: Number(it.taxPercent || it.taxRate || 18),
            discount: Number(it.discount || 0),
            unit: it.unit || 'Pcs',
          }));
          setValue('items', poMappedItems, { shouldValidate: true, shouldDirty: true });
          notification.success(`Loaded ${poMappedItems.length} item(s) from Purchase Order ${poNumber}`);
        }
      } catch (_) {
        notification.info(`Linked Purchase Order ${poNumber}`);
      }
    }
  };

  // Create New Payment Term Modal submission
  const handleSavePaymentTerm = async () => {
    if (!newTermName.trim()) {
      notification.warning('Please enter a term name');
      return;
    }
    const daysNum = Number(newTermDays);
    if (isNaN(daysNum) || daysNum < 0) {
      notification.warning('Please enter a valid number of days');
      return;
    }

    setIsCreatingTerm(true);
    try {
      await apiClient.post('/purchases/payment-terms', {
        termName: newTermName.trim(),
        dueAfter: daysNum,
      });
      await queryClient.invalidateQueries({ queryKey: ['purchases', 'payment-terms'] });
      notification.success(`Payment Term "${newTermName.trim()}" created successfully`);
      handlePaymentTermsChange(newTermName.trim());
      setNewTermName('');
      setNewTermDays('');
      setIsCreateTermModalOpen(false);
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to save payment term');
    } finally {
      setIsCreatingTerm(false);
    }
  };

  // Watch fields for calculations
  const items = useWatch({ control, name: 'items' }) || [];
  const adjustmentValue = watch('adjustment') || 0;
  const discountVal = watch('discount') || 0;
  const discountTypeVal = watch('discountType') || '%';
  const tdsTcsTypeVal = watch('tdsTcsType') || 'NONE';
  const tdsTcsRateVal = watch('tdsTcsRate') || 0;

  // Real live monetary calculations
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
      const lineDisc = lineTotal * (disc / 100);
      const taxable = Math.max(0, lineTotal - lineDisc);
      const lineTax = (taxable * taxRate) / 100;

      subtotal += taxable;
      lineDiscountTotal += lineDisc;
      taxTotal += lineTax;
      totalQty += qty;
    });

    let txnDiscountAmount = 0;
    if (discountVal > 0) {
      if (discountTypeVal === '%') {
        txnDiscountAmount = (subtotal * discountVal) / 100;
      } else {
        txnDiscountAmount = Math.min(subtotal, discountVal);
      }
    }

    const netTaxable = Math.max(0, subtotal - txnDiscountAmount);

    let tdsTcsAmt = 0;
    if (tdsTcsTypeVal !== 'NONE' && tdsTcsRateVal > 0) {
      tdsTcsAmt = Number(((netTaxable * tdsTcsRateVal) / 100).toFixed(2));
    }

    let exactGrandTotal = netTaxable + taxTotal + Number(adjustmentValue || 0);
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
        customerId: it.customerId,
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
        customerId: row.customerId || '',
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

  const handleAddItem = () => {
    append({
      productId: '',
      accountId: '',
      customerId: '',
      description: '',
      qty: 1,
      rate: 0,
      taxPercent: 18,
      discount: 0,
      unit: 'Pcs',
    });
  };

  // Add items in bulk logic
  const handleBulkAddConfirm = () => {
    const selectedIds = Object.keys(bulkSelectedMap).filter((id) => bulkSelectedMap[id] > 0);
    if (selectedIds.length === 0) {
      notification.warning('Please select at least one item');
      return;
    }

    const currentItems = [...items];
    const cleanItems = currentItems.length === 1 && !currentItems[0].productId && !currentItems[0].description
      ? []
      : currentItems;

    selectedIds.forEach((prodId) => {
      const prod = products.find((p: any) => p.id === prodId);
      if (prod) {
        cleanItems.push({
          productId: prod.id,
          accountId: '',
          customerId: '',
          description: prod.name || prod.description || '',
          qty: bulkSelectedMap[prodId] || 1,
          rate: Number(prod.purchasePrice || prod.costPrice || prod.price || 0),
          taxPercent: Number(prod.taxRate || prod.gstRate || 18),
          discount: 0,
          unit: prod.unit || 'Pcs',
        });
      }
    });

    setValue('items', cleanItems, { shouldValidate: true, shouldDirty: true });
    setBulkSelectedMap({});
    setIsBulkItemsModalOpen(false);
    notification.success(`Added ${selectedIds.length} item(s) to bill`);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const newFiles: AttachmentFile[] = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    notification.success(`${newFiles.length} file(s) attached`);
  };

  // Submit Handler
  const onSubmit = async (data: BillFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        vendorId: data.vendorId,
        purchaseNo: data.billNumber.trim(),
        orderNumber: data.orderNumber || undefined,
        reference: data.orderNumber || undefined,
        date: new Date(data.date).toISOString(),
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        paymentTerms: data.paymentTerms,
        isRcm: data.isRcm,
        subject: data.subject || undefined,
        notes: data.notes || undefined,
        termsConditions: data.termsConditions || undefined,
        status: submitStatus === 'DRAFT' ? 'DRAFT' : 'OPEN',
        discount: data.discount,
        discountType: data.discountType,
        discountAmount: totals.txnDiscountAmount,
        adjustment: data.adjustment,
        tdsTcsType: data.tdsTcsType,
        tdsTcsRate: data.tdsTcsRate,
        tdsTcsAmount: totals.tdsTcsAmount,
        tdsTcsTaxId: data.tdsTcsTaxId,
        attachedFiles,
        items: data.items.map((it) => ({
          productId: it.productId || undefined,
          accountId: it.accountId || undefined,
          customerId: it.customerId || undefined,
          description: it.description || '',
          qty: Number(it.qty),
          rate: Number(it.rate),
          taxPercent: Number(it.taxPercent),
          discount: Number(it.discount),
          unit: it.unit || 'Pcs',
        })),
      };

      if (isEditMode) {
        await apiClient.put(`/purchases/${editId}`, payload);
        notification.success('Bill updated successfully');
      } else {
        await apiClient.post('/purchases', payload);
        notification.success(submitStatus === 'DRAFT' ? 'Bill draft saved' : 'Bill created and posted successfully');
      }

      await erpInvalidate.purchaseBill(queryClient, { vendorId: data.vendorId });
      navigate('/bills');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to save bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingVendors || loadingProducts || (isEditMode && loadingExisting)) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <PageLoader title="Loading Bill Form..." description="Fetching vendors, items, and ledger accounts..." />
      </div>
    );
  }

  // Header Band: Vendor Selection with blue search button & live vendor profile
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

          {/* Blue Search Button [🔍] opening Vendor Search Modal */}
          <button
            type="button"
            onClick={() => setIsVendorModalOpen(true)}
            className="w-8 h-8 flex items-center justify-center bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] transition-colors shrink-0 cursor-pointer shadow-sm"
            title="Search Vendor"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {errors.vendorId && (
        <p className="text-[#E54B4B] text-[11px] sm:ml-40">{errors.vendorId.message}</p>
      )}

      {/* Dynamic Vendor Profile Badge */}
      {selectedVendor && (
        <div className="sm:ml-40 bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px] p-3 max-w-lg space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#2B2F36]">{selectedVendor.name || selectedVendor.companyName}</span>
            {(selectedVendor.gstin || selectedVendor.gstNumber) && (
              <span className="px-1.5 py-0.5 bg-[#EFF6FF] text-[#408DFB] text-[10px] font-mono font-medium rounded border border-[#BFDBFE]">
                GSTIN: {selectedVendor.gstin || selectedVendor.gstNumber}
              </span>
            )}
          </div>
          {(selectedVendor.phone || selectedVendor.email) && (
            <p className="text-[11px] text-[#6B7280]">
              {[selectedVendor.phone, selectedVendor.email].filter(Boolean).join(' • ')}
            </p>
          )}
          {(selectedVendor.billingAddress || selectedVendor.address) && (
            <p className="text-[11px] text-[#4B5563] line-clamp-2">
              {selectedVendor.billingAddress || selectedVendor.address}
            </p>
          )}
          {selectedVendor.paymentTerms && (
            <p className="text-[10px] text-[#2563EB] font-medium pt-0.5">
              Default Payment Terms: {selectedVendor.paymentTerms}
            </p>
          )}
        </div>
      )}
    </div>
  );

  // Form Fields Grid
  const fieldsGrid = (
    <div className="space-y-4">
      {/* Row 1: Bill# + Order Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
            Bill# <span className="text-[#E54B4B]">*</span>
          </label>
          <input
            type="text"
            {...register('billNumber')}
            placeholder="e.g. C 1373/26-27 or BILL-00001"
            className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
          {errors.billNumber && <p className="text-[#E54B4B] text-[11px] mt-1">{errors.billNumber.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
            Order Number
          </label>
          {vendorPOs.length > 0 ? (
            <select
              value={watch('orderNumber') || ''}
              onChange={(e) => handlePurchaseOrderSelect(e.target.value)}
              className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
            >
              <option value="">Select or type Order Number</option>
              {vendorPOs.map((p: any) => (
                <option key={p.id} value={p.orderNo || p.purchaseNo}>
                  {p.orderNo || p.purchaseNo} ({new Date(p.date).toLocaleDateString('en-GB')} - ₹{Number(p.grandTotal || 0).toFixed(2)})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              {...register('orderNumber')}
              placeholder="PO-00001"
              className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          )}
        </div>
      </div>

      {/* Row 2: Bill Date + Due Date & Payment Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
            Bill Date <span className="text-[#E54B4B]">*</span>
          </label>
          <input
            type="date"
            value={watch('date')}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
          {errors.date && <p className="text-[#E54B4B] text-[11px] mt-1">{errors.date.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[#2B2F36]">Due Date & Terms</label>
            <span className="text-[11px] text-[#6B7280]">Due: {watch('dueDate') || '-'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              {...register('dueDate')}
              className="h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
            <div className="flex items-center gap-1">
              <select
                value={watch('paymentTerms')}
                onChange={(e) => {
                  if (e.target.value === '__NEW_TERM__') {
                    setIsCreateTermModalOpen(true);
                  } else {
                    handlePaymentTermsChange(e.target.value);
                  }
                }}
                className="flex-1 h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
              >
                {paymentTermsData.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
                <option value="__NEW_TERM__" className="text-[#408DFB] font-semibold">
                  + Configure Terms
                </option>
              </select>
              <button
                type="button"
                onClick={() => setIsCreateTermModalOpen(true)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-[#CBD5E1] rounded-[4px] text-[#4B5563] cursor-pointer shrink-0"
                title="Create New Payment Term"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkbox: Reverse Charge */}
      <div className="pt-1">
        <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#2B2F36]">
          <input
            type="checkbox"
            {...register('isRcm')}
            className="rounded border-[#CBD5E1] text-[#408DFB] focus:ring-0 cursor-pointer"
          />
          <span>This transaction is applicable for reverse charge</span>
        </label>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
          Subject
        </label>
        <textarea
          rows={2}
          {...register('subject')}
          placeholder="Enter a subject within 250 characters"
          maxLength={250}
          className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
        />
      </div>
    </div>
  );

  // Item Table
  const itemTable = (
    <ZohoItemTable
      items={zohoItems}
      onChange={handleZohoItemsChange}
      onAddItem={handleAddItem}
      onAddLandedCost={() => notification.info('Add Landed Cost allocations')}
      onAddBulk={() => {
        setBulkSearchQuery('');
        setBulkSelectedMap({});
        setIsBulkItemsModalOpen(true);
      }}
      products={products}
      priceField="purchase"
      showAccountColumn={true}
      showCustomerColumn={true}
      accountOptions={accounts.map((a: any) => ({ label: a.name || a.title, id: a.id }))}
      customerOptions={customers.map((c: any) => ({ label: c.name, id: c.id }))}
      taxOptions={[
        { label: 'Non-Taxable (0%)', rate: 0, id: 'tax-0' },
        { label: 'GST (5%)', rate: 5, id: 'tax-5' },
        { label: 'GST (12%)', rate: 12, id: 'tax-12' },
        { label: 'GST (18%)', rate: 18, id: 'tax-18' },
        { label: 'GST (28%)', rate: 28, id: 'tax-28' },
      ]}
    />
  );

  // Totals Box with live TDS / TCS radio options and tax dropdown
  const totalsBox = (
    <ZohoTotalsBox
      subtotal={totals.subtotal}
      discount={discountVal}
      discountType={discountTypeVal}
      onDiscountChange={(val, type) => {
        setValue('discount', val);
        setValue('discountType', type);
      }}
      taxLines={[{ label: 'Taxes (GST)', amount: totals.taxTotal }]}
      tdsTcsType={tdsTcsTypeVal}
      tdsTcsRate={tdsTcsRateVal}
      tdsTcsAmount={totals.tdsTcsAmount}
      selectedTaxId={watch('tdsTcsTaxId')}
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

  // Notes & Attachments
  const notesAndTerms = (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
          Notes
        </label>
        <textarea
          rows={3}
          {...register('notes')}
          placeholder="It will not be shown in PDF"
          className="w-full bg-white border border-[#CBD5E1] rounded-[4px] p-2.5 text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
        />
        <p className="text-[11px] text-[#6B7280] mt-0.5">It will not be shown in PDF</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
          Attach File(s) to Bill
        </label>
        <ZohoAttachmentUploader
          files={attachedFiles}
          onUpload={handleFileUpload}
          onRemove={(idx) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
          maxFiles={5}
          maxSizeMB={10}
        />
      </div>
    </div>
  );

  // Footer Actions
  const footer = (
    <ZohoFormFooter
      primaryActions={[
        {
          label: isEditMode ? 'Update Bill' : 'Save as Open',
          onClick: () => {
            setSubmitStatus('OPEN');
            handleSubmit(onSubmit)();
          },
          loading: isSubmitting && submitStatus === 'OPEN',
          disabled: isSubmitting,
        },
      ]}
      secondaryActions={[
        {
          label: 'Save as Draft',
          onClick: () => {
            setSubmitStatus('DRAFT');
            handleSubmit(onSubmit)();
          },
          disabled: isSubmitting,
        },
        {
          label: 'Cancel',
          onClick: () => navigate('/bills'),
        },
      ]}
      templateName="Standard Template"
      onChangeTemplate={() => notification.info('Standard Template configured')}
      totalSummary={{
        totalAmount: totals.grandTotal,
        totalQuantity: totals.totalQty,
      }}
    />
  );

  // Filtered vendors for modal
  const filteredVendors = useMemo(() => {
    if (!vendorSearchQuery.trim()) return vendors;
    const q = vendorSearchQuery.toLowerCase();
    return vendors.filter((v: any) => {
      const name = (v.name || v.companyName || '').toLowerCase();
      const email = (v.email || '').toLowerCase();
      const phone = (v.phone || '').toLowerCase();
      const gstin = (v.gstin || v.gstNumber || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || gstin.includes(q);
    });
  }, [vendors, vendorSearchQuery]);

  // Filtered products for bulk modal
  const filteredProducts = useMemo(() => {
    if (!bulkSearchQuery.trim()) return products;
    const q = bulkSearchQuery.toLowerCase();
    return products.filter((p: any) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [products, bulkSearchQuery]);

  return (
    <>
      <ZohoTransactionForm
        title={isEditMode ? 'Edit Bill' : 'New Bill'}
        icon={Receipt}
        onClose={() => navigate('/bills')}
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

      {/* VENDOR SEARCH MODAL */}
      <ZohoModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        title="Select Vendor"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={vendorSearchQuery}
              onChange={(e) => setVendorSearchQuery(e.target.value)}
              placeholder="Search vendor by name, email, phone, or GSTIN..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-[4px] text-xs focus:outline-none focus:border-[#408DFB]"
              autoFocus
            />
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-[4px]">
            {filteredVendors.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No vendors found matching "{vendorSearchQuery}".
              </div>
            ) : (
              filteredVendors.map((v: any) => {
                const displayName = v.name || v.companyName || 'Unnamed Vendor';
                const isSelected = v.id === vendorId;
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      handleVendorSelect(v.id);
                      setIsVendorModalOpen(false);
                      setVendorSearchQuery('');
                    }}
                    className={`p-3 text-xs hover:bg-[#F3F4F6] cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-[#EFF6FF]' : ''
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-[#2B2F36]">{displayName}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {[v.phone, v.email, v.gstin || v.gstNumber].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-[#408DFB] text-xs font-semibold">Selected</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsVendorModalOpen(false);
                navigate('/vendors/new');
              }}
              className="text-xs text-[#408DFB] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              + Create New Vendor
            </button>
            <button
              type="button"
              onClick={() => setIsVendorModalOpen(false)}
              className="px-4 py-1.5 border border-gray-300 rounded-[4px] text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </ZohoModal>

      {/* CREATE PAYMENT TERM MODAL (Screenshot 4) */}
      <ZohoModal
        isOpen={isCreateTermModalOpen}
        onClose={() => {
          setIsCreateTermModalOpen(false);
          setNewTermName('');
          setNewTermDays('');
        }}
        title="New Payment Term"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
              Term Name <span className="text-[#E54B4B]">*</span>
            </label>
            <input
              type="text"
              value={newTermName}
              onChange={(e) => setNewTermName(e.target.value)}
              placeholder="e.g. Net 20 or Custom Terms"
              className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
              Due After <span className="text-[#E54B4B]">*</span>
            </label>
            <div className="flex items-center">
              <input
                type="number"
                min="0"
                value={newTermDays}
                onChange={(e) => setNewTermDays(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full h-8 px-2.5 bg-white border border-r-0 border-[#CBD5E1] rounded-l-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
              <span className="h-8 px-3 bg-gray-50 border border-[#CBD5E1] rounded-r-[4px] text-xs text-gray-600 flex items-center font-medium">
                Days
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={handleSavePaymentTerm}
              disabled={isCreatingTerm}
              className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-medium cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isCreatingTerm ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreateTermModalOpen(false);
                setNewTermName('');
                setNewTermDays('');
              }}
              className="px-4 py-1.5 bg-white border border-gray-300 rounded-[4px] text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </ZohoModal>

      {/* BULK ITEMS MODAL */}
      <ZohoModal
        isOpen={isBulkItemsModalOpen}
        onClose={() => setIsBulkItemsModalOpen(false)}
        title="Add Items in Bulk"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={bulkSearchQuery}
              onChange={(e) => setBulkSearchQuery(e.target.value)}
              placeholder="Search items by name or SKU..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-[4px] text-xs focus:outline-none focus:border-[#408DFB]"
              autoFocus
            />
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-[4px]">
            {filteredProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No items found matching "{bulkSearchQuery}".
              </div>
            ) : (
              filteredProducts.map((p: any) => {
                const qtySelected = bulkSelectedMap[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className="p-3 text-xs hover:bg-[#F9FAFB] flex items-center justify-between transition-colors"
                  >
                    <div className="flex-1 mr-4">
                      <p className="font-semibold text-[#2B2F36]">{p.name}</p>
                      <p className="text-[11px] text-gray-500">
                        SKU: {p.sku || 'N/A'} • Rate: ₹{Number(p.purchasePrice || p.costPrice || p.price || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={qtySelected === 0 ? '' : qtySelected}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setBulkSelectedMap((prev) => ({
                            ...prev,
                            [p.id]: val,
                          }));
                        }}
                        placeholder="Qty"
                        className="w-16 h-8 px-2 border border-gray-300 rounded-[4px] text-xs text-center"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setBulkSelectedMap((prev) => ({
                            ...prev,
                            [p.id]: (prev[p.id] || 0) + 1,
                          }));
                        }}
                        className={`px-2.5 py-1.5 rounded-[4px] text-xs font-medium cursor-pointer ${
                          qtySelected > 0
                            ? 'bg-[#EFF6FF] text-[#408DFB] border border-[#BFDBFE]'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {qtySelected > 0 ? `Selected (${qtySelected})` : '+ Add'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-gray-500">
              {Object.keys(bulkSelectedMap).filter((id) => bulkSelectedMap[id] > 0).length} item(s) selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsBulkItemsModalOpen(false)}
                className="px-4 py-1.5 border border-gray-300 rounded-[4px] text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAddConfirm}
                className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-medium cursor-pointer shadow-sm"
              >
                Add Selected Items
              </button>
            </div>
          </div>
        </div>
      </ZohoModal>
    </>
  );
};

export default BillForm;
