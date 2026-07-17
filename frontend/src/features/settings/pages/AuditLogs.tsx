import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, History, Calendar, User, Activity, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import apiClient from '@/services/api';

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

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">User & IP</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-sm">Loading...</td></tr>
              ) : data?.items?.length > 0 ? (
                data.items.map((row: any) => (
                  <tr key={row.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm">{new Date(row.createdAt).toLocaleDateString()}</span>
                        <span className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                        row.action === 'CREATE' ? 'bg-green-100 text-green-800 border-green-200' :
                        row.action === 'DELETE' ? 'bg-red-100 text-red-800 border-red-200' :
                        'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{row.tableName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{row.userId || 'System'}</span>
                        <span className="text-[10px] text-muted-foreground">IP: {row.ipAddress}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => alert(JSON.stringify({before: row.oldValues, after: row.newValues}, null, 2))}
                        className="text-xs font-semibold text-accent hover:underline cursor-pointer bg-accent/10 px-2 py-1 rounded"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-sm text-muted-foreground">No audit logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Basic Pagination */}
        <div className="p-4 border-t border-border flex justify-between items-center bg-muted/20">
          <span className="text-sm text-muted-foreground">
            Total Records: {data?.total || 0}
          </span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-background border border-border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={!data || data.items.length < 50}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-background border border-border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
