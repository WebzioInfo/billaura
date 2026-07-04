import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLeadDto } from './dto/lead.dto';
import { UpdateLeadDto } from './dto/lead.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.BusinessPartnerWhereInput = {
      companyId,
      bpType: 'LEAD',
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { tradeName: { contains: query.search } },
              { email: { contains: query.search } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.businessPartner.findMany({
        where,
        skip,
        take,
        include: { crmActivities: true },
        orderBy: { createdAt: query.sortOrder || 'desc' },
      }),
      this.prisma.businessPartner.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const lead = await this.prisma.businessPartner.findFirst({
      where: {
        id,
        companyId,
      },
      include: { crmActivities: true },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }

  async create(dto: CreateLeadDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    return this.prisma.businessPartner.create({
      data: {
        ...dto,
        status: dto.status as any,
        bpType: 'LEAD',
        bpCode: 'LEAD-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        companyId,
      },
    });
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.findOne(id);
    return this.prisma.businessPartner.update({
      where: { id },
      data: {
        ...dto,
        status: dto.status as any,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.businessPartner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
