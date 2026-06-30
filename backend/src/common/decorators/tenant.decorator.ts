import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CompanyContext } from '../context/company-context';

export const CurrentCompany = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return CompanyContext.getCompanyId();
  },
);

export const CurrentUserContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return {
      userId: CompanyContext.getUserId(),
      companyId: CompanyContext.getCompanyId(),
    };
  },
);
