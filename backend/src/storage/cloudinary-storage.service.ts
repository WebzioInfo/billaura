import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface ImageUploadOptions {
  companyId: string;
  entityType: 'branding' | 'users' | 'customers' | 'suppliers' | 'employees' | 'distributors' | 'products' | 'brands' | 'inventory';
  entityId?: string;
  filename?: string;
  transformation?: string;
}

export interface ImageUploadResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

@Injectable()
export class CloudinaryStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(private readonly configService: ConfigService) {}

  private getCredentials() {
    const cloudName = this.configService.get<string>('CLOUDINARY_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException('Cloudinary configuration is missing in server environment.');
    }
    return { cloudName, apiKey, apiSecret };
  }

  /**
   * Centralized Cloudinary Upload Method
   * Enforces Tenant-scoped folder structure: bill-aura/tenants/{companyId}/{entityType}/{entityId || 'main'}
   */
  async uploadImage(
    fileBuffer: Buffer,
    mimeType: string,
    options: ImageUploadOptions,
  ): Promise<ImageUploadResult> {
    const { cloudName, apiKey, apiSecret } = this.getCredentials();

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = `bill-aura/tenants/${options.companyId}/${options.entityType}/${options.entityId || 'main'}`;
    const publicId = options.filename || `${options.entityType}_${Date.now()}`;
    const overwrite = 'true';

    // Signature calculation (alphabetical order of parameters)
    const toSign = `folder=${folder}&overwrite=${overwrite}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const base64Data = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    const formData = new FormData();
    formData.append('file', base64Data);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('public_id', publicId);
    formData.append('overwrite', overwrite);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Cloudinary upload failed (${response.status}): ${errorText}`);
      throw new InternalServerErrorException(`Failed to upload image to Cloudinary: ${errorText}`);
    }

    const result = await response.json();
    this.logger.log(`Image uploaded to Cloudinary [${folder}/${publicId}]: ${result.secure_url}`);

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }

  /**
   * Company Logo upload shortcut using central uploadImage
   */
  async uploadCompanyLogo(companyId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const result = await this.uploadImage(fileBuffer, mimeType, {
      companyId,
      entityType: 'branding',
      entityId: 'logo',
      filename: 'logo',
    });
    return result.secure_url;
  }

  /**
   * Delete asset from Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    const { cloudName, apiKey, apiSecret } = this.getCredentials();
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      this.logger.warn(`Failed to destroy Cloudinary image ${publicId}`);
      return false;
    }

    const result = await response.json();
    return result.result === 'ok';
  }
}
