import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateGoodsReceiptDto, UpdateGoodsReceiptDto } from './dto/goods-receipt.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class GoodsReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const { skip, take } = getPagination(query);

    const where: Prisma.GoodsReceiptWhereInput = {
      companyId,
    };

    if (query.search) {
      where.OR = [
        { receiptNo: { contains: query.search } },
        { businessPartner: { name: { contains: query.search } } },
      ];
    }

    if (query.purchaseOrderId) {
      where.purchaseOrderId = query.purchaseOrderId;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.goodsReceipt.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true, items: true },
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
      where: { id, companyId },
      include: { businessPartner: true, items: { include: { product: true } } },
    });
    if (!receipt) throw new NotFoundException('Goods Receipt not found');
    return receipt;
  }

  async create(dto: CreateGoodsReceiptDto, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const existing = await this.prisma.goodsReceipt.findFirst({
      where: { companyId, receiptNo: dto.receiptNo },
    });
    if (existing) throw new ConflictException('Receipt number already exists');

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Goods Receipt
      const receipt = await tx.goodsReceipt.create({
        data: {
          companyId,
          businessPartnerId: dto.businessPartnerId,
          receiptNo: dto.receiptNo,
          purchaseOrderId: dto.purchaseOrderId || null,
          date: new Date(dto.date),
          vehicleNumber: dto.vehicleNumber || null,
          transportDetails: { warehouseId: dto.warehouseId } as any,
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

      // 2. Resolve target warehouse
      let targetWarehouse = null;
      if (dto.warehouseId) {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { id: dto.warehouseId, companyId },
        });
      }
      if (!targetWarehouse) {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { companyId, isDefault: true },
        });
      }

      // 3. Increment stock & create StockLedger entries for received items
      if (targetWarehouse) {
        for (const item of receipt.items) {
          if (!item.productId) continue;

          const stock = await tx.stock.findFirst({
            where: { companyId, productId: item.productId, warehouseId: targetWarehouse.id },
          });

          const currentQty = stock ? Number(stock.quantity) : 0;
          const newQty = currentQty + Number(item.qty);

          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: {
                quantity: newQty,
                availableQuantity: newQty,
              },
            });
          } else {
            await tx.stock.create({
              data: {
                companyId,
                productId: item.productId,
                warehouseId: targetWarehouse.id,
                quantity: newQty,
                availableQuantity: newQty,
              },
            });
          }

          // Stock ledger entry
          await tx.stockLedger.create({
            data: {
              companyId,
              productId: item.productId,
              type: 'PURCHASE',
              quantityBefore: currentQty,
              quantityChange: item.qty,
              quantityAfter: newQty,
              notes: `Received via Goods Receipt ${dto.receiptNo}`,
              referenceId: receipt.id,
              referenceType: 'GOODS_RECEIPT',
            },
          });
        }
      }

      // 4. If linked to a Purchase Order, update the PO's received quantity map & status
      if (dto.purchaseOrderId) {
        const po = await tx.purchaseOrder.findFirst({
          where: { id: dto.purchaseOrderId, companyId },
          include: { items: true },
        });

        if (po) {
          const poMetadata = (po.gstBreakup as any) || {};
          const receivedMap = poMetadata.receivedQty || {};

          // Update quantities in map
          for (const grItem of receipt.items) {
            if (!grItem.productId) continue;
            
            // Match with PO item by productId
            const poItem = po.items.find(i => i.productId === grItem.productId);
            if (poItem) {
              const currentReceived = receivedMap[poItem.id] || 0;
              receivedMap[poItem.id] = currentReceived + Number(grItem.qty);
            }
          }

          poMetadata.receivedQty = receivedMap;

          // Compute PO status
          let allFullyReceived = true;
          let anyReceived = false;

          for (const poItem of po.items) {
            const ordQty = Number(poItem.qty);
            const recQty = receivedMap[poItem.id] || 0;

            if (recQty > 0) {
              anyReceived = true;
            }
            if (recQty < ordQty) {
              allFullyReceived = false;
            }
          }

          let newStatus = po.status;
          if (allFullyReceived) {
            newStatus = 'CONVERTED';
          } else if (anyReceived) {
            newStatus = 'PARTIAL';
          }

          await tx.purchaseOrder.update({
            where: { id: po.id },
            data: {
              status: newStatus,
              gstBreakup: poMetadata as any,
            },
          });

          // Log audit
          if (userId) {
            await tx.auditLog.create({
              data: {
                companyId,
                userId,
                action: 'RECEIVE',
                tableName: 'PurchaseOrder',
                oldValues: { id: po.id, status: po.status },
                newValues: { id: po.id, status: newStatus, receivedQty: receivedMap },
              },
            });
          }
        }
      }

      return receipt;
    });
  }

  async update(id: string, dto: UpdateGoodsReceiptDto, _userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');
    await this.findOne(id);
    
    return this.prisma.goodsReceipt.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.date && { date: new Date(dto.date) }),
      }
    });
  }

  async remove(id: string, _userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');
    await this.findOne(id);
    
    return this.prisma.goodsReceipt.delete({
      where: { id }
    });
  }
}
