import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  User, Briefcase, Calendar, DollarSign, Umbrella, TrendingUp, Clock, FileText, 
  Activity, Zap, Shield, Phone, Mail, MapPin, Building, History, MonitorSmartphone, Key
} from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import apiClient from '@/core/api';
import { PageContainer, Breadcrumb } from '@/shared/components/ui/LayoutComponents';
import { TableLoader } from '@/shared/components/ui/LoadingSystem';
import { formatCurrency } from '@/shared/utils/formatters';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';
import { useAuth } from '@/shared/hooks/useAuth';
import { EmployeeAttendanceWorkspace } from '../components/EmployeeAttendanceWorkspace';
import { EditEmployeeWorkspace } from '../components/EditEmployeeWorkspace';
import { AttendanceFormModal } from '../components/AttendanceFormModal';
import { AssetAssignmentModal } from '../components/AssetAssignmentModal';
import { AttendanceReportWizard } from '../components/AttendanceReportWizard';
import { GeneratePayslipModal } from '../components/GeneratePayslipModal';

export const EmployeeProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const { company } = useAuth();

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const res = await apiClient.get(`/hr/employees/${id}`);
      return res.data;
    }
  });

  const today = new Date();
  const { data: analytics } = useQuery({
    queryKey: ['employee-attendance-analytics', id, today.getFullYear(), today.getMonth() + 1],
    queryFn: async () => {
      const res = await apiClient.get(`/hr/employees/${id}/attendance-analytics`, {
        params: { year: today.getFullYear(), month: today.getMonth() + 1 }
      });
      return res.data;
    },
    enabled: !!id,
  });

  useDynamicTitle(employee ? `${employee.name} | Workspace` : 'Employee Workspace');

  if (isLoading) return <div className="p-8"><TableLoader cols={3} rows={5} /></div>;
  if (error || !employee) return <div className="p-8 text-center text-red-500">Employee not found.</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building },
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'leave', label: 'Leave', icon: Umbrella },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'salary-structure', label: 'Salary Structure', icon: Zap },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'assets', label: 'Assets', icon: MonitorSmartphone },
    { id: 'bank', label: 'Bank Details', icon: Shield },
    { id: 'timeline', label: 'Activity Timeline', icon: History },
  ];

  return (
    <PageContainer maxWidth="7xl">
      <div className="space-y-6 pb-12">
        {/* Navigation / Actions */}
        <div className="flex items-center justify-between">
          <Breadcrumb items={[
            { label: 'Employees Directory', href: '/app/employees' },
            { label: employee.name || 'Workspace' }
          ]} />
          {/* Smart Action Bar */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="font-semibold text-xs" onClick={() => setIsEditModalOpen(true)}>Edit Employee</Button>
            <Button variant="outline" size="sm" className="font-semibold text-xs" onClick={() => setIsAttendanceModalOpen(true)}>Attendance</Button>
            <Button variant="outline" size="sm" className="font-semibold text-xs" onClick={() => setActiveTab('payroll')}>Payroll</Button>
            <Button variant="outline" size="sm" className="font-semibold text-xs text-accent" onClick={() => setIsReportModalOpen(true)}>Attendance Report</Button>
            <Button variant="outline" size="sm" className="font-semibold text-xs" onClick={() => setIsPayslipModalOpen(true)}>Payslip</Button>
            <Button variant="outline" size="sm" className="font-semibold text-xs" onClick={() => setActiveTab('leave')}>Leave</Button>
            <Button variant="primary" size="sm" className="font-semibold text-xs" onClick={() => setIsAssetModalOpen(true)}>Assign Asset</Button>
            <Button variant="ghost" size="sm" className="font-semibold text-xs" onClick={() => setActiveTab('documents')}>Documents</Button>
          </div>
        </div>

        {/* 360 Profile Header Card */}
        <Card className="p-6 bg-gradient-to-r from-muted/30 to-background border-border flex items-center gap-6 shadow-sm">
          <div className="w-24 h-24 rounded-2xl bg-accent/10 flex items-center justify-center text-accent font-bold text-4xl border-2 border-accent/20 shrink-0">
            {employee.name?.[0]}{employee.name?.split(' ')?.[1]?.[0] || ''}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-foreground">
                {employee.name || 'Unknown Employee'}
              </h1>
              <Badge variant={employee.isActive ? "success" : "default"}>
                {employee.isActive ? 'Active Employee' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
              <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground font-medium">{employee.employeeCode}</span>
              <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {employee.designation?.name || 'Unassigned Role'}</span>
              <span className="flex items-center gap-1"><Building className="w-4 h-4" /> {employee.department?.name || 'Unassigned Dept'}</span>
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {employee.branch?.name || 'Main Branch'}</span>
            </div>
          </div>
          <div className="hidden lg:flex gap-6">
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-muted-foreground block">Manager</span>
              <span className="font-medium text-sm">{employee.manager?.user?.firstName || 'None'}</span>
            </div>
            <div className="w-px bg-border h-10"></div>
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-muted-foreground block">Joining Date</span>
              <span className="font-medium text-sm">{employee.joiningDate || 'N/A'}</span>
            </div>
            <div className="w-px bg-border h-10"></div>
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-muted-foreground block">Attendance</span>
              <span className="font-medium text-sm text-green-600">
                {analytics?.summary?.attendancePercentage !== undefined ? `${analytics.summary.attendancePercentage}%` : 'N/A'}
              </span>
            </div>
          </div>
        </Card>

        {/* Modular Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-3 lg:col-start-1">
            <Card className="p-3 flex flex-col gap-1 sticky top-6 shadow-sm border-border">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all text-left ${
                      activeTab === tab.id 
                        ? 'bg-accent text-accent-foreground shadow-md' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </Card>
          </div>

          {/* Dynamic Content Area */}
          <div className="lg:col-span-9 lg:col-start-4">
            <Card className="p-6 min-h-[650px] shadow-sm border-border">
              
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
                    <Building className="w-5 h-5 text-accent" /> Employee Snapshot
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Employee Code</span><p className="font-mono font-medium">{employee.employeeCode}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Employment Status</span><p className="font-medium">Full Time / Confirmed</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Branch</span><p className="font-medium">{employee.branch?.name || 'Main Branch'}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Company</span><p className="font-medium">{company?.companyName || 'No company assigned'}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Shift</span><p className="font-medium">{employee.shift?.name || 'Default Shift'}</p></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-muted/20 p-4 rounded-xl border border-border">
                      <h4 className="font-bold text-sm mb-3">Recent Activities</h4>
                      <div className="text-sm text-muted-foreground">No recent activities found.</div>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-xl border border-border">
                      <h4 className="font-bold text-sm mb-3">Upcoming Events</h4>
                      <div className="text-sm text-muted-foreground">No upcoming events or birthdays.</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'personal' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
                    <User className="w-5 h-5 text-accent" /> Personal Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Gender</span><p className="font-medium">{employee.gender || 'Not specified'}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Date of Birth</span><p className="font-medium">{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : 'Not specified'}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Nationality</span><p className="font-medium">Indian</p></div>
                    
                    <div className="col-span-2"><span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1"><Mail className="w-3 h-3"/> Email</span><p className="font-medium">{employee.email || 'Not specified'}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1"><Phone className="w-3 h-3"/> Phone</span><p className="font-medium">{employee.mobile || 'Not specified'}</p></div>
                    <div className="col-span-3"><span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1"><MapPin className="w-3 h-3"/> Address</span><p className="font-medium">{employee.address || 'Not specified'}</p></div>
                    <div className="col-span-3"><span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1"><Shield className="w-3 h-3"/> Emergency Contact</span><p className="font-medium">Not specified</p></div>
                  </div>
                </div>
              )}

              {activeTab === 'employment' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
                    <Briefcase className="w-5 h-5 text-accent" /> Employment Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Department</span><p className="font-medium">{employee.department?.name || 'Unassigned'}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Designation</span><p className="font-medium">{employee.designation?.name || 'Unassigned'}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Joining Date</span><p className="font-medium">{employee.joiningDate || 'N/A'}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Reporting Manager</span><p className="font-medium">{employee.manager?.user?.firstName || 'None'}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Probation Period</span><p className="font-medium">3 Months</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Confirmation Date</span><p className="font-medium">N/A</p></div>
                  </div>
                  <div className="mt-8">
                    <h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">Transfer / Promotion History</h4>
                    <div className="text-sm text-muted-foreground p-8 bg-muted/20 border border-border rounded-xl text-center font-medium">No transfer or promotion history available.</div>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="animate-in fade-in duration-300">
                   <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3 mb-6">
                    <Calendar className="w-5 h-5 text-accent" /> Attendance Heatmap & Calendar
                  </h3>
                  <EmployeeAttendanceWorkspace employeeId={employee.id} />
                </div>
              )}

              {activeTab === 'leave' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
                    <Umbrella className="w-5 h-5 text-accent" /> Leave Balances & History
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-5 bg-gradient-to-br from-background to-muted/30 border-border"><span className="text-xs font-bold uppercase text-muted-foreground">Annual Leave</span><p className="text-3xl font-bold mt-2">12 <span className="text-sm font-normal text-muted-foreground">/ 18</span></p></Card>
                    <Card className="p-5 bg-gradient-to-br from-background to-muted/30 border-border"><span className="text-xs font-bold uppercase text-muted-foreground">Sick Leave</span><p className="text-3xl font-bold mt-2">5 <span className="text-sm font-normal text-muted-foreground">/ 12</span></p></Card>
                    <Card className="p-5 bg-gradient-to-br from-background to-muted/30 border-border"><span className="text-xs font-bold uppercase text-muted-foreground">Casual Leave</span><p className="text-3xl font-bold mt-2">3 <span className="text-sm font-normal text-muted-foreground">/ 8</span></p></Card>
                    <Card className="p-5 bg-gradient-to-br from-background to-muted/30 border-border"><span className="text-xs font-bold uppercase text-muted-foreground">Comp Off</span><p className="text-3xl font-bold mt-2">0</p></Card>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">Leave Requests</h4>
                    <div className="text-sm text-muted-foreground p-8 bg-muted/20 border border-border rounded-xl text-center font-medium">No leave requests found for this employee.</div>
                  </div>
                </div>
              )}

              {activeTab === 'payroll' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
                    <DollarSign className="w-5 h-5 text-accent" /> Payroll History
                  </h3>
                  <div className="text-sm text-muted-foreground p-8 bg-muted/20 border border-border rounded-xl text-center font-medium">Payroll history will be populated here after first run.</div>
                </div>
              )}

              {activeTab === 'salary-structure' && (() => {
                const activeRevision = employee.salaryRevisions?.find((r: any) => r.status === 'ACTIVE');
                const basic = activeRevision ? Number(activeRevision.basicSalary) : (Number(employee.basicSalary) || 0);
                const earnings = activeRevision?.components?.filter((c: any) => c.component.type === 'EARNING') || [];
                const deductions = activeRevision?.components?.filter((c: any) => c.component.type === 'DEDUCTION') || [];
                const totalEarnings = earnings.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
                const totalDeductions = deductions.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
                const gross = basic + totalEarnings;
                const net = gross - totalDeductions;

                return (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-accent" /> Current Salary Structure
                      </h3>
                      <Button variant="outline" size="sm">Revise Salary</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <Card className="p-4 bg-muted/10 border-border"><span className="text-xs text-muted-foreground uppercase font-bold">Basic Salary</span><p className="font-mono text-2xl font-bold mt-1">{formatCurrency(basic)}</p></Card>
                      <Card className="p-4 bg-muted/10 border-border"><span className="text-xs text-muted-foreground uppercase font-bold">Gross Salary</span><p className="font-mono text-2xl font-bold mt-1">{formatCurrency(gross)}</p></Card>
                      <Card className="p-4 bg-green-500/10 border-green-500/20"><span className="text-xs text-green-700 uppercase font-bold">Net Salary (Estimated)</span><p className="font-mono text-2xl font-bold mt-1 text-green-700">{formatCurrency(net)}</p></Card>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">Allowances / Earnings</h4>
                        {earnings.length > 0 ? (
                          <div className="space-y-2">
                            {earnings.map((c: any) => (
                              <div key={c.id} className="flex justify-between p-3 border border-border rounded-lg bg-background">
                                <span className="text-sm font-medium">{c.component.name}</span>
                                <span className="font-mono font-bold">{formatCurrency(c.amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-6 bg-muted/20 rounded-xl text-center border border-border border-dashed font-medium">No structured allowances assigned.</div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">Deductions</h4>
                        {deductions.length > 0 ? (
                          <div className="space-y-2">
                            {deductions.map((c: any) => (
                              <div key={c.id} className="flex justify-between p-3 border border-border rounded-lg bg-background">
                                <span className="text-sm font-medium">{c.component.name}</span>
                                <span className="font-mono font-bold text-red-600">-{formatCurrency(c.amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-6 bg-muted/20 rounded-xl text-center border border-border border-dashed font-medium">No structured deductions assigned.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeTab === 'performance' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
                    <TrendingUp className="w-5 h-5 text-accent" /> Performance & Goals
                  </h3>
                  <div className="text-sm text-muted-foreground p-8 bg-muted/20 border border-border rounded-xl text-center font-medium">Performance reviews and KPI tracking will appear here.</div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
                    <FileText className="w-5 h-5 text-accent" /> Identity & Documents
                  </h3>
                  <div className="text-sm text-muted-foreground p-8 bg-muted/20 border border-border rounded-xl text-center font-medium">Upload Aadhaar, PAN, Offer Letters, and other certificates here.</div>
                </div>
              )}

              {activeTab === 'assets' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
                    <MonitorSmartphone className="w-5 h-5 text-accent" /> Assigned Assets
                  </h3>
                  <div className="text-sm text-muted-foreground p-8 bg-muted/20 border border-border rounded-xl text-center font-medium">Laptops, ID cards, SIMs, and other assigned equipment.</div>
                </div>
              )}

              {activeTab === 'bank' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
                    <Shield className="w-5 h-5 text-accent" /> Bank Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Bank Name</span><p className="font-medium">Not specified</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">Account Number</span><p className="font-medium">Not specified</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">IFSC Code</span><p className="font-medium">Not specified</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase font-bold">UPI ID</span><p className="font-medium">Not specified</p></div>
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
                    <History className="w-5 h-5 text-accent" /> Activity Timeline
                  </h3>
                  <div className="text-sm text-muted-foreground p-8 bg-muted/20 border border-border rounded-xl text-center font-medium">Chronological history of attendance, payroll, promotions, and changes.</div>
                </div>
              )}

            </Card>
          </div>
        </div>
      </div>

      <EditEmployeeWorkspace 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        employeeId={employee.id} 
        initialData={employee} 
      />
      
      <AttendanceFormModal 
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        employee={employee}
        selectedDate={new Date()}
      />

      <AssetAssignmentModal 
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        employee={employee}
      />

      <AttendanceReportWizard 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        employee={employee}
      />

      <GeneratePayslipModal 
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        employee={employee}
      />
    </PageContainer>
  );
};
