import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./database/prisma.service";

@Controller("prisma-test")
export class PrismaTestController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async testPrisma() {
    const startedAt = performance.now();
    await this.prisma.user.findFirst({ select: { id: true } });
    return { durationMs: performance.now() - startedAt };
  }
}
