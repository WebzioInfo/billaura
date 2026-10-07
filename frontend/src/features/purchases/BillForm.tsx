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
import { Button, Input, Select, FormErrorDisplay, SearchableSelect, PageLoader } from '@/shared/components/ui';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { useAsyncForm } from '@/shared/hooks/useAsyncForm';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BillDocumentUpload, UploadedBillDocument } from './components/BillDocumentUpload';
import { BillOcrReviewViewer } from './components/BillOcrReviewViewer';
import { BillOcrReviewModal, OcrReviewItem } from './components/BillOcrReviewModal';
import { OcrVerificationBanner } from './components/OcrVerificationBanner';
import { OcrFieldBadge } from './components/OcrFieldBadge';

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
  originalExtractedDescription?: string; // Exact invoice description preserved
  classification?: string;
  matchStatus?: 'EXISTING' | 'NEW' | 'SKIPPED' | 'NEEDS_REVIEW';
  createAsNewProduct?: boolean;
  newProductData?: {
    name: string;
    description?: string;
    itemType: 'FINISHED_GOOD' | 'RAW_MATERIAL' | 'SERVICE';
    hsnCode?: string;
    gstRate: number;
    unit: string;
    isInventoryItem: boolean;
  };
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

  // OCR Document, Extraction, & Verification State
  const [ocrDocument, setOcrDocument] = useState<UploadedBillDocument | null>(null);
  const [ocrExtraction, setOcrExtraction] = useState<any | null>(null);
  const [isOcrAssisted, setIsOcrAssisted] = useState(false);
  const [isOcrVerified, setIsOcrVerified] = useState(false);
  const [fieldTracking, setFieldTracking] = useState<Record<string, { status: 'extracted' | 'modified' | 'unmodified'; confidence?: number }>>({});

  // Document Review Viewer Modal State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<{ url: string; fileName: string; mimeType: string }>({
    url: '',
    fileName: '',
    mimeType: '',
  });

  const markFieldModified = (fieldName: string) => {
    setFieldTracking(prev => {
      if (prev[fieldName]?.status === 'extracted') {
        return { ...prev, [fieldName]: { status: 'modified' } };
      }
      return prev;
    });
  };
  
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
  const { data: vendors = [], isLoading: loadingVendors, isError: errorVendors, refetch: refetchVendors } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/vendors');
      return ensureArray<Vendor>(res);
    }
  });

  const { data: products = [], isLoading: loadingProducts, isError: errorProducts, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products');
      return ensureArray<Product>(res);
    }
  });

  const { data: warehouses = [], isLoading: loadingWarehouses, isError: errorWarehouses, refetch: refetchWarehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      return ensureArray<Warehouse>(res);
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

    // Populate source invoice document attachment if present
    if (existingBill.attachments && Array.isArray(existingBill.attachments) && existingBill.attachments.length > 0) {
      const att = existingBill.attachments[0];
      setOcrDocument(att);
      if (att.ocrData) {
        setOcrExtraction(att.ocrData);
        setIsOcrAssisted(true);
        setIsOcrVerified(true);
      }
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

  // Handle successful OCR extraction and form auto-fill
  const handleOcrExtractionSuccess = (extractionData: any, doc: UploadedBillDocument) => {
    setOcrDocument(doc);
    if (!extractionData) return;

    setOcrExtraction(extractionData);
    setIsOcrAssisted(true);
    setIsOcrVerified(false); // Explicit manual verification required!

    const newTracking: Record<string, { status: 'extracted' | 'modified' | 'unmodified'; confidence?: number }> = {};

    // 1. Auto-fill Reference / Invoice Number
    if (extractionData.invoice?.invoiceNumber?.value) {
      setValue('reference', extractionData.invoice.invoiceNumber.value, { shouldDirty: true });
      newTracking.reference = { status: 'extracted', confidence: extractionData.invoice.invoiceNumber.confidence };
    }

    // 2. Auto-fill Billing Date
    if (extractionData.invoice?.invoiceDate?.value) {
      setValue('date', extractionData.invoice.invoiceDate.value, { shouldDirty: true });
      newTracking.date = { status: 'extracted', confidence: extractionData.invoice.invoiceDate.confidence };
    }

    // 3. Auto-fill Due Date
    if (extractionData.invoice?.dueDate?.value) {
      setValue('dueDate', extractionData.invoice.dueDate.value, { shouldDirty: true });
      newTracking.dueDate = { status: 'extracted', confidence: extractionData.invoice.dueDate.confidence };
    }

    // 4. Auto-fill Place of Supply
    if (extractionData.vendor?.state?.value) {
      setValue('placeOfSupply', extractionData.vendor.state.value, { shouldDirty: true });
      newTracking.placeOfSupply = { status: 'extracted', confidence: extractionData.vendor.state.confidence };
    }

    // 5. Auto-set Tax Mode
    if (extractionData.taxes?.igst?.value > 0) {
      setTaxMode('IGST');
    } else {
      setTaxMode('CGST_SGST');
    }

    // 6. RCM
    if (extractionData.taxes?.isRcm?.value) {
      setIsRcm(true);
    }

    // 7. Auto-fill Vendor if matched
    if (extractionData.matchedVendor?.id) {
      setValue('vendorId', extractionData.matchedVendor.id, { shouldValidate: true, shouldDirty: true });
      newTracking.vendor = { status: 'extracted', confidence: extractionData.matchedVendor.confidence };
      const v = vendors.find(item => item.id === extractionData.matchedVendor.id);
      if (v?.address) {
        setValue('billingAddress', v.address, { shouldDirty: true });
        setValue('shippingAddress', v.address, { shouldDirty: true });
      }
    } else {
      newTracking.vendor = { status: 'extracted', confidence: extractionData.vendor?.name?.confidence || 0.4 };
    }

    // 8. Auto-fill Line items
    if (extractionData.items && Array.isArray(extractionData.items) && extractionData.items.length > 0) {
      const mappedItems: FormLineItem[] = extractionData.items.map((item: any, idx: number) => {
        let pId = item.matchedProductId || '';
        let hsn = item.hsnSac?.value || 'N/A';
        let unit = item.unit?.value || 'PCS';
        let rate = Number(item.rate?.value || 0);
        let taxPercent = Number(item.gstRate?.value !== undefined ? item.gstRate.value : 18);

        if (pId) {
          const p = products.find(prod => prod.id === pId);
          if (p) {
            hsn = p.hsnCode || hsn;
            unit = p.unit || unit;
            if (rate === 0) rate = Number(p.purchasePrice || 0);
            if (item.gstRate?.value === undefined) taxPercent = Number(p.gstRate || 18);
          }
        }

        newTracking[`item_${idx}`] = { status: 'extracted', confidence: item.name?.confidence || 0.8 };

        return {
          keyId: `ocr-item-${idx}-${Date.now()}`,
          productId: pId,
          description: item.name?.value || item.extractedDescription || '',
          originalExtractedDescription: item.extractedDescription || item.name?.value || '',
          classification: item.classification || 'PRODUCT',
          matchStatus: item.matchStatus || (pId ? 'EXISTING' : 'NEW'),
          createAsNewProduct: false,
          newProductData: item.candidateProduct,
          hsnCode: hsn,
          qty: Number(item.quantity?.value || 1),
          unit,
          rate,
          discount: Number(item.discount?.value || 0),
          taxPercent,
          warehouseId: warehouseId || '',
        };
      });
      setItems(mappedItems);
    }

    setFieldTracking(newTracking);
    // Automatically open the side-by-side OCR Review Modal for instant visual verification
    setIsReviewModalOpen(true);
  };

  const handleApplyVerification = (verifiedItems: OcrReviewItem[]) => {
    setIsOcrVerified(true);
    const mapped: FormLineItem[] = verifiedItems.map((v, idx) => ({
      keyId: `verified-item-${idx}-${Date.now()}`,
      productId: v.matchedProductId || '',
      description: v.name || v.extractedDescription,
      originalExtractedDescription: v.extractedDescription,
      classification: v.classification,
      matchStatus: v.matchStatus,
      createAsNewProduct: v.createAsNewProduct,
      newProductData: v.newProductData,
      hsnCode: v.hsnSac && v.hsnSac !== 'N/A' ? v.hsnSac : 'N/A',
      qty: Number(v.qty || 1),
      unit: v.unit || 'PCS',
      rate: Number(v.rate || 0),
      discount: Number(v.discount || 0),
      taxPercent: Number(v.gstRate || 18),
      warehouseId: warehouseId || '',
    }));
    setItems(mapped);
    notification.success('Extracted bill verified and auto-filled into form.');
  };

  const handleDocumentRemoved = () => {
    setOcrDocument(null);
    setOcrExtraction(null);
    setIsOcrAssisted(false);
    setIsOcrVerified(false);
    setFieldTracking({});
    notification.info('Attached vendor bill removed. Form remains editable.');
  };

  // Set default place of supply & addresses when vendor is selected
  const handleVendorChange = (id: string) => {
    setValue('vendorId', id);
    markFieldModified('vendor');
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
  const handleLineChange = (index: number, field: keyof FormLineItem, value: any, itemObj?: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    markFieldModified(`item_${index}`);

    // Auto populate rate/details when product changes
    if (field === 'productId') {
      const p = itemObj || products.find(prod => prod.id === value);
      if (p) {
        updated[index].description = p.name;
        updated[index].hsnCode = p.hsnCode || 'N/A';
        updated[index].rate = Number(p.purchasePrice || p.rate || 0);
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
    onSuccess: async () => {
      notification.success(isEditMode ? 'Vendor bill updated successfully' : 'Vendor bill created successfully');
      await erpInvalidate.purchaseBill(queryClient, {
        vendorId: vendorId || undefined,
      });
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
    const invalidItemIdx = items.findIndex(i => !i.productId && !i.description && !i.originalExtractedDescription);
    if (invalidItemIdx !== -1) {
      notification.error(`Please select a product or enter description for line item ${invalidItemIdx + 1}`);
      return;
    }
    const zeroQtyIdx = items.findIndex(i => Number(i.qty) <= 0);
    if (zeroQtyIdx !== -1) {
      notification.error(`Quantity must be greater than zero for line item ${zeroQtyIdx + 1}`);
      return;
    }

    // Explicit Verification check for AI OCR bills
    if (isOcrAssisted && !isOcrVerified) {
      notification.error('Please verify the extracted bill fields by clicking "Verify & Continue" before saving.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      attachmentId: ocrDocument?.id || undefined,
      gstBreakup: {
        dueDate: data.dueDate || undefined,
        warehouseId: warehouseId || undefined,
        notes: notes || undefined,
        roundOff: totals.roundOff,
        skipStockUpdate: shouldSkipStock || undefined
      },
      items: items.map(i => ({
        productId: i.productId || undefined,
        description: i.description || i.originalExtractedDescription || 'Bill Line Item',
        qty: Number(i.qty),
        rate: Number(i.rate),
        taxPercent: Number(i.taxPercent),
        discount: Number(i.discount),
        createAsNewProduct: Boolean(i.createAsNewProduct),
        newProductData: i.createAsNewProduct ? i.newProductData : undefined,
      }))
    };

    saveMutation.mutate(payload);
  };

  if (loadBillId && loadingExisting) {
    return (
      <PageContainer maxWidth="7xl">
        <PageLoader title="Loading Bill..." description="Fetching bill details, vendor info, and line items..." />
      </PageContainer>
    );
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

        {/* Prominent Vendor Bill Upload Section */}
        <div className="space-y-4">
          <BillDocumentUpload
            currentDocument={ocrDocument}
            onExtractionSuccess={handleOcrExtractionSuccess}
            onDocumentRemoved={handleDocumentRemoved}
            onOpenViewer={(url, fileName, mimeType) => {
              setViewerDoc({ url, fileName, mimeType });
              setIsViewerOpen(true);
            }}
            disabled={saveMutation.isPending}
          />

          {isOcrAssisted && (
            <OcrVerificationBanner
              isVerified={isOcrVerified}
              onVerify={() => setIsOcrVerified(!isOcrVerified)}
              onOpenReview={() => setIsReviewModalOpen(true)}
              onOpenViewer={() => {
                if (ocrDocument?.secureUrl) {
                  setViewerDoc({
                    url: ocrDocument.secureUrl,
                    fileName: ocrDocument.originalFileName,
                    mimeType: ocrDocument.mimeType,
                  });
                  setIsViewerOpen(true);
                }
              }}
              ocrTotal={ocrExtraction?.totals?.grandTotal?.value}
              calculatedTotal={totals.grandTotal}
              warnings={ocrExtraction?.warnings}
              duplicateInfo={ocrExtraction?.duplicateCheck}
              matchedVendorName={ocrExtraction?.matchedVendor?.name}
            />
          )}
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
                  <div className="flex items-center justify-between pb-0.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Vendor / Supplier <span className="text-red-500">*</span>
                    </label>
                    <OcrFieldBadge
                      status={fieldTracking.vendor?.status}
                      confidence={fieldTracking.vendor?.confidence}
                    />
                  </div>
                  <SearchableSelect
                    required
                    value={vendorId || ''}
                    onChange={(val) => {
                      setValue('vendorId', val, { shouldValidate: true, shouldDirty: true });
                      handleVendorChange(val);
                    }}
                    options={vendors}
                    mapOption={(v) => ({
                      value: v.id,
                      label: v.name,
                      subLabel: [v.gstin, v.state].filter(Boolean).join(' • '),
                      searchKeywords: [v.gstin, v.state].filter(Boolean),
                    })}
                    placeholder="Select Vendor"
                    searchPlaceholder="Search vendors by name, GSTIN..."
                    clearable
                    isLoading={loadingVendors}
                    isError={errorVendors}
                    onRetry={() => refetchVendors()}
                    quickCreateEntity="vendor"
                    onQuickCreated={(newVendor) => {
                      handleVendorChange(newVendor.id);
                      refetchVendors();
                    }}
                  />
                  <FormErrorDisplay error={errors.vendorId} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pb-0.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Place of Supply / State
                    </label>
                    <OcrFieldBadge
                      status={fieldTracking.placeOfSupply?.status}
                      confidence={fieldTracking.placeOfSupply?.confidence}
                    />
                  </div>
                  <Input
                    {...register('placeOfSupply', {
                      onChange: () => markFieldModified('placeOfSupply'),
                    })}
                    placeholder="Auto-filled state code"
                  />
                  <FormErrorDisplay error={errors.placeOfSupply} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pb-0.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Billing Date <span className="text-red-500">*</span>
                    </label>
                    <OcrFieldBadge
                      status={fieldTracking.date?.status}
                      confidence={fieldTracking.date?.confidence}
                    />
                  </div>
                  <Input
                    type="date"
                    required
                    {...register('date', {
                      onChange: () => markFieldModified('date'),
                    })}
                  />
                  <FormErrorDisplay error={errors.date} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pb-0.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Due Date
                    </label>
                    <OcrFieldBadge
                      status={fieldTracking.dueDate?.status}
                      confidence={fieldTracking.dueDate?.confidence}
                    />
                  </div>
                  <Input
                    type="date"
                    {...register('dueDate', {
                      onChange: () => markFieldModified('dueDate'),
                    })}
                  />
                  <FormErrorDisplay error={errors.dueDate} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pb-0.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Vendor Reference / Invoice No
                    </label>
                    <OcrFieldBadge
                      status={fieldTracking.reference?.status}
                      confidence={fieldTracking.reference?.confidence}
                    />
                  </div>
                  <Input
                    {...register('reference', {
                      onChange: () => markFieldModified('reference'),
                    })}
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
                      <div className="flex items-center justify-between border-b border-border/30 pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Item line {index + 1}</span>
                          <OcrFieldBadge
                            status={fieldTracking[`item_${index}`]?.status}
                            confidence={fieldTracking[`item_${index}`]?.confidence}
                          />

                          {/* Matching & Catalog Status Badges */}
                          {item.productId ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                              ✓ Catalog Item
                            </span>
                          ) : item.createAsNewProduct ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
                              + Will Create New Product
                            </span>
                          ) : item.originalExtractedDescription ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                              ⚠ Not in catalog (Bill charge only)
                            </span>
                          ) : null}

                          {/* Raw invoice description badge */}
                          {item.originalExtractedDescription && (
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded truncate max-w-xs" title={`Original invoice description: "${item.originalExtractedDescription}"`}>
                              Invoice: &ldquo;{item.originalExtractedDescription}&rdquo;
                            </span>
                          )}
                        </div>

                        {/* Decision Toggle for non-catalog items */}
                        {!item.productId && (item.originalExtractedDescription || item.description) && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground font-medium">Create product?</span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !item.createAsNewProduct;
                                setItems(prev => {
                                  const copy = [...prev];
                                  copy[index] = {
                                    ...copy[index],
                                    createAsNewProduct: nextVal,
                                    matchStatus: nextVal ? 'NEW' : 'SKIPPED',
                                    newProductData: nextVal && !copy[index].newProductData ? {
                                      name: copy[index].description || copy[index].originalExtractedDescription || 'New Product',
                                      description: copy[index].originalExtractedDescription || copy[index].description,
                                      itemType: copy[index].classification === 'SERVICE' ? 'SERVICE' : 'FINISHED_GOOD',
                                      hsnCode: copy[index].hsnCode !== 'N/A' ? copy[index].hsnCode : '',
                                      gstRate: copy[index].taxPercent || 18,
                                      unit: copy[index].unit || 'NOS',
                                      isInventoryItem: copy[index].classification !== 'SERVICE',
                                    } : copy[index].newProductData,
                                  };
                                  return copy;
                                });
                              }}
                              className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                                item.createAsNewProduct
                                  ? 'bg-primary text-primary-foreground shadow-xs'
                                  : 'bg-muted text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {item.createAsNewProduct ? 'Create as New: ON' : 'Create as New: OFF'}
                            </button>
                          </div>
                        )}

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
                          <SearchableSelect
                            value={item.productId || ''}
                            onChange={(val) => handleLineChange(index, 'productId', val)}
                            options={products}
                            mapOption={(p) => ({
                              value: p.id,
                              label: p.name,
                              subLabel: [p.sku ? `SKU: ${p.sku}` : null, p.hsnCode ? `HSN: ${p.hsnCode}` : null].filter(Boolean).join(' • '),
                              searchKeywords: [p.sku, p.hsnCode, p.barcode].filter(Boolean),
                            })}
                            placeholder="Select Product"
                            searchPlaceholder="Search product by name, SKU, HSN..."
                            triggerClassName="w-full text-xs"
                            clearable
                            isLoading={loadingProducts}
                            isError={errorProducts}
                            onRetry={() => refetchProducts()}
                            quickCreateEntity="product"
                            onQuickCreated={(newProd) => {
                              handleLineChange(index, 'productId', newProd.id, newProd);
                              refetchProducts();
                            }}
                          />
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
                  <SearchableSelect
                    value={warehouseId || ''}
                    onChange={(val) => setWarehouseId(val)}
                    options={warehouses}
                    mapOption={(w) => ({
                      value: w.id,
                      label: w.name,
                      subLabel: w.code || w.location || undefined,
                    })}
                    placeholder="Select Warehouse"
                    searchPlaceholder="Search warehouses..."
                    clearable={false}
                    quickCreateEntity="warehouse"
                    onQuickCreated={(newWh) => {
                      setWarehouseId(newWh.id);
                      refetchWarehouses();
                    }}
                  />
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

      {/* Interactive Bill OCR Review Viewer Modal (Source Document Inspection) */}
      <BillOcrReviewViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        documentUrl={viewerDoc.url}
        fileName={viewerDoc.fileName}
        mimeType={viewerDoc.mimeType}
      />

      {/* Dedicated Side-by-Side OCR Verification Review Modal */}
      {ocrDocument && (
        <BillOcrReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          documentUrl={ocrDocument.secureUrl}
          documentName={ocrDocument.originalFileName}
          documentMime={ocrDocument.mimeType}
          vendorName={ocrExtraction?.vendor?.name?.value || ''}
          vendorGstin={ocrExtraction?.vendor?.gstin?.value}
          matchedVendorName={ocrExtraction?.matchedVendor?.name}
          invoiceNumber={reference || ocrExtraction?.invoice?.invoiceNumber?.value || ''}
          invoiceDate={date || ocrExtraction?.invoice?.invoiceDate?.value || ''}
          dueDate={dueDate || ocrExtraction?.invoice?.dueDate?.value}
          subtotal={Number(ocrExtraction?.totals?.subtotal?.value || totals.subtotal)}
          taxTotal={Number(ocrExtraction?.taxes?.totalTax?.value || totals.taxTotal)}
          grandTotal={Number(ocrExtraction?.totals?.grandTotal?.value || totals.grandTotal)}
          items={items.map((it, idx) => ({
            id: it.keyId || `item-${idx}`,
            name: it.description || it.originalExtractedDescription || `Item ${idx + 1}`,
            extractedDescription: it.originalExtractedDescription || it.description || '',
            classification: it.classification || 'PRODUCT',
            matchedProductId: it.productId,
            matchedProductName: products.find(p => p.id === it.productId)?.name,
            matchStatus: it.matchStatus || (it.productId ? 'EXISTING' : (it.createAsNewProduct ? 'NEW' : (it.originalExtractedDescription ? 'SKIPPED' : 'NEEDS_REVIEW'))),
            hsnSac: it.hsnCode,
            qty: it.qty,
            unit: it.unit,
            rate: it.rate,
            discount: it.discount,
            gstRate: it.taxPercent,
            taxAmount: (it.rate * it.qty * it.taxPercent) / 100,
            lineTotal: (it.rate * it.qty) * (1 + it.taxPercent / 100),
            createAsNewProduct: Boolean(it.createAsNewProduct),
            newProductData: it.newProductData,
          }))}
          onApplyVerification={handleApplyVerification}
        />
      )}
    </PageContainer>
  );
};
