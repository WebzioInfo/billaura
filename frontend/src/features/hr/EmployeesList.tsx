import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Pagination } from '@/shared/components/ui/Pagination';
import { usePagination } from '@/shared/hooks/usePagination';
import { EmptyState, LoadingState } from '@/shared/components/ui/LayoutComponents';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users, Search, Download, Upload, Mail, Phone, Briefcase, Building } from 'lucide-react';
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

  const filteredEmployees = employees.filter((emp: any) => {
    const matchesQuery = emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuery;
  });

  // TODO: Endpoint /hr/employees should support server-side pagination (?page=&limit=)
  const {
    page,
    limit,
    paginatedData,
    totalPages,
    totalItems,
    setPage,
    setLimit,
  } = usePagination({
    data: filteredEmployees,
    tableKey: 'employees_list',
    defaultLimit: 25,
  });

  return (
    <PageLayout>
      <PageHeader
        title="Employees"
        count={employees.length}
        primaryAction={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button 
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Employee
            </Button>
          </div>
        }
      />

      {/* Directory Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search employees..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

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
        <div className="flex-1 min-h-0 flex flex-col justify-between mt-3 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {paginatedData.map((emp: any) => (
              <Card 
                key={emp.id} 
                className="overflow-hidden hover:shadow-xs transition-all duration-200 cursor-pointer group border-border/70 flex flex-col justify-between"
                onClick={() => navigate(`/employees/${emp.id}`)}
              >
                <div className="p-4 flex flex-col items-center text-center relative">
                  <div className="absolute top-3 right-3">
                    <Badge variant={emp.status === 'INACTIVE' ? "default" : "success"} className="text-[10px] px-2 py-0.5">
                      {emp.status || (emp.isActive === false ? 'INACTIVE' : 'ACTIVE')}
                    </Badge>
                  </div>

                  <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-lg border border-border mb-3">
                    {emp.name?.[0]}{emp.name?.split(' ')?.[1]?.[0] || ''}
                  </div>

                  <h3 className="font-semibold text-sm text-foreground line-clamp-1">{emp.name}</h3>
                  <p className="text-xs text-muted-foreground tabular-nums mb-2">{emp.employeeCode}</p>
                  
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="line-clamp-1">{emp.designation?.name || 'Unassigned Role'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building className="w-3.5 h-3.5" />
                    <span className="line-clamp-1">{emp.department?.name || 'Unassigned Dept'}</span>
                  </div>
                </div>
                
                <div className="bg-muted/20 px-3 py-2 flex justify-between items-center border-t border-border">
                  <div className="flex gap-1">
                    <IconButton
                      icon={Mail}
                      aria-label="Email"
                      tooltip="Email"
                      size="dense"
                      onClick={(e) => { e.stopPropagation(); window.location.href=`mailto:${emp.email || ''}`; }}
                    />
                    <IconButton
                      icon={Phone}
                      aria-label="Call"
                      tooltip="Call"
                      size="dense"
                      onClick={(e) => { e.stopPropagation(); window.location.href=`tel:${emp.mobile || ''}`; }}
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs font-medium px-2">
                    View 360
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="border-t border-border pt-2 shrink-0">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={limit}
              onPageChange={setPage}
              onPageSizeChange={setLimit}
              itemLabel="employees"
            />
          </div>
        </div>
      )}
      
      <EmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={null}
      />
    </PageLayout>
  );
};
