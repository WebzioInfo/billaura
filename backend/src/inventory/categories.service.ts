import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import type { Prisma } from '@prisma/client';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';



@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    if (!query) {
       return this.prisma.productCategory.findMany({
         where: { companyId, deletedAt: null },
         orderBy: { categoryName: 'asc' },
         include: {
           parent: true
         }
       });
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.ProductCategoryWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { categoryName: { contains: query.search } },
              { categoryCode: { contains: query.search } },
              { description: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.productCategory.findMany({
        where,
        skip,
        take,
        orderBy: { categoryName: 'asc' },
        include: {
          parent: true,
          _count: {
            select: { products: true, children: true }
          }
        }
      }),
      this.prisma.productCategory.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const category = await this.prisma.productCategory.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } }
      }
    });

    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const existingName = await this.prisma.productCategory.findFirst({
      where: { companyId, categoryName: dto.name, deletedAt: null }
    });
    if (existingName) throw new ConflictException('Category name already exists');

    const parentId = dto.parentId && dto.parentId.trim() !== '' ? dto.parentId.trim() : null;
    if (parentId) {
      const parentCategory = await this.prisma.productCategory.findFirst({
        where: { id: parentId, companyId, deletedAt: null }
      });
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
    }

    return this.prisma.productCategory.create({
      data: {
        companyId,
        categoryName: dto.name,
        categoryCode: dto.code || null,
        description: dto.description || null,
        parentId,
        status: dto.status || 'ACTIVE',
        color: dto.color || null,
        icon: dto.icon || null,
        displayOrder: dto.displayOrder || 0,
        imageUrl: dto.imageUrl || null,
        notes: dto.notes || null,
      }
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    await this.findOne(id); // Check existence

    if (dto.name) {
      const existingName = await this.prisma.productCategory.findFirst({
        where: { companyId, categoryName: dto.name, id: { not: id }, deletedAt: null }
      });
      if (existingName) throw new ConflictException('Category name already exists');
    }

    let parentId: string | null | undefined = undefined;
    if (dto.parentId !== undefined) {
      parentId = dto.parentId && dto.parentId.trim() !== '' ? dto.parentId.trim() : null;
      if (parentId) {
        if (parentId === id) {
          throw new ConflictException('Category cannot be its own parent');
        }
        const parentCategory = await this.prisma.productCategory.findFirst({
          where: { id: parentId, companyId, deletedAt: null }
        });
        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }
      }
    }

    return this.prisma.productCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { categoryName: dto.name }),
        ...(dto.code !== undefined && { categoryCode: dto.code || null }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(parentId !== undefined && { parentId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.color !== undefined && { color: dto.color || null }),
        ...(dto.icon !== undefined && { icon: dto.icon || null }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
      }
    });
  }

  async remove(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    await this.findOne(id);
    return this.prisma.productCategory.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async restore(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    return this.prisma.productCategory.update({
      where: { id, companyId },
      data: { deletedAt: null }
    });
  }
}
