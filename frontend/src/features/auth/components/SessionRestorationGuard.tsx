import React, { useEffect, useState, useRef } from "react";
import { useSessionStore } from "../stores/sessionStore";
import { TokenService } from "../../../core/auth/TokenService";
import { apiClient } from "../../../core/api/apiClient";
import { PageLoader } from "../../../shared/components/ui/LoadingSystem";
import { isTokenValid } from "../../../core/auth/jwt";

export const SessionRestorationGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, clearSession } = useSessionStore();
  const [isRestoring, setIsRestoring] = useState(true);
  const restoreAttempted = useRef(false);

  useEffect(() => {
    const restoreSession = async () => {
      if (restoreAttempted.current) {
        return; // Prevent duplicate attempts in React Strict Mode
      }

      const accessToken = TokenService.getAccessToken();
      const user = useSessionStore.getState().user;

      // If access token is still valid, restore session instantly without calling refresh endpoint
      if (accessToken && isTokenValid(accessToken) && user) {
        setIsRestoring(false);
        restoreAttempted.current = true;
        return;
      }
      
      const refreshToken = TokenService.getRefreshToken();
      
      // If we are already authenticated, or there is no refresh token, finish restoring
      if (isAuthenticated || !refreshToken) {
        setIsRestoring(false);
        restoreAttempted.current = true;
        return;
      }

      restoreAttempted.current = true;

      try {
        // Trigger a background token refresh to restore the session
        // Note: apiClient is configured with a refreshSession handler that calls /auth/refresh
        // and automatically populates the session store and TokenService.
        
        // Let's invoke the refresh endpoint directly to ensure it populates state.
        const response = await apiClient.post("/auth/refresh", { refreshToken }, { withCredentials: true });
        
        // Verify response contains necessary tokens
        if (response.accessToken && response.user) {
          TokenService.setTokens(response.accessToken, response.refreshToken);
          useSessionStore.getState().setSession(response.user, response.accessToken);
        } else {
          clearSession();
        }
      } catch (error) {
        console.warn("Failed to restore session automatically", error);
        clearSession();
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession();
  }, [isAuthenticated, clearSession]);

  if (isRestoring) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
        <PageLoader title="Restoring your session..." />
      </div>
    );
  }

  return <>{children}</>;
};
