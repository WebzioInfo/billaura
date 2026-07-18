import React, { useEffect, useState } from 'react';
import { Customer } from '../../../shared/types';
import { Select } from '../ui/Select';
import { CrmApi } from '../../../features/crm/api/crm.api';

interface CustomerSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const CustomerSelector = ({ value, onChange, error }: CustomerSelectorProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    CrmApi.getCustomers().then((res: any) => {
      setCustomers(Array.isArray(res) ? res : ((res as any)?.data || []));
    });
  }, []);

  const options = [
    { label: 'Select customer...', value: '' },
    ...customers.map(c => ({
      label: `${c.name} (${c.customerCode})`,
      value: c.id
    }))
  ];

  return (
    <Select
      label="Customer"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      error={error}
    />
  );
};

