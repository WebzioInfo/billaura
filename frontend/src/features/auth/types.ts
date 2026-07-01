import type { BaseSessionUser, UserRole } from "./types/auth-types";

export type Permission = `${string}:${string}`;

export interface SessionUser extends BaseSessionUser {
  onboardingStep?: string | null;
  name: string;
  email: string;
  globalRole: UserRole;
  companyName?: string | null;
  logoBase64?: string | null;
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
