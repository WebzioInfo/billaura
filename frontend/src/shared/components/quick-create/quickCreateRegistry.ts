export type QuickCreateEntityType =
  | 'customer'
  | 'vendor'
  | 'product'
  | 'category'
  | 'brand'
  | 'warehouse'
  | 'employee'
  | 'account'
  | 'bankAccount'
  | 'unit'
  | 'expenseCategory';

export interface QuickCreateFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: string }>;
  colSpan?: 1 | 2;
  uppercase?: boolean;
  helpText?: string;
}

export interface QuickCreateEntityConfig {
  type: QuickCreateEntityType;
  title: string;
  endpoint: string;
  permissions: string[];
  queryKeys: string[][];
  fields: QuickCreateFieldDef[];
  transformPayload: (values: Record<string, any>) => Record<string, any>;
  extractResult: (response: any) => { id: string; label: string; [key: string]: any };
}

export const QUICK_CREATE_REGISTRY: Record<QuickCreateEntityType, QuickCreateEntityConfig> = {
  customer: {
    type: 'customer',
    title: 'Customer',
    endpoint: '/customers',
    permissions: ['customer:create', 'customers:create', 'sales.create', 'sales:create', 'crm:create'],
    queryKeys: [['customers'], ['businessPartners']],
    fields: [
      {
        name: 'name',
        label: 'Customer Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Acme Corporation Pvt Ltd',
        colSpan: 2,
      },
      {
        name: 'customerType',
        label: 'Customer Type',
        type: 'select',
        defaultValue: 'B2B',
        options: [
          { label: 'B2B (Business)', value: 'B2B' },
          { label: 'B2C (Consumer)', value: 'B2C' },
          { label: 'Government', value: 'GOVERNMENT' },
          { label: 'Export', value: 'EXPORT' },
        ],
        colSpan: 1,
      },
      {
        name: 'phone',
        label: 'Phone / Mobile',
        type: 'tel',
        placeholder: '+91 9876543210',
        colSpan: 1,
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'billing@acme.com',
        colSpan: 1,
      },
      {
        name: 'gstin',
        label: 'GSTIN',
        type: 'text',
        placeholder: '29ABCDE1234F1Z5',
        uppercase: true,
        colSpan: 1,
      },
    ],
    transformPayload: (vals) => ({
      name: String(vals.name || '').trim(),
      customerType: vals.customerType || 'B2B',
      mobile: vals.phone ? String(vals.phone).trim() : undefined,
      phone: vals.phone ? String(vals.phone).trim() : undefined,
      email: vals.email ? String(vals.email).trim() : undefined,
      gstin: vals.gstin ? String(vals.gstin).trim().toUpperCase() : undefined,
    }),
    extractResult: (res) => {
      const data = res?.data || res;
      return {
        id: String(data.id || res.id),
        label: `${data.name || 'New Customer'}${data.bpCode ? ` (${data.bpCode})` : ''}`,
        ...data,
      };
    },
  },

  vendor: {
    type: 'vendor',
    title: 'Vendor / Supplier',
    endpoint: '/vendors',
    permissions: ['vendor:create', 'vendors:create', 'purchase.create', 'purchases:create'],
    queryKeys: [['vendors'], ['businessPartners']],
    fields: [
      {
        name: 'name',
        label: 'Vendor Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Reliance Industrial Supplies',
        colSpan: 2,
      },
      {
        name: 'phone',
        label: 'Phone / Contact',
        type: 'tel',
        placeholder: '+91 9876543210',
        colSpan: 1,
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'sales@relianceind.com',
        colSpan: 1,
      },
      {
        name: 'gstin',
        label: 'GSTIN',
        type: 'text',
        placeholder: '27AABCS1429B1Z1',
        uppercase: true,
        colSpan: 2,
      },
    ],
    transformPayload: (vals) => ({
      name: String(vals.name || '').trim(),
      phone: vals.phone ? String(vals.phone).trim() : undefined,
      email: vals.email ? String(vals.email).trim() : undefined,
      gstin: vals.gstin ? String(vals.gstin).trim().toUpperCase() : undefined,
    }),
    extractResult: (res) => {
      const data = res?.data || res;
      return {
        id: String(data.id || res.id),
        label: `${data.name || 'New Vendor'}${data.bpCode ? ` (${data.bpCode})` : ''}`,
        ...data,
      };
    },
  },

  product: {
    type: 'product',
    title: 'Product / Service',
    endpoint: '/products',
    permissions: ['product:create', 'products:create', 'inventory:create', 'inventory.create'],
    queryKeys: [['products'], ['product_catalog']],
    fields: [
      {
        name: 'name',
        label: 'Product / Item Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Industrial Valve 2-inch',
        colSpan: 2,
      },
      {
        name: 'itemType',
        label: 'Item Type',
        type: 'select',
        defaultValue: 'GOODS',
        options: [
          { label: 'Physical Goods (Track Stock)', value: 'GOODS' },
          { label: 'Service / Labor', value: 'SERVICE' },
        ],
        colSpan: 1,
      },
      {
        name: 'unit',
        label: 'Base Unit',
        type: 'select',
        defaultValue: 'PCS',
        options: [
          { label: 'Pieces (PCS)', value: 'PCS' },
          { label: 'Numbers (NOS)', value: 'NOS' },
          { label: 'Kilograms (KGS)', value: 'KGS' },
          { label: 'Boxes (BOX)', value: 'BOX' },
          { label: 'Meters (MTR)', value: 'MTR' },
          { label: 'Hours (HRS)', value: 'HRS' },
          { label: 'Set (SET)', value: 'SET' },
        ],
        colSpan: 1,
      },
      {
        name: 'sellingPrice',
        label: 'Selling Price (₹)',
        type: 'number',
        placeholder: '0.00',
        defaultValue: 0,
        colSpan: 1,
      },
      {
        name: 'purchasePrice',
        label: 'Purchase Cost (₹)',
        type: 'number',
        placeholder: '0.00',
        defaultValue: 0,
        colSpan: 1,
      },
      {
        name: 'gstRate',
        label: 'GST Rate',
        type: 'select',
        defaultValue: '18',
        options: [
          { label: '18% GST (Standard)', value: '18' },
          { label: '12% GST', value: '12' },
          { label: '5% GST', value: '5' },
          { label: '28% GST', value: '28' },
          { label: '0% / Exempt', value: '0' },
        ],
        colSpan: 1,
      },
      {
        name: 'hsnCode',
        label: 'HSN / SAC Code',
        type: 'text',
        placeholder: 'e.g. 8481',
        colSpan: 1,
      },
    ],
    transformPayload: (vals) => {
      const isService = vals.itemType === 'SERVICE';
      return {
        name: String(vals.name || '').trim(),
        unit: vals.unit || 'PCS',
        sellingPrice: Number(vals.sellingPrice || 0),
        purchasePrice: Number(vals.purchasePrice || 0),
        gstRate: Number(vals.gstRate ?? 18),
        hsnCode: vals.hsnCode ? String(vals.hsnCode).trim() : undefined,
        isService,
        isInventoryItem: !isService,
        isTrackStock: !isService,
        isSellable: true,
        isPurchasable: true,
        isTaxable: Number(vals.gstRate ?? 18) > 0,
      };
    },
    extractResult: (res) => {
      const data = res?.data || res;
      return {
        id: String(data.id || res.id),
        label: data.name || 'New Product',
        name: data.name,
        sellingPrice: data.sellingPrice,
        purchasePrice: data.purchasePrice,
        unit: data.unit,
        hsnCode: data.hsnCode,
        gstRate: data.gstRate,
        ...data,
      };
    },
  },

  category: {
    type: 'category',
    title: 'Category',
    endpoint: '/inventory/categories',
    permissions: ['inventory:create', 'category:create'],
    queryKeys: [['categories'], ['product_categories']],
    fields: [
      {
        name: 'name',
        label: 'Category Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Electronics & Hardware',
        colSpan: 2,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Brief summary of what belongs to this category...',
        colSpan: 2,
      },
    ],
    transformPayload: (vals) => ({
      name: String(vals.name || '').trim(),
      description: vals.description ? String(vals.description).trim() : undefined,
    }),
    extractResult: (res) => {
      const data = res?.data || res;
      return {
        id: String(data.id || res.id),
        label: data.categoryName || data.name || 'New Category',
        value: String(data.id || res.id),
        ...data,
      };
    },
  },

  brand: {
    type: 'brand',
    title: 'Brand',
    endpoint: '/inventory/brands',
    permissions: ['inventory:create', 'brand:create'],
    queryKeys: [['brands']],
    fields: [
      {
        name: 'name',
        label: 'Brand Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Logitech',
        colSpan: 2,
      },
      {
        name: 'code',
        label: 'Brand Code',
        type: 'text',
        placeholder: 'Auto-generated from name if left blank',
        uppercase: true,
        colSpan: 2,
        helpText: 'Uppercase letters, numbers, hyphens, and underscores only.',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Brand notes or tagline...',
        colSpan: 2,
      },
    ],
    transformPayload: (vals) => {
      const name = String(vals.name || '').trim();
      let code = vals.code ? String(vals.code).trim().toUpperCase() : '';
      if (!code) {
        code = name.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase().slice(0, 40);
        if (!code) code = `BRD_${Date.now()}`;
      }
      return {
        name,
        code,
        description: vals.description ? String(vals.description).trim() : undefined,
      };
    },
    extractResult: (res) => {
      const data = res?.data || res;
      return {
        id: String(data.id || res.id),
        label: data.brandName || data.name || 'New Brand',
        value: String(data.id || res.id),
        ...data,
      };
    },
  },

  warehouse: {
    type: 'warehouse',
    title: 'Warehouse',
    endpoint: '/warehouses',
    permissions: ['inventory:create', 'warehouse:create'],
    queryKeys: [['warehouses']],
    fields: [
      {
        name: 'name',
        label: 'Warehouse Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Central Distribution Center',
        colSpan: 2,
      },
      {
        name: 'location',
        label: 'Location / Address',
        type: 'text',
        placeholder: 'e.g. Plot 42, Industrial Zone, Pune',
        colSpan: 2,
      },
    ],
    transformPayload: (vals) => ({
      name: String(vals.name || '').trim(),
      location: vals.location ? String(vals.location).trim() : undefined,
    }),
    extractResult: (res) => {
      const data = res?.data || res;
      return {
        id: String(data.id || res.id),
        label: data.name || 'New Warehouse',
        value: String(data.id || res.id),
        ...data,
      };
    },
  },

  employee: {
    type: 'employee',
    title: 'Employee',
    endpoint: '/hr/employees',
    permissions: ['hr:create', 'employee:create'],
    queryKeys: [['employees'], ['hr_employees']],
    fields: [
      {
        name: 'name',
        label: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Rahul Sharma',
        colSpan: 2,
      },
      {
        name: 'mobile',
        label: 'Mobile Number',
        type: 'tel',
        placeholder: '+91 9876543210',
        colSpan: 1,
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'rahul@company.com',
        colSpan: 1,
      },
    ],
    transformPayload: (vals) => ({
      name: String(vals.name || '').trim(),
      employeeCode: `EMP${Date.now().toString().slice(-6)}`,
      mobile: vals.mobile ? String(vals.mobile).trim() : undefined,
      email: vals.email ? String(vals.email).trim() : undefined,
    }),
    extractResult: (res) => {
      const data = res?.data || res;
      return {
        id: String(data.id || res.id),
        label: data.name || 'New Employee',
        value: String(data.id || res.id),
        ...data,
      };
    },
  },

  account: {
    type: 'account',
    title: 'Account / Ledger',
    endpoint: '/accounts',
    permissions: ['accounting:create', 'account:create'],
    queryKeys: [['accounts'], ['accounts_lookup'], ['chart-of-accounts']],
    fields: [
      {
        name: 'name',
        label: 'Account Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Office Supplies Expense',
        colSpan: 2,
      },
      {
        name: 'category',
        label: 'Account Category',
        type: 'select',
        required: true,
        defaultValue: 'EXPENSE',
        options: [
          { label: 'Expense (Nominal)', value: 'EXPENSE' },
          { label: 'Income / Revenue', value: 'INCOME' },
          { label: 'Asset (Real)', value: 'ASSET' },
          { label: 'Liability', value: 'LIABILITY' },
          { label: 'Equity / Capital', value: 'EQUITY' },
        ],
        colSpan: 1,
      },
      {
        name: 'code',
        label: 'Account Code (Optional)',
        type: 'text',
        placeholder: 'e.g. 5100',
        colSpan: 1,
      },
    ],
    transformPayload: (vals) => ({
      name: String(vals.name || '').trim(),
      category: vals.category || 'EXPENSE',
      code: vals.code ? String(vals.code).trim() : undefined,
    }),
    extractResult: (res) => {
      const data = res?.data || res;
      return {
        id: String(data.id || res.id),
        label: data.name || 'New Account',
        value: String(data.id || res.id),
        ...data,
      };
    },
  },

  bankAccount: {
    type: 'bankAccount',
    title: 'Bank / Cash Account',
    endpoint: '/bank-accounts',
    permissions: ['accounting:create', 'banking:create'],
    queryKeys: [['bank-accounts'], ['bank_accounts_lookup']],
    fields: [
      {
        name: 'bankName',
        label: 'Bank / Institution Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. HDFC Bank, ICICI Bank, Cash Vault',
        colSpan: 2,
      },
      {
        name: 'accountNumber',
        label: 'Account Number',
        type: 'text',
        required: true,
        placeholder: 'e.g. 50100234567890',
        colSpan: 1,
      },
      {
        name: 'accountType',
        label: 'Account Type',
        type: 'select',
        defaultValue: 'CURRENT',
        options: [
          { label: 'Current Account', value: 'CURRENT' },
          { label: 'Savings Account', value: 'SAVINGS' },
          { label: 'Cash Drawer / Petty Cash', value: 'CASH' },
        ],
        colSpan: 1,
      },
      {
        name: 'ifscCode',
        label: 'IFSC Code',
        type: 'text',
        placeholder: 'e.g. HDFC0001234',
        uppercase: true,
        colSpan: 1,
      },
      {
        name: 'name',
        label: 'Account Label (Optional)',
        type: 'text',
        placeholder: 'Leave blank to use Bank Name',
        colSpan: 1,
      },
    ],
    transformPayload: (vals) => {
      const bankName = String(vals.bankName || '').trim();
      const accNum = String(vals.accountNumber || '').trim();
      const customName = vals.name ? String(vals.name).trim() : '';
      return {
        bankName,
        accountNumber: accNum,
        name: customName || (accNum.length >= 4 ? `${bankName} (${accNum.slice(-4)})` : bankName),
        accountType: vals.accountType || 'CURRENT',
        ifscCode: vals.ifscCode ? String(vals.ifscCode).trim().toUpperCase() : undefined,
      };
    },
    extractResult: (res) => {
      const data = res?.data || res;
      return {
        id: String(data.id || res.id),
        label: data.name || data.bankName || 'New Bank Account',
        value: String(data.id || res.id),
        ...data,
      };
    },
  },

  unit: {
    type: 'unit',
    title: 'Unit of Measurement',
    endpoint: '/units',
    permissions: ['inventory:create', 'unit:create'],
    queryKeys: [['units']],
    fields: [
      {
        name: 'name',
        label: 'Unit Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Kilogram',
        colSpan: 1,
      },
      {
        name: 'code',
        label: 'Unit Code',
        type: 'text',
        required: true,
        placeholder: 'e.g. KG',
        uppercase: true,
        colSpan: 1,
      },
      {
        name: 'abbreviation',
        label: 'Abbreviation (Optional)',
        type: 'text',
        placeholder: 'e.g. kg',
        colSpan: 2,
      },
    ],
    transformPayload: (vals) => ({
      name: String(vals.name || '').trim(),
      code: String(vals.code || vals.name || '').trim().toUpperCase().replace(/\s+/g, '_'),
      abbreviation: vals.abbreviation ? String(vals.abbreviation).trim() : undefined,
    }),
    extractResult: (res) => {
      const data = res?.data || res;
      const code = data.code || data.id;
      return {
        id: String(code),
        value: String(code),
        label: `${data.name || code} (${code})`,
        ...data,
      };
    },
  },

  expenseCategory: {
    type: 'expenseCategory',
    title: 'Expense Category',
    endpoint: '/expenses/categories',
    permissions: ['expense:create', 'expenses:create'],
    queryKeys: [['expense_categories'], ['expenseCategories']],
    fields: [
      {
        name: 'name',
        label: 'Category Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Travel & Conveyance',
        colSpan: 2,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Optional notes on eligible expenses...',
        colSpan: 2,
      },
    ],
    transformPayload: (vals) => ({
      name: String(vals.name || '').trim(),
      description: vals.description ? String(vals.description).trim() : undefined,
    }),
    extractResult: (res) => {
      const data = res?.data || res;
      return {
        id: String(data.id || res.id),
        label: data.name || 'New Category',
        value: String(data.id || res.id),
        ...data,
      };
    },
  },
};
