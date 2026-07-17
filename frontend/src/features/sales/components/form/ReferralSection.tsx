import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormSection } from '@/components/ui/LayoutComponents';
import { Card } from '@/components/ui/Card';
import { Users, Building } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api';

export const ReferralSection = ({ form }: { form: UseFormReturn<any> }) => {
  const { watch, register, setValue } = form;
  const sourceType = watch('referralSourceType');

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      // Stub: in reality, should hit the employees API
      const res = await apiClient.get('/employees');
      return res.data?.data || [];
    },
  });

  // Fetch partners
  const { data: partners = [] } = useQuery({
    queryKey: ['business-partners', 'partner'],
    queryFn: async () => {
      // Usually fetch partners of type VENDOR or specialized AGENT
      const res = await apiClient.get('/business-partners?type=VENDOR');
      return res.data?.data || [];
    },
  });

  return (
    <FormSection title="Referral & Commission">
      <div className="text-sm text-slate-500 mb-4">
        Attach this document to an employee or external agent for commission processing.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Referral Source Type
          </label>
          <select
            {...register('referralSourceType')}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          >
            <option value="">No Referral</option>
            <option value="EMPLOYEE">Internal Employee</option>
            <option value="BUSINESS_PARTNER">External Partner / Agent</option>
            <option value="WALK_IN">Walk In</option>
            <option value="WEBSITE">Website</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {sourceType === 'EMPLOYEE' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Employee
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <select
                {...register('employeeId')}
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              >
                <option value="">Select an employee...</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {sourceType === 'BUSINESS_PARTNER' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Partner / Agent
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <select
                {...register('referralPartnerId')}
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              >
                <option value="">Select a partner...</option>
                {partners.map((partner: any) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </FormSection>
  );
};
