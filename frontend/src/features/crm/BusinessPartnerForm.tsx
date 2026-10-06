import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/NotificationService';
import { Save, Loader2 } from 'lucide-react';
import { PageContainer, Section, FormSection } from '@/shared/components/ui/LayoutComponents';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button, Input, Select, AutoGenerateInput, FormErrorDisplay, SearchableSelect } from '@/shared/components/ui';
import apiClient, { ensureArray } from '@/core/api';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';
import { getCustomerDisplayName } from '@/shared/utils/entityNames';
import { useAsyncForm } from '@/shared/hooks/useAsyncForm';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { isValidGstin, isValidPan } from '@/shared/utils/business-rules';

const bpSchema = z.object({
  name: z.string().min(1, 'Customer Name is required'),
  customerCode: z.string().optional(),
  tradeName: z.string().optional(),
  customerType: z.string(),
  gstRegistrationStatus: z.string().optional(),
  taxPreference: z.string().optional(),
  gstin: z.string().optional(),
  panNumber: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  mobile: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  pinCode: z.string().optional(),
  state: z.string().optional(),
  placeOfSupply: z.string().optional(),
  creditLimit: z.string().optional().or(z.number().transform(String)),
  country: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  customerSegmentId: z.string().optional(),
  customerDepartmentId: z.string().optional(),
  openingBalanceType: z.string().optional(),
  openingBalanceAmount: z.string().optional().or(z.number().transform(String)),
  openingBalanceDate: z.string().optional(),
  migrationReferenceNo: z.string().optional(),
  migrationNotes: z.string().optional(),
  previousSoftware: z.string().optional(),
  previousLedgerCode: z.string().optional(),
  isMigrated: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.gstRegistrationStatus === 'REGISTERED' && !data.gstin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GSTIN is required for Registered businesses",
      path: ["gstin"],
    });
  }
  if (data.gstin && !isValidGstin(data.gstin)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)",
      path: ["gstin"],
    });
  }
  if (data.panNumber && !isValidPan(data.panNumber)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid PAN format (e.g. ABCDE1234F)",
      path: ["panNumber"],
    });
  }
  if (data.openingBalanceType && data.openingBalanceType !== 'NONE') {
    const amt = Number(data.openingBalanceAmount || 0);
    if (!data.openingBalanceAmount || isNaN(amt) || amt <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Opening Balance Amount is required and must be greater than 0",
        path: ["openingBalanceAmount"],
      });
    }
  }
});

type BusinessPartnerFormValues = z.infer<typeof bpSchema>;

export const BusinessPartnerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isVendor = window.location.pathname.includes('/vendors');
  const entityType = isVendor ? 'VENDOR' : 'CUSTOMER';
  const entityPath = isVendor ? 'vendors' : 'customers';
  const entityLabel = isVendor ? 'Vendor' : 'Customer';

  const isEditMode = Boolean(id);
  const [b2bMode, setB2bMode] = useState<boolean>(true);

  const { data: customer, isLoading } = useQuery({
    queryKey: [entityPath, id],
    queryFn: async () => {
      const res = await apiClient.get(`/${entityPath}/${id}`);
      return res.data?.data || res.data;
    },
    enabled: isEditMode,
  });

  const { data: segments, isLoading: loadingSegments } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const res = await apiClient.get('/customer-segments');
      return ensureArray(res);
    },
    enabled: !isVendor,
  });

  const { data: departments, isLoading: loadingDepartments } = useQuery({
    queryKey: ['customer-departments'],
    queryFn: async () => {
      const res = await apiClient.get('/customer-departments');
      return ensureArray(res);
    },
    enabled: !isVendor,
  });

  const form = useAsyncForm<BusinessPartnerFormValues>(
    {
      resolver: zodResolver(bpSchema as any) as any,
      defaultValues: {
        name: '',
        customerCode: '',
        tradeName: '',
        customerType: 'B2B',
        gstRegistrationStatus: 'UNREGISTERED',
        taxPreference: 'TAXABLE',
        gstin: '',
        panNumber: '',
        email: '',
        mobile: '',
        whatsapp: '',
        address: '',
        pinCode: '',
        state: '',
        placeOfSupply: '',
        creditLimit: '',
        country: 'India',
        notes: '',
        status: 'ACTIVE',
        customerSegmentId: '',
        customerDepartmentId: '',
        openingBalanceType: 'NONE',
        openingBalanceAmount: '',
        openingBalanceDate: new Date().toISOString().split('T')[0],
        migrationReferenceNo: '',
        migrationNotes: '',
        previousSoftware: '',
        previousLedgerCode: '',
        isMigrated: false,
      }
    },
    customer,
    (data: any) => {
      const isB2b = data.gstRegistrationStatus !== 'UNREGISTERED' || !!data.gstin || !!data.tradeName || data.customerType === 'B2B';
      setB2bMode(isB2b);
      return {
        name: data.name || '',
        customerCode: data.bpCode || '',
        tradeName: data.tradeName || '',
        customerType: data.customerType || 'B2B',
        gstRegistrationStatus: data.gstRegistrationStatus || 'UNREGISTERED',
        taxPreference: data.taxPreference || 'TAXABLE',
        gstin: data.gstin || '',
        panNumber: data.panNumber || '',
        email: data.email || '',
        mobile: data.phone || '',
        whatsapp: data.whatsapp || '',
        address: data.address || '',
        pinCode: data.pinCode || '',
        state: data.state || '',
        placeOfSupply: data.placeOfSupply || '',
        creditLimit: data.creditLimit ? String(data.creditLimit) : '',
        country: data.country || 'India',
        notes: data.notes || '',
        status: data.status || 'ACTIVE',
        customerSegmentId: data.customerSegmentId || '',
        customerDepartmentId: data.customerDepartmentId || '',
        openingBalanceType: data.openingBalanceType || 'NONE',
        openingBalanceAmount: data.openingBalanceAmount ? String(data.openingBalanceAmount) : '',
        openingBalanceDate: data.openingBalanceDate ? new Date(data.openingBalanceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        migrationReferenceNo: data.migrationReferenceNo || '',
        migrationNotes: data.migrationNotes || '',
        previousSoftware: data.previousSoftware || '',
        previousLedgerCode: data.previousLedgerCode || '',
        isMigrated: data.isMigrated || false,
      };
    }
  );

  const [historicalInvoices, setHistoricalInvoices] = useState<any[]>([]);
  
  useEffect(() => {
    if (customer?.historicalInvoices) {
      setHistoricalInvoices(customer.historicalInvoices);
    }
  }, [customer]);

  const { register, handleFormSubmit, setValue, formState: { errors }, watch } = form;

  const watchedObType = watch('openingBalanceType');
  const watchedIsMigrated = watch('isMigrated');

  useEffect(() => {
    if (watchedObType === 'NONE') {
      setValue('openingBalanceAmount', '0');
    } else if (watchedObType === 'DEBIT_BALANCE' || watchedObType === 'CREDIT_BALANCE' || watchedObType === 'RECEIVABLE') {
      setTimeout(() => {
        const amtInput = document.getElementsByName('openingBalanceAmount')[0];
        if (amtInput) {
          amtInput.focus();
        }
      }, 50);
    }
  }, [watchedObType, setValue]);

  const displayName = getCustomerDisplayName(customer);
  useDynamicTitle(isEditMode ? (customer ? `Edit ${displayName}` : `Edit ${entityLabel}`) : `New ${entityLabel}`);

  const saveMutation = useMutation({
    mutationFn: async (data: BusinessPartnerFormValues) => {
      const submitData: any = { ...data, bpCode: data.customerCode };
      if (isVendor) {
        submitData.type = 'VENDOR';
        submitData.vendorCode = data.customerCode;
        submitData.vendorType = data.customerType;
      } else {
        submitData.type = 'CUSTOMER';
        submitData.customerSegmentId = data.customerSegmentId;
        submitData.customerDepartmentId = data.customerDepartmentId;
      }
      if (!b2bMode) {
        submitData.gstRegistrationStatus = 'UNREGISTERED';
        submitData.gstin = '';
        submitData.panNumber = '';
        submitData.tradeName = '';
        submitData.creditLimit = '';
      }
      
      if (isEditMode) {
        return apiClient.patch(`/${entityPath}/${id}`, submitData);
      }
      return apiClient.post(`/${entityPath}`, submitData);
    },
    onSuccess: async (res) => {
      const newId = isEditMode ? id : (res.data?.id || res.data?.data?.id);
      if (isVendor) {
        await erpInvalidate.vendor(queryClient, { vendorId: newId || undefined });
      } else {
        await erpInvalidate.customer(queryClient, { customerId: newId || undefined });
      }
      notification.success(isEditMode ? `${entityLabel} updated successfully` : `${entityLabel} created successfully`);
      navigate(newId ? `/${entityPath}/${newId}` : `/${entityPath}`);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save customer');
    }
  });

  const onSubmit = (data: BusinessPartnerFormValues) => {
    saveMutation.mutate({ ...data, historicalInvoices } as any);
  };

  const handleToggleB2b = (b2b: boolean) => {
    setB2bMode(b2b);
    if (!b2b) {
      setValue('gstRegistrationStatus', 'UNREGISTERED');
      setValue('gstin', '');
      setValue('panNumber', '');
      setValue('tradeName', '');
      setValue('creditLimit', '');
      if (!isEditMode && segments) {
        const defaultB2c = segments.find((s: any) => s.segmentType === 'B2C' && s.isDefault);
        if (defaultB2c) setValue('customerSegmentId', defaultB2c.id);
      }
    } else {
      if (!isEditMode && segments) {
        const defaultB2b = segments.find((s: any) => s.segmentType === 'B2B' && s.isDefault);
        if (defaultB2b) setValue('customerSegmentId', defaultB2b.id);
      }
    }
  };

  if (isEditMode && isLoading) {
    return (
      <PageContainer maxWidth="full" className="w-full px-4 sm:px-6 lg:px-8 py-4 max-w-[1680px] mx-auto">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full" className="w-full px-4 sm:px-6 lg:px-8 py-3.5 space-y-3.5 max-w-[1680px] mx-auto text-left">
      <PageHeader 
        title={isEditMode ? (customer ? `Edit ${displayName}` : `Edit ${entityLabel}`) : `New ${entityLabel}`}
        backTo={{ label: `${entityLabel}s`, path: `/${entityPath}` }}
        secondaryAction={
          !isVendor ? (
            <div className="flex items-center p-0.5 bg-muted/60 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => handleToggleB2b(false)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  !b2bMode
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                B2C Individual
              </button>
              <button
                type="button"
                onClick={() => handleToggleB2b(true)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  b2bMode
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                B2B Business
              </button>
            </div>
          ) : undefined
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => navigate(-1)}
              className="h-8 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              form="customerForm"
              disabled={saveMutation.isPending}
              variant="primary"
              size="sm"
              className="h-8 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isEditMode ? 'Save Changes' : `Create ${entityLabel}`}
            </Button>
          </div>
        }
      />

      <form id="customerForm" onSubmit={handleFormSubmit(onSubmit)} className="space-y-3.5">
        {/* Section 1: Basic Information */}
        <FormSection title="Basic Information" className="p-3.5 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Row 1: Name (8 cols) + Code (4 cols) */}
            <div className="md:col-span-8">
              <Input
                label={`${entityLabel} Name`}
                {...register('name')}
                placeholder={b2bMode ? "Contact Person / Authorized Signatory Name" : "Customer Full Name"}
                required
              />
              <FormErrorDisplay error={errors.name} />
            </div>

            <div className="md:col-span-4">
              <AutoGenerateInput
                label={`${entityLabel} Code`}
                documentType={entityType}
                onGenerate={(code) => setValue('customerCode', code, { shouldValidate: true })}
                {...register('customerCode')}
                error={errors.customerCode?.message as string}
                placeholder="Auto-generated if empty"
              />
            </div>

            {/* Row 2: Customer Segment (6 cols) + Department (6 cols) */}
            {!isVendor && (
              <>
                <div className="md:col-span-6">
                  <SearchableSelect
                    label="Customer Segment"
                    value={watch('customerSegmentId') || ''}
                    onChange={(val) => setValue('customerSegmentId', val, { shouldValidate: true, shouldDirty: true })}
                    options={(segments || []).filter((s: any) => s.isActive && (b2bMode ? s.segmentType !== 'B2C' : s.segmentType !== 'B2B'))}
                    mapOption={(s: any) => ({
                      value: s.id,
                      label: s.name,
                      subLabel: s.code || s.segmentType || undefined,
                    })}
                    placeholder="Select Segment..."
                    searchPlaceholder="Search segments..."
                    isLoading={loadingSegments}
                    clearable
                  />
                  <FormErrorDisplay error={errors.customerSegmentId} />
                </div>

                <div className="md:col-span-6">
                  <SearchableSelect
                    label="Customer Department"
                    value={watch('customerDepartmentId') || ''}
                    onChange={(val) => setValue('customerDepartmentId', val, { shouldValidate: true, shouldDirty: true })}
                    options={(departments || []).filter((d: any) => d.isActive && (b2bMode ? d.customerType !== 'B2C' : d.customerType !== 'B2B'))}
                    mapOption={(d: any) => ({
                      value: d.id,
                      label: d.name,
                      subLabel: d.code || undefined,
                    })}
                    placeholder="Select Department..."
                    searchPlaceholder="Search departments..."
                    isLoading={loadingDepartments}
                    clearable
                  />
                  <FormErrorDisplay error={errors.customerDepartmentId} />
                </div>
              </>
            )}

            {/* Row 3 (B2B): Trade Name (8 cols) + Customer Type (4 cols) */}
            {b2bMode && (
              <>
                <div className="md:col-span-8">
                  <Input
                    label="Company / Trade Name"
                    {...register('tradeName')}
                    placeholder="Legal Business / Registered Entity Name"
                  />
                  <FormErrorDisplay error={errors.tradeName} />
                </div>

                <div className="md:col-span-4">
                  <Select
                    label="Customer Type"
                    {...register('customerType')}
                    options={[
                      { value: 'B2B', label: 'B2B (Business)' },
                      { value: 'B2C', label: 'B2C (Consumer)' },
                      { value: 'GOVERNMENT', label: 'Government / Public Sector' },
                      { value: 'EXPORT', label: 'Export / Overseas' },
                    ]}
                  />
                  <FormErrorDisplay error={errors.customerType} />
                </div>

                {/* Row 4 (B2B): GST Registration (6 cols) + Tax Preference (6 cols) */}
                <div className="md:col-span-6">
                  <Select
                    label="GST Registration Status"
                    {...register('gstRegistrationStatus')}
                    options={[
                      { value: 'UNREGISTERED', label: 'Unregistered' },
                      { value: 'REGISTERED', label: 'Registered Business (Regular)' },
                      { value: 'COMPOSITION', label: 'Composition Dealer' },
                      { value: 'SEZ', label: 'SEZ (Special Economic Zone)' },
                      { value: 'EXPORT', label: 'Export / Deemed Export' },
                    ]}
                  />
                  <FormErrorDisplay error={errors.gstRegistrationStatus} />
                </div>

                <div className="md:col-span-6">
                  <Select
                    label="Tax Preference"
                    {...register('taxPreference')}
                    options={[
                      { value: 'TAXABLE', label: 'Taxable' },
                      { value: 'EXEMPT', label: 'Exempt' },
                      { value: 'NIL_RATED', label: 'Nil Rated' },
                      { value: 'NON_GST', label: 'Non-GST' },
                      { value: 'COMPOSITION', label: 'Composition' },
                      { value: 'REVERSE_CHARGE', label: 'Reverse Charge' },
                    ]}
                  />
                  <FormErrorDisplay error={errors.taxPreference} />
                </div>
              </>
            )}

            {/* In B2C mode: compact tax preference & customer type */}
            {!b2bMode && (
              <>
                <div className="md:col-span-6">
                  <Select
                    label="Customer Type"
                    {...register('customerType')}
                    options={[
                      { value: 'B2C', label: 'B2C (Individual / Retail)' },
                      { value: 'B2B', label: 'B2B (Business)' },
                    ]}
                  />
                  <FormErrorDisplay error={errors.customerType} />
                </div>
                <div className="md:col-span-6">
                  <Select
                    label="Tax Preference"
                    {...register('taxPreference')}
                    options={[
                      { value: 'TAXABLE', label: 'Taxable' },
                      { value: 'EXEMPT', label: 'Exempt' },
                      { value: 'NIL_RATED', label: 'Nil Rated' },
                      { value: 'NON_GST', label: 'Non-GST' },
                    ]}
                  />
                  <FormErrorDisplay error={errors.taxPreference} />
                </div>
              </>
            )}
          </div>
        </FormSection>

        {/* Section 2: Contact Information */}
        <FormSection title="Contact Information" className="p-3.5 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-5">
              <Input
                label="Email Address"
                type="email"
                {...register('email')}
                placeholder="contact@company.com"
              />
              <FormErrorDisplay error={errors.email} />
            </div>

            <div className="md:col-span-4">
              <Input
                label="Phone / Mobile"
                {...register('mobile')}
                placeholder="+91 98765 43210"
              />
              <FormErrorDisplay error={errors.mobile} />
            </div>

            <div className="md:col-span-3">
              <Input
                label="WhatsApp"
                {...register('whatsapp')}
                placeholder="+91 98765 43210"
              />
              <FormErrorDisplay error={errors.whatsapp} />
            </div>
          </div>
        </FormSection>

        {/* Section 3: Tax & Financial Details (B2B Only) */}
        {b2bMode && (
          <FormSection title="Tax & Financial Details" className="p-3.5 sm:p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <Input
                  label="GSTIN"
                  {...register('gstin')}
                  placeholder="27AAAAA0000A1Z5"
                  className="font-mono uppercase tracking-wide"
                />
                <FormErrorDisplay error={errors.gstin} />
              </div>

              <div>
                <Input
                  label="PAN Number"
                  {...register('panNumber')}
                  placeholder="AAAAA0000A"
                  className="font-mono uppercase tracking-wide"
                />
                <FormErrorDisplay error={errors.panNumber} />
              </div>

              <div>
                <Input
                  label="Credit Limit (₹)"
                  type="number"
                  step="0.01"
                  {...register('creditLimit')}
                  placeholder="0.00"
                />
                <FormErrorDisplay error={errors.creditLimit} />
              </div>
            </div>
          </FormSection>
        )}

        {/* Section 4: Address Information */}
        <FormSection title="Address Information" className="p-3.5 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Left Column: Full Billing Address */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Billing Address
                </label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-md text-xs text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none min-h-[82px]"
                  placeholder="Door/Flat No, Building, Street, Landmark..."
                />
                <FormErrorDisplay error={errors.address} />
              </div>
            </div>

            {/* Right Column: Locality, State, Country, Place of Supply */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-3.5">
              <div>
                <Input
                  label="PIN Code"
                  {...register('pinCode')}
                  placeholder="e.g. 400001"
                />
                <FormErrorDisplay error={errors.pinCode} />
              </div>

              <div>
                <Input
                  label="State"
                  {...register('state')}
                  placeholder="State / Province"
                />
                <FormErrorDisplay error={errors.state} />
              </div>

              <div>
                <Input
                  label="Country"
                  {...register('country')}
                  placeholder="India"
                />
                <FormErrorDisplay error={errors.country} />
              </div>

              {b2bMode && (
                <div>
                  <Input
                    label="Place of Supply"
                    {...register('placeOfSupply')}
                    placeholder="e.g. Maharashtra (27)"
                  />
                  <FormErrorDisplay error={errors.placeOfSupply} />
                </div>
              )}
            </div>
          </div>
        </FormSection>

        {/* Section 5: Opening Balance & Account Settings */}
        <FormSection title="Opening Balance & Account Settings" className="p-3.5 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
            <div>
              <Select
                label="Opening Balance Type"
                {...register('openingBalanceType')}
                options={[
                  { value: 'NONE', label: 'No Opening Balance' },
                  { value: 'DEBIT_BALANCE', label: 'Debit (Receivable / Due)' },
                  { value: 'CREDIT_BALANCE', label: 'Credit (Advance / Payable)' },
                ]}
              />
              <FormErrorDisplay error={errors.openingBalanceType} />
            </div>

            <div>
              <Input
                label="Opening Balance (₹)"
                type="number"
                step="0.01"
                min="0"
                {...register('openingBalanceAmount')}
                disabled={watchedObType === 'NONE'}
                readOnly={watchedObType === 'NONE'}
                className={watchedObType === 'NONE' ? 'bg-muted/50 cursor-not-allowed opacity-75' : ''}
                placeholder={
                  watchedObType === 'DEBIT_BALANCE'
                    ? 'Debit Balance'
                    : watchedObType === 'CREDIT_BALANCE'
                    ? 'Credit Balance'
                    : '0.00'
                }
              />
              <FormErrorDisplay error={errors.openingBalanceAmount} />
            </div>

            <div>
              <Input
                label="Effective Date"
                type="date"
                {...register('openingBalanceDate')}
              />
              <FormErrorDisplay error={errors.openingBalanceDate} />
            </div>

            <div>
              <Select
                label="Account Status"
                {...register('status')}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                  { value: 'SUSPENDED', label: 'Suspended' },
                ]}
              />
              <FormErrorDisplay error={errors.status} />
            </div>
          </div>

          {/* Row 2: Migration Ref, Notes & Checkbox */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center pt-2 border-t border-border/50">
            <div className="md:col-span-5">
              <Input
                label="Migration Reference Number"
                {...register('migrationReferenceNo')}
                placeholder="Legacy ERP Ref (e.g. MIGR-2026)"
              />
              <FormErrorDisplay error={errors.migrationReferenceNo} />
            </div>

            <div className="md:col-span-4">
              <Input
                label="Internal Notes"
                {...register('notes')}
                placeholder="Optional internal remarks or instructions..."
              />
              <FormErrorDisplay error={errors.notes} />
            </div>

            <div className="md:col-span-3 flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="isMigrated"
                {...register('isMigrated')}
                className="w-4 h-4 text-accent rounded border-border focus:ring-accent"
              />
              <label htmlFor="isMigrated" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                Migrated from another system
              </label>
            </div>
          </div>

          {/* Collapsible legacy system details if checkbox is checked */}
          {watchedIsMigrated && (
            <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-3 animate-in fade-in duration-150">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Legacy System Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  label="Previous Software"
                  {...register('previousSoftware')}
                  placeholder="e.g. TallyPrime, Busy, SAP"
                />
                <Input
                  label="Previous Ledger Code"
                  {...register('previousLedgerCode')}
                  placeholder="e.g. CUST-001"
                />
                <Input
                  label="Migration Notes"
                  {...register('migrationNotes')}
                  placeholder="Migration notes / remarks..."
                />
              </div>
            </div>
          )}

          {/* Historical Invoices table if debit balance / receivable */}
          {(watchedObType === 'DEBIT_BALANCE' || watchedObType === 'RECEIVABLE') && (
            <div className="border-t border-border/60 pt-3 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Invoice-wise Migration Breakdown</h4>
                  <p className="text-[11px] text-muted-foreground">Optional breakdown of outstanding invoices from previous accounting system</p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setHistoricalInvoices([...historicalInvoices, { id: Date.now(), invoiceNo: '', date: new Date().toISOString().split('T')[0], totalAmount: 0 }])}
                  className="h-7 text-xs font-medium"
                >
                  + Add Historical Invoice
                </Button>
              </div>

              {historicalInvoices.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="px-3 py-2">Invoice No</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">Amount (₹)</th>
                        <th className="px-3 py-2 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {historicalInvoices.map((inv, index) => (
                        <tr key={inv.id || index} className="bg-background">
                          <td className="px-3 py-1.5">
                            <input 
                              value={inv.invoiceNo} 
                              onChange={(e) => {
                                const updated = [...historicalInvoices];
                                updated[index].invoiceNo = e.target.value;
                                setHistoricalInvoices(updated);
                              }} 
                              placeholder="INV-..." 
                              className="w-full h-8 px-2 bg-surface border border-border rounded text-xs"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input 
                              type="date"
                              value={inv.date} 
                              onChange={(e) => {
                                const updated = [...historicalInvoices];
                                updated[index].date = e.target.value;
                                setHistoricalInvoices(updated);
                              }} 
                              className="w-full h-8 px-2 bg-surface border border-border rounded text-xs"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input 
                              type="number"
                              value={inv.totalAmount} 
                              onChange={(e) => {
                                const updated = [...historicalInvoices];
                                updated[index].totalAmount = Number(e.target.value);
                                setHistoricalInvoices(updated);
                              }} 
                              placeholder="0.00"
                              className="w-full h-8 px-2 bg-surface border border-border rounded text-xs text-right font-mono"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-600 h-7 px-2 text-xs"
                              onClick={() => {
                                setHistoricalInvoices(historicalInvoices.filter((_, i) => i !== index));
                              }}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2.5 bg-muted/10 rounded-lg border border-dashed border-border">
                  No historical invoices added. The total opening balance will be posted as a single summary journal.
                </p>
              )}
            </div>
          )}
        </FormSection>

        {/* Section 6: Bottom Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-6 border-t border-border/50">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(-1)} className="h-8 text-xs font-medium">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={saveMutation.isPending}
            variant="primary"
            size="sm"
            className="h-8 text-xs font-semibold flex items-center gap-1.5 min-w-[130px] justify-center shadow-sm"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isEditMode ? 'Save Changes' : `Create ${entityLabel}`}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
};
