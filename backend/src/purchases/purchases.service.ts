import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePurchaseDto } from './dto/purchase.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.PurchaseWhereInput = {
      companyId,
      ...(query.search
        ? {
            OR: [
              { purchaseNo: { contains: query.search } },
              { businessPartner: { name: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true, items: { include: { product: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const purchase = await this.prisma.purchase.findFirst({
      where: { id },
      include: { businessPartner: true, items: { include: { product: true } } },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }

    return purchase;
  }

  async create(dto: CreatePurchaseDto, txClient?: Prisma.TransactionClient) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Check vendor exists
    const vendor = await this.prisma.businessPartner.findFirst({
      where: { id: dto.vendorId, companyId },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
    }

    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Generate purchase number using DocumentSequence
      let sequence = await tx.documentSequence.findFirst({
        where: { companyId, documentType: 'PURCHASE' },
      });

      if (!sequence) {
        sequence = await tx.documentSequence.create({
          data: {
            companyId,
            documentType: 'PURCHASE',
            currentNumber: 0,
          },
        });
      }

      const nextNumber = sequence.currentNumber + 1;
      await tx.documentSequence.update({
        where: { id: sequence.id },
        data: { currentNumber: nextNumber },
      });

      const purchaseNo = `PUR-${String(nextNumber).padStart(5, '0')}`;

      // Interstate check
      const company = await tx.company.findUnique({
        where: { id: companyId },
      });
      const companyState = company?.state?.trim().toLowerCase() || '';
      const supplyState = dto.placeOfSupply?.trim().toLowerCase() || vendor.state?.trim().toLowerCase() || '';
      const isInterState = supplyState && companyState && supplyState !== companyState;

      // 2. Fetch products and calculate totals
      let subTotal = 0;
      let taxTotal = 0;
      const itemsToCreate = [];
      const accountDebits: Record<string, number> = {};

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, companyId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const rate = Number(item.rate);
        const qty = Number(item.qty);
        const lineSubtotal = rate * qty;
        const discountAmt = item.discount ? (lineSubtotal * Number(item.discount)) / 100 : 0;
        const lineTotalAfterDiscount = lineSubtotal - discountAmt;
        
        const taxRate = item.taxPercent !== undefined ? Number(item.taxPercent) : Number(product.taxRate || product.gstRate || 18);
        const taxAmount = (lineTotalAfterDiscount * taxRate) / 100;

        subTotal += lineTotalAfterDiscount;
        taxTotal += taxAmount;

        itemsToCreate.push({
          productId: product.id,
          description: JSON.stringify({
            text: item.description || product.name,
            discount: item.discount || 0,
          }),
          qty,
          rate,
          taxPercent: taxRate,
          taxAmount,
          total: lineTotalAfterDiscount + taxAmount,
          cgstAmount: isInterState ? 0 : taxAmount / 2,
          sgstAmount: isInterState ? 0 : taxAmount / 2,
          igstAmount: isInterState ? taxAmount : 0,
        });

        let debitAccountId = product.purchaseAccountId || product.inventoryAccountId;
        if (!debitAccountId) {
          let inventoryAccount = await tx.account.findFirst({
            where: { companyId, name: 'Inventory Asset' },
          });
          if (!inventoryAccount) {
            inventoryAccount = await tx.account.create({
              data: { companyId, name: 'Inventory Asset', category: 'ASSET', balance: 0 },
            });
          }
          debitAccountId = inventoryAccount.id;
        }
        
        accountDebits[debitAccountId] = (accountDebits[debitAccountId] || 0) + lineTotalAfterDiscount;
      }

      const grandTotal = subTotal + taxTotal;

      // 3. Create Purchase record
      const purchase = await tx.purchase.create({
        data: {
          companyId,
          businessPartnerId: dto.vendorId,
          purchaseNo,
          date: new Date(dto.date),
          status: 'SENT',
          subTotal,
          taxTotal,
          grandTotal,
          amountPaid: 0,
          cgstAmount: isInterState ? 0 : taxTotal / 2,
          sgstAmount: isInterState ? 0 : taxTotal / 2,
          igstAmount: isInterState ? taxTotal : 0,
          cessAmount: 0,
          totalTaxAmount: taxTotal,
          reference: dto.reference || null,
          billingAddress: dto.billingAddress || null,
          shippingAddress: dto.shippingAddress || null,
          placeOfSupply: dto.placeOfSupply || null,
          taxMode: (dto.taxMode as any) || 'CGST_SGST',
          isRcm: dto.isRcm || false,
          gstBreakup: dto.gstBreakup || null,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });

      // 4. Update vendor payable balance
      await tx.businessPartner.update({
        where: { id: dto.vendorId },
        data: {
          payableBalance: {
            increment: grandTotal,
          },
        },
      });

      // 5. Increase stock quantities and create movement logs
      const metaWarehouseId = dto.gstBreakup?.warehouseId;
      const skipStockUpdate = dto.gstBreakup?.skipStockUpdate;
      let targetWarehouse = null;
      if (metaWarehouseId) {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { id: metaWarehouseId, companyId },
        });
      }
      if (!targetWarehouse) {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { companyId, isDefault: true },
        });
      }

      if (targetWarehouse && !skipStockUpdate) {
        for (const item of itemsToCreate) {
          const stock = await tx.stock.findFirst({
            where: { companyId, productId: item.productId, warehouseId: targetWarehouse.id },
          });

          const currentQty = stock ? Number(stock.quantity) : 0;
          const newQty = currentQty + item.qty;

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
              notes: `Received via Purchase ${purchaseNo}`,
              referenceId: purchase.id,
              referenceType: 'PURCHASE'
            },
          });
        }
      }

      // 6. Post automatic journal entry to General Ledger
      let apAccount = await tx.account.findFirst({
        where: { companyId, name: 'Accounts Payable' },
      });
      if (!apAccount) {
        apAccount = await tx.account.create({
          data: { companyId, name: 'Accounts Payable', category: 'LIABILITY', balance: 0 },
        });
      }

      const getTaxAccount = async (name: string) => {
        let acc = await tx.account.findFirst({ where: { companyId, name } });
        if (!acc) {
          acc = await tx.account.create({
            data: { companyId, name, category: 'ASSET', subCategory: 'CURRENT_ASSET', balance: 0 },
          });
        }
        return acc;
      };

      const cgstAccount = isInterState ? null : await getTaxAccount('Input CGST');
      const sgstAccount = isInterState ? null : await getTaxAccount('Input SGST');
      const igstAccount = isInterState ? await getTaxAccount('Input IGST') : null;

      const journalLines: { accountId: string; debit: number; credit: number }[] = [];
      
      // Debit dynamic accounts
      for (const [accountId, amount] of Object.entries(accountDebits)) {
        journalLines.push({ accountId, debit: amount, credit: 0 });
        
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: amount } },
        });
      }

      // Credit Accounts Payable
      journalLines.push({ accountId: apAccount.id, debit: 0, credit: grandTotal });
      
      await tx.account.update({
        where: { id: apAccount.id },
        data: { balance: { decrement: grandTotal } }, // liability credit balance increases
      });

      const cgstAmt = isInterState ? 0 : taxTotal / 2;
      const sgstAmt = isInterState ? 0 : taxTotal / 2;
      const igstAmt = isInterState ? taxTotal : 0;

      if (!isInterState && cgstAmt > 0 && cgstAccount && sgstAccount) {
        journalLines.push({ accountId: cgstAccount.id, debit: cgstAmt, credit: 0 });
        journalLines.push({ accountId: sgstAccount.id, debit: sgstAmt, credit: 0 });
        
        await tx.account.update({ where: { id: cgstAccount.id }, data: { balance: { increment: cgstAmt } } });
        await tx.account.update({ where: { id: sgstAccount.id }, data: { balance: { increment: sgstAmt } } });
      }
      if (isInterState && igstAmt > 0 && igstAccount) {
        journalLines.push({ accountId: igstAccount.id, debit: igstAmt, credit: 0 });
        
        await tx.account.update({ where: { id: igstAccount.id }, data: { balance: { increment: igstAmt } } });
      }

      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: purchaseNo,
          description: `Automatic purchase billing posting ${purchaseNo}`,
          lines: {
            create: journalLines,
          },
        },
      });

      return purchase;
    };

    if (txClient) {
      return execute(txClient);
    }
    return this.prisma.$transaction(execute, { timeout: 20000 });
  }

  async update(id: string, dto: CreatePurchaseDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const purchase = await this.findOne(id);
    if (purchase.status === 'PAID') {
      throw new BadRequestException('Cannot edit a fully paid purchase');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Revert original purchase effects
      
      // Revert vendor payable balance
      await tx.businessPartner.update({
        where: { id: purchase.businessPartnerId },
        data: {
          payableBalance: {
            decrement: purchase.grandTotal,
          },
        },
      });

      // Find original journal entries and revert balances, then delete them
      const originalEntries = await tx.journalEntry.findMany({
        where: { reference: purchase.purchaseNo },
        include: { lines: true },
      });

      for (const entry of originalEntries) {
        for (const line of entry.lines) {
          const change = Number(line.credit || 0) - Number(line.debit || 0); // debit decreases, credit increases
          await tx.account.update({
            where: { id: line.accountId },
            data: { balance: { increment: change } },
          });
        }
        await tx.journalLine.deleteMany({ where: { journalEntryId: entry.id } });
        await tx.journalEntry.delete({ where: { id: entry.id } });
      }

      // Revert Stock quantities
      const stockLedgers = await tx.stockLedger.findMany({
        where: { referenceId: purchase.id, referenceType: 'PURCHASE' },
      });

      for (const ledger of stockLedgers) {
        const changeQty = Number(ledger.quantityChange) * -1;

        const originalWarehouseId = (purchase.gstBreakup as any)?.warehouseId;
        
        let targetWh = null;
        if (originalWarehouseId) {
          targetWh = await tx.warehouse.findFirst({
            where: { id: originalWarehouseId, companyId },
          });
        }
        if (!targetWh) {
          targetWh = await tx.warehouse.findFirst({
            where: { companyId, isDefault: true },
          });
        }

        if (targetWh) {
          const stock = await tx.stock.findFirst({
            where: { companyId: purchase.companyId, productId: ledger.productId, warehouseId: targetWh.id },
          });

          if (stock) {
            const currentQty = Number(stock.quantity);
            const newQty = currentQty + changeQty;
            
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: newQty, availableQuantity: newQty },
            });
          }
        }
      }
      
      // Delete stock ledger entries of this purchase
      await tx.stockLedger.deleteMany({
        where: { referenceId: purchase.id, referenceType: 'PURCHASE' },
      });

      // Delete the old purchase items
      await tx.purchaseItem.deleteMany({
        where: { purchaseId: id },
      });

      // 2. Fetch vendor details for interstate check
      const vendor = await tx.businessPartner.findFirst({
        where: { id: dto.vendorId, companyId },
      });
      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
      }

      const company = await tx.company.findUnique({
        where: { id: companyId },
      });
      const companyState = company?.state?.trim().toLowerCase() || '';
      const supplyState = dto.placeOfSupply?.trim().toLowerCase() || vendor.state?.trim().toLowerCase() || '';
      const isInterState = supplyState && companyState && supplyState !== companyState;

      // 3. Calculate new totals
      let subTotal = 0;
      let taxTotal = 0;
      const itemsToCreate = [];
      const accountDebits: Record<string, number> = {};

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, companyId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const rate = Number(item.rate);
        const qty = Number(item.qty);
        const lineSubtotal = rate * qty;
        const discountAmt = item.discount ? (lineSubtotal * Number(item.discount)) / 100 : 0;
        const lineTotalAfterDiscount = lineSubtotal - discountAmt;
        
        const taxRate = item.taxPercent !== undefined ? Number(item.taxPercent) : Number(product.taxRate || product.gstRate || 18);
        const taxAmount = (lineTotalAfterDiscount * taxRate) / 100;

        subTotal += lineTotalAfterDiscount;
        taxTotal += taxAmount;

        itemsToCreate.push({
          productId: product.id,
          description: JSON.stringify({
            text: item.description || product.name,
            discount: item.discount || 0,
          }),
          qty,
          rate,
          taxPercent: taxRate,
          taxAmount,
          total: lineTotalAfterDiscount + taxAmount,
          cgstAmount: isInterState ? 0 : taxAmount / 2,
          sgstAmount: isInterState ? 0 : taxAmount / 2,
          igstAmount: isInterState ? taxAmount : 0,
        });

        let debitAccountId = product.purchaseAccountId || product.inventoryAccountId;
        if (!debitAccountId) {
          let inventoryAccount = await tx.account.findFirst({
            where: { companyId, name: 'Inventory Asset' },
          });
          if (!inventoryAccount) {
            inventoryAccount = await tx.account.create({
              data: { companyId, name: 'Inventory Asset', category: 'ASSET', balance: 0 },
            });
          }
          debitAccountId = inventoryAccount.id;
        }
        
        accountDebits[debitAccountId] = (accountDebits[debitAccountId] || 0) + lineTotalAfterDiscount;
      }

      const grandTotal = subTotal + taxTotal;

      // 4. Update Purchase record
      const updatedPurchase = await tx.purchase.update({
        where: { id },
        data: {
          businessPartnerId: dto.vendorId,
          date: new Date(dto.date),
          subTotal,
          taxTotal,
          grandTotal,
          cgstAmount: isInterState ? 0 : taxTotal / 2,
          sgstAmount: isInterState ? 0 : taxTotal / 2,
          igstAmount: isInterState ? taxTotal : 0,
          cessAmount: 0,
          totalTaxAmount: taxTotal,
          reference: dto.reference || null,
          billingAddress: dto.billingAddress || null,
          shippingAddress: dto.shippingAddress || null,
          placeOfSupply: dto.placeOfSupply || null,
          taxMode: (dto.taxMode as any) || 'CGST_SGST',
          isRcm: dto.isRcm || false,
          gstBreakup: dto.gstBreakup || null,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });

      // 5. Update vendor payable balance
      await tx.businessPartner.update({
        where: { id: dto.vendorId },
        data: {
          payableBalance: {
            increment: grandTotal,
          },
        },
      });

      // 6. Increase stock quantities and create movement logs
      const metaWarehouseId = dto.gstBreakup?.warehouseId;
      let targetWarehouse = null;
      if (metaWarehouseId) {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { id: metaWarehouseId, companyId },
        });
      }
      if (!targetWarehouse) {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { companyId, isDefault: true },
        });
      }

      if (targetWarehouse) {
        for (const item of itemsToCreate) {
          const stock = await tx.stock.findFirst({
            where: { companyId, productId: item.productId, warehouseId: targetWarehouse.id },
          });

          const currentQty = stock ? Number(stock.quantity) : 0;
          const newQty = currentQty + item.qty;

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
              notes: `Received via Purchase Update ${purchase.purchaseNo}`,
              referenceId: purchase.id,
              referenceType: 'PURCHASE'
            },
          });
        }
      }

      // 7. Post automatic journal entry to General Ledger
      let apAccount = await tx.account.findFirst({
        where: { companyId, name: 'Accounts Payable' },
      });
      if (!apAccount) {
        apAccount = await tx.account.create({
          data: { companyId, name: 'Accounts Payable', category: 'LIABILITY', balance: 0 },
        });
      }

      const getTaxAccount = async (name: string) => {
        let acc = await tx.account.findFirst({ where: { companyId, name } });
        if (!acc) {
          acc = await tx.account.create({
            data: { companyId, name, category: 'ASSET', subCategory: 'CURRENT_ASSET', balance: 0 },
          });
        }
        return acc;
      };

      const cgstAccount = isInterState ? null : await getTaxAccount('Input CGST');
      const sgstAccount = isInterState ? null : await getTaxAccount('Input SGST');
      const igstAccount = isInterState ? await getTaxAccount('Input IGST') : null;

      const journalLines: { accountId: string; debit: number; credit: number }[] = [];
      
      // Debit dynamic accounts
      for (const [accountId, amount] of Object.entries(accountDebits)) {
        journalLines.push({ accountId, debit: amount, credit: 0 });
        
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: amount } },
        });
      }

      // Credit Accounts Payable
      journalLines.push({ accountId: apAccount.id, debit: 0, credit: grandTotal });
      
      await tx.account.update({
        where: { id: apAccount.id },
        data: { balance: { decrement: grandTotal } }, // liability credit balance increases
      });

      const cgstAmt = isInterState ? 0 : taxTotal / 2;
      const sgstAmt = isInterState ? 0 : taxTotal / 2;
      const igstAmt = isInterState ? taxTotal : 0;

      if (!isInterState && cgstAmt > 0 && cgstAccount && sgstAccount) {
        journalLines.push({ accountId: cgstAccount.id, debit: cgstAmt, credit: 0 });
        journalLines.push({ accountId: sgstAccount.id, debit: sgstAmt, credit: 0 });
        
        await tx.account.update({ where: { id: cgstAccount.id }, data: { balance: { increment: cgstAmt } } });
        await tx.account.update({ where: { id: sgstAccount.id }, data: { balance: { increment: sgstAmt } } });
      }
      if (isInterState && igstAmt > 0 && igstAccount) {
        journalLines.push({ accountId: igstAccount.id, debit: igstAmt, credit: 0 });
        
        await tx.account.update({ where: { id: igstAccount.id }, data: { balance: { increment: igstAmt } } });
      }

      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: purchase.purchaseNo,
          description: `Automatic purchase billing posting ${purchase.purchaseNo} (Updated)`,
          lines: {
            create: journalLines,
          },
        },
      });

      return updatedPurchase;
    }, { timeout: 20000 });
  }

  async remove(id: string) {
    const purchase = await this.findOne(id);
    if (purchase.status === 'PAID') {
      throw new BadRequestException('Cannot delete a fully paid purchase');
    }

    return this.prisma.$transaction(async (tx) => {
      // Revert vendor outstanding balance
      await tx.businessPartner.update({
        where: { id: purchase.businessPartnerId },
        data: {
          payableBalance: {
            decrement: purchase.grandTotal,
          },
        },
      });

      // Find original journal entries and create reversals
      const originalEntries = await tx.journalEntry.findMany({
        where: { reference: purchase.purchaseNo },
        include: { lines: true },
      });

      for (const entry of originalEntries) {
        const reversalLines = entry.lines.map(line => ({
          accountId: line.accountId,
          debit: Number(line.credit || 0),
          credit: Number(line.debit || 0),
        }));

        await tx.journalEntry.create({
          data: {
            companyId: purchase.companyId,
            date: new Date(),
            reference: `REV-${purchase.purchaseNo}`,
            description: `Reversal for deleted purchase ${purchase.purchaseNo}`,
            lines: { create: reversalLines },
          },
        });

        // Revert account balances
        for (const line of reversalLines) {
          const change = line.debit - line.credit;
          await tx.account.update({
            where: { id: line.accountId },
            data: { balance: { increment: change } },
          });
        }
      }

      // Revert Stock Ledger
      const stockLedgers = await tx.stockLedger.findMany({
        where: { referenceId: purchase.id, referenceType: 'PURCHASE' },
      });

      for (const ledger of stockLedgers) {
        const changeQty = Number(ledger.quantityChange) * -1;

        const stock = await tx.stock.findFirst({
          where: { companyId: purchase.companyId, productId: ledger.productId },
        });

        if (stock) {
          const currentQty = Number(stock.quantity);
          const newQty = currentQty + changeQty;
          
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: newQty, availableQuantity: newQty },
          });

          await tx.stockLedger.create({
            data: {
              companyId: purchase.companyId,
              productId: ledger.productId,
              type: 'ADJUSTMENT',
              quantityBefore: currentQty,
              quantityChange: changeQty,
              quantityAfter: newQty,
              notes: `Reversal of Purchase ${purchase.purchaseNo}`,
              referenceId: purchase.id,
              referenceType: 'PURCHASE_REVERSAL',
            }
          });
        }
      }

      // Soft delete purchase
      return tx.purchase.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
