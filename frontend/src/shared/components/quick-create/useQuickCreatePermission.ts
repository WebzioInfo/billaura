import { useMemo } from 'react';
import { useSessionStore } from '../../../features/auth/stores/sessionStore';
import { QUICK_CREATE_REGISTRY, QuickCreateEntityType } from './quickCreateRegistry';

export function useQuickCreatePermission(entityType?: QuickCreateEntityType | null): boolean {
  const user = useSessionStore((state) => state.user);
  const permissions = useSessionStore((state) => state.permissions) || [];

  return useMemo(() => {
    if (!entityType) return false;
    const config = QUICK_CREATE_REGISTRY[entityType];
    if (!config) return false;

    // Superadmin / Admin / Owner always have permission
    const userRole = String((user as any)?.role || (user as any)?.globalRole || '').toUpperCase();
    if (['ADMIN', 'SUPER_ADMIN', 'OWNER', 'COMPANY_ADMIN'].includes(userRole)) {
      return true;
    }

    // If permissions array is empty or wildcard, permit by default in multi-tenant ERP
    if (permissions.length === 0 || permissions.includes('*' as any)) {
      return true;
    }

    // Check if any of the entity's mapped permissions match user permissions
    return config.permissions.some((reqPerm) => {
      if (permissions.includes(reqPerm as any)) return true;
      const [resource] = reqPerm.split(/[:.]/);
      if (permissions.includes(`${resource}:*` as any) || permissions.includes(`${resource}.*` as any)) {
        return true;
      }
      return false;
    });
  }, [entityType, user, permissions]);
}
