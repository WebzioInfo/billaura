const fs = require('fs');
const file = 'd:/Webzio/billaura/apps/frontend/src/features/crm/BusinessPartnerForm.tsx';
let code = fs.readFileSync(file, 'utf-8');

const dynamicVars = `
  const isVendor = window.location.pathname.includes('/vendors');
  const entityType = isVendor ? 'VENDOR' : 'CUSTOMER';
  const entityPath = isVendor ? 'vendors' : 'customers';
  const entityLabel = isVendor ? 'Vendor' : 'Customer';
`;

if (!code.includes('const isVendor =')) {
  code = code.replace(/const queryClient = useQueryClient\(\);/, 'const queryClient = useQueryClient();' + dynamicVars);
  
  // Also we need to fix CustomerFormValues where I missed it
  code = code.replace(/CustomerFormValues/g, 'BusinessPartnerFormValues');
  fs.writeFileSync(file, code, 'utf-8');
}

console.log('Fixed vars');
