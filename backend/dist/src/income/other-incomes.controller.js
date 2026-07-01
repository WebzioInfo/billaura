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
exports.OtherIncomesController = void 0;
const common_1 = require("@nestjs/common");
const other_incomes_service_1 = require("./other-incomes.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let OtherIncomesController = class OtherIncomesController {
    otherIncomesService;
    constructor(otherIncomesService) {
        this.otherIncomesService = otherIncomesService;
    }
    findAll(req) {
        return this.otherIncomesService.findAll(req.user.companyId);
    }
    findOne(req, id) {
        return this.otherIncomesService.findOne(req.user.companyId, id);
    }
    create(req, data) {
        return this.otherIncomesService.create(req.user.companyId, data);
    }
    update(req, id, data) {
        return this.otherIncomesService.update(req.user.companyId, id, data);
    }
    remove(req, id) {
        return this.otherIncomesService.remove(req.user.companyId, id);
    }
};
exports.OtherIncomesController = OtherIncomesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OtherIncomesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OtherIncomesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], OtherIncomesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], OtherIncomesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OtherIncomesController.prototype, "remove", null);
exports.OtherIncomesController = OtherIncomesController = __decorate([
    (0, common_1.Controller)('other-incomes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [other_incomes_service_1.OtherIncomesService])
], OtherIncomesController);
//# sourceMappingURL=other-incomes.controller.js.map