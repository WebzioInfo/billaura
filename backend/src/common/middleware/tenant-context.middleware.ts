import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { CompanyContext } from "../context/company-context";
import * as jwt from "jsonwebtoken";

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret =
      this.configService.get<string>("JWT_SECRET") ||
      process.env.JWT_SECRET ||
      "";
  }

  use(req: Request, res: Response, next: NextFunction) {
    let companyId: string | null = null;
    let userId: string | null = null;

    const requestedHeaderCompanyId = (req.headers["x-company-id"] ||
      req.headers["x-tenant-id"]) as string | undefined;
    const authHeader = req.headers["authorization"];

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        if (this.jwtSecret && token) {
          const verified = jwt.verify(token, this.jwtSecret) as any;
          if (verified) {
            const jwtCompanyId = verified.companyId || verified.tenantId || null;
            if (verified.globalRole === "SUPER_ADMIN" && requestedHeaderCompanyId) {
              companyId = requestedHeaderCompanyId;
            } else {
              companyId = jwtCompanyId;
            }
            userId = verified.sub || verified.userId || null;
          }
        }
      } catch {
        // Cryptographic verification failed (expired, tampered, or invalid signature)
        // Keep context null to prevent unauthorized context injection
        companyId = null;
        userId = null;
      }
    }

    CompanyContext.run(companyId, userId, () => {
      (req as any).companyId = companyId;
      (req as any).userId = userId;
      next();
    });
  }
}

