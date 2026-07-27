import React, { useEffect, useState } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { WifiOff, ServerCrash, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOffline, isServerUnreachable, setOfflineStatus, setServerUnreachable } = useNetworkStore();
  const [showRestored, setShowRestored] = useState(false);

  // Track previous state to trigger "Restored" banner
  const [prevOffline, setPrevOffline] = useState(isOffline);
  const [prevUnreachable, setPrevUnreachable] = useState(isServerUnreachable);

  useEffect(() => {
    const handleOnline = () => {
      setOfflineStatus(false);
      setServerUnreachable(false);
    };

    const handleOffline = () => {
      setOfflineStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineStatus, setServerUnreachable]);

  useEffect(() => {
    // If we just came back online or server became reachable again
    if ((prevOffline && !isOffline) || (prevUnreachable && !isServerUnreachable)) {
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 2000);
      setPrevOffline(isOffline);
      setPrevUnreachable(isServerUnreachable);
      return () => clearTimeout(timer);
    }

    setPrevOffline(isOffline);
    setPrevUnreachable(isServerUnreachable);
    return undefined;
  }, [isOffline, isServerUnreachable, prevOffline, prevUnreachable]);

  return (
    <>
      {/* Network Banners */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ease-in-out flex justify-center",
          (isOffline || isServerUnreachable || showRestored) ? "translate-y-0" : "-translate-y-full"
        )}
        role="alert"
        aria-live="assertive"
      >
        {isOffline ? (
          <div className="bg-red-500 text-white px-6 py-3 w-full flex items-center justify-center gap-3 shadow-md">
            <WifiOff className="w-5 h-5 animate-pulse" />
            <div className="flex flex-col items-center sm:flex-row sm:gap-2">
              <span className="font-bold">📡 You're Offline</span>
              <span className="text-sm opacity-90 hidden sm:inline">—</span>
              <span className="text-sm opacity-90">Your internet connection appears to be unavailable. Some features may not work until your connection is restored.</span>
            </div>
          </div>
        ) : isServerUnreachable ? (
          <div className="bg-amber-500 text-white px-6 py-3 w-full flex items-center justify-center gap-3 shadow-md">
            <ServerCrash className="w-5 h-5 animate-pulse" />
            <div className="flex flex-col items-center sm:flex-row sm:gap-2">
              <span className="font-bold">Server Connection Lost</span>
              <span className="text-sm opacity-90 hidden sm:inline">—</span>
              <span className="text-sm opacity-90">We couldn't reach the Bill Aura server. Please wait while we automatically reconnect.</span>
            </div>
          </div>
        ) : showRestored ? (
          <div className="bg-green-500 text-white px-6 py-2.5 rounded-b-xl shadow-md flex items-center gap-2 transform translate-y-0 animate-in slide-in-from-top fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Connection Restored</span>
          </div>
        ) : null}
      </div>

      {children}
    </>
  );
};
