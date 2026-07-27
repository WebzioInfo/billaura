import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from './app-logger.service';

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'jwt',
  'otp',
  'otpcode',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'creditcard',
  'cvv',
];

function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  const maskedObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
      maskedObj[key] = '***MASKED***';
    } else if (typeof value === 'object' && value !== null) {
      maskedObj[key] = maskSensitiveData(value);
    } else {
      maskedObj[key] = value;
    }
  }
  return maskedObj;
}

@Injectable()
export class ApiLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  private isDebugEnabled(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_API_LOGS === 'true'
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.isDebugEnabled()) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    const startTime = Date.now();
    const method = request.method;
    const url = request.originalUrl || request.url;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const ip = request.ip || request.connection?.remoteAddress;

    const user = request.user || request.authenticatedUser;
    const userId = user?.id || user?.userId || 'ANONYMOUS';
    const companyId =
      request.headers['x-company-id'] ||
      request.headers['x-tenant-id'] ||
      user?.companyId ||
      'N/A';

    console.groupCollapsed?.(`\x1b[36m[NEST API REQUEST]\x1b[0m \x1b[33m${method}\x1b[0m ${url}`);
    console.log(`\x1b[1mTimestamp:\x1b[0m ${new Date().toISOString()}`);
    console.log(`\x1b[1mController / Handler:\x1b[0m ${controller} -> ${handler}()`);
    console.log(`\x1b[1mAuthenticated User ID:\x1b[0m ${userId}`);
    console.log(`\x1b[1mCompany / Tenant ID:\x1b[0m ${companyId}`);
    console.log(`\x1b[1mClient IP:\x1b[0m ${ip}`);

    if (request.params && Object.keys(request.params).length > 0) {
      console.log(`\x1b[1mRoute Params:\x1b[0m`, maskSensitiveData(request.params));
    }
    if (request.query && Object.keys(request.query).length > 0) {
      console.log(`\x1b[1mQuery Params:\x1b[0m`, maskSensitiveData(request.query));
    }
    if (request.headers) {
      console.log(`\x1b[1mSanitized Headers:\x1b[0m`, maskSensitiveData(request.headers));
    }
    if (request.body && Object.keys(request.body).length > 0) {
      console.log(`\x1b[1mRequest Body:\x1b[0m`, maskSensitiveData(request.body));
    }
    console.groupEnd?.();

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 200;

          const color = statusCode < 300 ? '\x1b[32m' : statusCode < 400 ? '\x1b[33m' : '\x1b[31m';
          const emoji = statusCode < 300 ? '🟢' : statusCode < 400 ? '🟡' : '🟠';

          console.groupCollapsed?.(
            `${emoji} ${color}[NEST API RESPONSE]\x1b[0m \x1b[1m${statusCode}\x1b[0m \x1b[33m${method}\x1b[0m ${url} (${duration}ms)`
          );
          console.log(`\x1b[1mExecution Time:\x1b[0m ${duration} ms`);
          console.log(`\x1b[1mStatus Code:\x1b[0m ${statusCode}`);
          if (data) {
            console.log(`\x1b[1mReturned Payload:\x1b[0m`, maskSensitiveData(data));
          }
          console.groupEnd?.();
        },
      })
    );
  }
}
