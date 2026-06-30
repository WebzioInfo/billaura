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
exports.PurchasePaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let PurchasePaymentsService = class PurchasePaymentsService {
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
                        { paymentNo: { contains: query.search } },
                        { vendor: { name: { contains: query.search } } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.purchasePayment.findMany({
                where,
                skip,
                take,
                include: { vendor: true, bankAccount: true },
                orderBy: { date: 'desc' },
            }),
            this.prisma.purchasePayment.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const payment = await this.prisma.purchasePayment.findFirst({
            where: { id, companyId, deletedAt: null },
            include: { vendor: true, bankAccount: true, purchase: true },
        });
        if (!payment) {
            throw new common_1.NotFoundException(`Purchase Payment with ID ${id} not found`);
        }
        return payment;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const vendor = await this.prisma.vendor.findFirst({
            where: { id: dto.vendorId, companyId, deletedAt: null },
        });
        if (!vendor) {
            throw new common_1.NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
        }
        const bank = await this.prisma.bankAccount.findFirst({
            where: { id: dto.bankAccountId, companyId, deletedAt: null },
        });
        if (!bank) {
            throw new common_1.NotFoundException(`Bank Account with ID ${dto.bankAccountId} not found`);
        }
        const purchase = await this.prisma.purchase.findFirst({
            where: { id: dto.purchaseId, companyId, deletedAt: null },
        });
        if (!purchase) {
            throw new common_1.NotFoundException(`Purchase with ID ${dto.purchaseId} not found`);
        }
        return this.prisma.$transaction(async (tx) => {
            let sequence = await tx.documentSequence.findFirst({
                where: { companyId, documentType: 'PURCHASE_PAYMENT' },
            });
            if (!sequence) {
                sequence = await tx.documentSequence.create({
                    data: {
                        companyId,
                        documentType: 'PURCHASE_PAYMENT',
                        currentNumber: 0,
                    },
                });
            }
            const nextNumber = sequence.currentNumber + 1;
            await tx.documentSequence.update({
                where: { id: sequence.id },
                data: { currentNumber: nextNumber },
            });
            const paymentNo = `PPY-${String(nextNumber).padStart(5, '0')}`;
            const payment = await tx.purchasePayment.create({
                data: {
                    companyId,
                    vendorId: dto.vendorId,
                    purchaseId: dto.purchaseId,
                    bankAccountId: dto.bankAccountId,
                    paymentNo,
                    date: new Date(dto.date),
                    amount: dto.amount,
                    method: dto.method,
                    reference: dto.reference || null,
                },
            });
            const newPaid = Number(purchase.amountPaid) + Number(dto.amount);
            const status = newPaid >= Number(purchase.grandTotal) ? 'PAID' : 'PARTIAL';
            await tx.purchase.update({
                where: { id: dto.purchaseId },
                data: {
                    amountPaid: newPaid,
                    status,
                },
            });
            await tx.vendor.update({
                where: { id: dto.vendorId },
                data: {
                    payableBalance: {
                        decrement: dto.amount,
                    },
                },
            });
            await tx.bankAccount.update({
                where: { id: dto.bankAccountId },
                data: {
                    currentBalance: {
                        decrement: dto.amount,
                    },
                },
            });
            let apAccount = await tx.account.findFirst({
                where: { companyId, name: 'Accounts Payable' },
            });
            if (!apAccount) {
                apAccount = await tx.account.create({
                    data: { companyId, name: 'Accounts Payable', category: 'LIABILITY', balance: 0 },
                });
            }
            let bankAccount = await tx.account.findFirst({
                where: { companyId, name: 'Operating Bank Account' },
            });
            if (!bankAccount) {
                bankAccount = await tx.account.create({
                    data: { companyId, name: 'Operating Bank Account', category: 'ASSET', balance: 0 },
                });
            }
            await tx.journalEntry.create({
                data: {
                    companyId,
                    date: new Date(dto.date),
                    reference: paymentNo,
                    description: `Automatic vendor payment posting ${paymentNo}`,
                    lines: {
                        create: [
                            { accountId: apAccount.id, debit: dto.amount, credit: 0 },
                            { accountId: bankAccount.id, debit: 0, credit: dto.amount },
                        ],
                    },
                },
            });
            await tx.account.update({
                where: { id: apAccount.id },
                data: { balance: { increment: dto.amount } },
            });
            await tx.account.update({
                where: { id: bankAccount.id },
                data: { balance: { decrement: dto.amount } },
            });
            return payment;
        }, { timeout: 20000 });
    }
    async remove(id) {
        const payment = await this.findOne(id);
        return this.prisma.$transaction(async (tx) => {
            const pur = await tx.purchase.findFirst({ where: { id: payment.purchaseId } });
            if (pur) {
                const revertedPaid = Number(pur.amountPaid) - Number(payment.amount);
                const status = revertedPaid <= 0 ? 'SENT' : 'PARTIAL';
                await tx.purchase.update({
                    where: { id: pur.id },
                    data: { amountPaid: revertedPaid, status },
                });
            }
            await tx.vendor.update({
                where: { id: payment.vendorId },
                data: {
                    payableBalance: {
                        increment: payment.amount,
                    },
                },
            });
            await tx.bankAccount.update({
                where: { id: payment.bankAccountId },
                data: {
                    currentBalance: {
                        increment: payment.amount,
                    },
                },
            });
            return tx.purchasePayment.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
        });
    }
};
exports.PurchasePaymentsService = PurchasePaymentsService;
exports.PurchasePaymentsService = PurchasePaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PurchasePaymentsService);
//# sourceMappingURL=purchase-payments.service.js.map