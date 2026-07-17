import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateExpenseDto, UpdateExpenseApprovalDto, UpdateExpenseDto } from './dto/expense.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { SequenceService } from '../shared/sequence/sequence.service';

@Injectable()
export class ExpensesService {
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

  async create(dto: CreateExpenseDto, txClient?: Prisma.TransactionClient) {
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

    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Generate expense sequence number
      const expenseNo = await this.sequenceService.generateNextSequence(companyId, 'EXPENSE', tx);
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
          taxApplicable: dto.taxApplicable || false,
          taxGroupId: dto.taxGroupId || null,
          taxMode: dto.taxMode || null,
          taxType: dto.taxType || null,
          taxableAmount: dto.taxableAmount || dto.amount,
          cgstAmount: dto.cgstAmount || 0,
          sgstAmount: dto.sgstAmount || 0,
          igstAmount: dto.igstAmount || 0,
          cessAmount: dto.cessAmount || 0,
          paymentMethod: dto.paymentMethod || null,
          status: 'DRAFT',
          approvalStatus: 'PENDING',
          reference: dto.reference || null,
          description: dto.description || null,
          notes: dto.notes || null,
        },
      });

      return expense;
    };

    if (txClient) {
      return execute(txClient);
    }
    return this.prisma.$transaction(execute, { timeout: 20000 });
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
        taxApplicable: dto.taxApplicable !== undefined ? dto.taxApplicable : undefined,
        taxGroupId: dto.taxGroupId !== undefined ? dto.taxGroupId : undefined,
        taxMode: dto.taxMode !== undefined ? dto.taxMode : undefined,
        taxType: dto.taxType !== undefined ? dto.taxType : undefined,
        taxableAmount: dto.taxableAmount !== undefined ? dto.taxableAmount : undefined,
        cgstAmount: dto.cgstAmount !== undefined ? dto.cgstAmount : undefined,
        sgstAmount: dto.sgstAmount !== undefined ? dto.sgstAmount : undefined,
        igstAmount: dto.igstAmount !== undefined ? dto.igstAmount : undefined,
        cessAmount: dto.cessAmount !== undefined ? dto.cessAmount : undefined,
        totalAmount,
        paymentMethod: dto.paymentMethod !== undefined ? dto.paymentMethod : undefined,
        billNumber: dto.billNumber !== undefined ? dto.billNumber : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
      }
    });
  }

  async updateApproval(id: string, dto: UpdateExpenseApprovalDto, userId: string, txClient?: Prisma.TransactionClient) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const expense = await this.findOne(id);

    const execute = async (tx: Prisma.TransactionClient) => {
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

      // If approved, handle accounting and balances using AccountingEngineService
      if (dto.approvalStatus === 'APPROVED' && expense.approvalStatus !== 'APPROVED') {
        const totalAmount = Number(expense.totalAmount);
        
        let creditAccount = expense.bankAccountId
          ? await tx.bankAccount.findFirst({ where: { id: expense.bankAccountId, companyId }, include: { account: true } })
          : null;

        if (!creditAccount && expense.cashAccountId) {
          creditAccount = await tx.cashAccount.findFirst({ where: { id: expense.cashAccountId, companyId }, include: { account: true } }) as any;
        }

        const creditAccountId = (creditAccount as any)?.accountId;

        if (!creditAccountId) {
          throw new ConflictException('Payment source (Bank/Cash) is missing a mapped Ledger Account (accountId).');
        }

        // Ledger Entry
        const category = await tx.expenseCategory.findUnique({ where: { id: expense.categoryId || undefined } });
        const expenseAccountId = category?.accountId;

        if (!expenseAccountId) {
          throw new ConflictException(`Expense category "${category?.name || 'Unknown'}" is missing a mapped Ledger Account (accountId).`);
        }

        let inputCgstAccountId: string | undefined;
        let inputSgstAccountId: string | undefined;
        let inputIgstAccountId: string | undefined;

        if (expense.taxApplicable) {
          const settings = await tx.companySettings.findUnique({ where: { companyId } });
          const defaultAccounts = settings?.defaultAccounts as any || {};
          inputCgstAccountId = defaultAccounts.inputCgstAccountId;
          inputSgstAccountId = defaultAccounts.inputSgstAccountId;
          inputIgstAccountId = defaultAccounts.inputIgstAccountId;
        }

        const lines = [
          { accountId: expenseAccountId, debit: Number(expense.taxableAmount || expense.amount), credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: totalAmount },
        ];

        if (expense.taxApplicable) {
          if (expense.taxType === 'IGST' && Number(expense.igstAmount) > 0) {
            if (!inputIgstAccountId) throw new ConflictException('Input IGST ledger is not configured in settings.');
            lines.push({ accountId: inputIgstAccountId, debit: Number(expense.igstAmount), credit: 0 });
          } else {
            if (Number(expense.cgstAmount) > 0) {
              if (!inputCgstAccountId) throw new ConflictException('Input CGST ledger is not configured in settings.');
              lines.push({ accountId: inputCgstAccountId, debit: Number(expense.cgstAmount), credit: 0 });
            }
            if (Number(expense.sgstAmount) > 0) {
              if (!inputSgstAccountId) throw new ConflictException('Input SGST ledger is not configured in settings.');
              lines.push({ accountId: inputSgstAccountId, debit: Number(expense.sgstAmount), credit: 0 });
            }
          }
        }

        await this.accountingEngine.postTransaction({
          companyId,
          date: expense.date,
          reference: expense.expenseNo,
          description: `Automatic expense posting ${expense.expenseNo}`,
          lines
        }, tx);
      }

      return updatedExpense;
    };

    if (txClient) {
      return execute(txClient);
    }
    return this.prisma.$transaction(execute);
  }

  async remove(id: string) {
    const expense = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // If approved, reverse the journal using AccountingEngineService
      if (expense.approvalStatus === 'APPROVED') {
        const originalEntries = await tx.journalEntry.findMany({
          where: { reference: expense.expenseNo, companyId: expense.companyId },
        });

        for (const entry of originalEntries) {
          await this.accountingEngine.reverseTransaction(entry.id, expense.companyId, tx, `Reversal for deleted expense ${expense.expenseNo}`);
        }
      }

      return tx.expense.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  // --- Category Management Services ---

  async findCategories() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    return this.prisma.expenseCategory.findMany({
      where: { companyId, isActive: true },
      include: { account: true },
      orderBy: { name: 'asc' }
    });
  }

  async findCategory(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, companyId },
      include: { account: true }
    });
    if (!category) throw new NotFoundException(`Expense Category not found`);
    return category;
  }

  async createCategory(dto: { name: string; description?: string; accountId?: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    const existing = await this.prisma.expenseCategory.findFirst({
      where: { companyId, name: dto.name }
    });
    if (existing) throw new ConflictException(`Expense category "${dto.name}" already exists`);

    return this.prisma.expenseCategory.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description || null,
        accountId: dto.accountId || null,
        defaultTaxApplicable: (dto as any).defaultTaxApplicable || false,
        defaultTaxGroupId: (dto as any).defaultTaxGroupId || null,
        defaultTaxMode: (dto as any).defaultTaxMode || null,
        defaultInputTaxAccountId: (dto as any).defaultInputTaxAccountId || null,
        type: 'CUSTOM'
      }
    });
  }

  async updateCategory(id: string, dto: { name?: string; description?: string; accountId?: string; isActive?: boolean }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    
    const category = await this.findCategory(id);

    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.expenseCategory.findFirst({
        where: { companyId, name: dto.name, id: { not: id } }
      });
      if (existing) throw new ConflictException(`Expense category "${dto.name}" already exists`);
    }

    return this.prisma.expenseCategory.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        accountId: dto.accountId !== undefined ? dto.accountId : undefined,
        defaultTaxApplicable: (dto as any).defaultTaxApplicable !== undefined ? (dto as any).defaultTaxApplicable : undefined,
        defaultTaxGroupId: (dto as any).defaultTaxGroupId !== undefined ? (dto as any).defaultTaxGroupId : undefined,
        defaultTaxMode: (dto as any).defaultTaxMode !== undefined ? (dto as any).defaultTaxMode : undefined,
        defaultInputTaxAccountId: (dto as any).defaultInputTaxAccountId !== undefined ? (dto as any).defaultInputTaxAccountId : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined
      }
    });
  }

  async removeCategory(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    await this.findCategory(id);
    return this.prisma.expenseCategory.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
