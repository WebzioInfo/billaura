import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Clock, TrendingUp, CheckCircle, XCircle, AlertCircle, 
  Coffee, Star, Info, CalendarDays, Activity, ChevronDown, Check
} from 'lucide-react';
import apiClient from '@/core/api';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { TableLoader } from '@/shared/components/ui/LoadingSystem';
import { cn } from '@/lib/utils';
import { AttendanceDetailDrawer } from './AttendanceDetailDrawer';

// Unified Color System
const UNIFIED_COLORS = {
  PRESENT: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600', icon: <Check className="w-3 h-3" />, label: 'Present' },
  PERFECT: { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600', icon: <CheckCircle className="w-3 h-3" />, label: 'Perfect Attendance / Overtime' },
  ABSENT: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600', icon: <XCircle className="w-3 h-3" />, label: 'Absent' },
  HALF_DAY: { bg: 'bg-yellow-500', text: 'text-white', border: 'border-yellow-600', icon: <span className="font-bold text-[10px] leading-none">½</span>, label: 'Half Day' },
  LEAVE: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600', icon: <Coffee className="w-3 h-3" />, label: 'Paid Leave' },
  HOLIDAY: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600', icon: <Star className="w-3 h-3" />, label: 'Public Holiday' },
  WEEKLY_OFF: { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-600', icon: <Coffee className="w-3 h-3" />, label: 'Weekly Off' },
  LATE: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', icon: <Clock className="w-3 h-3" />, label: 'Late Arrival' },
  MISSING_PUNCH: { bg: 'bg-amber-800', text: 'text-white', border: 'border-amber-900', icon: <AlertCircle className="w-3 h-3" />, label: 'Missing Punch' },
  NO_DATA: { bg: 'bg-transparent', text: 'text-foreground', border: 'border-border/50', icon: null, label: 'No Record' },
  FUTURE: { bg: 'bg-transparent', text: 'text-muted-foreground', border: 'border-transparent', icon: null, label: 'Future Date' },
};

const getStatusConfig = (status?: string, isOvertime = false, isFuture = false) => {
  if (isFuture) return UNIFIED_COLORS.FUTURE;
  if (!status) return UNIFIED_COLORS.NO_DATA;
  if (status === 'PRESENT' && isOvertime) return UNIFIED_COLORS.PERFECT;
  return UNIFIED_COLORS[status as keyof typeof UNIFIED_COLORS] || UNIFIED_COLORS.NO_DATA;
};

function generateCalendarGrid(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)
  
  const grid = [];
  let currentWeek = Array(7).fill(null);
  
  for (let i = 0; i < firstDay; i++) {
    currentWeek[i] = null;
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = (firstDay + day - 1) % 7;
    const dateObj = new Date(year, month - 1, day);
    
    currentWeek[dayOfWeek] = {
      day,
      dateString: dateObj.toISOString().split('T')[0],
      isFuture: dateObj > new Date(),
      isToday: dateObj.toDateString() === new Date().toDateString(),
      fullDate: dateObj
    };
    
    if (dayOfWeek === 6 || day === daysInMonth) {
      grid.push(currentWeek);
      currentWeek = Array(7).fill(null);
    }
  }
  
  return grid;
}

export const EmployeeAttendanceWorkspace = ({ employeeId, employee }: { employeeId: string, employee?: any }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['employee-attendance-analytics', employeeId, year, month],
    queryFn: async () => {
      const res = await apiClient.get(`/hr/employees/${employeeId}/attendance-analytics`, {
        params: { year, month }
      });
      return res.data;
    }
  });

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const openDrawer = (date: Date, event: any) => {
    setSelectedDate(date);
    setSelectedEvent(event);
    setDrawerOpen(true);
  };

  if (isLoading && !analytics) {
    return <div className="p-8"><TableLoader cols={4} rows={3} /></div>;
  }

  const { summary, attendances } = analytics || { summary: {}, attendances: [] };
  const monthlyAttendances = (attendances || []).filter((a: any) => {
    if (!a.date) return false;
    const [y, m] = a.date.split('-');
    return parseInt(y, 10) === year && parseInt(m, 10) === month;
  });
  const grid = generateCalendarGrid(year, month);
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

  // Render the Unified Legend
  const UnifiedLegend = () => (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground p-4 bg-muted/5 border-b border-border/50">
      <span className="font-extrabold text-foreground mr-2">LEGEND:</span>
      <div className="flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded-sm", UNIFIED_COLORS.PERFECT.bg)} /> Perfect Attendance</div>
      <div className="flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded-sm", UNIFIED_COLORS.PRESENT.bg)} /> Present</div>
      <div className="flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded-sm", UNIFIED_COLORS.HALF_DAY.bg)} /> Half Day</div>
      <div className="flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded-sm", UNIFIED_COLORS.LEAVE.bg)} /> Leave</div>
      <div className="flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded-sm", UNIFIED_COLORS.HOLIDAY.bg)} /> Holiday</div>
      <div className="flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded-sm", UNIFIED_COLORS.ABSENT.bg)} /> Absent</div>
      <div className="flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded-sm", UNIFIED_COLORS.WEEKLY_OFF.bg)} /> Weekly Off</div>
      <div className="flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded-sm", UNIFIED_COLORS.LATE.bg)} /> Late</div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Activity className="w-6 h-6 text-accent" /> Attendance Intelligence
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Comprehensive attendance tracking and analytics for {employee?.name || 'Employee'}.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-border shadow-sm">
          <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 px-2 border-none">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="w-32 text-center font-bold text-sm tracking-wide">
            {monthName} {year}
          </div>
          <Button variant="outline" size="sm" onClick={nextMonth} disabled={year === today.getFullYear() && month === (today.getMonth() + 1)} className="h-8 px-2 border-none">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Calendar View */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="overflow-hidden border border-border/60 shadow-sm bg-surface">
            <UnifiedLegend />
            
            <div className="p-4 bg-background">
              <div className="grid grid-cols-7 gap-3 mb-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {grid.map((week, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {week.map((day, dIdx) => {
                      if (!day) return <div key={dIdx} className="h-32 rounded-xl border border-transparent" />;
                      
                      const event = monthlyAttendances.find((c: any) => c.date === day.dateString);
                      const isToday = day.isToday;
                      const config = getStatusConfig(event?.status, event?.overtimeMinutes > 0, day.isFuture);
                      
                      return (
                        <div 
                          key={dIdx} 
                          onClick={() => openDrawer(day.fullDate, event)}
                          className={cn(
                            "h-32 rounded-xl border p-2 flex flex-col cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md group relative overflow-hidden",
                            config.bg, config.text, config.border,
                            isToday && "ring-4 ring-blue-500 ring-offset-2 ring-offset-background",
                            day.isFuture && "opacity-50 hover:translate-y-0 hover:shadow-none"
                          )}
                        >
                          <div className="flex justify-between items-start z-10 relative">
                            <span className={cn(
                              "text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full",
                              isToday ? "bg-blue-600 text-white" : ""
                            )}>
                              {day.day}
                            </span>
                            {isToday && (
                              <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500 text-white px-1.5 py-0.5 rounded-sm">
                                Today
                              </span>
                            )}
                          </div>
                          
                          {event && (
                            <div className="mt-auto space-y-1 z-10 relative">
                              <div className="flex items-center gap-1.5 text-xs font-bold mb-1 opacity-90">
                                {config.icon} <span className="truncate">{config.label}</span>
                              </div>
                              
                              {event.checkIn && (
                                <div className="text-[10px] font-mono opacity-90 flex justify-between">
                                  <span>In: {new Date(event.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                              )}
                              
                              {event.checkOut && (
                                <div className="text-[10px] font-mono opacity-90 flex justify-between">
                                  <span>Out: {new Date(event.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                              )}

                              {event.workingMinutes > 0 && (
                                <div className="text-[11px] font-bold mt-1 bg-black/10 dark:bg-black/20 rounded px-1.5 py-0.5 w-max">
                                  {(event.workingMinutes / 60).toFixed(1)}h
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Background icon for visual flair */}
                          {event && (
                            <div className="absolute -bottom-2 -right-2 opacity-10 scale-150 transform">
                              {config.icon}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </Card>
          
          {/* Yearly Heatmap */}
          <Card className="p-6 border-border/60 shadow-sm bg-surface">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" /> {year} Contribution Heatmap
              </h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setYear(y => y - 1)}>Previous Year</Button>
                {year !== today.getFullYear() && (
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setYear(today.getFullYear())}>Current Year</Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setYear(y => y + 1)} disabled={year >= today.getFullYear()}>Next Year</Button>
              </div>
            </div>
            
            <div className="overflow-x-auto pb-4 scrollbar-thin">
              <div className="min-w-max flex gap-1.5">
                {Array.from({ length: 52 }).map((_, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-1.5">
                    {Array.from({ length: 7 }).map((_, rowIdx) => {
                      const dayIndex = colIdx * 7 + rowIdx;
                      const d = new Date(year, 0, dayIndex + 1);
                      if (d.getFullYear() !== year) return <div key={rowIdx} className="w-3.5 h-3.5 bg-transparent" />;
                      
                      const dateStr = d.toISOString().split('T')[0];
                      const hmEvent = attendances.find((h:any) => h.date === dateStr);
                      const isFuture = d > today;
                      
                      const config = getStatusConfig(hmEvent?.status, hmEvent?.overtimeMinutes > 0, isFuture);
                      
                      const tooltipContent = [
                        `Date: ${d.toDateString()}`,
                        `Status: ${config.label}`,
                        hmEvent?.checkIn ? `Check In: ${new Date(hmEvent.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : null,
                        hmEvent?.checkOut ? `Check Out: ${new Date(hmEvent.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : null,
                        hmEvent?.workingMinutes ? `Hours: ${(hmEvent.workingMinutes / 60).toFixed(1)}h` : null,
                        hmEvent?.remarks ? `Remarks: ${hmEvent.remarks}` : null
                      ].filter(Boolean).join('\n');
                      
                      return (
                        <div 
                          key={rowIdx} 
                          title={isFuture ? 'Future Date' : tooltipContent}
                          className={cn(
                            "w-3.5 h-3.5 rounded-sm transition-colors cursor-pointer hover:ring-2 hover:ring-accent hover:ring-offset-1 hover:ring-offset-background", 
                            config.bg === 'bg-transparent' ? 'bg-[#ebedf0] dark:bg-[#161b22]' : config.bg,
                            isFuture ? "bg-muted/30" : ""
                          )} 
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Insights & Activity */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-0 border-border/60 shadow-sm bg-surface overflow-hidden">
             <div className="p-4 border-b border-border/50 bg-muted/10">
               <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Month Insights</h4>
             </div>
             
             <div className="p-4 space-y-4">
                <div className="text-center p-4 bg-accent/5 rounded-xl border border-accent/10">
                  <div className="text-sm font-bold text-accent uppercase tracking-wider mb-1">Attendance Score</div>
                  <div className="text-4xl font-black text-accent">{summary.attendancePercentage || 0}%</div>
                  <div className="text-xs text-muted-foreground mt-2 font-medium">Target: 95%</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className={cn("p-3 rounded-lg border", "bg-green-500/10 border-green-500/20 text-green-700")}>
                    <div className="text-[10px] font-bold uppercase">Present</div>
                    <div className="text-xl font-bold">{summary.present || 0}</div>
                  </div>
                  <div className={cn("p-3 rounded-lg border", "bg-red-500/10 border-red-500/20 text-red-700")}>
                    <div className="text-[10px] font-bold uppercase">Absent</div>
                    <div className="text-xl font-bold">{summary.absent || 0}</div>
                  </div>
                  <div className={cn("p-3 rounded-lg border", "bg-yellow-500/10 border-yellow-500/20 text-yellow-700")}>
                    <div className="text-[10px] font-bold uppercase">Half Day</div>
                    <div className="text-xl font-bold">{summary.halfDay || 0}</div>
                  </div>
                  <div className={cn("p-3 rounded-lg border", "bg-orange-500/10 border-orange-500/20 text-orange-700")}>
                    <div className="text-[10px] font-bold uppercase">Late</div>
                    <div className="text-xl font-bold">{summary.lateCount || 0}</div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Avg Working Hours</span>
                    <span className="font-bold font-mono">{(summary.totalWorkingHours / (summary.present || 1)).toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Total Overtime</span>
                    <span className="font-bold font-mono text-emerald-600">{summary.totalOvertimeHours || 0}h</span>
                  </div>
                </div>
             </div>
          </Card>
          
          <Card className="p-0 border-border/60 shadow-sm bg-surface overflow-hidden">
             <div className="p-4 border-b border-border/50 bg-muted/10">
               <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Recent Activity</h4>
             </div>
             
             {monthlyAttendances.filter((c:any) => c.checkIn || c.status === 'ABSENT' || c.status === 'LEAVE').length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No recent activity.</div>
             ) : (
                <div className="p-4 space-y-4">
                  {monthlyAttendances
                    .filter((c:any) => c.checkIn || c.status === 'ABSENT' || c.status === 'LEAVE')
                    .slice(-5)
                    .reverse()
                    .map((event: any, idx: number) => {
                      const config = getStatusConfig(event.status, event.overtimeMinutes > 0);
                      return (
                        <div key={idx} className="flex gap-3 items-start">
                          <div className={cn("mt-0.5 w-6 h-6 rounded-full flex items-center justify-center", config.bg, config.text)}>
                            {config.icon}
                          </div>
                          <div className="flex-1 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start mb-0.5">
                              <span className="font-bold text-sm text-foreground">
                                {event.status === 'PRESENT' ? 'Checked In' : config.label}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            {event.checkIn && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {new Date(event.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            )}
                            {event.lateMinutes > 0 && (
                              <div className="text-[10px] font-bold text-orange-600 mt-1">
                                Late by {event.lateMinutes} mins
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
             )}
          </Card>
        </div>
      </div>

      {drawerOpen && selectedDate && (
        <AttendanceDetailDrawer 
          employee={employee} 
          selectedDate={selectedDate} 
          selectedEvent={selectedEvent} 
          onClose={() => setDrawerOpen(false)} 
        />
      )}
    </div>
  );
};
