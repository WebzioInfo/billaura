import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateGoodsReceiptDto, UpdateGoodsReceiptDto } from './dto/goods-receipt.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';
import { SequenceService } from '../shared/sequence/sequence.service';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService
  ) {}

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
        skip: Number(skip),
        take: Number(take),
        include: { businessPartner: true, items: { include: { product: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async getNextNumber() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const config = await this.sequenceService.getConfig(companyId, 'GOODS_RECEIPT');
    if (config) {
      const nextNum = config.currentNumber + 1;
      return { nextNumber: `${config.prefix || 'GRN-'}${String(nextNum).padStart(config.padding || 5, '0')}` };
    }
    return { nextNumber: 'GRN-00001' };
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

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item must be included in the Goods Receipt');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve or generate Receipt Number
      let receiptNo = dto.receiptNo?.trim();
      if (receiptNo) {
        const existing = await tx.goodsReceipt.findFirst({
          where: { companyId, receiptNo },
        });
        if (existing) {
          throw new ConflictException(`Goods Receipt number "${receiptNo}" already exists`);
        }
      } else {
        receiptNo = await this.sequenceService.generateNextSequence(companyId, 'GOODS_RECEIPT', tx);
      }

      // 2. If linked to Purchase Order, validate PO and check over-receipt
      let po: any = null;
      let poMetadata: any = {};
      let receivedMap: Record<string, number> = {};

      if (dto.purchaseOrderId) {
        po = await tx.purchaseOrder.findFirst({
          where: { id: dto.purchaseOrderId, companyId },
          include: { items: { include: { product: true } } },
        });

        if (!po) {
          throw new NotFoundException(`Purchase Order with ID "${dto.purchaseOrderId}" not found`);
        }

        if (po.status === 'CANCELLED') {
          throw new ConflictException(`Cannot receive goods against a cancelled Purchase Order (${po.orderNo})`);
        }

        if (po.status === 'CONVERTED') {
          throw new ConflictException(`Purchase Order ${po.orderNo} has already been fully received`);
        }

        poMetadata = (po.gstBreakup as any) || {};
        receivedMap = poMetadata.receivedQty || {};

        // Validate each item received against PO items
        for (const grItem of dto.items) {
          const qtyToReceive = Number(grItem.qty);
          if (isNaN(qtyToReceive) || qtyToReceive <= 0) {
            throw new BadRequestException(`Received quantity must be greater than zero for "${grItem.description}"`);
          }

          // Match by poItemId or productId
          const matchedPoItem = (grItem.poItemId && po.items.find((i: any) => i.id === grItem.poItemId)) ||
            (grItem.productId && po.items.find((i: any) => i.productId === grItem.productId && (receivedMap[i.id] || 0) < Number(i.qty))) ||
            (grItem.productId && po.items.find((i: any) => i.productId === grItem.productId)) ||
            po.items.find((i: any) => i.description === grItem.description);

          if (!matchedPoItem) {
            throw new BadRequestException(`Item "${grItem.description}" does not correspond to any line on Purchase Order ${po.orderNo}`);
          }

          const ordQty = Number(matchedPoItem.qty);
          const alreadyReceived = Number(receivedMap[matchedPoItem.id] || 0);
          const remaining = Number((ordQty - alreadyReceived).toFixed(3));

          // Enforce over-receipt prevention (precision tolerance of 0.001)
          if (qtyToReceive > remaining + 0.001) {
            throw new ConflictException(
              `Cannot receive more than ordered quantity for "${matchedPoItem.description}". Ordered: ${ordQty}, Already received: ${alreadyReceived}, Remaining pending: ${remaining}, Attempted to receive: ${qtyToReceive}`
            );
          }
        }
      }

      // 3. Resolve destination warehouse
      let targetWarehouse: any = null;
      const requestedWarehouseId = dto.warehouseId || poMetadata?.warehouseId;
      if (requestedWarehouseId) {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { id: requestedWarehouseId, companyId },
        });
      }
      if (!targetWarehouse) {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { companyId, isDefault: true },
        });
      }
      if (!targetWarehouse) {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'asc' },
        });
      }
      if (!targetWarehouse) {
        targetWarehouse = await tx.warehouse.create({
          data: {
            companyId,
            name: 'Main Warehouse',
            isDefault: true,
          },
        });
      }

      // 4. Create Goods Receipt document
      const receipt = await tx.goodsReceipt.create({
        data: {
          companyId,
          businessPartnerId: dto.businessPartnerId,
          receiptNo,
          purchaseOrderId: dto.purchaseOrderId || null,
          date: new Date(dto.date),
          status: 'ACCEPTED',
          vehicleNumber: dto.vehicleNumber || null,
          transportDetails: {
            warehouseId: targetWarehouse.id,
            warehouseName: targetWarehouse.name,
            itemsMeta: dto.items.map(i => ({
              productId: i.productId,
              poItemId: i.poItemId,
              qty: i.qty,
              description: i.description
            }))
          } as any,
          items: {
            create: dto.items.map(item => ({
              productId: item.productId || null,
              description: item.description,
              qty: item.qty,
            })),
          },
        },
        include: { items: true },
      });

      // 5. Update physical inventory and stock ledger (excluding service/non-stock items)
      for (const item of receipt.items) {
        if (!item.productId) continue;

        const product = await tx.product.findFirst({
          where: { id: item.productId, companyId },
        });

        if (!product) continue;

        // Skip services and non-stock items
        if (product.isService || !product.isInventoryItem || !product.isTrackStock) {
          continue;
        }

        const receiveQty = Number(item.qty);
        const stock = await tx.stock.findFirst({
          where: { companyId, productId: item.productId, warehouseId: targetWarehouse.id },
        });

        const currentQty = stock ? Number(stock.quantity) : 0;
        const currentAvail = stock ? Number(stock.availableQuantity) : 0;
        const newQty = Number((currentQty + receiveQty).toFixed(3));
        const newAvail = Number((currentAvail + receiveQty).toFixed(3));

        // Recompute weighted average cost
        const matchedPoItem = po?.items?.find((i: any) => i.productId === item.productId);
        const purchaseRate = matchedPoItem ? Number(matchedPoItem.rate) : Number(product.purchasePrice || 0);
        const currentAvgCost = stock ? Number(stock.averageCost) : Number(product.purchasePrice || 0);
        const totalVal = (currentQty * currentAvgCost) + (receiveQty * purchaseRate);
        const newAvgCost = newQty > 0 ? Number((totalVal / newQty).toFixed(2)) : currentAvgCost;

        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              quantity: newQty,
              availableQuantity: newAvail,
              averageCost: newAvgCost,
            },
          });
        } else {
          await tx.stock.create({
            data: {
              companyId,
              productId: item.productId,
              warehouseId: targetWarehouse.id,
              quantity: newQty,
              availableQuantity: newAvail,
              averageCost: newAvgCost,
            },
          });
        }

        // Record traceable StockLedger movement
        await tx.stockLedger.create({
          data: {
            companyId,
            productId: item.productId,
            type: 'PURCHASE',
            quantityBefore: currentQty,
            quantityChange: receiveQty,
            quantityAfter: newQty,
            averageCost: newAvgCost,
            notes: `Received via Goods Receipt ${receiptNo}${po ? ' (PO: ' + po.orderNo + ')' : ''}`,
            referenceId: receipt.id,
            referenceType: 'GOODS_RECEIPT',
            date: new Date(dto.date),
          },
        });
      }

      // 6. Update Purchase Order received quantities and status if linked
      if (po) {
        for (const grItem of dto.items) {
          const matchedPoItem = (grItem.poItemId && po.items.find((i: any) => i.id === grItem.poItemId)) ||
            (grItem.productId && po.items.find((i: any) => i.productId === grItem.productId && (receivedMap[i.id] || 0) < Number(i.qty))) ||
            (grItem.productId && po.items.find((i: any) => i.productId === grItem.productId)) ||
            po.items.find((i: any) => i.description === grItem.description);

          if (matchedPoItem) {
            const currentReceived = Number(receivedMap[matchedPoItem.id] || 0);
            receivedMap[matchedPoItem.id] = Number((currentReceived + Number(grItem.qty)).toFixed(3));
          }
        }

        poMetadata.receivedQty = receivedMap;

        // Determine if all lines are fully received
        const allFullyReceived = po.items.every((i: any) => {
          const ord = Number(i.qty);
          const rec = Number(receivedMap[i.id] || 0);
          return rec >= ord - 0.001;
        });

        const anyReceived = po.items.some((i: any) => {
          const rec = Number(receivedMap[i.id] || 0);
          return rec > 0.001;
        });

        const newStatus = allFullyReceived ? 'CONVERTED' : anyReceived ? 'PARTIAL' : po.status;

        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: {
            status: newStatus,
            gstBreakup: poMetadata as any,
          },
        });

        // Audit log
        if (userId) {
          await tx.auditLog.create({
            data: {
              companyId,
              userId,
              action: 'RECEIVE',
              tableName: 'PurchaseOrder',
              oldValues: { id: po.id, status: po.status },
              newValues: { id: po.id, status: newStatus, receivedQty: receivedMap, receiptNo },
            },
          });
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
      },
      include: { items: true, businessPartner: true },
    });
  }

  async remove(id: string, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.findFirst({
        where: { id, companyId },
        include: { items: true },
      });
      if (!receipt) throw new NotFoundException('Goods Receipt not found');

      const transportDetails = (receipt.transportDetails as any) || {};
      const warehouseId = transportDetails.warehouseId;

      // 1. Revert stock updates for physically tracked goods
      for (const item of receipt.items) {
        if (!item.productId) continue;

        const product = await tx.product.findFirst({
          where: { id: item.productId, companyId },
        });
        if (!product || product.isService || !product.isInventoryItem || !product.isTrackStock) {
          continue;
        }

        const stock = await tx.stock.findFirst({
          where: {
            companyId,
            productId: item.productId,
            ...(warehouseId ? { warehouseId } : {}),
          },
        });

        if (stock) {
          const currentQty = Number(stock.quantity);
          const currentAvail = Number(stock.availableQuantity);
          const qtyToRevert = Number(item.qty);
          const newQty = Math.max(0, Number((currentQty - qtyToRevert).toFixed(3)));
          const newAvail = Math.max(0, Number((currentAvail - qtyToRevert).toFixed(3)));

          await tx.stock.update({
            where: { id: stock.id },
            data: {
              quantity: newQty,
              availableQuantity: newAvail,
            },
          });
        }

        // Delete the stock ledger entry created by this receipt
        await tx.stockLedger.deleteMany({
          where: {
            companyId,
            productId: item.productId,
            referenceId: receipt.id,
            referenceType: 'GOODS_RECEIPT',
          },
        });
      }

      // 2. Revert PO received quantities if linked
      if (receipt.purchaseOrderId) {
        const po = await tx.purchaseOrder.findFirst({
          where: { id: receipt.purchaseOrderId, companyId },
          include: { items: true },
        });

        if (po) {
          const poMetadata = (po.gstBreakup as any) || {};
          const receivedMap = poMetadata.receivedQty || {};

          for (const item of receipt.items) {
            const matchedPoItem = po.items.find((i: any) => i.productId === item.productId);
            if (matchedPoItem) {
              const currentReceived = Number(receivedMap[matchedPoItem.id] || 0);
              const reverted = Math.max(0, Number((currentReceived - Number(item.qty)).toFixed(3)));
              receivedMap[matchedPoItem.id] = reverted;
            }
          }

          poMetadata.receivedQty = receivedMap;

          // Recompute PO status
          const allFullyReceived = po.items.every((i: any) => {
            const ord = Number(i.qty);
            const rec = Number(receivedMap[i.id] || 0);
            return rec >= ord - 0.001;
          });

          const anyReceived = po.items.some((i: any) => {
            const rec = Number(receivedMap[i.id] || 0);
            return rec > 0.001;
          });

          const newStatus = allFullyReceived ? 'CONVERTED' : anyReceived ? 'PARTIAL' : 'DRAFT';

          await tx.purchaseOrder.update({
            where: { id: po.id },
            data: {
              status: newStatus,
              gstBreakup: poMetadata as any,
            },
          });

          if (userId) {
            await tx.auditLog.create({
              data: {
                companyId,
                userId,
                action: 'DELETE',
                tableName: 'GoodsReceipt',
                oldValues: { id: receipt.id, receiptNo: receipt.receiptNo },
                newValues: { status: 'DELETED' },
              },
            });
          }
        }
      }

      // 3. Delete goods receipt
      await tx.goodsReceiptItem.deleteMany({
        where: { goodsReceiptId: id },
      });

      return tx.goodsReceipt.delete({
        where: { id },
      });
    });
  }
}
