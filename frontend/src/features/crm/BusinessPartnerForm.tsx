import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/services/NotificationService';
import { Save, Loader2 } from 'lucide-react';
import { PageContainer, Section, FormSection } from '@/components/ui/LayoutComponents';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, Input, Select, AutoGenerateInput, FormErrorDisplay } from '@/components/ui';
import apiClient from '@/services/api';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';
import { getCustomerDisplayName } from '@/utils/entityNames';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const bpSchema = z.object({
  name: z.string().min(1, 'Customer Name is required'),
  customerCode: z.string().optional(),
  tradeName: z.string().optional(),
  customerType: z.string(),
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
  openingBalance: z.string().optional().or(z.number().transform(String)),
}).superRefine((data, ctx) => {
  if (data.customerType === 'REGISTERED' && !data.gstin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GSTIN is required for Registered businesses",
      path: ["gstin"],
    });
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

  const form = useAsyncForm<BusinessPartnerFormValues>(
    {
      resolver: zodResolver(bpSchema as any) as any,
      defaultValues: {
        name: '',
        customerCode: '',
        tradeName: '',
        customerType: 'UNREGISTERED',
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
        openingBalance: '',
      }
    },
    customer,
    (data: any) => {
      const isB2b = data.customerType !== 'UNREGISTERED' || !!data.gstin || !!data.tradeName;
      setB2bMode(isB2b);
      return {
        name: data.name || '',
        customerCode: data.bpCode || '',
        tradeName: data.tradeName || '',
        customerType: data.customerType || 'UNREGISTERED',
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
        openingBalance: data.receivableBalance ? String(data.receivableBalance) : '',
      };
    }
  );

  const { register, handleFormSubmit, setValue, formState: { errors } } = form;

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
      }
      if (!b2bMode) {
        submitData.customerType = 'UNREGISTERED';
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
    saveMutation.mutate(data);
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
              setValue('customerType', 'UNREGISTERED');
              setValue('gstin', '');
              setValue('panNumber', '');
              setValue('tradeName', '');
              setValue('creditLimit', '');
            }}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${!b2bMode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            B2C Customer (Individual)
          </button>
          <button
            type="button"
            onClick={() => setB2bMode(true)}
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
                      label={`${entityLabel} Type`}
                      {...register('customerType')}
                      options={[
                        { value: 'UNREGISTERED', label: 'Unregistered' },
                        { value: 'REGISTERED', label: 'Registered Business (Regular)' },
                        { value: 'COMPOSITION', label: 'Composition Dealer' },
                        { value: 'SEZ', label: 'SEZ' },
                        { value: 'EXPORT', label: 'Export' },
                      ]}
                    />
                    <FormErrorDisplay error={errors.customerType} />
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
                <div>
                  <Input
                    label="Opening Balance"
                    type="number"
                    {...register('openingBalance')}
                    placeholder="0.00"
                    disabled={isEditMode}
                  />
                  <FormErrorDisplay error={errors.openingBalance} />
                </div>
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
        )}

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
