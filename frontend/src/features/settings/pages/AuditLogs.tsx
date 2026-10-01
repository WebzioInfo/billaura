import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, History, Calendar, User, Activity, FileText } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { Button } from '@/shared/components/ui/Button';
import apiClient from '@/core/api';
import { dialog } from '@/core/services/DialogService';

export const AuditLogsSettings = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter, entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entityType', entityFilter);
      
      const res = await apiClient.get(`/audit-logs?${params.toString()}`);
      return res.data || { items: [], total: 0 };
    }
  });



  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground font-sans flex items-center gap-2 tracking-tight">
            <History className="w-5 h-5 text-accent" />
            Audit Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Immutable record of all system modifications</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
          <select 
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">All Entities</option>
            <option value="INVOICES">Invoices</option>
            <option value="RECEIPTS">Receipts</option>
            <option value="USERS">Users</option>
            <option value="SETTINGS">Settings</option>
          </select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>User & IP</TableHead>
            <TableHead className="text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Loading audit records...</TableCell></TableRow>
          ) : data?.items?.length > 0 ? (
            data.items.map((row: any) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{new Date(row.createdAt).toLocaleDateString()}</span>
                    <span className="text-xs text-muted-foreground font-mono">{new Date(row.createdAt).toLocaleTimeString()}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider ${
                    row.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                    row.action === 'DELETE' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' :
                    'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  }`}>
                    {row.action}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-foreground text-sm">{row.tableName}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{row.userId || 'System'}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">IP: {row.ipAddress}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <button 
                    onClick={() => dialog.alert('Audit Log Payload Details', JSON.stringify({before: row.oldValues, after: row.newValues}, null, 2))}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-foreground cursor-pointer transition-colors"
                  >
                    View
                  </button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No audit logs found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      
      {/* Pagination Footer */}
      <div className="px-6 py-4 flex justify-between items-center text-sm text-muted-foreground">
        <span>Total Records: {data?.total || 0}</span>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <Button 
            variant="outline"
            size="sm"
            disabled={!data || data.items.length < 50}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
