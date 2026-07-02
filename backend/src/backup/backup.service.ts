import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService
  ) {}

  async requestBackup(companyId: string | null, userId: string, type: any) {
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

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processPendingBackups() {
    if (this.isProcessing) return;
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

      const fileName = `${job.id}.zip`;
      
      const output = this.storage.createWriteStream(fileName);
      const archiverModule = await Function('return import("archiver")')();
      const archiver = archiverModule.default || archiverModule;
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.pipe(output);

      const models = Prisma.dmmf.datamodel.models;
      let processed = 0;

      for (const model of models) {
        // Exclude system models or logs if needed
        if (['BackupJob', 'BackupSchedule', 'BackupAuditLog', 'ImportLog', 'LoginHistory'].includes(model.name)) {
          continue;
        }

        const modelName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
        
        let data = [];
        try {
          // If companyId is set, only backup company-specific records
          if (job.companyId) {
            const hasCompanyId = model.fields.some(f => f.name === 'companyId');
            if (hasCompanyId) {
              data = await (this.prisma as any)[modelName].findMany({
                where: { companyId: job.companyId }
              });
            } else if (model.name === 'Company') {
              // Also backup their own Company record
              data = await (this.prisma as any)[modelName].findMany({
                where: { id: job.companyId }
              });
            }
          } else {
            // Super Admin: backup everything
            data = await (this.prisma as any)[modelName].findMany();
          }

          if (data && data.length > 0) {
            archive.append(JSON.stringify(data, null, 2), { name: `${model.name}.json` });
          }
        } catch (e) {
          this.logger.warn(`Could not export model ${model.name}: ${(e as Error).message}`);
        }

        processed++;
        const progress = Math.floor((processed / models.length) * 90); // reserve 10% for finalizing
        await this.prisma.backupJob.update({ where: { id: job.id }, data: { progress } });
      }

      await archive.finalize();

      // Wait for output stream to close
      await new Promise<void>((resolve) => output.on('close', () => resolve()));

      const size = await this.storage.getFileSize(fileName);
      const checksum = await this.storage.calculateChecksum(fileName);

      await this.prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          durationMs: Date.now() - startTime,
          sizeBytes: size,
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

    } catch (error) {
      this.logger.error(`Backup processing failed`, (error as Error).stack);
      // Failsafe catch for running jobs
      await this.prisma.backupJob.updateMany({
        where: { status: 'RUNNING' },
        data: { status: 'FAILED', errorLog: (error as Error).message }
      });
    } finally {
      this.isProcessing = false;
    }
  }
}
