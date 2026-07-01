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
exports.CapitalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const company_context_1 = require("../common/context/company-context");
let CapitalService = class CapitalService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordCapitalTransaction(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId)
            throw new common_1.ConflictException('Company context required');
        return this.prisma.$transaction(async (tx) => {
            const bank = await tx.bankAccount.findFirst({
                where: { id: dto.bankAccountId, companyId },
            });
            if (!bank)
                throw new common_1.NotFoundException('Bank account not found');
            const equityAccountName = dto.type === 'INTRODUCED' ? 'Owners Capital' : 'Drawings';
            const equityAccount = await tx.account.findFirst({
                where: { companyId, name: equityAccountName }
            });
            if (!equityAccount)
                throw new common_1.NotFoundException(`Equity account '${equityAccountName}' not found`);
            const bankLedger = await tx.account.findFirst({
                where: { companyId, name: 'Bank Accounts' }
            });
            if (!bankLedger)
                throw new common_1.NotFoundException(`Ledger account 'Bank Accounts' not found`);
            let debitAccountId = '';
            let creditAccountId = '';
            if (dto.type === 'INTRODUCED') {
                debitAccountId = bankLedger.id;
                creditAccountId = equityAccount.id;
            }
            else {
                debitAccountId = equityAccount.id;
                creditAccountId = bankLedger.id;
            }
            const entry = await tx.journalEntry.create({
                data: {
                    companyId,
                    date: new Date(dto.date),
                    reference: dto.reference || `CAP-${Date.now()}`,
                    description: dto.notes || `Owner Capital ${dto.type}`,
                    lines: {
                        create: [
                            { accountId: debitAccountId, debit: dto.amount, credit: 0 },
                            { accountId: creditAccountId, debit: 0, credit: dto.amount },
                        ]
                    }
                },
                include: { lines: true }
            });
            await tx.account.update({
                where: { id: debitAccountId },
                data: { balance: { increment: dto.amount } }
            });
            await tx.account.update({
                where: { id: creditAccountId },
                data: { balance: { decrement: dto.amount } }
            });
            const bankChange = dto.type === 'INTRODUCED' ? dto.amount : -dto.amount;
            await tx.bankAccount.update({
                where: { id: bank.id },
                data: { currentBalance: { increment: bankChange } }
            });
            return entry;
        });
    }
};
exports.CapitalService = CapitalService;
exports.CapitalService = CapitalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CapitalService);
//# sourceMappingURL=capital.service.js.map