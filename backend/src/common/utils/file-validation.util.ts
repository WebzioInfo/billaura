import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

export interface UploadedMulterFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export function validateImageFile(file: UploadedMulterFile): { valid: boolean; extension: string } {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new PayloadTooLargeException(`The uploaded image exceeds the maximum allowed limit of 5MB.`);
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.');
  }

  const origName = (file.originalname || '').toLowerCase();
  const hasAllowedExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => origName.endsWith(ext));
  if (!hasAllowedExt) {
    throw new BadRequestException('Invalid file extension. Only .jpg, .jpeg, .png, and .webp are allowed.');
  }

  // Validate actual binary magic bytes / signature
  const buffer = file.buffer;
  if (!buffer || buffer.length < 12) {
    throw new BadRequestException('Corrupted or invalid file.');
  }

  let extension = 'png';
  let isSignatureMatch = false;

  // JPEG signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    isSignatureMatch = true;
    extension = 'jpg';
  }
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  else if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    isSignatureMatch = true;
    extension = 'png';
  }
  // WEBP signature: RIFF....WEBP
  else if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    isSignatureMatch = true;
    extension = 'webp';
  }

  if (!isSignatureMatch) {
    throw new BadRequestException('File contents do not match allowed image signature (JPEG, PNG, WEBP).');
  }

  return { valid: true, extension };
}
