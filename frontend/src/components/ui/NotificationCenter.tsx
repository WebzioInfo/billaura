import React, { useState } from 'react';
import { Bell, Check, Settings, X, Activity, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandPaletteStore } from '@/store/commandPaletteStore';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Backup Complete', description: 'System backup was completed successfully.', time: '10m ago', read: false, type: 'success' },
  { id: '2', title: 'Low Stock Alert', description: 'Product "20L Jar" has fallen below reorder level.', time: '1h ago', read: false, type: 'warning' },
  { id: '3', title: 'Payment Received', description: 'Received ₹15,000 from ABC Traders.', time: '2h ago', read: true, type: 'info' },
  { id: '4', title: 'GST Return Due', description: 'GSTR-1 filing is due in 3 days.', time: '1d ago', read: true, type: 'warning' }
];

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-surface" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-premium z-50 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-accent hover:text-accent/80 transition-colors">
                    Mark all read
                  </button>
                )}
                <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-1 scrollbar-hide">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    className={cn(
                      "flex gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                      n.read ? "hover:bg-muted/50" : "bg-accent/5 hover:bg-accent/10"
                    )}
                  >
                    <div className="mt-0.5 shrink-0 bg-background rounded-full p-1.5 border border-border shadow-sm">
                      {getIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <p className={cn("text-sm font-medium truncate", !n.read && "text-foreground")}>{n.title}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                    </div>
                    {!n.read && (
                      <div className="shrink-0 w-2 h-2 rounded-full bg-accent mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t border-border bg-muted/30">
              <button className="w-full py-2 text-xs font-medium text-center text-muted-foreground hover:text-foreground bg-background rounded-md border border-border hover:border-accent/50 transition-colors">
                View All Activity
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
