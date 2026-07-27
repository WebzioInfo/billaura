import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/core/services/NotificationService';
import { Save, ArrowLeft, Upload, Loader2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../shared/components/ui/LayoutComponents';
import { PageHeader } from '../../shared/components/ui/PageHeader';
import { Input, Select, FormErrorDisplay } from '../../shared/components/ui';
import { SearchableSelect } from '../../shared/components/ui/SearchableSelect';
import { useAsyncForm } from '../../shared/hooks/useAsyncForm';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/apiClient';

const userFormSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required'),
  displayName: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  phoneNumber: z.string().optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  designation: z.string().optional(),
  branchId: z.string().optional(),
  reportingManagerId: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'CUSTOM']),
  customRoleId: z.string().optional(),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  dateFormat: z.string().default('YYYY-MM-DD'),
  currency: z.string().default('USD'),
  hasLoginAccess: z.boolean().default(true),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
  isTemporaryPassword: z.boolean().default(false),
  forcePasswordChange: z.boolean().default(false),
  sendEmailVerification: z.boolean().default(true),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
}).refine((data) => {
  if (data.hasLoginAccess && data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserFormValues = z.infer<typeof userFormSchema>;

export const UserForm = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useAsyncForm<UserFormValues>(
    {
      resolver: zodResolver(userFormSchema as any) as any,
      defaultValues: {
        role: 'USER',
        hasLoginAccess: true,
        isActive: true,
        sendEmailVerification: true,
        forcePasswordChange: true,
        isTemporaryPassword: false,
      }
    },
    null,
    () => ({})
  );
  
  const { register, handleFormSubmit, control, watch, formState: { errors } } = form;

  const hasLoginAccess = watch('hasLoginAccess');
  const selectedRole = watch('role');

  const { data: departments = [] } = useQuery({ 
    queryKey: ['departments'], 
    queryFn: async () => { 
      const res = await apiClient.get('/hr-masters/departments'); 
      return Array.isArray(res) ? res : res.data || []; 
    }
  });

  const departmentId = watch('departmentId');
  const { data: designations = [] } = useQuery({ 
    queryKey: ['designations', departmentId], 
    queryFn: async () => { 
      const res = await apiClient.get(`/hr-masters/designations?departmentId=${departmentId}`); 
      return Array.isArray(res) ? res : res.data || []; 
    },
    enabled: !!departmentId
  });

  const onSubmit = async (values: UserFormValues) => {
    try {
      setIsSubmitting(true);
      await apiClient.post('/users/enterprise-create', values);
      notification.success('User created successfully');
      navigate('/users');
    } catch (err: any) {
      notification.error(err.response?.data?.error || err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer maxWidth="5xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent/10 rounded-lg text-muted-foreground hover:text-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader title="Create New User" description="Set up a new enterprise user profile and access rights." />
      </div>

      <form onSubmit={handleFormSubmit(onSubmit as any)} className="space-y-6">
        {/* Profile & Basic Info */}
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2 flex items-center gap-6 mb-2">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground bg-muted/10 cursor-pointer hover:bg-accent/5 hover:border-accent/30 transition-colors">
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-xs">Upload</span>
              </div>
              <div>
                <h4 className="text-sm font-medium">Profile Photo</h4>
                <p className="text-xs text-muted-foreground mt-1">Recommended size: 256x256px. Max 2MB.</p>
              </div>
            </div>

            <div>
              <Input label="Full Name" required {...register('fullName')} />
              <FormErrorDisplay error={errors.fullName} />
            </div>
            <div>
              <Input label="Display Name" {...register('displayName')} />
              <FormErrorDisplay error={errors.displayName} />
            </div>
            <div>
              <Input label="Username" required {...register('username')} />
              <FormErrorDisplay error={errors.username} />
            </div>
            <div>
              <Input label="Email Address" type="email" required {...register('email')} />
              <FormErrorDisplay error={errors.email} />
            </div>
            <div>
              <Input label="Phone Number" {...register('phoneNumber')} />
              <FormErrorDisplay error={errors.phoneNumber} />
            </div>
            <div>
              <Input label="Employee ID" {...register('employeeId')} />
              <FormErrorDisplay error={errors.employeeId} />
            </div>
          </div>
        </div>

        {/* Organization Info */}
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Organization</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="Department"
                    placeholder="Search department..."
                    value={field.value || ''}
                    onChange={(val: string) => {
                      field.onChange(val);
                      form.setValue('designation', '');
                    }}
                    options={departments}
                    mapOption={(d: any) => ({ label: d.name, value: d.id })}
                  />
                )}
              />
              <FormErrorDisplay error={errors.departmentId} />
            </div>
            <div>
              <Controller
                name="designation"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="Designation"
                    placeholder={departmentId ? "Search designation..." : "Select Department First"}
                    disabled={!departmentId}
                    value={field.value || ''}
                    onChange={(val: string) => field.onChange(val)}
                    options={designations}
                    mapOption={(d: any) => ({ label: d.name, value: d.id })}
                  />
                )}
              />
              <FormErrorDisplay error={errors.designation} />
            </div>
            <div>
              <Input label="Branch / Location" {...register('branchId')} placeholder="Select branch..." />
              <FormErrorDisplay error={errors.branchId} />
            </div>
            <div>
              <Input label="Reporting Manager" {...register('reportingManagerId')} placeholder="Search manager..." />
              <FormErrorDisplay error={errors.reportingManagerId} />
            </div>
          </div>
        </div>

        {/* Access & Security */}
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Access & Security</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Select 
                  label="System Role" 
                  required 
                  {...register('role')}
                  options={[
                    { value: "USER", label: "User" },
                    { value: "MANAGER", label: "Manager" },
                    { value: "ADMIN", label: "Administrator" },
                    { value: "CUSTOM", label: "Custom Role" }
                  ]}
                />
                <FormErrorDisplay error={errors.role} />
              </div>
              {selectedRole === 'CUSTOM' && (
                <div>
                  <Select 
                    label="Custom Role" 
                    required 
                    {...register('customRoleId')}
                    options={[
                      { value: "", label: "Select Custom Role" }
                    ]}
                  />
                  <FormErrorDisplay error={errors.customRoleId} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 py-2 border-t border-border">
              <input type="checkbox" id="hasLogin" {...register('hasLoginAccess')} className="w-4 h-4 text-accent border-input rounded" />
              <label htmlFor="hasLogin" className="text-sm font-medium">Enable System Login Access</label>
            </div>

            {hasLoginAccess && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-lg border border-border/50">
                <div>
                  <Input label="Initial Password" type="password" {...register('password')} />
                  <FormErrorDisplay error={errors.password} />
                </div>
                <div>
                  <Input label="Confirm Password" type="password" {...register('confirmPassword')} />
                  <FormErrorDisplay error={errors.confirmPassword} />
                </div>
                
                <div className="col-span-1 md:col-span-2 flex flex-col gap-2 mt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register('forcePasswordChange')} className="rounded" />
                    Force password change on first login
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register('sendEmailVerification')} className="rounded" />
                    Send email verification link
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preferences & Status */}
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Preferences & Status</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Select 
                label="Language" 
                {...register('language')}
                options={[
                  { value: "en", label: "English (US)" },
                  { value: "es", label: "Spanish" }
                ]}
              />
            </div>
            <div>
              <Select 
                label="Timezone" 
                {...register('timezone')}
                options={[
                  { value: "UTC", label: "UTC" },
                  { value: "America/New_York", label: "Eastern Time" }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Status</label>
              <div className="flex items-center gap-2 mt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" {...register('isActive')} className="sr-only peer" />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  <span className="ml-3 text-sm font-medium text-foreground">{watch('isActive') ? 'Active' : 'Inactive'}</span>
                </label>
              </div>
            </div>
            <div className="col-span-1 md:col-span-3">
              <label className="block text-sm font-medium mb-1">Internal Notes</label>
              <textarea {...register('notes')} rows={3} className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm resize-none"></textarea>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 rounded-lg font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-semibold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Create User
          </button>
        </div>
      </form>
    </PageContainer>
  );
};
