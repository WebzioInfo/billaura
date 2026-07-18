import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Check, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import { Button } from '@/shared/components/ui/Button';
import apiClient from '@/core/api';

export const NotificationsCenter = () => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      // Stubbing it as there might not be a notifications backend yet
      try {
        const res = await apiClient.get('/notifications');
        return res.data;
      } catch (e) {
        return [];
      }
    }
  });

  const filtered = filter === 'ALL' ? notifications : notifications.filter((n: any) => !n.isRead);

  return (
    <PageContainer maxWidth="4xl">
      <PageHeader 
        title="Notifications Center" 
        description="Stay updated with system alerts, approvals, and reminders."
        primaryAction={
          <Button variant="outline" className="flex items-center gap-2">
            <Check className="w-4 h-4" /> Mark All as Read
          </Button>
        }
      />

      <div className="mt-8">
        <div className="flex items-center gap-4 border-b border-border mb-4 pb-2">
          <button 
            className={`pb-2 px-1 text-sm font-medium transition-colors ${filter === 'ALL' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setFilter('ALL')}
          >
            All Notifications
          </button>
          <button 
            className={`pb-2 px-1 text-sm font-medium transition-colors ${filter === 'UNREAD' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setFilter('UNREAD')}
          >
            Unread
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/20 rounded-xl border border-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden mt-6">
            <EmptyState
              title="All Caught Up!"
              description="You have no new notifications."
              actionLabel="Go to Dashboard"
              onActionClick={() => window.location.href = '/dashboard'}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((n: any) => (
              <div key={n.id} className={`p-4 rounded-xl border ${!n.isRead ? 'bg-primary/5 border-primary/20' : 'bg-surface border-border'} flex items-start gap-4 transition-all hover:shadow-sm`}>
                <div className={`mt-1 w-2 h-2 rounded-full ${!n.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{n.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                  <span className="text-xs text-muted-foreground mt-2 block">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {!n.isRead && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs">Mark Read</Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};
