import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { AuthenticatedRequest } from "./types/authenticated-request";

@Injectable()
export class OnboardingCompleteGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenant =
      request.tenant ??
      (await this.prisma.company.findUnique({
        where: { id: request.user.tenantId },
        select: {
          id: true,
          onboardingStep: true,
          status: true,
        },
      }));

    if (tenant) {
      (tenant as any).isActive =
        (tenant as any).status === "ACTIVE" ||
        (tenant as any).status === "FREE_TRIAL";
      (tenant as any).subscriptionStatus = (tenant as any).status;
    }

    if (!tenant || tenant.onboardingStep !== "COMPLETED") {
      throw new ForbiddenException({
        code: "ONBOARDING_REQUIRED",
        message: "Complete company onboarding before accessing ERP modules",
        onboardingStep: tenant?.onboardingStep ?? "BUSINESS_DETAILS",
      });
    }

    return true;
  }
}
