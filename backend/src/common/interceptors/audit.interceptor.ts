import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    
    // Only audit mutating requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const url = req.url;
      const user = req.user;
      const ip = req.ip || req.connection?.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const body = req.body;
      const companyId = req.headers['x-company-id'] || user?.companyId;

      // Extract entity type from URL (e.g. /api/invoices -> INVOICES)
      const pathParts = url.split('/').filter(Boolean);
      const tableName = pathParts.length > 1 ? pathParts[1].toUpperCase() : 'UNKNOWN';
      const entityId = req.params.id || null;

      let action = 'UPDATE';
      if (method === 'POST') action = 'CREATE';
      if (method === 'DELETE') action = 'DELETE';

      return next.handle().pipe(
        tap(async (data) => {
          try {
            const finalCompanyId = companyId || data?.tenant?.id || data?.user?.companyId || null;
            const finalUserId = user?.userId || user?.id || data?.user?.id || null;

            if (!finalCompanyId || !finalUserId) {
              return; // Skip audit log if we can't identify the user or company
            }

            await this.prisma.auditLog.create({
              data: {
                companyId: finalCompanyId,
                userId: finalUserId,
                action,
                tableName,
                oldValues: method !== 'POST' ? undefined : undefined,
                newValues: method !== 'DELETE' ? (data || body) : undefined,
                ipAddress: ip,
              }
            });
          } catch (err) {
            console.error('Failed to write audit log', err);
          }
        })
      );
    }

    return next.handle();
  }
}
