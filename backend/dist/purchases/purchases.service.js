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
exports.PurchasesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let PurchasesService = class PurchasesService {
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
                        { purchaseNo: { contains: query.search } },
                        { vendor: { name: { contains: query.search } } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.purchase.findMany({
                where,
                skip,
                take,
                include: { vendor: true, items: { include: { product: true } } },
                orderBy: { date: 'desc' },
            }),
            this.prisma.purchase.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const purchase = await this.prisma.purchase.findFirst({
            where: { id, companyId, deletedAt: null },
            include: { vendor: true, items: { include: { product: true } } },
        });
        if (!purchase) {
            throw new common_1.NotFoundException(`Purchase with ID ${id} not found`);
        }
        return purchase;
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
        return this.prisma.$transaction(async (tx) => {
            let sequence = await tx.documentSequence.findFirst({
                where: { companyId, documentType: 'PURCHASE' },
            });
            if (!sequence) {
                sequence = await tx.documentSequence.create({
                    data: {
                        companyId,
                        documentType: 'PURCHASE',
                        currentNumber: 0,
                    },
                });
            }
            const nextNumber = sequence.currentNumber + 1;
            await tx.documentSequence.update({
                where: { id: sequence.id },
                data: { currentNumber: nextNumber },
            });
            const purchaseNo = `PUR-${String(nextNumber).padStart(5, '0')}`;
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
            const purchase = await tx.purchase.create({
                data: {
                    companyId,
                    vendorId: dto.vendorId,
                    purchaseNo,
                    date: new Date(dto.date),
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
            await tx.vendor.update({
                where: { id: dto.vendorId },
                data: {
                    payableBalance: {
                        increment: grandTotal,
                    },
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
                    const newQty = currentQty + item.qty;
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
                            type: 'PURCHASE',
                            quantity: item.qty,
                            referenceId: purchase.id,
                        },
                    });
                    await tx.stockLog.create({
                        data: {
                            companyId,
                            productId: item.productId,
                            type: 'PURCHASE',
                            quantityBefore: currentQty,
                            quantityChange: item.qty,
                            quantityAfter: newQty,
                            notes: `Received via Purchase ${purchaseNo}`,
                            referenceId: purchase.id,
                        },
                    });
                }
            }
            let inventoryAccount = await tx.account.findFirst({
                where: { companyId, name: 'Inventory Asset' },
            });
            if (!inventoryAccount) {
                inventoryAccount = await tx.account.create({
                    data: { companyId, name: 'Inventory Asset', category: 'ASSET', balance: 0 },
                });
            }
            let apAccount = await tx.account.findFirst({
                where: { companyId, name: 'Accounts Payable' },
            });
            if (!apAccount) {
                apAccount = await tx.account.create({
                    data: { companyId, name: 'Accounts Payable', category: 'LIABILITY', balance: 0 },
                });
            }
            await tx.journalEntry.create({
                data: {
                    companyId,
                    date: new Date(dto.date),
                    reference: purchaseNo,
                    description: `Automatic purchase billing posting ${purchaseNo}`,
                    lines: {
                        create: [
                            { accountId: inventoryAccount.id, debit: grandTotal, credit: 0 },
                            { accountId: apAccount.id, debit: 0, credit: grandTotal },
                        ],
                    },
                },
            });
            await tx.account.update({
                where: { id: inventoryAccount.id },
                data: { balance: { increment: grandTotal } },
            });
            await tx.account.update({
                where: { id: apAccount.id },
                data: { balance: { decrement: grandTotal } },
            });
            return purchase;
        }, { timeout: 20000 });
    }
    async remove(id) {
        const purchase = await this.findOne(id);
        if (purchase.status === 'PAID') {
            throw new common_1.BadRequestException('Cannot delete a fully paid purchase');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.vendor.update({
                where: { id: purchase.vendorId },
                data: {
                    payableBalance: {
                        decrement: purchase.grandTotal,
                    },
                },
            });
            return tx.purchase.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
        });
    }
};
exports.PurchasesService = PurchasesService;
exports.PurchasesService = PurchasesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PurchasesService);
//# sourceMappingURL=purchases.service.js.map