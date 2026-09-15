import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InvoiceConfigService {
  constructor(private prisma: PrismaService) {}

  // Invoice Category
  async getCategories(companyId: string) {
    return this.prisma.invoiceCategory.findMany({
      where: { companyId },
      include: { taxTreatment: true, numberingSeries: true }
    });
  }

  async createCategory(companyId: string, data: any) {
    return this.prisma.invoiceCategory.create({
      data: { ...data, companyId }
    });
  }

  async updateCategory(id: string, companyId: string, data: any) {
    return this.prisma.invoiceCategory.update({
      where: { id, companyId },
      data
    });
  }

  // Tax Treatment
  async getTaxTreatments(companyId: string) {
    return this.prisma.taxTreatment.findMany({
      where: { companyId }
    });
  }

  async createTaxTreatment(companyId: string, data: any) {
    return this.prisma.taxTreatment.create({
      data: { ...data, companyId }
    });
  }

  async updateTaxTreatment(id: string, companyId: string, data: any) {
    return this.prisma.taxTreatment.update({
      where: { id, companyId },
      data
    });
  }

  // Numbering Series
  async getNumberingSeries(companyId: string) {
    return this.prisma.invoiceNumberingSeries.findMany({
      where: { companyId },
      include: { financialYear: true }
    });
  }

  async createNumberingSeries(companyId: string, data: any) {
    return this.prisma.invoiceNumberingSeries.create({
      data: { ...data, companyId }
    });
  }

  async updateNumberingSeries(id: string, companyId: string, data: any) {
    return this.prisma.invoiceNumberingSeries.update({
      where: { id, companyId },
      data
    });
  }
}
