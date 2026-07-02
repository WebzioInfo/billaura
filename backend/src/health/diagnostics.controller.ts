import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ConfigService } from "@nestjs/config";

@ApiTags("diagnostics")
@Controller()
export class DiagnosticsController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private config: ConfigService
  ) {}

  @Get("health")
  check() {
    return {
      status: "ok",
      service: "billaura-backend",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("database")
  async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "connected" };
    } catch (e) {
      return { status: "error", message: (e as Error).message };
    }
  }

  @Get("storage")
  async checkStorage() {
    try {
      const isOk = await this.storage.fileExists('non-existent-file.tmp');
      return { status: "ok", storage: "accessible", path: process.env.VERCEL ? "/tmp" : "local" };
    } catch (e) {
      return { status: "error", message: (e as Error).message };
    }
  }

  @Get("config")
  checkConfig() {
    return {
      status: "ok",
      environment: this.config.get("NODE_ENV"),
      hasDatabaseUrl: !!this.config.get("DATABASE_URL"),
      hasJwtSecret: !!this.config.get("JWT_SECRET")
    };
  }
}
