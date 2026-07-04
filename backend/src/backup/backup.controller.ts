import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Req,
  Body,
  Res,
  ForbiddenException,
  Query,
} from "@nestjs/common";
import { BackupService } from "./backup.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../database/prisma.service";
import { Response } from "express";
import { StorageService } from "../storage/storage.service";

@Controller("backups")
@UseGuards(JwtAuthGuard)
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Post("request")
  async requestBackup(
    @Req() req: any,
    @Body() body: { type: any; isPlatform: boolean },
  ) {
    const user = req.user;

    // Super Admins can request platform-wide backups by passing isPlatform=true
    let companyIdToBackup = user.companyId;
    if (body.isPlatform && user.globalRole === "SUPER_ADMIN") {
      companyIdToBackup = null;
    } else if (body.isPlatform) {
      throw new ForbiddenException(
        "Only Super Admins can request platform backups",
      );
    }

    return this.backupService.requestBackup(
      companyIdToBackup,
      user.id,
      body.type,
    );
  }

  @Get("history")
  async getHistory(@Req() req: any, @Query("type") type?: string) {
    const user = req.user;

    const where: any = {};
    if (
      user.globalRole !== "SUPER_ADMIN" ||
      (user.globalRole === "SUPER_ADMIN" && type !== "PLATFORM")
    ) {
      where.companyId = user.companyId;
    } else if (user.globalRole === "SUPER_ADMIN" && type === "PLATFORM") {
      where.companyId = null;
    }

    return this.prisma.backupJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true, email: true } },
        company: { select: { companyName: true } },
      },
    });
  }

  @Get("download/:id")
  async downloadBackup(
    @Param("id") id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const user = req.user;

    const job = await this.prisma.backupJob.findUnique({ where: { id } });
    if (!job) throw new ForbiddenException("Backup not found");

    // Authorization Check
    if (job.companyId !== user.companyId && user.globalRole !== "SUPER_ADMIN") {
      throw new ForbiddenException(
        "You are not authorized to download this backup",
      );
    }

    if (job.status !== "COMPLETED" || !job.fileUrl) {
      throw new ForbiddenException("Backup is not ready for download");
    }

    const exists = await this.storage.fileExists(job.fileUrl);
    if (!exists) {
      throw new ForbiddenException("Backup file missing from storage");
    }

    // Log the download action
    await this.prisma.backupAuditLog.create({
      data: {
        companyId: job.companyId,
        userId: user.id,
        action: "DOWNLOAD_BACKUP",
        targetName: job.name,
        success: true,
      },
    });

    res.download(
      this.storage.getFilePath(job.fileUrl),
      `BillAura_Backup_${job.name}.zip`,
    );
  }
}
