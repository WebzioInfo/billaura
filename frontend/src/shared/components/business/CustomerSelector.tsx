import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../../../shared/types';
import { SearchableSelect } from '../ui/SearchableSelect';
import { CrmApi } from '../../../features/crm/api/crm.api';
import { ensureArray } from '../../../core/api/apiClient';

interface CustomerSelectorProps {
  value: string;
  onChange: (value: string, customer?: any) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

export const CustomerSelector = ({ value, onChange, error, label = "Customer", required = false }: CustomerSelectorProps) => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchCustomers = useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    CrmApi.getCustomers()
      .then((res: any) => {
        setCustomers(ensureArray<Customer>(res));
      })
      .catch(() => {
        setIsError(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <SearchableSelect
      label={label}
      value={value}
      onChange={onChange}
      options={customers}
      mapOption={(c: any) => ({
        label: `${c.name || 'Unnamed'}${c.customerCode ? ` (${c.customerCode})` : ''}`,
        value: c.id,
        description: [c.gstNumber || c.gstin, c.phone, c.state].filter(Boolean).join(' • ') || undefined,
        searchKeywords: [c.gstNumber, c.gstin, c.phone, c.email, c.customerCode].filter(Boolean),
      })}
      placeholder="Select customer..."
      searchPlaceholder="Search customer by name, code, GSTIN, phone..."
      error={error}
      required={required}
      isLoading={isLoading}
      isError={isError}
      onRetry={fetchCustomers}
      quickCreateEntity="customer"
      onQuickCreated={(newCust) => {
        setCustomers((prev) => [newCust, ...prev]);
        fetchCustomers();
      }}
      allowClear={!required}
    />
  );
};
