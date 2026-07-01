import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { CreateCapitalTransactionDto } from './capital.controller';

@Injectable()
export class CapitalService {
  constructor(private readonly prisma: PrismaService) {}

  async recordCapitalTransaction(dto: CreateCapitalTransactionDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context required');

    return this.prisma.$transaction(async (tx) => {
      // 1. Get Bank Account
      const bank = await tx.bankAccount.findFirst({
        where: { id: dto.bankAccountId, companyId },
      });
      if (!bank) throw new NotFoundException('Bank account not found');

      // 2. Get target equity account and bank ledger account
      const equityAccountName = dto.type === 'INTRODUCED' ? 'Owners Capital' : 'Drawings';
      const equityAccount = await tx.account.findFirst({
        where: { companyId, name: equityAccountName }
      });
      if (!equityAccount) throw new NotFoundException(`Equity account '${equityAccountName}' not found`);

      const bankLedger = await tx.account.findFirst({
        where: { companyId, name: 'Bank Accounts' }
      });
      if (!bankLedger) throw new NotFoundException(`Ledger account 'Bank Accounts' not found`);

      // 3. Create Journal Entry
      // Capital Introduced: Dr Bank, Cr Capital
      // Drawings: Dr Drawings, Cr Bank
      let debitAccountId = '';
      let creditAccountId = '';
      if (dto.type === 'INTRODUCED') {
        debitAccountId = bankLedger.id;
        creditAccountId = equityAccount.id;
      } else {
        debitAccountId = equityAccount.id;
        creditAccountId = bankLedger.id;
      }

      const entry = await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(dto.date),
          reference: dto.reference || `CAP-${Date.now()}`,
          description: dto.notes || `Owner Capital ${dto.type}`,
          lines: {
            create: [
              { accountId: debitAccountId, debit: dto.amount, credit: 0 },
              { accountId: creditAccountId, debit: 0, credit: dto.amount },
            ]
          }
        },
        include: { lines: true }
      });

      // 4. Update Ledger Balances
      await tx.account.update({
        where: { id: debitAccountId },
        data: { balance: { increment: dto.amount } }
      });
      await tx.account.update({
        where: { id: creditAccountId },
        data: { balance: { decrement: dto.amount } }
      });

      // 5. Update Bank Account Balance
      const bankChange = dto.type === 'INTRODUCED' ? dto.amount : -dto.amount;
      await tx.bankAccount.update({
        where: { id: bank.id },
        data: { currentBalance: { increment: bankChange } }
      });

      return entry;
    });
  }
}
