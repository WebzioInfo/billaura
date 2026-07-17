import { Module } from '@nestjs/common';
import { SequenceService } from './sequence.service';
import { SequenceController } from './sequence.controller';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [SequenceController],
  providers: [SequenceService, PrismaService],
  exports: [SequenceService]
})
export class SequenceModule {}
