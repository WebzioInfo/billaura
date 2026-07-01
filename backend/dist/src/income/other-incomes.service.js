"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtherIncomesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
let OtherIncomesService = class OtherIncomesService {
    async findAll(companyId) {
        return prisma.otherIncome.findMany({
            where: { companyId },
            include: {
                category: {
                    include: { account: true }
                },
                businessPartner: true,
                bankAccount: true,
                branch: true,
                employee: true,
            },
            orderBy: { date: 'desc' },
        });
    }
    async findOne(companyId, id) {
        const income = await prisma.otherIncome.findFirst({
            where: { id, companyId },
            include: {
                category: {
                    include: { account: true }
                },
                businessPartner: true,
                bankAccount: true,
                branch: true,
                employee: true,
            },
        });
        if (!income) {
            throw new common_1.NotFoundException('Other Income not found');
        }
        return income;
    }
    async create(companyId, data) {
        return prisma.$transaction(async (tx) => {
            const income = await tx.otherIncome.create({
                data: {
                    ...data,
                    companyId,
                },
                include: {
                    category: {
                        include: { account: true }
                    },
                    bankAccount: true,
                }
            });
            if (income.paymentStatus === 'PAID') {
                await this.generateJournalEntry(tx, income);
            }
            return income;
        });
    }
    async update(companyId, id, data) {
        return prisma.$transaction(async (tx) => {
            const existing = await tx.otherIncome.findFirst({
                where: { id, companyId }
            });
            if (!existing)
                throw new common_1.NotFoundException('Other Income not found');
            const income = await tx.otherIncome.update({
                where: { id: existing.id },
                data,
                include: {
                    category: {
                        include: { account: true }
                    },
                    bankAccount: true,
                }
            });
            const je = await tx.journalEntry.findFirst({
                where: { companyId, reference: income.incomeNo }
            });
            if (je) {
                await tx.journalEntry.delete({ where: { id: je.id } });
            }
            if (income.paymentStatus === 'PAID') {
                await this.generateJournalEntry(tx, income);
            }
            return income;
        });
    }
    async remove(companyId, id) {
        return prisma.$transaction(async (tx) => {
            const existing = await tx.otherIncome.findFirst({
                where: { id, companyId }
            });
            if (!existing)
                throw new common_1.NotFoundException('Other Income not found');
            const je = await tx.journalEntry.findFirst({
                where: { companyId, reference: existing.incomeNo }
            });
            if (je) {
                await tx.journalEntry.delete({ where: { id: je.id } });
            }
            return tx.otherIncome.delete({
                where: { id: existing.id },
            });
        });
    }
    async generateJournalEntry(tx, income) {
        if (!income.category?.account) {
            throw new common_1.BadRequestException('Income Category does not have a mapped GL account');
        }
        const revenueCredit = Number(income.subTotal) - Number(income.discount || 0) + Number(income.freight || 0);
        const lines = [
            {
                accountId: income.category.accountId,
                credit: revenueCredit,
                debit: 0,
            }
        ];
        if (Number(income.cgstAmount) > 0) {
            const cgstAccount = await this.getSystemAccount(tx, income.companyId, 'Output CGST');
            lines.push({ accountId: cgstAccount.id, credit: Number(income.cgstAmount), debit: 0 });
        }
        if (Number(income.sgstAmount) > 0) {
            const sgstAccount = await this.getSystemAccount(tx, income.companyId, 'Output SGST');
            lines.push({ accountId: sgstAccount.id, credit: Number(income.sgstAmount), debit: 0 });
        }
        if (Number(income.igstAmount) > 0) {
            const igstAccount = await this.getSystemAccount(tx, income.companyId, 'Output IGST');
            lines.push({ accountId: igstAccount.id, credit: Number(income.igstAmount), debit: 0 });
        }
        let assetAccountId = null;
        if (income.paymentMethod === 'CASH') {
            const cashAccount = await this.getSystemAccount(tx, income.companyId, 'Cash');
            assetAccountId = cashAccount.id;
        }
        else {
            if (!income.bankAccountId)
                throw new common_1.BadRequestException('Bank account is required for bank payments');
            const bankAccount = await tx.account.findFirst({
                where: { companyId: income.companyId, name: income.bankAccount.name }
            });
            if (!bankAccount)
                throw new common_1.BadRequestException(`GL Account for bank ${income.bankAccount.name} not found`);
            assetAccountId = bankAccount.id;
        }
        lines.push({
            accountId: assetAccountId,
            debit: Number(income.grandTotal),
            credit: 0,
        });
        await tx.journalEntry.create({
            data: {
                companyId: income.companyId,
                date: income.date,
                reference: income.incomeNo,
                description: `Service Income Receipt: ${income.incomeNo}`,
                lines: {
                    create: lines,
                }
            }
        });
    }
    async getSystemAccount(tx, companyId, name) {
        const acc = await tx.account.findFirst({ where: { companyId, name } });
        if (!acc)
            throw new common_1.BadRequestException(`System account ${name} not found. Please run the setup seed.`);
        return acc;
    }
};
exports.OtherIncomesService = OtherIncomesService;
exports.OtherIncomesService = OtherIncomesService = __decorate([
    (0, common_1.Injectable)()
], OtherIncomesService);
//# sourceMappingURL=other-incomes.service.js.map