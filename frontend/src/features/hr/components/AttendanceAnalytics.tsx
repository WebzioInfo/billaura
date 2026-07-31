import React from 'react';
import { Card } from '@/shared/components/ui/Card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface AttendanceAnalyticsProps {
  attendances: any[];
}

export const AttendanceAnalytics: React.FC<AttendanceAnalyticsProps> = ({ attendances }) => {
  // Aggregate basic stats
  const total = attendances.length;
  if (total === 0) return null;

  const present = attendances.filter(a => a.type === 'PRESENT').length;
  const absent = attendances.filter(a => a.type === 'ABSENT').length;
  const leave = attendances.filter(a => ['LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE'].includes(a.type)).length;
  const late = attendances.filter(a => (a.lateBy || 0) > 0).length;

  const attendanceRate = Math.round((present / total) * 100);
  const lateRate = Math.round((late / present) * 100) || 0;

  // Pie Chart Data
  const statusData = [
    { name: 'Present', value: present, color: '#10b981' },
    { name: 'Absent', value: absent, color: '#ef4444' },
    { name: 'Leave', value: leave, color: '#8b5cf6' }
  ];

  // Bar Chart Data (mocked department breakdown since we don't have all historic data in this view)
  // We aggregate based on current sheet
  const deptMap: Record<string, { name: string, present: number, absent: number }> = {};
  attendances.forEach(a => {
    const deptName = a.employee?.department?.name || 'Unassigned';
    if (!deptMap[deptName]) {
      deptMap[deptName] = { name: deptName, present: 0, absent: 0 };
    }
    if (a.type === 'PRESENT') deptMap[deptName].present += 1;
    if (a.type === 'ABSENT') deptMap[deptName].absent += 1;
  });
  const deptData = Object.values(deptMap);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-accent">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Attendance Rate</span>
          <p className="text-2xl font-bold">{attendanceRate}%</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-yellow-500">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Late Rate</span>
          <p className="text-2xl font-bold">{lateRate}%</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Headcount</span>
          <p className="text-2xl font-bold">{total}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <span className="text-xs font-semibold text-muted-foreground uppercase">On Leave</span>
          <p className="text-2xl font-bold">{leave}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-bold mb-4">Today's Workforce Status</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold mb-4">Department Attendance</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: 'transparent'}} />
                <Legend />
                <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
