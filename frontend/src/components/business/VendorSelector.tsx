import React, { useEffect, useState } from 'react';
import { Vendor } from '../../types';
import { Select } from '../ui/Select';
import api from '../../services/api';

interface VendorSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const VendorSelector = ({ value, onChange, error }: VendorSelectorProps) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    api.get<Vendor[]>('/vendors').then((res) => {
      setVendors(Array.isArray(res) ? res : ((res as any)?.data || []));
    });
  }, []);

  const options = [
    { label: 'Select vendor...', value: '' },
    ...vendors.map(v => ({
      label: `${v.name} (${v.vendorCode})`,
      value: v.id
    }))
  ];

  return (
    <Select
      label="Vendor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      error={error}
    />
  );
};
