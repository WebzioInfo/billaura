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
      try {
        const refreshToken = TokenService.getRefreshToken();
        
        if (!refreshToken) {
          clearSession();
          setInitFinished(true);
          return;
        }

        const res: any = await apiClient.post("/auth/refresh", { refreshToken });
        const payload = res?.data || res;
        
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
