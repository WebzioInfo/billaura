import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { CompanyContext } from "../context/company-context";
import * as jwt from "jsonwebtoken";

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let companyId: string | null = null;
    let userId: string | null = null;

    const requestedHeaderCompanyId = (req.headers["x-company-id"] || req.headers["x-tenant-id"]) as string | undefined;
    const authHeader = req.headers["authorization"];

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded) {
          const jwtCompanyId = decoded.companyId || decoded.tenantId || null;
          if (decoded.globalRole === "SUPER_ADMIN" && requestedHeaderCompanyId) {
            companyId = requestedHeaderCompanyId;
          } else {
            companyId = jwtCompanyId;
          }
          userId = decoded.sub || decoded.userId || null;
        }
      } catch {
        companyId = null;
      }
    }

    CompanyContext.run(companyId, userId, () => {
      (req as any).companyId = companyId;
      (req as any).userId = userId;
      next();
    });
  }
}
