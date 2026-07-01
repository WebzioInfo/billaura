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
exports.CrmActivitiesController = void 0;
const common_1 = require("@nestjs/common");
const crm_activities_service_1 = require("./crm-activities.service");
const activity_dto_1 = require("./dto/activity.dto");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
let CrmActivitiesController = class CrmActivitiesController {
    crmActivitiesService;
    constructor(crmActivitiesService) {
        this.crmActivitiesService = crmActivitiesService;
    }
    async findAll(query) {
        return this.crmActivitiesService.findAll(query);
    }
    async findOne(id) {
        return this.crmActivitiesService.findOne(id);
    }
    async create(createActivityDto) {
        return this.crmActivitiesService.create(createActivityDto);
    }
    async update(id, updateActivityDto) {
        return this.crmActivitiesService.update(id, updateActivityDto);
    }
    async remove(id) {
        await this.crmActivitiesService.remove(id);
    }
};
exports.CrmActivitiesController = CrmActivitiesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], CrmActivitiesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrmActivitiesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activity_dto_1.CreateActivityDto]),
    __metadata("design:returntype", Promise)
], CrmActivitiesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, activity_dto_1.UpdateActivityDto]),
    __metadata("design:returntype", Promise)
], CrmActivitiesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrmActivitiesController.prototype, "remove", null);
exports.CrmActivitiesController = CrmActivitiesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('crm/activities'),
    __metadata("design:paramtypes", [crm_activities_service_1.CrmActivitiesService])
], CrmActivitiesController);
//# sourceMappingURL=crm-activities.controller.js.map