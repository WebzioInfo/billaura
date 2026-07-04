import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTaxGroupDto } from './dto/tax-group.dto';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class TaxGroupsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    return this.prisma.taxGroup.findMany({
      where: {},
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateTaxGroupDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    const existing = await this.prisma.taxGroup.findFirst({
      where: { companyId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Tax Group with name ${dto.name} already exists`);
    }

    return this.prisma.taxGroup.create({
      data: { 
        name: dto.name,
        totalRate: dto.totalRate || 0,
        cgstRate: dto.cgstRate || 0,
        sgstRate: dto.sgstRate || 0,
        igstRate: dto.igstRate || 0,
        cessRate: dto.cessRate || 0,
        companyId 
      },
    });
  }
}
