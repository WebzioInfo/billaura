import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/shared/components/ui/LayoutComponents';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users, Search, Filter, Download, Upload, Mail, Phone, Briefcase, Building } from 'lucide-react';
import { EmployeeModal } from './components/EmployeeModal';
import { Badge } from '@/shared/components/ui/Badge';

export const EmployeesList = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiClient.get('/hr/employees');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const filteredEmployees = employees.filter((emp: any) => 
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.designation?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Employee Directory"
        description="Manage your workforce, access employee 360 workspaces, and handle HR lifecycle"
        primaryAction={
          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" /> Import
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 font-bold px-5"
              variant="primary"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </Button>
          </div>
        }
      />

      {/* Directory Toolbar */}
      <Card className="p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center bg-card/50 backdrop-blur-sm border-border">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by name, code, or designation..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 min-w-[130px]">
            <option value="">All Departments</option>
          </select>
          <select className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 min-w-[130px]">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
          <Button variant="outline" className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4" /> More Filters
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState variant="card" />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-muted-foreground" />}
          title="No employees found"
          description="Add your first employee to track personnel and payroll profiles."
          actionLabel="Add Employee"
          onActionClick={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map((emp: any) => (
            <Card 
              key={emp.id} 
              className="overflow-hidden hover:shadow-premium transition-all duration-300 cursor-pointer group border-border/50 hover:border-accent/30"
              onClick={() => navigate(`/app/employees/${emp.id}`)}
            >
              <div className="p-5 flex flex-col items-center text-center relative">
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <Badge variant={emp.isActive !== false ? "success" : "default"} className="text-[10px] px-2 py-0.5">
                    {emp.isActive !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-accent font-bold text-2xl border-2 border-background shadow-sm mb-4 group-hover:scale-105 transition-transform duration-300">
                  {emp.name?.[0]}{emp.name?.split(' ')?.[1]?.[0] || ''}
                </div>

                {/* Info */}
                <h3 className="font-bold text-lg text-foreground line-clamp-1">{emp.name}</h3>
                <p className="text-xs text-muted-foreground font-mono mb-2">{emp.employeeCode}</p>
                
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="line-clamp-1">{emp.designation?.name || 'Unassigned Role'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                  <Building className="w-3.5 h-3.5" />
                  <span className="line-clamp-1">{emp.department?.name || 'Unassigned Dept'}</span>
                </div>

                {/* Quick Stats Grid */}
                <div className="w-full grid grid-cols-2 gap-2 border-t border-border pt-4 mt-auto">
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Attendance</p>
                    <p className="text-sm font-semibold text-green-600">98%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Payroll</p>
                    <p className="text-sm font-semibold">Processed</p>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions Hover */}
              <div className="bg-muted/30 px-4 py-3 flex justify-between items-center border-t border-border opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex gap-2">
                  <button className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors" title="Email" onClick={(e) => { e.stopPropagation(); window.location.href=`mailto:${emp.email || ''}`; }}>
                    <Mail className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors" title="Call" onClick={(e) => { e.stopPropagation(); window.location.href=`tel:${emp.mobile || ''}`; }}>
                    <Phone className="w-4 h-4" />
                  </button>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold px-2 hover:bg-accent/10 hover:text-accent">
                  View 360
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <EmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={null}
      />
    </PageContainer>
  );
};
