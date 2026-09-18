import { create } from 'zustand';

interface NetworkState {
  isOffline: boolean;
  isServerUnreachable: boolean;
  setOfflineStatus: (status: boolean) => void;
  setServerUnreachable: (status: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOffline: !navigator.onLine,
  isServerUnreachable: false,
  setOfflineStatus: (status) => set({ isOffline: status }),
  setServerUnreachable: (status) => set({ isServerUnreachable: status }),
}));
