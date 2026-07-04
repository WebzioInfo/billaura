import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) return [];

    return this.prisma.inventoryBatch.findMany({
      where: {},
      include: { product: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: { id },
      include: { product: true, warehouse: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async create(data: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.inventoryBatch.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(id: string, data: any) {
    const companyId = CompanyContext.getCompanyId();
    const batch = await this.findOne(id);
    return this.prisma.inventoryBatch.update({
      where: { id: batch.id },
      data,
    });
  }

  async remove(id: string) {
    const companyId = CompanyContext.getCompanyId();
    const batch = await this.findOne(id);
    return this.prisma.inventoryBatch.delete({
      where: { id: batch.id },
    });
  }
}
