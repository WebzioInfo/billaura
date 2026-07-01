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
exports.JournalEntriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let JournalEntriesService = class JournalEntriesService {
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
                    description: { contains: query.search },
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.journalEntry.findMany({
                where,
                skip,
                take,
                include: { lines: { include: { account: true } } },
                orderBy: { date: 'desc' },
            }),
            this.prisma.journalEntry.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const entry = await this.prisma.journalEntry.findFirst({
            where: { id, companyId },
            include: { lines: { include: { account: true } } },
        });
        if (!entry) {
            throw new common_1.NotFoundException(`Journal Entry with ID ${id} not found`);
        }
        return entry;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        let sumDebit = 0;
        let sumCredit = 0;
        for (const line of dto.lines) {
            sumDebit += Number(line.debit || 0);
            sumCredit += Number(line.credit || 0);
        }
        if (Math.abs(sumDebit - sumCredit) > 0.01) {
            throw new common_1.BadRequestException(`Unbalanced journal entry. Total debits (${sumDebit}) must equal total credits (${sumCredit})`);
        }
        return this.prisma.$transaction(async (tx) => {
            const entry = await tx.journalEntry.create({
                data: {
                    companyId,
                    date: new Date(dto.date),
                    reference: dto.reference || null,
                    description: dto.description || null,
                    lines: {
                        create: dto.lines.map((l) => ({
                            accountId: l.accountId,
                            debit: Number(l.debit || 0),
                            credit: Number(l.credit || 0),
                        })),
                    },
                },
                include: { lines: true },
            });
            for (const line of dto.lines) {
                const change = Number(line.debit || 0) - Number(line.credit || 0);
                await tx.account.update({
                    where: { id: line.accountId },
                    data: {
                        balance: {
                            increment: change,
                        },
                    },
                });
            }
            return entry;
        }, { timeout: 20000 });
    }
};
exports.JournalEntriesService = JournalEntriesService;
exports.JournalEntriesService = JournalEntriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JournalEntriesService);
//# sourceMappingURL=journal-entries.service.js.map