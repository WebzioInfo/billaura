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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const company_context_1 = require("../common/context/company-context");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const [salesSum, purchaseSum, expenseSum, customerCount, vendorCount, lowStockProducts, recentInvoices,] = await Promise.all([
            this.prisma.invoice.aggregate({
                where: { companyId },
                _sum: { grandTotal: true },
            }),
            this.prisma.purchase.aggregate({
                where: { companyId },
                _sum: { grandTotal: true },
            }),
            this.prisma.expense.aggregate({
                where: { companyId },
                _sum: { amount: true },
            }),
            this.prisma.customer.count({
                where: { companyId },
            }),
            this.prisma.vendor.count({
                where: { companyId },
            }),
            this.prisma.product.findMany({
                where: {
                    companyId,
                    reorderLevel: { gt: 0 },
                },
                take: 5,
                orderBy: { name: 'asc' },
            }),
            this.prisma.invoice.findMany({
                where: { companyId },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { customer: true },
            }),
        ]);
        return {
            metrics: {
                salesTotal: salesSum._sum?.grandTotal ? Number(salesSum._sum.grandTotal) : 0,
                purchaseTotal: purchaseSum._sum?.grandTotal ? Number(purchaseSum._sum.grandTotal) : 0,
                expenseTotal: expenseSum._sum?.amount ? Number(expenseSum._sum.amount) : 0,
                customerCount,
                vendorCount,
            },
            lowStock: lowStockProducts.map(p => ({
                id: p.id,
                name: p.name,
                sku: p.sku || 'N/A',
                reorderLevel: Number(p.reorderLevel),
            })),
            recentActivity: recentInvoices.map(inv => ({
                id: inv.id,
                type: 'INVOICE',
                reference: inv.invoiceNo,
                description: `Tax invoice issued to ${inv.customer.name}`,
                amount: Number(inv.grandTotal),
                date: inv.date,
                status: inv.status,
            })),
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map