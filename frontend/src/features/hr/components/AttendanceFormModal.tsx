import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import notification from '@/core/services/NotificationService';
import api from '@/core/api';

const attendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  date: z.string().nonempty('Date is required'),
  type: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEK_OFF', 'WEEKLY_OFF']),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  breakMinutes: z.number().optional(),
  remarks: z.string().optional(),
  approvalStatus: z.string().optional(),
  notes: z.string().optional(),
});

type AttendanceFormValues = z.infer<typeof attendanceSchema>;

interface AttendanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  selectedDate: Date;
  existingRecord?: any;
}

export const AttendanceFormModal: React.FC<AttendanceFormModalProps> = ({
  isOpen,
  onClose,
  employee,
  selectedDate,
  existingRecord,
}) => {
  const queryClient = useQueryClient();
  const isEdit = !!existingRecord;
  // Convert date to local string to avoid UTC shift
  const dateStr = selectedDate ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : '';

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      employeeId: employee?.id || '',
      date: dateStr,
      type: 'PRESENT',
      checkIn: '',
      checkOut: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEdit && existingRecord) {
        form.reset({
          employeeId: employee?.id || '',
          date: dateStr,
          type: existingRecord.status || existingRecord.type || 'PRESENT',
          checkIn: existingRecord.checkIn ? new Date(existingRecord.checkIn).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '',
          checkOut: existingRecord.checkOut ? new Date(existingRecord.checkOut).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '',
          notes: existingRecord.remarks || existingRecord.notes || '',
        });
      } else {
        form.reset({
          employeeId: employee?.id || '',
          date: dateStr,
          type: 'PRESENT',
          checkIn: '',
          checkOut: '',
          notes: '',
        });
      }
    }
  }, [isOpen, existingRecord, employee, dateStr, form, isEdit]);

  const mutation = useMutation({
    mutationFn: (values: AttendanceFormValues) => {
      const payload: any = {
        employeeId: values.employeeId,
        date: new Date(values.date).toISOString(),
        type: values.type,
        notes: values.notes,
      };

      if (values.checkIn) {
        const ci = new Date(values.date);
        const [h, m] = values.checkIn.split(':');
        ci.setHours(parseInt(h), parseInt(m), 0, 0);
        payload.checkIn = ci.toISOString();
      }
      
      if (values.checkOut) {
        const co = new Date(values.date);
        const [h, m] = values.checkOut.split(':');
        co.setHours(parseInt(h), parseInt(m), 0, 0);
        payload.checkOut = co.toISOString();
      }

      if (isEdit && existingRecord.id) {
        return api.patch(`/hr/attendances/${existingRecord.id}`, payload);
      }
      return api.post('/hr/attendances', payload);
    },
    onSuccess: () => {
      notification.success(isEdit ? 'Attendance updated' : 'Attendance recorded');
      queryClient.invalidateQueries({ queryKey: ['hr-administrative-hub'] });
      queryClient.invalidateQueries({ queryKey: ['employee-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['employee-attendance-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['employee-attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['department-attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['employee', employee?.id] });
      queryClient.invalidateQueries({ queryKey: ['salary-slips'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-report'] });
      queryClient.invalidateQueries({ queryKey: ['hr'] });
      onClose();
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save attendance');
    },
  });

  if (!isOpen || !employee) return null;

  return (
    <Modal title={isEdit ? "Edit Attendance" : "Mark Attendance"} isOpen={isOpen} onClose={onClose} maxWidth="md">
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employee</label>
            <input 
              type="text" 
              readOnly 
              value={employee.name} 
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input 
              type="text" 
              readOnly 
              value={dateStr} 
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select 
            {...form.register('type')} 
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="LEAVE">Leave</option>
            <option value="HOLIDAY">Holiday</option>
            <option value="WEEK_OFF">Weekly Off</option>
          </select>
          {form.formState.errors.type && <span className="text-red-500 text-xs">{form.formState.errors.type.message}</span>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Check In Time</label>
            <input 
              type="time" 
              {...form.register('checkIn')} 
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Check Out Time</label>
            <input 
              type="time" 
              {...form.register('checkOut')} 
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Remarks</label>
          <textarea 
            {...form.register('notes')} 
            rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            placeholder="Add any remarks or reasons..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
