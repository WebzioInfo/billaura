import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Search, Users, Clock, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Select } from '@/shared/components/ui/Select';
import apiClient from '@/core/api';

export const AttendanceReportPage = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [department, setDepartment] = useState('all');

  const { data: report, isLoading } = useQuery({
    queryKey: ['attendance-report', dateRange, department],
    queryFn: async () => {
      if (!dateRange.start || !dateRange.end) return null;
      const res = await apiClient.get(`/hr/reports/attendance`, {
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end,
          departmentId: department !== 'all' ? department : undefined
        }
      });
      return res.data?.data || res.data;
    },
    enabled: !!dateRange.start && !!dateRange.end,
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Enterprise Attendance Report
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Generate comprehensive, flexible date-range attendance analytics.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.print()}
            className="border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <FileText className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
            Export PDF
          </Button>
          <Button 
            onClick={() => {
              if (!report || !report.length) return;
              const csvContent = "data:text/csv;charset=utf-8," 
                + ["Employee,Code,Working Days,Present,Absent,Late,Overtime,Attendance %"].join(",") + "\n"
                + report.map((r: any) => `"${r.employee.name}","${r.employee.employeeCode}",${r.summary.totalWorkingDays},${r.summary.present},${r.summary.absent},${r.summary.lateCount},${r.summary.overtimeHours},${r.summary.attendancePercentage.toFixed(1)}%`).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `Attendance_Report_${dateRange.start}_to_${dateRange.end}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-white/20 dark:border-slate-800/50 shadow-xl overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
              <Input 
                type="date" 
                value={dateRange.start} 
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-white/50 dark:bg-slate-800/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
              <Input 
                type="date" 
                value={dateRange.end} 
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-white/50 dark:bg-slate-800/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
              <Select 
                value={department} 
                onChange={(e) => setDepartment(e.target.value)}
                options={[
                  { label: "All Departments", value: "all" },
                  { label: "Engineering", value: "engineering" },
                  { label: "Sales", value: "sales" },
                  { label: "Human Resources", value: "hr" }
                ]}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 transition-colors">
                <Search className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800/50">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full mb-4">
                    <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{report.length}</p>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">Total Employees</p>
                </CardContent>
             </Card>
             <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800/50">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full mb-4">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {report.reduce((sum: number, r: any) => sum + r.summary.present, 0)}
                  </p>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">Total Present Days</p>
                </CardContent>
             </Card>
             <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800/50">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {report.reduce((sum: number, r: any) => sum + r.summary.absent, 0)}
                  </p>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-1">Total Absent Days</p>
                </CardContent>
             </Card>
             <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800/50">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full mb-4">
                    <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {report.reduce((sum: number, r: any) => sum + r.summary.overtimeHours, 0)}h
                  </p>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">Total Overtime</p>
                </CardContent>
             </Card>
          </div>

          <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-600 uppercase bg-slate-50 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Employee</th>
                    <th className="px-6 py-4 font-semibold">Code</th>
                    <th className="px-6 py-4 font-semibold">Working Days</th>
                    <th className="px-6 py-4 font-semibold text-green-600">Present</th>
                    <th className="px-6 py-4 font-semibold text-red-600">Absent</th>
                    <th className="px-6 py-4 font-semibold text-amber-600">Late</th>
                    <th className="px-6 py-4 font-semibold text-purple-600">Overtime</th>
                    <th className="px-6 py-4 font-semibold text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((row: any, i: number) => (
                    <tr key={i} className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {row.employee.name}
                      </td>
                      <td className="px-6 py-4">{row.employee.employeeCode}</td>
                      <td className="px-6 py-4">{row.summary.totalWorkingDays}</td>
                      <td className="px-6 py-4 font-semibold text-green-600">{row.summary.present}</td>
                      <td className="px-6 py-4 font-semibold text-red-600">{row.summary.absent}</td>
                      <td className="px-6 py-4 font-semibold text-amber-600">{row.summary.lateCount}</td>
                      <td className="px-6 py-4 font-semibold text-purple-600">{row.summary.overtimeHours}h</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.summary.attendancePercentage >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : row.summary.attendancePercentage >= 75 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {row.summary.attendancePercentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
          <Calendar className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Select a date range to generate the report</p>
          <p className="text-sm opacity-70">The report will load automatically once dates are selected.</p>
        </div>
      )}
    </div>
  );
};
