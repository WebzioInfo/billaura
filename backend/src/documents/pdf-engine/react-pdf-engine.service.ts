import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as ReactPDF from '@react-pdf/renderer';
import React from 'react';
import { UniversalPdfDocument } from './UniversalPdfDocument';
import { PdfDocumentData } from './pdf-document.types';

@Injectable()
export class ReactPdfEngineService {
  private readonly logger = new Logger(ReactPdfEngineService.name);

  async renderDocumentPdf(data: PdfDocumentData): Promise<Buffer> {
    const startTime = Date.now();
    try {
      this.logger.log(`Starting React-PDF render for ${data.document.title} (${data.document.documentNo})`);
      
      const renderFn =
        (ReactPDF as any).renderToBuffer ||
        (ReactPDF as any).default?.renderToBuffer ||
        (ReactPDF as any).default?.default?.renderToBuffer;

      if (typeof renderFn !== 'function') {
        throw new Error(`ReactPDF.renderToBuffer is not available. Available keys: ${Object.keys(ReactPDF).join(', ')}`);
      }

      const element = React.createElement(UniversalPdfDocument, { data });
      const pdfBuffer: Buffer = await renderFn(element as any);
      
      const duration = Date.now() - startTime;
      this.logger.log(`PDF rendered successfully in ${duration}ms, size: ${pdfBuffer.length} bytes`);
      
      return pdfBuffer;
    } catch (err: any) {
      this.logger.error(`Failed to render PDF for ${data.document.documentNo}: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`PDF rendering failed: ${err.message}`);
    }
  }
}
