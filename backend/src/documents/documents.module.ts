import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentEngineService } from './document-engine/document-engine.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentEngineService]
})
export class DocumentsModule {}
