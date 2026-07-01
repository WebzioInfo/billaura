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
exports.CustomersController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const prisma_service_1 = require("../database/prisma.service");
const company_context_1 = require("../common/context/company-context");
let CustomersController = class CustomersController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(search) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        const where = { companyId, deletedAt: null, bpType: 'CUSTOMER' };
        if (search) {
            where.name = { contains: search };
        }
        const items = await this.prisma.businessPartner.findMany({ where });
        return { success: true, data: { items } };
    }
    async create(data) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        const { name, customerCode, mobile, whatsapp, email, gstin, gstNumber, panNumber, customerType, tradeName, address, pinCode, state, stateCode, placeOfSupply, creditLimit } = data;
        const item = await this.prisma.businessPartner.create({
            data: {
                name,
                bpCode: customerCode || ('CUST-' + Math.random().toString(36).substring(2, 7).toUpperCase()),
                bpType: 'CUSTOMER',
                phone: mobile,
                whatsapp,
                email,
                gstin: gstin || gstNumber,
                panNumber,
                customerType: customerType || 'UNREGISTERED',
                tradeName,
                address,
                pinCode,
                state,
                stateCode,
                placeOfSupply,
                creditLimit: creditLimit ? Number(creditLimit) : 0,
                companyId,
            }
        });
        return { success: true, data: item, id: item.id };
    }
    async update(id, data) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        const { name, customerCode, mobile, whatsapp, email, gstin, gstNumber, panNumber, customerType, tradeName, address, pinCode, state, stateCode, placeOfSupply, creditLimit } = data;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (customerCode !== undefined)
            updateData.bpCode = customerCode;
        if (mobile !== undefined)
            updateData.phone = mobile;
        if (whatsapp !== undefined)
            updateData.whatsapp = whatsapp;
        if (email !== undefined)
            updateData.email = email;
        if (gstin !== undefined || gstNumber !== undefined)
            updateData.gstin = gstin || gstNumber;
        if (panNumber !== undefined)
            updateData.panNumber = panNumber;
        if (customerType !== undefined)
            updateData.customerType = customerType;
        if (tradeName !== undefined)
            updateData.tradeName = tradeName;
        if (address !== undefined)
            updateData.address = address;
        if (pinCode !== undefined)
            updateData.pinCode = pinCode;
        if (state !== undefined)
            updateData.state = state;
        if (stateCode !== undefined)
            updateData.stateCode = stateCode;
        if (placeOfSupply !== undefined)
            updateData.placeOfSupply = placeOfSupply;
        if (creditLimit !== undefined)
            updateData.creditLimit = Number(creditLimit);
        const item = await this.prisma.businessPartner.updateMany({
            where: { id, companyId, deletedAt: null, bpType: 'CUSTOMER' },
            data: updateData
        });
        return { success: true, data: item };
    }
    async remove(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        await this.prisma.businessPartner.updateMany({
            where: { id, companyId, deletedAt: null, bpType: 'CUSTOMER' },
            data: { deletedAt: new Date() }
        });
        return { success: true };
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "remove", null);
exports.CustomersController = CustomersController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('customers'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersController);
//# sourceMappingURL=customers.controller.js.map