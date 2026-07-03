import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.TransactionPaymentWhereInput = {
      companyId,
      deletedAt: null,
      paymentType: 'INBOUND', // Sales payment is INBOUND
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
        include: { businessPartner: true, bankAccount: true },
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
      where: { id, companyId, deletedAt: null },
      include: { businessPartner: true, bankAccount: true, allocations: { include: { invoice: true } } },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async create(dto: CreatePaymentDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const customer = await this.prisma.businessPartner.findFirst({
      where: { id: dto.customerId, companyId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    const bank = await this.prisma.bankAccount.findFirst({
      where: { id: dto.bankAccountId, companyId, deletedAt: null },
    });
    if (!bank) {
      throw new NotFoundException(`Bank Account with ID ${dto.bankAccountId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Generate payment number
      let sequence = await tx.documentSequence.findFirst({
        where: { companyId, documentType: 'PAYMENT' },
      });

      if (!sequence) {
        sequence = await tx.documentSequence.create({
          data: {
            companyId,
            documentType: 'PAYMENT',
            currentNumber: 0,
          },
        });
      }

      const nextNumber = sequence.currentNumber + 1;
      await tx.documentSequence.update({
        where: { id: sequence.id },
        data: { currentNumber: nextNumber },
      });

      const paymentNo = `PAY-${String(nextNumber).padStart(5, '0')}`;

      // 2. Create Payment record
      const payment = await tx.transactionPayment.create({
        data: {
          companyId,
          businessPartnerId: dto.customerId,
          bankAccountId: dto.bankAccountId,
          paymentNo,
          paymentType: 'INBOUND',
          date: new Date(dto.date),
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference || null,
          notes: dto.notes || null,
        },
      });

      // 3. Outstanding payment allocation loop
      let remainingPayment = Number(dto.amount);
      const invoices = await tx.invoice.findMany({
        where: {
          companyId,
          businessPartnerId: dto.customerId,
          deletedAt: null,
          NOT: { status: 'PAID' },
        },
        orderBy: { date: 'asc' },
      });

      for (const inv of invoices) {
        if (remainingPayment <= 0) break;

        const unpaidAmount = Number(inv.grandTotal) - Number(inv.amountPaid);
        const allocate = Math.min(remainingPayment, unpaidAmount);

        if (allocate > 0) {
          const newAmountPaid = Number(inv.amountPaid) + allocate;
          const status = newAmountPaid >= Number(inv.grandTotal) ? 'PAID' : 'PARTIAL';

          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              amountPaid: newAmountPaid,
              status,
            },
          });

          await tx.paymentAllocation.create({
            data: {
              transactionPaymentId: payment.id,
              invoiceId: inv.id,
              amount: allocate,
            },
          });

          remainingPayment -= allocate;
        }
      }

      // 4. Update customer outstanding balance
      await tx.businessPartner.update({
        where: { id: dto.customerId },
        data: {
          receivableBalance: {
            decrement: dto.amount,
          },
        },
      });

      // 5. Update Bank Account current balance
      await tx.bankAccount.update({
        where: { id: dto.bankAccountId },
        data: {
          currentBalance: {
            increment: dto.amount,
          },
        },
      });

      // 6. Write Customer Statement
      await tx.customerStatement.create({
        data: {
          companyId,
          businessPartnerId: dto.customerId,
          date: new Date(dto.date),
          type: 'PAYMENT',
          reference: paymentNo,
          debit: 0,
          credit: dto.amount,
          balance: Number(customer.receivableBalance) - dto.amount,
        },
      });

      // 7. Post automatic journal entry to General Ledger
      let arAccount = await tx.account.findFirst({
        where: { companyId, name: 'Accounts Receivable' },
      });
      if (!arAccount) {
        arAccount = await tx.account.create({
          data: { companyId, name: 'Accounts Receivable', category: 'ASSET', balance: 0 },
        });
      }

      const assetLedgerName = dto.method === 'CASH' ? 'Cash' : 'Bank Accounts';
      let bankAccount = await tx.account.findFirst({
        where: { companyId, name: assetLedgerName },
      });
      if (!bankAccount) {
        bankAccount = await tx.account.create({
          data: { companyId, name: assetLedgerName, category: 'ASSET', subCategory: 'CURRENT_ASSET', balance: 0 },
        });
      }

      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: paymentNo,
          description: `Automatic payment posting ${paymentNo}`,
          lines: {
            create: [
              { accountId: bankAccount.id, debit: dto.amount, credit: 0 },
              { accountId: arAccount.id, debit: 0, credit: dto.amount },
            ],
          },
        },
      });

      await tx.account.update({
        where: { id: bankAccount.id },
        data: { balance: { increment: dto.amount } },
      });

      await tx.account.update({
        where: { id: arAccount.id },
        data: { balance: { decrement: dto.amount } },
      });

      return payment;
    }, { timeout: 20000 });
  }

  async remove(id: string) {
    const payment = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Revert allocations
      for (const alloc of payment.allocations) {
        if (!alloc.invoiceId) continue;
        const inv = await tx.invoice.findFirst({ where: { id: alloc.invoiceId } });
        if (inv) {
          const revertedPaid = Number(inv.amountPaid) - Number(alloc.amount);
          const status = revertedPaid <= 0 ? 'SENT' : 'PARTIAL';
          await tx.invoice.update({
            where: { id: inv.id },
            data: { amountPaid: revertedPaid, status },
          });
        }
      }

      // Revert customer outstanding
      await tx.businessPartner.update({
        where: { id: payment.businessPartnerId },
        data: {
          receivableBalance: {
            increment: payment.amount,
          },
        },
      });

      // Revert bank account balance
      await tx.bankAccount.update({
        where: { id: payment.bankAccountId },
        data: {
          currentBalance: {
            decrement: payment.amount,
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
