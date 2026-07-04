import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateGoodsReceiptDto, UpdateGoodsReceiptDto } from './dto/goods-receipt.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class GoodsReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const { skip, take } = getPagination(query);

    const where: Prisma.GoodsReceiptWhereInput = {
      companyId,
      ...(query.search ? { receiptNo: { contains: query.search } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.goodsReceipt.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id },
      include: { businessPartner: true, items: true },
    });
    if (!receipt) throw new NotFoundException('Goods Receipt not found');
    return receipt;
  }

  async create(dto: CreateGoodsReceiptDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const existing = await this.prisma.goodsReceipt.findFirst({
      where: { companyId, receiptNo: dto.receiptNo },
    });
    if (existing) throw new ConflictException('Receipt number already exists');

    return this.prisma.goodsReceipt.create({
      data: {
        companyId,
        businessPartnerId: dto.businessPartnerId,
        receiptNo: dto.receiptNo,
        purchaseOrderId: dto.purchaseOrderId,
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

  async update(id: string, dto: UpdateGoodsReceiptDto) {
    const companyId = CompanyContext.getCompanyId();
    await this.findOne(id); // verify exists
    
    return this.prisma.goodsReceipt.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.date && { date: new Date(dto.date) }),
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.goodsReceipt.delete({
      where: { id }
    });
  }
}
