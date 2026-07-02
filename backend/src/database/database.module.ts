import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { DbTestController } from "./db-test.controller";

@Global()
@Module({
  controllers: [DbTestController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
