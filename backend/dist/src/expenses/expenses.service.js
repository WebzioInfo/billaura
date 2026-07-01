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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let ExpensesService = class ExpensesService {
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
                        { expenseNo: { contains: query.search } },
                        { description: { contains: query.search } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.expense.findMany({
                where,
                skip,
                take,
                include: { bankAccount: true },
                orderBy: { date: 'desc' },
            }),
            this.prisma.expense.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const expense = await this.prisma.expense.findFirst({
            where: { id, companyId, deletedAt: null },
            include: { bankAccount: true },
        });
        if (!expense) {
            throw new common_1.NotFoundException(`Expense with ID ${id} not found`);
        }
        return expense;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        let bank = null;
        if (dto.bankAccountId) {
            bank = await this.prisma.bankAccount.findFirst({
                where: { id: dto.bankAccountId, companyId, deletedAt: null },
            });
            if (!bank) {
                throw new common_1.NotFoundException(`Bank Account with ID ${dto.bankAccountId} not found`);
            }
        }
        return this.prisma.$transaction(async (tx) => {
            let sequence = await tx.documentSequence.findFirst({
                where: { companyId, documentType: 'EXPENSE' },
            });
            if (!sequence) {
                sequence = await tx.documentSequence.create({
                    data: {
                        companyId,
                        documentType: 'EXPENSE',
                        currentNumber: 0,
                    },
                });
            }
            const nextNumber = sequence.currentNumber + 1;
            await tx.documentSequence.update({
                where: { id: sequence.id },
                data: { currentNumber: nextNumber },
            });
            const expenseNo = `EXP-${String(nextNumber).padStart(5, '0')}`;
            const amount = Number(dto.amount);
            const taxAmount = Number(dto.taxAmount || 0);
            const totalAmount = amount + taxAmount;
            const expense = await tx.expense.create({
                data: {
                    companyId,
                    category: dto.category,
                    bankAccountId: dto.bankAccountId || null,
                    expenseNo,
                    billNumber: dto.billNumber || null,
                    date: new Date(dto.date),
                    amount,
                    taxAmount,
                    totalAmount,
                    paymentMethod: dto.paymentMethod || null,
                    status: 'APPROVED',
                    reference: dto.reference || null,
                    description: dto.description || null,
                    notes: dto.notes || null,
                },
            });
            if (dto.bankAccountId) {
                await tx.bankAccount.update({
                    where: { id: dto.bankAccountId },
                    data: {
                        currentBalance: {
                            decrement: totalAmount,
                        },
                    },
                });
            }
            let expenseAccount = await tx.account.findFirst({
                where: { companyId, name: dto.category },
            });
            if (!expenseAccount) {
                expenseAccount = await tx.account.create({
                    data: { companyId, name: dto.category, category: 'EXPENSE', balance: 0 },
                });
            }
            let creditAccountName = 'Operating Bank Account';
            if (bank?.name) {
                creditAccountName = bank.name;
            }
            let creditAccount = await tx.account.findFirst({
                where: { companyId, name: creditAccountName },
            });
            if (!creditAccount) {
                creditAccount = await tx.account.create({
                    data: { companyId, name: creditAccountName, category: 'ASSET', balance: 0 },
                });
            }
            await tx.journalEntry.create({
                data: {
                    companyId,
                    date: new Date(dto.date),
                    reference: expenseNo,
                    description: dto.description || `Automatic expense posting ${expenseNo}`,
                    lines: {
                        create: [
                            { accountId: expenseAccount.id, debit: totalAmount, credit: 0 },
                            { accountId: creditAccount.id, debit: 0, credit: totalAmount },
                        ],
                    },
                },
            });
            await tx.account.update({
                where: { id: expenseAccount.id },
                data: { balance: { increment: totalAmount } },
            });
            await tx.account.update({
                where: { id: creditAccount.id },
                data: { balance: { decrement: totalAmount } },
            });
            return expense;
        }, { timeout: 20000 });
    }
    async remove(id) {
        const expense = await this.findOne(id);
        return this.prisma.$transaction(async (tx) => {
            if (expense.bankAccountId) {
                await tx.bankAccount.update({
                    where: { id: expense.bankAccountId },
                    data: {
                        currentBalance: {
                            increment: Number(expense.totalAmount),
                        },
                    },
                });
            }
            return tx.expense.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
        });
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map