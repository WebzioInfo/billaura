import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { Button } from '../../../shared/components/ui/Button';
import { Save, X, Building2, UserCircle, Settings } from 'lucide-react';
import { apiClient } from '../../../core/api/apiClient';
import toast from 'react-hot-toast';

export const CreateCompany = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Company Info
    companyName: '',
    legalName: '',
    tenantCode: '',
    businessType: 'TRADING',
    email: '',
    phone: '',
    website: '',
    address: '',
    country: 'India',
    state: '',
    city: '',
    postalCode: '',
    currency: 'INR',
    
    // Primary User
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminMobile: '',
    
    // Tax & Regional
    gstin: '',
    pan: '',
    
    // Default Entities
    createDefaultBranch: true,
    branchName: 'Main Branch',
    createDefaultWarehouse: true,
    warehouseName: 'Central Warehouse',
    seedDefaultCoa: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiClient.post('/platform/tenants/provision', formData);
      toast.success(res.data.message || 'Tenant provisioned successfully!');
      navigate('/platform/companies');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to provision tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Provision New Tenant"
        description="Creates a new company environment with automated master data seeding."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Details Section */}
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center space-x-2 mb-6">
            <Building2 className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-slate-800">Company Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Input label="Company Name *" name="companyName" value={formData.companyName} onChange={handleChange} required />
            <Input label="Legal Name" name="legalName" value={formData.legalName} onChange={handleChange} />
            <Input label="Tenant Code *" name="tenantCode" value={formData.tenantCode} onChange={handleChange} required />
            
            <Select label="Business Type" name="businessType" value={formData.businessType} onChange={handleChange} options={[
              { label: 'Trading', value: 'TRADING' },
              { label: 'Manufacturing', value: 'MANUFACTURING' },
              { label: 'Services', value: 'SERVICES' },
              { label: 'Retail', value: 'RETAIL' }
            ]} />
            <Input label="GST Number" name="gstin" value={formData.gstin} onChange={handleChange} />
            <Input label="PAN Number" name="pan" value={formData.pan} onChange={handleChange} />
            
            <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} />
            <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
            <Input label="Website" name="website" value={formData.website} onChange={handleChange} />
            
            <Input label="Address" name="address" value={formData.address} onChange={handleChange} className="md:col-span-2 lg:col-span-3" />
            
            <Input label="Country" name="country" value={formData.country} onChange={handleChange} />
            <Input label="State" name="state" value={formData.state} onChange={handleChange} />
            <Input label="City" name="city" value={formData.city} onChange={handleChange} />
            
            <Input label="Postal Code" name="postalCode" value={formData.postalCode} onChange={handleChange} />
            <Select label="Currency" name="currency" value={formData.currency} onChange={handleChange} options={[
              { label: 'INR (₹)', value: 'INR' },
              { label: 'USD ($)', value: 'USD' }
            ]} />
          </div>
        </Card>

        {/* Admin Details Section */}
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center space-x-2 mb-6">
            <UserCircle className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-slate-800">Company Administrator</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Admin Name *" name="adminName" value={formData.adminName} onChange={handleChange} required />
            <Input label="Admin Email *" type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange} required />
            <Input label="Admin Mobile" name="adminMobile" value={formData.adminMobile} onChange={handleChange} />
            <Input label="Temporary Password *" type="password" name="adminPassword" value={formData.adminPassword} onChange={handleChange} required />
          </div>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate('/platform/companies')}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            <Save className="w-4 h-4 mr-2" />
            Provision Tenant
          </Button>
        </div>
      </form>
    </div>
  );
};
