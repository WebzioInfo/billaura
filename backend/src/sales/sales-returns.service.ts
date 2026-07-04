import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';

@Injectable()
export class SalesReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const { skip, take } = getPagination(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesReturn.findMany({
        where: {},
        skip,
        take,
        include: { businessPartner: true, items: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.salesReturn.count({ where: {} }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    const salesReturn = await this.prisma.salesReturn.findFirst({
      where: { id },
      include: { businessPartner: true, items: true },
    });

    if (!salesReturn) throw new NotFoundException('Sales Return not found');
    return salesReturn;
  }

  async create(dto: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    return this.prisma.$transaction(async (tx) => {
      // Create Sales Return (Credit Note)
      const salesReturn = await tx.salesReturn.create({
        data: {
          companyId,
          businessPartnerId: dto.businessPartnerId,
          originalInvoiceId: dto.originalInvoiceId || null,
          returnNumber: dto.returnNumber || `SR-${Date.now()}`,
          date: new Date(dto.date),
          reason: dto.reason,
          returnType: 'CREDIT_NOTE',
          status: 'COMPLETED',
          subTotal: dto.subTotal || 0,
          grandTotal: dto.grandTotal || 0,
          createdById: dto.userId || 'system',
          items: {
            create: dto.items.map((i: any) => ({
              productId: i.productId,
              description: i.description,
              qty: i.qty,
              rate: i.rate,
              taxPercent: i.taxPercent || 0,
              taxAmount: i.taxAmount || 0,
              total: i.total || 0,
            })),
          }
        },
        include: { items: true }
      });

      // Decrease customer outstanding balance (Customer owes us less because of credit note)
      await tx.businessPartner.update({
        where: { id: dto.businessPartnerId },
        data: { receivableBalance: { decrement: dto.grandTotal } }
      });

      // Post Journal Entry for Sales Return
      // Dr Sales Returns (Revenue Account)
      // Cr Accounts Receivable
      let srAccount = await tx.account.findFirst({ where: { companyId, name: 'Sales Returns' } });
      if (!srAccount) {
        srAccount = await tx.account.create({
          data: { companyId, name: 'Sales Returns', category: 'REVENUE', subCategory: 'SALES_RETURNS', balance: 0 }
        });
      }

      const arAccount = await tx.account.findFirst({ where: { companyId, name: 'Accounts Receivable' } });
      if (arAccount) {
        await tx.journalEntry.create({
          data: {
            companyId,
            date: new Date(dto.date),
            reference: salesReturn.returnNumber,
            description: `Sales Return ${salesReturn.returnNumber}`,
            lines: {
              create: [
                { accountId: srAccount.id, debit: dto.grandTotal, credit: 0 },
                { accountId: arAccount.id, debit: 0, credit: dto.grandTotal },
              ]
            }
          }
        });

        await tx.account.update({ where: { id: srAccount.id }, data: { balance: { decrement: dto.grandTotal } } }); // Revenue debit decreases balance
        await tx.account.update({ where: { id: arAccount.id }, data: { balance: { decrement: dto.grandTotal } } }); // Asset credit decreases balance
      }

      // Restock inventory
      for (const item of dto.items) {
        if (item.productId) {
          const stock = await tx.stock.findFirst({ where: { companyId, productId: item.productId } });
          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: { increment: item.qty }, availableQuantity: { increment: item.qty } }
            });
            await tx.stockLedger.create({
              data: {
                companyId,
                productId: item.productId,
                type: 'RETURN',
                quantityBefore: stock.quantity,
                quantityChange: item.qty,
                quantityAfter: Number(stock.quantity) + Number(item.qty),
                referenceId: salesReturn.id,
                referenceType: 'SALES_RETURN'
              }
            });
          }
        }
      }

      return salesReturn;
    });
  }
}
