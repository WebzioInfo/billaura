import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private config: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async checkDatabase() {
    const start = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Math.round(performance.now() - start);
      return {
        status: "up",
        message: "Database is reachable",
        latencyMs: latency,
      };
    } catch (e) {
      this.logger.error(`Database health check failed: ${(e as Error).message}`);
      return {
        status: "down",
        message: "Database unreachable or Prisma initialization failed",
        error: (e as Error).message,
        latencyMs: Math.round(performance.now() - start),
      };
    }
  }

  async checkSystem() {
    const memUsage = process.memoryUsage();
    
    // Check Storage
    let storageStatus = "down";
    try {
      // Just check if the bucket/local dir is configured, no need to actually write a file every ping
      // The storageService itself does this on init, but we can verify fileExists on a dummy file
      await this.storage.fileExists('health-check-dummy.tmp');
      storageStatus = "up";
    } catch (e) {
      // fileExists might throw if it can't reach S3 or if directory doesn't exist
      storageStatus = "down";
    }

    // Check Scheduler
    let schedulerStatus = "down";
    try {
      const crons = this.schedulerRegistry.getCronJobs();
      schedulerStatus = crons.size > 0 ? "up" : "idle";
    } catch (e) {
      // getCronJobs throws if no jobs are registered
      schedulerStatus = "idle";
    }

    return {
      status: "up",
      environment: this.config.get("NODE_ENV") || "development",
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memoryUsageMB: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      },
      storage: storageStatus,
      scheduler: schedulerStatus,
    };
  }

  async checkAll() {
    const db = await this.checkDatabase();
    const sys = await this.checkSystem();

    const isHealthy = db.status === "up" && sys.status === "up";

    return {
      isHealthy,
      database: db,
      system: sys
    };
  }
}
