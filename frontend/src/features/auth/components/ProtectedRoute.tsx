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
  if (!isAuthenticated) return <Navigate to="/auth/login" replace state={{ from: location }} />;
  if (requireCompletedOnboarding && user?.onboardingStep !== "COMPLETED") {
    return <Navigate to="/auth/onboard" replace state={{ from: location }} />;
  }

  return children;
}
