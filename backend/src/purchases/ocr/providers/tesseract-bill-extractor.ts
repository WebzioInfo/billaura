import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import {
  BillExtractionResult,
  IBillDocumentExtractor,
} from '../interfaces/bill-extractor.interface';
import { GstInvoiceParser } from '../parsers/gst-invoice-parser.util';

@Injectable()
export class TesseractBillExtractor implements IBillDocumentExtractor {
  private readonly logger = new Logger(TesseractBillExtractor.name);

  async extractFromBuffer(
    buffer: Buffer,
    mimeType: string,
    meta: { fileName: string; secureUrl: string; cloudinaryPublicId: string; fileSize: number }
  ): Promise<BillExtractionResult> {
    this.logger.log(`Starting OCR text extraction for: ${meta.fileName} (${meta.fileSize} bytes)`);

    try {
      // Initialize Tesseract Worker
      const worker = await createWorker('eng');
      const ret = await worker.recognize(buffer);
      const text = ret.data.text || '';
      const confidence = ret.data.confidence ? ret.data.confidence / 100 : 0.85;

      await worker.terminate();

      this.logger.log(`Tesseract OCR finished. Extracted ${text.length} characters with confidence ${confidence.toFixed(2)}`);

      // Parse structured GST invoice data
      return GstInvoiceParser.parse(text, confidence, {
        ...meta,
        mimeType,
      });
    } catch (error: any) {
      this.logger.error(`Tesseract OCR extraction failed: ${error.message}`, error.stack);
      // Fallback: If OCR parser failed or image format was unreadable by local worker,
      // still return a clean structure with rawText and warning, rather than throwing
      const fallbackResult = GstInvoiceParser.parse('', 0.3, {
        ...meta,
        mimeType,
      });
      fallbackResult.warnings.push({
        code: 'LOW_CONFIDENCE',
        message: `Automatic OCR reading encountered an issue: ${error.message || 'Image text could not be recognized'}. Please enter fields manually.`,
        severity: 'warning',
      });
      return fallbackResult;
    }
  }
}
