import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Permission, SessionState, SessionUser } from "../types";
import { TokenService } from "../../../core/auth/TokenService";

interface SessionStore extends SessionState {
  accessToken: string | null;
  setSession: (user: SessionUser | null, accessToken?: string | null, permissions?: Permission[]) => void;
  setLoading: (isLoading: boolean) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      permissions: [],
      isLoading: false,
      isAuthenticated: false,
      setSession: (user, accessToken, permissions = []) => {
        if (user) {
          localStorage.setItem('billaura_user', JSON.stringify(user));
          if (user.tenantId || user.companyId) {
            localStorage.setItem('billaura_tenant', JSON.stringify({ id: user.tenantId || user.companyId }));
          }
        }
        if (permissions) {
          localStorage.setItem('billaura_permissions', JSON.stringify(permissions));
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
        TokenService.clearTokens();
        localStorage.removeItem('billaura_user');
        localStorage.removeItem('billaura_tenant');
        localStorage.removeItem('billaura_permissions');
        
        set({
          user: null,
          accessToken: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'billaura_session', // unique name
      storage: createJSONStorage(() => localStorage),
      // We don't need to persist isLoading or accessToken (TokenService handles it)
      partialize: (state) => ({ 
        user: state.user, 
        permissions: state.permissions, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
