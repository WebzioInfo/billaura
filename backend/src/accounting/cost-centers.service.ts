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

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const { skip, take } = getPagination(query);

    const where: Prisma.CostCenterWhereInput = {
      companyId,
      ...(query.search ? { name: { contains: query.search } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.costCenter.findMany({
        where,
        skip,
        take,
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
      where: { id },
      include: { children: true },
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

  async remove(id: string) {
    await this.findOne(id);

    const inUse = await this.prisma.journalLine.findFirst({
      where: { costCenterId: id },
    });

    if (inUse) throw new ConflictException('Cannot delete cost center with existing transactions');

    return this.prisma.costCenter.delete({
      where: { id },
    });
  }
}
