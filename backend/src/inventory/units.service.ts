import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { DEFAULT_UNITS_LIBRARY } from './default-units.data';

export interface CreateUnitDto {
  name: string;
  code: string;
  abbreviation?: string;
  symbol?: string;
  category?: string;
  decimals?: number;
  keywords?: string;
}

export interface CreateUnitConversionDto {
  fromUnitId: string;
  toUnitId: string;
  multiplier: number;
  description?: string;
}

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const companyId = CompanyContext.getCompanyId();

    // Fetch custom units created for this tenant
    const dbUnits = companyId
      ? await this.prisma.unit.findMany({
          where: { companyId, isActive: true },
          orderBy: { name: 'asc' },
        })
      : [];

    // Map system units from default library
    const systemUnits = DEFAULT_UNITS_LIBRARY.map((unit) => ({
      id: unit.code,
      companyId: null,
      code: unit.code,
      name: unit.name,
      abbreviation: unit.abbreviation,
      symbol: unit.symbol,
      category: unit.category,
      decimals: unit.decimals,
      isSystem: true,
      keywords: unit.keywords,
      isActive: true,
    }));

    // Merge system units with custom DB units (custom units override system unit code if duplicate)
    const customCodes = new Set(dbUnits.map((u) => u.code.toUpperCase()));
    const filteredSystemUnits = systemUnits.filter(
      (u) => !customCodes.has(u.code.toUpperCase())
    );

    return [...filteredSystemUnits, ...dbUnits];
  }

  async findByCodeOrId(identifier: string) {
    const all = await this.findAll();
    const found = all.find(
      (u) =>
        u.id === identifier ||
        u.code.toUpperCase() === identifier.toUpperCase() ||
        u.name.toLowerCase() === identifier.toLowerCase()
    );
    return (
      found || {
        id: identifier,
        code: identifier,
        name: identifier,
        abbreviation: identifier,
        symbol: identifier,
        category: 'Custom',
        decimals: 2,
        isSystem: false,
      }
    );
  }

  async create(dto: CreateUnitDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const code = (dto.code || dto.abbreviation || dto.name).toUpperCase().replace(/\s+/g, '_');

    const existing = await this.prisma.unit.findFirst({
      where: { companyId, code },
    });

    if (existing) {
      return this.prisma.unit.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          abbreviation: dto.abbreviation || dto.symbol || code,
          symbol: dto.symbol || dto.abbreviation || code,
          category: dto.category || 'Custom',
          decimals: dto.decimals ?? 2,
          keywords: dto.keywords || `${dto.name} ${code}`,
          isActive: true,
        },
      });
    }

    return this.prisma.unit.create({
      data: {
        companyId,
        code,
        name: dto.name,
        abbreviation: dto.abbreviation || dto.symbol || code,
        symbol: dto.symbol || dto.abbreviation || code,
        category: dto.category || 'Custom',
        decimals: dto.decimals ?? 2,
        keywords: dto.keywords || `${dto.name} ${code}`,
        isSystem: false,
        isActive: true,
      },
    });
  }

  // --- UNIT CONVERSIONS ---
  async getConversions() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) return [];

    return this.prisma.unitConversion.findMany({
      where: { companyId },
      include: {
        fromUnit: true,
        toUnit: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createConversion(dto: CreateUnitConversionDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const fromUnit = await this.resolveUnitRecord(dto.fromUnitId, companyId);
    const toUnit = await this.resolveUnitRecord(dto.toUnitId, companyId);

    const description =
      dto.description || `1 ${fromUnit.name} = ${dto.multiplier} ${toUnit.name}`;

    return this.prisma.unitConversion.upsert({
      where: {
        companyId_fromUnitId_toUnitId: {
          companyId,
          fromUnitId: fromUnit.id,
          toUnitId: toUnit.id,
        },
      },
      create: {
        companyId,
        fromUnitId: fromUnit.id,
        toUnitId: toUnit.id,
        multiplier: Number(dto.multiplier),
        description,
      },
      update: {
        multiplier: Number(dto.multiplier),
        description,
      },
    });
  }

  async convertQuantity(qty: number, fromUnitCode: string, toUnitCode: string): Promise<number> {
    if (fromUnitCode.toUpperCase() === toUnitCode.toUpperCase()) {
      return qty;
    }

    const companyId = CompanyContext.getCompanyId();
    if (companyId) {
      const conversions = await this.getConversions();
      const direct = conversions.find(
        (c) =>
          (c.fromUnit.code.toUpperCase() === fromUnitCode.toUpperCase() ||
            c.fromUnitId === fromUnitCode) &&
          (c.toUnit.code.toUpperCase() === toUnitCode.toUpperCase() ||
            c.toUnitId === toUnitCode)
      );

      if (direct) {
        return qty * direct.multiplier;
      }

      const reverse = conversions.find(
        (c) =>
          (c.fromUnit.code.toUpperCase() === toUnitCode.toUpperCase() ||
            c.fromUnitId === toUnitCode) &&
          (c.toUnit.code.toUpperCase() === fromUnitCode.toUpperCase() ||
            c.toUnitId === fromUnitCode)
      );

      if (reverse && reverse.multiplier > 0) {
        return qty / reverse.multiplier;
      }
    }

    // Default hardcoded mathematical conversions
    const from = fromUnitCode.toUpperCase();
    const to = toUnitCode.toUpperCase();

    if (from === 'KG' && to === 'GRAM') return qty * 1000;
    if (from === 'GRAM' && to === 'KG') return qty / 1000;
    if (from === 'LTR' && to === 'ML') return qty * 1000;
    if (from === 'ML' && to === 'LTR') return qty / 1000;
    if (from === 'METER' && to === 'CM') return qty * 100;
    if (from === 'CM' && to === 'METER') return qty / 100;
    if (from === 'DOZEN' && to === 'PCS') return qty * 12;
    if (from === 'PCS' && to === 'DOZEN') return qty / 12;

    return qty;
  }

  private async resolveUnitRecord(unitCodeOrId: string, companyId: string) {
    const existing = await this.prisma.unit.findFirst({
      where: {
        OR: [{ id: unitCodeOrId }, { companyId, code: unitCodeOrId.toUpperCase() }],
      },
    });

    if (existing) return existing;

    const sysUnit = DEFAULT_UNITS_LIBRARY.find(
      (u) => u.code.toUpperCase() === unitCodeOrId.toUpperCase()
    );

    const code = (sysUnit?.code || unitCodeOrId).toUpperCase();
    const name = sysUnit?.name || unitCodeOrId;
    const abbreviation = sysUnit?.abbreviation || code;

    return this.prisma.unit.create({
      data: {
        companyId,
        code,
        name,
        abbreviation,
        symbol: sysUnit?.symbol || abbreviation,
        category: sysUnit?.category || 'Custom',
        decimals: sysUnit?.decimals ?? 2,
        isSystem: true,
        isActive: true,
      },
    });
  }
}
