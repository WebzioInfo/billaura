import { Module } from '@nestjs/common';
import { InvoiceConfigController } from './invoice-config.controller';
import { InvoiceConfigService } from './invoice-config.service';

@Module({
  controllers: [InvoiceConfigController],
  providers: [InvoiceConfigService],
  exports: [InvoiceConfigService],
})
export class InvoiceConfigModule {}
