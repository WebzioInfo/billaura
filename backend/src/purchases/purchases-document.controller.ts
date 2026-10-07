import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PurchasesDocumentService } from './purchases-document.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('purchases/documents')
export class PurchasesDocumentController {
  constructor(private readonly documentService: PurchasesDocumentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please select a valid invoice image or PDF.');
    }
    const userId = req.user?.userId || req.user?.id || 'system';
    return this.documentService.uploadDocument(file, userId);
  }

  @Post(':documentId/extract')
  async extractDocument(@Param('documentId') documentId: string, @Req() req: any) {
    const userId = req.user?.userId || req.user?.id || 'system';
    return this.documentService.extractDocument(documentId, userId);
  }

  @Get(':documentId')
  async getDocument(@Param('documentId') documentId: string) {
    return this.documentService.getDocument(documentId);
  }

  @Get(':documentId/extraction')
  async getExtraction(@Param('documentId') documentId: string) {
    return this.documentService.getExtraction(documentId);
  }

  @Post(':documentId/verify')
  async verifyDocument(
    @Param('documentId') documentId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id || 'system';
    return this.documentService.verifyDocument(documentId, userId, body?.verifiedData);
  }
}
