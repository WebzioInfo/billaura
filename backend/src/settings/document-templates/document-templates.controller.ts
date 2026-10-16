import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentTemplatesService } from './document-templates.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { CurrentCompany } from '../../common/decorators/tenant.decorator';
import { CloudinaryStorageService } from '../../storage/cloudinary-storage.service';
import { UploadedMulterFile } from '../../common/utils/file-validation.util';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

@Controller('document-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentTemplatesController {
  private readonly logger = new Logger(DocumentTemplatesController.name);

  constructor(
    private readonly templatesService: DocumentTemplatesService,
    private readonly cloudinaryStorage: CloudinaryStorageService,
  ) {}

  @Post()
  create(@CurrentCompany() companyId: string, @Body() data: any) {
    return this.templatesService.create(companyId, data);
  }

  @Get()
  findAll(
    @CurrentCompany() companyId: string,
    @Query('docType') docType?: string,
  ) {
    return this.templatesService.findAll(companyId, docType);
  }

  @Get('default/:type')
  findDefault(@CurrentCompany() companyId: string, @Param('type') type: string) {
    return this.templatesService.findDefault(companyId, type);
  }

  @Get(':id')
  findOne(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.templatesService.findOne(companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.templatesService.update(companyId, id, data);
  }

  @Post(':id/set-default')
  setDefault(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.templatesService.setDefault(companyId, id);
  }

  @Post(':id/clone')
  clone(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.templatesService.clone(companyId, id);
  }

  @Delete(':id')
  remove(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.templatesService.remove(companyId, id);
  }

  @Post('upload-logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: MAX_LOGO_SIZE + 1024 }, // Extra buffer to catch and throw friendly message
    }),
  )
  async uploadLogo(
    @CurrentCompany() companyId: string,
    @UploadedFile() file?: UploadedMulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('No logo file provided.');
    }

    if (file.size > MAX_LOGO_SIZE) {
      throw new BadRequestException('File size exceeds the maximum limit of 2 MB.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PNG, JPG, SVG, and WEBP images are allowed.',
      );
    }

    let url: string;
    try {
      const uploadResult = await this.cloudinaryStorage.uploadImage(
        file.buffer,
        file.mimetype,
        {
          companyId,
          entityType: 'branding',
          entityId: `template_logo_${Date.now()}`,
          filename: `template_logo_${Date.now()}`,
        },
      );
      url = uploadResult.secure_url;
    } catch (err: any) {
      this.logger.warn(
        `Cloudinary upload unavailable (${err?.message}). Falling back to embedded base64 data URL.`,
      );
      url = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    return {
      success: true,
      message: 'Logo uploaded successfully',
      url,
    };
  }
}

