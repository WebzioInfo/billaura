import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    return this.prisma.unit.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateUnitDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    const existing = await this.prisma.unit.findFirst({
      where: { companyId, abbreviation: dto.abbreviation },
    });
    if (existing) {
      throw new ConflictException(`Unit with abbreviation ${dto.abbreviation} already exists`);
    }

    return this.prisma.unit.create({
      data: {
        name: dto.name,
        abbreviation: dto.abbreviation,
        decimals: dto.decimals !== undefined ? dto.decimals : 2,
        companyId,
      },
    });
  }
}
