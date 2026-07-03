import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CompanyContext } from '../context/company-context';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let companyId = (req.headers['x-company-id'] || req.headers['x-tenant-id']) as string | undefined;
    let userId: string | null = null;

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        // Decode without verification just to extract context early in middleware
        const decoded = jwt.decode(token) as any;
        if (decoded) {
          companyId = companyId || decoded.tenantId || decoded.companyId;
          userId = decoded.sub || decoded.userId || null;
        }
      } catch {
        // Suppress decode errors (guards will handle signature validation later)
      }
    }

    CompanyContext.run(companyId || null, userId, () => {
      // Attach to request object for standard express usage
      (req as any).companyId = companyId || null;
      (req as any).userId = userId;
      next();
    });
  }
}
