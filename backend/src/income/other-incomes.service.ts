import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OtherIncomesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.otherIncome.findMany({
      where: {},
      include: {
        category: {
          include: { account: true }
        },
        businessPartner: true,
        bankAccount: true,
        branch: true,
        employee: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const income = await this.prisma.otherIncome.findFirst({
      where: { id },
      include: {
        category: {
          include: { account: true }
        },
        businessPartner: true,
        bankAccount: true,
        branch: true,
        employee: true,
      },
    });
    if (!income) {
      throw new NotFoundException('Other Income not found');
    }
    return income;
  }

  async create(companyId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      // Create the Other Income record
      const income = await tx.otherIncome.create({
        data: {
          ...data,
          companyId,
        },
        include: {
          category: {
            include: { account: true }
          },
          bankAccount: true,
        }
      });

      // If it's a paid transaction, generate a Journal Entry
      if (income.paymentStatus === 'PAID') {
        await this.generateJournalEntry(tx, income);
      }

      return income;
    });
  }

  async update(companyId: string, id: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.otherIncome.findFirst({
        where: { id }
      });
      if (!existing) throw new NotFoundException('Other Income not found');

      const income = await tx.otherIncome.update({
        where: { id: existing.id },
        data,
        include: {
          category: {
            include: { account: true }
          },
          bankAccount: true,
        }
      });

      // Simple implementation: delete old journal entry and create a new one if paid
      // In a real strict ERP system, you'd post a reversing entry instead of deleting.
      // But for simplicity in updating, we will delete the linked journal entry.
      // Wait, we don't store journalEntryId on OtherIncome right now. Let's find it by reference.
      const je = await tx.journalEntry.findFirst({
        where: { companyId, reference: income.incomeNo }
      });
      if (je) {
        await tx.journalEntry.delete({ where: { id: je.id } });
      }

      if (income.paymentStatus === 'PAID') {
        await this.generateJournalEntry(tx, income);
      }

      return income;
    });
  }

  async remove(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.otherIncome.findFirst({
        where: { id }
      });
      if (!existing) throw new NotFoundException('Other Income not found');

      // Delete linked journal entry
      const je = await tx.journalEntry.findFirst({
        where: { companyId, reference: existing.incomeNo }
      });
      if (je) {
        await tx.journalEntry.delete({ where: { id: je.id } });
      }

      return tx.otherIncome.delete({
        where: { id: existing.id },
      });
    });
  }

  private async generateJournalEntry(tx: any, income: any) {
    if (!income.category?.account) {
      throw new BadRequestException('Income Category does not have a mapped GL account');
    }

    // 1. Credit the Revenue Account (subTotal)
    const revenueCredit = Number(income.subTotal) - Number(income.discount || 0) + Number(income.freight || 0);
    
    const lines = [
      {
        accountId: income.category.accountId,
        credit: revenueCredit,
        debit: 0,
      }
    ];

    // 2. Credit the Output GST accounts (taxTotal)
    if (Number(income.cgstAmount) > 0) {
      const cgstAccount = await this.getSystemAccount(tx, income.companyId, 'Output CGST');
      lines.push({ accountId: cgstAccount.id, credit: Number(income.cgstAmount), debit: 0 });
    }
    if (Number(income.sgstAmount) > 0) {
      const sgstAccount = await this.getSystemAccount(tx, income.companyId, 'Output SGST');
      lines.push({ accountId: sgstAccount.id, credit: Number(income.sgstAmount), debit: 0 });
    }
    if (Number(income.igstAmount) > 0) {
      const igstAccount = await this.getSystemAccount(tx, income.companyId, 'Output IGST');
      lines.push({ accountId: igstAccount.id, credit: Number(income.igstAmount), debit: 0 });
    }

    // 3. Debit the Bank/Cash account (grandTotal)
    let assetAccountId: string;
    if (income.paymentMethod === 'CASH') {
      const cashAccount = await this.getSystemAccount(tx, income.companyId, 'Cash');
      assetAccountId = cashAccount.id;
    } else {
      if (!income.bankAccountId) throw new BadRequestException('Bank account is required for bank payments');
      // We need to find the GL account mapped to this bank account.
      // Usually, Billaura BankAccount has a name which matches an Account. Let's find it.
      const bankAccount = await tx.account.findFirst({
        where: { companyId: income.companyId, name: income.bankAccount.name }
      });
      if (!bankAccount) throw new BadRequestException(`GL Account for bank ${income.bankAccount.name} not found`);
      assetAccountId = bankAccount.id;
    }

    lines.push({
      accountId: assetAccountId,
      debit: Number(income.grandTotal),
      credit: 0,
    });

    // 4. Create the Journal Entry
    await tx.journalEntry.create({
      data: {
        companyId: income.companyId,
        date: income.date,
        reference: income.incomeNo,
        description: `Service Income Receipt: ${income.incomeNo}`,
        lines: {
          create: lines,
        }
      }
    });
  }

  private async getSystemAccount(tx: any, companyId: string, name: string) {
    const acc = await tx.account.findFirst({ where: { companyId, name } });
    if (!acc) throw new BadRequestException(`System account ${name} not found. Please run the setup seed.`);
    return acc;
  }
}
