import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const formatIndianCurrency = (amount: number) => {
  const rounded = Math.abs(amount) < 0.005 ? 0 : amount;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
};
import { z } from 'zod';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  Plus, Trash2, ArrowLeft, Save, FileText, Eye, X, Loader2, Info, AlertCircle, BookOpen, RotateCcw, RefreshCw
} from 'lucide-react';

const mapUnit = (unitStr: string) => {
  if (!unitStr) return 'Pcs';
  const lower = unitStr.toLowerCase();
  if (lower === 'pcs') return 'Pcs';
  if (lower === 'box') return 'Box';
  if (lower === 'kgs') return 'Kgs';
  if (lower === 'ltr') return 'Ltr';
  if (lower === 'nos') return 'Nos';
  return unitStr.charAt(0).toUpperCase() + unitStr.slice(1).toLowerCase();
};
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer, LoadingState, FormSection } from '@/shared/components/ui/LayoutComponents';
import { DocumentSummarySidebar } from '@/shared/components/ui/DocumentSummarySidebar';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { FormErrorDisplay, SearchableSelect, PageLoader } from '@/shared/components/ui';
import { useAsyncForm } from '@/shared/hooks/useAsyncForm';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { ReferralSection } from './components/form/ReferralSection';

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
  invoiceNo: z.string().optional(),
  invoiceCategoryId: z.string().optional(),
  taxTreatmentId: z.string().optional(),
  numberingSeriesId: z.string().optional(),
  taxExemptionReason: z.string().optional(),
  date: z.string().nonempty('Select date'),
  dueDate: z.string().optional(),
  currency: z.string().default('INR'),
  placeOfSupply: z.string().optional(),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  referralSourceType: z.string().optional(),
  employeeId: z.string().optional(),
  referralPartnerId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { erpInvalidate } from '@/core/query/erpConsistency';

export type SalesDocumentType = 'INVOICE' | 'BILL_OF_SUPPLY' | 'EXEMPT_SUPPLY' | 'NIL_RATED_INVOICE' | 'EXPORT_INVOICE' | 'SEZ_INVOICE' | 'PROFORMA' | 'QUOTATION' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'DELIVERY_CHALLAN' | 'SALES_ORDER';

interface SalesDocumentFormProps {
  initialDocType?: SalesDocumentType;
}

export const SalesDocumentForm: React.FC<SalesDocumentFormProps> = ({ initialDocType = 'INVOICE' }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const queryCustomerId = searchParams.get('customerId');
  const duplicateId = searchParams.get('duplicateId');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'DRAFT' | 'SENT'>('SENT');
  const [docType, setDocType] = useState<SalesDocumentType>(initialDocType);
  const FORM_STORAGE_KEY = 'billaura_sales_form_draft';
  const [savedFormState, setSavedFormState] = useState<any>(null);

  const form = useAsyncForm<InvoiceFormValues>(
    {
      resolver: zodResolver(invoiceSchema as any) as any,
      defaultValues: {
        invoiceType: 'B2B',
        invoiceNo: '',
        date: new Date().toISOString().split('T')[0],
        currency: 'INR',
        items: [{ productId: '', description: '', qty: 1, rate: 0, taxPercent: 18, discount: 0, unit: 'Pcs' }],
        termsConditions: "1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% per annum will be charged if payment is not received within due date.",
      },
    },
    null,
    () => ({})
  );

  const { register, control, handleFormSubmit, watch, formState: { errors }, setValue } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // React Query cached fetches for master data dependencies
  const { data: meData, error: meError, isLoading: meLoading, refetch: refetchMe } = useQuery<any>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: customersData, error: custError, isLoading: custLoading, refetch: refetchCust } = useQuery<any>({
    queryKey: ['customers'],
    queryFn: () => apiClient.get('/customers'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: productsData, error: prodError, isLoading: prodLoading, refetch: refetchProd } = useQuery<any>({
    queryKey: ['products'],
    queryFn: () => apiClient.get('/products'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: unitsData, error: unitsError, isLoading: unitsLoading, refetch: refetchUnits } = useQuery<any>({
    queryKey: ['units'],
    queryFn: () => apiClient.get('/units').catch(() => []),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: categoriesData } = useQuery<any>({
    queryKey: ['invoice-categories'],
    queryFn: () => apiClient.get('/invoice-config/categories').catch(() => []),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const categories = useMemo(() => {
    return ensureArray(categoriesData);
  }, [categoriesData]);

  const { data: nextNoData, error: nextNoError, isLoading: nextNoLoading, refetch: refetchNextNo } = useQuery<any>({
    queryKey: ['sales-documents', 'next-number', docType],
    queryFn: () => {
      let endpoint = '/sales/invoices/next-number';
      if (docType === 'QUOTATION') endpoint = '/sales/quotations/next-number';
      if (docType === 'PROFORMA') endpoint = '/sales/invoices/next-number?type=PROFORMA';
      return apiClient.get(endpoint);
    },
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const customers = useMemo(() => {
    return ensureArray(customersData);
  }, [customersData]);

  const products = useMemo(() => {
    return ensureArray(productsData);
  }, [productsData]);

  const units = useMemo(() => {
    return ensureArray(unitsData);
  }, [unitsData]);

  const companyProfile = useMemo(() => {
    return meData?.company || meData?.data?.company || null;
  }, [meData]);

  const { data: draftData, isLoading: draftLoading } = useQuery<any>({
    queryKey: ['sales-draft-edit', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<any>(`/sales/invoices/${id}`);
      return res?.data?.data || res?.data || res;
    },
    enabled: !!id,
    staleTime: 0,
  });

  const isLoading = meLoading || custLoading || prodLoading || unitsLoading || (!isEditMode && nextNoLoading) || (isEditMode && draftLoading);

  const errorDetails = useMemo(() => {
    const list: string[] = [];
    if (meError) list.push("Company profile could not be loaded");
    if (custError) list.push("Customer master records could not be loaded");
    if (prodError) list.push("Product catalog could not be loaded");
    if (!isEditMode && nextNoError) list.push(`Unable to generate ${docType.toLowerCase().replace('_', ' ')} sequence number`);
    return list;
  }, [meError, custError, prodError, nextNoError, docType, isEditMode]);

  const hasError = Boolean(meError || custError || prodError || (!isEditMode && nextNoError));
  useEffect(() => {
    if (hasError && errorDetails.length > 0) {
      notification.error(errorDetails.join(". "));
    }
  }, [hasError, errorDetails]);

  // If new invoice, assign next sequence number if not manually set
  useEffect(() => {
    if (!isEditMode && nextNoData?.nextNumber && !watch('invoiceNo')) {
      setValue('invoiceNo', nextNoData.nextNumber);
    }
  }, [nextNoData, setValue, isEditMode]);

  // If editing an existing draft, pre-populate all form fields
  useEffect(() => {
    if (isEditMode && draftData && customers.length > 0 && products.length > 0) {
      if (draftData.businessPartnerId) setValue('customerId', draftData.businessPartnerId);
      if (draftData.invoiceType) {
        setValue('invoiceType', draftData.invoiceType === 'BILL_OF_SUPPLY' ? 'NO_TAX' : (draftData.invoiceType === 'RETAIL_INVOICE' ? 'B2C' : 'B2B'));
      }
      if (draftData.invoiceNo) setValue('invoiceNo', draftData.invoiceNo);
      if (draftData.placeOfSupply) setValue('placeOfSupply', draftData.placeOfSupply);
      if (draftData.date) setValue('date', new Date(draftData.date).toISOString().split('T')[0]);
      if (draftData.dueDate) setValue('dueDate', new Date(draftData.dueDate).toISOString().split('T')[0]);
      if (draftData.currency) setValue('currency', draftData.currency);
      if (draftData.invoiceCategoryId) setValue('invoiceCategoryId', draftData.invoiceCategoryId);
      if (draftData.taxTreatmentId) setValue('taxTreatmentId', draftData.taxTreatmentId);
      if (draftData.numberingSeriesId) setValue('numberingSeriesId', draftData.numberingSeriesId);

      const extraMeta = typeof draftData.gstBreakup === 'string'
        ? (function() { try { return JSON.parse(draftData.gstBreakup); } catch { return {}; } })()
        : (draftData.gstBreakup || {});
      setValue('notes', extraMeta.notes || draftData.notes || '');
      setValue('termsConditions', extraMeta.termsConditions || draftData.termsConditions || '');

      if (Array.isArray(draftData.items) && draftData.items.length > 0) {
        setValue('items', draftData.items.map((it: any) => ({
          productId: it.productId || '',
          description: it.description || '',
          qty: Number(it.qty || 1),
          rate: Number(it.rate || 0),
          taxPercent: Number(it.taxPercent || 18),
          discount: 0,
          unit: it.product?.unit || 'Pcs',
        })));
      }
    }
  }, [isEditMode, draftData, customers, products, setValue]);

  // Session storage unsaved form recovery on mount (for new invoices only)
  useEffect(() => {
    if (!isEditMode && !duplicateId) {
      try {
        const raw = sessionStorage.getItem(FORM_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.customerId || (parsed.items && parsed.items.length > 0 && parsed.items[0]?.productId))) {
            setSavedFormState(parsed);
          }
        }
      } catch {
        // ignore JSON parse error
      }
    }
  }, [isEditMode, duplicateId]);

  const handleRestoreSavedForm = () => {
    if (!savedFormState) return;
    if (savedFormState.customerId) setValue('customerId', savedFormState.customerId);
    if (savedFormState.invoiceType) setValue('invoiceType', savedFormState.invoiceType);
    if (savedFormState.placeOfSupply) setValue('placeOfSupply', savedFormState.placeOfSupply);
    if (savedFormState.notes) setValue('notes', savedFormState.notes);
    if (savedFormState.termsConditions) setValue('termsConditions', savedFormState.termsConditions);
    if (savedFormState.date) setValue('date', savedFormState.date);
    if (savedFormState.dueDate) setValue('dueDate', savedFormState.dueDate);
    if (savedFormState.currency) setValue('currency', savedFormState.currency);
    if (savedFormState.items && Array.isArray(savedFormState.items) && savedFormState.items.length > 0) {
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

  // Auto-persist form values to sessionStorage as user types
  const watchedValues = watch();
  useEffect(() => {
    if (!isEditMode && !duplicateId) {
      const hasMeaningfulData = watchedValues.customerId || (watchedValues.items && watchedValues.items.some((it: any) => it.productId || it.rate > 0));
      if (hasMeaningfulData) {
        sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(watchedValues));
      }
    }
  }, [watchedValues, isEditMode, duplicateId]);



  const invoiceType = watch('invoiceType');
  const items = useWatch({ control, name: 'items' }) || [];
  const invoiceDate = watch('date');
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

  // Preselect customer ID if provided via query parameters
  useEffect(() => {
    if (queryCustomerId && customers.length > 0) {
      setValue('customerId', queryCustomerId);
    }
  }, [queryCustomerId, customers, setValue]);

  useEffect(() => {
    if (duplicateId && customers.length > 0 && products.length > 0) {
      const fetchDuplicateData = async () => {
        try {
          const res = await apiClient.get(`/sales/invoices/${duplicateId}`);
          const data = res.data?.data || res.data;
          if (data) {
            setValue('customerId', data.businessPartnerId);
            setValue('invoiceType', data.invoiceType === 'BILL_OF_SUPPLY' ? 'NO_TAX' : (data.invoiceType === 'RETAIL_INVOICE' ? 'B2C' : 'B2B'));
            setValue('placeOfSupply', data.placeOfSupply || '');

            // Extract notes and terms from metadata
            const extraMeta = typeof data.gstBreakup === 'string' ? JSON.parse(data.gstBreakup) : (data.gstBreakup || {});
            setValue('notes', extraMeta.notes || data.notes || '');
            setValue('termsConditions', extraMeta.termsConditions || data.termsConditions || "1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% per annum will be charged if payment is not received within due date.");

            // Prefill items
            if (Array.isArray(data.items) && data.items.length > 0) {
              const formattedItems = data.items.map((item: any) => ({
                productId: item.productId || '',
                description: item.description || '',
                qty: Number(item.qty || item.quantity || 1),
                rate: Number(item.rate || item.unitPrice || 0),
                taxPercent: Number(item.taxPercent || item.taxRate || 18),
                unit: item.product?.unit || 'Pcs'
              }));
              setValue('items', formattedItems);
            }
          }
        } catch (err) {
          console.error('Failed to load invoice for duplication', err);
        }
      };
      fetchDuplicateData();
    }
  }, [duplicateId, customers, products, setValue]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === customerId);
  }, [customerId, customers]);

  // Perform tax breakdown & calculations (memoized to prevent render recalculation loops)
  const totals = useMemo(() => {
    let rawSubTotal = 0;
    let totalDiscountAmount = 0;
    let totalTaxAmount = 0;
    let totalCgstAmount = 0;
    let totalSgstAmount = 0;
    let totalIgstAmount = 0;
    let totalQty = 0;
    let numItems = 0;

    const companyState = companyProfile?.state?.trim().toLowerCase() || '';
    const supplyState = selectedPlaceOfSupply?.trim().toLowerCase() || '';
    const isInterState = supplyState && companyState && supplyState !== companyState;

    const taxSummaryMap: Record<number, { taxableValue: number; taxAmount: number }> = {};

    const itemsList = items || [];

    itemsList.forEach((item: any) => {
      if (!item) return;

      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const discountPercent = Number(item.discount) || 0;
      const taxRate = Number(item.taxPercent) || 0;

      // Validation check to prevent negative values or out of bounds
      const validQty = qty < 0 ? 0 : qty;
      const validRate = rate < 0 ? 0 : rate;
      const validDiscount = discountPercent < 0 ? 0 : (discountPercent > 100 ? 100 : discountPercent);
      const validTaxRate = taxRate < 0 ? 0 : taxRate;

      const lineTotal = validRate * validQty;
      const lineDiscount = lineTotal * (validDiscount / 100);
      const taxableValue = lineTotal - lineDiscount;

      const isNonGst = docType === 'BILL_OF_SUPPLY' || docType === 'EXEMPT_SUPPLY' || docType === 'NIL_RATED_INVOICE' || docType === 'EXPORT_INVOICE' || invoiceType === 'NO_TAX';
      const bpTaxPreference = selectedCustomer?.taxPreference || 'TAXABLE';
      let activeTaxPref = bpTaxPreference;
      if (isNonGst) activeTaxPref = 'NON_GST';

      let lineTax = 0;
      if (!['EXEMPT', 'NIL_RATED', 'NON_GST'].includes(activeTaxPref)) {
        lineTax = (taxableValue * validTaxRate) / 100;
      }

      rawSubTotal += lineTotal;
      totalDiscountAmount += lineDiscount;
      totalTaxAmount += lineTax;
      totalQty += validQty;

      if (item.productId) {
        numItems += 1;
      }

      if (!['EXEMPT', 'NIL_RATED', 'NON_GST'].includes(activeTaxPref)) {
        if (isInterState) {
          totalIgstAmount += lineTax;
        } else {
          totalCgstAmount += lineTax / 2;
          totalSgstAmount += lineTax / 2;
        }
      }

      // Group totals for summary breakdown
      if (validTaxRate > 0 && !['EXEMPT', 'NIL_RATED', 'NON_GST'].includes(activeTaxPref)) {
        if (!taxSummaryMap[validTaxRate]) {
          taxSummaryMap[validTaxRate] = { taxableValue: 0, taxAmount: 0 };
        }
        taxSummaryMap[validTaxRate].taxableValue += taxableValue;
        taxSummaryMap[validTaxRate].taxAmount += lineTax;
      }
    });

    const finalSubTotal = rawSubTotal - totalDiscountAmount;

    // Auto-calculate Round Off to nearest rupee (standard accounting practices)
    const exactGrandTotal = finalSubTotal + totalTaxAmount;
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
      numItems,
      taxSummary: Object.entries(taxSummaryMap).map(([rate, vals]) => ({
        rate: Number(rate),
        ...vals
      }))
    };
  }, [items, invoiceType, selectedPlaceOfSupply, companyProfile]);

  const handleProductSelect = (index: number, productId: string, directProductObj?: any) => {
    const product = directProductObj || products.find(p => p.id === productId);
    if (product) {
      setValue(`items.${index}.rate`, product.sellingPrice || 0);
      setValue(`items.${index}.description`, product.description || product.name || '');
      setValue(`items.${index}.taxPercent`, product.taxRate || product.gstRate || 18);
      // Auto-populate unit from product master
      const mappedUnit = typeof product.unit === 'string' ? mapUnit(product.unit) : 'Pcs';
      setValue(`items.${index}.unit`, mappedUnit);
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
        businessPartnerId: data.customerId,
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
        items: data.items.map(item => {
          const discountPercent = Number(item.discount) || 0;
          const rate = Number(item.rate);
          const originalLineTotal = rate * Number(item.qty);
          const lineDiscount = originalLineTotal * (discountPercent / 100);
          const finalTaxableRate = (originalLineTotal - lineDiscount) / Number(item.qty);

          return {
            productId: item.productId,
            description: discountPercent > 0
              ? `${item.description || ''} (Discount ${discountPercent}%)`
              : item.description,
            qty: Number(item.qty),
            rate: finalTaxableRate,
            taxPercent: (data.invoiceType === 'NO_TAX' || docType === 'BILL_OF_SUPPLY' || docType === 'EXEMPT_SUPPLY' || docType === 'NIL_RATED_INVOICE' || docType === 'EXPORT_INVOICE') ? 0 : Number(item.taxPercent),
          };
        }),
        notes: data.notes,
        termsConditions: data.termsConditions,
      };

      let endpoint = '/sales/invoices';
      if (docType === 'QUOTATION') endpoint = '/sales/quotations';
      
      const actualPayload: any = {
        ...payload,
        documentType: docType === 'INVOICE' ? backendType : docType,
      };
      if (docType === 'QUOTATION') actualPayload.quotationNo = data.invoiceNo?.trim() || undefined;
      if (docType === 'PROFORMA') actualPayload.invoiceType = 'PROFORMA_INVOICE';
      if (docType === 'BILL_OF_SUPPLY') actualPayload.invoiceType = 'BILL_OF_SUPPLY';
      if (docType === 'EXEMPT_SUPPLY') actualPayload.invoiceType = 'EXEMPT_SUPPLY';
      if (docType === 'NIL_RATED_INVOICE') actualPayload.invoiceType = 'NIL_RATED_INVOICE';
      if (docType === 'EXPORT_INVOICE') actualPayload.invoiceType = 'EXPORT_INVOICE';
      if (docType === 'SEZ_INVOICE') actualPayload.invoiceType = 'SEZ_INVOICE';
      if (docType === 'DEBIT_NOTE') actualPayload.invoiceType = 'DEBIT_NOTE';
      if (docType === 'CREDIT_NOTE') actualPayload.invoiceType = 'CREDIT_NOTE';
      
      let resPayload: any;
      if (isEditMode) {
        const updatedDoc: any = await apiClient.put(`/sales/invoices/${id}`, actualPayload);
        resPayload = updatedDoc?.data?.data || updatedDoc?.data || updatedDoc;
        await erpInvalidate.invoice(queryClient, {
          customerId: data.customerId,
          invoiceId: id,
        });
        sessionStorage.removeItem(FORM_STORAGE_KEY);
        notification.success(
          submitStatus === 'DRAFT'
            ? 'Draft updated successfully!'
            : 'Draft finalized and invoice issued successfully!'
        );
        navigate(`/invoices/${id}`);
        return;
      }

      const createdDoc: any = await apiClient.post(endpoint, actualPayload);
      resPayload = createdDoc?.data?.data || createdDoc?.data || createdDoc;
      sessionStorage.removeItem(FORM_STORAGE_KEY);
      if (docType === 'QUOTATION') {
        await queryClient.invalidateQueries({ queryKey: ['quotations'] });
        await queryClient.invalidateQueries({ queryKey: ['quotations-summary'] });
      } else {
        await erpInvalidate.invoice(queryClient, {
          customerId: data.customerId,
        });
      }
      notification.success(
        submitStatus === 'DRAFT'
          ? `${docType} draft saved successfully!`
          : `${docType} created and issued successfully!`
      );
      if (docType === 'QUOTATION') {
        if (resPayload?.id) {
          navigate(`/quotations/${resPayload.id}`);
        } else {
          navigate('/quotations');
        }
      } else if (resPayload?.id) {
        navigate(`/invoices/${resPayload.id}`);
      } else {
        navigate('/invoices');
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = `Failed to ${isEditMode ? 'update' : 'create'} ${docType.toLowerCase()}`;
      if (err.response?.data?.message) {
        const m = err.response.data.message;
        errorMsg = Array.isArray(m) ? m.join(', ') : m;
      } else if (err.response?.data?.errors) {
        const errs = err.response.data.errors;
        errorMsg = typeof errs === 'object' ? Object.values(errs).flat().join(', ') : String(errs);
      } else if (err.message) {
        errorMsg = err.message;
      }
      notification.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (meError) refetchMe();
    if (custError) refetchCust();
    if (prodError) refetchProd();
    if (unitsError) refetchUnits();
    if (nextNoError) refetchNextNo();
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="7xl">
        <PageLoader title="Loading Document Form..." description="Fetching customer list, item catalog, and next sequence number..." />
      </PageContainer>
    );
  }

  if (hasError) {
    return (
      <PageContainer maxWidth="7xl">
        <div className="glass-panel p-8 rounded-2xl border border-border text-center space-y-4 max-w-md mx-auto mt-12 shadow-sm bg-surface">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mx-auto text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {errorDetails.length === 1 ? errorDetails[0] : "Failed to Load Master Data"}
          </h2>
          <div className="text-xs text-muted-foreground leading-relaxed space-y-2 text-left bg-muted/40 p-3.5 rounded-xl border border-border/60">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Required Data Check:</p>
            <ul className="list-disc list-inside space-y-1">
              {errorDetails.map((err, idx) => (
                <li key={idx} className="text-red-500 dark:text-red-400 font-medium">{err}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-semibold tracking-wider transition-colors cursor-pointer shadow-sm"
          >
            Retry Loading
          </button>
        </div>
      </PageContainer>
    );
  }

  const selectedCustomerName = customers.find(c => c.id === customerId)?.name || 'N/A';
  const selectedCustomerAddress = customers.find(c => c.id === customerId)?.address || 'N/A';

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title={isEditMode ? `Edit Draft: ${draftData?.invoiceNo || 'Draft'}` : `Create ${docType.replace('_', ' ')}`}
        description={isEditMode ? 'Modify unposted draft invoice and line items before final issuance' : `Draft or issue a premium ${docType.toLowerCase().replace('_', ' ')}`}
        backTo={{ label: 'Documents', path: docType === 'QUOTATION' ? '/quotations' : '/invoices' }}
      />

      {savedFormState && (
        <div className="mb-6 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-950 dark:text-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Unsaved Form Entries Recovered</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                You have unsaved line items or customer data from a previous session. Would you like to restore them?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleRestoreSavedForm}
              variant="primary"
              size="sm"
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restore Entries
            </Button>
            <Button
              type="button"
              onClick={handleDiscardSavedForm}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit(onSubmit)} className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
          {/* Main Details Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-6 text-left shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <FileText className="w-5 h-5 text-accent animate-pulse" />
              <h3 className="font-semibold text-lg text-foreground">General Settings</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Document Type *</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as SalesDocumentType)}
                    className="w-full px-4 py-2.5 bg-accent/5 border border-accent/20 rounded-xl text-sm font-bold text-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <option value="INVOICE">Sales Invoice (GST)</option>
                    <option value="BILL_OF_SUPPLY">Bill of Supply (Non-GST)</option>
                    <option value="EXEMPT_SUPPLY">Exempt Supply</option>
                    <option value="NIL_RATED_INVOICE">Nil Rated Invoice</option>
                    <option value="EXPORT_INVOICE">Export Invoice</option>
                    <option value="SEZ_INVOICE">SEZ Invoice</option>
                    <option value="PROFORMA">Proforma Invoice</option>
                    <option value="QUOTATION">Quotation</option>
                    <option value="CREDIT_NOTE">Credit Note</option>
                    <option value="DEBIT_NOTE">Debit Note</option>
                    <option value="DELIVERY_CHALLAN">Delivery Challan</option>
                    <option value="SALES_ORDER">Sales Order</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tax Mode</label>
                  <select {...register('invoiceType')} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="B2B">B2B (Tax Invoice)</option>
                    <option value="B2C">B2C (Retail Invoice)</option>
                    <option value="NO_TAX">No Tax (Bill of Supply)</option>
                  </select>
                </div>

                <div>
                  <SearchableSelect
                    label="Invoice Category"
                    value={watch('invoiceCategoryId') || ''}
                    onChange={(selectedId) => {
                      setValue('invoiceCategoryId', selectedId);
                      const cat = categories.find((c: any) => c.id === selectedId);
                      if (cat) {
                        if (cat.defaultTaxTreatmentId) setValue('taxTreatmentId', cat.defaultTaxTreatmentId);
                        if (cat.defaultNumberingSeriesId) setValue('numberingSeriesId', cat.defaultNumberingSeriesId);
                      }
                    }}
                    options={categories}
                    mapOption={(c) => ({
                      label: `${c.name} (${c.code})`,
                      value: c.id,
                      description: c.description || undefined,
                    })}
                    placeholder="Standard / Default"
                    searchPlaceholder="Search category..."
                    allowClear
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <SearchableSelect
                  label="Customer"
                  value={watch('customerId') || ''}
                  onChange={(val) => {
                    setValue('customerId', val, { shouldValidate: true });
                  }}
                  disabled={custLoading}
                  isLoading={custLoading}
                  options={customers}
                  mapOption={(c) => ({
                    label: `${c.name || 'Unnamed'}${c.gstNumber || c.gstin ? ` (${c.gstNumber || c.gstin})` : ''}`,
                    value: c.id,
                    description: c.phone || c.email || (c.city ? `${c.city}, ${c.state || ''}` : c.state) || undefined,
                  })}
                  placeholder="Select Customer..."
                  searchPlaceholder="Search customer by name, GSTIN, phone..."
                  error={errors.customerId?.message as string}
                  required
                  quickCreateEntity="customer"
                />
                <FormErrorDisplay error={errors.customerId} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document # *</label>
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await refetchNextNo();
                        if (res.data?.nextNumber) {
                          setValue('invoiceNo', res.data.nextNumber);
                          notification.info(`Assigned next available sequence: ${res.data.nextNumber}`);
                        }
                      }}
                      className="text-[11px] text-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      title="Fetch next available document number"
                    >
                      <RefreshCw className="w-3 h-3" /> Get Next #
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  {...register('invoiceNo')}
                  placeholder="DOC-XXXXX"
                  disabled={!isEditMode && nextNoLoading}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:opacity-50"
                />
                <FormErrorDisplay error={errors.invoiceNo} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice Date *</label>
                <input type="date" {...register('date')} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                <FormErrorDisplay error={errors.date} />
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
                    {(invoiceType !== 'NO_TAX' && docType !== 'BILL_OF_SUPPLY' && docType !== 'EXEMPT_SUPPLY' && docType !== 'NIL_RATED_INVOICE' && docType !== 'EXPORT_INVOICE') && <th className="pb-3 font-semibold text-right w-24">GST %</th>}
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
                    const isNonGst = invoiceType === 'NO_TAX' || docType === 'BILL_OF_SUPPLY' || docType === 'EXEMPT_SUPPLY' || docType === 'NIL_RATED_INVOICE' || docType === 'EXPORT_INVOICE';
                    const taxAmount = isNonGst ? 0 : (taxableValue * taxPercent) / 100;
                    const rowTotal = taxableValue + taxAmount;

                    return (
                      <tr key={field.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 pr-4">
                          <SearchableSelect
                            value={watch(`items.${index}.productId`) || ''}
                            onChange={(val, item) => {
                              setValue(`items.${index}.productId`, val, { shouldValidate: true, shouldDirty: true });
                              handleProductSelect(index, val, item);
                            }}
                            options={products}
                            mapOption={(p) => {
                              const stock = p.stocks ? p.stocks.reduce((acc: number, s: any) => acc + Number(s.quantity || 0), 0) : 0;
                              return {
                                value: p.id,
                                label: p.name,
                                subLabel: [p.sku ? `SKU: ${p.sku}` : null, p.hsnCode ? `HSN: ${p.hsnCode}` : null, `Stock: ${stock}`].filter(Boolean).join(' • '),
                                searchKeywords: [p.sku, p.hsnCode, p.barcode].filter(Boolean),
                              };
                            }}
                            placeholder={prodLoading ? "Loading items..." : "Select Item..."}
                            searchPlaceholder="Search by item name, SKU, HSN..."
                            isLoading={prodLoading}
                            triggerClassName="w-full text-sm"
                            clearable
                            quickCreateEntity="product"
                            onQuickCreated={(newProd) => {
                              setValue(`items.${index}.productId`, newProd.id, { shouldValidate: true, shouldDirty: true });
                              handleProductSelect(index, newProd.id, newProd);
                            }}
                          />
                          {errors.items?.[index]?.productId && <p className="text-red-500 text-xs mt-1">{errors.items[index].productId?.message}</p>}

                          {(() => {
                            const prodId = watch(`items.${index}.productId`);
                            const pObj = products.find(p => p.id === prodId);
                            if (!pObj) return null;
                            const totalStock = pObj.stocks ? pObj.stocks.reduce((acc: number, s: any) => acc + Number(s.quantity || 0), 0) : 0;
                            return (
                              <div className="text-[10px] text-muted-foreground mt-1 flex gap-2 pl-1 select-none">
                                <span>HSN: <strong className="text-foreground">{pObj.hsnCode || 'N/A'}</strong></span>
                                <span>•</span>
                                <span>Stock: <strong className={totalStock > 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>{totalStock}</strong></span>
                              </div>
                            );
                          })()}

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
                        {(invoiceType !== 'NO_TAX' && docType !== 'BILL_OF_SUPPLY' && docType !== 'EXEMPT_SUPPLY' && docType !== 'NIL_RATED_INVOICE' && docType !== 'EXPORT_INVOICE') && (
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

            <div className="pt-6 border-t border-border mt-4">
              <ReferralSection form={form} />
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

            </div>
          </div>
        </div>

        {/* Summary Sidebar & Action Buttons */}
        <div className="w-full xl:w-80 2xl:w-96 shrink-0 sticky top-6 space-y-4">
          <DocumentSummarySidebar
            totals={totals}
            invoiceType={invoiceType}
            docType={docType}
            currencySymbol={currencySymbol}
          />

          {/* Accounting Net Effect Preview */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-accent" /> Accounting Preview
              </h4>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {totals.grandTotal > 0 ? (
                (() => {
                  const isNonGst = docType === 'BILL_OF_SUPPLY' || docType === 'EXEMPT_SUPPLY' || docType === 'NIL_RATED_INVOICE' || docType === 'EXPORT_INVOICE' || invoiceType === 'NO_TAX';
                  return (
                    <>
                  <div className="flex justify-between items-center text-foreground font-medium">
                    <div className="flex flex-col">
                      <span>Accounts Receivable ({selectedCustomerName})</span>
                      <span className="text-[10px] text-muted-foreground uppercase">Asset • Debit</span>
                    </div>
                    <span className="text-green-600 font-bold">+{currencySymbol}{totals.grandTotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-foreground font-medium border-t border-border/50 pt-3">
                    <div className="flex flex-col pl-4">
                      <span>Sales Revenue</span>
                      <span className="text-[10px] text-muted-foreground uppercase">Income • Credit</span>
                    </div>
                    <span className="text-red-500 font-bold">{currencySymbol}{totals.subTotal.toFixed(2)}</span>
                  </div>

                  {!isNonGst && !totals.isInterState && totals.cgstTotal > 0 && (
                    <div className="flex justify-between items-center text-foreground font-medium border-t border-border/50 pt-3">
                      <div className="flex flex-col pl-4">
                        <span>CGST Output</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Liability • Credit</span>
                      </div>
                      <span className="text-red-500 font-bold">{currencySymbol}{totals.cgstTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {!isNonGst && !totals.isInterState && totals.sgstTotal > 0 && (
                    <div className="flex justify-between items-center text-foreground font-medium border-t border-border/50 pt-3">
                      <div className="flex flex-col pl-4">
                        <span>SGST Output</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Liability • Credit</span>
                      </div>
                      <span className="text-red-500 font-bold">{currencySymbol}{totals.sgstTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {!isNonGst && totals.isInterState && totals.igstTotal > 0 && (
                    <div className="flex justify-between items-center text-foreground font-medium border-t border-border/50 pt-3">
                      <div className="flex flex-col pl-4">
                        <span>IGST Output</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Liability • Credit</span>
                      </div>
                      <span className="text-red-500 font-bold">{currencySymbol}{totals.igstTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {totals.roundOff !== 0 && (
                    <div className="flex justify-between items-center text-foreground font-medium border-t border-border/50 pt-3">
                      <div className="flex flex-col pl-4">
                        <span>Round Off</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Expense/Income • {totals.roundOff > 0 ? 'Credit' : 'Debit'}</span>
                      </div>
                      <span className={totals.roundOff > 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>{currencySymbol}{Math.abs(totals.roundOff).toFixed(2)}</span>
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            <div className="text-muted-foreground text-center py-6 text-xs italic">
                  Add items to see the accounting impact.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              onClick={() => setSubmitStatus('SENT')}
              className="w-full justify-center px-6 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && submitStatus === 'SENT' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditMode ? 'Issuing Invoice...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditMode ? 'Finalize & Issue Invoice' : 'Save & Issue Invoice'}
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              onClick={() => setSubmitStatus('DRAFT')}
              className="w-full justify-center px-6 py-2.5 rounded-xl border border-accent/20 bg-accent/5 hover:bg-accent/10 text-accent text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && submitStatus === 'DRAFT' && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditMode ? 'Update Draft' : 'Save Draft'}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="w-full justify-center px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-secondary text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-muted-foreground" />
                Preview
              </button>

              <button
                type="button"
                onClick={() => navigate('/invoices')}
                className="w-full justify-center px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-secondary text-sm font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
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
                    {invoiceType === 'NO_TAX' ? 'Bill of Supply' : docType.replace('_', ' ')}
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
                    <span className="text-sm font-bold text-foreground">DOC-XXXXX (Auto)</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-muted-foreground uppercase tracking-wider">Document Date</span>
                    <span className="text-sm font-semibold text-foreground">{invoiceDate || 'N/A'}</span>
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
    </PageContainer>
  );
};
