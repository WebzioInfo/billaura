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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let LeadsService = class LeadsService {
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
            bpType: 'LEAD',
            ...(query.search
                ? {
                    OR: [
                        { name: { contains: query.search } },
                        { tradeName: { contains: query.search } },
                        { email: { contains: query.search } },
                        { phone: { contains: query.search } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.businessPartner.findMany({
                where,
                skip,
                take,
                include: { crmActivities: true },
                orderBy: { createdAt: query.sortOrder || 'desc' },
            }),
            this.prisma.businessPartner.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const lead = await this.prisma.businessPartner.findFirst({
            where: {
                id,
                companyId,
                deletedAt: null,
            },
            include: { crmActivities: true },
        });
        if (!lead) {
            throw new common_1.NotFoundException(`Lead with ID ${id} not found`);
        }
        return lead;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        return this.prisma.businessPartner.create({
            data: {
                ...dto,
                status: dto.status,
                bpType: 'LEAD',
                bpCode: 'LEAD-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
                companyId,
            },
        });
    }
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.businessPartner.update({
            where: { id },
            data: {
                ...dto,
                status: dto.status,
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.businessPartner.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map