import { Module } from '@nestjs/common';
import { CustomerDepartmentsService } from './customer-departments.service';
import { CustomerDepartmentsController } from './customer-departments.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomerDepartmentsController],
  providers: [CustomerDepartmentsService],
  exports: [CustomerDepartmentsService],
})
export class CustomerDepartmentsModule {}
