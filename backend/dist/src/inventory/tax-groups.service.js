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
exports.TaxGroupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const company_context_1 = require("../common/context/company-context");
let TaxGroupsService = class TaxGroupsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId)
            throw new common_1.ConflictException('Company context is required');
        return this.prisma.taxGroup.findMany({
            where: { companyId },
            orderBy: { name: 'asc' },
        });
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId)
            throw new common_1.ConflictException('Company context is required');
        const existing = await this.prisma.taxGroup.findFirst({
            where: { companyId, name: dto.name },
        });
        if (existing) {
            throw new common_1.ConflictException(`Tax Group with name ${dto.name} already exists`);
        }
        return this.prisma.taxGroup.create({
            data: {
                name: dto.name,
                totalRate: dto.totalRate || 0,
                cgstRate: dto.cgstRate || 0,
                sgstRate: dto.sgstRate || 0,
                igstRate: dto.igstRate || 0,
                cessRate: dto.cessRate || 0,
                companyId
            },
        });
    }
};
exports.TaxGroupsService = TaxGroupsService;
exports.TaxGroupsService = TaxGroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TaxGroupsService);
//# sourceMappingURL=tax-groups.service.js.map