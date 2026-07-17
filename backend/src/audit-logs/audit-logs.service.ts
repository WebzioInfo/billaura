import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page: number; limit: number; tableName?: string; userId?: string; action?: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.AuditLogWhereInput = {
      companyId,
      ...(query.tableName ? { tableName: query.tableName } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          tableName: true,
          oldValues: true,
          newValues: true,
          ipAddress: true,
          createdAt: true,
          userId: true
        }
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    
    // We fetch user names manually if needed or leave it for frontend to match
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
