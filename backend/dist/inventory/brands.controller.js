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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const prisma_service_1 = require("../database/prisma.service");
const company_context_1 = require("../common/context/company-context");
let BrandsController = class BrandsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(search) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        const where = { companyId };
        if (search) {
            where.name = { contains: search };
        }
        const items = await this.prisma.brand.findMany({ where });
        return { success: true, data: { items } };
    }
    async create(data) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        const item = await this.prisma.brand.create({
            data: { ...data, companyId }
        });
        return { success: true, data: item, id: item.id };
    }
    async update(id, data) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        const { id: _, companyId: __, createdAt, updatedAt, ...updateData } = data;
        const item = await this.prisma.brand.updateMany({
            where: { id, companyId },
            data: updateData
        });
        return { success: true, data: item };
    }
    async remove(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        await this.prisma.brand.deleteMany({
            where: { id, companyId }
        });
        return { success: true };
    }
};
exports.BrandsController = BrandsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BrandsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BrandsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BrandsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BrandsController.prototype, "remove", null);
exports.BrandsController = BrandsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('brands'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BrandsController);
//# sourceMappingURL=brands.controller.js.map