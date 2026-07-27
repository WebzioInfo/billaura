import React from 'react';
import { Card } from '@/shared/components/ui/Card';

interface AttendanceCalendarProps {
  attendances: any[];
  year: number;
  month: number;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ attendances, year, month }) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const getDayStatus = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Find if there's an attendance record for this exact date
    // Note: in a real calendar we'd map by employee, but this is a high-level summary view or we assume single employee context
    const record = attendances.find(a => new Date(a.date).toISOString().split('T')[0] === dateStr);
    
    if (!record) return 'gray';
    switch (record.type) {
      case 'PRESENT': return 'green';
      case 'ABSENT': return 'red';
      case 'LATE': return 'yellow';
      case 'LEAVE': return 'blue';
      case 'HOLIDAY': return 'purple';
      default: return 'gray';
    }
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'red': return 'bg-red-500/20 text-red-700 border-red-500/30';
      case 'yellow': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'blue': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'purple': return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
      default: return 'bg-muted/10 text-muted-foreground border-border/50';
    }
  };

  return (
    <Card className="p-6">
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-muted-foreground uppercase">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {blanks.map(b => (
          <div key={`blank-${b}`} className="aspect-square rounded-lg border border-transparent"></div>
        ))}
        {days.map(d => {
          const status = getDayStatus(d);
          return (
            <div 
              key={`day-${d}`} 
              className={`aspect-square rounded-lg border flex items-center justify-center font-bold cursor-pointer hover:opacity-80 transition-opacity ${getColorClass(status)}`}
              title={`Status: ${status}`}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/30"></div> Present</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/30"></div> Absent</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-yellow-500/20 border border-yellow-500/30"></div> Late</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-500/30"></div> Leave</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-purple-500/20 border border-purple-500/30"></div> Holiday</div>
      </div>
    </Card>
  );
};
