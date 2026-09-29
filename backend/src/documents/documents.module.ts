import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentEngineService } from './document-engine/document-engine.service';
import { ReactPdfEngineService } from './pdf-engine/react-pdf-engine.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentEngineService, ReactPdfEngineService],
  exports: [DocumentEngineService, ReactPdfEngineService],
})
export class DocumentsModule {}
