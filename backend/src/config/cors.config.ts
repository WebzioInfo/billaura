import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const corsOptions = (allowedOrigins: string[]): CorsOptions => ({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'x-company-id',
    'x-tenant-id',
    'x-request-id',
    'Cache-Control',
    'Pragma',
    'Expires',
  ],
});
