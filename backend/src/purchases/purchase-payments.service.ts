import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePurchasePaymentDto } from './dto/purchase-payment.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { SequenceService } from '../shared/sequence/sequence.service';

@Injectable()
export class PurchasePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingEngine: AccountingEngineService,
    private readonly sequenceService: SequenceService
  ) {}

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

  async create(dto: CreatePurchasePaymentDto, txClient?: Prisma.TransactionClient) {
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

    let ledgerId = dto.bankAccountId?.trim() || undefined;
    const isCashPayment = dto.method === 'CASH';

    if (!isCashPayment && !ledgerId) {
      throw new BadRequestException('Select a bank account for this payout method.');
    }

    const ledger = ledgerId
      ? await this.prisma.account.findFirst({ where: { id: ledgerId, companyId } })
      : await this.prisma.account.findFirst({
          where: {
            companyId,
            isGroup: false,
            category: 'ASSET',
            OR: [
              { name: { contains: 'cash', mode: 'insensitive' } },
              { parent: { name: { contains: 'cash', mode: 'insensitive' } } },
            ],
          },
          orderBy: { name: 'asc' },
        });

    if (!ledger) {
      throw new ConflictException('No payment ledger account configured for this payout method.');
    }

    let bank = await this.prisma.bankAccount.findFirst({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { name: ledger.name },
          { bankName: ledger.name },
          ...(ledger.code ? [{ accountNumber: ledger.code }] : []),
        ],
      },
    });

    if (!bank) {
      bank = await this.prisma.bankAccount.create({
        data: {
          companyId,
          name: ledger.name,
          accountName: ledger.name,
          bankName: ledger.name,
          accountNumber: ledger.code || null,
          accountType: isCashPayment ? 'CURRENT' : 'CURRENT',
          openingBalance: 0,
          currentBalance: 0,
          status: 'ACTIVE',
          isDefault: isCashPayment,
        },
      });
    }

    const purchase = dto.purchaseId
      ? await this.prisma.purchase.findFirst({
          where: { id: dto.purchaseId, companyId, businessPartnerId: dto.vendorId },
        })
      : null;
    if (dto.purchaseId && !purchase) {
      throw new NotFoundException(`Purchase with ID ${dto.purchaseId} not found for the selected vendor`);
    }
    
    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Generate payment number
      const paymentNo = await this.sequenceService.generateNextSequence(companyId, 'PAYMENT', tx);

      // 2. Create TransactionPayment record
      const payment = await tx.transactionPayment.create({
        data: {
          companyId,
          businessPartnerId: dto.vendorId,
          bankAccountId: bank.id,
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
        where: { id: bank.id },
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

      await this.accountingEngine.postTransaction({
        companyId,
        date: new Date(dto.date),
        reference: paymentNo,
        description: `Automatic vendor payment posting ${paymentNo}`,
        lines: [
          { accountId: apAccount.id, debit: dto.amount, credit: 0 },
          { accountId: ledger.id, debit: 0, credit: dto.amount },
        ],
      }, tx);

      return payment;
    };

    if (txClient) {
      return execute(txClient);
    }
    return this.prisma.$transaction(execute, { timeout: 20000 });
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

      // Reverse Journal Entries
      const originalEntries = await tx.journalEntry.findMany({
        where: { reference: payment.paymentNo, companyId: payment.companyId },
      });

      for (const entry of originalEntries) {
        await this.accountingEngine.reverseTransaction(entry.id, payment.companyId, tx, `Reversal for deleted payment ${payment.paymentNo}`);
      }

      // Soft delete payment
      return tx.transactionPayment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}

