import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly localBrands = new Set<string>();

  async findAll() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) return Array.from(this.localBrands).map(name => ({ id: name, name }));

    const dbProducts = await this.prisma.product.findMany({
      where: {},
      select: { brand: true },
      distinct: ['brand'],
    });

    const dbBrands = dbProducts.map(p => p.brand).filter(Boolean) as string[];
    const all = new Set([...dbBrands, ...this.localBrands]);
    return Array.from(all).map(name => ({ id: name, name }));
  }

  async create(name: string) {
    const clean = name.trim();
    this.localBrands.add(clean);
    return { id: clean, name: clean };
  }

  async update(oldName: string, name: string) {
    const cleanOld = oldName.trim();
    const cleanNew = name.trim();
    
    this.localBrands.delete(cleanOld);
    this.localBrands.add(cleanNew);

    const companyId = CompanyContext.getCompanyId();
    if (companyId) {
      await this.prisma.product.updateMany({
        where: { companyId, brand: cleanOld },
        data: { brand: cleanNew },
      });
    }

    return { id: cleanNew, name: cleanNew };
  }

  async remove(name: string) {
    this.localBrands.delete(name);
  }
}
