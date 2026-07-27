import React, { useState } from 'react';
import { X, Package, TrendingUp, DollarSign, Layers, FileText, BarChart3, Clock, ShoppingCart, ShoppingBag, ShieldCheck, Tag, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';

interface ProductDetailsDrawerProps {
  productId: string | null;
  onClose: () => void;
  onEdit: (product: any) => void;
}

export function ProductDetailsDrawer({ productId, onClose, onEdit }: ProductDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'purchases' | 'inventory' | 'accounting' | 'analytics' | 'audit'>('overview');

  const { data: intelligenceData, isLoading } = useQuery({
    queryKey: ['product-intelligence', productId],
    queryFn: async () => {
      if (!productId) return null;
      const res = await apiClient.get(`/products/${productId}/intelligence`);
      return res.data?.data || res.data;
    },
    enabled: Boolean(productId),
  });

  if (!productId) return null;

  const product = intelligenceData?.product || {};
  const metrics = intelligenceData?.metrics || {};
  const warehouseStock = intelligenceData?.warehouseStock || [];
  const recentMovements = intelligenceData?.recentMovements || [];

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end">
      <div className="bg-surface border-l border-border w-full max-w-3xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 text-foreground">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-lg">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Package className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{product.name || 'Loading...'}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  metrics.stockStatus === 'OUT_OF_STOCK' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  metrics.stockStatus === 'LOW_STOCK' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                }`}>
                  {metrics.stockStatus || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                SKU: {product.sku || 'N/A'} | HSN: {product.hsnCode || 'N/A'} | Category: {product.category?.categoryName || product.category?.name || 'Uncategorized'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onEdit(product)}
              className="px-4 py-2 bg-accent text-accent-foreground text-xs font-semibold rounded-xl hover:bg-accent/90 transition-colors"
            >
              Edit Product
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border px-6 gap-6 overflow-x-auto custom-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: Package },
            { id: 'sales', label: 'Sales', icon: ShoppingBag },
            { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
            { id: 'inventory', label: 'Inventory', icon: Layers },
            { id: 'accounting', label: 'Accounting', icon: DollarSign },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'audit', label: 'Audit', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Loading Product Intelligence...
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Selling Price</p>
                      <p className="text-lg font-bold text-foreground mt-1">
                        ₹{(metrics.sellingPrice || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-muted/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Purchase Rate</p>
                      <p className="text-lg font-bold text-foreground mt-1">
                        ₹{(metrics.purchasePrice || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-muted/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Gross Margin %</p>
                      <p className="text-lg font-bold text-emerald-500 mt-1">
                        {metrics.marginPercentage}%
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-accent" /> Product Specifications
                    </h3>
                    <div className="grid grid-cols-2 gap-y-3 text-xs">
                      <div><span className="text-muted-foreground">Base Unit:</span> <span className="font-semibold">{product.unit || 'PCS'}</span></div>
                      <div><span className="text-muted-foreground">Item Type:</span> <span className="font-semibold uppercase">{product.itemType || 'FINISHED_GOOD'}</span></div>
                      <div><span className="text-muted-foreground">Brand:</span> <span className="font-semibold">{product.brand?.name || 'Generic'}</span></div>
                      <div><span className="text-muted-foreground">Barcode:</span> <span className="font-semibold font-mono">{product.barcode || 'N/A'}</span></div>
                      <div><span className="text-muted-foreground">Tax Category:</span> <span className="font-semibold">{product.taxCategory || 'TAXABLE'}</span></div>
                      <div><span className="text-muted-foreground">GST Rate:</span> <span className="font-semibold">{product.gstRate || 0}%</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* SALES TAB */}
              {activeTab === 'sales' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Average Selling Price</p>
                      <p className="text-lg font-bold text-foreground mt-1">₹{(metrics.sellingPrice || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-muted/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Profit Margin per Unit</p>
                      <p className="text-lg font-bold text-emerald-500 mt-1">₹{(metrics.grossProfit || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-border bg-surface">
                    <h3 className="text-sm font-bold text-foreground mb-3">Sales Performance Summary</h3>
                    <p className="text-xs text-muted-foreground">Real-time sales order tracking is active. Product is ready for invoice generation.</p>
                  </div>
                </div>
              )}

              {/* PURCHASES TAB */}
              {activeTab === 'purchases' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Standard Purchase Cost</p>
                      <p className="text-lg font-bold text-foreground mt-1">₹{(metrics.purchasePrice || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-muted/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Inventory Asset Value</p>
                      <p className="text-lg font-bold text-accent mt-1">₹{(metrics.stockValuation || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* INVENTORY TAB */}
              {activeTab === 'inventory' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Stock</p>
                      <p className="text-lg font-bold text-foreground mt-1">{metrics.totalStock} {product.unit}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-muted/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Available Stock</p>
                      <p className="text-lg font-bold text-emerald-500 mt-1">{metrics.availableStock} {product.unit}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-muted/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Reorder Threshold</p>
                      <p className="text-lg font-bold text-amber-500 mt-1">{metrics.reorderLevel} {product.unit}</p>
                    </div>
                  </div>

                  {/* Warehouse Wise Breakdown */}
                  <div className="p-5 rounded-2xl border border-border bg-surface">
                    <h3 className="text-sm font-bold text-foreground mb-4">Warehouse Breakdown</h3>
                    {warehouseStock.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No warehouse stock mapped yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {warehouseStock.map((s: any) => (
                          <div key={s.id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-muted/20 border border-border">
                            <span className="font-semibold text-foreground">{s.warehouseId || 'Main Warehouse'}</span>
                            <span className="font-bold text-accent">{s.quantity} {product.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ACCOUNTING TAB */}
              {activeTab === 'accounting' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-500" /> Chart of Accounts Mapping
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between p-3 rounded-xl bg-muted/20">
                        <span className="text-muted-foreground">Sales Revenue Account:</span>
                        <span className="font-mono font-semibold text-foreground">{product.salesAccountId || 'Default Sales Account'}</span>
                      </div>
                      <div className="flex justify-between p-3 rounded-xl bg-muted/20">
                        <span className="text-muted-foreground">Cost of Goods Sold (COGS) Account:</span>
                        <span className="font-mono font-semibold text-foreground">{product.purchaseAccountId || 'Default COGS Account'}</span>
                      </div>
                      <div className="flex justify-between p-3 rounded-xl bg-muted/20">
                        <span className="text-muted-foreground">Inventory Asset Account:</span>
                        <span className="font-mono font-semibold text-foreground">{product.inventoryAccountId || 'Default Inventory Account'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ANALYTICS TAB */}
              {activeTab === 'analytics' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="p-5 rounded-2xl border border-border bg-surface">
                    <h3 className="text-sm font-bold text-foreground mb-2">Product Intelligence Analytics</h3>
                    <p className="text-xs text-muted-foreground mb-4">Calculated gross profit margin & inventory velocity.</p>
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-emerald-500">Gross Margin Efficiency</p>
                        <p className="text-sm text-foreground mt-0.5">High profit yield per unit sold</p>
                      </div>
                      <span className="text-2xl font-black text-emerald-500">{metrics.marginPercentage}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AUDIT TAB */}
              {activeTab === 'audit' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="p-5 rounded-2xl border border-border bg-surface space-y-3 text-xs">
                    <h3 className="text-sm font-bold text-foreground mb-3">Audit Trail</h3>
                    <div><span className="text-muted-foreground">Product ID:</span> <span className="font-mono">{product.id}</span></div>
                    <div><span className="text-muted-foreground">Created At:</span> <span>{product.createdAt ? new Date(product.createdAt).toLocaleString() : 'N/A'}</span></div>
                    <div><span className="text-muted-foreground">Last Updated:</span> <span>{product.updatedAt ? new Date(product.updatedAt).toLocaleString() : 'N/A'}</span></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
