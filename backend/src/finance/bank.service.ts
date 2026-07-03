import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class BankService {
  constructor(private prisma: PrismaService) {}

  async findAllAccounts() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.bankAccount.findMany({
      where: { companyId },
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
      activeAccounts: accounts.length
    };
  }
}
