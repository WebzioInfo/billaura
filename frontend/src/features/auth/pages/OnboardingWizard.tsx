import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../../services/api';
import { useSessionStore } from '../stores/sessionStore';
import {
  Building2, Percent, Calendar, CheckCircle2, CreditCard,
  ArrowRight, Loader2, LogOut
} from 'lucide-react';
import { TokenService } from '../../../services/auth/TokenService';

// Steps definition
type Step = 'BUSINESS_DETAILS' | 'TAX_DETAILS' | 'BRANCH_SETUP' | 'SUBSCRIPTION' | 'COMPLETED';

// Schemas
const businessSchema = z.object({
  companyName: z.string().min(3, 'Company name is too short'),
  businessType: z.string().min(2, 'Select a business type'),
});

const taxSchema = z.object({
  taxNumber: z.string().min(5, 'Invalid Tax Identification Number'),
});

const branchSchema = z.object({
  currency: z.string().length(3, 'Select a 3-letter currency code'),
  fiscalYearStart: z.string().nonempty('Fiscal year start date is required'),
  fiscalYearEnd: z.string().nonempty('Fiscal year end date is required'),
  branchName: z.string().min(2, 'Branch name is too short'),
});

export const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { user, setSession, clearSession } = useSessionStore();
  const [currentStep, setCurrentStep] = useState<Step>('BUSINESS_DETAILS');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.onboardingStep) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStep(user.onboardingStep as Step);
    }
  }, [user]);

  // Form hooks
  const businessForm = useForm({ resolver: zodResolver(businessSchema) });
  const taxForm = useForm({ resolver: zodResolver(taxSchema) });
  const branchForm = useForm({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      currency: 'USD',
      fiscalYearStart: '2026-04-01',
      fiscalYearEnd: '2027-03-31',
      branchName: 'Headquarters',
    }
  });

  const handleLogout = async () => {
    try {
      const refreshToken = TokenService.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      clearSession();
      navigate('/login');
    }
  };

  const onBusinessSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post('/auth/onboard/business', data);
      setCurrentStep(response.data.onboardingStep);
      if (user) {
        setSession({ ...user, onboardingStep: response.data.onboardingStep });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit business details');
    } finally {
      setIsLoading(false);
    }
  };

  const onTaxSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post('/auth/onboard/tax', data);
      setCurrentStep(response.data.onboardingStep);
      if (user) {
        setSession({ ...user, onboardingStep: response.data.onboardingStep });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit tax details');
    } finally {
      setIsLoading(false);
    }
  };

  const onBranchSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post('/auth/onboard/branch', data);
      setCurrentStep(response.data.onboardingStep);
      if (user) {
        setSession({ ...user, onboardingStep: response.data.onboardingStep });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit branch/fiscal details');
    } finally {
      setIsLoading(false);
    }
  };

  const completeSubscription = async (plan: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post('/auth/onboard/subscription', { planName: plan });
      setCurrentStep(response.data.onboardingStep);
      if (user) {
        setSession({ ...user, onboardingStep: response.data.onboardingStep });
      }
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to complete subscription');
    } finally {
      setIsLoading(false);
    }
  };

  // Render helpers
  const renderStepHeader = () => {
    const steps: { label: string; step: Step }[] = [
      { label: 'Business', step: 'BUSINESS_DETAILS' },
      { label: 'Taxation', step: 'TAX_DETAILS' },
      { label: 'Fiscal Setup', step: 'BRANCH_SETUP' },
      { label: 'Plan', step: 'SUBSCRIPTION' },
    ];

    return (
      <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-10 border-b border-slate-100 pb-4">
        {steps.map((s, idx) => {
          const isDone = steps.findIndex(x => x.step === currentStep) > idx;
          const isActive = currentStep === s.step;
          return (
            <div key={s.step} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${isDone ? 'bg-indigo-600 text-white' :
                  isActive ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-400'
                }`}>
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>{s.label}</span>
              {idx < steps.length - 1 && <span className="text-slate-300 text-xs">/</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Setup Workspace</h1>
          <p className="text-sm text-slate-500 mt-1">Initialize your accounting environment</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-55 hover:text-slate-900 rounded-lg text-slate-500 text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>

      {renderStepHeader()}

      {errorMessage && (
        <div className="p-3 mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
          {errorMessage}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-200/60 p-8 text-left">
        {currentStep === 'BUSINESS_DETAILS' && (
          <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Company & Business Information</h3>
                <p className="text-slate-500 text-xs">Specify your registered brand and operational type</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Company Registered Name</label>
                <input
                  type="text"
                  {...businessForm.register('companyName')}
                  placeholder="e.g. Acme Logistics Ltd"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                />
                {businessForm.formState.errors.companyName && (
                  <p className="text-xs text-red-500 mt-1">{businessForm.formState.errors.companyName.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Business Vertical / Category</label>
                <select
                  {...businessForm.register('businessType')}
                  className="w-full px-4 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                >
                  <option value="">Select Company Type</option>
                  <option value="SaaS / Software">SaaS / Software</option>
                  <option value="Manufacturing / Production">Manufacturing / Production</option>
                  <option value="Retail / E-Commerce">Retail / E-Commerce</option>
                  <option value="Professional Services">Professional Services</option>
                  <option value="Logistics & Warehousing">Logistics & Warehousing</option>
                </select>
                {businessForm.formState.errors.businessType && (
                  <p className="text-xs text-red-500 mt-1">{businessForm.formState.errors.businessType.message as string}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm mt-4"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue to Tax Configuration'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {currentStep === 'TAX_DETAILS' && (
          <form onSubmit={taxForm.handleSubmit(onTaxSubmit)} className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tax & Corporate Identifiers</h3>
                <p className="text-slate-500 text-xs">Enter your local taxation code (e.g. GSTIN, EIN)</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">GSTIN / EIN / VAT Number</label>
                <input
                  type="text"
                  {...taxForm.register('taxNumber')}
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm tracking-wider uppercase transition-all"
                />
                {taxForm.formState.errors.taxNumber && (
                  <p className="text-xs text-red-500 mt-1">{taxForm.formState.errors.taxNumber.message as string}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm mt-4"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Configure Currency & Branch'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {currentStep === 'BRANCH_SETUP' && (
          <form onSubmit={branchForm.handleSubmit(onBranchSubmit)} className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Financial Base & Locations</h3>
                <p className="text-slate-500 text-xs">Setup fiscal year cycle, default currency and primary office</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Corporate Currency</label>
                  <select
                    {...branchForm.register('currency')}
                    className="w-full px-4 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none text-sm transition-all"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Main Branch / Office Name</label>
                  <input
                    type="text"
                    {...branchForm.register('branchName')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fiscal Year Start</label>
                  <input
                    type="date"
                    {...branchForm.register('fiscalYearStart')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fiscal Year End</label>
                  <input
                    type="date"
                    {...branchForm.register('fiscalYearEnd')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm mt-4"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Proceed to Subscriptions'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {currentStep === 'SUBSCRIPTION' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Choose Workspace Plan</h3>
                <p className="text-slate-500 text-xs">Unlock accounting capabilities scaled to your business footprint</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Plan 1 */}
              <div className="border border-slate-200 rounded-2xl p-6 hover:border-indigo-600 transition-all flex flex-col justify-between group">
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">Startup Trial</h4>
                  <p className="text-slate-400 text-xs mt-1">Ideal for young companies scaling production</p>
                  <div className="my-6">
                    <span className="text-3xl font-extrabold text-slate-900">$0</span>
                    <span className="text-slate-400 text-xs font-semibold"> / 14 Days</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2 mb-8">
                    <li className="flex items-center gap-2">✓ Multi-Tenant Isolation</li>
                    <li className="flex items-center gap-2">✓ CRM & Financial ledger</li>
                    <li className="flex items-center gap-2">✓ 1 General Branch</li>
                  </ul>
                </div>
                <button
                  onClick={() => completeSubscription('TRIAL')}
                  disabled={isLoading}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  Activate Trial
                </button>
              </div>

              {/* Plan 2 */}
              <div className="border border-indigo-100 bg-indigo-50/50 rounded-2xl p-6 hover:border-indigo-600 transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Popular</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">Enterprise Scale</h4>
                  <p className="text-slate-400 text-xs mt-1">Full suite access for mid-to-large business hubs</p>
                  <div className="my-6">
                    <span className="text-3xl font-extrabold text-slate-900">$299</span>
                    <span className="text-slate-400 text-xs font-semibold"> / month</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2 mb-8">
                    <li className="flex items-center gap-2 font-medium text-slate-800">✓ Everything in Startup</li>
                    <li className="flex items-center gap-2">✓ Custom Workflows & Approvals</li>
                    <li className="flex items-center gap-2">✓ Unlimited Branches & Users</li>
                  </ul>
                </div>
                <button
                  onClick={() => completeSubscription('ENTERPRISE')}
                  disabled={isLoading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors"
                >
                  Go Enterprise
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'COMPLETED' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Workspace Activated</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">All systems verified and initialized. Redirecting you to your accounting console...</p>
            <div className="w-12 h-1.5 bg-emerald-100 rounded-full mx-auto relative overflow-hidden">
              <div className="w-6 h-full bg-emerald-600 rounded-full absolute left-0 top-0 animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
