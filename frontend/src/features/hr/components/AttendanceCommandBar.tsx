import React from 'react';
import { Search, Filter, Download, RefreshCw, Users, CheckCircle } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect';

interface AttendanceCommandBarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filters: any;
  setFilters: (val: any) => void;
  departments: any[];
  designations: any[];
  onExport: () => void;
  onRefresh: () => void;
  onBulkMark: () => void;
  isLoading: boolean;
}

export const AttendanceCommandBar: React.FC<AttendanceCommandBarProps> = ({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  departments,
  designations,
  onExport,
  onRefresh,
  onBulkMark,
  isLoading
}) => {
  return (
    <div className="bg-surface rounded-xl border border-border p-4 shadow-sm space-y-4">
      {/* Top Row: Search and Primary Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-[400px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search employee by name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background h-10"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={onRefresh} disabled={isLoading} className="h-10 px-3">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={onExport} className="h-10 flex gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button variant="primary" onClick={onBulkMark} className="h-10 flex gap-2">
            <Users className="w-4 h-4" /> Bulk Attendance
          </Button>
        </div>
      </div>

      {/* Bottom Row: Smart Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-border">
        <SearchableSelect
          label=""
          placeholder="Department..."
          options={departments}
          value={filters.departmentId || ''}
          onChange={(val) => setFilters({ ...filters, departmentId: val, designationId: '' })}
          mapOption={(d) => ({ label: d.name, value: d.id })}
        />
        <SearchableSelect
          label=""
          placeholder="Designation..."
          options={designations}
          value={filters.designationId || ''}
          onChange={(val) => setFilters({ ...filters, designationId: val })}
          mapOption={(d) => ({ label: d.name, value: d.id })}
          disabled={!filters.departmentId}
        />
        <input 
          type="date"
          className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-accent"
          value={filters.date || ''}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
        />
        <select 
          className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-accent"
          value={filters.status || ''}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
          <option value="HALF_DAY">Half Day</option>
          <option value="LEAVE">Leave</option>
          <option value="REMOTE">Remote</option>
          <option value="WORK_FROM_HOME">Work from Home</option>
          <option value="HOLIDAY">Holiday</option>
        </select>
        <Button variant="ghost" className="h-10 text-muted-foreground hover:text-foreground" onClick={() => setFilters({})}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
};
