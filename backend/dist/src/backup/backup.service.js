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
var BackupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
let BackupService = BackupService_1 = class BackupService {
    prisma;
    logger = new common_1.Logger(BackupService_1.name);
    isProcessing = false;
    constructor(prisma) {
        this.prisma = prisma;
        const backupsDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }
    }
    async requestBackup(companyId, userId, type) {
        return this.prisma.backupJob.create({
            data: {
                companyId,
                createdById: userId,
                name: `Backup_${new Date().toISOString().replace(/[:.]/g, '-')}`,
                operation: 'BACKUP',
                type: type || 'FULL',
                status: 'PENDING',
            }
        });
    }
    async processPendingBackups() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            const job = await this.prisma.backupJob.findFirst({
                where: { status: 'PENDING', operation: 'BACKUP' },
                orderBy: { createdAt: 'asc' }
            });
            if (!job) {
                this.isProcessing = false;
                return;
            }
            await this.prisma.backupJob.update({ where: { id: job.id }, data: { status: 'RUNNING', progress: 0 } });
            const startTime = Date.now();
            this.logger.log(`Starting backup job ${job.id}`);
            const backupsDir = path.join(process.cwd(), 'backups');
            const fileName = `${job.id}.zip`;
            const filePath = path.join(backupsDir, fileName);
            const output = fs.createWriteStream(filePath);
            const { ZipArchive } = await Promise.resolve().then(() => __importStar(require('archiver')));
            const archive = new ZipArchive({ zlib: { level: 9 } });
            archive.pipe(output);
            const models = client_1.Prisma.dmmf.datamodel.models;
            let processed = 0;
            for (const model of models) {
                if (['BackupJob', 'BackupSchedule', 'BackupAuditLog', 'ImportLog', 'LoginHistory'].includes(model.name)) {
                    continue;
                }
                const modelName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
                let data = [];
                try {
                    if (job.companyId) {
                        const hasCompanyId = model.fields.some(f => f.name === 'companyId');
                        if (hasCompanyId) {
                            data = await this.prisma[modelName].findMany({
                                where: { companyId: job.companyId }
                            });
                        }
                        else if (model.name === 'Company') {
                            data = await this.prisma[modelName].findMany({
                                where: { id: job.companyId }
                            });
                        }
                    }
                    else {
                        data = await this.prisma[modelName].findMany();
                    }
                    if (data && data.length > 0) {
                        archive.append(JSON.stringify(data, null, 2), { name: `${model.name}.json` });
                    }
                }
                catch (e) {
                    this.logger.warn(`Could not export model ${model.name}: ${e.message}`);
                }
                processed++;
                const progress = Math.floor((processed / models.length) * 90);
                await this.prisma.backupJob.update({ where: { id: job.id }, data: { progress } });
            }
            await archive.finalize();
            await new Promise((resolve) => output.on('close', () => resolve()));
            const stats = fs.statSync(filePath);
            const fileBuffer = fs.readFileSync(filePath);
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            const checksum = hashSum.digest('hex');
            await this.prisma.backupJob.update({
                where: { id: job.id },
                data: {
                    status: 'COMPLETED',
                    progress: 100,
                    durationMs: Date.now() - startTime,
                    sizeBytes: stats.size,
                    checksum,
                    fileUrl: fileName
                }
            });
            this.logger.log(`Completed backup job ${job.id}`);
            await this.prisma.backupAuditLog.create({
                data: {
                    companyId: job.companyId,
                    userId: job.createdById,
                    action: 'BACKUP_COMPLETED',
                    targetName: job.name,
                    success: true
                }
            });
        }
        catch (error) {
            this.logger.error(`Backup processing failed`, error.stack);
            await this.prisma.backupJob.updateMany({
                where: { status: 'RUNNING' },
                data: { status: 'FAILED', errorLog: error.message }
            });
        }
        finally {
            this.isProcessing = false;
        }
    }
};
exports.BackupService = BackupService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BackupService.prototype, "processPendingBackups", null);
exports.BackupService = BackupService = BackupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BackupService);
//# sourceMappingURL=backup.service.js.map