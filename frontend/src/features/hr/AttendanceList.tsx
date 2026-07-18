import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Clock } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { TableLoader } from '@/shared/components/ui/LoadingSystem';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { useDebounce } from '@/shared/hooks/useDebounce';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';

export const AttendanceList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const queryClient = useQueryClient();

  const { data: attendances = [], isLoading } = useQuery({
    queryKey: ['attendances'],
    queryFn: async () => {
      const res = await apiClient.get('/attendances');
      return res.data;
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiClient.get('/employees');
      return res.data;
    }
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async (payload: { employeeId: string; date: string; status: string }) => {
      return apiClient.post('/attendances', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      notification.success('Attendance marked successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to mark attendance');
    }
  });

  const filteredAttendances = attendances.filter((record: any) => 
    record.employee?.user?.firstName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    record.employee?.user?.lastName?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleMarkPresent = (employeeId: string) => {
    markAttendanceMutation.mutate({
      employeeId,
      date: new Date().toISOString().split('T')[0],
      status: 'PRESENT'
    });
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader 
        title="Employee Attendance" 
        description="Track daily check-ins, check-outs, and leaves"
        primaryAction={
          <Button variant="primary" className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> Clock In (Self)
          </Button>
        }
      />

      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search employee..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableLoader cols={5} rows={5} className="mt-6 border border-border/80 bg-surface rounded-2xl" />
      ) : filteredAttendances.length === 0 ? (
        <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Attendance Records"
            description="No attendance data for the selected period."
            actionLabel="Mark Bulk Attendance"
            onActionClick={() => {}}
          />
          {employees.length > 0 && (
            <div className="p-6 border-t border-border bg-muted/10">
              <h4 className="text-sm font-semibold mb-4 text-foreground">Quick Mark Today:</h4>
              <div className="flex gap-2 flex-wrap">
                {employees.map((emp: any) => (
                  <Button 
                    key={emp.id} 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMarkPresent(emp.id)}
                    disabled={markAttendanceMutation.isPending}
                  >
                    {emp.user?.firstName} {emp.user?.lastName} (Present)
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-6 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendances.map((record: any) => (
                <TableRow key={record.id} className="hover:bg-muted/50">
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">
                    {record.employee?.user?.firstName} {record.employee?.user?.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={record.status === 'PRESENT' ? 'success' : record.status === 'ABSENT' ? 'danger' : 'warning'}>
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageContainer>
  );
};
