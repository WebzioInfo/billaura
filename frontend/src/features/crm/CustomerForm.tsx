import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { DocTooltip } from '@/components/ui/DocTooltip';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { PageContainer, Section, FormSection, BackNavigation } from '@/components/ui/LayoutComponents';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, Input, Select } from '@/components/ui';
import apiClient from '@/services/api';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';

export const CustomerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);
  const [b2bMode, setB2bMode] = useState<boolean>(true);

  const [formData, setFormData] = useState({
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
  });

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${id}`);
      return res.data?.data || res.data;
    },
    enabled: isEditMode,
  });

  useDynamicTitle(isEditMode ? (customer?.name ? `Edit ${customer.name}` : 'Edit Customer') : 'New Customer');

  useEffect(() => {
    if (customer) {
      const isB2b = customer.customerType !== 'UNREGISTERED' || !!customer.gstin || !!customer.tradeName;
      setB2bMode(isB2b);
      setFormData({
        name: customer.name || '',
        customerCode: customer.bpCode || '',
        tradeName: customer.tradeName || '',
        customerType: customer.customerType || 'UNREGISTERED',
        gstin: customer.gstin || '',
        panNumber: customer.panNumber || '',
        email: customer.email || '',
        mobile: customer.phone || '',
        whatsapp: customer.whatsapp || '',
        address: customer.address || '',
        pinCode: customer.pinCode || '',
        state: customer.state || '',
        placeOfSupply: customer.placeOfSupply || '',
        creditLimit: customer.creditLimit || '',
        country: customer.country || 'India',
        notes: customer.notes || '',
        status: customer.status || 'ACTIVE',
        openingBalance: customer.receivableBalance || '',
      });
    }
  }, [customer]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isEditMode) {
        return apiClient.patch(`/customers/${id}`, data);
      }
      return apiClient.post('/customers', data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.success(isEditMode ? 'Customer updated successfully' : 'Customer created successfully');
      
      const newId = isEditMode ? id : (res.data?.id || res.data?.data?.id);
      navigate(newId ? `/app/customers/${newId}` : '/app/customers');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Customer Name is required');
      return;
    }
    
    if (b2bMode && formData.customerType === 'REGISTERED' && !formData.gstin?.trim()) {
      toast.error('GSTIN is required for Registered businesses');
      return;
    }
    
    const submitData = { ...formData };
    if (!b2bMode) {
      submitData.customerType = 'UNREGISTERED';
      submitData.gstin = '';
      submitData.panNumber = '';
      submitData.tradeName = '';
      submitData.creditLimit = '';
    }
    
    saveMutation.mutate(submitData);
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
        title={isEditMode ? "Edit Customer" : "New Customer"}
        description="Fill in the customer details below."
        backTo={{ label: "Customers", path: "/app/customers" }}
        primaryAction={
          <Button 
            onClick={handleSubmit} 
            disabled={saveMutation.isPending}
            variant="primary"
            className="flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditMode ? 'Save Changes' : 'Create Customer'}
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-center p-1 mb-6 bg-muted/50 rounded-lg border border-border w-fit mx-auto">
          <button
            type="button"
            onClick={() => {
              setB2bMode(false);
              setFormData(prev => ({ ...prev, customerType: 'UNREGISTERED', gstin: '', panNumber: '', tradeName: '', creditLimit: '' }));
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
              <Input
                label="Customer Name *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={b2bMode ? "Contact Person Name" : "Customer Full Name"}
                required
              />
              <Input
                label="Customer Code"
                name="customerCode"
                value={formData.customerCode}
                onChange={handleChange}
                placeholder="Auto-generated if left empty"
              />
              {b2bMode && (
                <>
                  <Input
                    label="Company / Trade Name"
                    name="tradeName"
                    value={formData.tradeName}
                    onChange={handleChange}
                    placeholder="Legal Business Name"
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Customer Type
                    </label>
                    <Select
                      name="customerType"
                      value={formData.customerType}
                      onChange={handleChange}
                      options={[
                        { value: 'UNREGISTERED', label: 'Unregistered' },
                        { value: 'REGISTERED', label: 'Registered Business (Regular)' },
                        { value: 'COMPOSITION', label: 'Composition Dealer' },
                        { value: 'SEZ', label: 'SEZ' },
                        { value: 'EXPORT', label: 'Export' },
                      ]}
                    />
                  </div>
                </>
              )}
            </div>
          </FormSection>
        </Section>

        <Section>
          <FormSection title="Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone / Mobile"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="+91 99999 99999"
                />
                <Input
                  label="WhatsApp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="+91 99999 99999"
                />
              </div>
            </div>
          </FormSection>
        </Section>

        {b2bMode && (
          <Section>
            <FormSection title="Tax & Financial Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="GSTIN"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="27AAAAA0000A1Z5"
                  className="font-mono uppercase"
                />
                <Input
                  label="PAN Number"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleChange}
                  placeholder="AAAAA0000A"
                  className="font-mono uppercase"
                />
                <Input
                  label="Credit Limit"
                  type="number"
                  name="creditLimit"
                  value={formData.creditLimit}
                  onChange={handleChange}
                  placeholder="0.00"
                />
                <Input
                  label="Opening Balance"
                  type="number"
                  name="openingBalance"
                  value={formData.openingBalance}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={isEditMode}
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </label>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' },
                      { value: 'SUSPENDED', label: 'Suspended' },
                    ]}
                  />
                </div>
              </div>
            </FormSection>
          </Section>
        )}

        <Section>
          <FormSection title="Address">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Billing Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none h-20"
                  placeholder="Complete address..."
                />
              </div>
              <Input
                label="PIN Code"
                name="pinCode"
                value={formData.pinCode}
                onChange={handleChange}
                placeholder="Enter PIN Code"
              />
              <Input
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Enter State"
              />
              <Input
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Enter Country"
              />
              {b2bMode && (
                <Input
                  label="Place of Supply"
                  name="placeOfSupply"
                  value={formData.placeOfSupply}
                  onChange={handleChange}
                  placeholder="State Name (for GST purposes)"
                />
              )}
            </div>
          </FormSection>
        </Section>
        
        {!b2bMode && (
          <Section>
            <FormSection title="Additional Information">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none h-20"
                    placeholder="Enter any additional notes..."
                  />
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
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isEditMode ? 'Save Changes' : 'Create Customer')}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
};
