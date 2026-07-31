import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import type { Prisma, ProductCategory } from '@prisma/client';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapCategory(c: ProductCategory & { _count?: any, parent?: any, children?: any }) {
    if (!c) return c;
    const { categoryName, categoryCode, ...rest } = c;
    return { ...rest, name: categoryName, code: categoryCode };
  }

  async findAll(query?: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    if (!query) {
       const results = await this.prisma.productCategory.findMany({
         where: { companyId, deletedAt: null },
         orderBy: { categoryName: 'asc' },
         include: {
           parent: true
         }
       });
       return results.map(c => this.mapCategory(c));
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.ProductCategoryWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { categoryName: { contains: query.search, mode: 'insensitive' } },
              { categoryCode: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
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

    const mappedData = data.map(c => this.mapCategory(c));
    return toPaginatedResult(mappedData, total, query);
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
    return this.mapCategory(category);
  }

  async create(dto: CreateCategoryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    if (!dto.name || dto.name.trim() === '') {
      throw new ConflictException('Category name cannot be empty');
    }

    const nameToSave = dto.name.trim();

    // Check case-insensitive duplicate
    const existingName = await this.prisma.productCategory.findFirst({
      where: { 
        companyId, 
        categoryName: { equals: nameToSave, mode: 'insensitive' }, 
        deletedAt: null 
      }
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

    const created = await this.prisma.productCategory.create({
      data: {
        companyId,
        categoryName: nameToSave,
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
    return this.mapCategory(created);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    await this.findOne(id); // Check existence

    let nameToSave = undefined;
    if (dto.name !== undefined) {
      if (dto.name.trim() === '') {
        throw new ConflictException('Category name cannot be empty');
      }
      nameToSave = dto.name.trim();
      const existingName = await this.prisma.productCategory.findFirst({
        where: { 
          companyId, 
          categoryName: { equals: nameToSave, mode: 'insensitive' }, 
          id: { not: id }, 
          deletedAt: null 
        }
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

    const updated = await this.prisma.productCategory.update({
      where: { id },
      data: {
        ...(nameToSave !== undefined && { categoryName: nameToSave }),
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
    return this.mapCategory(updated);
  }

  async remove(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    const category = await this.prisma.productCategory.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        _count: { select: { products: true, children: true } }
      }
    });

    if (!category) throw new NotFoundException('Category not found');

    if (category._count.products > 0) {
      throw new ConflictException(`Cannot delete category "${category.categoryName}" as it is linked to ${category._count.products} product(s). Please reassign or delete the products first.`);
    }

    if (category._count.children > 0) {
      throw new ConflictException(`Cannot delete category "${category.categoryName}" as it has ${category._count.children} sub-category(ies).`);
    }

    const deleted = await this.prisma.productCategory.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    return this.mapCategory(deleted);
  }

  async restore(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    const restored = await this.prisma.productCategory.update({
      where: { id, companyId },
      data: { deletedAt: null }
    });
    return this.mapCategory(restored);
  }
}
