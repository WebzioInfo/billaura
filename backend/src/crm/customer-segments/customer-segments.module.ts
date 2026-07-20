import { Module } from '@nestjs/common';
import { CustomerSegmentsService } from './customer-segments.service';
import { CustomerSegmentsController } from './customer-segments.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomerSegmentsController],
  providers: [CustomerSegmentsService],
  exports: [CustomerSegmentsService],
})
export class CustomerSegmentsModule {}
