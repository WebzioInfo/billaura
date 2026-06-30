import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.BrandWhereInput = {
      companyId,
      ...(query.search
        ? {
            name: { contains: query.search },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        skip,
        take,
      }),
      this.prisma.brand.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const brand = await this.prisma.brand.findFirst({
      where: { id, companyId },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return brand;
  }

  async create(dto: CreateBrandDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const existing = await this.prisma.brand.findFirst({
      where: { companyId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Brand '${dto.name}' already exists`);
    }

    return this.prisma.brand.create({
      data: {
        ...dto,
        companyId,
      },
    });
  }

  async update(id: string, dto: UpdateBrandDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const brand = await this.findOne(id);

    if (dto.name && dto.name !== brand.name) {
      const existing = await this.prisma.brand.findFirst({
        where: { companyId, name: dto.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Brand '${dto.name}' already exists`);
      }
    }

    return this.prisma.brand.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.brand.delete({
      where: { id },
    });
  }
}
