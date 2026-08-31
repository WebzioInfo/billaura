import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const corsOptions = (allowedOrigins: string[]): CorsOptions => {
  const normalizedOrigins = allowedOrigins
    .map((origin) => origin.trim().replace(/\/+$/, '').toLowerCase())
    .filter(Boolean);

  return {
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g. mobile apps, server-to-server, curl)
      if (!requestOrigin) {
        return callback(null, true);
      }

      const normalizedRequest = requestOrigin.trim().replace(/\/+$/, '').toLowerCase();

      // If wildcard is specified or no origins configured, allow
      if (normalizedOrigins.includes('*') || normalizedOrigins.length === 0) {
        return callback(null, true);
      }

      const isAllowed = normalizedOrigins.some((allowed) => {
        if (allowed === normalizedRequest) return true;
        if (allowed.startsWith('*.')) {
          const rootDomain = allowed.slice(2);
          try {
            const parsed = new URL(requestOrigin);
            return parsed.hostname.endsWith(rootDomain);
          } catch {
            return false;
          }
        }
        return false;
      });

      if (isAllowed) {
        return callback(null, true);
      }

      // Log rejected origins in development / debugging
      return callback(null, false);
    },
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
      'X-CSRF-Token',
      'X-Requested-With',
    ],
    exposedHeaders: ['x-request-id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
};
