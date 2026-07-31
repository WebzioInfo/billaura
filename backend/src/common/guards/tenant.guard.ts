import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { CompanyContext } from "../context/company-context";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const companyId = CompanyContext.getCompanyId();

    if (!companyId) {
      throw new BadRequestException(
        "Active company identifier is missing. Please provide x-company-id header or complete authentication onboarding.",
      );
    }
    
    // Ensure the user is authenticated (JwtAuthGuard must run before this)
    if (!request.user) {
      throw new ForbiddenException("Authentication required.");
    }
    
    // If the user is a SUPER_ADMIN, they can access any tenant context they request.
    if (request.user.globalRole === 'SUPER_ADMIN') {
        return true;
    }

    // Compare requested company context with the user's signed JWT tenantId
    if (request.user.tenantId !== companyId) {
      throw new ForbiddenException("Cross-tenant access forbidden. The requested company context does not match your active membership.");
    }

    return true;
  }
}
