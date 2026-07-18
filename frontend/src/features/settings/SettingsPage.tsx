import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Settings, ShieldAlert, Loader2, Save, UploadCloud, X } from 'lucide-react';
import { BranchesList } from '../branches/BranchesList';
import { RolesList } from '../roles/RolesList';
import { DocumentNumbering } from './pages/DocumentNumbering';
import { CommissionRulesSettings } from './pages/CommissionRulesSettings';
import { AuditLogsSettings } from './pages/AuditLogs';
import notification from '@/core/services/NotificationService';
import { apiClient } from '../../core/api/apiClient';
import { useSessionStore } from '../auth/stores/sessionStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAsyncForm } from '../../shared/hooks/useAsyncForm';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const companySchema = z.object({
  companyName: z.string().min(2, 'Company name is too short'),
  legalName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  pinCode: z.string().trim().max(20, 'Pincode must be at most 20 characters').regex(/^[A-Za-z0-9\s\-]{3,20}$/, 'Invalid Pincode format').optional().or(z.literal('')),
  state: z.string().optional(),
  country: z.string().optional(),
  currency: z.string(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setSession, user, accessToken } = useSessionStore();
  
  // Resolve tab from search params or fallback to path matching for legacy routes
  const path = location.pathname;
  let defaultTab = 'branches';
  if (path.includes('/roles')) defaultTab = 'roles';
  if (path.includes('/profile') || path.includes('/company')) defaultTab = 'profile';
  if (path.includes('/users')) defaultTab = 'users';
  if (path.includes('/subscription')) defaultTab = 'subscription';
  if (path.includes('/numbering')) defaultTab = 'numbering';
  if (path.includes('/commissions')) defaultTab = 'commissions';
  if (path.includes('/audit-logs')) defaultTab = 'audit-logs';

  const activeTab = searchParams.get('tab') || defaultTab;
  
  const setActiveTab = (tab: string) => {
    // If they were on a legacy path like /company, redirect to /settings?tab=profile
    if (path !== '/settings') {
      navigate(`/settings?tab=${tab}`, { replace: true });
    } else {
      setSearchParams({ tab });
    }
  };
  
  // Define local state ONLY for unsaved logo uploads. 
  // We do not copy API state into here.
  const [localLogoBase64, setLocalLogoBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/auth/me');
      return res;
    },
    enabled: activeTab === 'profile',
  });

  const companyData = profileData?.data?.company || profileData?.company;
  const companyId = companyData?.id || '';
  const displayLogo = localLogoBase64 || companyData?.settings?.logoBase64;

  const { register, handleSubmit, reset, formState: { errors } } = useAsyncForm<CompanyFormValues>(
    {
      resolver: zodResolver(companySchema),
      defaultValues: {
        companyName: '',
        legalName: '',
        gstin: '',
        pan: '',
        email: '',
        phone: '',
        address: '',
        pinCode: '',
        state: '',
        country: '',
        currency: 'INR',
      }
    },
    companyData, 
    (company: any) => {
      return {
        companyName: company.companyName || '',
        legalName: company.legalName || '',
        gstin: company.gstin || '',
        pan: company.pan || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        pinCode: company.pinCode || '',
        state: company.state || '',
        country: company.country || '',
        currency: company.currency || 'INR',
      };
    }
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      notification.error("Unsupported file type. Please upload PNG, JPG, or WEBP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      notification.error("Image exceeds 5MB limit. Please choose a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLocalLogoBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLocalLogoBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const queryClient = useQueryClient();

  const onSubmit = async (values: CompanyFormValues) => {
    setIsSubmitting(true);
    try {
      const finalLogo = localLogoBase64 !== null ? localLogoBase64 : companyData?.settings?.logoBase64;
      const payload = {
        ...values,
        logoBase64: finalLogo
      };
      await apiClient.patch('/auth/company', payload);
      notification.success('Workspace profile settings updated successfully');
      
      // Fetch fresh data and reset dirty state
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      
      // Update session store to reflect new company name/logo immediately in UI
      if (user) {
        setSession({ ...user, companyName: values.companyName, logoBase64: finalLogo }, accessToken);
      }

      
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to update company profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Settings Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-7 h-7 text-accent" />
            Administration Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Configure your workspace, manage branches, and control access permissions.
          </p>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-border overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('branches')}
          className={`px-4 sm:px-6 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'branches' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Branch Offices
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 sm:px-6 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'roles' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 sm:px-6 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'profile' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Company Profile
        </button>
        <button
            onClick={() => setActiveTab('numbering')}
            className={`px-4 sm:px-6 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'numbering' 
                ? 'border-accent text-accent' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Document Numbering
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-4 sm:px-6 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'commissions' 
                ? 'border-accent text-accent' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Commission Rules
          </button>
          <button
            onClick={() => setActiveTab('audit-logs')}
            className={`px-4 sm:px-6 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'audit-logs' 
                ? 'border-accent text-accent' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Audit Logs
          </button>
        </div>

      <div className="mt-6">
        {activeTab === 'branches' && <BranchesList />}
        {activeTab === 'roles' && <RolesList />}
        {activeTab === 'numbering' && <DocumentNumbering />}
        {activeTab === 'commissions' && <CommissionRulesSettings />}
        {activeTab === 'audit-logs' && <AuditLogsSettings />}
        
        {activeTab === 'profile' && (
          isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent" /> 
              <span className="font-medium tracking-wide">Loading workspace configuration...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="bg-card shadow-sm border border-border rounded-xl max-w-4xl overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-center">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-accent" />
                  Organization Profile
                </h2>
                <span className="text-xs font-mono text-muted-foreground bg-background px-2.5 py-1 rounded border border-border shadow-sm">
                  ID: {companyId || 'Tenant Context Bound'}
                </span>
              </div>

              <div className="p-6 space-y-8">
                {/* Logo Upload Section */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4">Company Logo</h3>
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center relative overflow-hidden group">
                      {displayLogo ? (
                        <>
                          <img src={displayLogo} alt="Company Logo" className="w-full h-full object-contain p-2" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              type="button" 
                              onClick={removeLogo}
                              className="bg-destructive text-destructive-foreground p-1.5 rounded-full hover:scale-105 transition-transform"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground">Upload Logo</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Upload your company logo to display on invoices, reports, and the navigation bar.
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Recommended size: 512x512px. Max size: 5MB. Formats: PNG, JPG, WEBP.
                      </p>
                      <div className="flex gap-3">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleImageUpload} 
                          accept="image/jpeg,image/png,image/webp" 
                          className="hidden" 
                        />
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        >
                          Browse Files
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-border" />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Company Display Name *</label>
                    <input type="text" {...register('companyName')} className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow" />
                    {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Legal Entity Registered Name</label>
                    <input type="text" {...register('legalName')} className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">GSTIN / Tax Number</label>
                    <input type="text" {...register('gstin')} placeholder="e.g. 27AAAAA1111A1Z1" className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">PAN / Registration Number</label>
                    <input type="text" {...register('pan')} placeholder="e.g. ABCDE1234F" className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Billing Email Contact</label>
                    <input type="email" {...register('email')} className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow" />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input type="text" {...register('phone')} className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow" />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Primary Registered Address</label>
                    <textarea {...register('address')} rows={3} className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Pincode / ZIP Code</label>
                    <input type="text" {...register('pinCode')} placeholder="Enter Pincode" className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">State / Province</label>
                    <input type="text" {...register('state')} className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Country</label>
                    <input type="text" {...register('country')} className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">System Base Currency *</label>
                    <select {...register('currency')} className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow">
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Footer */}
              <div className="p-6 bg-muted/20 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldAlert className="w-4 h-4 text-accent" />
                  <span>SaaS isolation active. Changes only affect this organization.</span>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Save button is always active to allow saving logo changes even if form is not dirty */}
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all
                      ${(!isSubmitting) 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer' 
                        : 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'}`}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save Configuration</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
};
