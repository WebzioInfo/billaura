import React, { useRef, useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, CalendarDays, MoreHorizontal, FileDown, FileUp, Printer, FileText, Settings, History, Activity, Clock, CheckSquare, XSquare, UserX, Sun, Monitor, MapPin, MessageSquare, Play, Square, FileClock, Save, CheckCircle2, Lock, Loader2, Download } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';

interface AttendanceCommandBarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filters: any;
  setFilters: (val: any) => void;
  departments: any[];
  designations: any[];
  onActionClick?: (action: string) => void;
  isLoading: boolean;
  sheetState: 'NEW' | 'DIRTY' | 'SAVING' | 'SAVED' | 'APPROVED' | 'LOCKED';
  isFutureDate: boolean;
  onSave: () => void;
  onApprove: () => void;
  onLock: () => void;
}

export const AttendanceCommandBar: React.FC<AttendanceCommandBarProps> = ({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  departments,
  designations,
  onActionClick = () => {},
  isLoading,
  sheetState,
  isFutureDate,
  onSave,
  onApprove,
  onLock
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setShowMoreActions(false);
      setShowBulkActions(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Date Navigation Logic
  const currentDateStr = filters.date || format(new Date(), 'yyyy-MM-dd');
  const currentDate = new Date(currentDateStr);

  const handlePrevDay = () => setFilters({ ...filters, date: format(subDays(currentDate, 1), 'yyyy-MM-dd') });
  const handleNextDay = () => setFilters({ ...filters, date: format(addDays(currentDate, 1), 'yyyy-MM-dd') });
  const handleToday = () => setFilters({ ...filters, date: format(new Date(), 'yyyy-MM-dd') });

  const renderDateLabel = () => {
    if (isToday(currentDate)) return <div className="flex flex-col items-center"><span className="text-xs font-bold text-accent">Today</span><span className="text-[10px] text-muted-foreground">{format(currentDate, 'dd MMM yyyy')}</span></div>;
    if (isYesterday(currentDate)) return <div className="flex flex-col items-center"><span className="text-xs font-bold text-foreground">Yesterday</span><span className="text-[10px] text-muted-foreground">{format(currentDate, 'dd MMM yyyy')}</span></div>;
    if (isTomorrow(currentDate)) return <div className="flex flex-col items-center"><span className="text-xs font-bold text-foreground">Tomorrow</span><span className="text-[10px] text-muted-foreground">{format(currentDate, 'dd MMM yyyy')}</span></div>;
    return <div className="text-sm font-semibold">{format(currentDate, 'dd MMM yyyy')}</div>;
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-3 shadow-sm space-y-3">
      {/* Top Row: Date Navigation & Primary Actions */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
        
        <div className="flex items-center gap-3">
          {/* Enterprise Date Navigation Toolbar */}
          <div className="flex items-center bg-background rounded-full border border-border p-1 shadow-sm shrink-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={handlePrevDay}>
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="w-[120px] flex items-center justify-center select-none cursor-pointer" onClick={() => dateInputRef.current?.showPicker()}>
              {renderDateLabel()}
            </div>

            <div className="relative flex items-center">
              <input 
                ref={dateInputRef}
                type="date"
                className="absolute opacity-0 w-1 h-1 pointer-events-none -z-10"
                value={currentDateStr}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>

            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted ml-1" onClick={handleToday}>
              Today
            </Button>

            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={handleNextDay}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Attendance Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 text-xs font-semibold rounded-full border border-border">
            {isFutureDate && <span className="flex items-center gap-1.5 text-orange-600"><Lock className="w-3 h-3" /> Future Date</span>}
            {!isFutureDate && sheetState === 'DIRTY' && <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Unsaved</span>}
            {!isFutureDate && sheetState === 'SAVED' && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Saved</span>}
            {!isFutureDate && sheetState === 'SAVING' && <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
            {!isFutureDate && sheetState === 'NEW' && <span className="flex items-center gap-1 text-muted-foreground">New Sheet</span>}
            {!isFutureDate && sheetState === 'APPROVED' && <span className="flex items-center gap-1 text-indigo-600"><CheckCircle2 className="w-3 h-3" /> Approved</span>}
            {!isFutureDate && sheetState === 'LOCKED' && <span className="flex items-center gap-1 text-red-600"><Lock className="w-3 h-3" /> Locked</span>}
          </div>
        </div>
        
        {/* Primary Actions & Smart Buttons */}
        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-end" onClick={e => e.stopPropagation()}>
          
          {/* Smart Primary Buttons based on sheet state */}
          {!isFutureDate && (
            <>
              {(sheetState === 'NEW' || sheetState === 'DIRTY' || sheetState === 'SAVING') && (
                <Button 
                  variant="primary"
                  className="h-9 px-4 flex gap-1.5 text-sm font-semibold"
                  onClick={onSave}
                  disabled={sheetState === 'SAVING'}
                >
                  {sheetState === 'SAVING' ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Sheet</>}
                </Button>
              )}
              {sheetState === 'SAVED' && (
                <Button 
                  className="h-9 px-4 flex gap-1.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white"
                  onClick={onApprove}
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </Button>
              )}
              {sheetState === 'APPROVED' && (
                <Button 
                  className="h-9 px-4 flex gap-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={onLock}
                >
                  <Lock className="w-4 h-4" /> Lock
                </Button>
              )}
            </>
          )}

          {/* Bulk Actions Dropdown */}
          {(!isFutureDate && sheetState !== 'LOCKED') && (
            <div className="relative">
              <Button variant="outline" className="h-9 px-3 flex gap-1.5 bg-background text-sm font-semibold" onClick={() => { setShowBulkActions(!showBulkActions); setShowMoreActions(false); }}>
                Bulk Actions
              </Button>
              {showBulkActions && (
                <div className="absolute right-0 mt-1 w-56 bg-surface border border-border rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</div>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('bulk-present'); setShowBulkActions(false); }}><CheckSquare className="w-4 h-4 text-green-500" /> Mark Present</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('bulk-absent'); setShowBulkActions(false); }}><XSquare className="w-4 h-4 text-red-500" /> Mark Absent</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('bulk-leave'); setShowBulkActions(false); }}><UserX className="w-4 h-4 text-purple-500" /> Mark Leave</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('bulk-holiday'); setShowBulkActions(false); }}><Sun className="w-4 h-4 text-orange-500" /> Mark Holiday</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('bulk-halfday'); setShowBulkActions(false); }}><Clock className="w-4 h-4 text-yellow-500" /> Mark Half Day</button>
                  
                  <div className="border-t border-border my-1"></div>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location</div>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('bulk-wfh'); setShowBulkActions(false); }}><Monitor className="w-4 h-4 text-blue-500" /> Mark WFH</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('bulk-remote'); setShowBulkActions(false); }}><MapPin className="w-4 h-4 text-teal-500" /> Mark Remote</button>
                  
                  <div className="border-t border-border my-1"></div>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Time</div>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('bulk-checkin'); setShowBulkActions(false); }}><Play className="w-4 h-4 text-indigo-500" /> Bulk Check In</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('bulk-checkout'); setShowBulkActions(false); }}><Square className="w-4 h-4 text-slate-500" /> Bulk Check Out</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('bulk-remarks'); setShowBulkActions(false); }}><MessageSquare className="w-4 h-4 text-muted-foreground" /> Bulk Remarks</button>
                </div>
              )}
            </div>
          )}

          {/* More Actions Dropdown */}
          <div className="relative">
            <Button variant="outline" className="h-9 w-9 p-0 bg-background" onClick={() => { setShowMoreActions(!showMoreActions); setShowBulkActions(false); }}>
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </Button>
            {showMoreActions && (
              <div className="absolute right-0 mt-1 w-56 bg-surface border border-border rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('analytics'); setShowMoreActions(false); }}><Activity className="w-4 h-4 text-blue-500" /> Analytics</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('register'); setShowMoreActions(false); }}><CalendarDays className="w-4 h-4 text-indigo-500" /> Attendance Register</button>
                <div className="border-t border-border my-1"></div>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 opacity-50 cursor-not-allowed" title="Available in a future release." disabled><FileUp className="w-4 h-4 text-muted-foreground" /> Import</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('export'); setShowMoreActions(false); }}><FileDown className="w-4 h-4 text-muted-foreground" /> Export</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('print'); setShowMoreActions(false); }}><Printer className="w-4 h-4 text-muted-foreground" /> Print</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { onActionClick('download'); setShowMoreActions(false); }}><Download className="w-4 h-4 text-muted-foreground" /> Download</button>
                <div className="border-t border-border my-1"></div>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 opacity-50 cursor-not-allowed" title="Available in a future release." disabled><FileText className="w-4 h-4 text-muted-foreground" /> Reports</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 opacity-50 cursor-not-allowed" title="Available in a future release." disabled><History className="w-4 h-4 text-muted-foreground" /> History</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 opacity-50 cursor-not-allowed" title="Available in a future release." disabled><FileClock className="w-4 h-4 text-muted-foreground" /> Audit Log</button>
                <div className="border-t border-border my-1"></div>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 opacity-50 cursor-not-allowed" title="Available in a future release." disabled><Settings className="w-4 h-4 text-muted-foreground" /> Settings</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Smart Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border/50">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search employee by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background h-9 rounded-full text-sm border-border w-full"
          />
        </div>
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
        />
      </div>
    </div>
  );
};
