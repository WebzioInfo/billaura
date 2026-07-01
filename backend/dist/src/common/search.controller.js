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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("./guards/tenant.guard");
const prisma_service_1 = require("../database/prisma.service");
const company_context_1 = require("./context/company-context");
let SearchController = class SearchController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async search(query) {
        if (!query || query.length < 2)
            return { success: true, results: [] };
        const companyId = company_context_1.CompanyContext.getCompanyId();
        const q = query.toLowerCase();
        const [customers, vendors, invoices, products, accounts] = await Promise.all([
            this.prisma.businessPartner.findMany({
                where: { companyId, deletedAt: null, bpType: 'CUSTOMER', name: { contains: q } },
                take: 5
            }),
            this.prisma.businessPartner.findMany({
                where: { companyId, deletedAt: null, bpType: 'VENDOR', name: { contains: q } },
                take: 5
            }),
            this.prisma.invoice.findMany({
                where: { companyId, deletedAt: null, invoiceNo: { contains: q } },
                take: 5
            }),
            this.prisma.product.findMany({
                where: { companyId, deletedAt: null, name: { contains: q } },
                take: 5
            }),
            this.prisma.account.findMany({
                where: { companyId, name: { contains: q } },
                take: 5
            })
        ]);
        const results = [
            ...customers.map(c => ({ id: c.id, title: c.name, type: 'Customer', url: '/crm' })),
            ...vendors.map(v => ({ id: v.id, title: v.name, type: 'Vendor', url: '/vendors' })),
            ...invoices.map(i => ({ id: i.id, title: `Invoice #${i.invoiceNo}`, type: 'Invoice', url: '/invoices' })),
            ...products.map(p => ({ id: p.id, title: p.name, type: 'Product', url: '/inventory' })),
            ...accounts.map(a => ({ id: a.id, title: a.name, type: 'Account', url: '/chart-of-accounts' }))
        ];
        return { success: true, results };
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "search", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchController);
//# sourceMappingURL=search.controller.js.map