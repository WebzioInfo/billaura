import { Module } from '@nestjs/common';
import { DocumentTemplatesService } from './document-templates.service';
import { DocumentTemplatesController } from './document-templates.controller';
import { SharedModule } from '../../shared/shared.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [SharedModule, DatabaseModule],
  controllers: [DocumentTemplatesController],
  providers: [DocumentTemplatesService],
  exports: [DocumentTemplatesService],
})
export class DocumentTemplatesModule {}
