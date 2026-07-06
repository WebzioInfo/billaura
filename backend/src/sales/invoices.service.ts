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
      where: { id },
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
      where: { id: dto.customerId, companyId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      let invoiceNo = dto.invoiceNo;
      if (invoiceNo) {
        // Validate uniqueness
        const existing = await tx.invoice.findFirst({
          where: { companyId, invoiceNo, deletedAt: null },
        });
        if (existing) {
          throw new BadRequestException('Invoice number already exists');
        }

        // If user accepted/matched the next auto sequence number, increment the sequence to keep it synchronized
        let sequence = await tx.documentSequence.findFirst({
          where: { companyId, documentType: 'INVOICE' },
        });
        if (!sequence) {
          sequence = await tx.documentSequence.create({
            data: { companyId, documentType: 'INVOICE', currentNumber: 0 },
          });
        }
        const nextNumber = sequence.currentNumber + 1;
        const expectedAuto = `INV-${String(nextNumber).padStart(5, '0')}`;
        if (invoiceNo === expectedAuto) {
          await tx.documentSequence.update({
            where: { id: sequence.id },
            data: { currentNumber: nextNumber },
          });
        }
      } else {
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

        invoiceNo = `INV-${String(nextNumber).padStart(5, '0')}`;
      }

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
          where: { id: item.productId, companyId },
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
          gstBreakup: {
            notes: dto.notes,
            termsConditions: dto.termsConditions,
          },
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

      // Find or create Tax Accounts
      const getTaxAccount = async (name: string) => {
        let acc = await tx.account.findFirst({ where: { companyId, name } });
        if (!acc) {
          acc = await tx.account.create({
            data: { companyId, name, category: 'LIABILITY', subCategory: 'CURRENT_LIABILITY', balance: 0 },
          });
        }
        return acc;
      };

      const cgstAccount = isInterState ? null : await getTaxAccount('Output CGST');
      const sgstAccount = isInterState ? null : await getTaxAccount('Output SGST');
      const igstAccount = isInterState ? await getTaxAccount('Output IGST') : null;

      const journalLines = [
        { accountId: arAccount.id, debit: grandTotal, credit: 0 },
        { accountId: salesAccount.id, debit: 0, credit: subTotal },
      ];

      const cgstAmt = isInterState ? 0 : taxTotal / 2;
      const sgstAmt = isInterState ? 0 : taxTotal / 2;
      const igstAmt = isInterState ? taxTotal : 0;

      if (!isInterState && cgstAmt > 0 && cgstAccount && sgstAccount) {
        journalLines.push({ accountId: cgstAccount.id, debit: 0, credit: cgstAmt });
        journalLines.push({ accountId: sgstAccount.id, debit: 0, credit: sgstAmt });
      }
      if (isInterState && igstAmt > 0 && igstAccount) {
        journalLines.push({ accountId: igstAccount.id, debit: 0, credit: igstAmt });
      }

      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: invoiceNo,
          description: `Automatic invoice posting ${invoiceNo}`,
          lines: {
            create: journalLines,
          },
        },
      });

      await tx.account.update({
        where: { id: arAccount.id },
        data: { balance: { increment: grandTotal } },
      });

      await tx.account.update({
        where: { id: salesAccount.id },
        data: { balance: { decrement: subTotal } }, // Revenue credit
      });

      if (!isInterState && cgstAmt > 0 && cgstAccount && sgstAccount) {
        await tx.account.update({ where: { id: cgstAccount.id }, data: { balance: { decrement: cgstAmt } } });
        await tx.account.update({ where: { id: sgstAccount.id }, data: { balance: { decrement: sgstAmt } } });
      }
      if (isInterState && igstAmt > 0 && igstAccount) {
        await tx.account.update({ where: { id: igstAccount.id }, data: { balance: { decrement: igstAmt } } });
      }

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

      // Find original journal entries and create reversals
      const originalEntries = await tx.journalEntry.findMany({
        where: { reference: invoice.invoiceNo },
        include: { lines: true },
      });

      for (const entry of originalEntries) {
        // Reverse lines
        const reversalLines = entry.lines.map(line => ({
          accountId: line.accountId,
          debit: Number(line.credit || 0),
          credit: Number(line.debit || 0),
        }));

        await tx.journalEntry.create({
          data: {
            companyId: invoice.companyId,
            date: new Date(),
            reference: `REV-${invoice.invoiceNo}`,
            description: `Reversal for deleted invoice ${invoice.invoiceNo}`,
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
        where: { referenceId: invoice.id, referenceType: 'INVOICE' },
      });

      for (const ledger of stockLedgers) {
        const changeQty = Number(ledger.quantityChange) * -1; // reverse the change

        // Restore stock qty
        const stock = await tx.stock.findFirst({
          where: { companyId: invoice.companyId, productId: ledger.productId },
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
              companyId: invoice.companyId,
              productId: ledger.productId,
              type: 'ADJUSTMENT',
              quantityBefore: currentQty,
              quantityChange: changeQty,
              quantityAfter: newQty,
              notes: `Reversal of Invoice ${invoice.invoiceNo}`,
              referenceId: invoice.id,
              referenceType: 'INVOICE_REVERSAL',
            }
          });
        }
      }

      // Soft delete invoice
      return tx.invoice.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async getNextInvoiceNumber() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    let sequence = await this.prisma.documentSequence.findFirst({
      where: { companyId, documentType: 'INVOICE' },
    });

    if (!sequence) {
      return { nextNumber: 'INV-00001' };
    }

    const nextNum = sequence.currentNumber + 1;
    return { nextNumber: `INV-${String(nextNum).padStart(5, '0')}` };
  }
}
