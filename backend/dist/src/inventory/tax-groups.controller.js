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
exports.TaxGroupsController = void 0;
const common_1 = require("@nestjs/common");
const tax_groups_service_1 = require("./tax-groups.service");
const tax_group_dto_1 = require("./dto/tax-group.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
let TaxGroupsController = class TaxGroupsController {
    taxGroupsService;
    constructor(taxGroupsService) {
        this.taxGroupsService = taxGroupsService;
    }
    findAll() {
        return this.taxGroupsService.findAll();
    }
    create(createTaxGroupDto) {
        return this.taxGroupsService.create(createTaxGroupDto);
    }
};
exports.TaxGroupsController = TaxGroupsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TaxGroupsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [tax_group_dto_1.CreateTaxGroupDto]),
    __metadata("design:returntype", void 0)
], TaxGroupsController.prototype, "create", null);
exports.TaxGroupsController = TaxGroupsController = __decorate([
    (0, common_1.Controller)('tax-groups'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [tax_groups_service_1.TaxGroupsService])
], TaxGroupsController);
//# sourceMappingURL=tax-groups.controller.js.map