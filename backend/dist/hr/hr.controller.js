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
exports.HrController = void 0;
const common_1 = require("@nestjs/common");
const hr_service_1 = require("./hr.service");
const department_dto_1 = require("./dto/department.dto");
const designation_dto_1 = require("./dto/designation.dto");
const employee_dto_1 = require("./dto/employee.dto");
const attendance_dto_1 = require("./dto/attendance.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
let HrController = class HrController {
    hrService;
    constructor(hrService) {
        this.hrService = hrService;
    }
    async findDepartments() {
        return this.hrService.findDepartments();
    }
    async createDepartment(dto) {
        return this.hrService.createDepartment(dto);
    }
    async removeDepartment(id) {
        await this.hrService.removeDepartment(id);
    }
    async findDesignations() {
        return this.hrService.findDesignations();
    }
    async createDesignation(dto) {
        return this.hrService.createDesignation(dto);
    }
    async removeDesignation(id) {
        await this.hrService.removeDesignation(id);
    }
    async findEmployees() {
        return this.hrService.findEmployees();
    }
    async createEmployee(dto) {
        return this.hrService.createEmployee(dto);
    }
    async removeEmployee(id) {
        await this.hrService.removeEmployee(id);
    }
    async findAttendances() {
        return this.hrService.findAttendances();
    }
    async recordAttendance(dto) {
        return this.hrService.recordAttendance(dto);
    }
};
exports.HrController = HrController;
__decorate([
    (0, common_1.Get)('departments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HrController.prototype, "findDepartments", null);
__decorate([
    (0, common_1.Post)('departments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [department_dto_1.CreateDepartmentDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "createDepartment", null);
__decorate([
    (0, common_1.Delete)('departments/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "removeDepartment", null);
__decorate([
    (0, common_1.Get)('designations'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HrController.prototype, "findDesignations", null);
__decorate([
    (0, common_1.Post)('designations'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [designation_dto_1.CreateDesignationDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "createDesignation", null);
__decorate([
    (0, common_1.Delete)('designations/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "removeDesignation", null);
__decorate([
    (0, common_1.Get)('employees'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HrController.prototype, "findEmployees", null);
__decorate([
    (0, common_1.Post)('employees'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_dto_1.CreateEmployeeDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Delete)('employees/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "removeEmployee", null);
__decorate([
    (0, common_1.Get)('attendances'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HrController.prototype, "findAttendances", null);
__decorate([
    (0, common_1.Post)('attendances'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dto_1.RecordAttendanceDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "recordAttendance", null);
exports.HrController = HrController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [hr_service_1.HrService])
], HrController);
//# sourceMappingURL=hr.controller.js.map