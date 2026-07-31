import React, { useState } from 'react';
import { X, Calendar, Clock, Activity, ExternalLink, CalendarDays, CheckCircle, XCircle, AlertCircle, Coffee, Star, PlusCircle } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AttendanceFormModal } from './AttendanceFormModal';

interface AttendanceDetailDrawerProps {
  employee: any;
  selectedDate: Date;
  selectedEvent: any;
  onClose: () => void;
}

export const AttendanceDetailDrawer: React.FC<AttendanceDetailDrawerProps> = ({ employee, selectedDate, selectedEvent, onClose }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!employee) return null;

  const dateString = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const isFuture = selectedDate > new Date();
  
  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'PRESENT': return { label: 'Present', color: 'text-green-600 bg-green-50 border-green-200', icon: <CheckCircle className="w-4 h-4 text-green-600" /> };
      case 'ABSENT': return { label: 'Absent', color: 'text-red-600 bg-red-50 border-red-200', icon: <XCircle className="w-4 h-4 text-red-600" /> };
      case 'HALF_DAY': return { label: 'Half Day', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: <AlertCircle className="w-4 h-4 text-yellow-600" /> };
      case 'LEAVE': return { label: 'Leave', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <Coffee className="w-4 h-4 text-blue-600" /> };
      case 'HOLIDAY': return { label: 'Holiday', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: <Star className="w-4 h-4 text-purple-600" /> };
      case 'WEEKLY_OFF': return { label: 'Weekly Off', color: 'text-slate-600 bg-slate-100 border-slate-200', icon: <Coffee className="w-4 h-4 text-slate-600" /> };
      default: return { label: 'No Record', color: 'text-slate-500 bg-slate-50 border-slate-200', icon: <Activity className="w-4 h-4 text-slate-400" /> };
    }
  };

  const statusDisplay = getStatusDisplay(selectedEvent?.status);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-surface shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-border bg-muted/10 flex justify-between items-start shrink-0">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-xl border border-accent/20">
              {employee.name?.[0]}{employee.name?.split(' ')?.[1]?.[0] || ''}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {employee.name || 'Unknown Employee'}
                </h2>
                <Badge variant={employee.isActive ? "success" : "default"}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="font-mono font-medium text-foreground">{employee.employeeCode}</span>
                <span>•</span>
                <span className="font-medium">{employee.designation?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-background space-y-6">
          
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h3 className="font-bold text-lg text-foreground">{dateString}</h3>
            <div className={cn("px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border", statusDisplay.color)}>
              {statusDisplay.icon} {statusDisplay.label}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {!isFuture && (
              selectedEvent ? (
                <Button variant="outline" className="w-full text-xs gap-1.5" onClick={() => setIsModalOpen(true)}>
                  <CalendarDays className="w-3.5 h-3.5" /> Edit Attendance
                </Button>
              ) : (
                <Button variant="primary" className="w-full text-xs gap-1.5" onClick={() => setIsModalOpen(true)}>
                  <PlusCircle className="w-3.5 h-3.5" /> Mark Attendance
                </Button>
              )
            )}
          </div>

          {/* Today's Punch */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Clock className="w-4 h-4 text-accent" /> Attendance Log
            </h3>
            <Card className="p-4 bg-muted/20 border-border/50">
              {isFuture ? (
                <div className="text-center py-6 text-muted-foreground text-sm font-medium">
                  This date is in the future.
                </div>
              ) : selectedEvent ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Check-In</span>
                    <div className="font-mono font-bold text-lg">
                      {selectedEvent.checkIn ? new Date(selectedEvent.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Check-Out</span>
                    <div className="font-mono font-bold text-lg text-muted-foreground">
                       {selectedEvent.checkOut ? new Date(selectedEvent.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Late Minutes</span>
                    <div className={cn("font-mono font-bold text-lg", selectedEvent.lateMinutes > 0 ? "text-orange-600" : "text-muted-foreground")}>
                      {selectedEvent.lateMinutes || 0} min
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Overtime</span>
                    <div className={cn("font-mono font-bold text-lg", selectedEvent.overtimeMinutes > 0 ? "text-green-600" : "text-muted-foreground")}>
                      {selectedEvent.overtimeMinutes > 0 ? (selectedEvent.overtimeMinutes/60).toFixed(1) : '0'} hrs
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Working Hours</span>
                    <div className="font-mono font-bold text-xl text-accent">
                      {selectedEvent.workingMinutes ? (selectedEvent.workingMinutes/60).toFixed(1) + ' hrs' : '0 hrs'}
                    </div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border/50">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Remarks</span>
                    <div className="text-sm font-medium mt-1 text-muted-foreground">
                      {selectedEvent.remarks || 'No remarks added.'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm font-medium flex flex-col items-center gap-2">
                  <Activity className="w-8 h-8 opacity-20" />
                  No attendance record exists for this date.
                </div>
              )}
            </Card>
          </div>

        </div>
      </div>
      
      <AttendanceFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employee={employee}
        selectedDate={selectedDate}
        existingRecord={selectedEvent}
      />
    </div>
  );
}
