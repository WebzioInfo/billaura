import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/core/api';
import {
  Layers,
  Plus,
  Search,
  ArrowRightLeft,
  Sparkles,
  CheckCircle2,
  Filter,
  Calculator,
  ShieldCheck,
  Scale,
  Package,
  Droplet,
  GraduationCap,
  FlaskConical,
  Stethoscope,
  Clock,
  Laptop
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const UnitsMasterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal states
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);

  // Unit Form state
  const [newUnit, setNewUnit] = useState({
    name: '',
    abbreviation: '',
    symbol: '',
    category: 'Custom',
    decimals: 2,
    keywords: '',
  });

  // Conversion Form state
  const [conversion, setConversion] = useState({
    fromUnitId: '',
    toUnitId: '',
    multiplier: 1,
    description: '',
  });

  // Calculator state
  const [calcQty, setCalcQty] = useState<number>(1);
  const [calcFrom, setCalcFrom] = useState<string>('');
  const [calcTo, setCalcTo] = useState<string>('');
  const [calcResult, setCalcResult] = useState<number | null>(null);

  // Queries
  const { data: units = [], isLoading: isLoadingUnits } = useQuery<any[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/units');
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: conversions = [] } = useQuery<any[]>({
    queryKey: ['unit-conversions'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/units/conversions');
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Mutations
  const createUnitMutation = useMutation({
    mutationFn: async (data: typeof newUnit) => {
      return apiClient.post('/units', data);
    },
    onSuccess: () => {
      toast.success('Custom Unit created successfully!');
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setIsAddUnitModalOpen(false);
      setNewUnit({
        name: '',
        abbreviation: '',
        symbol: '',
        category: 'Custom',
        decimals: 2,
        keywords: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create unit');
    },
  });

  const createConversionMutation = useMutation({
    mutationFn: async (data: typeof conversion) => {
      return apiClient.post('/units/conversions', data);
    },
    onSuccess: () => {
      toast.success('Unit Conversion saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['unit-conversions'] });
      setIsConversionModalOpen(false);
      setConversion({ fromUnitId: '', toUnitId: '', multiplier: 1, description: '' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save conversion');
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (data: { qty: number; fromUnit: string; toUnit: string }) => {
      return apiClient.post<{ convertedQty: number }>('/units/convert', data);
    },
    onSuccess: (res: any) => {
      setCalcResult(res.convertedQty);
    },
  });

  // Filtered units
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchesCategory =
        selectedCategory === 'ALL' ||
        u.category?.toUpperCase() === selectedCategory.toUpperCase();

      const symbol = u.symbol || u.abbreviation || u.code || '';
      const text = `${u.name} ${symbol} ${u.code} ${u.category || ''} ${u.keywords || ''}`.toLowerCase();
      const matchesSearch = text.includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [units, selectedCategory, searchTerm]);

  // Categories list
  const categories = [
    { key: 'ALL', label: 'All Units', icon: Layers },
    { key: 'Count', label: 'Count & Quantity', icon: Package },
    { key: 'Packaging', label: 'Packaging', icon: Package },
    { key: 'Water Industry', label: 'Water Industry', icon: Droplet },
    { key: 'Laboratory', label: 'Laboratory & Testing', icon: FlaskConical },
    { key: 'Education', label: 'Courses & Education', icon: GraduationCap },
    { key: 'Healthcare', label: 'Healthcare', icon: Stethoscope },
    { key: 'Service', label: 'Services & Time', icon: Clock },
    { key: 'Length', label: 'Length & Distance', icon: Scale },
    { key: 'Area', label: 'Area', icon: Layers },
    { key: 'Volume', label: 'Volume', icon: Droplet },
    { key: 'Weight', label: 'Weight & Mass', icon: Scale },
    { key: 'Digital', label: 'Digital Products', icon: Laptop },
    { key: 'Custom', label: 'Custom Units', icon: Sparkles },
  ];

  const handleRunConversion = () => {
    if (!calcFrom || !calcTo) {
      toast.error('Select From and To units');
      return;
    }
    convertMutation.mutate({ qty: calcQty, fromUnit: calcFrom, toUnit: calcTo });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent/10 text-accent rounded-2xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Enterprise Unit Master</h1>
              <p className="text-sm text-muted-foreground">
                Manage base measurement units, industrial units, and inventory unit conversions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsConversionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground hover:bg-muted/80 font-semibold rounded-xl text-sm transition-all"
          >
            <ArrowRightLeft className="w-4 h-4 text-purple-500" />
            Unit Conversion Rule
          </button>
          <button
            onClick={() => setIsAddUnitModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold rounded-xl text-sm transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Custom Unit
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-medium">Total Available Units</p>
          <p className="text-2xl font-bold text-foreground mt-1">{units.length}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-medium">Unit Categories</p>
          <p className="text-2xl font-bold text-purple-500 mt-1">{categories.length - 1}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-medium">Custom Company Units</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">
            {units.filter((u) => !u.isSystem).length}
          </p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-medium">Active Conversion Rules</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">{conversions.length}</p>
        </div>
      </div>

      {/* Main Grid: Categories & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Column: Categories Sidebar */}
        <div className="bg-card border border-border p-4 rounded-2xl space-y-1 h-fit">
          <p className="text-xs font-bold text-muted-foreground uppercase px-3 py-2">Categories</p>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            const count =
              cat.key === 'ALL'
                ? units.length
                : units.filter((u) => u.category?.toUpperCase() === cat.key.toUpperCase()).length;

            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-accent text-accent-foreground font-bold shadow-sm'
                    : 'text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-accent-foreground/20 text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Search & Unit Cards */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search unit by name, symbol, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              Showing <span className="font-bold text-foreground">{filteredUnits.length}</span> units
            </div>
          </div>

          {isLoadingUnits ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading enterprise units...</div>
          ) : filteredUnits.length === 0 ? (
            <div className="bg-card border border-border p-12 text-center rounded-2xl">
              <p className="text-base font-semibold text-foreground">No units found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try clearing your search query or select another category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredUnits.map((u) => {
                const symbol = u.abbreviation || u.symbol || u.code;
                return (
                  <div
                    key={u.id || u.code}
                    className="bg-card border border-border hover:border-accent/50 p-4 rounded-2xl transition-all shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold rounded-lg uppercase">
                          {u.category || 'General'}
                        </span>
                        {u.isSystem ? (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-blue-500" /> Standard
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Custom
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-foreground text-sm mt-2">{u.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Symbol: <span className="font-bold text-foreground font-mono">{symbol}</span>
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Code: <code className="text-xs text-foreground font-mono">{u.code}</code></span>
                      <span>Decimals: <strong className="text-foreground">{u.decimals ?? 2}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unit Conversion Calculator Widget */}
          <div className="bg-card border border-border p-6 rounded-3xl mt-6">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Calculator className="w-5 h-5 text-accent" />
              Live Unit Conversion Calculator
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Test inventory conversions and custom multi-unit ratios in real time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 items-end">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Quantity</label>
                <input
                  type="number"
                  value={calcQty}
                  onChange={(e) => setCalcQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">From Unit</label>
                <select
                  value={calcFrom}
                  onChange={(e) => setCalcFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select unit...</option>
                  {units.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.name} ({u.abbreviation || u.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">To Unit</label>
                <select
                  value={calcTo}
                  onChange={(e) => setCalcTo(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select unit...</option>
                  {units.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.name} ({u.abbreviation || u.code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRunConversion}
                className="w-full px-4 py-2.5 bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-xl text-sm transition-all shadow-sm"
              >
                Calculate
              </button>
            </div>

            {calcResult !== null && (
              <div className="mt-4 p-4 bg-accent/10 border border-accent/20 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <p className="text-sm font-semibold text-foreground">
                  Result: <span className="text-lg font-bold text-accent">{calcQty} {calcFrom}</span> ={' '}
                  <span className="text-lg font-bold text-accent">{calcResult} {calcTo}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: New Custom Unit */}
      {isAddUnitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">Create Custom Unit</h3>
            <p className="text-xs text-muted-foreground">
              Define a company-specific unit of measure for your inventory or billing.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">Unit Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Tray of 30, Case of 24"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">Abbreviation / Symbol *</label>
                  <input
                    type="text"
                    placeholder="e.g. Try, Cs"
                    value={newUnit.abbreviation}
                    onChange={(e) =>
                      setNewUnit({ ...newUnit, abbreviation: e.target.value, symbol: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Category</label>
                  <select
                    value={newUnit.category}
                    onChange={(e) => setNewUnit({ ...newUnit, category: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-sm"
                  >
                    <option value="Count">Count & Quantity</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Water Industry">Water Industry</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Education">Education</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Service">Service</option>
                    <option value="Digital">Digital</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Search Keywords</label>
                <input
                  type="text"
                  placeholder="e.g. bottle tray pack 30"
                  value={newUnit.keywords}
                  onChange={(e) => setNewUnit({ ...newUnit, keywords: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setIsAddUnitModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => createUnitMutation.mutate(newUnit)}
                disabled={!newUnit.name || !newUnit.abbreviation}
                className="px-4 py-2 bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-bold rounded-xl disabled:opacity-50"
              >
                Save Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Unit Conversion Rule */}
      {isConversionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">Add Unit Conversion Rule</h3>
            <p className="text-xs text-muted-foreground">
              Map parent units to sub-units (e.g. 1 Carton = 12 Bottles).
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">From Unit (Larger)</label>
                  <select
                    value={conversion.fromUnitId}
                    onChange={(e) => setConversion({ ...conversion, fromUnitId: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-sm"
                  >
                    <option value="">Select Unit</option>
                    {units.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.name} ({u.abbreviation || u.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">To Unit (Base)</label>
                  <select
                    value={conversion.toUnitId}
                    onChange={(e) => setConversion({ ...conversion, toUnitId: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-sm"
                  >
                    <option value="">Select Unit</option>
                    {units.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.name} ({u.abbreviation || u.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Multiplier Ratio *</label>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  value={conversion.multiplier}
                  onChange={(e) => setConversion({ ...conversion, multiplier: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Meaning: 1 FromUnit = {conversion.multiplier || 1} ToUnit
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setIsConversionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => createConversionMutation.mutate(conversion)}
                disabled={!conversion.fromUnitId || !conversion.toUnitId || !conversion.multiplier}
                className="px-4 py-2 bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-bold rounded-xl disabled:opacity-50"
              >
                Save Conversion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
