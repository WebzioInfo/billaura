import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { Badge } from '@/shared/components/ui/Badge';

interface AttendanceGridProps {
  attendances: any[];
  selectedIds: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onRowClick: (record: any) => void;
}

export const AttendanceGrid: React.FC<AttendanceGridProps> = ({
  attendances,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  onRowClick
}) => {
  const getStatusBadgeVariant = (status: string): "success" | "warning" | "info" | "danger" | "default" => {
    switch(status) {
      case 'PRESENT': return 'success';
      case 'ABSENT': return 'danger';
      case 'HALF_DAY': return 'warning';
      case 'LEAVE': return 'info';
      case 'REMOTE':
      case 'WORK_FROM_HOME': return 'info';
      case 'HOLIDAY': return 'default';
      default: return 'default';
    }
  };

  const allSelected = attendances.length > 0 && selectedIds.length === attendances.length;

  return (
    <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table className="whitespace-nowrap">
          <TableHeader>
            <TableRow className="bg-muted/10 border-b border-border/80">
              <TableHead className="w-12 text-center">
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded border-border"
                  checked={allSelected} 
                  onChange={(e) => onSelectAll(e.target.checked)} 
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead className="text-right">Working Hrs</TableHead>
              <TableHead className="text-right">Late By (m)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendances.map((record: any) => {
              const isSelected = selectedIds.includes(record.employeeId);
              return (
                <TableRow 
                  key={record.id || record.employeeId} 
                  className={`hover:bg-muted/50 transition-colors cursor-pointer ${isSelected ? 'bg-accent/5' : ''}`}
                  onClick={(e) => {
                    // Prevent triggering if clicked on checkbox
                    if ((e.target as HTMLElement).closest('button[role="checkbox"]')) return;
                    onRowClick(record);
                  }}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded border-border"
                  checked={isSelected} 
                  onChange={() => onSelectToggle(record.employeeId)} 
                />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
                        {record.employee?.user?.firstName?.[0]}{record.employee?.user?.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{record.employee?.user?.firstName} {record.employee?.user?.lastName}</div>
                        <div className="text-[10px] text-muted-foreground">{record.employee?.employeeCode}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{record.employee?.department?.name || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{record.employee?.shift?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(record.type)}>
                      {record.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {record.workingHours ? record.workingHours.toFixed(1) + 'h' : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-500 font-medium">
                    {record.lateBy ? record.lateBy + 'm' : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
