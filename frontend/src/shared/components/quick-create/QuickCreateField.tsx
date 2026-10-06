import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';
import { ensureArray } from '@/core/api/apiClient';
import { SearchableSelect, SearchableSelectOption } from '../ui/SearchableSelect';
import { QuickCreateEntityType, QUICK_CREATE_REGISTRY } from './quickCreateRegistry';

export interface QuickCreateFieldProps {
  entity: QuickCreateEntityType;
  value: string;
  onChange: (value: string, item?: any) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  showQuickCreateButton?: boolean;
  quickCreatePosition?: 'above' | 'header-right' | 'none';
  quickCreateDefaultValues?: Record<string, any>;
  onQuickCreated?: (item: any) => void;
  additionalParams?: Record<string, any>;
  customOptions?: any[];
  mapOption?: (item: any) => SearchableSelectOption;
  allowClear?: boolean;
}

export const QuickCreateField: React.FC<QuickCreateFieldProps> = ({
  entity,
  value,
  onChange,
  label,
  placeholder,
  searchPlaceholder,
  required = false,
  disabled = false,
  error,
  helperText,
  className,
  showQuickCreateButton = true,
  quickCreatePosition = 'above',
  quickCreateDefaultValues,
  onQuickCreated,
  additionalParams,
  customOptions,
  mapOption: customMapOption,
  allowClear = !required,
}) => {
  const config = QUICK_CREATE_REGISTRY[entity];
  const displayLabel = label !== undefined ? label : config?.title;

  // Query options from API if custom options not explicitly passed
  const { data: fetchedData = [], isLoading, isError, refetch } = useQuery({
    queryKey: [config?.endpoint || entity, additionalParams],
    queryFn: async () => {
      if (!config?.endpoint) return [];
      const res = await apiClient.get(config.endpoint, { params: additionalParams });
      const raw = res?.data?.items || res?.data || res?.items || res;
      return ensureArray(raw);
    },
    enabled: !customOptions,
    staleTime: 60 * 1000,
  });

  const rawOptions = customOptions || fetchedData;

  const defaultOptionMapper = (item: any): SearchableSelectOption => {
    if (customMapOption) return customMapOption(item);

    switch (entity) {
      case 'customer':
        return {
          label: `${item.name || 'Unnamed'}${item.customerCode || item.bpCode ? ` (${item.customerCode || item.bpCode})` : ''}`,
          value: String(item.id),
          description: [item.gstin || item.gstNumber, item.phone || item.mobile, item.city].filter(Boolean).join(' • ') || undefined,
          searchKeywords: [item.gstin, item.gstNumber, item.phone, item.mobile, item.email, item.customerCode, item.bpCode].filter(Boolean),
        };
      case 'vendor':
        return {
          label: `${item.name || 'Unnamed'}${item.vendorCode || item.bpCode ? ` (${item.vendorCode || item.bpCode})` : ''}`,
          value: String(item.id),
          description: [item.gstin || item.gstNumber, item.phone, item.city].filter(Boolean).join(' • ') || undefined,
          searchKeywords: [item.gstin, item.gstNumber, item.phone, item.email, item.vendorCode, item.bpCode].filter(Boolean),
        };
      case 'product':
        return {
          label: `${item.name || 'Unnamed'}${item.sku ? ` (${item.sku})` : ''}`,
          value: String(item.id),
          description: `₹${item.sellingPrice || item.price || 0} • ${item.unit || 'PCS'}${item.hsnCode ? ` • HSN: ${item.hsnCode}` : ''}`,
          searchKeywords: [item.sku, item.hsnCode, item.barcode].filter(Boolean),
        };
      case 'warehouse':
        return {
          label: item.name || 'Unnamed Warehouse',
          value: String(item.id),
          description: item.location || item.code || undefined,
          searchKeywords: [item.code, item.location].filter(Boolean),
        };
      case 'category':
        return {
          label: item.categoryName || item.name || 'Unnamed Category',
          value: String(item.id),
          description: item.description || undefined,
        };
      case 'brand':
        return {
          label: item.brandName || item.name || 'Unnamed Brand',
          value: String(item.id),
          description: item.code || item.description || undefined,
          searchKeywords: [item.code].filter(Boolean),
        };
      case 'account':
        return {
          label: `${item.name || 'Unnamed Account'}${item.code ? ` (${item.code})` : ''}`,
          value: String(item.id),
          description: item.category ? `Category: ${item.category}` : undefined,
          searchKeywords: [item.code, item.category].filter(Boolean),
        };
      case 'bankAccount':
        return {
          label: `${item.name || item.bankName || 'Unnamed'}${item.accountNumber ? ` (••••${String(item.accountNumber).slice(-4)})` : ''}`,
          value: String(item.id),
          description: [item.bankName, item.accountType, item.accountNumber].filter(Boolean).join(' • ') || undefined,
          searchKeywords: [item.accountNumber, item.bankName, item.ifscCode].filter(Boolean),
        };
      case 'employee':
        return {
          label: `${item.name || 'Unnamed'}${item.employeeCode ? ` (${item.employeeCode})` : ''}`,
          value: String(item.id),
          description: [item.mobile, item.email, item.department].filter(Boolean).join(' • ') || undefined,
          searchKeywords: [item.employeeCode, item.mobile, item.email].filter(Boolean),
        };
      case 'unit':
        return {
          label: `${item.name || item.unitName} (${item.code || item.unitCode})`,
          value: String(item.id || item.code),
          description: item.precision !== undefined ? `Precision: ${item.precision}` : undefined,
          searchKeywords: [item.code, item.unitCode].filter(Boolean),
        };
      case 'expenseCategory':
        return {
          label: item.name || 'Unnamed Category',
          value: String(item.id),
          description: item.description || undefined,
        };
      default:
        return {
          label: item.name || item.label || String(item.id || item.value || ''),
          value: String(item.id || item.value || ''),
        };
    }
  };

  return (
    <SearchableSelect
      label={displayLabel}
      value={value}
      onChange={onChange}
      options={rawOptions}
      mapOption={defaultOptionMapper}
      placeholder={placeholder || `Select ${config?.title || 'option'}...`}
      searchPlaceholder={searchPlaceholder || `Search ${config?.title?.toLowerCase() || 'options'}...`}
      error={error}
      helperText={helperText}
      required={required}
      disabled={disabled}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      className={className}
      quickCreateEntity={entity}
      quickCreateDefaultValues={quickCreateDefaultValues}
      onQuickCreated={onQuickCreated}
      showQuickCreateButton={showQuickCreateButton}
      quickCreatePosition={quickCreatePosition}
      allowClear={allowClear}
    />
  );
};
