import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    return this.prisma.companyUser.findMany({
      where: { companyId },
      include: {
        user: {
          select: { id: true, name: true, email: true, isActive: true, emailVerified: true }
        },
        customRole: true,
      },
      orderBy: { user: { name: 'asc' } }
    });
  }

  async inviteUser(dto: { email: string, name: string, role: UserRole, customRoleId?: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    if (dto.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot invite a SUPER_ADMIN to a company');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Check if user already exists globally
      let user = await tx.user.findUnique({ where: { email: dto.email } });

      if (!user) {
        // Generate a random temporary password
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(tempPassword, salt);

        user = await tx.user.create({
          data: {
            email: dto.email,
            name: dto.name,
            passwordHash,
            globalRole: 'ACCOUNTANT',
            emailVerified: true,
          }
        });
      }

      // 2. Check if they are already in this company
      const existingCompanyUser = await tx.companyUser.findUnique({
        where: {
          companyId_userId: {
            companyId,
            userId: user.id
          }
        }
      });

      if (existingCompanyUser) {
        throw new ConflictException('User is already part of this company');
      }

      // 3. Add to company
      const companyUser = await tx.companyUser.create({
        data: {
          companyId,
          userId: user.id,
          role: dto.role,
          customRoleId: dto.customRoleId || null
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          customRole: true
        }
      });

      return companyUser;
    });
  }

  async updateUserRole(userId: string, dto: { role: UserRole, customRoleId?: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const companyUser = await this.prisma.companyUser.findUnique({
      where: {
        companyId_userId: { companyId, userId }
      }
    });

    if (!companyUser) {
      throw new NotFoundException('User not found in this company');
    }

    if (dto.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot assign SUPER_ADMIN role');
    }

    return this.prisma.companyUser.update({
      where: {
        companyId_userId: { companyId, userId }
      },
      data: {
        role: dto.role,
        customRoleId: dto.customRoleId || null
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        customRole: true
      }
    });
  }

  async removeUser(userId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const companyUser = await this.prisma.companyUser.findUnique({
      where: {
        companyId_userId: { companyId, userId }
      }
    });

    if (!companyUser) {
      throw new NotFoundException('User not found in this company');
    }

    // In a real app we'd verify the requesting user isn't removing themselves if they are the only admin

    await this.prisma.companyUser.delete({
      where: {
        companyId_userId: { companyId, userId }
      }
    });

    return { success: true };
  }
}
