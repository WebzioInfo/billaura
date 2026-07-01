import { create } from "zustand";
import type { Permission, SessionState, SessionUser } from "../types";
import { TokenService } from "../../../services/auth/TokenService";

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
    TokenService.clearTokens();
    set({
      user: null,
      accessToken: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
