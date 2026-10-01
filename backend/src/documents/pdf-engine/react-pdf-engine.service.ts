import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import React from 'react';
import { UniversalPdfDocument, ReactPdfModule } from './UniversalPdfDocument';
import { PdfDocumentData } from './pdf-document.types';

// Native dynamic import bridge for CommonJS environments to load ES Modules
// Using new Function prevents TypeScript from transpiling import() into require()
async function loadReactPdf(): Promise<ReactPdfModule> {
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  const mod = await dynamicImport('@react-pdf/renderer');
  return (mod && mod.default && mod.default.renderToBuffer) ? mod.default : mod;
}

@Injectable()
export class ReactPdfEngineService {
  private readonly logger = new Logger(ReactPdfEngineService.name);
  private pdfModulePromise: Promise<ReactPdfModule> | null = null;

  private async getPdfModule(): Promise<ReactPdfModule> {
    if (!this.pdfModulePromise) {
      this.pdfModulePromise = loadReactPdf().catch((err) => {
        this.pdfModulePromise = null;
        throw err;
      });
    }
    return this.pdfModulePromise;
  }

  async renderDocumentPdf(data: PdfDocumentData): Promise<Buffer> {
    const startTime = Date.now();
    try {
      this.logger.log(`Starting React-PDF render for ${data.document?.title || 'Document'} (${data.document?.documentNo || 'N/A'})`);

      const pdf = await this.getPdfModule();
      const renderFn =
        (pdf as any).renderToBuffer ||
        (pdf as any).default?.renderToBuffer ||
        (pdf as any).default?.default?.renderToBuffer;

      if (typeof renderFn !== 'function') {
        throw new Error(`ReactPDF.renderToBuffer is not available. Available keys: ${Object.keys(pdf).join(', ')}`);
      }

      const element = React.createElement(UniversalPdfDocument, { data, pdf });
      const pdfBuffer: Buffer = await renderFn(element as any);

      const duration = Date.now() - startTime;
      this.logger.log(`PDF rendered successfully in ${duration}ms, size: ${pdfBuffer.length} bytes`);

      return pdfBuffer;
    } catch (err: any) {
      this.logger.error(`Failed to render PDF for ${data.document?.documentNo || 'unknown'}: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`PDF rendering failed: ${err.message}`);
    }
  }
}
