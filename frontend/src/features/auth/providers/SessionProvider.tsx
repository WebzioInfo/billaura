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
      const isLoggedIn = localStorage.getItem("logged_in") === "true";
      if (isLoggedIn) {
        try {
          const res = await apiClient.post<{ success: boolean; data: { access_token: string; user: any } }>("/auth/refresh", {});
          if (res.success && res.data) {
            setSession(res.data.user, res.data.access_token);
          } else {
            clearSession();
          }
        } catch (err) {
          console.error("Failed to restore session:", err);
          clearSession();
        }
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
