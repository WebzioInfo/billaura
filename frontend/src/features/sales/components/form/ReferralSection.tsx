import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormSection } from '@/shared/components/ui/LayoutComponents';
import { Users, Building } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';
import { Select } from '@/shared/components/ui/Select';

export const ReferralSection = ({ form }: { form: UseFormReturn<any> }) => {
  const { watch, register } = form;
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
          <div className="relative">
            <Users className="absolute left-3 top-8 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Select
              label="Select Employee"
              {...register('employeeId')}
              className="pl-9"
              options={[
                { label: 'Select an employee...', value: '' },
                ...employees.map((emp: any) => ({
                  label: `${emp.firstName} ${emp.lastName}`,
                  value: emp.id
                }))
              ]}
            />
          </div>
        )}

        {sourceType === 'BUSINESS_PARTNER' && (
          <div className="relative">
            <Building className="absolute left-3 top-8 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Select
              label="Select Partner / Agent"
              {...register('referralPartnerId')}
              className="pl-9"
              options={[
                { label: 'Select a partner...', value: '' },
                ...partners.map((partner: any) => ({
                  label: partner.name,
                  value: partner.id
                }))
              ]}
            />
          </div>
        )}
      </div>
    </FormSection>
  );
};
