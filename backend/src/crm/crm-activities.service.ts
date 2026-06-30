import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class CrmActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.CrmActivityWhereInput = {
      companyId,
      ...(query.search
        ? {
            OR: [
              { subject: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.crmActivity.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true },
        orderBy: { createdAt: query.sortOrder || 'desc' },
      }),
      this.prisma.crmActivity.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const activity = await this.prisma.crmActivity.findFirst({
      where: {
        id,
        companyId,
      },
      include: { businessPartner: true },
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return activity;
  }

  async create(dto: CreateActivityDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const businessPartnerId = (dto as any).leadId || (dto as any).customerId || (dto as any).businessPartnerId;
    const { leadId, customerId, ...restDto } = dto as any;
    
    return this.prisma.crmActivity.create({
      data: {
        ...restDto,
        businessPartnerId,
        companyId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  async update(id: string, dto: UpdateActivityDto) {
    await this.findOne(id);
    const businessPartnerId = (dto as any).leadId || (dto as any).customerId || (dto as any).businessPartnerId;
    const { leadId, customerId, ...restDto } = dto as any;

    return this.prisma.crmActivity.update({
      where: { id },
      data: {
        ...restDto,
        ...(businessPartnerId && { businessPartnerId }),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.crmActivity.delete({
      where: { id },
    });
  }
}
