import { Injectable } from '@nestjs/common';
import { Prisma, AccountCategory, AccountNature, AccountBalanceType } from '@prisma/client';

@Injectable()
export class ChartOfAccountsSeederService {
  async seedCOA(tx: Prisma.TransactionClient, companyId: string) {
    const groups = [
      { name: 'Current Assets', category: AccountCategory.ASSET, nature: AccountNature.DEBIT, balanceType: AccountBalanceType.DEBIT },
      { name: 'Fixed Assets', category: AccountCategory.ASSET, nature: AccountNature.DEBIT, balanceType: AccountBalanceType.DEBIT },
      { name: 'Current Liabilities', category: AccountCategory.LIABILITY, nature: AccountNature.CREDIT, balanceType: AccountBalanceType.CREDIT },
      { name: 'Equity', category: AccountCategory.EQUITY, nature: AccountNature.CREDIT, balanceType: AccountBalanceType.CREDIT },
      { name: 'Direct Income', category: AccountCategory.REVENUE, nature: AccountNature.CREDIT, balanceType: AccountBalanceType.CREDIT },
      { name: 'Indirect Income', category: AccountCategory.REVENUE, nature: AccountNature.CREDIT, balanceType: AccountBalanceType.CREDIT },
      { name: 'Direct Expense', category: AccountCategory.EXPENSE, nature: AccountNature.DEBIT, balanceType: AccountBalanceType.DEBIT },
      { name: 'Indirect Expense', category: AccountCategory.EXPENSE, nature: AccountNature.DEBIT, balanceType: AccountBalanceType.DEBIT },
    ];

    const groupMap = new Map<string, string>();

    for (const g of groups) {
      const account = await tx.account.upsert({
        where: { companyId_name: { companyId, name: g.name } },
        update: {},
        create: {
          companyId,
          name: g.name,
          isGroup: true,
          category: g.category,
          nature: g.nature,
          balanceType: g.balanceType === AccountBalanceType.DEBIT ? AccountBalanceType.DEBIT : AccountBalanceType.CREDIT,
        }
      });
      groupMap.set(g.name, account.id);
    }

    const ledgers = [
      { name: 'Cash', group: 'Current Assets' },
      { name: 'Bank', group: 'Current Assets' },
      { name: 'Accounts Receivable', group: 'Current Assets' },
      { name: 'Inventory', group: 'Current Assets' },
      { name: 'Accounts Payable', group: 'Current Liabilities' },
      { name: 'GST Payable', group: 'Current Liabilities' },
      { name: 'Sales', group: 'Direct Income' },
      { name: 'Purchase', group: 'Direct Expense' },
      { name: 'Salary', group: 'Indirect Expense' },
      { name: 'Rent', group: 'Indirect Expense' },
    ];

    for (const l of ledgers) {
      const parentId = groupMap.get(l.group);
      if (!parentId) continue;
      
      const parentGroup = groups.find(g => g.name === l.group);
      if (!parentGroup) continue;

      await tx.account.upsert({
        where: { companyId_name: { companyId, name: l.name } },
        update: {},
        create: {
          companyId,
          name: l.name,
          isGroup: false,
          parentId,
          category: parentGroup.category,
          nature: parentGroup.nature,
          balanceType: parentGroup.balanceType === AccountBalanceType.DEBIT ? AccountBalanceType.DEBIT : AccountBalanceType.CREDIT,
        }
      });
    }
  }
}
