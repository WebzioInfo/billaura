import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/NotificationService';
import { Save, Loader2 } from 'lucide-react';
import { PageContainer, Section, FormSection } from '@/shared/components/ui/LayoutComponents';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button, Input, Select, AutoGenerateInput, FormErrorDisplay } from '@/shared/components/ui';
import apiClient from '@/core/api';
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

  const { data: segments } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const res = await apiClient.get('/customer-segments');
      return res.data?.data || res.data || [];
    },
    enabled: !isVendor,
  });

  const { data: departments } = useQuery({
    queryKey: ['customer-departments'],
    queryFn: async () => {
      const res = await apiClient.get('/customer-departments');
      return res.data?.data || res.data || [];
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
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [entityPath] });
      queryClient.invalidateQueries({ queryKey: [entityPath, id] });
      notification.success(isEditMode ? 'Customer updated successfully' : 'Customer created successfully');
      
      const newId = isEditMode ? id : (res.data?.id || res.data?.data?.id);
      navigate(newId ? `/app/${entityPath}/${newId}` : `/app/${entityPath}`);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save customer');
    }
  });

  const onSubmit = (data: BusinessPartnerFormValues) => {
    saveMutation.mutate({ ...data, historicalInvoices } as any);
  };

  if (isEditMode && isLoading) {
    return (
      <PageContainer maxWidth="5xl">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="5xl">
        <PageHeader 
          title={isEditMode ? `Edit ${entityLabel}` : `New ${entityLabel}`}
          breadcrumbs={[
            { label: entityLabel + "s", href: `/app/${entityPath}` },
            { label: isEditMode ? (customer ? displayName : `Edit ${entityLabel}`) : `New ${entityLabel}` }
          ]}
          primaryAction={
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={saveMutation.isPending}
            variant="primary"
            className="flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditMode ? 'Save Changes' : `Create ${entityLabel}`}
          </Button>
        }
      />

      <form id="customerForm" onSubmit={handleFormSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-center p-1 mb-6 bg-muted/50 rounded-lg border border-border w-fit mx-auto">
          <button
            type="button"
            onClick={() => {
              setB2bMode(false);
              setValue('gstRegistrationStatus', 'UNREGISTERED');
              setValue('gstin', '');
              setValue('panNumber', '');
              setValue('tradeName', '');
              setValue('creditLimit', '');
              if (!isEditMode && segments) {
                const defaultB2c = segments.find((s: any) => s.segmentType === 'B2C' && s.isDefault);
                if (defaultB2c) setValue('customerSegmentId', defaultB2c.id);
              }
            }}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${!b2bMode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            B2C Customer (Individual)
          </button>
          <button
            type="button"
            onClick={() => {
              setB2bMode(true);
              if (!isEditMode && segments) {
                const defaultB2b = segments.find((s: any) => s.segmentType === 'B2B' && s.isDefault);
                if (defaultB2b) setValue('customerSegmentId', defaultB2b.id);
              }
            }}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${b2bMode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            B2B Customer (Business)
          </button>
        </div>

        <Section>
          <FormSection title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label={`${entityLabel} Name`}
                  {...register('name')}
                  placeholder={b2bMode ? "Contact Person Name" : "Customer Full Name"}
                  required
                />
              </div>
              <div>
                  <AutoGenerateInput
                    label={`${entityLabel} Code`}
                    documentType={entityType}
                    onGenerate={(code) => setValue('customerCode', code, { shouldValidate: true })}
                    {...register('customerCode')}
                    error={errors.customerCode?.message as string}
                    placeholder="Auto-generated if left empty"
                  />
              </div>
              {!isVendor && (
                <div>
                  <Select
                    label="Customer Segment"
                    {...register('customerSegmentId')}
                    options={[
                      { value: '', label: 'Select Segment...' },
                      ...(segments || [])
                        .filter((s: any) => s.isActive && (b2bMode ? s.segmentType !== 'B2C' : s.segmentType !== 'B2B'))
                        .map((s: any) => ({
                          value: s.id,
                          label: s.name
                        }))
                    ]}
                  />
                  <FormErrorDisplay error={errors.customerSegmentId} />
                </div>
              )}
              {!isVendor && (
                <div>
                  <Select
                    label="Customer Department"
                    {...register('customerDepartmentId')}
                    options={[
                      { value: '', label: 'Select Department...' },
                      ...(departments || [])
                        .filter((d: any) => d.isActive && (b2bMode ? d.customerType !== 'B2C' : d.customerType !== 'B2B'))
                        .map((d: any) => ({
                          value: d.id,
                          label: d.name
                        }))
                    ]}
                  />
                  <FormErrorDisplay error={errors.customerDepartmentId} />
                </div>
              )}
              {b2bMode && (
                <>
                  <div>
                    <Input
                      label="Company / Trade Name"
                      {...register('tradeName')}
                      placeholder="Legal Business Name"
                    />
                    <FormErrorDisplay error={errors.tradeName} />
                  </div>
                  <div>
                    <Select
                      label="Customer Type"
                      {...register('customerType')}
                      options={[
                        { value: 'B2B', label: 'B2B' },
                        { value: 'B2C', label: 'B2C' },
                        { value: 'GOVERNMENT', label: 'Government' },
                        { value: 'EXPORT', label: 'Export' },
                      ]}
                    />
                    <FormErrorDisplay error={errors.customerType} />
                  </div>
                  <div>
                    <Select
                      label="GST Registration Status"
                      {...register('gstRegistrationStatus')}
                      options={[
                        { value: 'UNREGISTERED', label: 'Unregistered' },
                        { value: 'REGISTERED', label: 'Registered Business (Regular)' },
                        { value: 'COMPOSITION', label: 'Composition Dealer' },
                        { value: 'SEZ', label: 'SEZ' },
                        { value: 'EXPORT', label: 'Export' },
                      ]}
                    />
                    <FormErrorDisplay error={errors.gstRegistrationStatus} />
                  </div>
                  <div>
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
            </div>
          </FormSection>
        </Section>

        <Section>
          <FormSection title="Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Email Address"
                  type="email"
                  {...register('email')}
                  placeholder="email@example.com"
                />
                <FormErrorDisplay error={errors.email} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Phone / Mobile"
                    {...register('mobile')}
                    placeholder="+91 99999 99999"
                  />
                  <FormErrorDisplay error={errors.mobile} />
                </div>
                <div>
                  <Input
                    label="WhatsApp"
                    {...register('whatsapp')}
                    placeholder="+91 99999 99999"
                  />
                  <FormErrorDisplay error={errors.whatsapp} />
                </div>
              </div>
            </div>
          </FormSection>
        </Section>

        {b2bMode && (
          <Section>
            <FormSection title="Tax & Financial Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="GSTIN"
                    {...register('gstin')}
                    placeholder="27AAAAA0000A1Z5"
                    className="font-mono uppercase"
                  />
                  <FormErrorDisplay error={errors.gstin} />
                </div>
                <div>
                  <Input
                    label="PAN Number"
                    {...register('panNumber')}
                    placeholder="AAAAA0000A"
                    className="font-mono uppercase"
                  />
                  <FormErrorDisplay error={errors.panNumber} />
                </div>
                <div>
                  <Input
                    label="Credit Limit"
                    type="number"
                    {...register('creditLimit')}
                    placeholder="0.00"
                  />
                  <FormErrorDisplay error={errors.creditLimit} />
                </div>
              </div>
            </FormSection>
          </Section>
        )}

        <Section>
          <FormSection title="Opening Balance & Migration">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Opening Balance Type"
                  {...register('openingBalanceType')}
                  options={[
                    { value: 'NONE', label: 'No Opening Balance' },
                    { value: 'DEBIT_BALANCE', label: 'Debit Balance (Receivable / Debit)' },
                    { value: 'CREDIT_BALANCE', label: 'Credit Balance (Payable / Credit)' },
                  ]}
                />
                <FormErrorDisplay error={errors.openingBalanceType} />
              </div>
              <div>
                <Input
                  label="Opening Balance Amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('openingBalanceAmount')}
                  disabled={watchedObType === 'NONE'}
                  readOnly={watchedObType === 'NONE'}
                  className={watchedObType === 'NONE' ? 'bg-muted/50 cursor-not-allowed opacity-75' : ''}
                  placeholder={
                    watchedObType === 'DEBIT_BALANCE'
                      ? 'Enter Debit Opening Balance'
                      : watchedObType === 'CREDIT_BALANCE'
                      ? 'Enter Credit Opening Balance'
                      : '0.00'
                  }
                  helperText={
                    watchedObType === 'NONE'
                      ? 'No opening balance will be created.'
                      : watchedObType === 'DEBIT_BALANCE'
                      ? 'Debit balance will be posted to Accounts Receivable & Opening Balance Equity.'
                      : watchedObType === 'CREDIT_BALANCE'
                      ? 'Credit balance will be posted to Customer Account & Opening Balance Equity.'
                      : undefined
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
                <Input
                  label="Migration Reference Number"
                  {...register('migrationReferenceNo')}
                  placeholder="Legacy ERP Ref (e.g. MIGR-2026)"
                />
                <FormErrorDisplay error={errors.migrationReferenceNo} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isMigrated"
                  {...register('isMigrated')}
                  className="w-4 h-4 text-accent rounded border-border focus:ring-accent"
                />
                <label htmlFor="isMigrated" className="text-sm font-semibold text-foreground cursor-pointer">
                  Migrated from another system
                </label>
              </div>
            </div>

            {watchedIsMigrated && (
              <div className="mt-4 p-4 bg-muted/20 border border-border rounded-lg space-y-4 animate-in fade-in duration-200">
                <h4 className="text-sm font-bold text-foreground">Legacy System Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Input
                      label="Previous Software"
                      {...register('previousSoftware')}
                      placeholder="e.g. TallyPrime, SAP"
                    />
                  </div>
                  <div>
                    <Input
                      label="Previous Ledger Code"
                      {...register('previousLedgerCode')}
                      placeholder="e.g. CUST-001"
                    />
                  </div>
                  <div>
                    <Input
                      label="Migration Notes"
                      {...register('migrationNotes')}
                      placeholder="Remarks..."
                    />
                  </div>
                </div>
              </div>
            )}
            
            {(watchedObType === 'DEBIT_BALANCE' || watchedObType === 'RECEIVABLE') && (
              <div className="mt-6 border-t border-border pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-foreground">Invoice-wise Migration</h4>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setHistoricalInvoices([...historicalInvoices, { id: Date.now(), invoiceNo: '', date: new Date().toISOString().split('T')[0], totalAmount: 0 }])}
                  >
                    + Add Historical Invoice
                  </Button>
                </div>
                {historicalInvoices.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="px-4 py-2">Invoice No</th>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                          <th className="px-4 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicalInvoices.map((inv, index) => (
                          <tr key={inv.id || index} className="border-b border-border bg-background">
                            <td className="px-4 py-2">
                              <Input 
                                value={inv.invoiceNo} 
                                onChange={(e) => {
                                  const updated = [...historicalInvoices];
                                  updated[index].invoiceNo = e.target.value;
                                  setHistoricalInvoices(updated);
                                }} 
                                placeholder="INV-..." 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input 
                                type="date"
                                value={inv.date} 
                                onChange={(e) => {
                                  const updated = [...historicalInvoices];
                                  updated[index].date = e.target.value;
                                  setHistoricalInvoices(updated);
                                }} 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input 
                                type="number"
                                value={inv.totalAmount} 
                                onChange={(e) => {
                                  const updated = [...historicalInvoices];
                                  updated[index].totalAmount = Number(e.target.value);
                                  setHistoricalInvoices(updated);
                                }} 
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                className="text-red-500"
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
                  <p className="text-xs text-muted-foreground text-center py-4 bg-muted/10 rounded border border-dashed border-border">
                    No historical invoices added. The total opening balance will be posted as a single summary journal.
                  </p>
                )}
              </div>
            )}
          </FormSection>
        </Section>
        
        <Section>
          <FormSection title="Account Status">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Status"
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
          </FormSection>
        </Section>

        <Section>
          <FormSection title="Address">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Billing Address
                </label>
                <textarea
                  {...register('address')}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none h-20"
                  placeholder="Complete address..."
                />
                <FormErrorDisplay error={errors.address} />
              </div>
              <div>
                <Input
                  label="PIN Code"
                  {...register('pinCode')}
                  placeholder="Enter PIN Code"
                />
                <FormErrorDisplay error={errors.pinCode} />
              </div>
              <div>
                <Input
                  label="State"
                  {...register('state')}
                  placeholder="Enter State"
                />
                <FormErrorDisplay error={errors.state} />
              </div>
              <div>
                <Input
                  label="Country"
                  {...register('country')}
                  placeholder="Enter Country"
                />
                <FormErrorDisplay error={errors.country} />
              </div>
              {b2bMode && (
                <div>
                  <Input
                    label="Place of Supply"
                    {...register('placeOfSupply')}
                    placeholder="State Name (for GST purposes)"
                  />
                  <FormErrorDisplay error={errors.placeOfSupply} />
                </div>
              )}
            </div>
          </FormSection>
        </Section>
        
        {!b2bMode && (
          <Section>
            <FormSection title="Additional Information">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none h-20"
                    placeholder="Enter any additional notes..."
                  />
                  <FormErrorDisplay error={errors.notes} />
                </div>
              </div>
            </FormSection>
          </Section>
        )}
        
        <div className="flex justify-end gap-3 pt-4 pb-12">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={saveMutation.isPending}
            variant="primary"
            className="min-w-[120px]"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isEditMode ? 'Save Changes' : `Create ${entityLabel}`)}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
};
