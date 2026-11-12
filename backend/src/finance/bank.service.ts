import { Injectable, NotFoundException, BadRequestException, ConflictException, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { AccountingEngineService } from '../accounting/accounting-engine.service';

export interface CreateBankTransferDto {
  fromAccountId: string;
  toAccountId: string;
  fromType: 'BANK' | 'CASH';
  toType: 'BANK' | 'CASH';
  amount: number;
  date?: string | Date;
  reference?: string;
  description?: string;
}

@Injectable()
export class BankService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly accountingEngine?: AccountingEngineService,
  ) {}

  async findAllAccounts() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');

    const [bankAccounts, cashAccounts] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
      this.prisma.cashAccount.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
    ]);

    const mappedCashAccounts = cashAccounts.map((c) => ({
      ...c,
      accountType: 'CASH' as const,
      bankName: c.name || 'Cash',
      accountNumber: '',
      ifsc: '',
    }));

    return [...bankAccounts, ...mappedCashAccounts];
  }

  async findAllTransactions() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');

    const [bankTxns, cashTxns] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where: { companyId },
        include: { bankAccount: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.cashTransaction.findMany({
        where: { companyId, deletedAt: null },
        include: { cashAccount: true },
        orderBy: { date: 'desc' },
      }),
    ]);

    const mappedCashTxns = cashTxns.map((c) => ({
      id: c.id,
      date: c.date,
      type: c.type,
      amount: c.amount,
      credit: c.type === 'DEPOSIT' || c.type === 'INFLOW' ? c.amount : 0,
      debit: c.type === 'WITHDRAWAL' || c.type === 'OUTFLOW' ? c.amount : 0,
      balanceAfter: c.balanceAfter,
      reference: c.reference,
      description: c.description || 'Cash Transaction',
      bankAccountId: c.cashAccountId,
      bankAccount: {
        id: c.cashAccountId,
        name: c.cashAccount.name,
        accountType: 'CASH',
        bankName: 'Cash',
      },
      status: 'RECONCILED',
      createdAt: c.createdAt,
    }));

    return [...bankTxns, ...mappedCashTxns].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getDashboardStats() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');

    const accounts = await this.findAllAccounts();
    const totalBalance = accounts.reduce((acc, account) => acc + Number(account.currentBalance || 0), 0);

    return {
      totalBalance,
      activeAccounts: accounts.length,
    };
  }

  async createAccount(data: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');

    if (data.accountType === 'CASH') {
      if (data.isDefault) {
        await this.prisma.cashAccount.updateMany({
          where: { companyId },
          data: { isDefault: false },
        });
      }

      // Auto-resolve or find Chart of Accounts ledger for this Cash account
      let accountId = data.accountId;
      if (!accountId) {
        const glAccount = await this.prisma.account.findFirst({
          where: {
            companyId,
            deletedAt: null,
            OR: [
              { name: { equals: data.name, mode: 'insensitive' } },
              { name: { equals: 'Cash', mode: 'insensitive' } },
              { name: { contains: 'Petty Cash', mode: 'insensitive' } },
            ],
          },
        });
        if (glAccount) {
          accountId = glAccount.id;
        }
      }

      return this.prisma.cashAccount.create({
        data: {
          companyId,
          name: data.name,
          openingBalance: data.openingBalance || 0,
          currentBalance: data.currentBalance ?? data.openingBalance ?? 0,
          isDefault: Boolean(data.isDefault),
          accountId: accountId || null,
          branchId: data.branchId || null,
        },
      });
    }

    if (data.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }

    const validBankTypes = ['CURRENT', 'SAVINGS', 'CASH_CREDIT', 'OD'];
    const bankType = validBankTypes.includes(data.accountType) ? data.accountType : 'CURRENT';

    return this.prisma.bankAccount.create({
      data: {
        companyId,
        name: data.name,
        accountName: data.accountName || data.name,
        accountNumber: data.accountNumber || null,
        ifsc: data.ifsc || null,
        bankName: data.bankName || null,
        upiId: data.upiId || null,
        accountType: bankType,
        openingBalance: data.openingBalance || 0,
        currentBalance: data.currentBalance ?? data.openingBalance ?? 0,
        isDefault: Boolean(data.isDefault),
        accountId: data.accountId || null,
        branchId: data.branchId || null,
      },
    });
  }

  async updateAccount(id: string, data: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');

    const cash = await this.prisma.cashAccount.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (cash) {
      if (data.isDefault) {
        await this.prisma.cashAccount.updateMany({
          where: { companyId },
          data: { isDefault: false },
        });
      }
      return this.prisma.cashAccount.update({
        where: { id },
        data: {
          name: data.name ?? cash.name,
          openingBalance: data.openingBalance !== undefined ? data.openingBalance : cash.openingBalance,
          currentBalance: data.currentBalance !== undefined ? data.currentBalance : cash.currentBalance,
          isDefault: data.isDefault !== undefined ? data.isDefault : cash.isDefault,
          branchId: data.branchId !== undefined ? data.branchId : cash.branchId,
        },
      });
    }

    if (data.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }

    const { accountType, ...rest } = data;
    const validBankTypes = ['CURRENT', 'SAVINGS', 'CASH_CREDIT', 'OD'];
    const updateData: any = { ...rest };
    if (accountType && validBankTypes.includes(accountType)) {
      updateData.accountType = accountType;
    }

    return this.prisma.bankAccount.update({
      where: { id, companyId },
      data: updateData,
    });
  }

  async deleteAccount(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');

    return this.prisma.$transaction(async (tx) => {
      // 1. Locate account (Cash or Bank)
      const cash = await tx.cashAccount.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      const bank = !cash
        ? await tx.bankAccount.findFirst({
            where: { id, companyId, deletedAt: null },
          })
        : null;

      const target = cash || bank;
      if (!target) {
        throw new NotFoundException('Account not found or already deleted');
      }

      // Rule 4: Cannot delete the last active account of the company
      const [activeBanks, activeCash] = await Promise.all([
        tx.bankAccount.count({ where: { companyId, deletedAt: null } }),
        tx.cashAccount.count({ where: { companyId, deletedAt: null } }),
      ]);
      if (activeBanks + activeCash <= 1) {
        throw new BadRequestException(
          'Cannot delete the last active account. A company must maintain at least one active bank or cash account for business operations.'
        );
      }

      // Rule 1: Non-zero balance check
      const currentBalance = Number(target.currentBalance || 0);
      if (Math.abs(currentBalance) > 0.001) {
        const formatted = new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(currentBalance);
        throw new BadRequestException(
          `Cannot delete '${target.name}' because it has an active balance of ${formatted}. Please transfer or withdraw the balance to ₹0.00 before deleting.`
        );
      }

      // Rule 3: Soft delete by setting deletedAt and unset isDefault
      if (cash) {
        await tx.cashAccount.update({
          where: { id },
          data: { deletedAt: new Date(), isDefault: false },
        });
      } else {
        await tx.bankAccount.update({
          where: { id, companyId },
          data: { deletedAt: new Date(), isDefault: false },
        });
      }

      // Rule 2: If this was the default account, promote another remaining active account
      if (target.isDefault) {
        const nextBank = await tx.bankAccount.findFirst({
          where: { companyId, id: { not: id }, deletedAt: null },
          orderBy: { createdAt: 'asc' },
        });
        if (nextBank) {
          await tx.bankAccount.update({
            where: { id: nextBank.id },
            data: { isDefault: true },
          });
        } else {
          const nextCash = await tx.cashAccount.findFirst({
            where: { companyId, id: { not: id }, deletedAt: null },
            orderBy: { createdAt: 'asc' },
          });
          if (nextCash) {
            await tx.cashAccount.update({
              where: { id: nextCash.id },
              data: { isDefault: true },
            });
          }
        }
      }

      return {
        success: true,
        message: `Account '${target.name}' successfully deleted.`,
      };
    });
  }

  /**
   * Complete double-entry Bank / Cash fund transfer (Contra transaction).
   * Moves funds atomically, updates balances, and logs general ledger journal entries.
   */
  async createTransfer(dto: CreateBankTransferDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const amount = Number(dto.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than zero');
    }

    if (dto.fromAccountId === dto.toAccountId && dto.fromType === dto.toType) {
      throw new BadRequestException('Source and destination accounts must be different');
    }

    const transferDate = dto.date ? new Date(dto.date) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve source account
      let fromAccountName = '';
      let fromGlAccountId = '';
      if (dto.fromType === 'BANK') {
        const fromBank = await tx.bankAccount.findFirst({
          where: { id: dto.fromAccountId, companyId, deletedAt: null },
        });
        if (!fromBank) throw new NotFoundException(`Source Bank account not found`);
        fromAccountName = fromBank.name;
        fromGlAccountId = fromBank.accountId || '';
      } else {
        const fromCash = await tx.cashAccount.findFirst({
          where: { id: dto.fromAccountId, companyId, deletedAt: null },
        });
        if (!fromCash) throw new NotFoundException(`Source Cash account not found`);
        fromAccountName = fromCash.name;
        fromGlAccountId = fromCash.accountId || '';
      }

      // 2. Resolve destination account
      let toAccountName = '';
      let toGlAccountId = '';
      if (dto.toType === 'BANK') {
        const toBank = await tx.bankAccount.findFirst({
          where: { id: dto.toAccountId, companyId, deletedAt: null },
        });
        if (!toBank) throw new NotFoundException(`Destination Bank account not found`);
        toAccountName = toBank.name;
        toGlAccountId = toBank.accountId || '';
      } else {
        const toCash = await tx.cashAccount.findFirst({
          where: { id: dto.toAccountId, companyId, deletedAt: null },
        });
        if (!toCash) throw new NotFoundException(`Destination Cash account not found`);
        toAccountName = toCash.name;
        toGlAccountId = toCash.accountId || '';
      }

      // Ensure GL accounts are mapped or auto-resolve
      if (!fromGlAccountId && this.accountingEngine) {
        const resolved = await this.accountingEngine.resolveAccount(
          companyId,
          dto.fromType === 'BANK' ? 'BANK_ACCOUNT' : 'CASH_ACCOUNT',
          tx
        );
        fromGlAccountId = resolved.id;
      }

      if (!toGlAccountId && this.accountingEngine) {
        const resolved = await this.accountingEngine.resolveAccount(
          companyId,
          dto.toType === 'BANK' ? 'BANK_ACCOUNT' : 'CASH_ACCOUNT',
          tx
        );
        toGlAccountId = resolved.id;
      }

      if (!fromGlAccountId || !toGlAccountId) {
        throw new BadRequestException('Could not resolve general ledger accounts for this transfer');
      }

      const transferNumber = `TRF-${Date.now()}`;
      const reference = dto.reference?.trim() || `CONTRA-${transferNumber}`;
      const description = dto.description?.trim() || `Transfer from ${fromAccountName} to ${toAccountName}`;

      // 3. Post double-entry contra journal
      let journalEntry = null;
      if (this.accountingEngine) {
        journalEntry = await this.accountingEngine.postTransaction(
          {
            companyId,
            date: transferDate,
            reference,
            description,
            lines: [
              { accountId: toGlAccountId, debit: amount, credit: 0 },
              { accountId: fromGlAccountId, debit: 0, credit: amount },
            ],
          },
          tx
        );
      }

      // 4. Record InternalTransfer model
      const internalTransfer = await tx.internalTransfer.create({
        data: {
          companyId,
          transferNumber,
          date: transferDate,
          amount,
          fromBankId: dto.fromType === 'BANK' ? dto.fromAccountId : null,
          fromCashId: dto.fromType === 'CASH' ? dto.fromAccountId : null,
          toBankId: dto.toType === 'BANK' ? dto.toAccountId : null,
          toCashId: dto.toType === 'CASH' ? dto.toAccountId : null,
          reference,
          description,
        },
      });

      return {
        success: true,
        transfer: internalTransfer,
        journalEntry,
      };
    });
  }

  async findAllTransfers() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    return this.prisma.internalTransfer.findMany({
      where: { companyId },
      include: {
        fromBank: true,
        toBank: true,
        fromCash: true,
        toCash: true,
      },
      orderBy: { date: 'desc' },
    });
  }
}
