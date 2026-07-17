const fs = require('fs');
const file = 'd:/Webzio/billaura/apps/frontend/src/features/crm/BusinessPartnerForm.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add location checks
content = content.replace(
  /useParams\(\);/,
  `useParams();\n  const location = window.location.pathname;\n  const isVendor = location.includes('/vendors');\n  const entityPath = isVendor ? 'vendors' : 'customers';\n  const entityName = isVendor ? 'Vendor' : 'Customer';`
);

// Replace static API calls
content = content.replace(/'\/customers'/g, '`/${entityPath}`');
content = content.replace(/'\/customers\//g, '`/${entityPath}/');
content = content.replace(/\/customers\//g, '/${entityPath}/');

// Dynamic entity names
content = content.replace(/Customer/g, '${entityName}');
content = content.replace(/customer/g, '${entityPath.slice(0, -1)}');
// Fix uppercase C we just replaced for CustomerForm to keep it exact if it breaks, but we renamed to BusinessPartnerForm earlier.

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed URLs');
