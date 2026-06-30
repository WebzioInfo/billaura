import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { CompanyContext } from '../context/company-context';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('Active company identifier is missing. Please provide x-company-id header or complete authentication onboarding.');
    }
    return true;
  }
}
