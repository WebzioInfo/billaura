import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormSection } from '@/shared/components/ui/LayoutComponents';
import { Users, Building } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';
import { Select } from '@/shared/components/ui/Select';
import { SearchableSelect } from '@/shared/components/ui';

export const ReferralSection = ({ form }: { form: UseFormReturn<any> }) => {
  const { watch, register, setValue } = form;
  const sourceType = watch('referralSourceType');

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      // Stub: in reality, should hit the employees API
      const res = await apiClient.get('/hr/employees');
      return res.data?.data || [];
    },
  });

  // Fetch partners
  const { data: partners = [] } = useQuery({
    queryKey: ['business-partners', 'partner'],
    queryFn: async () => {
      // Usually fetch partners of type VENDOR or specialized AGENT
      const res = await apiClient.get('/vendors');
      return res.data?.data || [];
    },
  });

  return (
    <FormSection title="Referral & Commission">
      <div className="text-sm text-muted-foreground mb-4">
        Attach this document to an employee or external agent for commission processing.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Referral Source Type"
          {...register('referralSourceType')}
          options={[
            { label: 'No Referral', value: '' },
            { label: 'Internal Employee', value: 'EMPLOYEE' },
            { label: 'External Partner / Agent', value: 'BUSINESS_PARTNER' },
            { label: 'Walk In', value: 'WALK_IN' },
            { label: 'Website', value: 'WEBSITE' },
            { label: 'Other', value: 'OTHER' },
          ]}
        />

        {sourceType === 'EMPLOYEE' && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Select Employee
            </label>
            <SearchableSelect
              value={watch('employeeId') || ''}
              onChange={(val) => setValue('employeeId', val, { shouldValidate: true })}
              options={employees}
              mapOption={(emp: any) => ({
                value: emp.id,
                label: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name,
                subLabel: [emp.employeeCode, emp.department?.name].filter(Boolean).join(' • '),
                searchKeywords: [emp.employeeCode, emp.email, emp.mobile].filter(Boolean),
              })}
              placeholder="Select an employee..."
              searchPlaceholder="Search employees..."
              clearable
            />
          </div>
        )}

        {sourceType === 'BUSINESS_PARTNER' && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Select Partner / Agent
            </label>
            <SearchableSelect
              value={watch('referralPartnerId') || ''}
              onChange={(val) => setValue('referralPartnerId', val, { shouldValidate: true })}
              options={partners}
              mapOption={(partner: any) => ({
                value: partner.id,
                label: partner.name,
                subLabel: [partner.gstin, partner.phone].filter(Boolean).join(' • '),
                searchKeywords: [partner.gstin, partner.phone, partner.email].filter(Boolean),
              })}
              placeholder="Select a partner..."
              searchPlaceholder="Search partners/agents..."
              clearable
            />
          </div>
        )}
      </div>
    </FormSection>
  );
};
