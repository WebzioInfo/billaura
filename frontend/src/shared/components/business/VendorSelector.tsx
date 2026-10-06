import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vendor } from '../../../shared/types';
import { SearchableSelect } from '../ui/SearchableSelect';
import { apiClient as api, ensureArray } from '../../../core/api/apiClient';

interface VendorSelectorProps {
  value: string;
  onChange: (value: string, vendor?: any) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

export const VendorSelector = ({ value, onChange, error, label = "Vendor", required = false }: VendorSelectorProps) => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchVendors = useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    api.get('/vendors')
      .then((res: any) => {
        setVendors(ensureArray<Vendor>(res));
      })
      .catch(() => {
        setIsError(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return (
    <SearchableSelect
      label={label}
      value={value}
      onChange={onChange}
      options={vendors}
      mapOption={(v: any) => ({
        label: `${v.name || 'Unnamed'}${v.vendorCode ? ` (${v.vendorCode})` : ''}`,
        value: v.id,
        description: [v.gstNumber || v.gstin, v.phone, v.state].filter(Boolean).join(' • ') || undefined,
        searchKeywords: [v.gstNumber, v.gstin, v.phone, v.email, v.vendorCode, v.customerCode].filter(Boolean),
      })}
      placeholder="Select vendor..."
      searchPlaceholder="Search vendor by name, code, phone, GSTIN..."
      error={error}
      required={required}
      isLoading={isLoading}
      isError={isError}
      onRetry={fetchVendors}
      onCreate={() => navigate('/vendors/new')}
      createLabel="Create Vendor"
      allowClear={!required}
    />
  );
};
