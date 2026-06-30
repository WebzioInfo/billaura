export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ACCOUNTANT';

export interface BaseSessionUser {
  id: string;
  email: string;
  name: string;
  globalRole: UserRole;
  companyId?: string | null;
  tenantId?: string | null;
  role?: string | null;
  onboardingStep?: string | null;
}
