import React, { useState } from 'react';
import { Button } from '../Button';
import { Input } from '../Input';
import { Filter, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date-range' | 'number-range';
  options?: FilterOption[];
}

interface FilterPanelProps {
  fields: FilterField[];
  onApply: (filters: Record<string, any>) => void;
  className?: string;
}

export function FilterPanel({ fields, onApply, className }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const handleFilterChange = (id: string, value: any) => {
    setFilters((prev) => ({ ...prev, [id]: value }));
  };

  const applyFilters = () => {
    onApply(filters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setFilters({});
    onApply({});
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className={cn("h-9", className)}>
        <Filter className="mr-2 h-4 w-4" /> Advanced Filters
      </Button>
    );
  }

  return (
    <div className={cn("p-4 border border-border rounded-md bg-surface mb-4 shadow-sm", className)}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium flex items-center"><Filter className="mr-2 h-4 w-4" /> Advanced Filters</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
            {field.type === 'text' && (
              <Input 
                placeholder={`Filter by ${field.label}...`}
                value={filters[field.id] || ''}
                onChange={(e) => handleFilterChange(field.id, e.target.value)}
                className="h-9 text-sm"
              />
            )}
            {field.type === 'select' && field.options && (
              <select
                value={filters[field.id] || ''}
                onChange={(e) => handleFilterChange(field.id, e.target.value)}
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            {field.type === 'number-range' && (
              <div className="flex items-center space-x-2">
                <Input 
                  placeholder="Min" 
                  type="number"
                  value={filters[`${field.id}_min`] || ''}
                  onChange={(e) => handleFilterChange(`${field.id}_min`, e.target.value)}
                  className="h-9 text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <Input 
                  placeholder="Max" 
                  type="number"
                  value={filters[`${field.id}_max`] || ''}
                  onChange={(e) => handleFilterChange(`${field.id}_max`, e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}
            {field.type === 'date-range' && (
               <div className="flex items-center space-x-2">
               <Input 
                 type="date"
                 value={filters[`${field.id}_start`] || ''}
                 onChange={(e) => handleFilterChange(`${field.id}_start`, e.target.value)}
                 className="h-9 text-sm"
               />
               <span className="text-muted-foreground">-</span>
               <Input 
                 type="date"
                 value={filters[`${field.id}_end`] || ''}
                 onChange={(e) => handleFilterChange(`${field.id}_end`, e.target.value)}
                 className="h-9 text-sm"
               />
             </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-border">
        <Button variant="ghost" size="sm" onClick={clearFilters}>Clear All</Button>
        <Button variant="outline" size="sm"><Save className="mr-2 h-4 w-4"/> Save Preset</Button>
        <Button variant="primary" size="sm" onClick={applyFilters}>Apply Filters</Button>
      </div>
    </div>
  );
}
