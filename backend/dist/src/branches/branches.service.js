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
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let BranchesService = class BranchesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const { skip, take } = (0, pagination_1.getPagination)(query);
        const where = {
            companyId,
            deletedAt: null,
            ...(query.search
                ? {
                    OR: [
                        { name: { contains: query.search } },
                        { code: { contains: query.search } },
                        { email: { contains: query.search } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.branch.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: query.sortOrder || 'desc' },
            }),
            this.prisma.branch.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const branch = await this.prisma.branch.findFirst({
            where: {
                id,
                companyId,
                deletedAt: null,
            },
        });
        if (!branch) {
            throw new common_1.NotFoundException(`Branch with ID ${id} not found`);
        }
        return branch;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const existing = await this.prisma.branch.findFirst({
            where: {
                companyId,
                name: dto.name,
                deletedAt: null,
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Branch with name '${dto.name}' already exists in this company`);
        }
        if (dto.isDefault) {
            await this.prisma.branch.updateMany({
                where: { companyId, isDefault: true },
                data: { isDefault: false },
            });
        }
        return this.prisma.branch.create({
            data: {
                ...dto,
                companyId,
            },
        });
    }
    async update(id, dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const branch = await this.findOne(id);
        if (dto.name && dto.name !== branch.name) {
            const existing = await this.prisma.branch.findFirst({
                where: {
                    companyId,
                    name: dto.name,
                    deletedAt: null,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new common_1.ConflictException(`Branch with name '${dto.name}' already exists`);
            }
        }
        if (dto.isDefault) {
            await this.prisma.branch.updateMany({
                where: { companyId, isDefault: true, NOT: { id } },
                data: { isDefault: false },
            });
        }
        return this.prisma.branch.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.branch.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BranchesService);
//# sourceMappingURL=branches.service.js.map