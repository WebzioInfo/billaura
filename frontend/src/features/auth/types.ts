import type { SessionUser as BaseSessionUser, UserRole } from "@billaura/shared-types";

export type Permission = `${string}:${string}`;

export interface SessionUser extends BaseSessionUser {
  onboardingStep?: string;
  name?: string;
  email?: string;
  globalRole?: string;
}

export interface SessionState {
  user: SessionUser | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface GuardRequirement {
  roles?: UserRole[];
  permissions?: Permission[];
  requireTenant?: boolean;
}
