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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pagination_1 = require("../common/pagination");
const company_context_1 = require("../common/context/company-context");
let InventoryService = class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async adjustStock(dto) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const product = await this.prisma.product.findFirst({
            where: { id: dto.productId, companyId, deletedAt: null },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${dto.productId} not found`);
        }
        const warehouse = await this.prisma.warehouse.findFirst({
            where: { id: dto.warehouseId, companyId },
        });
        if (!warehouse) {
            throw new common_1.NotFoundException(`Warehouse with ID ${dto.warehouseId} not found`);
        }
        return this.prisma.$transaction(async (tx) => {
            const existingStock = await tx.stock.findFirst({
                where: { companyId, productId: dto.productId, warehouseId: dto.warehouseId },
            });
            const qtyBefore = existingStock ? Number(existingStock.quantity) : 0;
            const qtyChange = Number(dto.quantityChange);
            const qtyAfter = qtyBefore + qtyChange;
            if (qtyAfter < 0) {
                throw new common_1.ConflictException(`Adjustment results in negative stock (${qtyAfter}) in warehouse '${warehouse.name}'`);
            }
            let stock;
            if (existingStock) {
                stock = await tx.stock.update({
                    where: { id: existingStock.id },
                    data: {
                        quantity: qtyAfter,
                        availableQuantity: qtyAfter,
                    },
                });
            }
            else {
                stock = await tx.stock.create({
                    data: {
                        companyId,
                        productId: dto.productId,
                        warehouseId: dto.warehouseId,
                        quantity: qtyAfter,
                        availableQuantity: qtyAfter,
                    },
                });
            }
            await tx.stockLedger.create({
                data: {
                    companyId,
                    productId: dto.productId,
                    type: 'ADJUSTMENT',
                    quantityBefore: qtyBefore,
                    quantityChange: qtyChange,
                    quantityAfter: qtyAfter,
                    notes: dto.notes || 'Manual inventory adjustment',
                    referenceType: 'ADJUSTMENT',
                },
            });
            return stock;
        });
    }
    async getStocks(query) {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const { skip, take } = (0, pagination_1.getPagination)(query);
        const where = {
            companyId,
            product: {
                deletedAt: null,
                ...(query.search
                    ? {
                        OR: [
                            { name: { contains: query.search } },
                            { sku: { contains: query.search } },
                        ],
                    }
                    : {}),
            },
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.stock.findMany({
                where,
                skip,
                take,
                include: { product: true, warehouse: true },
            }),
            this.prisma.stock.count({ where }),
        ]);
        return (0, pagination_1.toPaginatedResult)(data, total, query);
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map