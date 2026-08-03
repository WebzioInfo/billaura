import React, { useState } from 'react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { AlertCircle, Clock, FileWarning, CheckCircle2, Search, ArrowRight, UserX, UserCheck, Calendar, Briefcase, FileText, DollarSign, Gift, Scroll } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';

interface SmartOperationsPanelProps {
  attendances: any[];
  onEmployeeClick?: (employee: any) => void;
  onActionClick?: (action: string, employeeId: string) => void;
}

export const SmartOperationsPanel: React.FC<SmartOperationsPanelProps> = ({ attendances, onEmployeeClick, onActionClick = () => { } }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter by search
  const filteredAttendances = attendances.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const emp = a.employee;
    if (!emp) return false;
    const name = (emp.name || '').toLowerCase();
    const code = (emp.employeeCode || '').toLowerCase();
    const phone = (emp.mobile || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    return name.includes(term) || code.includes(term) || phone.includes(term) || email.includes(term);
  });

  // Split missing punches into Check-In and Check-Out
  const missingCheckOut = filteredAttendances.filter(a => a.type === 'PRESENT' && a.checkIn && !a.checkOut);
  const missingCheckIn = filteredAttendances.filter(a => a.type === 'PRESENT' && !a.checkIn);

  const lateEmployees = filteredAttendances.filter(a => (a.lateBy || 0) > 0);
  const pendingApprovals = filteredAttendances.filter(a => a.status === 'PENDING' || a.status === 'DRAFT');
  const leaves = filteredAttendances.filter(a => ['LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE', 'SICK_LEAVE'].includes(a.type));

  // Placeholder for real backend data
  const upcomingBirthdays: any[] = [];
  const probationEnding: any[] = [];
  const contractExpiring: any[] = [];
  const missingDocuments: any[] = [];
  const payrollAlerts = [
    { title: 'Tax Declarations Due', count: 0 }
  ];

  const renderEmployeeCard = (
    a: any,
    colorClass: string,
    actionButtonText: string,
    actionHandler: () => void,
    statusText: string,
    statusColorClass: string,
    timeText?: string
  ) => {
    const emp = a.employee || {};
    const name = emp.name ? emp.name.trim() : 'No Employee Linked';
    const code = emp.employeeCode || 'N/A';
    const designation = emp.designation?.name || 'Designation N/A';
    const department = emp.department?.name || 'Department N/A';
    const shift = emp.shift?.name || 'General Shift';

    // Tooltip data
    const joiningDate = emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A';
    const manager = emp.reportingManager?.name ? emp.reportingManager.name : 'N/A';
    const phone = emp.mobile || 'N/A';

    return (
      <div
        className={`group relative flex flex-col p-3 rounded-lg border cursor-pointer transition-colors hover:shadow-sm ${colorClass}`}
        onClick={() => onEmployeeClick && onEmployeeClick(emp)}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-sm font-bold shrink-0 border shadow-sm text-foreground">
            {name[0] || 'U'}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-base font-bold text-foreground truncate">{name}</span>
            <span className="text-xs font-semibold text-muted-foreground truncate">{code} &bull; {designation}</span>
            <span className="text-[10px] text-muted-foreground truncate mt-0.5">{department}</span>
            <span className="text-[10px] text-muted-foreground truncate">{shift}</span>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
              <div className="flex flex-col">
                <span className={`text-[10px] font-bold uppercase ${statusColorClass}`}>{statusText}</span>
                {timeText && <span className="text-xs font-medium text-foreground">{timeText}</span>}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] font-semibold px-2 bg-background/50 hover:bg-background"
                onClick={(e) => { e.stopPropagation(); actionHandler(); }}
              >
                {actionButtonText}
              </Button>
            </div>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4 sticky top-6">
      <Card className="flex flex-col h-full border border-border shadow-sm bg-surface overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col gap-3 shrink-0">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent" />
            HR Action Center
          </h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search Action Center..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-visible p-4 flex flex-col gap-6">

          {/* Missing Check-In */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
              <FileWarning className="w-3.5 h-3.5 text-red-500" />
              Missing Check-In
              <span className="ml-auto bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 py-0.5 px-2 rounded-full text-[10px]">
                {missingCheckIn.length}
              </span>
            </h4>
            {missingCheckIn.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No missing check-ins.</p>
            ) : (
              <div className="flex flex-col gap-3 relative">
                {missingCheckIn.slice(0, 3).map((a, i) =>
                  renderEmployeeCard(
                    a,
                    "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30",
                    "Complete Check-In",
                    () => onActionClick('complete-checkin', a.employee?.id),
                    "Missing Check-In",
                    "text-red-600 dark:text-red-500",
                    "09:00 AM (Expected)"
                  )
                )}
              </div>
            )}
          </div>

          {/* Missing Check-Out */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
              <FileWarning className="w-3.5 h-3.5 text-orange-500" />
              Missing Check-Out
              <span className="ml-auto bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 py-0.5 px-2 rounded-full text-[10px]">
                {missingCheckOut.length}
              </span>
            </h4>
            {missingCheckOut.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No missing check-outs.</p>
            ) : (
              <div className="flex flex-col gap-3 relative">
                {missingCheckOut.slice(0, 3).map((a, i) =>
                  renderEmployeeCard(
                    a,
                    "bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/30",
                    "Complete Check-Out",
                    () => onActionClick('complete-checkout', a.employee?.id),
                    "Missing Check-Out",
                    "text-orange-600 dark:text-orange-500",
                    a.checkIn ? `In at ${new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : undefined
                  )
                )}
              </div>
            )}
          </div>

          {/* Pending Approvals */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              Pending Approval
              <span className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 py-0.5 px-2 rounded-full text-[10px]">
                {pendingApprovals.length}
              </span>
            </h4>
            {pendingApprovals.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No pending approvals.</p>
            ) : (
              <div className="flex flex-col gap-3 relative">
                {pendingApprovals.slice(0, 3).map((a, i) =>
                  renderEmployeeCard(
                    a,
                    "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/30",
                    "Approve Correction",
                    () => onActionClick('approve-correction', a.employee?.id),
                    "Correction",
                    "text-blue-600 dark:text-blue-500",
                    "Review Required"
                  )
                )}
              </div>
            )}
          </div>

          {/* Late Arrivals */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-yellow-500" />
              Late Employees
              <span className="ml-auto bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400 py-0.5 px-2 rounded-full text-[10px]">
                {lateEmployees.length}
              </span>
            </h4>
            {lateEmployees.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No late employees.</p>
            ) : (
              <div className="flex flex-col gap-3 relative">
                {lateEmployees.slice(0, 3).map((a, i) =>
                  renderEmployeeCard(
                    a,
                    "bg-muted/10 border-border/50",
                    "Review Attendance",
                    () => onActionClick('review-late', a.employee?.id),
                    "Late Arrival",
                    "text-yellow-600 dark:text-yellow-500",
                    `Late by ${a.lateBy} min`
                  )
                )}
                {lateEmployees.length > 3 && (
                  <Button variant="ghost" size="sm" className="text-xs h-auto py-1 justify-center px-0 text-yellow-600 bg-yellow-50/50 hover:bg-yellow-100/50 dark:bg-yellow-900/10">
                    [View All]
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border my-2"></div>

          {/* HR Operations & Compliance Alerts */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col p-3 rounded-lg bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30 hover:bg-pink-100/50 transition-colors cursor-pointer">
              <Gift className="w-4 h-4 text-pink-500 mb-1" />
              <span className="text-xs font-semibold text-pink-900 dark:text-pink-200">Birthdays</span>
              <span className="text-[10px] text-pink-700 dark:text-pink-400">{upcomingBirthdays.length} upcoming</span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100/50 transition-colors cursor-pointer">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 mb-1" />
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">Confirmations</span>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400">0 pending</span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 hover:bg-teal-100/50 transition-colors cursor-pointer">
              <UserCheck className="w-4 h-4 text-teal-500 mb-1" />
              <span className="text-xs font-semibold text-teal-900 dark:text-teal-200">Probation</span>
              <span className="text-[10px] text-teal-700 dark:text-teal-400">{probationEnding.length} ending</span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100/50 transition-colors cursor-pointer">
              <Scroll className="w-4 h-4 text-rose-500 mb-1" />
              <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">Contracts</span>
              <span className="text-[10px] text-rose-700 dark:text-rose-400">{contractExpiring.length} expiring</span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100/50 transition-colors cursor-pointer">
              <FileText className="w-4 h-4 text-slate-500 mb-1" />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Documents</span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">{missingDocuments.length} missing</span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100/50 transition-colors cursor-pointer">
              <DollarSign className="w-4 h-4 text-emerald-500 mb-1" />
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Payroll</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400">{payrollAlerts[0].count} alerts</span>
            </div>
          </div>

        </div>
      </Card>
    </div>
  );
};
