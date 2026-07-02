import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly localCategories = new Set<string>();

  async findAll() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) return Array.from(this.localCategories).map(name => ({ id: name, name }));

    const dbProducts = await this.prisma.product.findMany({
      where: { companyId, deletedAt: null },
      select: { category: true },
      distinct: ['category'],
    });

    const dbCategories = dbProducts.map(p => p.category).filter(Boolean) as string[];
    const all = new Set([...dbCategories, ...this.localCategories]);
    return Array.from(all).map(name => ({ id: name, name }));
  }

  async create(name: string) {
    const clean = name.trim();
    this.localCategories.add(clean);
    return { id: clean, name: clean };
  }

  async update(oldName: string, name: string) {
    const cleanOld = oldName.trim();
    const cleanNew = name.trim();
    
    this.localCategories.delete(cleanOld);
    this.localCategories.add(cleanNew);

    const companyId = CompanyContext.getCompanyId();
    if (companyId) {
      await this.prisma.product.updateMany({
        where: { companyId, category: cleanOld },
        data: { category: cleanNew },
      });
    }

    return { id: cleanNew, name: cleanNew };
  }

  async remove(name: string) {
    this.localCategories.delete(name);
  }
}
