import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto/cost-center.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class CostCentersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto & { includeInactive?: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const { skip, take } = getPagination(query);

    const where: Prisma.CostCenterWhereInput = {
      companyId,
      ...(query.includeInactive === 'true' ? {} : { isActive: true }),
      ...(query.search ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ]
      } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.costCenter.findMany({
        where,
        skip,
        take,
        include: {
          departments: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.costCenter.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const costCenter = await this.prisma.costCenter.findFirst({
      where: { id, companyId },
      include: { children: true, departments: true },
    });

    if (!costCenter) throw new NotFoundException(`CostCenter with ID ${id} not found`);

    return costCenter;
  }

  async create(dto: CreateCostCenterDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const existing = await this.prisma.costCenter.findFirst({
      where: { companyId, name: dto.name },
    });

    if (existing) throw new ConflictException(`Cost Center '${dto.name}' already exists`);

    return this.prisma.costCenter.create({
      data: {
        companyId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        parentId: dto.parentId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCostCenterDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const cc = await this.findOne(id);

    if (dto.name && dto.name !== cc.name) {
      const existing = await this.prisma.costCenter.findFirst({
        where: { companyId, name: dto.name, NOT: { id } },
      });
      if (existing) throw new ConflictException(`Cost Center '${dto.name}' already exists`);
    }

    return this.prisma.costCenter.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        parentId: dto.parentId,
        isActive: dto.isActive,
      },
    });
  }

  async checkDependencies(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const [expenses, departments] = await Promise.all([
      this.prisma.journalLine.count({ where: { costCenterId: id } }),
      this.prisma.department.count({ where: { costCenterId: id, deletedAt: null } }),
    ]);

    return {
      expenses,
      departments,
      hasDependencies: expenses > 0 || departments > 0
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    const deps = await this.checkDependencies(id);

    if (deps.hasDependencies) {
      throw new ConflictException({
        message: `Cannot delete Cost Center in use. It is linked to ${deps.expenses} Expense Entries, and ${deps.departments} Departments.`,
        dependencies: deps
      });
    }

    return this.prisma.costCenter.delete({
      where: { id },
    });
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.costCenter.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async restore(id: string) {
    return this.prisma.costCenter.update({
      where: { id },
      data: { isActive: true }
    });
  }
}
