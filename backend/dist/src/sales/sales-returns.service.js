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
exports.SalesReturnsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const company_context_1 = require("../common/context/company-context");
const pagination_1 = require("../common/pagination");
let SalesReturnsService = class SalesReturnsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId)
            throw new common_1.ConflictException('Company context required');
        const { skip, take } = (0, pagination_1.getPagination)(query);
        const [data, total] = await this.prisma.$transaction([
            this.prisma.salesReturn.findMany({
                where: { companyId },
                skip,
                take,
                include: { businessPartner: true, items: true },
                orderBy: { date: 'desc' },
            }),
            this.prisma.salesReturn.count({ where: { companyId } }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId)
            throw new common_1.ConflictException('Company context required');
        const salesReturn = await this.prisma.salesReturn.findFirst({
            where: { id, companyId },
            include: { businessPartner: true, items: true },
        });
        if (!salesReturn)
            throw new common_1.NotFoundException('Sales Return not found');
        return salesReturn;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId)
            throw new common_1.ConflictException('Company context required');
        return this.prisma.$transaction(async (tx) => {
            const salesReturn = await tx.salesReturn.create({
                data: {
                    companyId,
                    businessPartnerId: dto.businessPartnerId,
                    originalInvoiceId: dto.originalInvoiceId || null,
                    returnNumber: dto.returnNumber || `SR-${Date.now()}`,
                    date: new Date(dto.date),
                    reason: dto.reason,
                    returnType: 'CREDIT_NOTE',
                    status: 'COMPLETED',
                    subTotal: dto.subTotal || 0,
                    grandTotal: dto.grandTotal || 0,
                    createdById: dto.userId || 'system',
                    items: {
                        create: dto.items.map((i) => ({
                            productId: i.productId,
                            description: i.description,
                            qty: i.qty,
                            rate: i.rate,
                            taxPercent: i.taxPercent || 0,
                            taxAmount: i.taxAmount || 0,
                            total: i.total || 0,
                        })),
                    }
                },
                include: { items: true }
            });
            await tx.businessPartner.update({
                where: { id: dto.businessPartnerId },
                data: { receivableBalance: { decrement: dto.grandTotal } }
            });
            let srAccount = await tx.account.findFirst({ where: { companyId, name: 'Sales Returns' } });
            if (!srAccount) {
                srAccount = await tx.account.create({
                    data: { companyId, name: 'Sales Returns', category: 'REVENUE', subCategory: 'SALES_RETURNS', balance: 0 }
                });
            }
            const arAccount = await tx.account.findFirst({ where: { companyId, name: 'Accounts Receivable' } });
            if (arAccount) {
                await tx.journalEntry.create({
                    data: {
                        companyId,
                        date: new Date(dto.date),
                        reference: salesReturn.returnNumber,
                        description: `Sales Return ${salesReturn.returnNumber}`,
                        lines: {
                            create: [
                                { accountId: srAccount.id, debit: dto.grandTotal, credit: 0 },
                                { accountId: arAccount.id, debit: 0, credit: dto.grandTotal },
                            ]
                        }
                    }
                });
                await tx.account.update({ where: { id: srAccount.id }, data: { balance: { decrement: dto.grandTotal } } });
                await tx.account.update({ where: { id: arAccount.id }, data: { balance: { decrement: dto.grandTotal } } });
            }
            for (const item of dto.items) {
                if (item.productId) {
                    const stock = await tx.stock.findFirst({ where: { companyId, productId: item.productId } });
                    if (stock) {
                        await tx.stock.update({
                            where: { id: stock.id },
                            data: { quantity: { increment: item.qty }, availableQuantity: { increment: item.qty } }
                        });
                        await tx.stockLedger.create({
                            data: {
                                companyId,
                                productId: item.productId,
                                type: 'RETURN',
                                quantityBefore: stock.quantity,
                                quantityChange: item.qty,
                                quantityAfter: Number(stock.quantity) + Number(item.qty),
                                referenceId: salesReturn.id,
                                referenceType: 'SALES_RETURN'
                            }
                        });
                    }
                }
            }
            return salesReturn;
        });
    }
};
exports.SalesReturnsService = SalesReturnsService;
exports.SalesReturnsService = SalesReturnsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalesReturnsService);
//# sourceMappingURL=sales-returns.service.js.map