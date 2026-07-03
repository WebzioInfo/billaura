import { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { useSessionStore } from "../stores/sessionStore";

interface ProtectedRouteProps extends PropsWithChildren {
  enabled?: boolean;
  requireCompletedOnboarding?: boolean;
}

export function ProtectedRoute({ children, enabled = false, requireCompletedOnboarding = false }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useSessionStore();

  if (!enabled) return children;
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  const isPlatformRoute = location.pathname.startsWith('/platform');

  if (isPlatformRoute) {
    if (user?.globalRole !== 'SUPER_ADMIN') {
      return <Navigate to="/unauthorized" replace />;
    }
  } else {
    // Accounting / company workspace routes
    if (user?.globalRole === 'SUPER_ADMIN') {
      return <Navigate to="/platform/dashboard" replace />;
    }
    if (requireCompletedOnboarding && user?.onboardingStep !== "COMPLETED") {
      return <Navigate to="/onboard" replace state={{ from: location }} />;
    }
  }

  return children;
}
