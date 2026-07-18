import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import type { Prisma } from '@prisma/client';

export class CreateBrandDto {
  name: string;
  code: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
  status?: string;
}

export class UpdateBrandDto extends CreateBrandDto {}

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    if (!query) {
       // Return all if no pagination query
       return this.prisma.brand.findMany({
         where: { companyId, deletedAt: null },
         orderBy: { brandName: 'asc' }
       });
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.BrandWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { brandName: { contains: query.search } },
              { brandCode: { contains: query.search } },
              { description: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        skip,
        take,
        orderBy: { brandName: 'asc' },
        include: {
          _count: {
            select: { products: true }
          }
        }
      }),
      this.prisma.brand.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const brand = await this.prisma.brand.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        _count: { select: { products: true } }
      }
    });

    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(dto: CreateBrandDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const existingName = await this.prisma.brand.findFirst({
      where: { companyId, brandName: dto.name, deletedAt: null }
    });
    if (existingName) throw new ConflictException('Brand name already exists');

    const existingCode = await this.prisma.brand.findFirst({
      where: { companyId, brandCode: dto.code, deletedAt: null }
    });
    if (existingCode) throw new ConflictException('Brand code already exists');

    return this.prisma.brand.create({
      data: {
        companyId,
        brandName: dto.name,
        brandCode: dto.code,
        description: dto.description,
        logoUrl: dto.logoUrl,
        website: dto.website,
        email: dto.email,
        phone: dto.phone,
        status: dto.status || 'ACTIVE'
      }
    });
  }

  async update(id: string, dto: UpdateBrandDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    await this.findOne(id); // Check existence

    if (dto.name) {
      const existingName = await this.prisma.brand.findFirst({
        where: { companyId, brandName: dto.name, id: { not: id }, deletedAt: null }
      });
      if (existingName) throw new ConflictException('Brand name already exists');
    }

    if (dto.code) {
      const existingCode = await this.prisma.brand.findFirst({
        where: { companyId, brandCode: dto.code, id: { not: id }, deletedAt: null }
      });
      if (existingCode) throw new ConflictException('Brand code already exists');
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        brandName: dto.name,
        brandCode: dto.code,
        description: dto.description,
        logoUrl: dto.logoUrl,
        website: dto.website,
        email: dto.email,
        phone: dto.phone,
        status: dto.status
      }
    });
  }

  async remove(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    await this.findOne(id);
    return this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async restore(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    return this.prisma.brand.update({
      where: { id, companyId },
      data: { deletedAt: null }
    });
  }
}
