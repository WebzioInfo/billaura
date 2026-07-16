import { QueryClient, onlineManager } from "@tanstack/react-query";
import { useNetworkStore } from "../../store/networkStore";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

// Configure onlineManager to respect both navigator.onLine and our custom isServerUnreachable state
onlineManager.setEventListener((setOnline) => {
  const handleStateChange = () => {
    const { isOffline, isServerUnreachable } = useNetworkStore.getState();
    setOnline(!isOffline && !isServerUnreachable);
  };

  // Subscribe to Zustand store changes
  const unsubscribe = useNetworkStore.subscribe(handleStateChange);
  
  // Also listen to window events directly as a fallback
  window.addEventListener('online', handleStateChange);
  window.addEventListener('offline', handleStateChange);

  return () => {
    unsubscribe();
    window.removeEventListener('online', handleStateChange);
    window.removeEventListener('offline', handleStateChange);
  };
});
