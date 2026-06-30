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
exports.QuotationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let QuotationsService = class QuotationsService {
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
                        { quotationNo: { contains: query.search } },
                        { customer: { name: { contains: query.search } } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.quotation.findMany({
                where,
                skip,
                take,
                include: { customer: true, items: { include: { product: true } } },
                orderBy: { date: 'desc' },
            }),
            this.prisma.quotation.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const quotation = await this.prisma.quotation.findFirst({
            where: { id, companyId, deletedAt: null },
            include: { customer: true, items: { include: { product: true } } },
        });
        if (!quotation) {
            throw new common_1.NotFoundException(`Quotation with ID ${id} not found`);
        }
        return quotation;
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
                where: { companyId, documentType: 'QUOTATION' },
            });
            if (!sequence) {
                sequence = await tx.documentSequence.create({
                    data: {
                        companyId,
                        documentType: 'QUOTATION',
                        currentNumber: 0,
                    },
                });
            }
            const nextNumber = sequence.currentNumber + 1;
            await tx.documentSequence.update({
                where: { id: sequence.id },
                data: { currentNumber: nextNumber },
            });
            const quotationNo = `QTN-${String(nextNumber).padStart(5, '0')}`;
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
            return tx.quotation.create({
                data: {
                    companyId,
                    customerId: dto.customerId,
                    quotationNo,
                    date: new Date(dto.date),
                    status: 'SENT',
                    subTotal,
                    taxTotal,
                    grandTotal,
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
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.quotation.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
};
exports.QuotationsService = QuotationsService;
exports.QuotationsService = QuotationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuotationsService);
//# sourceMappingURL=quotations.service.js.map