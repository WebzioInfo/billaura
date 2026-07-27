import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDeliveryNoteDto, UpdateDeliveryNoteDto } from './dto/delivery-note.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class DeliveryNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const { skip, take } = getPagination(query);

    const where: Prisma.DeliveryNoteWhereInput = {
      companyId,
      ...(query.search ? { noteNo: { contains: query.search } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.deliveryNote.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.deliveryNote.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');
    const note = await this.prisma.deliveryNote.findFirst({
      where: { id },
      include: { businessPartner: true, items: true },
    });
    if (!note) throw new NotFoundException('Delivery Note not found');
    return note;
  }

  async create(dto: CreateDeliveryNoteDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const existing = await this.prisma.deliveryNote.findFirst({
      where: { companyId, noteNo: dto.noteNo },
    });
    if (existing) throw new ConflictException('Note number already exists');

    return this.prisma.deliveryNote.create({
      data: {
        companyId,
        businessPartnerId: dto.businessPartnerId,
        noteNo: dto.noteNo,
        salesOrderId: dto.salesOrderId,
        date: new Date(dto.date),
        vehicleNumber: dto.vehicleNumber,
        items: {
          create: dto.items.map(item => ({
            productId: item.productId,
            description: item.description,
            qty: item.qty,
          })),
        },
      },
      include: { items: true },
    });
  }

  async update(id: string, dto: UpdateDeliveryNoteDto) {
    const _companyId = CompanyContext.getCompanyId();
    await this.findOne(id); // verify exists
    
    return this.prisma.deliveryNote.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.date && { date: new Date(dto.date) }),
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.deliveryNote.delete({
      where: { id }
    });
  }
}
