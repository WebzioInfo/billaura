import React, { useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';

interface AttendanceGridProps {
  attendances: any[];
  selectedIds: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onRowChange: (employeeId: string, field: string, value: any) => void;
}

export const AttendanceGrid: React.FC<AttendanceGridProps> = ({
  attendances,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  onRowChange
}) => {
  const allSelected = attendances.length > 0 && selectedIds.length === attendances.length;

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    // Basic implementation for Arrow Up/Down to navigate rows
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = e.key === 'ArrowDown' ? index + 1 : index - 1;
      const nextInput = document.getElementById(`input-${field}-${newIndex}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  return (
    <div className="border border-border/80 bg-surface rounded-2xl shadow-sm h-[600px] overflow-auto">
      <Table className="whitespace-nowrap relative">
        <TableHeader className="sticky top-0 bg-surface z-10 shadow-sm">
          <TableRow className="bg-muted/10 border-b border-border/80">
            <TableHead className="w-12 text-center sticky left-0 bg-surface z-20">
              <input 
                type="checkbox"
                className="w-4 h-4 rounded border-border cursor-pointer"
                checked={allSelected} 
                onChange={(e) => onSelectAll(e.target.checked)} 
              />
            </TableHead>
            <TableHead className="sticky left-12 bg-surface z-20 w-64 border-r border-border/30">Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead className="w-48">Status</TableHead>
            <TableHead>Check In</TableHead>
            <TableHead>Check Out</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendances.map((record: any, index: number) => {
            const isSelected = selectedIds.includes(record.employeeId || record.employee?.id);
            const employee = record.employee || record;
            
            return (
              <TableRow 
                key={employee.id} 
                className={`hover:bg-muted/50 transition-colors ${isSelected ? 'bg-accent/5' : ''}`}
              >
                <TableCell className="text-center sticky left-0 bg-surface z-10 group-hover:bg-muted/50">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-border cursor-pointer"
                    checked={isSelected} 
                    onChange={() => onSelectToggle(employee.id)} 
                  />
                </TableCell>
                <TableCell className="sticky left-12 bg-surface z-10 border-r border-border/30 group-hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs uppercase">
                      {employee.name?.[0]}{employee.name?.split(' ')?.[1]?.[0] || ''}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{employee.name}</div>
                      <div className="text-[10px] text-muted-foreground">{employee.employeeCode}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{employee.department?.name || '-'}</TableCell>
                <TableCell className="text-muted-foreground">{employee.shift?.name || '-'}</TableCell>
                <TableCell>
                  <select
                    id={`input-status-${index}`}
                    value={record.type || 'NOT_MARKED'}
                    onChange={(e) => onRowChange(employee.id, 'type', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, 'status')}
                    className="w-full bg-background border border-border rounded p-1 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  >
                    <option value="NOT_MARKED">Not Marked</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="PAID_LEAVE">Paid Leave</option>
                    <option value="UNPAID_LEAVE">Unpaid Leave</option>
                    <option value="HOLIDAY">Holiday</option>
                    <option value="WEEK_OFF">Week Off</option>
                    <option value="REMOTE">Remote</option>
                    <option value="ON_DUTY">On Duty</option>
                    <option value="TRAINING">Training</option>
                  </select>
                </TableCell>
                <TableCell>
                  <input
                    id={`input-checkIn-${index}`}
                    type="time"
                    value={record.checkIn ? new Date(record.checkIn).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}) : ''}
                    onChange={(e) => onRowChange(employee.id, 'checkIn', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, 'checkIn')}
                    className="bg-background border border-border rounded p-1 text-sm w-32 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                </TableCell>
                <TableCell>
                  <input
                    id={`input-checkOut-${index}`}
                    type="time"
                    value={record.checkOut ? new Date(record.checkOut).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}) : ''}
                    onChange={(e) => onRowChange(employee.id, 'checkOut', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, 'checkOut')}
                    className="bg-background border border-border rounded p-1 text-sm w-32 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                </TableCell>
                <TableCell>
                  <input
                    id={`input-remarks-${index}`}
                    type="text"
                    value={record.notes || record.remarks || ''}
                    onChange={(e) => onRowChange(employee.id, 'notes', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, 'remarks')}
                    placeholder="Add remark..."
                    className="bg-background border border-border rounded p-1 text-sm w-48 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
