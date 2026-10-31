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
    return this.prisma.bankAccount.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findAllTransactions() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.bankTransaction.findMany({
      where: { companyId },
      include: { bankAccount: true },
      orderBy: { date: 'desc' },
    });
  }

  async getDashboardStats() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');

    const accounts = await this.findAllAccounts();
    const totalBalance = accounts.reduce((acc, account) => acc + Number(account.currentBalance), 0);

    return {
      totalBalance,
      activeAccounts: accounts.length,
    };
  }

  async createAccount(data: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    if (data.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }
    return this.prisma.bankAccount.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async updateAccount(id: string, data: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    if (data.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }
    return this.prisma.bankAccount.update({
      where: { id, companyId },
      data,
    });
  }

  async deleteAccount(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.bankAccount.update({
      where: { id, companyId },
      data: { deletedAt: new Date() },
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
