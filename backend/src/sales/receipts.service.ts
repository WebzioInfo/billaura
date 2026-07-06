import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateReceiptDto, UpdateReceiptDto } from './dto/receipt.dto';
import { CompanyContext } from '../common/context/company-context';
import { getPagination, toPaginatedResult } from '../common/pagination';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.ReceiptWhereInput = {
      companyId,
      ...(query.search
        ? {
            OR: [
              { receiptNo: { contains: query.search } },
              { businessPartner: { name: { contains: query.search } } },
              { referenceNo: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.customerId ? { businessPartnerId: query.customerId } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.startDate && query.endDate
        ? {
            date: {
              gte: new Date(query.startDate),
              lte: new Date(query.endDate),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.receipt.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true, account: true, receivedBy: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.receipt.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const receipt = await this.prisma.receipt.findFirst({
      where: { id },
      include: {
        businessPartner: true,
        account: true,
        receivedBy: true,
        allocations: { include: { invoice: true } },
        attachments: true,
        audits: { include: { user: true } },
      },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    return receipt;
  }

  async getSummary() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const activeWhere = { companyId, status: 'COMPLETED' };

    const totalReceipts = await this.prisma.receipt.count({ where: activeWhere });

    const totalAmountRes = await this.prisma.receipt.aggregate({
      where: activeWhere,
      _sum: { amount: true },
    });

    const paymentMethodsGroup = await this.prisma.receipt.groupBy({
      where: activeWhere,
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: { id: true },
    });

    const recent = await this.prisma.receipt.findMany({
      where: {},
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { businessPartner: true },
    });

    return {
      totalReceipts,
      totalAmount: totalAmountRes._sum.amount || 0,
      paymentMethods: paymentMethodsGroup.map((g) => ({
        method: g.paymentMethod,
        amount: g._sum.amount || 0,
        count: g._count.id,
      })),
      recent,
    };
  }

  async create(dto: CreateReceiptDto, userId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const customer = await this.prisma.businessPartner.findFirst({
      where: { id: dto.businessPartnerId, companyId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.businessPartnerId} not found`);
    }

    let targetAccountId = dto.accountId;
    if (!targetAccountId) {
      const isCash = dto.paymentMethod === 'CASH';
      const ledgerName = isCash ? 'Cash' : 'Bank Accounts';
      let resolvedAccount = await this.prisma.account.findFirst({
        where: { companyId, name: ledgerName },
      });
      if (!resolvedAccount) {
        resolvedAccount = await this.prisma.account.create({
          data: { companyId, name: ledgerName, category: 'ASSET', subCategory: 'CURRENT_ASSET', balance: 0 },
        });
      }
      targetAccountId = resolvedAccount.id;
    } else {
      const account = await this.prisma.account.findFirst({
        where: { id: targetAccountId, companyId },
      });
      if (!account) {
        throw new NotFoundException(`Account with ID ${targetAccountId} not found`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Generate receipt number
      let sequence = await tx.documentSequence.findFirst({
        where: { companyId, documentType: 'RECEIPT' },
      });

      if (!sequence) {
        sequence = await tx.documentSequence.create({
          data: {
            companyId,
            documentType: 'RECEIPT',
            currentNumber: 0,
          },
        });
      }

      const nextNumber = sequence.currentNumber + 1;
      await tx.documentSequence.update({
        where: { id: sequence.id },
        data: { currentNumber: nextNumber },
      });

      const receiptNo = `REC-${String(nextNumber).padStart(5, '0')}`;

      // 2. Create Receipt record
      const receipt = await tx.receipt.create({
        data: {
          companyId,
          receiptNo,
          date: new Date(dto.date),
          businessPartnerId: dto.businessPartnerId,
          accountId: targetAccountId,
          paymentMethod: dto.paymentMethod,
          amount: dto.amount,
          referenceNo: dto.referenceNo || null,
          chequeNo: dto.chequeNo || null,
          transactionId: dto.transactionId || null,
          clearanceDate: dto.clearanceDate ? new Date(dto.clearanceDate) : null,
          bankCharges: dto.bankCharges || 0,
          cashier: dto.cashier || null,
          notes: dto.notes || null,
          currency: dto.currency || 'INR',
          exchangeRate: dto.exchangeRate || 1.0,
          receivedById: userId,
          status: 'COMPLETED',
        },
      });

      // 3. Invoice Allocation
      let remainingAmount = Number(dto.amount);

      if (dto.allocations && dto.allocations.length > 0) {
        // Manual allocation
        for (const alloc of dto.allocations) {
          const inv = await tx.invoice.findFirst({
            where: { id: alloc.invoiceId, companyId },
          });
          if (!inv) throw new NotFoundException(`Invoice with ID ${alloc.invoiceId} not found`);

          const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
          if (alloc.amount > unpaid) {
            throw new BadRequestException(`Allocation amount ${alloc.amount} exceeds unpaid invoice balance ${unpaid}`);
          }

          const newPaid = Number(inv.amountPaid) + alloc.amount;
          const status = newPaid >= Number(inv.grandTotal) ? 'PAID' : 'PARTIAL';

          await tx.invoice.update({
            where: { id: inv.id },
            data: { amountPaid: newPaid, status },
          });

          await tx.receiptAllocation.create({
            data: {
              receiptId: receipt.id,
              invoiceId: inv.id,
              amount: alloc.amount,
            },
          });
        }
      } else {
        // FIFO Auto allocation
        const invoices = await tx.invoice.findMany({
          where: {
            companyId,
            businessPartnerId: dto.businessPartnerId,
            NOT: { status: 'PAID' },
          },
          orderBy: { date: 'asc' },
        });

        for (const inv of invoices) {
          if (remainingAmount <= 0) break;

          const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
          const allocate = Math.min(remainingAmount, unpaid);

          if (allocate > 0) {
            const newPaid = Number(inv.amountPaid) + allocate;
            const status = newPaid >= Number(inv.grandTotal) ? 'PAID' : 'PARTIAL';

            await tx.invoice.update({
              where: { id: inv.id },
              data: { amountPaid: newPaid, status },
            });

            await tx.receiptAllocation.create({
              data: {
                receiptId: receipt.id,
                invoiceId: inv.id,
                amount: allocate,
              },
            });

            remainingAmount -= allocate;
          }
        }
      }

      // 4. Update Customer Receivable balance
      await tx.businessPartner.update({
        where: { id: dto.businessPartnerId },
        data: {
          receivableBalance: {
            decrement: dto.amount,
          },
        },
      });

      // 5. Update Cash/Bank Account balance
      await tx.account.update({
        where: { id: targetAccountId },
        data: {
          balance: {
            increment: dto.amount,
          },
        },
      });

      // 6. Write Customer Statement
      await tx.customerStatement.create({
        data: {
          companyId,
          businessPartnerId: dto.businessPartnerId,
          date: new Date(dto.date),
          type: 'PAYMENT',
          reference: receiptNo,
          debit: 0,
          credit: dto.amount,
          balance: Number(customer.receivableBalance) - dto.amount,
        },
      });

      // 7. Write Double Entry Journal Post
      let arAccount = await tx.account.findFirst({
        where: { companyId, name: 'Accounts Receivable' },
      });
      if (!arAccount) {
        arAccount = await tx.account.create({
          data: { companyId, name: 'Accounts Receivable', category: 'ASSET', balance: 0 },
        });
      }

      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: receiptNo,
          description: `Automatic receipt posting ${receiptNo}`,
          lines: {
            create: [
              { accountId: targetAccountId, debit: dto.amount, credit: 0 },
              { accountId: arAccount.id, debit: 0, credit: dto.amount },
            ],
          },
        },
      });

      // Credit accounts receivable balance
      await tx.account.update({
        where: { id: arAccount.id },
        data: { balance: { decrement: dto.amount } },
      });

      // Create Audit Log
      await tx.receiptAudit.create({
        data: {
          receiptId: receipt.id,
          userId,
          action: 'CREATE',
          details: JSON.parse(JSON.stringify({ dto })),
        },
      });

      return receipt;
    }, { timeout: 30000 });
  }

  async update(id: string, dto: UpdateReceiptDto, userId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const receipt = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.receipt.update({
        where: { id },
        data: {
          referenceNo: dto.referenceNo !== undefined ? dto.referenceNo : receipt.referenceNo,
          chequeNo: dto.chequeNo !== undefined ? dto.chequeNo : receipt.chequeNo,
          transactionId: dto.transactionId !== undefined ? dto.transactionId : receipt.transactionId,
          clearanceDate: dto.clearanceDate !== undefined ? (dto.clearanceDate ? new Date(dto.clearanceDate) : null) : receipt.clearanceDate,
          bankCharges: dto.bankCharges !== undefined ? dto.bankCharges : receipt.bankCharges,
          cashier: dto.cashier !== undefined ? dto.cashier : receipt.cashier,
          notes: dto.notes !== undefined ? dto.notes : receipt.notes,
          status: dto.status !== undefined ? dto.status : receipt.status,
        },
      });

      await tx.receiptAudit.create({
        data: {
          receiptId: id,
          userId,
          action: 'UPDATE',
          details: JSON.parse(JSON.stringify({ dto })),
        },
      });

      return updated;
    });
  }

  async remove(id: string, userId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const receipt = await this.findOne(id);
    if (receipt.deletedAt) {
      throw new BadRequestException('Receipt already deleted');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Revert Allocations on Invoices
      for (const alloc of receipt.allocations) {
        const inv = await tx.invoice.findFirst({
          where: { id: alloc.invoiceId, companyId },
        });

        if (inv) {
          const revertedPaid = Number(inv.amountPaid) - Number(alloc.amount);
          const status = revertedPaid <= 0 ? 'DRAFT' : 'PARTIAL'; // Set back to draft or partial

          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              amountPaid: Math.max(0, revertedPaid),
              status,
            },
          });
        }
      }

      // 2. Revert Customer outstanding balance
      await tx.businessPartner.update({
        where: { id: receipt.businessPartnerId },
        data: {
          receivableBalance: {
            increment: receipt.amount,
          },
        },
      });

      // 3. Revert Cash/Bank Account balance
      await tx.account.update({
        where: { id: receipt.accountId },
        data: {
          balance: {
            decrement: receipt.amount,
          },
        },
      });

      // 4. Revert Customer Statement (create contra entry or delete)
      await tx.customerStatement.create({
        data: {
          companyId,
          businessPartnerId: receipt.businessPartnerId,
          date: new Date(),
          type: 'REFUND',
          reference: `REV-${receipt.receiptNo}`,
          debit: receipt.amount,
          credit: 0,
          balance: Number(receipt.businessPartner.receivableBalance) + Number(receipt.amount),
        },
      });

      // 5. Revert General Ledger Journal entries
      const arAccount = await tx.account.findFirst({
        where: { companyId, name: 'Accounts Receivable' },
      });
      if (arAccount) {
        await tx.account.update({
          where: { id: arAccount.id },
          data: { balance: { increment: receipt.amount } },
        });
      }

      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(),
          reference: `REV-${receipt.receiptNo}`,
          description: `Reversal entry for receipt void ${receipt.receiptNo}`,
          lines: {
            create: [
              { accountId: receipt.accountId, debit: 0, credit: receipt.amount },
              { accountId: arAccount?.id || receipt.accountId, debit: receipt.amount, credit: 0 },
            ],
          },
        },
      });

      // Soft delete receipt
      await tx.receipt.update({
        where: { id },
        data: {
          status: 'VOID',
          deletedAt: new Date(),
        },
      });

      await tx.receiptAudit.create({
        data: {
          receiptId: id,
          userId,
          action: 'DELETE',
          details: { reason: 'Void Receipt' },
        },
      });

      return { success: true };
    }, { timeout: 30000 });
  }
}
