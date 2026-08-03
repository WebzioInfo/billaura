import React, { useState, useMemo } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { hrApi } from '../api/hr.api';
import { useQuery } from '@tanstack/react-query';

interface AttendanceCalendarProps {
  employeeId?: string;
  startDate: string | Date;
  endDate: string | Date;
  attendances?: any[];
  employeeName?: string;
  employeeJoiningDate?: string | Date | null;
  employeeRelievingDate?: string | Date | null;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  employeeId,
  startDate,
  endDate,
  attendances = [],
  employeeName = 'Employee',
  employeeJoiningDate,
  employeeRelievingDate,
}) => {
  const [selectedDay, setSelectedDay] = useState<any | null>(null);

  const startStr = useMemo(() => {
    if (!startDate) return '';
    return typeof startDate === 'string' ? startDate.split('T')[0] : new Date(startDate).toISOString().split('T')[0];
  }, [startDate]);

  const endStr = useMemo(() => {
    if (!endDate) return '';
    return typeof endDate === 'string' ? endDate.split('T')[0] : new Date(endDate).toISOString().split('T')[0];
  }, [endDate]);

  const { data: calendarData = null, isLoading: isQueryLoading } = useQuery({
    queryKey: ['hr', 'attendance-calendar', employeeId, startStr, endStr],
    queryFn: () => {
      if (!employeeId || !startStr || !endStr) return null;
      return hrApi.getEmployeeAttendanceCalendar(employeeId, {
        startDate: startStr,
        endDate: endStr,
      });
    },
    enabled: !!employeeId && !!startStr && !!endStr,
  });

  const safeAttendances = useMemo(() => {
    if (Array.isArray(attendances)) return attendances;
    if (Array.isArray((attendances as any)?.items)) return (attendances as any).items;
    if (Array.isArray((attendances as any)?.data)) return (attendances as any).data;
    return [];
  }, [attendances]);

  const daysList = useMemo(() => {
    if (!calendarData?.calendar || !Array.isArray(calendarData.calendar)) {
      return [];
    }
    return calendarData.calendar;
  }, [calendarData]);

  // Loading State
  if (isQueryLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#E5E7EB] text-xs font-sans text-[#6B7280]">
        <div className="animate-spin w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full mx-auto mb-2" />
        Loading attendance history...
      </div>
    );
  }

  // Pure Database Record Existence Validation Empty State (0 logged entries)
  if (safeAttendances.length === 0 || daysList.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#E5E7EB] space-y-3 font-sans text-xs">
        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <CalendarIcon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-[#111827]">No attendance records found</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">Attendance has not been generated or recorded for this payroll period.</p>
        </div>
      </div>
    );
  }

  const insights = calendarData?.insights || null;
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfWeek = startStr ? new Date(startStr).getDay() : 0;
  const paddingDays = Array.from({ length: firstDayOfWeek });

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <span className="w-2 h-2 rounded-full bg-[#16A34A]" title="Present"></span>;
      case 'LATE':
        return (
          <div className="flex items-center gap-0.5">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" title="Late"></span>
          </div>
        );
      case 'ABSENT':
        return <span className="w-2 h-2 rounded-full bg-[#DC2626]" title="Absent"></span>;
      case 'LEAVE':
        return <span className="w-2 h-2 rounded-full bg-[#F59E0B]" title="Leave"></span>;
      case 'HOLIDAY':
        return <span className="w-2 h-2 rounded-full bg-[#2563EB]" title="Holiday"></span>;
      case 'WEEK_OFF':
        return <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" title="Week Off"></span>;
      case 'HALF_DAY':
        return <span className="w-2 h-2 rounded-full bg-[#F59E0B]" title="Half Day"></span>;
      case 'UPCOMING':
        return <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" title="Upcoming"></span>;
      case 'NOT_EMPLOYED':
        return <span className="w-1.5 h-1.5 rounded-full bg-[#E5E7EB]" title="Not Employed"></span>;
      default:
        return <span className="w-2 h-2 rounded-full bg-[#9CA3AF]"></span>;
    }
  };

  return (
    <div className="space-y-4 font-sans text-[#111827]">
      {/* Month Insights Summary Bar */}
      {insights && (
        <div className="p-3 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-[#111827] uppercase tracking-wider text-[11px]">
              Attendance Insights ({insights.eligibleWorkingDays} Eligible Days)
            </span>
            <span className="font-bold text-[#2563EB]">
              Score: {insights.attendancePercentage}%
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center text-xs">
            <div className="p-1.5 bg-white rounded-lg border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block">Present</span>
              <span className="font-bold text-[#16A34A]">{insights.present}</span>
            </div>
            <div className="p-1.5 bg-white rounded-lg border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block">Absent</span>
              <span className="font-bold text-[#DC2626]">{insights.absent}</span>
            </div>
            <div className="p-1.5 bg-white rounded-lg border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block">Paid Leave</span>
              <span className="font-bold text-[#F59E0B]">{insights.paidLeave}</span>
            </div>
            <div className="p-1.5 bg-white rounded-lg border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block">Weekly Off</span>
              <span className="font-bold text-[#6B7280]">{insights.weekOff}</span>
            </div>
            <div className="p-1.5 bg-white rounded-lg border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block">Holiday</span>
              <span className="font-bold text-[#2563EB]">{insights.holiday}</span>
            </div>
            <div className="p-1.5 bg-white rounded-lg border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block">Late Count</span>
              <span className="font-bold text-[#F59E0B]">{insights.lateCount}</span>
            </div>
            <div className="p-1.5 bg-white rounded-lg border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block">OT Hours</span>
              <span className="font-bold text-[#9333EA]">{insights.otHours}h</span>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Header Legend */}
      <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
        <span className="font-medium text-[#111827]">Calendar Grid</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#16A34A]"></span> Present</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#DC2626]"></span> Absent</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span> Leave</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2563EB]"></span> Holiday</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#9CA3AF]"></span> Week Off</span>
        </div>
      </div>

      {/* Apple Calendar Grid */}
      <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
        <div className="grid grid-cols-7 bg-[#FAFAFA] border-b border-[#E5E7EB] text-center text-[11px] font-medium text-[#6B7280] py-2">
          {daysOfWeek.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-[#E5E7EB]">
          {paddingDays.map((_, idx) => (
            <div key={`pad-${idx}`} className="bg-[#FAFAFA] min-h-[55px] opacity-30"></div>
          ))}

          {daysList.map((dayItem: any) => {
            const d = new Date(dayItem.date);
            const isNotEmployed = dayItem.status === 'NOT_EMPLOYED';
            const isUpcoming = dayItem.status === 'UPCOMING';

            return (
              <div
                key={dayItem.date}
                onClick={() => setSelectedDay(dayItem)}
                className={`p-2 min-h-[55px] transition-all flex flex-col justify-between cursor-pointer ${isNotEmployed ? 'bg-[#FAFAFA] opacity-40' :
                  isUpcoming ? 'bg-white hover:bg-[#FAFAFA]' :
                    'bg-white hover:bg-[#F9FAFB]'
                  }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-medium ${isNotEmployed ? 'text-[#9CA3AF]' : 'text-[#111827]'}`}>
                    {d.getDate()}
                  </span>
                  {dayItem.workingHours > 0 && (
                    <span className="text-[10px] text-[#6B7280]">
                      {dayItem.workingHours}h
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-[#6B7280] truncate max-w-[45px]">
                    {dayItem.statusLabel}
                  </span>
                  {getStatusDot(dayItem.status)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Details Side Panel / Modal */}
      {selectedDay && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDay(null)}
          title={`Attendance Details — ${selectedDay.date}`}
          maxWidth="sm"
        >
          <div className="space-y-3 py-1 text-xs text-[#111827] font-sans">
            <div className="flex items-center justify-between bg-[#FAFAFA] p-3 rounded-lg border border-[#E5E7EB]">
              <div>
                <p className="font-semibold text-[#111827]">{employeeName}</p>
                <p className="text-[11px] text-[#6B7280]">{selectedDay.date} ({selectedDay.dayName})</p>
              </div>
              <div className="flex items-center gap-1.5">
                {getStatusDot(selectedDay.status)}
                <span className="font-semibold text-xs">{selectedDay.statusLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-[#FAFAFA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[10px] text-[#6B7280] block">Check In</span>
                <span className="font-mono font-medium">
                  {selectedDay.checkIn
                    ? new Date(selectedDay.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'N/A'}
                </span>
              </div>
              <div className="p-2.5 bg-[#FAFAFA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[10px] text-[#6B7280] block">Check Out</span>
                <span className="font-mono font-medium">
                  {selectedDay.checkOut
                    ? new Date(selectedDay.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'N/A'}
                </span>
              </div>
              <div className="p-2.5 bg-[#FAFAFA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[10px] text-[#6B7280] block">Working Hours</span>
                <span className="font-medium">{selectedDay.workingHours || 0} hrs</span>
              </div>
              <div className="p-2.5 bg-[#FAFAFA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[10px] text-[#6B7280] block">Overtime</span>
                <span className="font-medium text-[#2563EB]">{selectedDay.otHours || 0} hrs</span>
              </div>
              <div className="p-2.5 bg-[#FAFAFA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[10px] text-[#6B7280] block">Late By</span>
                <span className="font-medium text-[#F59E0B]">{selectedDay.lateMinutes || 0} mins</span>
              </div>
              <div className="p-2.5 bg-[#FAFAFA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[10px] text-[#6B7280] block">Attendance Source</span>
                <span className="font-medium uppercase">{selectedDay.source || 'SYSTEM'}</span>
              </div>
            </div>

            {selectedDay.remarks && (
              <div className="p-2.5 bg-[#FAFAFA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[10px] text-[#6B7280] block">Remarks / Notes</span>
                <p className="text-xs text-[#111827]">{selectedDay.remarks}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
