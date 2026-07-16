import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DocumentTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.documentTemplate.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id, companyId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async findDefault(companyId: string, type: string) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: { companyId, type, isDefault: true },
    });
    return template || this.prisma.documentTemplate.findFirst({
      where: { companyId, type },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(companyId: string, data: any) {
    // If setting as default, unset others of same type
    if (data.isDefault) {
      await this.prisma.documentTemplate.updateMany({
        where: { companyId, type: data.type },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentTemplate.create({
      data: {
        companyId,
        name: data.name,
        type: data.type,
        htmlContent: data.htmlContent,
        isSystem: false,
        isDefault: data.isDefault || false,
        theme: data.theme || 'classic',
        colors: data.colors ?? Prisma.DbNull,
        typography: data.typography ?? Prisma.DbNull,
        layout: data.layout ?? Prisma.DbNull,
        elements: data.elements ?? Prisma.DbNull,
        terms: data.terms,
        notes: data.notes,
      },
    });
  }

  async update(companyId: string, id: string, data: any) {
    // Check existence
    await this.findOne(companyId, id);

    // If setting as default, unset others
    if (data.isDefault) {
      const existing = await this.findOne(companyId, id);
      await this.prisma.documentTemplate.updateMany({
        where: { companyId, type: data.type || existing.type },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentTemplate.update({
      where: { id, companyId },
      data: {
        name: data.name,
        type: data.type,
        htmlContent: data.htmlContent,
        isDefault: data.isDefault,
        theme: data.theme,
        colors: data.colors ?? undefined,
        typography: data.typography ?? undefined,
        layout: data.layout ?? undefined,
        elements: data.elements ?? undefined,
        terms: data.terms,
        notes: data.notes,
      },
    });
  }

  async remove(companyId: string, id: string) {
    const template = await this.findOne(companyId, id);
    if (template.isSystem) {
      throw new Error('Cannot delete system templates');
    }
    return this.prisma.documentTemplate.delete({
      where: { id, companyId },
    });
  }
}
