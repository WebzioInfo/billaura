import { PropsWithChildren, useEffect, useState } from 'react';
import { apiClient } from '@/core/api/apiClient';
import { useSessionStore } from '../stores/sessionStore';
import { LoadingScreen } from '@/shared/components/feedback/LoadingScreen';
import { TokenService } from '../../../core/auth/TokenService';

export function SessionProvider({ children }: PropsWithChildren) {
  const clearSession = useSessionStore((state) => state.clearSession);
  const setSession = useSessionStore((state) => state.setSession);
  const [initFinished, setInitFinished] = useState(false);

  useEffect(() => {
    apiClient.setUnauthorizedHandler(clearSession);

    const initSession = async () => {
      try {
        const storedRefreshToken = TokenService.getRefreshToken();
        if (!storedRefreshToken) {
          setInitFinished(true);
          return;
        }
        const payload = await apiClient.post('/auth/refresh', { refreshToken: storedRefreshToken });
        
        const token = payload.accessToken || payload.access_token;
        if (payload && token && payload.user) {
          TokenService.setTokens(token, payload.refreshToken || payload.refresh_token);
          setSession(payload.user, token);
        } else {
          TokenService.clearTokens();
          clearSession();
        }
      } catch {
        TokenService.clearTokens();
        clearSession();
      } finally {
        setInitFinished(true);
      }
    };

    initSession();
  }, [clearSession, setSession]);

  if (!initFinished) {
    return <LoadingScreen text="Starting session..." />;
  }

  return <>{children}</>;
}
