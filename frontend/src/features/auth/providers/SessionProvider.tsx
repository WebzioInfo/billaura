import { PropsWithChildren, useEffect, useState } from "react";
import { apiClient } from "@/services/api/apiClient";
import { useSessionStore } from "../stores/sessionStore";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { TokenService } from "../../../services/auth/TokenService";

export function SessionProvider({ children }: PropsWithChildren) {
  const clearSession = useSessionStore((state) => state.clearSession);
  const setSession = useSessionStore((state) => state.setSession);
  const [initFinished, setInitFinished] = useState(false);

  useEffect(() => {
    apiClient.setUnauthorizedHandler(clearSession);

    const initSession = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-CSRF-Token': TokenService.getCsrfToken() ?? '' },
        });
        
        if (!res.ok) {
          throw new Error('Refresh failed');
        }

        const data = await res.json();
        const payload = data?.data || data;
        
        if (payload && payload.access_token && payload.user) {
          TokenService.setAccessToken(payload.access_token);
          setSession(payload.user, payload.access_token);
        } else {
          TokenService.clearTokens();
          clearSession();
        }
      } catch {
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
