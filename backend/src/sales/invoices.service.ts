import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInvoiceDto, UpdateInvoiceStatusDto } from './dto/invoice.dto';
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
              { customer: { name: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        include: { customer: true, items: { include: { product: true } } },
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
      include: { customer: true, items: { include: { product: true } } },
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
    const customer = await this.prisma.customer.findFirst({
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

      // 2. Fetch products and calculate totals
      let subTotal = 0;
      let taxTotal = 0;
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
        
        // Use product taxRate or default to 18%
        const taxRate = Number(product.taxRate || product.gstRate || 18);
        const taxAmount = (lineTotal * taxRate) / 100;

        subTotal += lineTotal;
        taxTotal += taxAmount;

        itemsToCreate.push({
          productId: product.id,
          description: item.description || product.name,
          qty,
          rate,
          taxPercent: taxRate,
          taxAmount,
          total: lineTotal + taxAmount,
          cgstAmount: taxAmount / 2,
          sgstAmount: taxAmount / 2,
          igstAmount: 0,
        });
      }

      const grandTotal = subTotal + taxTotal;

      // 3. Create Invoice record
      const invoice = await tx.invoice.create({
        data: {
          companyId,
          customerId: dto.customerId,
          invoiceNo,
          date: new Date(dto.date),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          status: 'SENT', // Default to sent
          subTotal,
          taxTotal,
          grandTotal,
          amountPaid: 0,
          cgstAmount: taxTotal / 2,
          sgstAmount: taxTotal / 2,
          igstAmount: 0,
          cessAmount: 0,
          totalTaxAmount: taxTotal,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });

      // 4. Update customer outstanding balance
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          outstandingAmount: {
            increment: grandTotal,
          },
        },
      });

      // 5. Create Customer Statement record
      await tx.customerStatement.create({
        data: {
          companyId,
          customerId: dto.customerId,
          date: new Date(dto.date),
          type: 'INVOICE',
          reference: invoiceNo,
          debit: grandTotal,
          credit: 0,
          balance: Number(customer.outstandingAmount) + grandTotal,
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

          // Stock movement log
          await tx.stockMovement.create({
            data: {
              companyId,
              productId: item.productId,
              type: 'SALE',
              quantity: item.qty,
              referenceId: invoice.id,
            },
          });

          // Stock audit log
          await tx.stockLog.create({
            data: {
              companyId,
              productId: item.productId,
              type: 'SALE',
              quantityBefore: currentQty,
              quantityChange: -item.qty,
              quantityAfter: newQty,
              notes: `Issued via Invoice ${invoiceNo}`,
              referenceId: invoice.id,
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
        data: { balance: { decrement: grandTotal } },
      });

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
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: {
          outstandingAmount: {
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
