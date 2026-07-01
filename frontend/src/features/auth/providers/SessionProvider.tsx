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
        const refreshToken = TokenService.getRefreshToken();
        
        if (!refreshToken) {
          clearSession();
          setInitFinished(true);
          return;
        }

        const res = await apiClient.post<{ access_token: string; refresh_token: string; user: any }>("/auth/refresh", { refreshToken });
        if (res && res.access_token && res.refresh_token && res.user) {
          TokenService.setTokens(res.access_token, res.refresh_token);
          setSession(res.user, res.access_token);
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
