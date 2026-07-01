"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomeCategoriesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
let IncomeCategoriesService = class IncomeCategoriesService {
    async findAll(companyId) {
        return prisma.incomeCategory.findMany({
            where: { companyId },
            include: {
                account: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(companyId, id) {
        const category = await prisma.incomeCategory.findFirst({
            where: { id, companyId },
            include: {
                account: true,
            },
        });
        if (!category) {
            throw new common_1.NotFoundException('Income category not found');
        }
        return category;
    }
    async create(companyId, data) {
        return prisma.incomeCategory.create({
            data: {
                ...data,
                companyId,
            },
            include: {
                account: true,
            },
        });
    }
    async update(companyId, id, data) {
        const existing = await this.findOne(companyId, id);
        return prisma.incomeCategory.update({
            where: { id: existing.id },
            data,
            include: {
                account: true,
            },
        });
    }
    async remove(companyId, id) {
        const existing = await this.findOne(companyId, id);
        return prisma.incomeCategory.delete({
            where: { id: existing.id },
        });
    }
};
exports.IncomeCategoriesService = IncomeCategoriesService;
exports.IncomeCategoriesService = IncomeCategoriesService = __decorate([
    (0, common_1.Injectable)()
], IncomeCategoriesService);
//# sourceMappingURL=income-categories.service.js.map