import { PropsWithChildren } from "react";
import { useSessionStore } from "../stores/sessionStore";

interface TenantGuardProps extends PropsWithChildren {
  fallback?: React.ReactNode;
}

export function TenantGuard({ fallback = null, children }: TenantGuardProps) {
  const companyId = useSessionStore((state) => state.user?.companyId);
  return companyId ? children : fallback;
}
