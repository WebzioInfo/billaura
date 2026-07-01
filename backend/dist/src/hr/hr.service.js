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
exports.HrService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const company_context_1 = require("../common/context/company-context");
let HrService = class HrService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findEmployees() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        return this.prisma.employee.findMany({
            where: { companyId, deletedAt: null },
            orderBy: { name: 'asc' },
        });
    }
    async createEmployee(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const existing = await this.prisma.employee.findFirst({
            where: { companyId, employeeCode: dto.employeeCode, deletedAt: null },
        });
        if (existing) {
            throw new common_1.ConflictException(`Employee code '${dto.employeeCode}' already exists`);
        }
        return this.prisma.employee.create({
            data: {
                companyId,
                employeeCode: dto.employeeCode,
                name: dto.name,
                mobile: dto.mobile || null,
                email: dto.email || null,
                department: dto.department || null,
                designation: dto.designation || null,
                basicSalary: dto.basicSalary || 0,
                salaryType: 'MONTHLY',
                status: 'ACTIVE',
            },
        });
    }
    async removeEmployee(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        return this.prisma.employee.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async findAttendances() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        return this.prisma.attendance.findMany({
            where: { companyId },
            include: { employee: true },
            orderBy: { date: 'desc' },
        });
    }
    async recordAttendance(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const employee = await this.prisma.employee.findFirst({
            where: { id: dto.employeeId, companyId, deletedAt: null },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${dto.employeeId} not found`);
        }
        const dateVal = new Date(dto.date);
        dateVal.setUTCHours(0, 0, 0, 0);
        return this.prisma.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId: dto.employeeId,
                    date: dateVal,
                },
            },
            update: {
                type: dto.type,
                notes: dto.notes || null,
            },
            create: {
                companyId,
                employeeId: dto.employeeId,
                date: dateVal,
                type: dto.type,
                notes: dto.notes || null,
            },
        });
    }
};
exports.HrService = HrService;
exports.HrService = HrService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HrService);
//# sourceMappingURL=hr.service.js.map