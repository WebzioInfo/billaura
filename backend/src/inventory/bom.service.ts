import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class BomService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) return [];

    return this.prisma.billOfMaterial.findMany({
      where: { companyId },
      include: { product: true, items: { include: { rawMaterial: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id, companyId },
      include: { product: true, items: { include: { rawMaterial: true } } },
    });
    if (!bom) throw new NotFoundException('BOM not found');
    return bom;
  }

  async create(data: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    
    // Simplistic create, omitting transaction for now
    return this.prisma.billOfMaterial.create({
      data: {
        name: data.name || 'New BOM',
        productId: data.productId,
        companyId,
        items: {
          create: data.items?.map((item: any) => ({
            rawMaterialId: item.rawMaterialId,
            quantity: item.quantity,
            unitCost: item.unitCost || 0,
          })) || []
        }
      },
      include: { items: true },
    });
  }

  async update(id: string, data: any) {
    const _companyId = CompanyContext.getCompanyId();
    const bom = await this.findOne(id);
    
    return this.prisma.billOfMaterial.update({
      where: { id: bom.id },
      data: {
        name: data.name,
        totalCost: data.totalCost
      },
    });
  }

  async remove(id: string) {
    const _companyId = CompanyContext.getCompanyId();
    const bom = await this.findOne(id);
    return this.prisma.billOfMaterial.delete({
      where: { id: bom.id },
    });
  }
}
