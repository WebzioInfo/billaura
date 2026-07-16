import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.BranchWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { code: { contains: query.search } },
              { email: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.branch.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: query.sortOrder || 'desc' },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return branch;
  }

  async create(dto: CreateBranchDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Check if name unique under company
    const existing = await this.prisma.branch.findFirst({
      where: {
        companyId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(`Branch with name '${dto.name}' already exists in this company`);
    }

    // Handle isDefault constraints
    if (dto.isDefault) {
      await this.prisma.branch.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.branch.create({
      data: {
        ...dto,
        companyId,
      },
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const branch = await this.findOne(id);

    if (dto.name && dto.name !== branch.name) {
      const existing = await this.prisma.branch.findFirst({
        where: {
          companyId,
          name: dto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Branch with name '${dto.name}' already exists`);
      }
    }

    if (dto.isDefault) {
      await this.prisma.branch.updateMany({
        where: { companyId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const branch = await this.findOne(id);
    
    if (branch.isDefault) {
      throw new ConflictException('Cannot delete the default branch. Please set another branch as default first.');
    }
    
    // Check if the branch is used in any related financial models
    const expenseInUse = await this.prisma.expense.findFirst({
      where: { branchId: id }
    });

    const otherIncomeInUse = await this.prisma.otherIncome.findFirst({
      where: { branchId: id }
    });
    
    if (expenseInUse || otherIncomeInUse) {
      throw new ConflictException('Branch has existing financial transactions and cannot be deleted.');
    }

    return this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
