import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CloudinaryStorageService } from '../storage/cloudinary-storage.service';
import { CompanyContext } from '../common/context/company-context';
import { TesseractBillExtractor } from './ocr/providers/tesseract-bill-extractor';
import { BillMatcherService } from './ocr/bill-matcher.service';
import { BillExtractionResult } from './ocr/interfaces/bill-extractor.interface';

@Injectable()
export class PurchasesDocumentService {
  private readonly logger = new Logger(PurchasesDocumentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryStorageService,
    private readonly tesseractExtractor: TesseractBillExtractor,
    private readonly billMatcherService: BillMatcherService,
  ) {}

  /**
   * Upload invoice document to Cloudinary and persist attachment record
   */
  async uploadDocument(file: Express.Multer.File, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    // Validation: allowed MIME types
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed formats: JPG, JPEG, PNG, WEBP, PDF`
      );
    }

    // Validation: max 15MB
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`File exceeds maximum size limit of 15MB (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
    }

    this.logger.log(`Uploading bill file ${file.originalname} (${file.size} bytes) for company ${companyId}`);

    // 1. Upload to Cloudinary with tenant-scoped folder
    const uploadRes = await this.cloudinaryService.uploadImage(file.buffer, file.mimetype, {
      companyId,
      entityType: 'bills',
      filename: `bill_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      resourceType: file.mimetype === 'application/pdf' ? 'auto' : 'image',
    });

    // 2. Persist PurchaseAttachment in database
    const attachment = await this.prisma.purchaseAttachment.create({
      data: {
        companyId,
        originalFileName: file.originalname,
        cloudinaryPublicId: uploadRes.public_id,
        secureUrl: uploadRes.secure_url,
        resourceType: file.mimetype === 'application/pdf' ? 'pdf' : 'image',
        mimeType: file.mimetype,
        fileSize: file.size,
        ocrStatus: 'UPLOADED',
        uploadedBy: userId || 'system',
      },
    });

    // 3. Log Audit
    await this.logAudit(companyId, userId || 'system', 'BILL_IMAGE_UPLOADED', 'purchase_attachments', null, {
      attachmentId: attachment.id,
      fileName: file.originalname,
      secureUrl: uploadRes.secure_url,
    });

    return attachment;
  }

  /**
   * Process OCR extraction and enrich with tenant catalog data
   */
  async extractDocument(documentId: string, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const attachment = await this.prisma.purchaseAttachment.findFirst({
      where: { id: documentId, companyId, deletedAt: null },
    });

    if (!attachment) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Set status to PROCESSING
    await this.prisma.purchaseAttachment.update({
      where: { id: documentId },
      data: { ocrStatus: 'PROCESSING' },
    });

    await this.logAudit(companyId, userId || 'system', 'OCR_STARTED', 'purchase_attachments', { ocrStatus: attachment.ocrStatus }, { ocrStatus: 'PROCESSING', attachmentId: documentId });

    try {
      // Fetch image buffer from Cloudinary URL
      const response = await fetch(attachment.secureUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image from storage: HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract raw text and parse structured GST fields
      const rawExtraction = await this.tesseractExtractor.extractFromBuffer(buffer, attachment.mimeType, {
        fileName: attachment.originalFileName,
        fileSize: attachment.fileSize,
        secureUrl: attachment.secureUrl,
        cloudinaryPublicId: attachment.cloudinaryPublicId,
      });

      // Enrich with tenant database matching (Vendors, Products, Duplicate check)
      const enrichedResult = await this.billMatcherService.enrichExtraction(companyId, rawExtraction);

      // Update attachment with extracted data
      const updated = await this.prisma.purchaseAttachment.update({
        where: { id: documentId },
        data: {
          ocrStatus: 'EXTRACTED',
          ocrData: enrichedResult as any,
          confidence: enrichedResult.overallConfidence,
        },
      });

      await this.logAudit(companyId, userId || 'system', 'OCR_COMPLETED', 'purchase_attachments', null, {
        attachmentId: documentId,
        vendor: enrichedResult.vendor.name.value,
        invoiceNo: enrichedResult.invoice.invoiceNumber.value,
        grandTotal: enrichedResult.totals.grandTotal.value,
        confidence: enrichedResult.overallConfidence,
      });

      return {
        attachment: updated,
        extraction: enrichedResult,
      };
    } catch (error: any) {
      this.logger.error(`OCR processing failed for document ${documentId}: ${error.message}`, error.stack);

      // Update status to FAILED, preserving attachment and image
      await this.prisma.purchaseAttachment.update({
        where: { id: documentId },
        data: { ocrStatus: 'FAILED' },
      });

      await this.logAudit(companyId, userId || 'system', 'OCR_FAILED', 'purchase_attachments', null, {
        attachmentId: documentId,
        error: error.message,
      });

      throw new BadRequestException(`OCR extraction failed: ${error.message}. You can retry or enter details manually.`);
    }
  }

  /**
   * Get single document
   */
  async getDocument(documentId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const attachment = await this.prisma.purchaseAttachment.findFirst({
      where: { id: documentId, companyId, deletedAt: null },
    });

    if (!attachment) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return attachment;
  }

  /**
   * Get extraction data for document
   */
  async getExtraction(documentId: string) {
    const attachment = await this.getDocument(documentId);
    return {
      documentId: attachment.id,
      ocrStatus: attachment.ocrStatus,
      confidence: attachment.confidence,
      extraction: attachment.ocrData,
      documentMeta: {
        fileName: attachment.originalFileName,
        fileSize: attachment.fileSize,
        secureUrl: attachment.secureUrl,
        cloudinaryPublicId: attachment.cloudinaryPublicId,
        mimeType: attachment.mimeType,
      },
    };
  }

  /**
   * Mark extraction as verified
   */
  async verifyDocument(documentId: string, userId?: string, verifiedData?: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const attachment = await this.prisma.purchaseAttachment.findFirst({
      where: { id: documentId, companyId, deletedAt: null },
    });

    if (!attachment) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    const updated = await this.prisma.purchaseAttachment.update({
      where: { id: documentId },
      data: {
        ocrStatus: 'VERIFIED',
        ...(verifiedData ? { ocrData: verifiedData } : {}),
      },
    });

    await this.logAudit(companyId, userId || 'system', 'BILL_VERIFIED', 'purchase_attachments', null, {
      attachmentId: documentId,
      verifiedAt: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Link attachment to created purchase bill
   */
  async linkAttachmentToPurchase(attachmentId: string, purchaseId: string, txClient?: any) {
    const companyId = CompanyContext.getCompanyId();
    const db = txClient || this.prisma;

    await db.purchaseAttachment.updateMany({
      where: { id: attachmentId, companyId },
      data: { purchaseId },
    });
  }

  private async logAudit(companyId: string, userId: string, action: string, tableName: string, oldValues?: any, newValues?: any) {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          userId,
          action,
          tableName,
          oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
          newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        },
      });
    } catch (e) {
      this.logger.error(`Audit log creation failed: ${e}`);
    }
  }
}
