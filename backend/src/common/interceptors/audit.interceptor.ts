import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API-GATEWAY');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (data) => {
          const duration = Date.now() - startTime;
          const user = req.user;
          const finalUserId = user?.userId || user?.id || data?.user?.id || data?.id || null;
          const finalCompanyId = req.headers['x-company-id'] || user?.companyId || data?.tenant?.id || data?.user?.companyId || data?.companyId || null;

          // 1. Console Developer Logging
          this.logger.log(
            `[${method}] ${url} - Status: SUCCESS - Duration: ${duration}ms - User: ${finalUserId || 'Anonymous'} - Company: ${finalCompanyId || 'None'}`
          );

          // 2. DB Auditing - mutative only
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            try {
              if (finalCompanyId && finalUserId) {
                const pathParts = url.split('/').filter(Boolean);
                const tableName = pathParts.length > 1 ? pathParts[1].toUpperCase() : 'UNKNOWN';
                const action = method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE';
                const ip = req.ip || req.connection?.remoteAddress || null;

                await this.prisma.auditLog.create({
                  data: {
                    companyId: finalCompanyId,
                    userId: finalUserId,
                    action,
                    tableName,
                    newValues: method !== 'DELETE' ? (data || req.body) : undefined,
                    ipAddress: ip,
                  }
                });
              }
            } catch (err: any) {
              this.logger.error(`Failed to write audit log: ${err.message}`);
            }
          }
        },
        error: (err: any) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[${method}] ${url} - Status: FAILED - Duration: ${duration}ms - Error: ${err.message || err}`
          );
        }
      })
    );
  }
}
