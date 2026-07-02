import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

@Controller('db-test')
export class DbTestController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async testDb() {
    const start = performance.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return { durationMs: performance.now() - start };
  }
}
