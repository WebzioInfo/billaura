import { create } from "zustand";
import type { Permission, SessionState, SessionUser } from "../types";

interface SessionStore extends SessionState {
  accessToken: string | null;
  setSession: (user: SessionUser | null, accessToken?: string | null, permissions?: Permission[]) => void;
  setLoading: (isLoading: boolean) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  accessToken: null,
  permissions: [],
  isLoading: false,
  isAuthenticated: false,
  setSession: (user, accessToken, permissions = []) => {
    if (user) {
      localStorage.setItem("logged_in", "true");
    } else {
      localStorage.removeItem("logged_in");
    }
    set((state) => ({
      user,
      accessToken: accessToken !== undefined ? accessToken : state.accessToken,
      permissions,
      isAuthenticated: Boolean(user),
      isLoading: false,
    }));
  },
  setLoading: (isLoading) => set({ isLoading }),
  clearSession: () => {
    localStorage.removeItem("logged_in");
    set({
      user: null,
      accessToken: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
