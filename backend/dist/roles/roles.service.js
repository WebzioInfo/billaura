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
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let RolesService = class RolesService {
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
            OR: [
                { companyId },
                { isSystem: true },
            ],
            ...(query.search
                ? {
                    name: { contains: query.search },
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.role.findMany({
                where,
                skip,
                take,
                include: { permissions: true },
                orderBy: { isSystem: 'desc' },
            }),
            this.prisma.role.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const role = await this.prisma.role.findFirst({
            where: {
                id,
                OR: [
                    { companyId },
                    { isSystem: true },
                ],
            },
            include: { permissions: true },
        });
        if (!role) {
            throw new common_1.NotFoundException(`Role with ID ${id} not found`);
        }
        return role;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const existing = await this.prisma.role.findFirst({
            where: {
                companyId,
                name: dto.name,
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Role with name '${dto.name}' already exists in this company`);
        }
        return this.prisma.$transaction(async (tx) => {
            const role = await tx.role.create({
                data: {
                    name: dto.name,
                    description: dto.description,
                    companyId,
                    isSystem: false,
                },
            });
            if (dto.permissions?.length) {
                await tx.rolePermission.createMany({
                    data: dto.permissions.map((p) => ({
                        roleId: role.id,
                        resource: p.resource,
                        action: p.action,
                    })),
                });
            }
            return tx.role.findUnique({
                where: { id: role.id },
                include: { permissions: true },
            });
        });
    }
    async update(id, dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const role = await this.findOne(id);
        if (role.isSystem) {
            throw new common_1.BadRequestException('System roles cannot be modified');
        }
        if (dto.name && dto.name !== role.name) {
            const existing = await this.prisma.role.findFirst({
                where: {
                    companyId,
                    name: dto.name,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new common_1.ConflictException(`Role with name '${dto.name}' already exists`);
            }
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.role.update({
                where: { id },
                data: {
                    name: dto.name,
                    description: dto.description,
                },
            });
            if (dto.permissions !== undefined) {
                await tx.rolePermission.deleteMany({
                    where: { roleId: id },
                });
                if (dto.permissions.length) {
                    await tx.rolePermission.createMany({
                        data: dto.permissions.map((p) => ({
                            roleId: id,
                            resource: p.resource,
                            action: p.action,
                        })),
                    });
                }
            }
            return tx.role.findUnique({
                where: { id },
                include: { permissions: true },
            });
        });
    }
    async remove(id) {
        const role = await this.findOne(id);
        if (role.isSystem) {
            throw new common_1.BadRequestException('System roles cannot be deleted');
        }
        const inUse = await this.prisma.companyUser.findFirst({
            where: { customRoleId: id },
        });
        if (inUse) {
            throw new common_1.ConflictException('Role is currently assigned to users and cannot be deleted');
        }
        return this.prisma.role.delete({
            where: { id },
        });
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RolesService);
//# sourceMappingURL=roles.service.js.map