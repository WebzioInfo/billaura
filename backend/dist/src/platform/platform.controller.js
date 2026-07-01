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
exports.PlatformController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const platform_guard_1 = require("./platform.guard");
let PlatformController = class PlatformController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCompanies() {
        const companies = await this.prisma.company.findMany({
            include: {
                users: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        }
                    }
                },
                subscriptions: {
                    include: {
                        plan: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return companies.map(c => ({
            id: c.id,
            companyName: c.companyName,
            legalName: c.legalName,
            status: c.status,
            createdAt: c.createdAt,
            userCount: c.users.length,
            users: c.users.map(u => u.user),
            activePlan: c.subscriptions.find(s => s.status === 'ACTIVE')?.plan?.name || 'Free Trial',
        }));
    }
    async toggleSuspend(id) {
        const company = await this.prisma.company.findUnique({ where: { id } });
        if (!company) {
            throw new Error('Company not found');
        }
        const newStatus = company.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
        await this.prisma.company.update({
            where: { id },
            data: { status: newStatus }
        });
        await this.prisma.subscription.updateMany({
            where: { companyId: id, status: company.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' },
            data: { status: company.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' }
        });
        return { success: true, status: newStatus };
    }
    async deleteCompany(id) {
        const company = await this.prisma.company.findUnique({ where: { id } });
        if (!company) {
            throw new Error('Company not found');
        }
        await this.prisma.company.delete({
            where: { id }
        });
        return { success: true };
    }
    async getSubscriptions() {
        const subs = await this.prisma.subscription.findMany({
            include: {
                company: true,
                plan: true,
            },
            orderBy: { startDate: 'desc' }
        });
        return subs.map(s => ({
            id: s.id,
            companyName: s.company.companyName,
            planName: s.plan.name,
            price: Number(s.plan.price),
            status: s.status,
            startDate: s.startDate,
            endDate: s.endDate,
        }));
    }
    async getPlans() {
        return this.prisma.subscriptionPlan.findMany({
            orderBy: { price: 'asc' }
        });
    }
    async createPlan(body) {
        return this.prisma.subscriptionPlan.create({
            data: {
                name: body.name,
                price: body.price,
                billingCycle: body.billingCycle,
                maxUsers: body.maxUsers || 5,
                maxInvoices: body.maxInvoices || 100,
                maxCustomers: body.maxCustomers || 100,
            }
        });
    }
    async getUsers() {
        const users = await this.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                globalRole: true,
                isActive: true,
                createdAt: true,
                emailVerified: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        return users;
    }
    async updateUser(id, data) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new Error('User not found');
        return this.prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email,
                globalRole: data.globalRole,
            }
        });
    }
    async deleteUser(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new Error('User not found');
        if (user.globalRole === 'SUPER_ADMIN') {
            const superAdmins = await this.prisma.user.count({ where: { globalRole: 'SUPER_ADMIN' } });
            if (superAdmins <= 1) {
                throw new Error('Cannot delete the last Super Admin');
            }
        }
        await this.prisma.user.delete({ where: { id } });
        return { success: true };
    }
    async getRevenue() {
        const invoices = await this.prisma.invoice.findMany({
            where: { status: 'PAID', deletedAt: null },
            select: { grandTotal: true, date: true }
        });
        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
        const activeSubs = await this.prisma.subscription.findMany({
            where: { status: 'ACTIVE' },
            include: { plan: true }
        });
        const mrr = activeSubs.reduce((sum, sub) => sum + Number(sub.plan.price), 0);
        return {
            mrr,
            totalRevenue,
            transactionCount: invoices.length,
            monthlyHistory: [
                { month: 'Jan', revenue: mrr * 0.8 },
                { month: 'Feb', revenue: mrr * 0.9 },
                { month: 'Mar', revenue: mrr * 0.95 },
                { month: 'Apr', revenue: mrr },
                { month: 'May', revenue: mrr * 1.05 },
                { month: 'Jun', revenue: mrr * 1.1 },
            ]
        };
    }
    async getLogs() {
        const logs = await this.prisma.platformActivityLog.findMany({
            include: {
                user: { select: { name: true, email: true } },
                company: { select: { companyName: true } }
            },
            take: 50,
            orderBy: { createdAt: 'desc' }
        });
        return logs.map(l => ({
            id: l.id,
            userName: l.user?.name || 'System',
            userEmail: l.user?.email || 'system@billaura.com',
            companyName: l.company?.companyName || 'Platform',
            action: l.action,
            description: l.description,
            createdAt: l.createdAt,
        }));
    }
    async getSettings() {
        const settings = await this.prisma.systemSetting.findMany();
        return settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
    }
    async updateSettings(body) {
        for (const [key, value] of Object.entries(body)) {
            await this.prisma.systemSetting.upsert({
                where: { key },
                create: { key, value },
                update: { value }
            });
        }
        return { success: true };
    }
};
exports.PlatformController = PlatformController;
__decorate([
    (0, common_1.Get)('companies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "getCompanies", null);
__decorate([
    (0, common_1.Post)('companies/:id/suspend'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "toggleSuspend", null);
__decorate([
    (0, common_1.Delete)('companies/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "deleteCompany", null);
__decorate([
    (0, common_1.Get)('subscriptions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "getSubscriptions", null);
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Post)('plans'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Put)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('revenue'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "getRevenue", null);
__decorate([
    (0, common_1.Get)('logs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlatformController.prototype, "updateSettings", null);
exports.PlatformController = PlatformController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, platform_guard_1.PlatformGuard),
    (0, common_1.Controller)('platform'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlatformController);
//# sourceMappingURL=platform.controller.js.map