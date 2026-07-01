"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUserContext = exports.CurrentCompany = void 0;
const common_1 = require("@nestjs/common");
const company_context_1 = require("../context/company-context");
exports.CurrentCompany = (0, common_1.createParamDecorator)((data, ctx) => {
    return company_context_1.CompanyContext.getCompanyId();
});
exports.CurrentUserContext = (0, common_1.createParamDecorator)((data, ctx) => {
    return {
        userId: company_context_1.CompanyContext.getUserId(),
        companyId: company_context_1.CompanyContext.getCompanyId(),
    };
});
//# sourceMappingURL=tenant.decorator.js.map