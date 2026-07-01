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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchasePaymentsController = void 0;
const common_1 = require("@nestjs/common");
const purchase_payments_service_1 = require("./purchase-payments.service");
const purchase_payment_dto_1 = require("./dto/purchase-payment.dto");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
let PurchasePaymentsController = class PurchasePaymentsController {
    purchasePaymentsService;
    constructor(purchasePaymentsService) {
        this.purchasePaymentsService = purchasePaymentsService;
    }
    async findAll(query) {
        return this.purchasePaymentsService.findAll(query);
    }
    async findOne(id) {
        return this.purchasePaymentsService.findOne(id);
    }
    async create(dto) {
        return this.purchasePaymentsService.create(dto);
    }
    async remove(id) {
        await this.purchasePaymentsService.remove(id);
    }
};
exports.PurchasePaymentsController = PurchasePaymentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], PurchasePaymentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PurchasePaymentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [purchase_payment_dto_1.CreatePurchasePaymentDto]),
    __metadata("design:returntype", Promise)
], PurchasePaymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PurchasePaymentsController.prototype, "remove", null);
exports.PurchasePaymentsController = PurchasePaymentsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('purchases/payments'),
    __metadata("design:paramtypes", [purchase_payments_service_1.PurchasePaymentsService])
], PurchasePaymentsController);
//# sourceMappingURL=purchase-payments.controller.js.map