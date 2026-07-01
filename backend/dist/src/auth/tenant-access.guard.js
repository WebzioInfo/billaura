"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantAccessGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let TenantAccessGuard = class TenantAccessGuard {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const tenantId = request.user?.tenantId;
        if (!tenantId) {
            throw new common_1.ForbiddenException("Tenant context is required");
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
            throw new common_1.ForbiddenException("Company is inactive or unavailable");
        }
        request.tenant = {
            id: tenant.id,
            isActive: isTenantActive,
            onboardingStep: tenant.onboardingStep,
            subscriptionStatus: tenant.status,
        };
        return true;
    }
};
exports.TenantAccessGuard = TenantAccessGuard;
exports.TenantAccessGuard = TenantAccessGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantAccessGuard);
//# sourceMappingURL=tenant-access.guard.js.map