import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { AuthenticatedRequest } from "./types/authenticated-request";

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException("Tenant context is required");
    }

    const tenant = await this.prisma.company.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        onboardingStep: true,
        status: true,
      },
    });

    const isTenantActive = tenant ? (tenant.status === 'ACTIVE' || tenant.status === 'FREE_TRIAL') : false;

    if (!tenant || !isTenantActive) {
      throw new ForbiddenException("Company is inactive or unavailable");
    }

    request.tenant = {
      id: tenant.id,
      isActive: isTenantActive,
      onboardingStep: tenant.onboardingStep,
      subscriptionStatus: tenant.status,
    };
    return true;
  }
}
