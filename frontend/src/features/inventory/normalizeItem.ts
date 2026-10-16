/**
 * Normalized Item Model for BillAura ERP (Zoho-Compliant Architecture)
 * Guarantees that:
 * - arrays default to []
 * - strings default to ''
 * - numbers default to 0
 * - objects default to null or well-formed structures
 * The UI components must NEVER throw TypeError when accessing properties.
 */

export interface NormalizedItem {
  id: string;
  name: string;
  sku: string;
  type: 'GOODS' | 'SERVICE';
  itemType: 'GOODS' | 'SERVICE';
  unit: string;
  hsnCode: string;
  taxPreference: string;
  gstRate: number;
  igstRate: number;
  intraStateTaxRate: string;
  interStateTaxRate: string;
  
  // Sales Info
  hasSales: boolean;
  sellingPrice: number;
  rate: number;
  salesAccount: string;
  description: string;
  
  // Purchase Info
  hasPurchase: boolean;
  costPrice: number;
  purchasePrice: number;
  purchaseAccount: string;
  purchaseDescription: string;
  preferredVendor: string;
  preferredVendorId: string | null;
  
  // Inventory Info
  trackInventory: boolean;
  inventoryAccount: string;
  openingStock: number;
  openingStockRate: number;
  reorderLevel: number;
  reorderPoint: number;
  stockOnHand: number;
  currentStock: number;
  
  // Relationships & Categorization
  status: string;
  isActive: boolean;
  createdSource: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  brandId: string | null;
  brand: { id: string; name: string } | null;
  
  // Collections (always default to [])
  priceLists: any[];
  transactions: any[];
  history: any[];
  reportingTags: any[];
  attachments: any[];
  customFields: any[];
  stockRows: any[];
  movements: any[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  raw: any;
}

export function normalizeItem(raw: any): NormalizedItem {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      name: '',
      sku: '',
      type: 'GOODS',
      itemType: 'GOODS',
      unit: '',
      hsnCode: '',
      taxPreference: 'Taxable',
      gstRate: 18,
      igstRate: 18,
      intraStateTaxRate: 'GST18 (18 %)',
      interStateTaxRate: 'IGST18 (18 %)',
      hasSales: true,
      sellingPrice: 0,
      rate: 0,
      salesAccount: 'Sales',
      description: '',
      hasPurchase: true,
      costPrice: 0,
      purchasePrice: 0,
      purchaseAccount: 'Cost of Goods Sold',
      purchaseDescription: '',
      preferredVendor: '',
      preferredVendorId: null,
      trackInventory: false,
      inventoryAccount: 'Inventory Asset',
      openingStock: 0,
      openingStockRate: 0,
      reorderLevel: 0,
      reorderPoint: 0,
      stockOnHand: 0,
      currentStock: 0,
      status: 'ACTIVE',
      isActive: true,
      createdSource: '',
      categoryId: null,
      category: null,
      brandId: null,
      brand: null,
      priceLists: [],
      transactions: [],
      history: [],
      reportingTags: [],
      attachments: [],
      customFields: [],
      stockRows: [],
      movements: [],
      createdAt: '',
      updatedAt: '',
      raw: null,
    };
  }

  const isService =
    raw.type === 'SERVICE' ||
    raw.itemType === 'SERVICE' ||
    String(raw.productType || '').toUpperCase() === 'SERVICE';

  const type = isService ? 'SERVICE' : 'GOODS';

  const gstRate = Number(raw.gstRate ?? raw.taxRate ?? 18);
  const igstRate = Number(raw.igstRate ?? raw.taxRate ?? gstRate);

  const sellingPrice = Number(raw.sellingPrice ?? raw.rate ?? raw.price ?? 0);
  const purchasePrice = Number(raw.purchasePrice ?? raw.costPrice ?? raw.cost ?? 0);

  const stockOnHand = Number(
    raw.stockOnHand ??
    raw.currentStock ??
    raw.stockQuantity ??
    raw.stock ??
    (Array.isArray(raw.stocks) && raw.stocks.length > 0
      ? raw.stocks.reduce((acc: number, s: any) => acc + Number(s.quantity || 0), 0)
      : 0)
  );

  const isTracked = Boolean(
    raw.isTrackStock ??
    raw.trackInventory ??
    raw.inventoryTracking ??
    raw.isTracked ??
    (raw.inventoryAccount || stockOnHand > 0 || (raw.openingStock !== undefined && raw.openingStock !== null && raw.openingStock > 0))
  );

  const taxPref =
    raw.taxPreference === 'NON_TAXABLE'
      ? 'Non-Taxable'
      : raw.taxPreference === 'TAX_EXEMPT' || raw.taxPreference === 'EXEMPT'
      ? 'Tax Exempt'
      : 'Taxable';

  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    sku: String(raw.sku || ''),
    type,
    itemType: type,
    unit: String(raw.unit || raw.unitOfMeasure || ''),
    hsnCode: String(raw.hsnCode || raw.hsn || raw.sacCode || ''),
    taxPreference: taxPref,
    gstRate,
    igstRate,
    intraStateTaxRate: raw.intraStateTaxRate || `GST${gstRate} (${gstRate} %)`,
    interStateTaxRate: raw.interStateTaxRate || `IGST${igstRate} (${igstRate} %)`,
    
    // Sales Info
    hasSales: raw.hasSales !== false,
    sellingPrice,
    rate: sellingPrice,
    salesAccount: String(raw.salesAccount || 'Sales'),
    description: String(raw.description || raw.salesDescription || ''),
    
    // Purchase Info
    hasPurchase: raw.hasPurchase !== false,
    costPrice: purchasePrice,
    purchasePrice,
    purchaseAccount: String(raw.purchaseAccount || 'Cost of Goods Sold'),
    purchaseDescription: String(raw.purchaseDescription || ''),
    preferredVendor: String(raw.preferredVendor?.name || raw.preferredVendor || raw.vendor?.name || ''),
    preferredVendorId: raw.preferredVendorId || raw.vendorId || null,
    
    // Inventory Info
    trackInventory: isTracked,
    inventoryAccount: String(raw.inventoryAccount || 'Inventory Asset'),
    openingStock: Number(raw.openingStock || 0),
    openingStockRate: Number(raw.openingStockRate || purchasePrice || 0),
    reorderLevel: Number(raw.reorderLevel || raw.reorderPoint || raw.minStock || 0),
    reorderPoint: Number(raw.reorderPoint || raw.reorderLevel || raw.minStock || 0),
    stockOnHand,
    currentStock: stockOnHand,
    
    // Categorization
    status: String(raw.status || (raw.isActive === false ? 'INACTIVE' : 'ACTIVE')),
    isActive: raw.isActive !== false && raw.status !== 'INACTIVE',
    createdSource: String(raw.createdSource || raw.source || ''),
    categoryId: raw.categoryId || null,
    category: raw.category ? { id: String(raw.category.id || ''), name: String(raw.category.name || '') } : null,
    brandId: raw.brandId || null,
    brand: raw.brand ? { id: String(raw.brand.id || ''), name: String(raw.brand.name || '') } : null,
    
    // Collections
    priceLists: Array.isArray(raw.priceLists) ? raw.priceLists : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    history: Array.isArray(raw.history) ? raw.history : [],
    reportingTags: Array.isArray(raw.reportingTags) ? raw.reportingTags : [],
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    customFields: Array.isArray(raw.customFields) ? raw.customFields : [],
    stockRows: Array.isArray(raw.stockRows || raw.warehouses) ? (raw.stockRows || raw.warehouses) : [],
    movements: Array.isArray(raw.movements) ? raw.movements : [],
    
    createdAt: String(raw.createdAt || ''),
    updatedAt: String(raw.updatedAt || ''),
    raw,
  };
}
