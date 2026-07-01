import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class IncomeCategoriesService {
  async findAll(companyId: string) {
    return prisma.incomeCategory.findMany({
      where: { companyId },
      include: {
        account: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const category = await prisma.incomeCategory.findFirst({
      where: { id, companyId },
      include: {
        account: true,
      },
    });
    if (!category) {
      throw new NotFoundException('Income category not found');
    }
    return category;
  }

  async create(companyId: string, data: any) {
    return prisma.incomeCategory.create({
      data: {
        ...data,
        companyId,
      },
      include: {
        account: true,
      },
    });
  }

  async update(companyId: string, id: string, data: any) {
    const existing = await this.findOne(companyId, id);
    return prisma.incomeCategory.update({
      where: { id: existing.id },
      data,
      include: {
        account: true,
      },
    });
  }

  async remove(companyId: string, id: string) {
    const existing = await this.findOne(companyId, id);
    return prisma.incomeCategory.delete({
      where: { id: existing.id },
    });
  }
}
