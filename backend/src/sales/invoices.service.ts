import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { invoiceNo: { contains: query.search } },
              { businessPartner: { name: { contains: query.search } } },
            ],
          }
        : {}),
      ...((query as any).customerId ? { businessPartnerId: (query as any).customerId } : {}),
      ...((query as any).status ? { status: (query as any).status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true, items: { include: { product: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { businessPartner: true, items: { include: { product: true } } },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async create(dto: CreateInvoiceDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Check customer exists
    const customer = await this.prisma.businessPartner.findFirst({
      where: { id: dto.customerId, companyId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Generate invoice number using DocumentSequence
      let sequence = await tx.documentSequence.findFirst({
        where: { companyId, documentType: 'INVOICE' },
      });

      if (!sequence) {
        sequence = await tx.documentSequence.create({
          data: {
            companyId,
            documentType: 'INVOICE',
            currentNumber: 0,
          },
        });
      }

      const nextNumber = sequence.currentNumber + 1;
      await tx.documentSequence.update({
        where: { id: sequence.id },
        data: { currentNumber: nextNumber },
      });

      const invoiceNo = `INV-${String(nextNumber).padStart(5, '0')}`;

      // Fetch company profile to verify placeOfSupply relative to companyState for GST routing
      const company = await tx.company.findUnique({
        where: { id: companyId },
      });
      const companyState = company?.state?.trim().toLowerCase() || '';
      const supplyState = dto.placeOfSupply?.trim().toLowerCase() || '';
      const isInterState = supplyState && companyState && supplyState !== companyState;

      // 2. Fetch products and calculate totals
      let subTotal = 0;
      let taxTotal = 0;
      let totalCogs = 0;
      const itemsToCreate = [];

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, companyId, deletedAt: null },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const rate = Number(item.rate);
        const qty = Number(item.qty);
        const lineTotal = rate * qty;
        
        // Respect provided tax percent, fallback to product, or 0 if BILL_OF_SUPPLY
        let taxRate = item.taxPercent !== undefined ? Number(item.taxPercent) : Number(product.taxRate || product.gstRate || 18);
        if (dto.invoiceType === 'BILL_OF_SUPPLY') {
          taxRate = 0;
        }
        
        const taxAmount = (lineTotal * taxRate) / 100;

        subTotal += lineTotal;
        taxTotal += taxAmount;
        if (product.itemType === 'FINISHED_GOOD' || product.itemType === 'RAW_MATERIAL') {
          totalCogs += (Number(product.purchasePrice || 0) * qty);
        }

        const lineCgst = isInterState ? 0 : taxAmount / 2;
        const lineSgst = isInterState ? 0 : taxAmount / 2;
        const lineIgst = isInterState ? taxAmount : 0;

        itemsToCreate.push({
          productId: product.id,
          description: item.description || product.name,
          qty,
          rate,
          taxPercent: taxRate,
          taxAmount,
          total: lineTotal + taxAmount,
          cgstAmount: lineCgst,
          sgstAmount: lineSgst,
          igstAmount: lineIgst,
        });
      }

      const grandTotal = subTotal + taxTotal;

      // Determine Enums
      const invoiceTypeEnum = (dto.invoiceType as any) || 'TAX_INVOICE';

      // 3. Create Invoice record
      const invoice = await tx.invoice.create({
        data: {
          companyId,
          businessPartnerId: dto.customerId,
          invoiceNo,
          invoiceType: invoiceTypeEnum,
          placeOfSupply: dto.placeOfSupply,
          date: new Date(dto.date),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          status: (dto as any).status || 'SENT', // Use status from DTO or default to SENT
          subTotal,
          taxTotal,
          grandTotal,
          amountPaid: 0,
          cgstAmount: isInterState ? 0 : taxTotal / 2,
          sgstAmount: isInterState ? 0 : taxTotal / 2,
          igstAmount: isInterState ? taxTotal : 0,
          cessAmount: 0,
          totalTaxAmount: taxTotal,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });

      // 4. Update customer outstanding balance
      await tx.businessPartner.update({
        where: { id: dto.customerId },
        data: {
          receivableBalance: {
            increment: grandTotal,
          },
        },
      });

      // 5. Create Customer Statement record
      await tx.customerStatement.create({
        data: {
          companyId,
          businessPartnerId: dto.customerId,
          date: new Date(dto.date),
          type: 'INVOICE',
          reference: invoiceNo,
          debit: grandTotal,
          credit: 0,
          balance: Number(customer.receivableBalance) + grandTotal,
        },
      });

      // 6. Reduce stock quantities and create movement logs
      for (const item of itemsToCreate) {
        // Find default warehouse stock
        const defaultWh = await tx.warehouse.findFirst({
          where: { companyId, isDefault: true },
        });

        if (defaultWh) {
          const stock = await tx.stock.findFirst({
            where: { companyId, productId: item.productId, warehouseId: defaultWh.id },
          });

          const currentQty = stock ? Number(stock.quantity) : 0;
          const newQty = currentQty - item.qty;

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
                warehouseId: defaultWh.id,
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
              type: 'SALE',
              quantityBefore: currentQty,
              quantityChange: -item.qty,
              quantityAfter: newQty,
              notes: `Issued via Invoice ${invoiceNo}`,
              referenceId: invoice.id,
              referenceType: 'INVOICE'
            },
          });
        }
      }

      // 7. Post automatic journal entry to General Ledger
      let arAccount = await tx.account.findFirst({
        where: { companyId, name: 'Accounts Receivable' },
      });
      if (!arAccount) {
        arAccount = await tx.account.create({
          data: { companyId, name: 'Accounts Receivable', category: 'ASSET', balance: 0 },
        });
      }

      let salesAccount = await tx.account.findFirst({
        where: { companyId, name: 'Sales Revenue' },
      });
      if (!salesAccount) {
        salesAccount = await tx.account.create({
          data: { companyId, name: 'Sales Revenue', category: 'REVENUE', balance: 0 },
        });
      }

      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: invoiceNo,
          description: `Automatic invoice posting ${invoiceNo}`,
          lines: {
            create: [
              { accountId: arAccount.id, debit: grandTotal, credit: 0 },
              { accountId: salesAccount.id, debit: 0, credit: grandTotal },
            ],
          },
        },
      });

      await tx.account.update({
        where: { id: arAccount.id },
        data: { balance: { increment: grandTotal } },
      });

      await tx.account.update({
        where: { id: salesAccount.id },
        data: { balance: { decrement: grandTotal } }, // Revenue credit is negative balance or handled as decrement
      });

      // 8. Post automatic COGS journal entry
      if (totalCogs > 0) {
        let cogsAccount = await tx.account.findFirst({ where: { companyId, name: 'Cost of Goods Sold' } });
        if (!cogsAccount) {
          cogsAccount = await tx.account.create({
            data: { companyId, name: 'Cost of Goods Sold', category: 'EXPENSE', subCategory: 'COGS', balance: 0 },
          });
        }
        let invAccount = await tx.account.findFirst({ where: { companyId, name: 'Inventory' } });
        if (!invAccount) {
          invAccount = await tx.account.create({
            data: { companyId, name: 'Inventory', category: 'ASSET', subCategory: 'CURRENT_ASSET', balance: 0 },
          });
        }

        await tx.journalEntry.create({
          data: {
            companyId,
            date: new Date(dto.date),
            reference: invoiceNo,
            description: `Automatic COGS posting ${invoiceNo}`,
            lines: {
              create: [
                { accountId: cogsAccount.id, debit: totalCogs, credit: 0 },
                { accountId: invAccount.id, debit: 0, credit: totalCogs },
              ],
            },
          },
        });

        await tx.account.update({ where: { id: cogsAccount.id }, data: { balance: { increment: totalCogs } } });
        await tx.account.update({ where: { id: invAccount.id }, data: { balance: { decrement: totalCogs } } });
      }

      return invoice;
    }, { timeout: 20000 });
  }

  async remove(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot delete a fully paid invoice');
    }

    return this.prisma.$transaction(async (tx) => {
      // Revert customer outstanding balance
      await tx.businessPartner.update({
        where: { id: invoice.businessPartnerId },
        data: {
          receivableBalance: {
            decrement: invoice.grandTotal,
          },
        },
      });

      // Soft delete invoice
      return tx.invoice.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
