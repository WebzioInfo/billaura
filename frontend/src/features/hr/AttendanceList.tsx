import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Calendar as CalendarIcon, CheckSquare, Lock, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import { TableLoader } from '@/shared/components/ui/LoadingSystem';
import { Button } from '@/shared/components/ui/Button';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { AttendanceCommandBar } from './components/AttendanceCommandBar';
import { AttendanceGrid } from './components/AttendanceGrid';
import { AttendanceDetailDrawer } from './components/AttendanceDetailDrawer';
import { SmartOperationsPanel } from './components/SmartOperationsPanel';
import { AttendanceAnalytics } from './components/AttendanceAnalytics';
import { Card } from '@/shared/components/ui/Card';
import { format, addDays, subDays, isFuture } from 'date-fns';

export const AttendanceList = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [filters, setFilters] = useState<any>({
    date: format(new Date(), 'yyyy-MM-dd') // Default to today
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [sheetState, setSheetState] = useState<'NEW' | 'DIRTY' | 'SAVING' | 'SAVED' | 'APPROVED' | 'LOCKED'>('NEW');
  const [originalAttendances, setOriginalAttendances] = useState<any[]>([]);
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);

  const currentDate = new Date(filters.date || format(new Date(), 'yyyy-MM-dd'));
  const isFutureDate = isFuture(currentDate) && format(currentDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd');

  const { data: hrData, isLoading: hrLoading } = useQuery({
    queryKey: ['hr-attendance-masters', filters.departmentId],
    queryFn: async () => {
      const [deptRes, desgRes] = await Promise.all([
        apiClient.get('/hr-masters/departments'),
        filters.departmentId 
          ? apiClient.get(`/hr-masters/designations?departmentId=${filters.departmentId}`) 
          : Promise.resolve({ data: { data: [] } })
      ]);
      return {
        departments: deptRes.data?.data || deptRes.data || [],
        designations: desgRes.data?.data || desgRes.data || []
      };
    }
  });

  const { data: fetchResult, isLoading: isSheetLoading } = useQuery({
    queryKey: ['attendances-advanced', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/hr/attendances/sheet', { params: filters });
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const attendanceData = fetchResult?.sheet || [];
  const holidayInfo = fetchResult?.holidayInfo || { isHoliday: false };
  const attendanceLoading = isSheetLoading;

  const [localAttendances, setLocalAttendances] = useState<any[]>([]);

  useEffect(() => {
    if (attendanceData && Array.isArray(attendanceData)) {
      const mapped = attendanceData.map((row: any) => ({
        ...row.attendance,
        employee: row.employee
      }));
      setLocalAttendances(mapped);
      setOriginalAttendances(JSON.parse(JSON.stringify(mapped)));
      
      // Determine initial state
      if (mapped.length > 0 && mapped.some(r => r.id)) {
        setSheetState('SAVED');
      } else {
        setSheetState('NEW');
        
        // If it's a new sheet and a holiday is detected, prompt the user
        if (holidayInfo.isHoliday) {
          setShowHolidayDialog(true);
        }
      }
    }
  }, [attendanceData]);

  // Deep Change Detection
  const modifiedRecords = useMemo(() => {
    return localAttendances.filter(local => {
      const original = originalAttendances.find(o => (o.employeeId || o.employee.id) === (local.employeeId || local.employee.id));
      if (!original) return true;
      return (
        local.type !== original.type ||
        local.checkIn !== original.checkIn ||
        local.checkOut !== original.checkOut ||
        local.notes !== original.notes ||
        local.workingHours !== original.workingHours
      );
    });
  }, [localAttendances, originalAttendances]);

  useEffect(() => {
    if (sheetState === 'SAVING') return; // Don't interrupt saving state
    
    if (modifiedRecords.length > 0) {
      setSheetState('DIRTY');
    } else if (originalAttendances.length > 0 && originalAttendances.some(r => r.id)) {
      setSheetState('SAVED');
    } else {
      setSheetState('NEW');
    }
  }, [modifiedRecords, originalAttendances, sheetState]);

  // BeforeUnload Guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sheetState === 'DIRTY') {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
        return '';
      }
      return undefined;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sheetState]);

  // Global Keyboard Navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore shortcuts when inside an input or textarea
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      setFilters((prev: any) => ({ ...prev, date: format(new Date(), 'yyyy-MM-dd') }));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFilters((prev: any) => ({ ...prev, date: format(subDays(new Date(prev.date || format(new Date(), 'yyyy-MM-dd')), 1), 'yyyy-MM-dd') }));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFilters((prev: any) => ({ ...prev, date: format(addDays(new Date(prev.date || format(new Date(), 'yyyy-MM-dd')), 1), 'yyyy-MM-dd') }));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const bulkMarkMutation = useMutation({
    mutationFn: async (payload: { records: any[] }) => {
      return apiClient.post('/hr/attendances/bulk', payload);
    },
    onMutate: () => {
      setSheetState('SAVING');
    },
    onSuccess: () => {
      setSheetState('SAVED');
      queryClient.invalidateQueries({ queryKey: ['attendances-advanced'] });
      queryClient.invalidateQueries({ queryKey: ['hr'] });
      notification.success(`Successfully saved attendance.`);
      setSelectedIds([]);
    },
    onError: (err: any) => {
      setSheetState('DIRTY');
      notification.error(err.response?.data?.message || 'Failed to save attendance');
    }
  });

  const handleExport = () => {
    if (localAttendances.length === 0) return;
    const header = ['Code', 'Name', 'Type', 'Check In', 'Check Out', 'Total Time', 'Late By', 'Early Leaving', 'Status', 'Remarks'];
    const rows = localAttendances.map(a => [
      a.employee?.employeeCode || '',
      a.employee?.name ? a.employee.name : '',
      a.type || '',
      a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '',
      a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '',
      a.totalTime || '',
      a.lateBy || '',
      a.earlyLeaving || '',
      a.status || '',
      a.remarks || ''
    ].map(v => `"${v}"`).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_export_${format(currentDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAll = async () => {
    if (isFutureDate) return;
    if (modifiedRecords.length === 0) {
      notification.info('No changes detected.');
      return;
    }
    const records = modifiedRecords.map(a => ({
      employeeId: a.employeeId || a.employee.id,
      date: filters.date || new Date().toISOString().split('T')[0],
      type: a.type,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      notes: a.notes,
      workingHours: a.workingHours
    }));
    bulkMarkMutation.mutate({ records });
  };

  const handleApplyHoliday = () => {
    const holidayType = holidayInfo.type === 'WEEKLY_OFF' ? 'WEEK_OFF' : 'HOLIDAY';
    
    // Auto mark all active employees
    const updated = localAttendances.map(a => ({
      ...a,
      type: holidayType,
      workingHours: 0,
      checkIn: null,
      checkOut: null,
      notes: `Auto-marked: ${holidayInfo.name}`
    }));
    
    setLocalAttendances(updated);
    setShowHolidayDialog(false);
    notification.success(`Attendance automatically marked for ${holidayInfo.name}`);
  };

  const handleRowChange = (employeeId: string, field: string, value: any) => {
    if (isFutureDate) {
      notification.error('Cannot edit future attendance records.');
      return;
    }
    setLocalAttendances(prev => 
      prev.map(row => {
        if ((row.employeeId || row.employee.id) === employeeId) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const handleBulkMark = (status: string) => {
    if (isFutureDate) {
      notification.error('Cannot edit future attendance records.');
      return;
    }
    if (selectedIds.length === 0) {
      notification.error('Please select at least one employee');
      return;
    }
    setLocalAttendances(prev => 
      prev.map(row => {
        if (selectedIds.includes(row.employeeId || row.employee.id)) {
          return { ...row, type: status };
        }
        return row;
      })
    );
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds([]);
    } else {
      const allIds = localAttendances.map((row: any) => row.employeeId || row.employee.id);
      setSelectedIds(allIds);
    }
  };

  const attendances = localAttendances;

  const stats = {
    present: attendances.filter((a: any) => a.type === 'PRESENT').length,
    absent: attendances.filter((a: any) => a.type === 'ABSENT').length,
    late: attendances.filter((a: any) => a.lateBy > 0).length,
    leave: attendances.filter((a: any) => a.type === 'LEAVE' || a.type === 'PAID_LEAVE' || a.type === 'UNPAID_LEAVE').length,
  };

  const handleApprove = () => {
    setSheetState('APPROVED');
    notification.success('Attendance sheet approved successfully.');
  };

  const handleLock = () => {
    setSheetState('LOCKED');
    notification.success('Attendance sheet locked. No further edits can be made.');
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader 
        title="Attendance Dashboard" 
        description="Enterprise workforce tracking and management"
      />

      {/* KPI Cards / Analytics */}
      <div className="mt-6">
        {showAnalytics ? (
          <AttendanceAnalytics attendances={attendances} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col gap-1 border-l-4 border-l-green-500">
              <span className="text-sm font-semibold text-muted-foreground uppercase">Present</span>
              <span className="text-2xl font-bold text-foreground">{stats.present}</span>
            </Card>
            <Card className="p-4 flex flex-col gap-1 border-l-4 border-l-red-500">
              <span className="text-sm font-semibold text-muted-foreground uppercase">Absent</span>
              <span className="text-2xl font-bold text-foreground">{stats.absent}</span>
            </Card>
            <Card className="p-4 flex flex-col gap-1 border-l-4 border-l-yellow-500">
              <span className="text-sm font-semibold text-muted-foreground uppercase">Late</span>
              <span className="text-2xl font-bold text-foreground">{stats.late}</span>
            </Card>
            <Card className="p-4 flex flex-col gap-1 border-l-4 border-l-blue-500">
              <span className="text-sm font-semibold text-muted-foreground uppercase">On Leave</span>
              <span className="text-2xl font-bold text-foreground">{stats.leave}</span>
            </Card>
          </div>
        )}
      </div>

      <div className="mt-6">
          <AttendanceCommandBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filters={filters}
            setFilters={setFilters}
            departments={hrData?.departments || []}
            designations={hrData?.designations || []}
            onActionClick={(action) => {
              if (action === 'analytics') setShowAnalytics(!showAnalytics);
              else if (action === 'print') window.print();
              else if (action === 'export' || action === 'download') handleExport();
              else if (action === 'register') setFilters({ ...filters, date: format(new Date(), 'yyyy-MM-dd') });
              else if (action.startsWith('bulk-')) handleBulkMark(action.replace('bulk-', '').toUpperCase());
            }}
            isLoading={attendanceLoading || hrLoading}
            sheetState={sheetState}
            isFutureDate={isFutureDate || false}
            onSave={handleSaveAll}
            onApprove={handleApprove}
            onLock={handleLock}
          />
      </div>

      {selectedIds.length > 0 && !isFutureDate && (
        <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between">
          <span className="text-sm font-semibold text-accent">{selectedIds.length} employees selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkMark('PRESENT')}>Mark Present</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkMark('ABSENT')}>Mark Absent</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkMark('PAID_LEAVE')}>Mark Leave</Button>
          </div>
        </div>
      )}

      {holidayInfo.isHoliday && (
        <div className="flex items-center justify-between p-3 mt-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
              🎉
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {holidayInfo.type === 'WEEKLY_OFF' ? 'Weekly Off Detected' : 'Holiday Detected'}
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {holidayInfo.name} • {format(currentDate, 'dd MMM yyyy')}. You can manually override employees who worked today.
              </p>
            </div>
          </div>
          {sheetState === 'NEW' && (
            <Button size="sm" variant="primary" onClick={() => setShowHolidayDialog(true)}>
              Auto Apply {holidayInfo.type === 'WEEKLY_OFF' ? 'Weekly Off' : 'Holiday'}
            </Button>
          )}
        </div>
      )}

      <div className="mt-2 relative">
        {attendanceLoading ? (
          <TableLoader cols={8} rows={8} className="border border-border/80 bg-surface rounded-2xl" />
        ) : attendances.length === 0 ? (
          <EmptyState
            title="No Active Employees"
            description="There are no active employees configured for the selected filters."
            icon={<CalendarIcon className="w-12 h-12 text-muted-foreground/30" />}
            actionLabel="Clear Filters"
            onActionClick={() => setFilters({ date: filters.date })}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className={`lg:col-span-3 ${isFutureDate ? "opacity-75 pointer-events-none" : ""}`}>
              <AttendanceGrid
                attendances={localAttendances}
                selectedIds={selectedIds}
                onSelectToggle={handleSelectToggle}
                onSelectAll={handleSelectAll}
                onRowChange={handleRowChange}
                onRowClick={setSelectedEmployee}
              />
            </div>
            <div className="hidden lg:block lg:col-span-1">
              <SmartOperationsPanel 
                attendances={localAttendances} 
                onEmployeeClick={setSelectedEmployee}
                onActionClick={(action, empId) => {
                  if (action.includes('checkin')) handleRowChange(empId, 'checkIn', new Date().toISOString());
                  else if (action.includes('checkout')) handleRowChange(empId, 'checkOut', new Date().toISOString());
                  else if (action === 'approve-correction') handleApprove();
                  else if (action === 'review-late') {
                    const emp = localAttendances.find(a => a.employeeId === empId)?.employee;
                    if (emp) setSelectedEmployee(emp);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {showHolidayDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border shadow-lg rounded-lg max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex flex-col items-center justify-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-2xl">
                🎉
              </div>
              <h2 className="text-xl font-bold">{holidayInfo.name}</h2>
              <p className="text-muted-foreground text-sm">
                Date: {format(currentDate, 'dd MMMM yyyy')} <br />
                {localAttendances.length} Active Employees
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-md text-sm border border-border text-center">
              Do you want to automatically mark all employees as <b>{holidayInfo.type === 'WEEKLY_OFF' ? 'Weekly Off' : 'Holiday'}</b>?
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowHolidayDialog(false)}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0" onClick={handleApplyHoliday}>
                Apply {holidayInfo.type === 'WEEKLY_OFF' ? 'Weekly Off' : 'Holiday'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AttendanceDetailDrawer 
        employee={selectedEmployee}
        selectedDate={currentDate}
        selectedEvent={selectedEmployee ? localAttendances.find(a => (a.employeeId || a.employee?.id) === selectedEmployee.id) : null}
        onClose={() => setSelectedEmployee(null)} 
      />
    </PageContainer>
  );
};
