import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { DatabaseSafetyService } from "./database-safety.service";

@Global()
@Module({
  providers: [PrismaService, DatabaseSafetyService],
  exports: [PrismaService, DatabaseSafetyService],
})
export class DatabaseModule {}

