import { PropsWithChildren, useEffect, useState } from "react";
import { apiClient } from "@/services/api/apiClient";
import { useSessionStore } from "../stores/sessionStore";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { TokenService } from "../../../services/auth/TokenService";

export function SessionProvider({ children }: PropsWithChildren) {
  const clearSession = useSessionStore((state) => state.clearSession);
  const setSession = useSessionStore((state) => state.setSession);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const [initFinished, setInitFinished] = useState(() => {
    // If we have a persisted session and a refresh token, we can render immediately.
    // The refresh will happen silently in the background.
    return isAuthenticated && !!TokenService.getRefreshToken();
  });

  useEffect(() => {
    apiClient.setUnauthorizedHandler(clearSession);

    const initSession = async () => {
      // If we are already authenticated in Zustand, we don't need to preemptively refresh.
      // The apiClient interceptor will automatically refresh if any API call hits a 401.
      if (isAuthenticated) {
        setInitFinished(true);
        return;
      }

      try {
        const refreshToken = TokenService.getRefreshToken();
        
        if (!refreshToken) {
          clearSession();
          setInitFinished(true);
          return;
        }

        // Use raw fetch or a separate axios instance to bypass apiClient interceptors for auth endpoints
        // Doing this avoids the infinite 401 interceptor loop.
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (!res.ok) {
          throw new Error('Refresh failed');
        }

        const data = await res.json();
        const payload = data?.data || data;
        
        if (payload && payload.access_token && payload.refresh_token && payload.user) {
          TokenService.setTokens(payload.access_token, payload.refresh_token);
          setSession(payload.user, payload.access_token);
        } else {
          TokenService.clearTokens();
          clearSession();
        }
      } catch (err: any) {
        console.error("Failed to restore session:", err);
        TokenService.clearTokens();
        clearSession();
      }
      setInitFinished(true);
    };

    initSession();
  }, [clearSession, setSession]);

  if (!initFinished) {
    return <LoadingScreen />;
  }

  return children;
}
