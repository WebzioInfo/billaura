import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Settings, Landmark, ShieldAlert, Loader2, Save, RefreshCw } from 'lucide-react';
import { BranchesList } from '../branches/BranchesList';
import { RolesList } from '../roles/RolesList';
import { toast } from 'sonner';
import apiClient from '../../services/api';

const companySchema = z.object({
  companyName: z.string().min(2, 'Company name is too short'),
  legalName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  currency: z.string(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanyProfile {
  id: string;
  companyName: string;
  legalName?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  country?: string;
  currency: string;
}

export const SettingsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Derive active tab from URL path
  const path = location.pathname;
  let activeTab: 'branches' | 'roles' | 'profile' | 'users' | 'subscription' = 'branches';
  if (path.includes('/roles')) activeTab = 'roles';
  if (path.includes('/profile') || path.includes('/company')) activeTab = 'profile';
  if (path.includes('/users')) activeTab = 'users';
  if (path.includes('/subscription')) activeTab = 'subscription';
  if (path.includes('/branches')) activeTab = 'branches';
  
  const setActiveTab = (tab: string) => navigate(`/${tab === 'profile' ? 'company' : tab}`);
  
  const [companyId, setCompanyId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: '',
      legalName: '',
      gstin: '',
      pan: '',
      email: '',
      phone: '',
      address: '',
      state: '',
      country: '',
      currency: 'INR',
    }
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<any>('/auth/me');
      if (res && res.company) {
        setCompanyId(res.company.id);
        reset({
          companyName: res.company.companyName || '',
          legalName: res.company.legalName || '',
          gstin: res.company.gstin || '',
          pan: res.company.pan || '',
          email: res.company.email || '',
          phone: res.company.phone || '',
          address: res.company.address || '',
          state: res.company.state || '',
          country: res.company.country || '',
          currency: res.company.currency || 'INR',
        });
      }
    } catch (err) {
      toast.error('Failed to load profile details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfile();
    }
  }, [activeTab]);

  const onSubmit = async (values: CompanyFormValues) => {
    setIsSubmitting(true);
    try {
      await apiClient.patch('/auth/company', values);
      toast.success('Workspace profile settings updated successfully');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update company profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left p-6 max-w-7xl mx-auto">
      {/* Settings Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-accent" />
            Settings & Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your accounting SaaS settings, branch offices, profile details, and access control policies.
          </p>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('branches')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'branches' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Branch Offices
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'roles' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'profile' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Company Profile
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {activeTab === 'branches' && <BranchesList />}
        {activeTab === 'roles' && <RolesList />}
        
        {activeTab === 'profile' && (
          isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex justify-center items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Fetching Workspace details...
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="glass-panel p-6 rounded-2xl border border-border max-w-4xl space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-accent" />
                  Active Workspace Profile
                </h2>
                <span className="text-xs font-mono text-muted-foreground bg-background px-2.5 py-1 rounded-lg border border-border">
                  ID: {companyId || 'Tenant Context Bound'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Company Display Name *</label>
                  <input type="text" {...register('companyName')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                  {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Legal Entity Registered Name</label>
                  <input type="text" {...register('legalName')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">GSTIN Number</label>
                  <input type="text" {...register('gstin')} placeholder="e.g. 27AAAAA1111A1Z1" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">PAN Number</label>
                  <input type="text" {...register('pan')} placeholder="e.g. ABCDE1234F" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Billing Email Contact</label>
                  <input type="email" {...register('email')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phone Number</label>
                  <input type="text" {...register('phone')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Primary Registered Address</label>
                  <textarea {...register('address')} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">State / Province</label>
                  <input type="text" {...register('state')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Country</label>
                  <input type="text" {...register('country')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">System ISO Currency Base *</label>
                  <select {...register('currency')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-border pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <ShieldAlert className="w-4 h-4 text-accent shrink-0" />
                  <span>SaaS isolation active. Changes only scope to this organization context.</span>
                </div>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile Settings
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
};
