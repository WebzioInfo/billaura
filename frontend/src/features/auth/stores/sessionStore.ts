import { create } from "zustand";
import type { Permission, SessionState, SessionUser } from "../types";

interface SessionStore extends SessionState {
  accessToken: string | null;
  setSession: (user: SessionUser | null, accessToken?: string | null, refreshToken?: string | null, permissions?: Permission[]) => void;
  setLoading: (isLoading: boolean) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  accessToken: null,
  permissions: [],
  isLoading: false,
  isAuthenticated: false,
  setSession: (user, accessToken, refreshToken, permissions = []) => {
    if (refreshToken !== undefined) {
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      } else {
        localStorage.removeItem("refresh_token");
      }
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
    localStorage.removeItem("refresh_token");
    set({
      user: null,
      accessToken: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
