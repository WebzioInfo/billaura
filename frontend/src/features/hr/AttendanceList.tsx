import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Calendar as CalendarIcon, CheckSquare } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import { TableLoader } from '@/shared/components/ui/LoadingSystem';
import { Button } from '@/shared/components/ui/Button';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { AttendanceCommandBar } from './components/AttendanceCommandBar';
import { AttendanceGrid } from './components/AttendanceGrid';
import { EmployeeAttendancePanel } from './components/EmployeeAttendancePanel';
import { AttendanceCalendar } from './components/AttendanceCalendar';
import { Card } from '@/shared/components/ui/Card';

export const AttendanceList = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({
    date: new Date().toISOString().split('T')[0] // Default to today
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

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

  const { data: attendanceData = [], isLoading: attendanceLoading, refetch } = useQuery({
    queryKey: ['attendances-advanced', filters, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.departmentId) params.append('departmentId', filters.departmentId);
      if (filters.designationId) params.append('designationId', filters.designationId);
      if (filters.date) {
        params.append('date', filters.date);
      }
      const res = await apiClient.get(`/attendances/sheet?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const [localAttendances, setLocalAttendances] = useState<any[]>([]);

  useEffect(() => {
    if (attendanceData && Array.isArray(attendanceData)) {
      setLocalAttendances(
        attendanceData.map((row: any) => ({
          ...row.attendance,
          employee: row.employee
        }))
      );
    }
  }, [attendanceData]);

  const bulkMarkMutation = useMutation({
    mutationFn: async (payload: { records: any[] }) => {
      return apiClient.post('/attendances/bulk', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances-advanced'] });
      notification.success(`Successfully saved attendance.`);
      setSelectedIds([]);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save attendance');
    }
  });

  const handleSaveAll = () => {
    const records = localAttendances.map(a => ({
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

  const handleRowChange = (employeeId: string, field: string, value: any) => {
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
    leave: attendances.filter((a: any) => a.type === 'LEAVE').length,
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader 
        title="Attendance Dashboard" 
        description="Enterprise workforce tracking and management"
        primaryAction={
          <Button variant="primary" className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> Clock In / Out
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
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

      <div className="mt-6">
        <AttendanceCommandBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filters={filters}
          setFilters={setFilters}
          departments={hrData?.departments || []}
          designations={hrData?.designations || []}
          onExport={() => notification.success("Export started")}
          onRefresh={refetch}
          onBulkMark={() => handleBulkMark('PRESENT')}
          isLoading={attendanceLoading || hrLoading}
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between">
          <span className="text-sm font-semibold text-accent">{selectedIds.length} employees selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkMark('PRESENT')}>Mark Present</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkMark('ABSENT')}>Mark Absent</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkMark('LEAVE')}>Mark Leave</Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2 mb-4">
        <Button size="sm" variant={viewMode === 'grid' ? 'primary' : 'outline'} onClick={() => setViewMode('grid')}>Grid View</Button>
        <Button size="sm" variant={viewMode === 'calendar' ? 'primary' : 'outline'} onClick={() => setViewMode('calendar')}>Calendar View</Button>
      </div>

      {/* Header Actions */}
      <div className="flex justify-between items-center mt-6">
        <h1 className="text-2xl font-bold">Attendance Register</h1>
        <div className="flex gap-2">
          <Button variant="primary" className="flex items-center gap-2" onClick={handleSaveAll} isLoading={bulkMarkMutation.isPending}>
            <CheckSquare className="w-4 h-4" /> Save Sheet
          </Button>
        </div>
      </div>

      <div className="mt-2">
        {attendanceLoading ? (
          <TableLoader cols={8} rows={8} className="border border-border/80 bg-surface rounded-2xl" />
        ) : attendances.length === 0 ? (
          <EmptyState
            title="No Attendance Records"
            description="No records found for the selected date or filters."
            icon={<CalendarIcon className="w-12 h-12 text-muted-foreground/30" />}
            actionLabel="Clear Filters"
            onActionClick={() => setFilters({})}
          />
        ) : viewMode === 'calendar' ? (
          <AttendanceCalendar 
            attendances={attendances}
            year={parseInt(filters.date?.split('-')[0] || new Date().getFullYear().toString())}
            month={parseInt(filters.date?.split('-')[1] || (new Date().getMonth() + 1).toString()) - 1}
          />
        ) : (
          <AttendanceGrid
            attendances={attendances}
            selectedIds={selectedIds}
            onSelectToggle={handleSelectToggle}
            onSelectAll={handleSelectAll}
            onRowChange={handleRowChange}
          />
        )}
      </div>

      <EmployeeAttendancePanel 
        employee={selectedEmployee} 
        onClose={() => setSelectedEmployee(null)} 
      />
    </PageContainer>
  );
};
