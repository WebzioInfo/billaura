import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.RoleWhereInput = {
      OR: [
        { companyId },
        { isSystem: true },
      ],
      ...(query.search
        ? {
            name: { contains: query.search },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        skip,
        take,
        include: { permissions: true },
        orderBy: { isSystem: 'desc' },
      }),
      this.prisma.role.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const role = await this.prisma.role.findFirst({
      where: {
        id,
        OR: [
          { companyId },
          { isSystem: true },
        ],
      },
      include: { permissions: true },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async create(dto: CreateRoleDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const existing = await this.prisma.role.findFirst({
      where: {
        companyId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(`Role with name '${dto.name}' already exists in this company`);
    }

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: dto.name,
          description: dto.description,
          companyId,
          isSystem: false,
        },
      });

      if (dto.permissions?.length) {
        await tx.rolePermission.createMany({
          data: dto.permissions.map((p) => ({
            roleId: role.id,
            resource: p.resource,
            action: p.action,
          })),
        });
      }

      return tx.role.findUnique({
        where: { id: role.id },
        include: { permissions: true },
      });
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.role.findFirst({
        where: {
          companyId,
          name: dto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Role with name '${dto.name}' already exists`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
        },
      });

      if (dto.permissions !== undefined) {
        // Delete all old permissions for this role
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Insert new permissions
        if (dto.permissions.length) {
          await tx.rolePermission.createMany({
            data: dto.permissions.map((p) => ({
              roleId: id,
              resource: p.resource,
              action: p.action,
            })),
          });
        }
      }

      return tx.role.findUnique({
        where: { id },
        include: { permissions: true },
      });
    });
  }

  async remove(id: string) {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    // Check if any company users are using this role
    const inUse = await this.prisma.companyUser.findFirst({
      where: { customRoleId: id },
    });

    if (inUse) {
      throw new ConflictException('Role is currently assigned to users and cannot be deleted');
    }

    return this.prisma.role.delete({
      where: { id },
    });
  }
}
