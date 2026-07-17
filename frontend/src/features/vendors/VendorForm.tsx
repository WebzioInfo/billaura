import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Loader2, Building, MapPin, DollarSign, FileText } from 'lucide-react';
import { PageContainer, FormSection } from '@/components/ui/LayoutComponents';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, Input, Select, AutoGenerateInput, FormErrorDisplay } from '@/components/ui';
import apiClient from '@/services/api';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '@/components/ui/Card';

const INDIAN_STATES = [
  "Jammu & Kashmir", "Himachal Pradesh", "Punjab", "Chandigarh", "Uttarakhand", "Haryana", 
  "Delhi", "Rajasthan", "Uttar Pradesh", "Bihar", "Sikkim", "Arunachal Pradesh", "Nagaland", 
  "Manipur", "Mizoram", "Tripura", "Meghalaya", "Assam", "West Bengal", "Jharkhand", "Odisha", 
  "Chhattisgarh", "Madhya Pradesh", "Gujarat", "Daman & Diu", "Dadra & Nagar Haveli", 
  "Maharashtra", "Andhra Pradesh", "Karnataka", "Goa", "Lakshadweep", "Kerala", "Tamil Nadu", 
  "Puducherry", "Andaman & Nicobar Islands", "Telangana", "Andhra Pradesh (New)", "Ladakh", "Other Territory"
];

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor Name is required'),
  vendorCode: z.string().optional(),
  tradeName: z.string().optional(),
  customerType: z.string(),
  gstin: z.string().optional(),
  panNumber: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  pinCode: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.customerType === 'REGISTERED' && !data.gstin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GSTIN is required for Registered businesses",
      path: ["gstin"],
    });
  }
});

type VendorFormValues = z.infer<typeof vendorSchema>;

export const VendorForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const res = await apiClient.get(`/vendors/${id}`);
      return res.data?.data || res.data;
    },
    enabled: isEditMode,
  });

  const form = useAsyncForm<VendorFormValues>(
    {
      resolver: zodResolver(vendorSchema as any) as any,
      defaultValues: {
        name: '',
        vendorCode: '',
        tradeName: '',
        customerType: 'UNREGISTERED',
        gstin: '',
        panNumber: '',
        email: '',
        phone: '',
        address: '',
        pinCode: '',
        state: '',
        notes: '',
      }
    },
    vendor,
    (data: any) => {
      return {
        name: data.name || '',
        vendorCode: data.bpCode || '',
        tradeName: data.tradeName || '',
        customerType: data.customerType || 'UNREGISTERED',
        gstin: data.gstin || '',
        panNumber: data.panNumber || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        pinCode: data.pinCode || '',
        state: data.state || '',
        notes: data.notes || '',
      };
    }
  );

  const { register, handleFormSubmit, setValue, formState: { errors } } = form;

  useDynamicTitle(isEditMode ? (vendor?.name ? `Edit ${vendor?.name}` : 'Edit Vendor') : 'New Vendor');

  const saveMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const submitData = { ...data, bpCode: data.vendorCode };
      
      if (isEditMode) {
        return apiClient.patch(`/vendors/${id}`, submitData);
      }
      return apiClient.post('/vendors', submitData);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', id] });
      toast.success(isEditMode ? 'Vendor updated successfully' : 'Vendor created successfully');
      
      const newId = isEditMode ? id : (res.data?.id || res.data?.data?.id);
      navigate(newId ? `/app/vendors/${newId}` : '/app/vendors');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save vendor');
    }
  });

  const onSubmit = (data: VendorFormValues) => {
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
        title={isEditMode ? "Edit Vendor" : "New Vendor"}
        description="Fill in the vendor details below."
        backTo={{ label: "Vendors", path: "/app/vendors" }}
        primaryAction={
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={saveMutation.isPending}
            variant="primary"
            className="flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditMode ? 'Save Changes' : 'Create Vendor'}
          </Button>
        }
      />

      <form id="vendorForm" onSubmit={handleFormSubmit(onSubmit)} className="space-y-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <Building className="w-4 h-4 text-primary" /> Basic Information
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Input 
                    label="Vendor / Company Name" 
                    required 
                    {...register('name')} 
                    placeholder="e.g. Reliance Industries Ltd." 
                  />
                  <FormErrorDisplay error={errors.name} />
                </div>
                
                <div>
                  <AutoGenerateInput 
                    label="Vendor Code" 
                    documentType="VENDOR"
                    onGenerate={async (code) => setValue('vendorCode', code, { shouldValidate: true })}
                    {...register('vendorCode')} 
                    error={errors.vendorCode?.message as string}
                    placeholder="e.g. VEND-001"
                  />
                </div>

                <div>
                  <Select 
                    label="GST Registration Type" 
                    {...register('customerType')}
                    options={[
                      { value: "UNREGISTERED", label: "Unregistered" },
                      { value: "REGISTERED", label: "Regular (GST Registered)" },
                      { value: "COMPOSITION", label: "Composition Dealer" },
                      { value: "SEZ", label: "SEZ Unit / Developer" },
                      { value: "EXPORT", label: "Overseas / Import" }
                    ]}
                  />
                  <FormErrorDisplay error={errors.customerType} />
                </div>

                <div className="md:col-span-2">
                  <Input 
                    label="Trade Name (optional)" 
                    {...register('tradeName')} 
                    placeholder="Doing business as (DBA)" 
                  />
                  <FormErrorDisplay error={errors.tradeName} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <MapPin className="w-4 h-4 text-primary" /> Address & Contact Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Input 
                    label="Email Address" 
                    type="email" 
                    {...register('email')} 
                    placeholder="billing@vendor.com" 
                  />
                  <FormErrorDisplay error={errors.email} />
                </div>

                <div>
                  <Input 
                    label="Phone Number" 
                    type="tel" 
                    {...register('phone')} 
                    placeholder="+91 98765 43210" 
                  />
                  <FormErrorDisplay error={errors.phone} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Billing Address
                  </label>
                  <textarea
                    {...register('address')}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary min-h-[80px] resize-none"
                    placeholder="Full street address, building, area..."
                  />
                  <FormErrorDisplay error={errors.address} />
                </div>

                <div>
                  <Select 
                    label="State / Union Territory" 
                    {...register('state')}
                    options={[
                      { value: "", label: "Select State..." },
                      ...INDIAN_STATES.map(s => ({ value: s, label: s }))
                    ]}
                  />
                  <FormErrorDisplay error={errors.state} />
                </div>

                <div>
                  <Input 
                    label="PIN Code (optional)" 
                    {...register('pinCode')} 
                    placeholder="6-digit PIN" 
                    maxLength={6} 
                  />
                  <FormErrorDisplay error={errors.pinCode} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <FileText className="w-4 h-4 text-primary" /> Internal Notes
              </div>
              <textarea
                {...register('notes')}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary min-h-[100px] resize-none"
                placeholder="Internal remarks, carrier preferences, special instructions, payment conditions..."
              />
              <FormErrorDisplay error={errors.notes} />
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <DollarSign className="w-4 h-4 text-primary" /> Tax Registration
              </div>
              <div className="space-y-4">
                <div>
                  <Input 
                    label="GSTIN (optional)" 
                    {...register('gstin')} 
                    placeholder="22AAAAA0000A1Z5" 
                    className="uppercase font-mono tracking-widest" 
                  />
                  <FormErrorDisplay error={errors.gstin} />
                </div>
                <div>
                  <Input 
                    label="PAN Number (optional)" 
                    {...register('panNumber')} 
                    placeholder="ABCDE1234F" 
                    className="uppercase font-mono tracking-widest" 
                  />
                  <FormErrorDisplay error={errors.panNumber} />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </PageContainer>
  );
};
