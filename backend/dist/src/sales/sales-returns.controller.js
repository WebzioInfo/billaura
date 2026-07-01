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
exports.SalesReturnsController = void 0;
const common_1 = require("@nestjs/common");
const sales_returns_service_1 = require("./sales-returns.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
let SalesReturnsController = class SalesReturnsController {
    salesReturnsService;
    constructor(salesReturnsService) {
        this.salesReturnsService = salesReturnsService;
    }
    async findAll(query) {
        return this.salesReturnsService.findAll(query);
    }
    async findOne(id) {
        return this.salesReturnsService.findOne(id);
    }
    async create(dto) {
        return this.salesReturnsService.create(dto);
    }
};
exports.SalesReturnsController = SalesReturnsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], SalesReturnsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalesReturnsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesReturnsController.prototype, "create", null);
exports.SalesReturnsController = SalesReturnsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('sales-returns'),
    __metadata("design:paramtypes", [sales_returns_service_1.SalesReturnsService])
], SalesReturnsController);
//# sourceMappingURL=sales-returns.controller.js.map