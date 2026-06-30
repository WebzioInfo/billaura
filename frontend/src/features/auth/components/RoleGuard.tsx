import { PropsWithChildren } from "react";
import type { UserRole } from "@billaura/shared-types";
import { useSessionStore } from "../stores/sessionStore";

interface RoleGuardProps extends PropsWithChildren {
  roles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
  const role = useSessionStore((state) => state.user?.role);
  return role && roles.includes(role as UserRole) ? children : fallback;
}
