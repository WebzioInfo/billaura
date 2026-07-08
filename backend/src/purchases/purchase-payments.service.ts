import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePurchasePaymentDto } from './dto/purchase-payment.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PurchasePaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.TransactionPaymentWhereInput = {
      companyId,
      paymentType: 'OUTBOUND',
      ...(query.search
        ? {
            OR: [
              { paymentNo: { contains: query.search } },
              { businessPartner: { name: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transactionPayment.findMany({
        where,
        skip,
        take,
        include: { 
          businessPartner: true, 
          bankAccount: true,
          allocations: {
            include: { purchase: true }
          }
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.transactionPayment.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const payment = await this.prisma.transactionPayment.findFirst({
      where: { id },
      include: { businessPartner: true, bankAccount: true, allocations: { include: { purchase: true } } },
    });

    if (!payment) {
      throw new NotFoundException(`Purchase Payment with ID ${id} not found`);
    }

    return payment;
  }

  async create(dto: CreatePurchasePaymentDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const vendor = await this.prisma.businessPartner.findFirst({
      where: { id: dto.vendorId, companyId },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
    }

    let bankAccountId = dto.bankAccountId;
    if (!bankAccountId) {
      const defaultBank = await this.prisma.bankAccount.findFirst({
        where: { companyId },
      });
      if (!defaultBank) {
        throw new ConflictException('No bank or cash accounts found for this company to process the payment.');
      }
      bankAccountId = defaultBank.id;
    }

    const bank = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, companyId },
    });
    if (!bank) {
      throw new NotFoundException(`Bank Account with ID ${bankAccountId} not found`);
    }

    const purchase = dto.purchaseId
      ? await this.prisma.purchase.findFirst({
          where: { id: dto.purchaseId, companyId, businessPartnerId: dto.vendorId },
        })
      : null;
    if (dto.purchaseId && !purchase) {
      throw new NotFoundException(`Purchase with ID ${dto.purchaseId} not found for the selected vendor`);
    }
    return this.prisma.$transaction(async (tx) => {
      // 1. Generate payment number
      let sequence = await tx.documentSequence.findFirst({
        where: { companyId, documentType: 'PURCHASE_PAYMENT' },
      });

      if (!sequence) {
        sequence = await tx.documentSequence.create({
          data: {
            companyId,
            documentType: 'PURCHASE_PAYMENT',
            currentNumber: 0,
          },
        });
      }

      const nextNumber = sequence.currentNumber + 1;
      await tx.documentSequence.update({
        where: { id: sequence.id },
        data: { currentNumber: nextNumber },
      });

      const paymentNo = `PPY-${String(nextNumber).padStart(5, '0')}`;

      // 2. Create TransactionPayment record
      const payment = await tx.transactionPayment.create({
        data: {
          companyId,
          businessPartnerId: dto.vendorId,
          bankAccountId: bankAccountId,
          paymentNo,
          paymentType: 'OUTBOUND',
          date: new Date(dto.date),
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference || null,
          ...(dto.purchaseId
            ? {
                allocations: {
                  create: [
                    {
                      purchaseId: dto.purchaseId,
                      amount: dto.amount,
                    },
                  ],
                },
              }
            : {})
        },
      });

      // 3. Update purchase paid amount when this payout is linked to a bill
      if (purchase && dto.purchaseId) {
        const newPaid = Number(purchase.amountPaid) + Number(dto.amount);
        const status = newPaid >= Number(purchase.grandTotal) ? 'PAID' : 'PARTIAL';

        await tx.purchase.update({
          where: { id: dto.purchaseId },
          data: {
            amountPaid: newPaid,
            status,
          },
        });
      }
      // 4. Update vendor payable balance
      await tx.businessPartner.update({
        where: { id: dto.vendorId },
        data: {
          payableBalance: {
            decrement: dto.amount,
          },
        },
      });

      // 5. Update Bank Account current balance
      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          currentBalance: {
            decrement: dto.amount,
          },
        },
      });

      // 6. Post automatic journal entry to General Ledger
      let apAccount = await tx.account.findFirst({
        where: { companyId, name: 'Accounts Payable' },
      });
      if (!apAccount) {
        apAccount = await tx.account.create({
          data: { companyId, name: 'Accounts Payable', category: 'LIABILITY', balance: 0 },
        });
      }

      let bankAccount = await tx.account.findFirst({
        where: { companyId, name: 'Operating Bank Account' },
      });
      if (!bankAccount) {
        bankAccount = await tx.account.create({
          data: { companyId, name: 'Operating Bank Account', category: 'ASSET', balance: 0 },
        });
      }

      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: paymentNo,
          description: `Automatic vendor payment posting ${paymentNo}`,
          lines: {
            create: [
              { accountId: apAccount.id, debit: dto.amount, credit: 0 },
              { accountId: bankAccount.id, debit: 0, credit: dto.amount },
            ],
          },
        },
      });

      await tx.account.update({
        where: { id: apAccount.id },
        data: { balance: { increment: dto.amount } }, // liability debit decreases balance
      });

      await tx.account.update({
        where: { id: bankAccount.id },
        data: { balance: { decrement: dto.amount } }, // asset credit decreases balance
      });

      return payment;
    }, { timeout: 20000 });
  }

  async remove(id: string) {
    const payment = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Revert purchase status
      for (const alloc of payment.allocations) {
        if (!alloc.purchaseId) continue;
        const pur = await tx.purchase.findFirst({ where: { id: alloc.purchaseId } });
        if (pur) {
          const revertedPaid = Number(pur.amountPaid) - Number(alloc.amount);
          const status = revertedPaid <= 0 ? 'SENT' : 'PARTIAL';
          await tx.purchase.update({
            where: { id: pur.id },
            data: { amountPaid: revertedPaid, status },
          });
        }
      }

      // Revert vendor payable balance
      await tx.businessPartner.update({
        where: { id: payment.businessPartnerId },
        data: {
          payableBalance: {
            increment: payment.amount,
          },
        },
      });

      // Revert bank account balance
      await tx.bankAccount.update({
        where: { id: payment.bankAccountId },
        data: {
          currentBalance: {
            increment: payment.amount,
          },
        },
      });

      // Soft delete payment
      return tx.transactionPayment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}

