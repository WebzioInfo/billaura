import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateExpenseDto, UpdateExpenseApprovalDto, UpdateExpenseDto } from './dto/expense.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.ExpenseWhereInput = {
      companyId,
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
        include: { bankAccount: true, cashAccount: true, category: true, employee: true, vendor: true },
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
      where: { id },
      include: { bankAccount: true, cashAccount: true, category: true, employee: true, vendor: true, attachments: true, history: true, comments: true },
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

    // Verify Category
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: dto.categoryId, companyId }
    });
    if (!category) {
      throw new NotFoundException(`Expense Category not found`);
    }

    // Resolve paidFrom fields
    let bankAccountId = dto.bankAccountId || null;
    let cashAccountId = dto.cashAccountId || null;
    let employeeId = dto.employeeId || null;
    let vendorId = dto.vendorId || null;

    if (dto.paidFromType === 'BANK' && dto.paidFromId) bankAccountId = dto.paidFromId;
    if (dto.paidFromType === 'CASH' && dto.paidFromId) cashAccountId = dto.paidFromId;
    if (dto.paidFromType === 'EMPLOYEE' && dto.paidFromId) employeeId = dto.paidFromId;
    if (dto.paidFromType === 'VENDOR' && dto.paidFromId) vendorId = dto.paidFromId;

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

      // 2. Create Expense record (starts as PENDING)
      const expense = await tx.expense.create({
        data: {
          companyId,
          categoryId: category.id,
          subCategory: dto.subCategory,
          bankAccountId,
          cashAccountId,
          employeeId,
          vendorId,
          paidFromType: dto.paidFromType || null,
          paidFromId: dto.paidFromId || null,
          expenseNo,
          billNumber: dto.billNumber || null,
          date: new Date(dto.date),
          amount,
          taxAmount,
          totalAmount,
          paymentMethod: dto.paymentMethod || null,
          status: 'DRAFT',
          approvalStatus: 'PENDING',
          reference: dto.reference || null,
          description: dto.description || null,
          notes: dto.notes || null,
        },
      });

      return expense;
    }, { timeout: 20000 });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const existing = await this.prisma.expense.findFirst({
      where: { id }
    });
    if (!existing) throw new NotFoundException('Expense not found');
    if (existing.approvalStatus === 'APPROVED') throw new ConflictException('Cannot edit an approved expense');

    const totalAmount = (dto.amount !== undefined ? dto.amount : Number(existing.amount)) + 
                        (dto.taxAmount !== undefined ? dto.taxAmount : Number(existing.taxAmount));

    return this.prisma.expense.update({
      where: { id },
      data: {
        categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
        bankAccountId: dto.bankAccountId !== undefined ? dto.bankAccountId : undefined,
        date: dto.date !== undefined ? new Date(dto.date) : undefined,
        amount: dto.amount !== undefined ? dto.amount : undefined,
        taxAmount: dto.taxAmount !== undefined ? dto.taxAmount : undefined,
        totalAmount,
        paymentMethod: dto.paymentMethod !== undefined ? dto.paymentMethod : undefined,
        billNumber: dto.billNumber !== undefined ? dto.billNumber : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
      }
    });
  }

  async updateApproval(id: string, dto: UpdateExpenseApprovalDto, userId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const expense = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Create comment/history if provided
      if (dto.comment) {
        await tx.expenseComment.create({
          data: { expenseId: id, userId, comment: dto.comment }
        });
      }

      await tx.expenseHistory.create({
        data: { expenseId: id, userId, action: `Status changed to ${dto.approvalStatus}` }
      });

      // Update Expense
      const updatedExpense = await tx.expense.update({
        where: { id },
        data: { approvalStatus: dto.approvalStatus, approvedById: userId }
      });

      // If approved, handle accounting and balances
      if (dto.approvalStatus === 'APPROVED' && expense.approvalStatus !== 'APPROVED') {
        const totalAmount = Number(expense.totalAmount);
        let creditAccountName = 'Operating Bank Account';

        if (expense.bankAccountId) {
          await tx.bankAccount.update({
            where: { id: expense.bankAccountId },
            data: { currentBalance: { decrement: totalAmount } },
          });
          const bank = await tx.bankAccount.findUnique({ where: { id: expense.bankAccountId } });
          if (bank) creditAccountName = bank.name;
        } else if (expense.cashAccountId) {
          await tx.cashAccount.update({
            where: { id: expense.cashAccountId },
            data: { currentBalance: { decrement: totalAmount } },
          });
          const cash = await tx.cashAccount.findUnique({ where: { id: expense.cashAccountId } });
          if (cash) creditAccountName = cash.name;
        }

        // Ledger Entry
        const category = await tx.expenseCategory.findUnique({ where: { id: expense.categoryId || undefined } });
        const expenseCategoryName = category?.name || 'Uncategorized Expense';

        let expenseAccount = await tx.account.findFirst({
          where: { companyId, name: expenseCategoryName },
        });
        if (!expenseAccount) {
          expenseAccount = await tx.account.create({
            data: { companyId, name: expenseCategoryName, category: 'EXPENSE', balance: 0 },
          });
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
            date: expense.date,
            reference: expense.expenseNo,
            description: `Automatic expense posting ${expense.expenseNo}`,
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
      }

      return updatedExpense;
    });
  }

  async remove(id: string) {
    const expense = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // If approved, reverse the journal and bank balances
      if (expense.approvalStatus === 'APPROVED') {
        const totalAmount = Number(expense.totalAmount);
        
        // Find original journal entries and create reversals
        const originalEntries = await tx.journalEntry.findMany({
          where: { reference: expense.expenseNo },
          include: { lines: true },
        });

        for (const entry of originalEntries) {
          const reversalLines = entry.lines.map(line => ({
            accountId: line.accountId,
            debit: Number(line.credit || 0),
            credit: Number(line.debit || 0),
          }));

          await tx.journalEntry.create({
            data: {
              companyId: expense.companyId,
              date: new Date(),
              reference: `REV-${expense.expenseNo}`,
              description: `Reversal for deleted expense ${expense.expenseNo}`,
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

        // Revert Bank/Cash balance
        if (expense.bankAccountId) {
          await tx.bankAccount.update({
            where: { id: expense.bankAccountId },
            data: { currentBalance: { increment: totalAmount } },
          });
        } else if (expense.cashAccountId) {
          await tx.cashAccount.update({
            where: { id: expense.cashAccountId },
            data: { currentBalance: { increment: totalAmount } },
          });
        }
      }

      return tx.expense.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
