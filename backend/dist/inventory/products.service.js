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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let ProductsService = class ProductsService {
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
                        { name: { contains: query.search } },
                        { sku: { contains: query.search } },
                        { barcode: { contains: query.search } },
                    ],
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.product.findMany({
                where,
                skip,
                take,
                include: { category: true, brand: true, stocks: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.product.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const product = await this.prisma.product.findFirst({
            where: { id, companyId, deletedAt: null },
            include: { category: true, brand: true, stocks: true },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        return product;
    }
    async create(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        if (dto.sku) {
            const existing = await this.prisma.product.findFirst({
                where: { companyId, sku: dto.sku, deletedAt: null },
            });
            if (existing) {
                throw new common_1.ConflictException(`Product with SKU '${dto.sku}' already exists`);
            }
        }
        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    name: dto.name,
                    categoryId: dto.categoryId || null,
                    brandId: dto.brandId || null,
                    sku: dto.sku || null,
                    barcode: dto.barcode || null,
                    hsnCode: dto.hsnCode || null,
                    itemType: dto.itemType || 'FINISHED_GOOD',
                    taxRate: dto.taxRate || 0,
                    gstRate: dto.gstRate || 0,
                    taxType: dto.taxType || null,
                    taxCategory: dto.taxCategory || 'TAXABLE',
                    isExempt: dto.isExempt || false,
                    isNilRated: dto.isNilRated || false,
                    isNonGst: dto.isNonGst || false,
                    purchasePrice: dto.purchasePrice || 0,
                    sellingPrice: dto.sellingPrice || 0,
                    reorderLevel: dto.reorderLevel || 0,
                    companyId,
                },
            });
            const defaultWh = await tx.warehouse.findFirst({
                where: { companyId, isDefault: true },
            });
            if (defaultWh) {
                await tx.stock.create({
                    data: {
                        companyId,
                        productId: product.id,
                        warehouseId: defaultWh.id,
                        quantity: 0,
                        availableQuantity: 0,
                    },
                });
            }
            return product;
        });
    }
    async update(id, dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const product = await this.prisma.product.findFirst({
            where: { id, companyId, deletedAt: null },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        if (dto.sku && dto.sku !== product.sku) {
            const existing = await this.prisma.product.findFirst({
                where: { companyId, sku: dto.sku, deletedAt: null, NOT: { id } },
            });
            if (existing) {
                throw new common_1.ConflictException(`Product with SKU '${dto.sku}' already exists`);
            }
        }
        return this.prisma.product.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.product.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map