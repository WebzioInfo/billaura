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
exports.AccountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
const client_1 = require("@prisma/client");
let AccountsService = class AccountsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureDefaultChartOfAccounts(companyId) {
        const count = await this.prisma.account.count({ where: { companyId } });
        if (count > 0)
            return;
        const defaults = [
            { name: 'Cash in Hand', category: client_1.AccountCategory.ASSET },
            { name: 'Operating Bank Account', category: client_1.AccountCategory.ASSET },
            { name: 'Inventory Asset', category: client_1.AccountCategory.ASSET },
            { name: 'Accounts Receivable', category: client_1.AccountCategory.ASSET },
            { name: 'Accounts Payable', category: client_1.AccountCategory.LIABILITY },
            { name: 'Sales Revenue', category: client_1.AccountCategory.REVENUE },
            { name: 'Cost of Goods Sold', category: client_1.AccountCategory.EXPENSE },
            { name: 'Office Overheads', category: client_1.AccountCategory.EXPENSE },
            { name: 'Retained Earnings', category: client_1.AccountCategory.EQUITY },
        ];
        await this.prisma.account.createMany({
            data: defaults.map(d => ({
                companyId,
                name: d.name,
                category: d.category,
                balance: 0,
            })),
        });
    }
    async findAll(query) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        await this.ensureDefaultChartOfAccounts(companyId);
        const { skip, take } = (0, pagination_1.getPagination)(query);
        const where = {
            companyId,
            ...(query.search
                ? {
                    name: { contains: query.search },
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.account.findMany({
                where,
                skip,
                take,
                orderBy: { category: 'asc' },
            }),
            this.prisma.account.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const account = await this.prisma.account.findFirst({
            where: { id, companyId },
        });
        if (!account) {
            throw new common_1.NotFoundException(`Account with ID ${id} not found`);
        }
        return account;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const existing = await this.prisma.account.findFirst({
            where: { companyId, name: dto.name },
        });
        if (existing) {
            throw new common_1.ConflictException(`Account with name '${dto.name}' already exists`);
        }
        return this.prisma.account.create({
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
        const account = await this.findOne(id);
        if (dto.name && dto.name !== account.name) {
            const existing = await this.prisma.account.findFirst({
                where: { companyId, name: dto.name, NOT: { id } },
            });
            if (existing) {
                throw new common_1.ConflictException(`Account with name '${dto.name}' already exists`);
            }
        }
        return this.prisma.account.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        const account = await this.findOne(id);
        const inUse = await this.prisma.journalLine.findFirst({
            where: { accountId: id },
        });
        if (inUse) {
            throw new common_1.ConflictException('Cannot delete account with existing transactions');
        }
        return this.prisma.account.delete({
            where: { id },
        });
    }
    async getTrialBalance() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        await this.ensureDefaultChartOfAccounts(companyId);
        const accounts = await this.prisma.account.findMany({
            where: { companyId },
            include: {
                journalLines: true,
            },
        });
        return accounts.map((acc) => {
            let debit = 0;
            let credit = 0;
            acc.journalLines.forEach((l) => {
                debit += Number(l.debit || 0);
                credit += Number(l.credit || 0);
            });
            return {
                id: acc.id,
                name: acc.name,
                category: acc.category,
                debit,
                credit,
                balance: debit - credit,
            };
        });
    }
    async getProfitLoss() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        await this.ensureDefaultChartOfAccounts(companyId);
        const accounts = await this.prisma.account.findMany({
            where: {
                companyId,
                category: { in: [client_1.AccountCategory.REVENUE, client_1.AccountCategory.EXPENSE] },
            },
            include: { journalLines: true },
        });
        let totalRevenue = 0;
        let totalExpense = 0;
        const items = accounts.map((acc) => {
            let accSum = 0;
            acc.journalLines.forEach((l) => {
                accSum += Number(l.debit || 0) - Number(l.credit || 0);
            });
            const balanceVal = acc.category === client_1.AccountCategory.REVENUE ? -accSum : accSum;
            if (acc.category === client_1.AccountCategory.REVENUE) {
                totalRevenue += balanceVal;
            }
            else {
                totalExpense += balanceVal;
            }
            return {
                name: acc.name,
                category: acc.category,
                balance: balanceVal,
            };
        });
        return {
            revenue: items.filter(i => i.category === client_1.AccountCategory.REVENUE),
            expense: items.filter(i => i.category === client_1.AccountCategory.EXPENSE),
            totalRevenue,
            totalExpense,
            netProfit: totalRevenue - totalExpense,
        };
    }
    async getBalanceSheet() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        await this.ensureDefaultChartOfAccounts(companyId);
        const accounts = await this.prisma.account.findMany({
            where: {
                companyId,
                category: { in: [client_1.AccountCategory.ASSET, client_1.AccountCategory.LIABILITY, client_1.AccountCategory.EQUITY] },
            },
            include: { journalLines: true },
        });
        const items = accounts.map((acc) => {
            let accSum = 0;
            acc.journalLines.forEach((l) => {
                accSum += Number(l.debit || 0) - Number(l.credit || 0);
            });
            const balanceVal = acc.category === client_1.AccountCategory.ASSET ? accSum : -accSum;
            return {
                name: acc.name,
                category: acc.category,
                balance: balanceVal,
            };
        });
        const assets = items.filter(i => i.category === client_1.AccountCategory.ASSET);
        const liabilities = items.filter(i => i.category === client_1.AccountCategory.LIABILITY);
        const equity = items.filter(i => i.category === client_1.AccountCategory.EQUITY);
        const totalAssets = assets.reduce((s, i) => s + i.balance, 0);
        const totalLiabilities = liabilities.reduce((s, i) => s + i.balance, 0);
        const totalEquity = equity.reduce((s, i) => s + i.balance, 0);
        return {
            assets,
            liabilities,
            equity,
            totalAssets,
            totalLiabilities,
            totalEquity,
        };
    }
    async getCashFlow() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        await this.ensureDefaultChartOfAccounts(companyId);
        const cashAccounts = await this.prisma.account.findMany({
            where: {
                companyId,
                name: { in: ['Cash in Hand', 'Operating Bank Account'] },
            },
        });
        const cashAccountIds = cashAccounts.map(a => a.id);
        const journalLines = await this.prisma.journalLine.findMany({
            where: {
                accountId: { in: cashAccountIds },
            },
            include: {
                journalEntry: {
                    include: {
                        lines: {
                            include: {
                                account: true,
                            },
                        },
                    },
                },
            },
        });
        let operatingInflow = 0;
        let operatingOutflow = 0;
        let investingInflow = 0;
        let investingOutflow = 0;
        let financingInflow = 0;
        let financingOutflow = 0;
        for (const line of journalLines) {
            const isDebit = Number(line.debit) > 0;
            const amount = isDebit ? Number(line.debit) : Number(line.credit);
            const counterparties = line.journalEntry.lines.filter(l => l.accountId !== line.accountId);
            let classified = false;
            for (const cp of counterparties) {
                const cat = cp.account.category;
                if (cat === client_1.AccountCategory.REVENUE || cp.account.name === 'Accounts Receivable') {
                    if (isDebit)
                        operatingInflow += amount;
                    else
                        operatingOutflow += amount;
                    classified = true;
                    break;
                }
                else if (cat === client_1.AccountCategory.EXPENSE || cp.account.name === 'Accounts Payable') {
                    if (isDebit) {
                    }
                    else {
                        operatingOutflow += amount;
                    }
                    classified = true;
                    break;
                }
            }
            if (!classified) {
                if (isDebit)
                    operatingInflow += amount;
                else
                    operatingOutflow += amount;
            }
        }
        return {
            operatingInflow,
            operatingOutflow,
            operatingNet: operatingInflow - operatingOutflow,
            investingInflow,
            investingOutflow,
            investingNet: investingInflow - investingOutflow,
            financingInflow,
            financingOutflow,
            financingNet: financingInflow - financingOutflow,
            netCashFlow: (operatingInflow - operatingOutflow) + (investingInflow - investingOutflow) + (financingInflow - financingOutflow),
        };
    }
};
exports.AccountsService = AccountsService;
exports.AccountsService = AccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AccountsService);
//# sourceMappingURL=accounts.service.js.map