const fs = require('fs');

const file = 'd:/Webzio/billaura/apps/frontend/src/features/crm/BusinessPartnerForm.tsx';
let code = fs.readFileSync(file, 'utf-8');

// 1. Rename Component and Schema
code = code.replace(/export const CustomerForm = \(\) => \{/g, 'export const BusinessPartnerForm = () => {');
code = code.replace(/const customerSchema = /g, 'const bpSchema = ');
code = code.replace(/type CustomerFormValues = z\.infer<typeof customerSchema>;/g, 'type BusinessPartnerFormValues = z.infer<typeof bpSchema>;');

// 2. Add isVendor dynamic checks inside the component
const componentStart = 'export const BusinessPartnerForm = () => {\n  const { id } = useParams();\n  const navigate = useNavigate();\n  const queryClient = useQueryClient();\n';
const dynamicVars = `
  const isVendor = window.location.pathname.includes('/vendors');
  const entityType = isVendor ? 'VENDOR' : 'CUSTOMER';
  const entityPath = isVendor ? 'vendors' : 'customers';
  const entityLabel = isVendor ? 'Vendor' : 'Customer';
`;
code = code.replace(/export const CustomerForm = \(\) => \{\n  const \{ id \} = useParams\(\);\n  const navigate = useNavigate\(\);\n  const queryClient = useQueryClient\(\);/g, componentStart + dynamicVars);

// 3. Update useQuery hooks
code = code.replace(/queryKey: \['customer', id\]/g, 'queryKey: [entityPath, id]');
code = code.replace(/apiClient\.get\(\`\/customers\/\$\{id\}\`\)/g, 'apiClient.get(`/${entityPath}/${id}`)');

// 4. Update useAsyncForm
code = code.replace(/useAsyncForm<CustomerFormValues>/g, 'useAsyncForm<BusinessPartnerFormValues>');
code = code.replace(/resolver: zodResolver\(customerSchema as any\) as any/g, 'resolver: zodResolver(bpSchema as any) as any');

// 5. Update useMutation
code = code.replace(/mutationFn: async \(data: CustomerFormValues\) => \{/g, 'mutationFn: async (data: BusinessPartnerFormValues) => {');
code = code.replace(/apiClient\.patch\(\`\/customers\/\$\{id\}\`, submitData\)/g, 'apiClient.patch(`/${entityPath}/${id}`, submitData)');
code = code.replace(/apiClient\.post\('\/customers', submitData\)/g, 'apiClient.post(`/${entityPath}`, submitData)');
code = code.replace(/queryKey: \['customers'\]/g, 'queryKey: [entityPath]');

// 6. Fix Navigation
code = code.replace(/navigate\(newId \? \`\/app\/customers\/\$\{newId\}\` : '\/app\/customers'\);/g, 'navigate(newId ? `/app/${entityPath}/${newId}` : `/app/${entityPath}`);');

// 7. Update PageHeader and UI
code = code.replace(/'Edit Customer'/g, '`Edit ${entityLabel}`');
code = code.replace(/'New Customer'/g, '`New ${entityLabel}`');
code = code.replace(/'Customers'/g, 'entityLabel + "s"');
code = code.replace(/'\/app\/customers'/g, '`/app/${entityPath}`');
code = code.replace(/'Create Customer'/g, '`Create ${entityLabel}`');
code = code.replace(/label="Customer Name"/g, 'label={`${entityLabel} Name`}');
code = code.replace(/label="Customer Code"/g, 'label={`${entityLabel} Code`}');
code = code.replace(/label="Customer Type"/g, 'label={`${entityLabel} Type`}');
code = code.replace(/documentType="CUSTOMER"/g, 'documentType={entityType}');

// 8. Fix mutation submit mapping
const customerSubmitMapping = `const submitData = { ...data, bpCode: data.customerCode };`;
const genericSubmitMapping = `const submitData: any = { ...data, bpCode: data.customerCode };\n      if (isVendor) {\n        submitData.type = 'VENDOR';\n        submitData.vendorCode = data.customerCode;\n        submitData.vendorType = data.customerType;\n      } else {\n        submitData.type = 'CUSTOMER';\n      }`;
code = code.replace(customerSubmitMapping, genericSubmitMapping);

fs.writeFileSync(file, code, 'utf-8');
console.log('BusinessPartnerForm transformed successfully!');
