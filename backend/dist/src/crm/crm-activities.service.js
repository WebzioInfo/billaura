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
exports.CrmActivitiesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let CrmActivitiesService = class CrmActivitiesService {
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
            ...(query.search
                ? {
                    OR: [
                        { subject: { contains: query.search } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.crmActivity.findMany({
                where,
                skip,
                take,
                include: { businessPartner: true },
                orderBy: { createdAt: query.sortOrder || 'desc' },
            }),
            this.prisma.crmActivity.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const activity = await this.prisma.crmActivity.findFirst({
            where: {
                id,
                companyId,
            },
            include: { businessPartner: true },
        });
        if (!activity) {
            throw new common_1.NotFoundException(`Activity with ID ${id} not found`);
        }
        return activity;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const businessPartnerId = dto.leadId || dto.customerId || dto.businessPartnerId;
        const { leadId, customerId, ...restDto } = dto;
        return this.prisma.crmActivity.create({
            data: {
                ...restDto,
                businessPartnerId,
                companyId,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            },
        });
    }
    async update(id, dto) {
        await this.findOne(id);
        const businessPartnerId = dto.leadId || dto.customerId || dto.businessPartnerId;
        const { leadId, customerId, ...restDto } = dto;
        return this.prisma.crmActivity.update({
            where: { id },
            data: {
                ...restDto,
                ...(businessPartnerId && { businessPartnerId }),
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.crmActivity.delete({
            where: { id },
        });
    }
};
exports.CrmActivitiesService = CrmActivitiesService;
exports.CrmActivitiesService = CrmActivitiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmActivitiesService);
//# sourceMappingURL=crm-activities.service.js.map