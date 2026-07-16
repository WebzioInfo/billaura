import { Module } from '@nestjs/common';
import { AccountingEngineService } from './accounting-engine.service';

@Module({
  providers: [AccountingEngineService],
  exports: [AccountingEngineService]
})
export class AccountingModule {}
