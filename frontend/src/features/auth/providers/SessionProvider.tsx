import { PropsWithChildren, useEffect, useState } from "react";
import { apiClient } from "@/services/api/apiClient";
import { useSessionStore } from "../stores/sessionStore";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";

export function SessionProvider({ children }: PropsWithChildren) {
  const clearSession = useSessionStore((state) => state.clearSession);
  const setSession = useSessionStore((state) => state.setSession);
  const [initFinished, setInitFinished] = useState(false);

  useEffect(() => {
    apiClient.setUnauthorizedHandler(clearSession);

    const initSession = async () => {
      try {
        const res = await apiClient.post<{ access_token: string; user: any }>("/auth/refresh", {});
        if (res && res.access_token && res.user) {
          setSession(res.user, res.access_token);
        } else {
          clearSession();
        }
      } catch (err: any) {
        // Log out only if it's explicitly an auth failure or token missing
        // A robust app might distinguish between network errors and 401s here
        console.error("Failed to restore session:", err);
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
