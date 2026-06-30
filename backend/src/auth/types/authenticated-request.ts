import type { Request } from "express";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  tenantId: string;
  roleId?: string | null;
}

export interface RequestTenantContext {
  id: string;
  isActive: boolean;
  onboardingStep: string;
  subscriptionStatus: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  tenant?: RequestTenantContext;
}
