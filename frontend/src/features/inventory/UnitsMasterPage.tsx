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
  Calculator,
  ShieldCheck,
  Scale,
  Package,
  Droplet,
  GraduationCap,
  FlaskConical,
  Stethoscope,
  Clock,
  Laptop,
  X,
  Filter,
  Edit,
  Trash2,
  Lock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect';
import { dialog } from '@/core/services/DialogService';
import { cn } from '@/lib/utils';

export const UnitsMasterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal states
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [isEditUnitModalOpen, setIsEditUnitModalOpen] = useState(false);
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

  // Edit Unit Form state
  const [editingUnit, setEditingUnit] = useState<any>(null);

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

  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiClient.patch(`/units/${id}`, data);
    },
    onSuccess: () => {
      toast.success('Unit updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setIsEditUnitModalOpen(false);
      setEditingUnit(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update unit');
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/units/${id}`);
    },
    onSuccess: () => {
      toast.success('Unit deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete unit');
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

  const deleteConversionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/units/conversions/${id}`);
    },
    onSuccess: () => {
      toast.success('Conversion rule deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['unit-conversions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete conversion');
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

  const handleStartEditUnit = (u: any) => {
    setEditingUnit({
      id: u.id,
      name: u.name,
      abbreviation: u.abbreviation || u.symbol || '',
      symbol: u.symbol || u.abbreviation || '',
      category: u.category || 'Custom',
      decimals: u.decimals ?? 2,
      keywords: u.keywords || '',
    });
    setIsEditUnitModalOpen(true);
  };

  const handleDeleteUnit = async (u: any) => {
    const confirmed = await dialog.confirmDelete(
      'Delete Unit?',
      `Are you sure you want to delete unit "${u.name}" (${u.code})?`
    );
    if (confirmed) {
      deleteUnitMutation.mutate(u.id);
    }
  };

  const handleDeleteConversion = async (conv: any) => {
    const confirmed = await dialog.confirmDelete(
      'Delete Conversion Rule?',
      `Delete conversion rule: 1 ${conv.fromUnit?.name || conv.fromUnitId} = ${conv.multiplier} ${conv.toUnit?.name || conv.toUnitId}?`
    );
    if (confirmed) {
      deleteConversionMutation.mutate(conv.id);
    }
  };

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

  const customUnitsCount = units.filter((u) => !u.isSystem).length;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white text-[#2B2F36] overflow-y-auto">
      {/* 1. Page Header (Zoho Books Style) */}
      <div className="px-6 py-4 border-b border-[#E5E7EB] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[#2B2F36] leading-tight">
              Units of Measure
            </h1>
            <span className="px-2 py-0.5 rounded-[4px] bg-[#F3F4F6] text-[#6B7280] text-xs font-medium">
              {units.length}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage base units of measurement, precision, and conversion ratios
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsConversionModalOpen(true)}
            className="h-8 px-3 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#2B2F36] rounded-[4px] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Conversion Rule</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddUnitModalOpen(true)}
            className="h-8 px-3.5 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Unit</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Zoho Summary Strip */}
      <div className="px-6 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] flex flex-wrap items-center gap-6 text-xs text-[#6B7280] shrink-0">
        <div className="flex items-center gap-1.5">
          <span>Available Units:</span>
          <strong className="text-[#2B2F36] font-semibold">{units.length}</strong>
        </div>
        <span className="text-[#D1D5DB]">•</span>
        <div className="flex items-center gap-1.5">
          <span>Categories:</span>
          <strong className="text-[#2B2F36] font-semibold">{categories.length - 1}</strong>
        </div>
        <span className="text-[#D1D5DB]">•</span>
        <div className="flex items-center gap-1.5">
          <span>Custom Units:</span>
          <strong className="text-[#2B2F36] font-semibold">{customUnitsCount}</strong>
        </div>
        <span className="text-[#D1D5DB]">•</span>
        <div className="flex items-center gap-1.5">
          <span>Active Conversions:</span>
          <strong className="text-[#2B2F36] font-semibold">{conversions.length}</strong>
        </div>
      </div>

      {/* 3. Main Workspace: Sidebar Categories + Units Table */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 p-6 gap-6">
        {/* Left Column: Categories Navigation */}
        <div className="w-full md:w-60 shrink-0 border border-[#E5E7EB] rounded-[4px] bg-white flex flex-col overflow-hidden h-fit">
          <div className="px-3.5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            Categories
          </div>
          <div className="p-1 space-y-0.5 max-h-[460px] overflow-y-auto">
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
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 rounded-[4px] text-[13px] transition-colors cursor-pointer text-left',
                    isSelected
                      ? 'bg-[#F0F5FF] text-[#408DFB] font-semibold'
                      : 'text-[#2B2F36] hover:bg-[#F9FAFB]'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-[#408DFB]' : 'text-[#6B7280]')} />
                    <span className="truncate">{cat.label}</span>
                  </div>
                  <span
                    className={cn(
                      'text-[11px] px-1.5 py-0.2 rounded font-medium tabular-nums',
                      isSelected ? 'bg-[#EBF3FF] text-[#408DFB]' : 'text-[#6B7280]'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Search + Clean Table Layout */}
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search unit by name, symbol, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>

            <div className="text-xs text-[#6B7280]">
              Showing <strong className="text-[#2B2F36] font-medium">{filteredUnits.length}</strong> of{' '}
              {units.length} units
            </div>
          </div>

          {/* Clean Zoho-Style Table */}
          <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider h-9">
                    <th className="px-4 py-2 font-semibold">Unit Name</th>
                    <th className="px-4 py-2 font-semibold">Symbol</th>
                    <th className="px-4 py-2 font-semibold">Code</th>
                    <th className="px-4 py-2 font-semibold">Category</th>
                    <th className="px-4 py-2 font-semibold text-right">Precision</th>
                    <th className="px-4 py-2 font-semibold text-center">Type</th>
                    <th className="px-4 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {isLoadingUnits ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#6B7280]">
                        <div className="inline-block w-5 h-5 border-2 border-[#408DFB] border-t-transparent rounded-full animate-spin mb-2" />
                        <p>Loading units of measure...</p>
                      </td>
                    </tr>
                  ) : filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#6B7280]">
                        No units found matching your search or category filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u) => {
                      const symbol = u.abbreviation || u.symbol || u.code || '';
                      return (
                        <tr key={u.id || u.code} className="hover:bg-[#F5F7FA] transition-colors min-h-[41px]">
                          <td className="px-4 py-2.5 font-medium text-[#2B2F36]">
                            {u.name}
                          </td>
                          <td className="px-4 py-2.5 text-[#2B2F36]">
                            {symbol || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-[#6B7280]">
                            {u.code || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-[#6B7280]">
                            {u.category || 'General'}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[#2B2F36]">
                            {u.decimals ?? 2}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {u.isSystem ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[11px] font-medium bg-[#F3F4F6] text-[#4B5563]">
                                <ShieldCheck className="w-3 h-3 text-[#408DFB]" />
                                <span>Standard</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[11px] font-medium bg-[#ECFDF5] text-[#059669]">
                                <Sparkles className="w-3 h-3 text-[#059669]" />
                                <span>Custom</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {u.isSystem ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#9CA3AF]" title="Standard units are protected from modification">
                                <Lock className="w-3 h-3 text-[#9CA3AF]" />
                                <span>Locked</span>
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditUnit(u)}
                                  className="p-1 text-[#408DFB] hover:bg-[#EBF3FF] rounded cursor-pointer transition-colors"
                                  title="Edit Unit"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUnit(u)}
                                  className="p-1 text-[#EF4444] hover:bg-[#FEF2F2] rounded cursor-pointer transition-colors"
                                  title="Delete Unit"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Live Unit Conversion Calculator (Refined Zoho Light Card) */}
          <div className="border border-[#E5E7EB] rounded-[4px] p-5 bg-[#F9FAFB] space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#408DFB]" />
              <h3 className="text-[13px] font-semibold text-[#2B2F36]">
                Unit Conversion Calculator
              </h3>
            </div>
            <p className="text-xs text-[#6B7280]">
              Test inventory conversions and multi-unit ratios in real time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-1">
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-1">Quantity</label>
                <input
                  type="number"
                  value={calcQty}
                  onChange={(e) => setCalcQty(Number(e.target.value))}
                  className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div>
                <SearchableSelect
                  label="From Unit"
                  placeholder="Select unit..."
                  searchPlaceholder="Search unit..."
                  value={calcFrom}
                  onChange={(val) => setCalcFrom(val)}
                  options={units}
                  mapOption={(u) => ({
                    label: `${u.name} (${u.abbreviation || u.code})`,
                    value: u.code,
                    searchKeywords: [u.name, u.abbreviation, u.code],
                  })}
                  clearable
                />
              </div>

              <div>
                <SearchableSelect
                  label="To Unit"
                  placeholder="Select unit..."
                  searchPlaceholder="Search unit..."
                  value={calcTo}
                  onChange={(val) => setCalcTo(val)}
                  options={units}
                  mapOption={(u) => ({
                    label: `${u.name} (${u.abbreviation || u.code})`,
                    value: u.code,
                    searchKeywords: [u.name, u.abbreviation, u.code],
                  })}
                  clearable
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRunConversion}
                  className="w-full h-8 px-4 bg-[#408DFB] hover:bg-[#3078E0] text-white font-medium rounded-[4px] text-xs transition-colors cursor-pointer"
                >
                  Calculate
                </button>
              </div>
            </div>

            {calcResult !== null && (
              <div className="mt-3 p-3 bg-white border border-[#D1D5DB] rounded-[4px] flex items-center gap-2.5 text-[13px]">
                <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                <p className="text-[#2B2F36]">
                  Result: <strong className="font-semibold text-[#408DFB]">{calcQty} {calcFrom}</strong> ={' '}
                  <strong className="font-semibold text-[#059669]">{calcResult} {calcTo}</strong>
                </p>
              </div>
            )}
          </div>

          {/* 5. Active Unit Conversion Rules Table */}
          {conversions.length > 0 && (
            <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden bg-white">
              <div className="h-10 px-4 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#408DFB]" />
                  <h4 className="text-xs font-semibold text-[#2B2F36]">
                    Active Conversion Rules ({conversions.length})
                  </h4>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider h-8">
                      <th className="px-4 py-1.5 font-semibold">From Unit</th>
                      <th className="px-4 py-1.5 font-semibold text-center">Multiplier</th>
                      <th className="px-4 py-1.5 font-semibold">To Unit</th>
                      <th className="px-4 py-1.5 font-semibold">Formula / Description</th>
                      <th className="px-4 py-1.5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {conversions.map((conv: any) => (
                      <tr key={conv.id} className="hover:bg-[#F5F7FA] transition-colors">
                        <td className="px-4 py-2 font-medium text-[#2B2F36]">
                          {conv.fromUnit?.name || conv.fromUnitId} ({conv.fromUnit?.code || conv.fromUnitId})
                        </td>
                        <td className="px-4 py-2 text-center font-semibold text-[#408DFB]">
                          × {conv.multiplier}
                        </td>
                        <td className="px-4 py-2 font-medium text-[#2B2F36]">
                          {conv.toUnit?.name || conv.toUnitId} ({conv.toUnit?.code || conv.toUnitId})
                        </td>
                        <td className="px-4 py-2 text-xs text-[#6B7280]">
                          {conv.description || `1 ${conv.fromUnit?.name} = ${conv.multiplier} ${conv.toUnit?.name}`}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteConversion(conv)}
                            className="p-1 text-[#EF4444] hover:bg-[#FEF2F2] rounded cursor-pointer transition-colors"
                            title="Delete Conversion Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Custom Unit (Zoho Styled) */}
      {isAddUnitModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] w-full max-w-md rounded-[4px] shadow-2xl overflow-hidden flex flex-col">
            <div className="h-11 px-5 border-b border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#2B2F36]">Create Custom Unit</h3>
              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(false)}
                className="p-1 text-[#6B7280] hover:text-[#2B2F36] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-[#2B2F36]">
              <div>
                <label className="font-medium text-[#2B2F36] block mb-1">
                  Unit Name <span className="text-[#E54B4B]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tray of 30, Case of 24"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#2B2F36] block mb-1">
                    Abbreviation / Symbol <span className="text-[#E54B4B]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Try, Cs"
                    value={newUnit.abbreviation}
                    onChange={(e) =>
                      setNewUnit({ ...newUnit, abbreviation: e.target.value, symbol: e.target.value })
                    }
                    className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] outline-none focus:border-[#408DFB]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#2B2F36] block mb-1">Category</label>
                  <select
                    value={newUnit.category}
                    onChange={(e) => setNewUnit({ ...newUnit, category: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] outline-none focus:border-[#408DFB] cursor-pointer"
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
                <label className="font-medium text-[#2B2F36] block mb-1">Search Keywords</label>
                <input
                  type="text"
                  placeholder="e.g. bottle tray pack 30"
                  value={newUnit.keywords}
                  onChange={(e) => setNewUnit({ ...newUnit, keywords: e.target.value })}
                  className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] outline-none focus:border-[#408DFB]"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(false)}
                className="h-8 px-3 border border-[#D1D5DB] bg-white text-[#2B2F36] rounded-[4px] text-xs font-medium hover:bg-[#F9FAFB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createUnitMutation.mutate(newUnit)}
                disabled={!newUnit.name || !newUnit.abbreviation}
                className="h-8 px-4 bg-[#408DFB] text-white rounded-[4px] text-xs font-medium hover:bg-[#3078E0] disabled:opacity-50 cursor-pointer shadow-sm"
              >
                Save Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Unit Conversion Rule (Zoho Styled) */}
      {isConversionModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] w-full max-w-md rounded-[4px] shadow-2xl overflow-hidden flex flex-col">
            <div className="h-11 px-5 border-b border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#2B2F36]">Add Unit Conversion Rule</h3>
              <button
                type="button"
                onClick={() => setIsConversionModalOpen(false)}
                className="p-1 text-[#6B7280] hover:text-[#2B2F36] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-[#2B2F36]">
              <p className="text-[#6B7280] text-[12px]">
                Map parent units to sub-units (e.g. 1 Carton = 12 Bottles).
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SearchableSelect
                    label="From Unit (Larger)"
                    placeholder="Select Unit..."
                    searchPlaceholder="Search unit..."
                    value={conversion.fromUnitId}
                    onChange={(val) => setConversion({ ...conversion, fromUnitId: val })}
                    options={units}
                    mapOption={(u) => ({
                      label: `${u.name} (${u.abbreviation || u.code})`,
                      value: u.code,
                      searchKeywords: [u.name, u.abbreviation, u.code],
                    })}
                  />
                </div>

                <div>
                  <SearchableSelect
                    label="To Unit (Base)"
                    placeholder="Select Unit..."
                    searchPlaceholder="Search unit..."
                    value={conversion.toUnitId}
                    onChange={(val) => setConversion({ ...conversion, toUnitId: val })}
                    options={units}
                    mapOption={(u) => ({
                      label: `${u.name} (${u.abbreviation || u.code})`,
                      value: u.code,
                      searchKeywords: [u.name, u.abbreviation, u.code],
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#2B2F36] block mb-1">
                  Multiplier Ratio <span className="text-[#E54B4B]">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  value={conversion.multiplier}
                  onChange={(e) => setConversion({ ...conversion, multiplier: Number(e.target.value) })}
                  className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] outline-none focus:border-[#408DFB]"
                />
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Meaning: 1 FromUnit = {conversion.multiplier || 1} ToUnit
                </p>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConversionModalOpen(false)}
                className="h-8 px-3 border border-[#D1D5DB] bg-white text-[#2B2F36] rounded-[4px] text-xs font-medium hover:bg-[#F9FAFB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createConversionMutation.mutate(conversion)}
                disabled={!conversion.fromUnitId || !conversion.toUnitId || !conversion.multiplier}
                className="h-8 px-4 bg-[#408DFB] text-white rounded-[4px] text-xs font-medium hover:bg-[#3078E0] disabled:opacity-50 cursor-pointer shadow-sm"
              >
                Save Conversion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Custom Unit (Zoho Styled) */}
      {isEditUnitModalOpen && editingUnit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] w-full max-w-md rounded-[4px] shadow-2xl overflow-hidden flex flex-col">
            <div className="h-11 px-5 border-b border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#2B2F36]">Edit Custom Unit</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditUnitModalOpen(false);
                  setEditingUnit(null);
                }}
                className="p-1 text-[#6B7280] hover:text-[#2B2F36] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-[#2B2F36]">
              <div>
                <label className="font-medium text-[#2B2F36] block mb-1">
                  Unit Name <span className="text-[#E54B4B]">*</span>
                </label>
                <input
                  type="text"
                  value={editingUnit.name}
                  onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                  className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#2B2F36] block mb-1">
                    Abbreviation / Symbol <span className="text-[#E54B4B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingUnit.abbreviation}
                    onChange={(e) =>
                      setEditingUnit({
                        ...editingUnit,
                        abbreviation: e.target.value,
                        symbol: e.target.value,
                      })
                    }
                    className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] outline-none focus:border-[#408DFB]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#2B2F36] block mb-1">Category</label>
                  <select
                    value={editingUnit.category}
                    onChange={(e) => setEditingUnit({ ...editingUnit, category: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] outline-none focus:border-[#408DFB] cursor-pointer"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#2B2F36] block mb-1">Decimal Precision</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={editingUnit.decimals}
                    onChange={(e) => setEditingUnit({ ...editingUnit, decimals: Number(e.target.value) })}
                    className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] outline-none focus:border-[#408DFB]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#2B2F36] block mb-1">Search Keywords</label>
                  <input
                    type="text"
                    value={editingUnit.keywords}
                    onChange={(e) => setEditingUnit({ ...editingUnit, keywords: e.target.value })}
                    className="w-full h-8 px-3 bg-white border border-[#D1D5DB] rounded-[4px] text-[13px] outline-none focus:border-[#408DFB]"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditUnitModalOpen(false);
                  setEditingUnit(null);
                }}
                className="h-8 px-3 border border-[#D1D5DB] bg-white text-[#2B2F36] rounded-[4px] text-xs font-medium hover:bg-[#F9FAFB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  updateUnitMutation.mutate({
                    id: editingUnit.id,
                    data: {
                      name: editingUnit.name,
                      abbreviation: editingUnit.abbreviation,
                      symbol: editingUnit.symbol,
                      category: editingUnit.category,
                      decimals: editingUnit.decimals,
                      keywords: editingUnit.keywords,
                    },
                  })
                }
                disabled={!editingUnit.name || !editingUnit.abbreviation || updateUnitMutation.isPending}
                className="h-8 px-4 bg-[#408DFB] text-white rounded-[4px] text-xs font-medium hover:bg-[#3078E0] disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {updateUnitMutation.isPending ? 'Updating...' : 'Update Unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitsMasterPage;

