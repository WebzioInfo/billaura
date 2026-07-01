import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateExpenseDto } from './dto/expense.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // Categories removed and replaced by static string in DTO

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.ExpenseWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { expenseNo: { contains: query.search } },
              { description: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        include: { bankAccount: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { bankAccount: true },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async create(dto: CreateExpenseDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // category is now a string

    // Check bank account if provided
    let bank = null;
    if (dto.bankAccountId) {
      bank = await this.prisma.bankAccount.findFirst({
        where: { id: dto.bankAccountId, companyId, deletedAt: null },
      });
      if (!bank) {
        throw new NotFoundException(`Bank Account with ID ${dto.bankAccountId} not found`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Generate expense sequence number
      let sequence = await tx.documentSequence.findFirst({
        where: { companyId, documentType: 'EXPENSE' },
      });

      if (!sequence) {
        sequence = await tx.documentSequence.create({
          data: {
            companyId,
            documentType: 'EXPENSE',
            currentNumber: 0,
          },
        });
      }

      const nextNumber = sequence.currentNumber + 1;
      await tx.documentSequence.update({
        where: { id: sequence.id },
        data: { currentNumber: nextNumber },
      });

      const expenseNo = `EXP-${String(nextNumber).padStart(5, '0')}`;
      const amount = Number(dto.amount);
      const taxAmount = Number(dto.taxAmount || 0);
      const totalAmount = amount + taxAmount;

      // 2. Create Expense record
      const expense = await tx.expense.create({
        data: {
          companyId,
          category: dto.category,
          bankAccountId: dto.bankAccountId || null,
          expenseNo,
          billNumber: dto.billNumber || null,
          date: new Date(dto.date),
          amount,
          taxAmount,
          totalAmount,
          paymentMethod: dto.paymentMethod || null,
          status: 'APPROVED', // Auto approved for simplicity
          reference: dto.reference || null,
          description: dto.description || null,
          notes: dto.notes || null,
        },
      });

      // 3. Subtract from physical bank account if paid immediately
      if (dto.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: dto.bankAccountId },
          data: {
            currentBalance: {
              decrement: totalAmount,
            },
          },
        });
      }

      // 4. Double entry general ledger accounting integration
      // Debit: Expense Account (category name)
      // Credit: Cash/Bank Account (Operating Bank Account or Cash in Hand)
      let expenseAccount = await tx.account.findFirst({
        where: { companyId, name: dto.category },
      });
      if (!expenseAccount) {
        expenseAccount = await tx.account.create({
          data: { companyId, name: dto.category, category: 'EXPENSE', balance: 0 },
        });
      }

      let creditAccountName = 'Operating Bank Account';
      if (bank?.name) {
        creditAccountName = bank.name;
      }
      
      let creditAccount = await tx.account.findFirst({
        where: { companyId, name: creditAccountName },
      });
      if (!creditAccount) {
        creditAccount = await tx.account.create({
          data: { companyId, name: creditAccountName, category: 'ASSET', balance: 0 },
        });
      }

      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: expenseNo,
          description: dto.description || `Automatic expense posting ${expenseNo}`,
          lines: {
            create: [
              { accountId: expenseAccount.id, debit: totalAmount, credit: 0 },
              { accountId: creditAccount.id, debit: 0, credit: totalAmount },
            ],
          },
        },
      });

      await tx.account.update({
        where: { id: expenseAccount.id },
        data: { balance: { increment: totalAmount } },
      });

      await tx.account.update({
        where: { id: creditAccount.id },
        data: { balance: { decrement: totalAmount } },
      });

      return expense;
    }, { timeout: 20000 });
  }

  async remove(id: string) {
    const expense = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Revert bank account balance if it was paid
      if (expense.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: expense.bankAccountId },
          data: {
            currentBalance: {
              increment: Number(expense.totalAmount),
            },
          },
        });
      }

      // Revert accounting entries can be done by delete or counter-vouchers. For simplicity we soft-delete
      return tx.expense.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
