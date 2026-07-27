import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class SerialsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) return [];

    return this.prisma.inventorySerial.findMany({
      where: { companyId },
      include: { product: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    const serial = await this.prisma.inventorySerial.findFirst({
      where: { id, companyId },
      include: { product: true, warehouse: true },
    });
    if (!serial) throw new NotFoundException('Serial not found');
    return serial;
  }

  async create(data: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.inventorySerial.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(id: string, data: any) {
    const _companyId = CompanyContext.getCompanyId();
    const serial = await this.findOne(id);
    return this.prisma.inventorySerial.update({
      where: { id: serial.id },
      data,
    });
  }

  async remove(id: string) {
    const _companyId = CompanyContext.getCompanyId();
    const serial = await this.findOne(id);
    return this.prisma.inventorySerial.delete({
      where: { id: serial.id },
    });
  }
}
