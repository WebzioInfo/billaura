import { Injectable, Logger } from '@nestjs/common';
import { ReactPdfEngineService } from '../pdf-engine/react-pdf-engine.service';
import { PdfDocumentData } from '../pdf-engine/pdf-document.types';

@Injectable()
export class DocumentEngineService {
  private readonly logger = new Logger(DocumentEngineService.name);

  constructor(private readonly reactPdfEngine: ReactPdfEngineService) {}

  async generatePdfFromData(pdfData: PdfDocumentData): Promise<Buffer> {
    this.logger.log(`Generating PDF via React-PDF for ${pdfData.document?.documentNo || 'Document'}...`);
    return await this.reactPdfEngine.renderDocumentPdf(pdfData);
  }
}
