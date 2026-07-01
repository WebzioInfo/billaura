"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupController = void 0;
const common_1 = require("@nestjs/common");
const backup_service_1 = require("./backup.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const prisma_service_1 = require("../database/prisma.service");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let BackupController = class BackupController {
    backupService;
    prisma;
    constructor(backupService, prisma) {
        this.backupService = backupService;
        this.prisma = prisma;
    }
    async requestBackup(req, body) {
        const user = req.user;
        let companyIdToBackup = user.companyId;
        if (body.isPlatform && user.globalRole === 'SUPER_ADMIN') {
            companyIdToBackup = null;
        }
        else if (body.isPlatform) {
            throw new common_1.ForbiddenException('Only Super Admins can request platform backups');
        }
        return this.backupService.requestBackup(companyIdToBackup, user.id, body.type);
    }
    async getHistory(req, type) {
        const user = req.user;
        const where = {};
        if (user.globalRole !== 'SUPER_ADMIN' || (user.globalRole === 'SUPER_ADMIN' && type !== 'PLATFORM')) {
            where.companyId = user.companyId;
        }
        else if (user.globalRole === 'SUPER_ADMIN' && type === 'PLATFORM') {
            where.companyId = null;
        }
        return this.prisma.backupJob.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: { select: { name: true, email: true } },
                company: { select: { companyName: true } }
            }
        });
    }
    async downloadBackup(id, req, res) {
        const user = req.user;
        const job = await this.prisma.backupJob.findUnique({ where: { id } });
        if (!job)
            throw new common_1.ForbiddenException('Backup not found');
        if (job.companyId !== user.companyId && user.globalRole !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('You are not authorized to download this backup');
        }
        if (job.status !== 'COMPLETED' || !job.fileUrl) {
            throw new common_1.ForbiddenException('Backup is not ready for download');
        }
        const filePath = path.join(process.cwd(), 'backups', job.fileUrl);
        if (!fs.existsSync(filePath)) {
            throw new common_1.ForbiddenException('Backup file missing from storage');
        }
        await this.prisma.backupAuditLog.create({
            data: {
                companyId: job.companyId,
                userId: user.id,
                action: 'DOWNLOAD_BACKUP',
                targetName: job.name,
                success: true
            }
        });
        res.download(filePath, `BillAura_Backup_${job.name}.zip`);
    }
};
exports.BackupController = BackupController;
__decorate([
    (0, common_1.Post)('request'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "requestBackup", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('download/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "downloadBackup", null);
exports.BackupController = BackupController = __decorate([
    (0, common_1.Controller)('backups'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [backup_service_1.BackupService,
        prisma_service_1.PrismaService])
], BackupController);
//# sourceMappingURL=backup.controller.js.map