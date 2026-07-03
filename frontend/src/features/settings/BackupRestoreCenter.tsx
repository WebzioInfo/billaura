import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Download, RefreshCw, Trash2, Database, Archive, Shield, UploadCloud } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../services/api/apiClient';
import { format } from 'date-fns';
import { DataTable } from '../../components/ui/data-table/DataTable';

export const BackupRestoreCenter = () => {
  const queryClient = useQueryClient();
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const { data: backups = [] } = useQuery({
    queryKey: ['backups'],
    queryFn: () => api.get('/backups/history').then(res => res.data),
    refetchInterval: 5000 // Poll every 5s for progress updates
  });

  const requestBackup = useMutation({
    mutationFn: (type: string) => api.post('/backups/request', { type, isPlatform: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      setIsBackupModalOpen(false);
    }
  });

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    { header: 'Backup Name', accessorKey: 'name' },
    { header: 'Type', accessorKey: 'type' },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: ({ row }: any) => {
        const s = row.original.status;
        if (s === 'RUNNING') return (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-blue-500 font-medium">{row.original.progress}%</span>
          </div>
        );
        if (s === 'COMPLETED') return <span className="text-green-600 font-medium">Completed</span>;
        if (s === 'FAILED') return <span className="text-red-600 font-medium">Failed</span>;
        return <span>{s}</span>;
      }
    },
    { 
      header: 'Date', 
      accessorKey: 'createdAt',
      cell: ({ row }: any) => format(new Date(row.original.createdAt), 'dd MMM yyyy, HH:mm')
    },
    { 
      header: 'Size', 
      accessorKey: 'sizeBytes',
      cell: ({ row }: any) => formatBytes(Number(row.original.sizeBytes))
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            disabled={row.original.status !== 'COMPLETED'}
            onClick={() => window.open(`http://localhost:3000/api/backups/download/${row.original.id}`, '_blank')}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-blue-600" disabled={row.original.status !== 'COMPLETED'}>
            <UploadCloud className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            Backup & Disaster Recovery
          </h1>
          <p className="text-muted-foreground mt-1">Enterprise-grade backup management, point-in-time restores, and archiving.</p>
        </div>
        <Button onClick={() => setIsBackupModalOpen(true)} className="gap-2">
          <Archive className="h-4 w-4" />
          Create Backup
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
              <Shield className="h-5 w-5" /> Data Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700">All backups are AES-256 encrypted and checksum verified for ultimate integrity.</p>
          </CardContent>
        </Card>
        
        {/* Active Job Tracker */}
        {backups.some((b: any) => b.status === 'RUNNING') && (
          <Card className="md:col-span-2 border-blue-200 shadow-sm relative overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-500 ease-out" 
              style={{ width: `${backups.find((b:any) => b.status === 'RUNNING')?.progress || 0}%` }} 
            />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Backup in Progress...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Encrypting databases...</span>
                <span className="font-medium text-foreground">{backups.find((b:any) => b.status === 'RUNNING')?.progress}% Complete</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={backups}
            searchKey="name"
          />
        </CardContent>
      </Card>

      {/* Basic Modal for brevity, in prod use Dialog component */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Backup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Select the type of backup you wish to initiate.</p>
              
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-left h-auto py-3" onClick={() => requestBackup.mutate('FULL')}>
                  <div>
                    <div className="font-semibold">Full Backup</div>
                    <div className="text-xs text-muted-foreground font-normal">All modules, transactions, and master data.</div>
                  </div>
                </Button>
                <Button variant="outline" className="w-full justify-start text-left h-auto py-3" onClick={() => requestBackup.mutate('TRANSACTIONS')}>
                  <div>
                    <div className="font-semibold">Transactions Only</div>
                    <div className="text-xs text-muted-foreground font-normal">Only financial and inventory transactions.</div>
                  </div>
                </Button>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="ghost" onClick={() => setIsBackupModalOpen(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
