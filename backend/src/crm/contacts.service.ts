import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateContactDto } from './dto/contact.dto';
import { UpdateContactDto } from './dto/contact.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.ContactWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search } },
              { lastName: { contains: query.search } },
              { email: { contains: query.search } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true },
        orderBy: { createdAt: query.sortOrder || 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: { businessPartner: true },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return contact;
  }

  async create(dto: CreateContactDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const businessPartnerId = (dto as any).customerId || (dto as any).vendorId || (dto as any).businessPartnerId;
    const { customerId, vendorId, ...restDto } = dto as any;

    return this.prisma.contact.create({
      data: {
        ...restDto,
        businessPartnerId,
        companyId,
      },
    });
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.findOne(id);
    const businessPartnerId = (dto as any).customerId || (dto as any).vendorId || (dto as any).businessPartnerId;
    const { customerId, vendorId, ...restDto } = dto as any;

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...restDto,
        ...(businessPartnerId && { businessPartnerId }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
