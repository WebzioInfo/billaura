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
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let InvoicesService = class InvoicesService {
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
                        { invoiceNo: { contains: query.search } },
                        { customer: { name: { contains: query.search } } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.invoice.findMany({
                where,
                skip,
                take,
                include: { customer: true, items: { include: { product: true } } },
                orderBy: { date: 'desc' },
            }),
            this.prisma.invoice.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, companyId, deletedAt: null },
            include: { customer: true, items: { include: { product: true } } },
        });
        if (!invoice) {
            throw new common_1.NotFoundException(`Invoice with ID ${id} not found`);
        }
        return invoice;
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
        return this.prisma.$transaction(async (tx) => {
            let sequence = await tx.documentSequence.findFirst({
                where: { companyId, documentType: 'INVOICE' },
            });
            if (!sequence) {
                sequence = await tx.documentSequence.create({
                    data: {
                        companyId,
                        documentType: 'INVOICE',
                        currentNumber: 0,
                    },
                });
            }
            const nextNumber = sequence.currentNumber + 1;
            await tx.documentSequence.update({
                where: { id: sequence.id },
                data: { currentNumber: nextNumber },
            });
            const invoiceNo = `INV-${String(nextNumber).padStart(5, '0')}`;
            let subTotal = 0;
            let taxTotal = 0;
            const itemsToCreate = [];
            for (const item of dto.items) {
                const product = await tx.product.findFirst({
                    where: { id: item.productId, companyId, deletedAt: null },
                });
                if (!product) {
                    throw new common_1.NotFoundException(`Product with ID ${item.productId} not found`);
                }
                const rate = Number(item.rate);
                const qty = Number(item.qty);
                const lineTotal = rate * qty;
                const taxRate = Number(product.taxRate || product.gstRate || 18);
                const taxAmount = (lineTotal * taxRate) / 100;
                subTotal += lineTotal;
                taxTotal += taxAmount;
                itemsToCreate.push({
                    productId: product.id,
                    description: item.description || product.name,
                    qty,
                    rate,
                    taxPercent: taxRate,
                    taxAmount,
                    total: lineTotal + taxAmount,
                    cgstAmount: taxAmount / 2,
                    sgstAmount: taxAmount / 2,
                    igstAmount: 0,
                });
            }
            const grandTotal = subTotal + taxTotal;
            const invoice = await tx.invoice.create({
                data: {
                    companyId,
                    customerId: dto.customerId,
                    invoiceNo,
                    date: new Date(dto.date),
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                    status: 'SENT',
                    subTotal,
                    taxTotal,
                    grandTotal,
                    amountPaid: 0,
                    cgstAmount: taxTotal / 2,
                    sgstAmount: taxTotal / 2,
                    igstAmount: 0,
                    cessAmount: 0,
                    totalTaxAmount: taxTotal,
                    items: {
                        create: itemsToCreate,
                    },
                },
                include: { items: true },
            });
            await tx.customer.update({
                where: { id: dto.customerId },
                data: {
                    outstandingAmount: {
                        increment: grandTotal,
                    },
                },
            });
            await tx.customerStatement.create({
                data: {
                    companyId,
                    customerId: dto.customerId,
                    date: new Date(dto.date),
                    type: 'INVOICE',
                    reference: invoiceNo,
                    debit: grandTotal,
                    credit: 0,
                    balance: Number(customer.outstandingAmount) + grandTotal,
                },
            });
            for (const item of itemsToCreate) {
                const defaultWh = await tx.warehouse.findFirst({
                    where: { companyId, isDefault: true },
                });
                if (defaultWh) {
                    const stock = await tx.stock.findFirst({
                        where: { companyId, productId: item.productId, warehouseId: defaultWh.id },
                    });
                    const currentQty = stock ? Number(stock.quantity) : 0;
                    const newQty = currentQty - item.qty;
                    if (stock) {
                        await tx.stock.update({
                            where: { id: stock.id },
                            data: {
                                quantity: newQty,
                                availableQuantity: newQty,
                            },
                        });
                    }
                    else {
                        await tx.stock.create({
                            data: {
                                companyId,
                                productId: item.productId,
                                warehouseId: defaultWh.id,
                                quantity: newQty,
                                availableQuantity: newQty,
                            },
                        });
                    }
                    await tx.stockMovement.create({
                        data: {
                            companyId,
                            productId: item.productId,
                            type: 'SALE',
                            quantity: item.qty,
                            referenceId: invoice.id,
                        },
                    });
                    await tx.stockLog.create({
                        data: {
                            companyId,
                            productId: item.productId,
                            type: 'SALE',
                            quantityBefore: currentQty,
                            quantityChange: -item.qty,
                            quantityAfter: newQty,
                            notes: `Issued via Invoice ${invoiceNo}`,
                            referenceId: invoice.id,
                        },
                    });
                }
            }
            let arAccount = await tx.account.findFirst({
                where: { companyId, name: 'Accounts Receivable' },
            });
            if (!arAccount) {
                arAccount = await tx.account.create({
                    data: { companyId, name: 'Accounts Receivable', category: 'ASSET', balance: 0 },
                });
            }
            let salesAccount = await tx.account.findFirst({
                where: { companyId, name: 'Sales Revenue' },
            });
            if (!salesAccount) {
                salesAccount = await tx.account.create({
                    data: { companyId, name: 'Sales Revenue', category: 'REVENUE', balance: 0 },
                });
            }
            await tx.journalEntry.create({
                data: {
                    companyId,
                    date: new Date(dto.date),
                    reference: invoiceNo,
                    description: `Automatic invoice posting ${invoiceNo}`,
                    lines: {
                        create: [
                            { accountId: arAccount.id, debit: grandTotal, credit: 0 },
                            { accountId: salesAccount.id, debit: 0, credit: grandTotal },
                        ],
                    },
                },
            });
            await tx.account.update({
                where: { id: arAccount.id },
                data: { balance: { increment: grandTotal } },
            });
            await tx.account.update({
                where: { id: salesAccount.id },
                data: { balance: { decrement: grandTotal } },
            });
            return invoice;
        });
    }
    async remove(id) {
        const invoice = await this.findOne(id);
        if (invoice.status === 'PAID') {
            throw new common_1.BadRequestException('Cannot delete a fully paid invoice');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.customer.update({
                where: { id: invoice.customerId },
                data: {
                    outstandingAmount: {
                        decrement: invoice.grandTotal,
                    },
                },
            });
            return tx.invoice.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
        });
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map