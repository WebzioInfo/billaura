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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let PaymentsService = class PaymentsService {
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
                        { customer: { name: { contains: query.search } } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.payment.findMany({
                where,
                skip,
                take,
                include: { customer: true, bankAccount: true },
                orderBy: { date: 'desc' },
            }),
            this.prisma.payment.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const payment = await this.prisma.payment.findFirst({
            where: { id, companyId, deletedAt: null },
            include: { customer: true, bankAccount: true, allocations: { include: { invoice: true } } },
        });
        if (!payment) {
            throw new common_1.NotFoundException(`Payment with ID ${id} not found`);
        }
        return payment;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const customer = await this.prisma.customer.findFirst({
            where: { id: dto.customerId, companyId, deletedAt: null },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${dto.customerId} not found`);
        }
        const bank = await this.prisma.bankAccount.findFirst({
            where: { id: dto.bankAccountId, companyId, deletedAt: null },
        });
        if (!bank) {
            throw new common_1.NotFoundException(`Bank Account with ID ${dto.bankAccountId} not found`);
        }
        return this.prisma.$transaction(async (tx) => {
            let sequence = await tx.documentSequence.findFirst({
                where: { companyId, documentType: 'PAYMENT' },
            });
            if (!sequence) {
                sequence = await tx.documentSequence.create({
                    data: {
                        companyId,
                        documentType: 'PAYMENT',
                        currentNumber: 0,
                    },
                });
            }
            const nextNumber = sequence.currentNumber + 1;
            await tx.documentSequence.update({
                where: { id: sequence.id },
                data: { currentNumber: nextNumber },
            });
            const paymentNo = `PAY-${String(nextNumber).padStart(5, '0')}`;
            const payment = await tx.payment.create({
                data: {
                    companyId,
                    customerId: dto.customerId,
                    bankAccountId: dto.bankAccountId,
                    paymentNo,
                    date: new Date(dto.date),
                    amount: dto.amount,
                    method: dto.method,
                    reference: dto.reference || null,
                    notes: dto.notes || null,
                },
            });
            let remainingPayment = Number(dto.amount);
            const invoices = await tx.invoice.findMany({
                where: {
                    companyId,
                    customerId: dto.customerId,
                    deletedAt: null,
                    NOT: { status: 'PAID' },
                },
                orderBy: { date: 'asc' },
            });
            for (const inv of invoices) {
                if (remainingPayment <= 0)
                    break;
                const unpaidAmount = Number(inv.grandTotal) - Number(inv.amountPaid);
                const allocate = Math.min(remainingPayment, unpaidAmount);
                if (allocate > 0) {
                    const newAmountPaid = Number(inv.amountPaid) + allocate;
                    const status = newAmountPaid >= Number(inv.grandTotal) ? 'PAID' : 'PARTIAL';
                    await tx.invoice.update({
                        where: { id: inv.id },
                        data: {
                            amountPaid: newAmountPaid,
                            status,
                        },
                    });
                    await tx.paymentAllocation.create({
                        data: {
                            paymentId: payment.id,
                            invoiceId: inv.id,
                            amount: allocate,
                        },
                    });
                    remainingPayment -= allocate;
                }
            }
            await tx.customer.update({
                where: { id: dto.customerId },
                data: {
                    outstandingAmount: {
                        decrement: dto.amount,
                    },
                },
            });
            await tx.bankAccount.update({
                where: { id: dto.bankAccountId },
                data: {
                    currentBalance: {
                        increment: dto.amount,
                    },
                },
            });
            await tx.customerStatement.create({
                data: {
                    companyId,
                    customerId: dto.customerId,
                    date: new Date(dto.date),
                    type: 'PAYMENT',
                    reference: paymentNo,
                    debit: 0,
                    credit: dto.amount,
                    balance: Number(customer.outstandingAmount) - dto.amount,
                },
            });
            let arAccount = await tx.account.findFirst({
                where: { companyId, name: 'Accounts Receivable' },
            });
            if (!arAccount) {
                arAccount = await tx.account.create({
                    data: { companyId, name: 'Accounts Receivable', category: 'ASSET', balance: 0 },
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
                    description: `Automatic payment posting ${paymentNo}`,
                    lines: {
                        create: [
                            { accountId: bankAccount.id, debit: dto.amount, credit: 0 },
                            { accountId: arAccount.id, debit: 0, credit: dto.amount },
                        ],
                    },
                },
            });
            await tx.account.update({
                where: { id: bankAccount.id },
                data: { balance: { increment: dto.amount } },
            });
            await tx.account.update({
                where: { id: arAccount.id },
                data: { balance: { decrement: dto.amount } },
            });
            return payment;
        }, { timeout: 20000 });
    }
    async remove(id) {
        const payment = await this.findOne(id);
        return this.prisma.$transaction(async (tx) => {
            for (const alloc of payment.allocations) {
                const inv = await tx.invoice.findFirst({ where: { id: alloc.invoiceId } });
                if (inv) {
                    const revertedPaid = Number(inv.amountPaid) - Number(alloc.amount);
                    const status = revertedPaid <= 0 ? 'SENT' : 'PARTIAL';
                    await tx.invoice.update({
                        where: { id: inv.id },
                        data: { amountPaid: revertedPaid, status },
                    });
                }
            }
            await tx.customer.update({
                where: { id: payment.customerId },
                data: {
                    outstandingAmount: {
                        increment: payment.amount,
                    },
                },
            });
            await tx.bankAccount.update({
                where: { id: payment.bankAccountId },
                data: {
                    currentBalance: {
                        decrement: payment.amount,
                    },
                },
            });
            return tx.payment.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map