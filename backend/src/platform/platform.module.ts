import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PlatformController],
})
export class PlatformModule {}
