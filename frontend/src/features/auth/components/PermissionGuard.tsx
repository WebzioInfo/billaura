import { PropsWithChildren } from "react";
import type { Permission } from "../types";
import { useSessionStore } from "../stores/sessionStore";

interface PermissionGuardProps extends PropsWithChildren {
  permissions: Permission[];
  fallback?: React.ReactNode;
}

export function PermissionGuard({ permissions, fallback = null, children }: PermissionGuardProps) {
  const { permissions: granted, user } = useSessionStore((state) => ({
    permissions: state.permissions,
    user: state.user
  }));
  
  const hasAccess = 
    user?.globalRole === 'SUPER_ADMIN' || 
    user?.role === 'ADMIN' || 
    permissions.every((permission) => granted.includes(permission));

  return hasAccess ? <>{children}</> : fallback;
}
