import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePurchaseDto } from './dto/purchase.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { GSTEngine } from '../common/utils/gst-engine.util';
import { SequenceService } from '../shared/sequence/sequence.service';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingEngine: AccountingEngineService,
    private readonly sequenceService: SequenceService
  ) {}

  async findAll(query: PaginationQueryDto & { status?: string; vendorId?: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.PurchaseWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.vendorId ? { businessPartnerId: query.vendorId } : {}),
      ...(query.search
        ? {
            OR: [
              { purchaseNo: { contains: query.search } },
              { reference: { contains: query.search } },
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
        include: { businessPartner: true, items: { include: { product: true } }, attachments: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    const enriched = data.map((b) => {
      const meta = (b.gstBreakup as any) || {};
      const dueDate = meta.dueDate || (b.date ? new Date(b.date).toISOString().split('T')[0] : undefined);
      return {
        ...b,
        dueDate,
        vendor: b.businessPartner,
      };
    });

    return toPaginatedResult(enriched, total, query);
  }

  async getNextNumber(): Promise<{ nextNumber: string }> {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const nextNumber = await this.sequenceService.previewNextSequence(companyId, 'BILL');
    return { nextNumber };
  }

  async getPaymentTerms(): Promise<Array<{ name: string; days: number }>> {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const defaultTerms = [
      { name: 'Due on Receipt', days: 0 },
      { name: 'Net 15', days: 15 },
      { name: 'Net 30', days: 30 },
      { name: 'Net 45', days: 45 },
      { name: 'Net 60', days: 60 },
      { name: 'Due end of the month', days: 30 },
      { name: 'Due end of next month', days: 60 },
    ];

    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId },
    });

    const customTerms = (settings?.invoiceSettings as any)?.paymentTerms;
    if (Array.isArray(customTerms) && customTerms.length > 0) {
      const map = new Map<string, { name: string; days: number }>();
      defaultTerms.forEach((t) => map.set(t.name.toLowerCase(), t));
      customTerms.forEach((t: any) => {
        if (t?.name && t?.days !== undefined) {
          map.set(t.name.toLowerCase(), { name: t.name, days: Number(t.days) });
        }
      });
      return Array.from(map.values());
    }

    return defaultTerms;
  }

  async createPaymentTerm(dto: { termName: string; dueAfter: number }): Promise<{ name: string; days: number }> {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const termName = dto.termName?.trim();
    const dueAfter = Number(dto.dueAfter);

    if (!termName) {
      throw new BadRequestException('Term Name is required');
    }
    if (isNaN(dueAfter) || dueAfter < 0) {
      throw new BadRequestException('Due After must be a non-negative number of days');
    }

    const currentTerms = await this.getPaymentTerms();
    if (currentTerms.some((t) => t.name.toLowerCase() === termName.toLowerCase())) {
      throw new ConflictException(`Payment term "${termName}" already exists`);
    }

    const newTerm = { name: termName, days: dueAfter };
    const updatedTerms = [...currentTerms, newTerm];

    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId },
    });

    const currentInvoiceSettings = (settings?.invoiceSettings as any) || {};
    const newInvoiceSettings = {
      ...currentInvoiceSettings,
      paymentTerms: updatedTerms,
    };

    if (settings) {
      await this.prisma.companySettings.update({
        where: { id: settings.id },
        data: { invoiceSettings: newInvoiceSettings },
      });
    } else {
      await this.prisma.companySettings.create({
        data: {
          companyId,
          invoiceSettings: newInvoiceSettings,
        },
      });
    }

    return newTerm;
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const purchase = await this.prisma.purchase.findFirst({
      where: { id, companyId },
      include: { businessPartner: true, items: { include: { product: true } }, attachments: true },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }

    const meta = (purchase.gstBreakup as any) || {};
    const parsedItems = purchase.items.map((it) => {
      let extra: any = {};
      try {
        if (it.description && it.description.startsWith('{')) {
          extra = JSON.parse(it.description);
        }
      } catch (_) {}

      return {
        ...it,
        description: extra.text || it.description || '',
        accountId: extra.accountId || null,
        customerId: extra.customerId || null,
        discount: extra.discount !== undefined ? extra.discount : 0,
        unit: extra.unit || 'Pcs',
      };
    });

    return {
      ...purchase,
      vendor: purchase.businessPartner,
      dueDate: meta.dueDate || (purchase.date ? new Date(purchase.date).toISOString().split('T')[0] : undefined),
      paymentTerms: meta.paymentTerms || 'Due on Receipt',
      orderNumber: meta.orderNumber || purchase.reference || '',
      poId: meta.poId || null,
      subject: meta.subject || '',
      notes: meta.notes || '',
      termsConditions: meta.termsConditions || '',
      discount: meta.discount || 0,
      discountType: meta.discountType || '%',
      discountAmount: meta.discountAmount || 0,
      adjustment: meta.adjustment || 0,
      tdsTcsType: meta.tdsTcsType || 'NONE',
      tdsTcsRate: meta.tdsTcsRate || 0,
      tdsTcsAmount: meta.tdsTcsAmount || Number(purchase.tdsAmount || purchase.tcsAmount || 0),
      tdsTcsTaxId: meta.tdsTcsTaxId || null,
      attachedFiles: meta.attachedFiles || [],
      items: parsedItems,
    };
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
      // 1. Bill number: use supplied purchaseNo or generate next sequence
      let purchaseNo: string;
      if (dto.purchaseNo && dto.purchaseNo.trim()) {
        const candidateNo = dto.purchaseNo.trim();
        const existing = await tx.purchase.findFirst({
          where: { companyId, purchaseNo: candidateNo, deletedAt: null },
        });
        if (existing) {
          throw new ConflictException(`Bill number "${candidateNo}" already exists for this organization`);
        }
        purchaseNo = candidateNo;
      } else {
        purchaseNo = await this.sequenceService.generateNextSequence(companyId, 'BILL', tx);
      }

      const docStatus = dto.status === 'DRAFT' ? 'DRAFT' : 'SENT';

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
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      const itemsToCreate = [];
      const accountDebits: Record<string, number> = {};

      const bpTaxPreference = vendor?.taxPreference || 'TAXABLE';

      for (const item of dto.items) {
        let product: any = null;

        // Transactional candidate product creation if requested
        if (item.createAsNewProduct && item.newProductData?.name) {
          const normName = item.newProductData.name.trim();
          const existing = await tx.product.findFirst({
            where: {
              companyId,
              deletedAt: null,
              name: { equals: normName, mode: 'insensitive' },
            },
          });

          if (existing) {
            product = existing;
          } else {
            const generatedSku = await this.sequenceService.generateNextSequence(companyId, 'SKU');
            const isService = item.newProductData.itemType === 'SERVICE' || item.newProductData.isInventoryItem === false;
            const finalItemType = isService ? 'SERVICE' : (item.newProductData.itemType as any || 'FINISHED_GOOD');
            
            product = await tx.product.create({
              data: {
                companyId,
                name: normName,
                sku: generatedSku,
                unit: item.newProductData.unit || 'NOS',
                itemType: finalItemType,
                hsnCode: item.newProductData.hsnCode || null,
                gstRate: item.newProductData.gstRate !== undefined ? Number(item.newProductData.gstRate) : Number(item.taxPercent || item.taxRate || 18),
                taxPreference: 'TAXABLE',
                purchasePrice: Number(item.rate || 0),
                sellingPrice: Number(item.rate || 0),
                minStock: 0,
                maxStock: 0,
                reorderLevel: 0,
                valuationMethod: isService ? 'NONE' : 'AVERAGE',
                isPurchasable: true,
                isSellable: true,
                isInventoryItem: !isService,
                isTrackStock: !isService,
                isService: isService,
                isActive: true,
              },
            });
          }
        } else if (item.productId) {
          product = await tx.product.findFirst({
            where: { id: item.productId, companyId },
          });
        }

        const rate = Number(item.rate);
        const qty = Number(item.qty);
        const lineSubtotal = rate * qty;
        const discountAmt = item.discount ? (lineSubtotal * Number(item.discount)) / 100 : 0;
        const lineTotalAfterDiscount = Math.max(0, lineSubtotal - discountAmt);
        
        const taxRate = item.taxPercent !== undefined ? Number(item.taxPercent) : (item.taxRate !== undefined ? Number(item.taxRate) : Number(product?.gstRate || 18));
        
        const gstResult = GSTEngine.calculate({
           taxableAmount: lineTotalAfterDiscount,
           gstRate: taxRate,
           taxPreference: bpTaxPreference as any,
           companyStateCode: companyState,
           customerStateCode: supplyState
        });

        subTotal += gstResult.taxableAmount;
        taxTotal += gstResult.totalTax;
        totalCgst += gstResult.cgstAmount;
        totalSgst += gstResult.sgstAmount;
        totalIgst += gstResult.igstAmount;

        itemsToCreate.push({
          productId: product ? product.id : null,
          description: JSON.stringify({
            text: item.description || product?.name || 'Bill Line Item',
            discount: item.discount || 0,
            accountId: item.accountId || null,
            customerId: item.customerId || null,
            unit: item.unit || 'Pcs',
            skippedProduct: !product,
          }),
          qty,
          rate,
          taxPercent: taxRate,
          taxAmount: gstResult.totalTax,
          total: gstResult.grandTotal,
          cgstAmount: gstResult.cgstAmount,
          sgstAmount: gstResult.sgstAmount,
          igstAmount: gstResult.igstAmount,
        });

        let debitAccountId = item.accountId || product?.purchaseAccountId || product?.inventoryAccountId;
        if (!debitAccountId) {
          const defaultAccName = product ? 'Inventory Asset' : 'Direct Expenses';
          const defaultAccCat = product ? 'ASSET' : 'EXPENSE';
          let targetAccount = await tx.account.findFirst({
            where: { companyId, name: defaultAccName },
          });
          if (!targetAccount) {
            targetAccount = await tx.account.create({
              data: { companyId, name: defaultAccName, category: defaultAccCat, balance: 0 },
            });
          }
          debitAccountId = targetAccount?.id || 'acc-direct-expense';
        }
        
        accountDebits[debitAccountId] = (accountDebits[debitAccountId] || 0) + lineTotalAfterDiscount;
      }

      const adjustment = Number(dto.adjustment || 0);
      let tdsAmount = 0;
      let tcsAmount = 0;
      if (dto.tdsTcsType === 'TDS') {
        tdsAmount = dto.tdsTcsAmount !== undefined ? Number(dto.tdsTcsAmount) : (subTotal * Number(dto.tdsTcsRate || 0)) / 100;
      } else if (dto.tdsTcsType === 'TCS') {
        tcsAmount = dto.tdsTcsAmount !== undefined ? Number(dto.tdsTcsAmount) : (subTotal * Number(dto.tdsTcsRate || 0)) / 100;
      }

      const grandTotal = Number((subTotal + taxTotal + adjustment - tdsAmount + tcsAmount).toFixed(2));

      const metaBundle = {
        ...(typeof dto.gstBreakup === 'object' ? dto.gstBreakup : {}),
        poId: dto.poId || undefined,
        orderNumber: dto.orderNumber || undefined,
        paymentTerms: dto.paymentTerms || 'Due on Receipt',
        dueDate: dto.dueDate || undefined,
        subject: dto.subject || undefined,
        notes: dto.notes || undefined,
        termsConditions: dto.termsConditions || undefined,
        discount: dto.discount || 0,
        discountType: dto.discountType || '%',
        discountAmount: dto.discountAmount || 0,
        adjustment: dto.adjustment || 0,
        tdsTcsType: dto.tdsTcsType || 'NONE',
        tdsTcsRate: dto.tdsTcsRate || 0,
        tdsTcsAmount: tdsAmount || tcsAmount || 0,
        tdsTcsTaxId: dto.tdsTcsTaxId || undefined,
        attachedFiles: dto.attachedFiles || [],
      };

      // 3. Create Purchase record
      const purchase = await tx.purchase.create({
        data: {
          companyId,
          businessPartnerId: dto.vendorId,
          purchaseNo,
          date: new Date(dto.date),
          status: docStatus,
          subTotal,
          taxTotal,
          grandTotal,
          amountPaid: 0,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          cessAmount: 0,
          totalTaxAmount: taxTotal,
          reference: dto.orderNumber || dto.reference || null,
          billingAddress: dto.billingAddress || null,
          shippingAddress: dto.shippingAddress || null,
          placeOfSupply: dto.placeOfSupply || null,
          taxMode: (dto.taxMode as any) || 'CGST_SGST',
          isRcm: dto.isRcm || false,
          tdsAmount,
          tcsAmount,
          gstBreakup: metaBundle,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });

      // Link source invoice document attachment if present
      if (dto.attachmentId) {
        await tx.purchaseAttachment.updateMany({
          where: { id: dto.attachmentId, companyId },
          data: { purchaseId: purchase.id },
        });
      }

      // 4. If OPEN, update vendor balance, stock, and general ledger
      if (docStatus !== 'DRAFT') {
        // Update vendor payable balance
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
            if (!item.productId) continue;

            const prod = await tx.product.findFirst({
              where: { id: item.productId, companyId },
            });
            if (prod && (prod.isService || !prod.isInventoryItem)) continue;

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

        // 6. Post automatic balanced journal entry to General Ledger
        let apAccount = await tx.account.findFirst({
          where: { companyId, name: 'Accounts Payable' },
        });
        if (!apAccount) {
          apAccount = await tx.account.create({
            data: { companyId, name: 'Accounts Payable', category: 'LIABILITY', balance: 0 },
          });
        }

        const getTaxAccount = async (name: string, category: 'ASSET' | 'LIABILITY' = 'ASSET') => {
          let acc = await tx.account.findFirst({ where: { companyId, name } });
          if (!acc) {
            acc = await tx.account.create({
              data: { companyId, name, category, balance: 0 },
            });
          }
          return acc;
        };

        const cgstAccount = isInterState ? null : await getTaxAccount('Input CGST', 'ASSET');
        const sgstAccount = isInterState ? null : await getTaxAccount('Input SGST', 'ASSET');
        const igstAccount = isInterState ? await getTaxAccount('Input IGST', 'ASSET') : null;

        const journalLines: { accountId: string; debit: number; credit: number }[] = [];
        
        // Debit expense/asset accounts
        for (const [accountId, amount] of Object.entries(accountDebits)) {
          journalLines.push({ accountId, debit: amount, credit: 0 });
        }

        // Credit Accounts Payable
        journalLines.push({ accountId: apAccount.id, debit: 0, credit: grandTotal });

        // Debit Input GST
        const cgstAmt = totalCgst;
        const sgstAmt = totalSgst;
        const igstAmt = totalIgst;

        if (!isInterState && cgstAmt > 0 && cgstAccount && sgstAccount) {
          journalLines.push({ accountId: cgstAccount.id, debit: cgstAmt, credit: 0 });
          journalLines.push({ accountId: sgstAccount.id, debit: sgstAmt, credit: 0 });
        }
        if (isInterState && igstAmt > 0 && igstAccount) {
          journalLines.push({ accountId: igstAccount.id, debit: igstAmt, credit: 0 });
        }

        // TDS/TCS journal line balancing
        if (tdsAmount > 0) {
          const tdsAcc = await getTaxAccount('TDS Payable', 'LIABILITY');
          journalLines.push({ accountId: tdsAcc.id, debit: 0, credit: tdsAmount });
        }
        if (tcsAmount > 0) {
          const tcsAcc = await getTaxAccount('TCS Receivable', 'ASSET');
          journalLines.push({ accountId: tcsAcc.id, debit: tcsAmount, credit: 0 });
        }

        // Adjustment balancing
        if (adjustment !== 0) {
          const adjAcc = await getTaxAccount('Expense Adjustments', 'LIABILITY');
          if (adjustment > 0) {
            journalLines.push({ accountId: adjAcc.id, debit: adjustment, credit: 0 });
          } else {
            journalLines.push({ accountId: adjAcc.id, debit: 0, credit: Math.abs(adjustment) });
          }
        }

        await this.accountingEngine.postTransaction({
          companyId,
          date: new Date(dto.date),
          reference: purchaseNo,
          description: `Automatic purchase billing posting ${purchaseNo}`,
          lines: journalLines,
        }, tx);
      }

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
      const wasActive = purchase.status !== 'DRAFT';

      // 1. Revert original purchase effects only if it was active
      if (wasActive) {
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
      }

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
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      const itemsToCreate = [];
      const accountDebits: Record<string, number> = {};

      const bpTaxPreference = vendor?.taxPreference || 'TAXABLE';

      for (const item of dto.items) {
        let product: any = null;

        // 1. Transactional candidate product creation if requested
        if (item.createAsNewProduct && item.newProductData?.name) {
          const normName = item.newProductData.name.trim();
          const existing = await tx.product.findFirst({
            where: {
              companyId,
              deletedAt: null,
              name: { equals: normName, mode: 'insensitive' },
            },
          });

          if (existing) {
            product = existing;
          } else {
            const generatedSku = await this.sequenceService.generateNextSequence(companyId, 'SKU');
            const isService = item.newProductData.itemType === 'SERVICE' || item.newProductData.isInventoryItem === false;
            const finalItemType = isService ? 'SERVICE' : (item.newProductData.itemType as any || 'FINISHED_GOOD');
            
            product = await tx.product.create({
              data: {
                companyId,
                name: normName,
                sku: generatedSku,
                unit: item.newProductData.unit || 'NOS',
                itemType: finalItemType,
                hsnCode: item.newProductData.hsnCode || null,
                gstRate: item.newProductData.gstRate !== undefined ? Number(item.newProductData.gstRate) : Number(item.taxPercent || 18),
                taxPreference: 'TAXABLE',
                purchasePrice: Number(item.rate || 0),
                sellingPrice: Number(item.rate || 0),
                minStock: 0,
                maxStock: 0,
                reorderLevel: 0,
                valuationMethod: isService ? 'NONE' : 'AVERAGE',
                isPurchasable: true,
                isSellable: true,
                isInventoryItem: !isService,
                isTrackStock: !isService,
                isService: isService,
                isActive: true,
              },
            });
          }
        } else if (item.productId) {
          product = await tx.product.findFirst({
            where: { id: item.productId, companyId },
          });
        }

        const rate = Number(item.rate);
        const qty = Number(item.qty);
        const lineSubtotal = rate * qty;
        const discountAmt = item.discount ? (lineSubtotal * Number(item.discount)) / 100 : 0;
        const lineTotalAfterDiscount = lineSubtotal - discountAmt;
        
        const taxRate = item.taxPercent !== undefined ? Number(item.taxPercent) : Number(product?.gstRate || 18);
        
        const gstResult = GSTEngine.calculate({
           taxableAmount: lineTotalAfterDiscount,
           gstRate: taxRate,
           taxPreference: bpTaxPreference as any,
           companyStateCode: companyState,
           customerStateCode: supplyState
        });

        subTotal += gstResult.taxableAmount;
        taxTotal += gstResult.totalTax;
        totalCgst += gstResult.cgstAmount;
        totalSgst += gstResult.sgstAmount;
        totalIgst += gstResult.igstAmount;

        itemsToCreate.push({
          productId: product ? product.id : null,
          description: JSON.stringify({
            text: item.description || product?.name || 'Bill Line Item',
            discount: item.discount || 0,
            skippedProduct: !product,
          }),
          qty,
          rate,
          taxPercent: taxRate,
          taxAmount: gstResult.totalTax,
          total: gstResult.grandTotal,
          cgstAmount: gstResult.cgstAmount,
          sgstAmount: gstResult.sgstAmount,
          igstAmount: gstResult.igstAmount,
        });

        let debitAccountId = item.accountId || product?.purchaseAccountId || product?.inventoryAccountId;
        if (!debitAccountId) {
          const defaultAccName = product ? 'Inventory Asset' : 'Direct Expenses';
          const defaultAccCat = product ? 'ASSET' : 'EXPENSE';
          let targetAccount = await tx.account.findFirst({
            where: { companyId, name: defaultAccName },
          });
          if (!targetAccount) {
            targetAccount = await tx.account.create({
              data: { companyId, name: defaultAccName, category: defaultAccCat, balance: 0 },
            });
          }
          debitAccountId = targetAccount?.id || 'acc-direct-expense';
        }
        
        accountDebits[debitAccountId] = (accountDebits[debitAccountId] || 0) + lineTotalAfterDiscount;
      }

      const adjustment = Number(dto.adjustment || 0);
      let tdsAmount = 0;
      let tcsAmount = 0;
      if (dto.tdsTcsType === 'TDS') {
        tdsAmount = dto.tdsTcsAmount !== undefined ? Number(dto.tdsTcsAmount) : (subTotal * Number(dto.tdsTcsRate || 0)) / 100;
      } else if (dto.tdsTcsType === 'TCS') {
        tcsAmount = dto.tdsTcsAmount !== undefined ? Number(dto.tdsTcsAmount) : (subTotal * Number(dto.tdsTcsRate || 0)) / 100;
      }

      const grandTotal = Number((subTotal + taxTotal + adjustment - tdsAmount + tcsAmount).toFixed(2));
      const newDocStatus = dto.status === 'DRAFT' ? 'DRAFT' : 'SENT';

      const existingMeta = (purchase.gstBreakup as any) || {};
      const metaBundle = {
        ...existingMeta,
        ...(typeof dto.gstBreakup === 'object' ? dto.gstBreakup : {}),
        poId: dto.poId !== undefined ? dto.poId : existingMeta.poId,
        orderNumber: dto.orderNumber !== undefined ? dto.orderNumber : existingMeta.orderNumber,
        paymentTerms: dto.paymentTerms || existingMeta.paymentTerms || 'Due on Receipt',
        dueDate: dto.dueDate !== undefined ? dto.dueDate : existingMeta.dueDate,
        subject: dto.subject !== undefined ? dto.subject : existingMeta.subject,
        notes: dto.notes !== undefined ? dto.notes : existingMeta.notes,
        termsConditions: dto.termsConditions !== undefined ? dto.termsConditions : existingMeta.termsConditions,
        discount: dto.discount !== undefined ? dto.discount : existingMeta.discount || 0,
        discountType: dto.discountType || existingMeta.discountType || '%',
        discountAmount: dto.discountAmount !== undefined ? dto.discountAmount : existingMeta.discountAmount || 0,
        adjustment: dto.adjustment !== undefined ? dto.adjustment : existingMeta.adjustment || 0,
        tdsTcsType: dto.tdsTcsType || existingMeta.tdsTcsType || 'NONE',
        tdsTcsRate: dto.tdsTcsRate !== undefined ? dto.tdsTcsRate : existingMeta.tdsTcsRate || 0,
        tdsTcsAmount: tdsAmount || tcsAmount || 0,
        tdsTcsTaxId: dto.tdsTcsTaxId !== undefined ? dto.tdsTcsTaxId : existingMeta.tdsTcsTaxId,
        attachedFiles: dto.attachedFiles !== undefined ? dto.attachedFiles : existingMeta.attachedFiles || [],
      };

      // 4. Update Purchase record
      const updatedPurchase = await tx.purchase.update({
        where: { id },
        data: {
          businessPartnerId: dto.vendorId,
          status: newDocStatus,
          date: new Date(dto.date),
          subTotal,
          taxTotal,
          grandTotal,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          cessAmount: 0,
          totalTaxAmount: taxTotal,
          reference: dto.orderNumber || dto.reference || purchase.reference,
          billingAddress: dto.billingAddress || null,
          shippingAddress: dto.shippingAddress || null,
          placeOfSupply: dto.placeOfSupply || null,
          taxMode: (dto.taxMode as any) || 'CGST_SGST',
          isRcm: dto.isRcm || false,
          tdsAmount,
          tcsAmount,
          gstBreakup: metaBundle,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });

      // Link source invoice document attachment if present
      if (dto.attachmentId) {
        await tx.purchaseAttachment.updateMany({
          where: { id: dto.attachmentId, companyId },
          data: { purchaseId: id },
        });
      }

      // 5. If new status is OPEN, post accounting entries
      if (newDocStatus !== 'DRAFT') {
        // Update vendor payable balance
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
            if (!item.productId) continue;

            const prod = await tx.product.findFirst({
              where: { id: item.productId, companyId },
            });
            if (prod && (prod.isService || !prod.isInventoryItem)) continue;

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

        const getTaxAccount = async (name: string, category: 'ASSET' | 'LIABILITY' = 'ASSET') => {
          let acc = await tx.account.findFirst({ where: { companyId, name } });
          if (!acc) {
            acc = await tx.account.create({
              data: { companyId, name, category, balance: 0 },
            });
          }
          return acc;
        };

        const cgstAccount = isInterState ? null : await getTaxAccount('Input CGST', 'ASSET');
        const sgstAccount = isInterState ? null : await getTaxAccount('Input SGST', 'ASSET');
        const igstAccount = isInterState ? await getTaxAccount('Input IGST', 'ASSET') : null;

        const journalLines: { accountId: string; debit: number; credit: number }[] = [];
        
        for (const [accountId, amount] of Object.entries(accountDebits)) {
          journalLines.push({ accountId, debit: amount, credit: 0 });
        }

        journalLines.push({ accountId: apAccount.id, debit: 0, credit: grandTotal });

        const cgstAmt = totalCgst;
        const sgstAmt = totalSgst;
        const igstAmt = totalIgst;

        if (!isInterState && cgstAmt > 0 && cgstAccount && sgstAccount) {
          journalLines.push({ accountId: cgstAccount.id, debit: cgstAmt, credit: 0 });
          journalLines.push({ accountId: sgstAccount.id, debit: sgstAmt, credit: 0 });
        }
        if (isInterState && igstAmt > 0 && igstAccount) {
          journalLines.push({ accountId: igstAccount.id, debit: igstAmt, credit: 0 });
        }

        if (tdsAmount > 0) {
          const tdsAcc = await getTaxAccount('TDS Payable', 'LIABILITY');
          journalLines.push({ accountId: tdsAcc.id, debit: 0, credit: tdsAmount });
        }
        if (tcsAmount > 0) {
          const tcsAcc = await getTaxAccount('TCS Receivable', 'ASSET');
          journalLines.push({ accountId: tcsAcc.id, debit: tcsAmount, credit: 0 });
        }

        if (adjustment !== 0) {
          const adjAcc = await getTaxAccount('Expense Adjustments', 'LIABILITY');
          if (adjustment > 0) {
            journalLines.push({ accountId: adjAcc.id, debit: adjustment, credit: 0 });
          } else {
            journalLines.push({ accountId: adjAcc.id, debit: 0, credit: Math.abs(adjustment) });
          }
        }

        await this.accountingEngine.postTransaction({
          companyId,
          date: new Date(dto.date),
          reference: purchase.purchaseNo,
          description: `Automatic purchase billing posting ${purchase.purchaseNo} (Updated)`,
          lines: journalLines,
        }, tx);
      }

      return updatedPurchase;
    }, { timeout: 20000 });
  }

  async remove(id: string) {
    const purchase = await this.findOne(id);
    if (purchase.status === 'PAID') {
      throw new BadRequestException('Cannot delete a fully paid purchase');
    }

    return this.prisma.$transaction(async (tx) => {
      const wasActive = purchase.status !== 'DRAFT';

      if (wasActive) {
        // Revert vendor outstanding balance
        await tx.businessPartner.update({
          where: { id: purchase.businessPartnerId },
          data: {
            payableBalance: {
              decrement: purchase.grandTotal,
            },
          },
        });

        // Find original journal entries and create reversals using AccountingEngineService
        const originalEntries = await tx.journalEntry.findMany({
          where: { reference: purchase.purchaseNo, companyId: purchase.companyId },
        });

        for (const entry of originalEntries) {
          await this.accountingEngine.reverseTransaction(entry.id, purchase.companyId, tx, `Reversal for deleted purchase ${purchase.purchaseNo}`);
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
      }

      // Soft delete purchase
      return tx.purchase.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
