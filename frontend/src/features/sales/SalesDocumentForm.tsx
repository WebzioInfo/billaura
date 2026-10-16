import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  FileText,
  Settings,
  X,
  RefreshCw,
  AlertCircle,
  Info,
  Calendar,
  HelpCircle,
  RotateCcw,
  Plus,
  ShoppingCart,
  ChevronDown,
  Package,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { templateService } from '@/features/settings/services/templateService';
import {
  ZohoTransactionForm,
  ZohoItemTable,
  ZohoTotalsBox,
  ZohoFormFooter,
  ZohoAttachmentUploader,
  ZohoItemRow,
  AttachmentFile,
} from '@/shared/components/zoho';
import { SearchableSelect, PageLoader } from '@/shared/components/ui';
import { cn } from '@/lib/utils';

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

const PAYMENT_TERMS_LIST = [
  { value: 'Due on Receipt', days: 0 },
  { value: 'Net 15', days: 15 },
  { value: 'Net 30', days: 30 },
  { value: 'Net 45', days: 45 },
  { value: 'Net 60', days: 60 },
];

const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  qty: z.coerce.number().min(0.0001, 'Qty must be greater than zero'),
  rate: z.coerce.number().min(0, 'Rate must be >= 0'),
  taxPercent: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).max(100, 'Discount must be <= 100').default(0),
  unit: z.string().optional(),
});

const invoiceSchema = z.object({
  invoiceType: z.enum(['B2B', 'B2C', 'NO_TAX']).default('B2B'),
  customerId: z.string().min(1, 'Select a customer'),
  invoiceNo: z.string().optional(),
  orderNumber: z.string().optional(),
  referenceNo: z.string().optional(),
  invoiceCategoryId: z.string().optional(),
  taxTreatmentId: z.string().optional(),
  numberingSeriesId: z.string().optional(),
  taxExemptionReason: z.string().optional(),
  date: z.string().nonempty('Select date'),
  dueDate: z.string().optional(),
  paymentTerms: z.string().default('Due on Receipt'),
  salesperson: z.string().optional(),
  subject: z.string().optional(),
  expectedShipmentDate: z.string().optional(),
  deliveryMethod: z.string().optional(),
  currency: z.string().default('INR'),
  placeOfSupply: z.string().optional(),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  adjustment: z.coerce.number().default(0),
  tdsTcsType: z.enum(['NONE', 'TDS', 'TCS']).default('NONE'),
  tdsTcsAmount: z.coerce.number().default(0),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export type SalesDocumentType =
  | 'INVOICE'
  | 'BILL_OF_SUPPLY'
  | 'EXEMPT_SUPPLY'
  | 'NIL_RATED_INVOICE'
  | 'EXPORT_INVOICE'
  | 'SEZ_INVOICE'
  | 'PROFORMA'
  | 'QUOTATION'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'DELIVERY_CHALLAN'
  | 'SALES_ORDER';

interface SalesDocumentFormProps {
  initialDocType?: SalesDocumentType;
}

export const SalesDocumentForm: React.FC<SalesDocumentFormProps> = ({
  initialDocType = 'INVOICE',
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const queryCustomerId = searchParams.get('customerId');
  const duplicateId = searchParams.get('duplicateId');
  const salesOrderId = searchParams.get('salesOrderId');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'DRAFT' | 'SENT'>('SENT');
  const [docType, setDocType] = useState<SalesDocumentType>(initialDocType);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachmentFile[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const FORM_STORAGE_KEY = 'billaura_sales_form_draft';
  const [savedFormState, setSavedFormState] = useState<any>(null);
  const [insufficientStockModal, setInsufficientStockModal] = useState<{
    items: { name: string; available: number; requested: number; shortage: number }[];
    formData: InvoiceFormValues;
  } | null>(null);

  const templateDocType =
    docType === 'QUOTATION' ? 'quote' :
    docType === 'SALES_ORDER' ? 'sales_order' :
    docType === 'CREDIT_NOTE' ? 'credit_note' :
    docType === 'DELIVERY_CHALLAN' ? 'delivery_challan' : 'invoice';

  const { data: availableTemplates = [] } = useQuery({
    queryKey: ['document-templates', templateDocType],
    queryFn: () => templateService.getTemplates(templateDocType),
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    if (availableTemplates.length > 0) {
      if (!selectedTemplateId || !availableTemplates.some((t: any) => t.id === selectedTemplateId)) {
        const defaultTpl = availableTemplates.find((t: any) => t.isDefault) || availableTemplates[0];
        if (defaultTpl) setSelectedTemplateId(defaultTpl.id);
      }
    }
  }, [availableTemplates, selectedTemplateId]);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      invoiceType: 'B2B',
      customerId: '',
      invoiceNo: '',
      orderNumber: '',
      referenceNo: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      paymentTerms: 'Due on Receipt',
      salesperson: '',
      subject: '',
      expectedShipmentDate: '',
      deliveryMethod: '',
      currency: 'INR',
      notes: initialDocType === 'SALES_ORDER' ? '' : 'Thanks for your business.',
      termsConditions:
        initialDocType === 'SALES_ORDER'
          ? ''
          : '1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% per annum will be charged if payment is not received within due date.',
      adjustment: 0,
      tdsTcsType: 'NONE',
      tdsTcsAmount: 0,
      items: [
        {
          productId: '',
          name: '',
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

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Master Data Queries
  const { data: meData, error: meError, isLoading: meLoading } = useQuery<any>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: customersData, error: custError, isLoading: custLoading } = useQuery<any>({
    queryKey: ['customers'],
    queryFn: () => apiClient.get('/customers'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: productsData, error: prodError, isLoading: prodLoading } = useQuery<any>({
    queryKey: ['products'],
    queryFn: () => apiClient.get('/products'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: employeesData } = useQuery<any>({
    queryKey: ['hr', 'employees'],
    queryFn: () => apiClient.get('/hr/employees').catch(() => ({ data: [] })),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categoriesData } = useQuery<any>({
    queryKey: ['invoice-categories'],
    queryFn: () => apiClient.get('/invoice-config/categories').catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  const { data: nextNoData, error: nextNoError, isLoading: nextNoLoading, refetch: refetchNextNo } = useQuery<any>({
    queryKey: ['sales-documents', 'next-number', docType],
    queryFn: () => {
      let endpoint = '/sales/invoices/next-number';
      if (docType === 'QUOTATION') endpoint = '/sales/quotations/next-number';
      if (docType === 'SALES_ORDER') endpoint = '/sales-orders/next-number';
      if (docType === 'PROFORMA') endpoint = '/sales/invoices/next-number?type=PROFORMA';
      return apiClient.get(endpoint);
    },
    staleTime: 0,
  });

  const customers = useMemo(() => ensureArray(customersData), [customersData]);
  const products = useMemo(() => ensureArray(productsData), [productsData]);
  const employees = useMemo(() => ensureArray(employeesData), [employeesData]);
  const categories = useMemo(() => ensureArray(categoriesData), [categoriesData]);

  const companyProfile = useMemo(() => {
    return meData?.company || meData?.data?.company || null;
  }, [meData]);

  // Draft fetch if in edit mode
  const { data: draftData, isLoading: draftLoading } = useQuery<any>({
    queryKey: ['sales-draft-edit', id, docType],
    queryFn: async () => {
      if (!id) return null;
      let endpoint = `/sales/invoices/${id}`;
      if (docType === 'SALES_ORDER') endpoint = `/sales-orders/${id}`;
      const res = await apiClient.get<any>(endpoint);
      return res?.data?.data || res?.data || res;
    },
    enabled: !!id,
    staleTime: 0,
  });

  const isLoading =
    meLoading ||
    custLoading ||
    prodLoading ||
    (!isEditMode && nextNoLoading) ||
    (isEditMode && draftLoading);

  // Assign next sequence number if not set
  useEffect(() => {
    if (!isEditMode && nextNoData?.nextNumber && !watch('invoiceNo')) {
      setValue('invoiceNo', nextNoData.nextNumber);
    }
  }, [nextNoData, setValue, isEditMode, watch]);

  // Pre-populate if editing an existing draft
  useEffect(() => {
    if (isEditMode && draftData) {
      if (draftData.businessPartnerId) setValue('customerId', draftData.businessPartnerId);
      if (draftData.invoiceType) {
        setValue(
          'invoiceType',
          draftData.invoiceType === 'BILL_OF_SUPPLY'
            ? 'NO_TAX'
            : draftData.invoiceType === 'RETAIL_INVOICE'
            ? 'B2C'
            : 'B2B'
        );
      }
      if (draftData.invoiceNo) setValue('invoiceNo', draftData.invoiceNo);
      if (draftData.orderNo) setValue('invoiceNo', draftData.orderNo);
      if (draftData.templateId) setSelectedTemplateId(draftData.templateId);
      if (draftData.placeOfSupply) setValue('placeOfSupply', draftData.placeOfSupply);
      if (draftData.date) setValue('date', new Date(draftData.date).toISOString().split('T')[0]);
      if (draftData.dueDate) setValue('dueDate', new Date(draftData.dueDate).toISOString().split('T')[0]);
      if (draftData.currency) setValue('currency', draftData.currency);

      const extraMeta =
        typeof draftData.gstBreakup === 'string'
          ? (() => {
              try {
                return JSON.parse(draftData.gstBreakup);
              } catch {
                return {};
              }
            })()
          : draftData.gstBreakup || {};
      setValue('notes', extraMeta.notes || draftData.notes || 'Thanks for your business.');
      setValue(
        'termsConditions',
        extraMeta.termsConditions || draftData.termsConditions || ''
      );
      if (draftData.paymentTerms || extraMeta.paymentTerms) {
        setValue('paymentTerms', draftData.paymentTerms || extraMeta.paymentTerms);
      }

      if (Array.isArray(draftData.items) && draftData.items.length > 0) {
        setValue(
          'items',
          draftData.items.map((it: any) => ({
            productId: it.productId || '',
            name: it.product?.name || it.description || '',
            description: it.description || '',
            qty: Number(it.qty || 1),
            rate: Number(it.rate || 0),
            taxPercent: Number(it.taxPercent || 18),
            discount: 0,
            unit: it.product?.unit || 'Pcs',
          }))
        );
      }
    }
  }, [isEditMode, draftData, setValue]);

  // If converting from a Sales Order to Invoice
  const { data: salesOrderData } = useQuery<any>({
    queryKey: ['sales-order-convert', salesOrderId],
    queryFn: async () => {
      if (!salesOrderId) return null;
      const res = await apiClient.get<any>(`/sales-orders/${salesOrderId}`);
      return res?.data?.data || res?.data || res;
    },
    enabled: !!salesOrderId && !isEditMode,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isEditMode && salesOrderData) {
      if (salesOrderData.businessPartnerId) {
        setValue('customerId', salesOrderData.businessPartnerId, { shouldDirty: true, shouldValidate: true });
      }
      if (salesOrderData.orderNo) {
        setValue('orderNumber', salesOrderData.orderNo, { shouldDirty: true, shouldValidate: true });
        setValue('referenceNo', salesOrderData.orderNo, { shouldDirty: true, shouldValidate: true });
      }
      if (salesOrderData.placeOfSupply) {
        setValue('placeOfSupply', salesOrderData.placeOfSupply, { shouldDirty: true });
      }
      if (Array.isArray(salesOrderData.items) && salesOrderData.items.length > 0) {
        setValue(
          'items',
          salesOrderData.items.map((it: any) => ({
            productId: it.productId || '',
            name: it.product?.name || it.description || '',
            description: it.description || it.product?.name || '',
            qty: Number(it.qty || 1),
            rate: Number(it.rate || 0),
            taxPercent: Number(it.taxPercent || 18),
            discount: 0,
            unit: it.product?.unit || 'Pcs',
          })),
          { shouldDirty: true, shouldValidate: true }
        );
      }
    }
  }, [salesOrderData, isEditMode, setValue]);

  // Session storage restoration for new documents
  useEffect(() => {
    if (!isEditMode && !duplicateId && !salesOrderId) {
      try {
        const raw = sessionStorage.getItem(FORM_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            (parsed.customerId || (parsed.items && parsed.items.length > 0 && parsed.items[0]?.productId))
          ) {
            setSavedFormState(parsed);
          }
        }
      } catch {
        // ignore JSON parse error
      }
    }
  }, [isEditMode, duplicateId, salesOrderId]);

  const handleRestoreSavedForm = () => {
    if (!savedFormState) return;
    if (savedFormState.customerId) setValue('customerId', savedFormState.customerId);
    if (savedFormState.invoiceNo) setValue('invoiceNo', savedFormState.invoiceNo);
    if (savedFormState.notes) setValue('notes', savedFormState.notes);
    if (savedFormState.termsConditions) setValue('termsConditions', savedFormState.termsConditions);
    if (savedFormState.date) setValue('date', savedFormState.date);
    if (savedFormState.dueDate) setValue('dueDate', savedFormState.dueDate);
    if (savedFormState.items && Array.isArray(savedFormState.items)) {
      setValue('items', savedFormState.items);
    }
    notification.success('Unsaved form entries restored successfully');
    setSavedFormState(null);
  };

  const handleDiscardSavedForm = () => {
    sessionStorage.removeItem(FORM_STORAGE_KEY);
    setSavedFormState(null);
    notification.info('Unsaved draft discarded');
  };

  // Auto-save form state to sessionStorage
  const watchedValues = watch();
  useEffect(() => {
    if (!isEditMode && !duplicateId) {
      const hasData =
        watchedValues.customerId ||
        (watchedValues.items && watchedValues.items.some((it: any) => it.productId || it.rate > 0));
      if (hasData) {
        sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(watchedValues));
      }
    }
  }, [watchedValues, isEditMode, duplicateId]);

  const customerId = watch('customerId');
  const selectedPlaceOfSupply = watch('placeOfSupply');
  const selectedCurrencyCode = watch('currency');
  const invoiceType = watch('invoiceType');
  const items = useWatch({ control, name: 'items' }) || [];
  const adjustmentValue = watch('adjustment') || 0;
  const tdsTcsType = watch('tdsTcsType') || 'NONE';
  const tdsTcsAmount = watch('tdsTcsAmount') || 0;

  const currencySymbol =
    CURRENCIES.find((c) => c.code === selectedCurrencyCode)?.symbol || '₹';

  // Sync place of supply when customer changes
  useEffect(() => {
    if (customerId && customers.length > 0) {
      const cust = customers.find((c) => c.id === customerId);
      if (cust) {
        const stateToSet = cust.state || cust.placeOfSupply || '';
        setValue('placeOfSupply', stateToSet);
      }
    }
  }, [customerId, customers, setValue]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === customerId);
  }, [customerId, customers]);

  // Payment terms & due date calculation
  const handlePaymentTermsChange = (term: string) => {
    setValue('paymentTerms', term);
    const currentDate = watch('date') ? new Date(watch('date')) : new Date();
    if (isNaN(currentDate.getTime())) return;
    const option = PAYMENT_TERMS_LIST.find((o) => o.value === term);
    const daysToAdd = option ? option.days : 0;
    currentDate.setDate(currentDate.getDate() + daysToAdd);
    setValue('dueDate', currentDate.toISOString().split('T')[0]);
  };

  // Calculations
  const totals = useMemo(() => {
    let rawSubTotal = 0;
    let totalDiscountAmount = 0;
    let totalTaxAmount = 0;
    let totalCgstAmount = 0;
    let totalSgstAmount = 0;
    let totalIgstAmount = 0;
    let totalQty = 0;

    const companyState = companyProfile?.state?.trim().toLowerCase() || '';
    const supplyState = selectedPlaceOfSupply?.trim().toLowerCase() || '';
    const isInterState = supplyState && companyState && supplyState !== companyState;

    (items || []).forEach((item: any) => {
      if (!item) return;
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const discountPercent = Number(item.discount) || 0;
      const taxRate = Number(item.taxPercent) || 0;

      const lineTotal = rate * qty;
      const lineDiscount = lineTotal * (discountPercent / 100);
      const taxableValue = Math.max(0, lineTotal - lineDiscount);

      const isNonGst =
        docType === 'BILL_OF_SUPPLY' ||
        docType === 'EXEMPT_SUPPLY' ||
        docType === 'NIL_RATED_INVOICE' ||
        docType === 'EXPORT_INVOICE' ||
        invoiceType === 'NO_TAX';

      let lineTax = 0;
      if (!isNonGst) {
        lineTax = (taxableValue * taxRate) / 100;
      }

      rawSubTotal += lineTotal;
      totalDiscountAmount += lineDiscount;
      totalTaxAmount += lineTax;
      totalQty += qty;

      if (!isNonGst) {
        if (isInterState) {
          totalIgstAmount += lineTax;
        } else {
          totalCgstAmount += lineTax / 2;
          totalSgstAmount += lineTax / 2;
        }
      }
    });

    const finalSubTotal = rawSubTotal - totalDiscountAmount;
    let exactGrandTotal = finalSubTotal + totalTaxAmount + Number(adjustmentValue || 0);

    if (tdsTcsType === 'TDS') {
      exactGrandTotal -= Number(tdsTcsAmount || 0);
    } else if (tdsTcsType === 'TCS') {
      exactGrandTotal += Number(tdsTcsAmount || 0);
    }

    const roundedGrandTotal = Math.round(exactGrandTotal);
    const roundOff = roundedGrandTotal - exactGrandTotal;

    return {
      rawSubTotal,
      totalDiscountAmount,
      subTotal: finalSubTotal,
      taxTotal: totalTaxAmount,
      cgstTotal: totalCgstAmount,
      sgstTotal: totalSgstAmount,
      igstTotal: totalIgstAmount,
      roundOff,
      grandTotal: roundedGrandTotal,
      isInterState,
      totalQty,
    };
  }, [
    items,
    invoiceType,
    selectedPlaceOfSupply,
    companyProfile,
    docType,
    adjustmentValue,
    tdsTcsType,
    tdsTcsAmount,
  ]);

  // Synchronize items with ZohoItemTable
  const zohoItems: ZohoItemRow[] = useMemo(() => {
    return (items || []).map((it: any, idx: number) => {
      const prod = products.find((p: any) => p.id === it.productId);
      const qty = Number(it.qty) || 1;
      const rate = Number(it.rate) || 0;
      const discount = Number(it.discount) || 0;
      const base = qty * rate;
      const discountVal = (base * discount) / 100;
      return {
        id: String(idx),
        productId: it.productId,
        name: it.name !== undefined ? it.name : (prod?.name || it.description || ''),
        description: it.description || '',
        quantity: qty,
        rate,
        discount,
        discountType: '%',
        taxRate: Number(it.taxPercent) || 0,
        amount: Math.max(0, base - discountVal),
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
        name: row.name ?? '',
        description: row.description || '',
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
      name: '',
      description: '',
      qty: 1,
      rate: 0,
      taxPercent: 18,
      discount: 0,
      unit: 'Pcs',
    });
  };

  const handleBulkAddConfirm = () => {
    if (selectedBulkIds.length === 0) {
      setBulkModalOpen(false);
      return;
    }
    const currentLines = form.getValues('items') || [];
    const isFirstEmpty =
      currentLines.length === 1 && !currentLines[0].productId && !currentLines[0].description;

    const newLines = selectedBulkIds.map((prodId) => {
      const prod = products.find((p: any) => p.id === prodId);
      return {
        productId: prod?.id || '',
        name: prod?.name || '',
        description: prod?.name ? `${prod.name}${prod.description ? ' - ' + prod.description : ''}` : '',
        qty: 1,
        rate: Number(prod?.sellingPrice || prod?.price || 0),
        taxPercent: Number(prod?.taxRate || prod?.gstRate || 18),
        discount: 0,
        unit: prod?.unit?.shortName || prod?.unit || 'Pcs',
      };
    });

    if (isFirstEmpty) {
      setValue('items', newLines, { shouldValidate: true, shouldDirty: true });
    } else {
      setValue('items', [...currentLines, ...newLines], { shouldValidate: true, shouldDirty: true });
    }

    setSelectedBulkIds([]);
    setBulkModalOpen(false);
  };

  // Attachment handling
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const newFiles: AttachmentFile[] = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 10));
    notification.success(`${newFiles.length} file(s) attached`);
  };

  const handleFileRemove = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Form Submission
  const handleFormSubmit = async (data: InvoiceFormValues, allowNegativeStock = false) => {
    setIsSubmitting(true);
    try {
      // Stock availability validation for stock-tracked products
      if (!allowNegativeStock && submitStatus !== 'DRAFT' && docType !== 'QUOTATION' && docType !== 'CREDIT_NOTE') {
        const aggregatedQty = new Map<string, number>();
        for (const item of data.items) {
          if (item.productId) {
            aggregatedQty.set(
              item.productId,
              (aggregatedQty.get(item.productId) || 0) + Number(item.qty || 0)
            );
          }
        }

        const shortages: { name: string; available: number; requested: number; shortage: number }[] = [];
        for (const [prodId, reqQty] of aggregatedQty.entries()) {
          const product = products.find((p) => p.id === prodId);
          if (
            product &&
            product.isTrackStock !== false &&
            !product.isService &&
            product.isInventoryItem !== false
          ) {
            const availableStock = product.stocks
              ? product.stocks.reduce(
                  (acc: number, s: any) => acc + Number(s.availableQuantity ?? s.quantity ?? 0),
                  0
                )
              : 0;

            if (reqQty > availableStock) {
              shortages.push({
                name: product.name,
                available: availableStock,
                requested: reqQty,
                shortage: reqQty - availableStock,
              });
            }
          }
        }

        if (shortages.length > 0) {
          setInsufficientStockModal({
            items: shortages,
            formData: data,
          });
          setIsSubmitting(false);
          return;
        }
      }

      let backendType = 'TAX_INVOICE';
      if (data.invoiceType === 'B2C') backendType = 'RETAIL_INVOICE';
      if (data.invoiceType === 'NO_TAX') backendType = 'BILL_OF_SUPPLY';

      const payload = {
        customerId: data.customerId,
        businessPartnerId: data.customerId,
        templateId: selectedTemplateId || undefined,
        invoiceNo: data.invoiceNo?.trim() || undefined,
        documentNo: data.invoiceNo?.trim() || undefined,
        date: data.date && !isNaN(new Date(data.date).getTime())
          ? new Date(data.date).toISOString()
          : new Date().toISOString(),
        dueDate: data.dueDate && !isNaN(new Date(data.dueDate).getTime())
          ? new Date(data.dueDate).toISOString()
          : undefined,
        invoiceType: backendType,
        placeOfSupply: data.placeOfSupply,
        status: submitStatus,
        invoiceCategoryId: data.invoiceCategoryId,
        taxTreatmentId: data.taxTreatmentId,
        numberingSeriesId: data.numberingSeriesId,
        taxExemptionReason: data.taxExemptionReason,
        orderNumber: data.orderNumber || data.referenceNo,
        referenceNo: data.referenceNo || data.orderNumber,
        subject: data.subject,
        salesperson: data.salesperson,
        paymentTerms: data.paymentTerms || undefined,
        expectedShipmentDate: data.expectedShipmentDate && data.expectedShipmentDate.trim() !== ''
          ? new Date(data.expectedShipmentDate).toISOString()
          : undefined,
        deliveryMethod: data.deliveryMethod || undefined,
        adjustment: data.adjustment,
        items: data.items.map((item) => {
          const discountPercent = Number(item.discount) || 0;
          const rate = Number(item.rate);
          const originalLineTotal = rate * Number(item.qty);
          const lineDiscount = originalLineTotal * (discountPercent / 100);
          const finalTaxableRate = (originalLineTotal - lineDiscount) / Number(item.qty);

          return {
            productId: item.productId,
            description:
              discountPercent > 0
                ? `${item.description || item.name || ''} (Discount ${discountPercent}%)`
                : (item.description || item.name || ''),
            qty: Number(item.qty),
            rate: finalTaxableRate,
            taxPercent:
              data.invoiceType === 'NO_TAX' ||
              docType === 'BILL_OF_SUPPLY' ||
              docType === 'EXEMPT_SUPPLY' ||
              docType === 'NIL_RATED_INVOICE' ||
              docType === 'EXPORT_INVOICE'
                ? 0
                : Number(item.taxPercent),
          };
        }),
        notes: data.notes,
        termsConditions: data.termsConditions,
      };

      let endpoint = '/sales/invoices';
      if (docType === 'QUOTATION') endpoint = '/sales/quotations';
      if (docType === 'SALES_ORDER') endpoint = '/sales-orders';

      const actualPayload: any = {
        ...payload,
        documentType: docType === 'INVOICE' ? backendType : docType,
      };
      if (allowNegativeStock) {
        actualPayload.allowNegativeStock = true;
      }
      if (docType === 'QUOTATION') actualPayload.quotationNo = data.invoiceNo?.trim() || undefined;
      if (docType === 'SALES_ORDER') actualPayload.orderNo = data.invoiceNo?.trim() || undefined;
      if (docType === 'CREDIT_NOTE') actualPayload.invoiceType = 'CREDIT_NOTE';
      if (docType === 'DELIVERY_CHALLAN') actualPayload.invoiceType = 'DELIVERY_CHALLAN';

      let resPayload: any;
      if (isEditMode) {
        let updateEndpoint = `/sales/invoices/${id}`;
        if (docType === 'SALES_ORDER') updateEndpoint = `/sales-orders/${id}`;
        const updatedDoc: any = await apiClient.put(updateEndpoint, actualPayload);
        resPayload = updatedDoc?.data?.data || updatedDoc?.data || updatedDoc;
        if (docType === 'SALES_ORDER') {
          await queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
          sessionStorage.removeItem(FORM_STORAGE_KEY);
          notification.success('Sales order updated successfully!');
          navigate('/sales-orders');
          return;
        }
        await erpInvalidate.invoice(queryClient, {
          customerId: data.customerId,
          invoiceId: id,
        });
        await queryClient.invalidateQueries({ queryKey: ['products'] });
        await queryClient.invalidateQueries({ queryKey: ['stocks'] });
        sessionStorage.removeItem(FORM_STORAGE_KEY);
        notification.success(
          submitStatus === 'DRAFT'
            ? 'Draft updated successfully!'
            : 'Draft finalized and document issued successfully!'
        );
        navigate(`/invoices/${id}`);
        return;
      }

      const createdDoc: any = await apiClient.post(endpoint, actualPayload);
      resPayload = createdDoc?.data?.data || createdDoc?.data || createdDoc;
      sessionStorage.removeItem(FORM_STORAGE_KEY);

      if (docType === 'QUOTATION') {
        await queryClient.invalidateQueries({ queryKey: ['quotations'] });
        notification.success(
          submitStatus === 'DRAFT' ? 'Quote draft saved successfully!' : 'Quote created and issued!'
        );
        navigate(resPayload?.id ? `/quotations/${resPayload.id}` : '/quotations');
      } else if (docType === 'SALES_ORDER') {
        await queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
        notification.success('Sales order created successfully!');
        navigate('/sales-orders');
      } else if (docType === 'CREDIT_NOTE') {
        await queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
        notification.success('Credit note saved successfully!');
        navigate('/credit-notes');
      } else {
        await erpInvalidate.invoice(queryClient, { customerId: data.customerId });
        await queryClient.invalidateQueries({ queryKey: ['products'] });
        await queryClient.invalidateQueries({ queryKey: ['stocks'] });
        notification.success(
          submitStatus === 'DRAFT'
            ? 'Invoice draft saved successfully!'
            : 'Invoice created and issued successfully!'
        );
        navigate(resPayload?.id ? `/invoices/${resPayload.id}` : '/invoices');
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = `Failed to ${isEditMode ? 'update' : 'create'} ${docType.toLowerCase()}`;
      if (err.response?.data?.message) {
        const m = err.response.data.message;
        errorMsg = Array.isArray(m) ? m.join(', ') : m;
      } else if (err.message) {
        errorMsg = err.message;
      }

      if (typeof errorMsg === 'string' && errorMsg.includes('Insufficient stock for product')) {
        const match = errorMsg.match(/Insufficient stock for product "([^"]+)". Available: ([0-9.-]+), Requested: ([0-9.-]+)/);
        if (match) {
          const [, name, availStr, reqStr] = match;
          const avail = Number(availStr);
          const req = Number(reqStr);
          setInsufficientStockModal({
            items: [{ name, available: avail, requested: req, shortage: req - avail }],
            formData: data,
          });
          return;
        }
      }

      notification.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (data: InvoiceFormValues) => {
    return handleFormSubmit(data, false);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <PageLoader
          title="Loading Document Form..."
          description="Fetching customer records, items, and sequence numbers..."
        />
      </div>
    );
  }

  // Header Band
  const headerBand = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <label className="text-xs font-medium text-[#DC2626] w-36 shrink-0 flex items-center gap-0.5">
        Customer Name<span className="text-[#DC2626]">*</span>
      </label>
      <div className="flex-1 max-w-lg">
        <SearchableSelect
          value={watch('customerId') || ''}
          onChange={(val) => setValue('customerId', val, { shouldValidate: true })}
          options={customers}
          mapOption={(c) => ({
            label: `${c.name || 'Unnamed'}${c.companyName ? ` (${c.companyName})` : ''}`,
            value: c.id,
            description: c.phone || c.email || (c.city ? `${c.city}, ${c.state || ''}` : c.state) || undefined,
          })}
          placeholder="Select or add a customer"
          searchPlaceholder="Search"
          error={errors.customerId?.message as string}
          required
          quickCreateEntity="customer"
        />
      </div>
      {selectedCustomer && (
        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
          {(selectedCustomer.gstNumber || selectedCustomer.gstin) && (
            <span className="bg-[#EFF6FF] text-[#408DFB] px-2 py-0.5 rounded-[4px] font-mono text-[11px] font-medium border border-[#BFDBFE]">
              GSTIN: {selectedCustomer.gstNumber || selectedCustomer.gstin}
            </span>
          )}
          {selectedPlaceOfSupply && (
            <span className="text-[#6B7280]">
              Place of Supply: <strong className="text-[#2B2F36]">{selectedPlaceOfSupply}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );

  // Form Fields Grid based on document type
  const renderFieldsGrid = () => {
    if (docType === 'QUOTATION') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5 flex items-center justify-between">
                <span>Quote# <span className="text-[#E54B4B]">*</span></span>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await refetchNextNo();
                      if (res.data?.nextNumber) setValue('invoiceNo', res.data.nextNumber);
                    }}
                    className="text-[11px] text-[#408DFB] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RefreshCw className="w-3 h-3" /> Auto Number
                  </button>
                )}
              </label>
              <input
                type="text"
                {...register('invoiceNo')}
                placeholder="QT-00001"
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
                Reference#
              </label>
              <input
                type="text"
                {...register('referenceNo')}
                placeholder="REF-1002"
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
                Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
              >
                {availableTemplates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
                Quote Date <span className="text-[#E54B4B]">*</span>
              </label>
              <input
                type="date"
                {...register('date')}
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
                Expiry Date
              </label>
              <input
                type="date"
                {...register('dueDate')}
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
              Salesperson
            </label>
            <div className="relative">
              <select
                {...register('salesperson')}
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              >
                <option value="">Select or type a salesperson</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`}>
                    {emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`}
                  </option>
                ))}
              </select>
              {watch('salesperson') && (
                <button
                  type="button"
                  onClick={() => setValue('salesperson', '')}
                  className="absolute right-2 top-2 text-[#9CA3AF] hover:text-[#4B5563]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5 flex items-center gap-1">
              <span>Subject</span>
              <span title="Let your customer know what this quote is for" className="cursor-help">
                <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </span>
            </label>
            <textarea
              rows={2}
              {...register('subject')}
              placeholder="Let your customer know what this quote is for"
              className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          </div>
        </div>
      );
    }

    if (docType === 'SALES_ORDER') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Left Column: Sales Order Number, Sales Order Date, Payment Terms */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#DC2626] mb-1.5 flex items-center justify-between">
                  <span>Sales Order# <span className="text-[#DC2626]">*</span></span>
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await refetchNextNo();
                        if (res.data?.nextNumber) setValue('invoiceNo', res.data.nextNumber);
                      }}
                      className="text-[11px] text-[#408DFB] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RefreshCw className="w-3 h-3" /> Auto Number
                    </button>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    {...register('invoiceNo')}
                    placeholder="SO-00001"
                    className="w-full h-8 px-2.5 pr-8 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="absolute right-2 text-[#6B7280] hover:text-[#408DFB] cursor-pointer"
                    title="Configure Preferences"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#DC2626] mb-1.5">
                  Sales Order Date <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="date"
                  {...register('date')}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2F36] mb-1.5">
                  Payment Terms
                </label>
                <select
                  value={watch('paymentTerms')}
                  onChange={(e) => handlePaymentTermsChange(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  {PAYMENT_TERMS_LIST.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column: Reference#, Expected Shipment Date, Delivery Method */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#2B2F36] mb-1.5 flex items-center gap-1">
                  <span>Reference#</span>
                  <span title="Reference number or customer purchase order ID" className="cursor-help">
                    <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  </span>
                </label>
                <input
                  type="text"
                  {...register('referenceNo')}
                  placeholder="PO-4421"
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2F36] mb-1.5">
                  Expected Shipment Date
                </label>
                <input
                  type="date"
                  {...register('expectedShipmentDate')}
                  placeholder="dd/MM/yyyy"
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2F36] mb-1.5">
                  Delivery Method
                </label>
                <input
                  type="text"
                  {...register('deliveryMethod')}
                  placeholder="Select a delivery method or type to add"
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>
            </div>
          </div>

          {/* Salesperson Row beneath columns */}
          <div className="max-w-md pt-1">
            <label className="block text-xs font-medium text-[#2B2F36] mb-1.5">
              Salesperson
            </label>
            <div className="relative">
              <select
                {...register('salesperson')}
                className="w-full h-8 px-2.5 pr-8 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] appearance-none cursor-pointer"
              >
                <option value="">Select or type a salesperson</option>
                {employees.map((emp: any) => {
                  const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
                  return (
                    <option key={emp.id} value={empName}>
                      {empName}
                    </option>
                  );
                })}
              </select>
              {watch('salesperson') && (
                <button
                  type="button"
                  onClick={() => setValue('salesperson', '')}
                  className="absolute right-6 top-2 text-[#9CA3AF] hover:text-[#DC2626]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      );
    }

    if (docType === 'CREDIT_NOTE') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5 flex items-center justify-between">
                <span>Credit Note# <span className="text-[#E54B4B]">*</span></span>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await refetchNextNo();
                      if (res.data?.nextNumber) setValue('invoiceNo', res.data.nextNumber);
                    }}
                    className="text-[11px] text-[#408DFB] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RefreshCw className="w-3 h-3" /> Auto Number
                  </button>
                )}
              </label>
              <input
                type="text"
                {...register('invoiceNo')}
                placeholder="CN-00001"
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
                Reference#
              </label>
              <input
                type="text"
                {...register('referenceNo')}
                placeholder="Invoice reference or return note"
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
                Credit Note Date <span className="text-[#E54B4B]">*</span>
              </label>
              <input
                type="date"
                {...register('date')}
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
                Salesperson
              </label>
              <div className="relative">
                <select
                  {...register('salesperson')}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                >
                  <option value="">Select or type a salesperson</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`}>
                      {emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`}
                    </option>
                  ))}
                </select>
                {watch('salesperson') && (
                  <button
                    type="button"
                    onClick={() => setValue('salesperson', '')}
                    className="absolute right-2 top-2 text-[#9CA3AF] hover:text-[#4B5563]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
              Subject
            </label>
            <textarea
              rows={2}
              {...register('subject')}
              placeholder="Reason for credit note..."
              className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          </div>
        </div>
      );
    }

    // Standard Invoice (INVOICE, BILL_OF_SUPPLY, PROFORMA)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Left Column: Invoice Number, Invoice Date, Salesperson */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#DC2626] mb-1.5 flex items-center justify-between">
                <span>Invoice# <span className="text-[#DC2626]">*</span></span>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await refetchNextNo();
                      if (res.data?.nextNumber) setValue('invoiceNo', res.data.nextNumber);
                    }}
                    className="text-[11px] text-[#408DFB] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RefreshCw className="w-3 h-3" /> Auto Number
                  </button>
                )}
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  {...register('invoiceNo')}
                  placeholder="INV-00001"
                  className="w-full h-8 px-2.5 pr-8 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="absolute right-2 text-[#6B7280] hover:text-[#408DFB] cursor-pointer"
                  title="Configure Preferences"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
              {errors.invoiceNo && <p className="text-[#DC2626] text-[11px] mt-1">{errors.invoiceNo.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#DC2626] mb-1.5">
                Invoice Date <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="date"
                {...register('date')}
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
              {errors.date && <p className="text-[#DC2626] text-[11px] mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2B2F36] mb-1.5">
                Salesperson
              </label>
              <div className="relative">
                <select
                  {...register('salesperson')}
                  className="w-full h-8 px-2.5 pr-8 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] appearance-none cursor-pointer"
                >
                  <option value="">Select or type a salesperson</option>
                  {employees.map((emp: any) => {
                    const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
                    return (
                      <option key={emp.id} value={empName}>
                        {empName}
                      </option>
                    );
                  })}
                </select>
                {watch('salesperson') && (
                  <button
                    type="button"
                    onClick={() => setValue('salesperson', '')}
                    className="absolute right-6 top-2 text-[#9CA3AF] hover:text-[#DC2626]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Right Column: Order Number, Terms and Due Date */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#2B2F36] mb-1.5">
                Order Number
              </label>
              <input
                type="text"
                {...register('orderNumber')}
                placeholder="PO-2026-98"
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2B2F36] mb-1.5">
                Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
              >
                {availableTemplates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#2B2F36]">Terms & Due Date</label>
                <span className="text-[11px] text-[#6B7280]">Due on: {watch('dueDate')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                <input
                  type="date"
                  {...register('dueDate')}
                  className="h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row beneath: Subject */}
        <div className="pt-1">
          <label className="block text-xs font-medium text-[#2B2F36] mb-1.5 flex items-center gap-1">
            <span>Subject</span>
            <span title="Let your customer know what this Invoice is for" className="cursor-help">
              <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </span>
          </label>
          <textarea
            rows={2}
            {...register('subject')}
            placeholder="Let your customer know what this Invoice is for"
            className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
        </div>
      </div>
    );
  };

  // Item Table
  const itemTable = (
    <ZohoItemTable
      items={zohoItems}
      onChange={handleZohoItemsChange}
      onAddItem={handleAddItem}
      onAddBulk={() => setBulkModalOpen(true)}
      products={products}
      currencySymbol={currencySymbol}
      taxOptions={[
        { label: 'Non-Taxable (0%)', rate: 0, id: 'tax-0' },
        { label: 'GST (5%)', rate: 5, id: 'tax-5' },
        { label: 'GST (12%)', rate: 12, id: 'tax-12' },
        { label: 'GST (18%)', rate: 18, id: 'tax-18' },
        { label: 'GST (28%)', rate: 28, id: 'tax-28' },
      ]}
    />
  );

  // Totals Box
  const taxLines: Array<{ label: string; amount: number }> = [];
  if (invoiceType !== 'NO_TAX') {
    if (totals.isInterState && totals.igstTotal > 0) {
      taxLines.push({ label: 'IGST', amount: totals.igstTotal });
    } else {
      if (totals.cgstTotal > 0) taxLines.push({ label: 'CGST', amount: totals.cgstTotal });
      if (totals.sgstTotal > 0) taxLines.push({ label: 'SGST', amount: totals.sgstTotal });
    }
  }

  const totalsBox = (
    <ZohoTotalsBox
      subtotal={totals.subTotal}
      taxLines={taxLines}
      tdsTcsType={tdsTcsType}
      tdsTcsAmount={tdsTcsAmount}
      onTdsTcsChange={(type, val) => {
        setValue('tdsTcsType', type);
        setValue('tdsTcsAmount', val);
      }}
      adjustment={adjustmentValue}
      onAdjustmentChange={(val) => setValue('adjustment', val)}
      roundOff={totals.roundOff}
      total={totals.grandTotal}
      currencySymbol={currencySymbol}
    />
  );

  // Customer Notes (Left column alongside Totals Box)
  const notesAndTerms = (
    <div>
      <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
        Customer Notes
      </label>
      <textarea
        rows={3}
        {...register('notes')}
        placeholder="Enter any notes to be displayed in your transaction"
        className="w-full bg-white border border-[#CBD5E1] rounded-[4px] p-2.5 text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
      />
      <p className="text-[11px] text-[#6B7280] mt-1">Will be displayed on the {docType === 'SALES_ORDER' ? 'sales order' : 'invoice'}</p>
    </div>
  );

  // Lower Two-Column Section: Terms & Conditions + Attachments
  const bottomSection = (
    <div className="space-y-6 pt-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
            Terms & Conditions
          </label>
          <textarea
            rows={4}
            {...register('termsConditions')}
            placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
            className="w-full bg-white border border-[#CBD5E1] rounded-[4px] p-2.5 text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
            Attach File(s) to {docType === 'INVOICE' ? 'Invoice' : docType.replace('_', ' ')}
          </label>
          <ZohoAttachmentUploader
            files={attachedFiles}
            onUpload={handleFileUpload}
            onRemove={handleFileRemove}
            maxFiles={10}
            maxSizeMB={docType === 'SALES_ORDER' ? 5 : 10}
          />
        </div>
      </div>

      {docType === 'INVOICE' && (
        <div className="text-xs text-[#6B7280]">
          <span>Additional Fields: Start adding custom fields for your invoices by going to </span>
          <span className="font-semibold text-[#4B5563]">Settings ➔ Sales ➔ Invoices</span>.
        </div>
      )}

      {docType === 'SALES_ORDER' && (
        <div className="text-xs text-[#6B7280]">
          <span>Additional Fields: Add custom fields to your sales orders by going to </span>
          <span className="font-semibold text-[#4B5563]">Settings ➔ Sales ➔ Sales Orders ➔ Field Customization</span>.
        </div>
      )}
    </div>
  );

  // Footer Actions
  const footer = (
    <ZohoFormFooter
      primaryActions={[
        {
          label: isEditMode
            ? 'Save and Issue'
            : docType === 'CREDIT_NOTE'
            ? 'Save as Open'
            : 'Save and Send ▾',
          onClick: () => {
            setSubmitStatus('SENT');
            handleSubmit(onSubmit)();
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
            handleSubmit(onSubmit)();
          },
          disabled: isSubmitting,
        },
        {
          label: 'Cancel',
          onClick: () => {
            if (docType === 'QUOTATION') navigate('/quotations');
            else if (docType === 'SALES_ORDER') navigate('/sales-orders');
            else if (docType === 'CREDIT_NOTE') navigate('/credit-notes');
            else navigate('/invoices');
          },
        },
      ]}
      makeRecurring={{
        label: 'Make Recurring',
        onClick: () => notification.info('Configure recurring invoice frequency in Settings'),
      }}
      totalSummary={{
        totalAmount: totals.grandTotal,
        totalQuantity: totals.totalQty,
        currencySymbol,
      }}
    />
  );

  const getFormTitle = () => {
    if (isEditMode) return `Edit ${docType.replace('_', ' ')}: ${draftData?.invoiceNo || 'Draft'}`;
    if (docType === 'QUOTATION') return 'New Quote';
    if (docType === 'SALES_ORDER') return 'New Sales Order';
    if (docType === 'CREDIT_NOTE') return 'New Credit Note';
    if (docType === 'DELIVERY_CHALLAN') return 'New Delivery Challan';
    if (docType === 'PROFORMA') return 'New Proforma Invoice';
    return 'New Invoice';
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white overflow-hidden relative">
      {/* Unsaved draft restoration prompt */}
      {savedFormState && (
        <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-6 py-2 flex items-center justify-between text-xs text-[#1E3A8A] shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#408DFB] shrink-0" />
            <span>You have unsaved line items or customer data from a previous session.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreSavedForm}
              className="px-2.5 py-1 bg-[#408DFB] text-white rounded-[4px] text-xs font-medium cursor-pointer"
            >
              Restore Entries
            </button>
            <button
              type="button"
              onClick={handleDiscardSavedForm}
              className="px-2.5 py-1 bg-white border border-[#CBD5E1] text-[#2B2F36] rounded-[4px] text-xs font-medium cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Main Zoho Transaction Form */}
      <ZohoTransactionForm
        title={getFormTitle()}
        icon={docType === 'SALES_ORDER' ? ShoppingCart : FileText}
        onClose={() => {
          if (docType === 'QUOTATION') navigate('/quotations');
          else if (docType === 'SALES_ORDER') navigate('/sales-orders');
          else if (docType === 'CREDIT_NOTE') navigate('/credit-notes');
          else navigate('/invoices');
        }}
        onSettings={() => setIsSettingsOpen(true)}
        headerBand={headerBand}
        fieldsGrid={renderFieldsGrid()}
        itemTable={itemTable}
        totalsBox={totalsBox}
        notesAndTerms={notesAndTerms}
        bottomContent={bottomSection}
        footer={footer}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit)();
        }}
      />

      {/* Settings Modal (revealed via gear icon in title row) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#408DFB]" />
                <h3 className="text-sm font-semibold text-[#2B2F36]">Document Preferences</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-[#6B7280] hover:text-[#2B2F36] p-1 rounded-[4px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-[#2B2F36]">
              <div>
                <label className="block font-semibold mb-1">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as SalesDocumentType)}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none"
                >
                  <option value="INVOICE">Tax Invoice (GST)</option>
                  <option value="BILL_OF_SUPPLY">Bill of Supply (Non-GST)</option>
                  <option value="QUOTATION">Quotation</option>
                  <option value="SALES_ORDER">Sales Order</option>
                  <option value="CREDIT_NOTE">Credit Note</option>
                  <option value="DELIVERY_CHALLAN">Delivery Challan</option>
                  <option value="PROFORMA">Proforma Invoice</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Tax Mode</label>
                <select
                  {...register('invoiceType')}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none"
                >
                  <option value="B2B">B2B (Tax Invoice)</option>
                  <option value="B2C">B2C (Retail Invoice)</option>
                  <option value="NO_TAX">No Tax (Bill of Supply)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Currency</label>
                <select
                  {...register('currency')}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Place of Supply</label>
                <select
                  {...register('placeOfSupply')}
                  className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none"
                >
                  <option value="">Select State...</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F8F9FB] flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] text-xs font-medium cursor-pointer"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Items Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[6px] w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#408DFB]" />
                <h3 className="text-sm font-semibold text-[#2B2F36]">Add Items in Bulk</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBulkIds([]);
                  setBulkModalOpen(false);
                }}
                className="text-[#6B7280] hover:text-[#2B2F36] p-1 rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter */}
            <div className="p-4 border-b border-[#E5E7EB] bg-white">
              <input
                type="text"
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                placeholder="Search items by name, SKU, or description..."
                className="w-full h-8 px-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {products
                .filter((p: any) => {
                  if (!bulkSearch) return true;
                  const query = bulkSearch.toLowerCase();
                  return (
                    p.name?.toLowerCase().includes(query) ||
                    p.sku?.toLowerCase().includes(query) ||
                    p.description?.toLowerCase().includes(query)
                  );
                })
                .map((product: any) => {
                  const isChecked = selectedBulkIds.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedBulkIds(selectedBulkIds.filter((x) => x !== product.id));
                        } else {
                          setSelectedBulkIds([...selectedBulkIds, product.id]);
                        }
                      }}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-[4px] border cursor-pointer transition-colors',
                        isChecked
                          ? 'border-[#408DFB] bg-[#EFF6FF]'
                          : 'border-[#E5E7EB] hover:bg-[#F8F9FB]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#408DFB] rounded border-[#CBD5E1] cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-semibold text-[#2B2F36]">{product.name}</div>
                          {product.sku && (
                            <div className="text-[11px] text-[#6B7280]">SKU: {product.sku}</div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-semibold text-[#2B2F36]">
                          {currencySymbol}
                          {Number(product.sellingPrice || product.price || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          Tax: {product.taxRate || product.gstRate || 18}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              {products.length === 0 && (
                <div className="text-center py-8 text-xs text-[#6B7280]">
                  No items found in your catalog.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">
                {selectedBulkIds.length} item{selectedBulkIds.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBulkIds([]);
                    setBulkModalOpen(false);
                  }}
                  className="px-3 py-1.5 bg-white border border-[#CBD5E1] text-[#2B2F36] rounded-[4px] text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAddConfirm}
                  disabled={selectedBulkIds.length === 0}
                  className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] disabled:opacity-50 text-white rounded-[4px] text-xs font-medium cursor-pointer"
                >
                  Add Selected Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Stock Confirmation Dialog */}
      {insufficientStockModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#FEF2F2] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-[#DC2626]" />
                <h3 className="text-sm font-bold text-[#991B1B]">Insufficient Stock</h3>
              </div>
              <button
                type="button"
                onClick={() => setInsufficientStockModal(null)}
                className="text-[#6B7280] hover:text-[#2B2F36] p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-[#4B5563]">
                The requested quantity exceeds available physical inventory for the following item(s):
              </p>

              <div className="bg-[#F8F9FA] rounded-md border border-[#E5E7EB] p-3 divide-y divide-[#E5E7EB] space-y-2.5">
                {insufficientStockModal.items.map((item, idx) => (
                  <div key={idx} className={idx > 0 ? 'pt-2.5 text-xs space-y-1' : 'text-xs space-y-1'}>
                    <div className="flex justify-between font-medium">
                      <span className="text-[#6B7280]">• Item:</span>
                      <span className="text-[#1F2937] font-semibold">{item.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">• Available stock:</span>
                      <span className="text-[#059669] font-medium">{item.available}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">• Requested quantity:</span>
                      <span className="text-[#1F2937] font-medium">{item.requested}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">• Shortage:</span>
                      <span className="text-[#DC2626] font-bold">{item.shortage}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setInsufficientStockModal(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#374151] bg-white border border-[#CBD5E1] rounded hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const savedData = insufficientStockModal.formData;
                    setInsufficientStockModal(null);
                    handleFormSubmit(savedData, true);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded shadow-xs transition-colors cursor-pointer"
                >
                  Force Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SalesDocumentForm;
