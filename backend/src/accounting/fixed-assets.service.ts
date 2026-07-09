import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class FixedAssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.fixedAsset.findMany({
      where: { companyId },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  async create(data: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.fixedAsset.create({
      data: {
        ...data,
        companyId,
      }
    });
  }
}
