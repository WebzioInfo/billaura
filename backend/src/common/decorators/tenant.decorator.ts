import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CompanyContext } from "../context/company-context";

export const CurrentCompany = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext) => {
    return CompanyContext.getCompanyId();
  },
);

export const CurrentUserContext = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext) => {
    return {
      userId: CompanyContext.getUserId(),
      companyId: CompanyContext.getCompanyId(),
    };
  },
);
