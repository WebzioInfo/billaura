import React from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';

interface EmployeeAttendancePanelProps {
  employee: any;
  onClose: () => void;
}

export const EmployeeAttendancePanel: React.FC<EmployeeAttendancePanelProps> = ({ employee, onClose }) => {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-border bg-background/50 flex justify-between items-start">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-lg">
              {employee.user?.firstName?.[0]}{employee.user?.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {employee.user?.firstName} {employee.user?.lastName}
              </h2>
              <p className="text-sm text-muted-foreground font-mono">{employee.employeeCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Department</span>
              <p className="font-medium text-foreground">{employee.department?.name || 'Unassigned'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Designation</span>
              <p className="font-medium text-foreground">{employee.designation?.name || 'Unassigned'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Shift</span>
              <p className="font-medium text-foreground">{employee.shift?.name || 'Default'}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" /> This Month
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-green-500/5 border-green-500/20">
                <span className="text-xs text-green-600 font-bold uppercase">Present Days</span>
                <p className="text-2xl font-bold text-green-700">21</p>
              </Card>
              <Card className="p-3 bg-red-500/5 border-red-500/20">
                <span className="text-xs text-red-600 font-bold uppercase">Absent Days</span>
                <p className="text-2xl font-bold text-red-700">1</p>
              </Card>
              <Card className="p-3 bg-yellow-500/5 border-yellow-500/20">
                <span className="text-xs text-yellow-600 font-bold uppercase">Late Arrivals</span>
                <p className="text-2xl font-bold text-yellow-700">3</p>
              </Card>
              <Card className="p-3 bg-blue-500/5 border-blue-500/20">
                <span className="text-xs text-blue-600 font-bold uppercase">Leaves Taken</span>
                <p className="text-2xl font-bold text-blue-700">2</p>
              </Card>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Time Tracking
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Working Hours</span>
                <span className="font-mono font-bold text-foreground">168.5 hrs</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Overtime</span>
                <span className="font-mono font-bold text-accent">12.0 hrs</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Late Deductions</span>
                <span className="font-mono font-bold text-red-500">45 mins</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <Button variant="outline" className="w-full">View Detailed Timesheet</Button>
            <Button variant="outline" className="w-full">View Payroll Slips</Button>
          </div>
          
        </div>
      </div>
    </div>
  );
};
