import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Search, Edit2, HelpCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { Radio } from '@/shared/components/ui/Radio';
import { ZohoFormFooter } from '@/shared/components/zoho';
import { cn } from '@/lib/utils';
import { normalizeItem } from './normalizeItem';

export interface ProductFormProps {
  initialData?: any;
  productId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: (item?: any) => void;
}

const COMMON_UNITS = [
  { value: 'PCS', label: 'PCS - Pieces' },
  { value: 'BOX', label: 'BOX - Box' },
  { value: 'KG', label: 'KG - Kilograms' },
  { value: 'GM', label: 'GM - Grams' },
  { value: 'MTR', label: 'MTR - Meters' },
  { value: 'LTR', label: 'LTR - Litres' },
  { value: 'SET', label: 'SET - Sets' },
  { value: 'NOS', label: 'NOS - Numbers' },
  { value: 'BTL', label: 'BTL - Bottles' },
];

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  productId: propProductId,
  isModal = false,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const routeParams = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const effectiveId = propProductId || routeParams.id;
  const isEditMode = Boolean(effectiveId);

  // Fetch product if editing via direct route
  const { data: fetchedProduct, isLoading: isFetchingProduct } = useQuery({
    queryKey: ['product', effectiveId],
    queryFn: async () => {
      if (!effectiveId) return null;
      const res = await apiClient.get(`/products/${effectiveId}`);
      return res.data?.data || res.data;
    },
    enabled: Boolean(effectiveId) && !initialData,
  });

  const rawItem = initialData || fetchedProduct;
  const item = normalizeItem(rawItem);

  // Top Block States
  const [name, setName] = useState('');
  const [type, setType] = useState<'GOODS' | 'SERVICE'>('GOODS');
  const [unit, setUnit] = useState('PCS');
  const [hsnCode, setHsnCode] = useState('');
  const [taxPreference, setTaxPreference] = useState<'TAXABLE' | 'TAX_EXEMPT' | 'NON_TAXABLE'>('TAXABLE');

  // Sales Information
  const [hasSales, setHasSales] = useState(true);
  const [sellingPrice, setSellingPrice] = useState('');
  const [salesAccount, setSalesAccount] = useState('Sales');
  const [salesDescription, setSalesDescription] = useState('');

  // Purchase Information
  const [hasPurchase, setHasPurchase] = useState(true);
  const [costPrice, setCostPrice] = useState('');
  const [purchaseAccount, setPurchaseAccount] = useState('Cost of Goods Sold');
  const [purchaseDescription, setPurchaseDescription] = useState('');
  const [preferredVendor, setPreferredVendor] = useState('');

  // Default Tax Rates (editable on pencil click)
  const [isEditingTaxRates, setIsEditingTaxRates] = useState(false);
  const [gstRate, setGstRate] = useState<number>(18);
  const [igstRate, setIgstRate] = useState<number>(18);

  // Track Inventory
  const [trackInventory, setTrackInventory] = useState(true);
  const [inventoryAccount, setInventoryAccount] = useState('Inventory Asset');
  const [openingStock, setOpeningStock] = useState('');
  const [openingStockRate, setOpeningStockRate] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');

  // Category, Brand, SKU
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const hasInventoryTransactions = Boolean(
    isEditMode &&
      ((rawItem?.transactions && rawItem.transactions.length > 0) ||
        (item?.movements && item.movements.length > 0) ||
        (rawItem?.stockLedger && rawItem.stockLedger.length > 0) ||
        (item?.stockOnHand > 0) ||
        (rawItem?.stocks && rawItem.stocks.some((s: any) => Number(s.quantity || 0) > 0)))
  );

  // Fetch Units from API
  const { data: dbUnits = [] } = useQuery<any[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await apiClient.get('/units');
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const availableUnits = useMemo(() => {
    if (dbUnits && dbUnits.length > 0) {
      return dbUnits.map((u: any) => ({
        value: u.code,
        label: `${u.name} (${u.abbreviation || u.symbol || u.code})`,
      }));
    }
    return COMMON_UNITS;
  }, [dbUnits]);

  // Fetch Categories for options
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/categories');
      const items = res.data?.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  // Fetch Brands for options
  const { data: brands = [] } = useQuery<any[]>({
    queryKey: ['brands-options'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/brands', { params: { limit: 100 } });
      const items = res.data?.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-options'],
    queryFn: () => apiClient.get('/vendors').then((res) => res.data?.data?.items || res.data?.data || res.data || []),
  });

  // Populate data when loaded
  useEffect(() => {
    if (rawItem && rawItem.id) {
      setName(item.name);
      setType(item.type === 'SERVICE' ? 'SERVICE' : 'GOODS');
      setUnit(item.unit || '1 set');
      setHsnCode(item.hsnCode);
      setTaxPreference(
        item.taxPreference.toLowerCase().includes('exempt')
          ? 'TAX_EXEMPT'
          : item.taxPreference.toLowerCase().includes('non')
          ? 'NON_TAXABLE'
          : 'TAXABLE'
      );
      setSellingPrice(item.sellingPrice ? String(item.sellingPrice) : '');
      setSalesAccount(item.salesAccount || 'Sales');
      setSalesDescription(item.description);
      setHasSales(item.hasSales);

      setCostPrice(item.costPrice ? String(item.costPrice) : '');
      setPurchaseAccount(item.purchaseAccount || 'Cost of Goods Sold');
      setPurchaseDescription(item.purchaseDescription);
      setPreferredVendor(item.preferredVendorId || '');
      setHasPurchase(item.hasPurchase);

      setGstRate(item.gstRate || 18);
      setIgstRate(item.igstRate || 18);

      setTrackInventory(item.type === 'GOODS' && item.trackInventory);
      setInventoryAccount(item.inventoryAccount || 'Inventory Asset');
      setReorderPoint(item.reorderPoint ? String(item.reorderPoint) : '');
      setOpeningStock(item.openingStock ? String(item.openingStock) : '');
      setOpeningStockRate(item.openingStockRate ? String(item.openingStockRate) : '');

      setSku(item.sku);
      setCategoryId(item.categoryId || '');
      setBrandId(item.brandId || '');
    }
  }, [rawItem]);

  // Handle Close / Cancel
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      if (effectiveId) {
        navigate(`/products/${effectiveId}`);
      } else {
        navigate('/products');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Item Name is required';
    }

    if (hasSales && !sellingPrice) {
      newErrors.sellingPrice = 'Selling Price is required';
    }

    if (hasPurchase && !costPrice) {
      newErrors.costPrice = 'Cost Price is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      notification.error('Please fix the errors in the form.');
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload: any = {
        name: name.trim(),
        itemType: type === 'SERVICE' ? 'SERVICE' : 'FINISHED_GOOD',
        unit: unit || 'PCS',
        hsnCode: hsnCode.trim(),
        taxPreference,
        gstRate: taxPreference === 'TAXABLE' ? Number(gstRate) : 0,
        sellingPrice: hasSales ? Number(sellingPrice) || 0 : 0,
        purchasePrice: hasPurchase ? Number(costPrice) || 0 : 0,
        description: salesDescription,
        purchaseDescription,
        isTrackStock: type === 'GOODS' && trackInventory,
        isInventoryItem: type === 'GOODS' && trackInventory,
        isService: type === 'SERVICE',
        reorderLevel: (type === 'GOODS' && trackInventory) ? (Number(reorderPoint) || 0) : 0,
        openingStock: (type === 'GOODS' && trackInventory) ? (Number(openingStock) || 0) : 0,
        openingStockRate: (type === 'GOODS' && trackInventory) ? (Number(openingStockRate) || 0) : 0,
        sku: sku || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        valuationMethod: 'AVERAGE',
      };

      let resultItem = null;
      if (isEditMode) {
        const res = await apiClient.put(`/products/${effectiveId}`, payload);
        resultItem = res.data?.data || res.data;
        notification.success('Item updated successfully');
      } else {
        const res = await apiClient.post('/products', payload);
        resultItem = res.data?.data || res.data;
        notification.success('Item created successfully');
      }

      await queryClient.invalidateQueries({ queryKey: ['products'] });
      if (effectiveId) {
        await queryClient.invalidateQueries({ queryKey: ['product', effectiveId] });
      }

      if (onSuccess) {
        onSuccess(resultItem);
      } else {
        navigate('/products');
      }
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetchingProduct) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-white">
        <div className="text-center text-xs text-[#6B7280]">
          <div className="inline-block w-6 h-6 border-2 border-[#408DFB] border-t-transparent rounded-full animate-spin mb-2" />
          <p>Loading item details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col bg-white text-[#2B2F36]', isModal ? 'h-full' : 'flex-1 min-h-0 h-full overflow-hidden')}>
      {/* Header with Title and X Button */}
      <div className="h-12 px-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
        <h1 className="text-base font-semibold text-[#2B2F36]">
          {isEditMode ? 'Edit Item' : 'New Item'}
        </h1>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Scrollable Form Body */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Top Block with subtle light-grey background band */}
          <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-8 py-5 space-y-4">
            {/* Name* */}
            <div className="flex items-start">
              <label className="w-[180px] pt-1 text-[13px] font-medium text-[#2B2F36] shrink-0">
                Name<span className="text-[#E54B4B] ml-0.5">*</span>
              </label>
              <div className="flex-1 max-w-[520px]">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                  className={cn(
                    'w-full h-8 px-3 bg-white border rounded-[4px] text-[13px] text-[#2B2F36] outline-none transition-colors focus:border-[#408DFB]',
                    errors.name ? 'border-[#E54B4B]' : 'border-[#D1D5DB]'
                  )}
                />
                {errors.name && (
                  <p className="mt-1 text-[11px] text-[#E54B4B]">{errors.name}</p>
                )}
              </div>
            </div>

            {/* Type */}
            <div className="flex items-center">
              <div className="w-[180px] flex items-center gap-1 text-[13px] font-medium text-[#2B2F36] shrink-0">
                <span className="border-b border-dashed border-[#9CA3AF] cursor-help" title="Select whether this item is a physical good or a service">
                  Type
                </span>
                <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <div className="flex items-center gap-6">
                <Radio
                  id="type_goods"
                  name="item_type"
                  checked={type === 'GOODS'}
                  onChange={() => setType('GOODS')}
                  label="Goods"
                />
                <Radio
                  id="type_service"
                  name="item_type"
                  checked={type === 'SERVICE'}
                  onChange={() => {
                    setType('SERVICE');
                    setTrackInventory(false);
                  }}
                  label="Service"
                />
              </div>
            </div>

            {/* Unit */}
            <div className="flex items-center">
              <div className="w-[180px] flex items-center gap-1 text-[13px] font-medium text-[#2B2F36] shrink-0">
                <span className="border-b border-dashed border-[#9CA3AF] cursor-help" title="Usage unit for sales, purchases and inventory tracking">
                  Unit
                </span>
                <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <div className="w-[300px]">
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  {availableUnits.map((u: any) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center">
              <div className="w-[180px] flex items-center gap-1 text-[13px] font-medium text-[#2B2F36] shrink-0">
                <span>Category</span>
              </div>
              <div className="w-[300px]">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value="">Select Category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.categoryName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Brand */}
            <div className="flex items-center">
              <div className="w-[180px] flex items-center gap-1 text-[13px] font-medium text-[#2B2F36] shrink-0">
                <span>Brand</span>
              </div>
              <div className="w-[300px]">
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.brandName || b.name} ({b.brandCode || b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* HSN Code / SAC */}
            <div className="flex items-center">
              <label className="w-[180px] text-[13px] font-medium text-[#2B2F36] shrink-0">
                {type === 'SERVICE' ? 'SAC' : 'HSN Code'}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative w-[300px]">
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    placeholder="Type to add or search"
                    className="w-full h-8 pl-3 pr-7 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                  <div className="absolute right-2 top-2 pointer-events-none text-[#9CA3AF]">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <button
                  type="button"
                  className="p-1.5 text-[#408DFB] hover:bg-[#EBF3FF] rounded-[4px] cursor-pointer"
                  title="Search HSN"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tax Preference* */}
            <div className="flex items-center">
              <label className="w-[180px] text-[13px] font-medium text-[#2B2F36] shrink-0">
                Tax Preference<span className="text-[#E54B4B] ml-0.5">*</span>
              </label>
              <div className="w-[300px]">
                <select
                  value={taxPreference}
                  onChange={(e) => setTaxPreference(e.target.value as any)}
                  className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value="TAXABLE">Taxable</option>
                  <option value="TAX_EXEMPT">Tax Exempt</option>
                  <option value="NON_TAXABLE">Non-Taxable</option>
                </select>
              </div>
            </div>
          </div>

          {/* Body Sections */}
          <div className="px-8 py-6 space-y-6">
            {/* 1. Sales Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has_sales_info"
                  checked={hasSales}
                  onChange={(checked) => setHasSales(checked)}
                  label={<span className="font-semibold text-[13px] text-[#2B2F36]">Sales Information</span>}
                />
              </div>

              {hasSales && (
                <div className="pl-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                    {/* Selling Price* */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[13px] font-medium text-[#2B2F36]">
                        <span className="border-b border-dashed border-[#9CA3AF] cursor-help" title="Selling price of the item">
                          Selling Price
                        </span>
                        <span className="text-[#E54B4B]">*</span>
                      </div>
                      <div className="flex items-center border border-[#D1D5DB] rounded-[4px] bg-white h-8 overflow-hidden focus-within:border-[#408DFB]">
                        <span className="px-3 text-[12px] font-medium text-[#6B7280] bg-[#F8F9FB] border-r border-[#D1D5DB] h-full flex items-center select-none">
                          INR
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={sellingPrice}
                          onChange={(e) => {
                            setSellingPrice(e.target.value);
                            if (errors.sellingPrice) setErrors({ ...errors, sellingPrice: '' });
                          }}
                          placeholder="0.00"
                          className="flex-1 px-3 text-[13px] text-[#2B2F36] outline-none"
                        />
                      </div>
                      {errors.sellingPrice && (
                        <p className="mt-1 text-[11px] text-[#E54B4B]">{errors.sellingPrice}</p>
                      )}
                    </div>

                    {/* Account* */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[13px] font-medium text-[#2B2F36]">
                        <span className="border-b border-dashed border-[#9CA3AF] cursor-help" title="General ledger sales account">
                          Account
                        </span>
                        <span className="text-[#E54B4B]">*</span>
                      </div>
                      <select
                        value={salesAccount}
                        onChange={(e) => setSalesAccount(e.target.value)}
                        className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                      >
                        <option value="Sales">Sales</option>
                        <option value="General Income">General Income</option>
                        <option value="Interest Income">Interest Income</option>
                        <option value="Other Charges">Other Charges</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="max-w-[440px] space-y-1">
                    <label className="text-[13px] font-medium text-[#2B2F36]">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={salesDescription}
                      onChange={(e) => setSalesDescription(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB]"
                    />
                  </div>
                </div>
              )}
            </div>

            <hr className="border-t border-[#E5E7EB]" />

            {/* 2. Purchase Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has_purchase_info"
                  checked={hasPurchase}
                  onChange={(checked) => setHasPurchase(checked)}
                  label={<span className="font-semibold text-[13px] text-[#2B2F36]">Purchase Information</span>}
                />
              </div>

              {hasPurchase && (
                <div className="pl-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                    {/* Cost Price* */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[13px] font-medium text-[#2B2F36]">
                        <span className="border-b border-dashed border-[#9CA3AF] cursor-help" title="Cost or purchase price of the item">
                          Cost Price
                        </span>
                        <span className="text-[#E54B4B]">*</span>
                      </div>
                      <div className="flex items-center border border-[#D1D5DB] rounded-[4px] bg-white h-8 overflow-hidden focus-within:border-[#408DFB]">
                        <span className="px-3 text-[12px] font-medium text-[#6B7280] bg-[#F8F9FB] border-r border-[#D1D5DB] h-full flex items-center select-none">
                          INR
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={costPrice}
                          onChange={(e) => {
                            setCostPrice(e.target.value);
                            if (errors.costPrice) setErrors({ ...errors, costPrice: '' });
                          }}
                          placeholder="0.00"
                          className="flex-1 px-3 text-[13px] text-[#2B2F36] outline-none"
                        />
                      </div>
                      {errors.costPrice && (
                        <p className="mt-1 text-[11px] text-[#E54B4B]">{errors.costPrice}</p>
                      )}
                    </div>

                    {/* Account* */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[13px] font-medium text-[#2B2F36]">
                        <span className="border-b border-dashed border-[#9CA3AF] cursor-help" title="Cost of Goods Sold expense account">
                          Account
                        </span>
                        <span className="text-[#E54B4B]">*</span>
                      </div>
                      <select
                        value={purchaseAccount}
                        onChange={(e) => setPurchaseAccount(e.target.value)}
                        className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                      >
                        <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                        <option value="Operating Expenses">Operating Expenses</option>
                        <option value="Raw Materials">Raw Materials</option>
                        <option value="Direct Expenses">Direct Expenses</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-[#2B2F36]">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={purchaseDescription}
                        onChange={(e) => setPurchaseDescription(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB]"
                      />
                    </div>

                    {/* Preferred Vendor */}
                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-[#2B2F36]">
                        Preferred Vendor
                      </label>
                      <select
                        value={preferredVendor}
                        onChange={(e) => setPreferredVendor(e.target.value)}
                        className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                      >
                        <option value="">Select a vendor</option>
                        {vendors.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.displayName || v.companyName || v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-t border-[#E5E7EB]" />

            {/* 3. Default Tax Rates */}
            {taxPreference === 'TAXABLE' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[13px] text-[#2B2F36]">
                    Default Tax Rates
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingTaxRates(!isEditingTaxRates)}
                    className="p-1 text-[#6B7280] hover:text-[#408DFB] rounded cursor-pointer"
                    title="Edit tax rates"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!isEditingTaxRates ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl text-[13px]">
                    <div className="flex items-center gap-4">
                      <span className="text-[#6B7280] w-36">Intra State Tax Rate</span>
                      <span className="font-medium text-[#2B2F36]">{`GST${gstRate} (${gstRate} %)`}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[#6B7280] w-36">Inter State Tax Rate</span>
                      <span className="font-medium text-[#2B2F36]">{`IGST${igstRate} (${igstRate} %)`}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                    <div className="space-y-1">
                      <label className="text-[12px] font-medium text-[#6B7280]">
                        Intra State Tax Rate
                      </label>
                      <select
                        value={gstRate}
                        onChange={(e) => {
                          const r = Number(e.target.value);
                          setGstRate(r);
                          setIgstRate(r);
                        }}
                        className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                      >
                        <option value={0}>GST0 (0 %)</option>
                        <option value={5}>GST5 (5 %)</option>
                        <option value={12}>GST12 (12 %)</option>
                        <option value={18}>GST18 (18 %)</option>
                        <option value={28}>GST28 (28 %)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[12px] font-medium text-[#6B7280]">
                        Inter State Tax Rate
                      </label>
                      <select
                        value={igstRate}
                        onChange={(e) => setIgstRate(Number(e.target.value))}
                        className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                      >
                        <option value={0}>IGST0 (0 %)</option>
                        <option value={5}>IGST5 (5 %)</option>
                        <option value={12}>IGST12 (12 %)</option>
                        <option value={18}>IGST18 (18 %)</option>
                        <option value={28}>IGST28 (28 %)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Track Inventory for this item (Only for Goods) */}
            {type === 'GOODS' && (
              <>
                <hr className="border-t border-[#E5E7EB]" />
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="track_inventory_check"
                        checked={trackInventory}
                        disabled={hasInventoryTransactions}
                        onChange={(checked) => setTrackInventory(checked)}
                        label={<span className="font-semibold text-[13px] text-[#2B2F36]">Track Inventory for this item</span>}
                      />
                      <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF] cursor-help" />
                    </div>
                    <p className="text-[11px] text-[#6B7280] pl-6">
                      {hasInventoryTransactions
                        ? "Inventory tracking is locked because transactions/stock exist for this item"
                        : "You cannot enable/disable inventory tracking once you've created transactions for this item"}
                    </p>
                  </div>

                  {trackInventory && (
                    <div className="pl-6 space-y-4 pt-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                        {/* Inventory Account* */}
                        <div className="space-y-1">
                          <label className="text-[13px] font-medium text-[#2B2F36]">
                            Inventory Account<span className="text-[#E54B4B] ml-0.5">*</span>
                          </label>
                          <select
                            value={inventoryAccount}
                            onChange={(e) => setInventoryAccount(e.target.value)}
                            className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                          >
                            <option value="Inventory Asset">Inventory Asset</option>
                          </select>
                        </div>

                        {/* Reorder Point */}
                        <div className="space-y-1">
                          <label className="text-[13px] font-medium text-[#2B2F36]">
                            Reorder Point
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={reorderPoint}
                            onChange={(e) => setReorderPoint(e.target.value)}
                            placeholder="e.g. 10"
                            className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB]"
                          />
                        </div>
                      </div>

                      {!isEditMode && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                          {/* Opening Stock */}
                          <div className="space-y-1">
                            <label className="text-[13px] font-medium text-[#2B2F36]">
                              Opening Stock
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={openingStock}
                              onChange={(e) => setOpeningStock(e.target.value)}
                              placeholder="0"
                              className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB]"
                            />
                          </div>

                          {/* Opening Stock Rate Per Unit */}
                          <div className="space-y-1">
                            <label className="text-[13px] font-medium text-[#2B2F36]">
                              Opening Stock Rate Per Unit
                            </label>
                            <div className="flex items-center border border-[#D1D5DB] rounded-[4px] bg-white h-8 overflow-hidden focus-within:border-[#408DFB]">
                              <span className="px-3 text-[12px] font-medium text-[#6B7280] bg-[#F8F9FB] border-r border-[#D1D5DB] h-full flex items-center select-none">
                                INR
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={openingStockRate}
                                onChange={(e) => setOpeningStockRate(e.target.value)}
                                placeholder="0.00"
                                className="flex-1 px-3 text-[13px] text-[#2B2F36] outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pinned Bottom Footer with Save and Cancel */}
        <ZohoFormFooter
          primaryActions={[
            {
              label: isSubmitting ? 'Saving...' : 'Save',
              type: 'submit',
              disabled: isSubmitting,
            },
          ]}
          secondaryActions={[
            {
              label: 'Cancel',
              onClick: handleClose,
            },
          ]}
        />
      </form>
    </div>
  );
};

export default ProductForm;
