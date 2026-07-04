import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.project.findMany({
      where: {},
      include: { customer: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(data: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.project.create({
      data: {
        ...data,
        companyId,
      }
    });
  }
}
