export const getVendorDisplayName = (vendor: any): string => {
  if (!vendor) return '';
  
  // Priority 1: Vendor Display Name (tradeName)
  if (vendor.tradeName) return vendor.tradeName;
  
  // Priority 2: Vendor First Name (name)
  if (vendor.name) return vendor.name;
  
  // Priority 3: Company Name (can be in tradeName or name, already covered)
  // Let's assume tradeName is Company Name and name is contact name.
  
  // Priority 4: Vendor Code (fallback)
  if (vendor.bpCode) return vendor.bpCode;
  if (vendor.vendorCode) return vendor.vendorCode;
  
  return 'Unknown Vendor';
};

export const getCustomerDisplayName = (customer: any): string => {
  if (!customer) return '';
  if (customer.tradeName) return customer.tradeName;
  if (customer.name) return customer.name;
  if (customer.bpCode) return customer.bpCode;
  if (customer.customerCode) return customer.customerCode;
  return 'Unknown Customer';
};
