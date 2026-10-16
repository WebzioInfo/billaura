import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  CreditCard,
  Settings,
  X,
  RefreshCw,
  HelpCircle,
  Plus,
} from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
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

const vcItemSchema = z.object({
  productId: z.string().optional(),
  accountId: z.string().optional(),
  description: z.string().optional(),
  qty: z.coerce.number().min(0.0001, 'Qty must be > 0'),
  rate: z.coerce.number().min(0, 'Rate must be >= 0'),
  taxPercent: z.coerce.number().min(0).default(18),
  discount: z.coerce.number().min(0).default(0),
  unit: z.string().optional(),
});

const vcSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  creditNoteNo: z.string().min(1, 'Credit Note# is required'),
  orderNumber: z.string().optional(),
  date: z.string().min(1, 'Vendor Credit Date is required'),
  subject: z.string().optional(),
  isRcm: z.boolean().default(false),
  notes: z.string().optional(),
  adjustment: z.coerce.number().default(0),
  tdsTcsType: z.enum(['NONE', 'TDS', 'TCS']).default('NONE'),
  tdsTcsAmount: z.coerce.number().default(0),
  items: z.array(vcItemSchema).min(1, 'At least one line item is required'),
});

type VCFormValues = z.infer<typeof vcSchema>;

export const VendorCreditForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'DRAFT' | 'OPEN'>('OPEN');
  const [attachedFiles, setAttachedFiles] = useState<AttachmentFile[]>([]);

  const form = useForm<VCFormValues>({
    resolver: zodResolver(vcSchema) as any,
    defaultValues: {
      vendorId: '',
      creditNoteNo: '',
      orderNumber: '',
      date: new Date().toISOString().split('T')[0],
      subject: '',
      isRcm: false,
      notes: '',
      adjustment: 0,
      tdsTcsType: 'NONE',
      tdsTcsAmount: 0,
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

  // Queries
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

  const { data: nextNoData } = useQuery<any>({
    queryKey: ['vendor-credits', 'next-number'],
    queryFn: () => apiClient.get('/purchases/next-number?type=DEBIT_NOTE').catch(() => ({ nextNumber: `DN-${Date.now().toString().slice(-5)}` })),
    staleTime: 0,
  });

  const vendors = useMemo(() => ensureArray(vendorsData), [vendorsData]);
  const products = useMemo(() => ensureArray(productsData), [productsData]);
  const accounts = useMemo(() => ensureArray(accountsData), [accountsData]);

  useEffect(() => {
    if (!isEditMode && nextNoData?.nextNumber && !watch('creditNoteNo')) {
      setValue('creditNoteNo', nextNoData.nextNumber);
    }
  }, [nextNoData, isEditMode, setValue, watch]);

  const vendorId = watch('vendorId');
  const items = useWatch({ control, name: 'items' }) || [];
  const adjustmentValue = watch('adjustment') || 0;
  const tdsTcsType = watch('tdsTcsType') || 'NONE';
  const tdsTcsAmount = watch('tdsTcsAmount') || 0;

  const selectedVendor = useMemo(() => {
    return vendors.find((v: any) => v.id === vendorId);
  }, [vendorId, vendors]);

  // Calculations
  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
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
      discountTotal += lineDisc;
      taxTotal += lineTax;
      totalQty += qty;
    });

    let exactGrandTotal = subtotal + taxTotal + Number(adjustmentValue || 0);
    if (tdsTcsType === 'TDS') exactGrandTotal -= Number(tdsTcsAmount || 0);
    if (tdsTcsType === 'TCS') exactGrandTotal += Number(tdsTcsAmount || 0);

    const roundedGrandTotal = Math.round(exactGrandTotal);
    const roundOff = roundedGrandTotal - exactGrandTotal;

    return {
      subtotal,
      discountTotal,
      taxTotal,
      roundOff,
      grandTotal: roundedGrandTotal,
      totalQty,
    };
  }, [items, adjustmentValue, tdsTcsType, tdsTcsAmount]);

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

  const onSubmit = async (data: VCFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        vendorId: data.vendorId,
        purchaseNo: data.creditNoteNo.trim(),
        reference: data.orderNumber || undefined,
        date: new Date(data.date).toISOString(),
        invoiceType: 'DEBIT_NOTE',
        isRcm: data.isRcm,
        subject: data.subject,
        notes: data.notes,
        status: submitStatus === 'DRAFT' ? 'DRAFT' : 'OPEN',
        adjustment: data.adjustment,
        items: data.items.map((it) => ({
          productId: it.productId || undefined,
          accountId: it.accountId || undefined,
          description: it.description || '',
          qty: Number(it.qty),
          rate: Number(it.rate),
          taxPercent: Number(it.taxPercent),
          discount: Number(it.discount),
        })),
      };

      await apiClient.post('/purchases', payload);
      notification.success(submitStatus === 'DRAFT' ? 'Vendor credit draft saved' : 'Vendor credit created successfully');
      await queryClient.invalidateQueries({ queryKey: ['vendor-credits'] });
      navigate('/debit-notes');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to save vendor credit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingVendors || loadingProducts) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <PageLoader title="Loading Vendor Credit Form..." description="Fetching vendors and accounts..." />
      </div>
    );
  }

  const headerBand = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <label className="text-xs font-semibold text-[#2B2F36] w-36 shrink-0 flex items-center gap-1">
        Vendor Name <span className="text-[#E54B4B]">*</span>
      </label>
      <div className="flex-1 max-w-lg">
        <SearchableSelect
          value={watch('vendorId') || ''}
          onChange={(val) => setValue('vendorId', val, { shouldValidate: true })}
          options={vendors}
          mapOption={(v) => ({
            label: `${v.name || 'Unnamed'}${v.gstNumber || v.gstin ? ` (${v.gstNumber || v.gstin})` : ''}`,
            value: v.id,
            description: v.phone || v.email || v.address || undefined,
          })}
          placeholder="Select a Vendor"
          searchPlaceholder="Search vendor by name, phone..."
          required
          quickCreateEntity="vendor"
        />
      </div>
    </div>
  );

  const fieldsGrid = (
    <div className="space-y-4">
      {/* Credit Note# + Order Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5 flex items-center justify-between">
            <span>Credit Note# <span className="text-[#E54B4B]">*</span></span>
            <button
              type="button"
              onClick={async () => {
                const res = await apiClient.get('/purchases/next-number?type=DEBIT_NOTE').catch(() => ({ data: {} }));
                if (res.data?.nextNumber) setValue('creditNoteNo', res.data.nextNumber);
              }}
              className="text-[11px] text-[#408DFB] hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </label>
          <input
            type="text"
            {...register('creditNoteNo')}
            placeholder="DN-00001"
            className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
            Order Number
          </label>
          <input
            type="text"
            {...register('orderNumber')}
            placeholder="PO or Bill reference"
            className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
        </div>
      </div>

      {/* Vendor Credit Date */}
      <div className="max-w-md">
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
          Vendor Credit Date <span className="text-[#E54B4B]">*</span>
        </label>
        <input
          type="date"
          {...register('date')}
          className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
        />
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
          Subject
        </label>
        <textarea
          rows={2}
          {...register('subject')}
          placeholder="Reason for vendor credit or purchase return..."
          className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
        />
      </div>

      {/* Reverse Charge Checkbox */}
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
    </div>
  );

  const itemTable = (
    <ZohoItemTable
      items={zohoItems}
      onChange={handleZohoItemsChange}
      onAddItem={() => append({ productId: '', accountId: '', description: '', qty: 1, rate: 0, taxPercent: 18, discount: 0, unit: 'Pcs' })}
      products={products}
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

  const totalsBox = (
    <ZohoTotalsBox
      subtotal={totals.subtotal}
      taxLines={[{ label: 'Tax Total', amount: totals.taxTotal }]}
      tdsTcsType={tdsTcsType}
      tdsTcsAmount={tdsTcsAmount}
      onTdsTcsChange={(t, v) => {
        setValue('tdsTcsType', t);
        setValue('tdsTcsAmount', v);
      }}
      adjustment={adjustmentValue}
      onAdjustmentChange={(v) => setValue('adjustment', v)}
      roundOff={totals.roundOff}
      total={totals.grandTotal}
    />
  );

  const notesAndTerms = (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
          Notes
        </label>
        <textarea
          rows={2}
          {...register('notes')}
          placeholder="Notes about this vendor credit..."
          className="w-full bg-white border border-[#CBD5E1] rounded-[4px] p-2.5 text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#2B2F36] mb-1">
          Attach File(s) to Vendor Credits
        </label>
        <ZohoAttachmentUploader
          files={attachedFiles}
          onUpload={(files) => {
            if (!files) return;
            const newFiles = Array.from(files).map((f) => ({ name: f.name, size: f.size, type: f.type }));
            setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 5));
          }}
          onRemove={(idx) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
          maxFiles={5}
          maxSizeMB={10}
        />
      </div>
    </div>
  );

  const footer = (
    <ZohoFormFooter
      primaryActions={[
        {
          label: 'Save as Open',
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
          onClick: () => navigate('/debit-notes'),
        },
      ]}
      totalSummary={{
        totalAmount: totals.grandTotal,
        totalQuantity: totals.totalQty,
      }}
    />
  );

  return (
    <ZohoTransactionForm
      title={isEditMode ? 'Edit Vendor Credit' : 'New Vendor Credit'}
      icon={CreditCard}
      onClose={() => navigate('/debit-notes')}
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
  );
};

export default VendorCreditForm;
