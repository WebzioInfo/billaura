import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccountCategory, AccountSubCategory } from '@prisma/client';

describe('AccountsService - Delete Account & Zoho Account Types Suite', () => {
  let service: AccountsService;
  let prisma: any;

  const mockCompanyId = 'tenant-corp-101';
  const otherCompanyId = 'tenant-corp-999';

  let accountsStore: any[] = [];
  let journalLinesStore: any[] = [];
  let bankAccountsStore: any[] = [];
  let cashAccountsStore: any[] = [];
  let expenseCategoriesStore: any[] = [];
  let incomeCategoriesStore: any[] = [];
  let receiptsStore: any[] = [];
  let receiptPaymentsStore: any[] = [];
  let productsStore: any[] = [];
  let invoiceCategoriesStore: any[] = [];
  let commissionRulesStore: any[] = [];
  let companySettingsStore: any = null;

  beforeEach(async () => {
    accountsStore = [];
    journalLinesStore = [];
    bankAccountsStore = [];
    cashAccountsStore = [];
    expenseCategoriesStore = [];
    incomeCategoriesStore = [];
    receiptsStore = [];
    receiptPaymentsStore = [];
    productsStore = [];
    invoiceCategoriesStore = [];
    commissionRulesStore = [];

    companySettingsStore = {
      companyId: mockCompanyId,
      defaultAccounts: {
        protectedAccountIds: ['acc-protected-retained-earnings', 'acc-protected-opening-balance'],
        inputCgstAccountId: 'acc-tax-cgst',
        accountTypes: {},
        accountDescriptions: {},
      },
    };

    // Pre-populate accounts
    // 1. Root group (Protected)
    accountsStore.push({
      id: 'acc-root-assets',
      companyId: mockCompanyId,
      name: 'Current Assets',
      isGroup: true,
      parentId: null,
      category: AccountCategory.ASSET,
      subCategory: AccountSubCategory.CURRENT_ASSET,
      balance: 0,
    });

    // 2. System accounts in protectedAccountIds
    accountsStore.push({
      id: 'acc-protected-retained-earnings',
      companyId: mockCompanyId,
      name: 'Retained Earnings',
      isGroup: false,
      parentId: 'acc-root-assets',
      category: AccountCategory.EQUITY,
      subCategory: AccountSubCategory.EQUITY,
      balance: 0,
    });

    // 3. Parent account with children
    accountsStore.push({
      id: 'acc-parent-travel',
      companyId: mockCompanyId,
      name: 'Travel & Transport',
      isGroup: false,
      parentId: 'acc-root-assets',
      category: AccountCategory.EXPENSE,
      subCategory: AccountSubCategory.OPERATING_EXPENSE,
      balance: 0,
    });
    accountsStore.push({
      id: 'acc-child-airfare',
      companyId: mockCompanyId,
      name: 'Airfare Domestic',
      isGroup: false,
      parentId: 'acc-parent-travel',
      category: AccountCategory.EXPENSE,
      subCategory: AccountSubCategory.OPERATING_EXPENSE,
      balance: 0,
    });

    // 4. Account with posted transactions
    accountsStore.push({
      id: 'acc-with-transactions',
      companyId: mockCompanyId,
      name: 'Client Entertainment',
      isGroup: false,
      parentId: 'acc-root-assets',
      category: AccountCategory.EXPENSE,
      subCategory: AccountSubCategory.OPERATING_EXPENSE,
      balance: 500,
    });
    journalLinesStore.push({
      id: 'jl-101',
      accountId: 'acc-with-transactions',
      debit: 500,
      credit: 0,
    });

    // 5. Account belonging to another tenant
    accountsStore.push({
      id: 'acc-other-tenant',
      companyId: otherCompanyId,
      name: 'Other Tenant Account',
      isGroup: false,
      parentId: null,
      category: AccountCategory.EXPENSE,
      balance: 0,
    });

    // 6. Clean unused custom account eligible for deletion
    accountsStore.push({
      id: 'acc-custom-unused',
      companyId: mockCompanyId,
      name: 'Temporary Staging Expense',
      code: '8899',
      isGroup: false,
      parentId: 'acc-root-assets',
      category: AccountCategory.EXPENSE,
      subCategory: AccountSubCategory.OPERATING_EXPENSE,
      balance: 0,
    });

    const mockTx: any = {
      account: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            accountsStore.find((a) => {
              if (where.id && a.id !== where.id) return false;
              if (where.companyId && a.companyId !== where.companyId) return false;
              if (where.name && a.name !== where.name) return false;
              return true;
            }) || null
          );
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(accountsStore.find((a) => a.id === where.id) || null);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            accountsStore.filter((a) => {
              if (where?.companyId && a.companyId !== where.companyId) return false;
              if (where?.isGroup !== undefined && a.isGroup !== where.isGroup) return false;
              if (where?.parentId === null && a.parentId !== null) return false;
              return true;
            })
          );
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            accountsStore.filter((a) => {
              if (where.parentId && a.parentId !== where.parentId) return false;
              if (where.companyId && a.companyId !== where.companyId) return false;
              return true;
            }).length
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const item = { id: `acc-${Date.now()}`, ...data };
          accountsStore.push(item);
          return Promise.resolve(item);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const item = accountsStore.find((a) => a.id === where.id);
          if (item) Object.assign(item, data);
          return Promise.resolve(item);
        }),
        delete: jest.fn().mockImplementation(({ where }) => {
          const index = accountsStore.findIndex((a) => a.id === where.id);
          if (index !== -1) {
            const [deleted] = accountsStore.splice(index, 1);
            return Promise.resolve(deleted);
          }
          return Promise.resolve(null);
        }),
      },
      journalLine: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(journalLinesStore.filter((jl) => jl.accountId === where.accountId).length);
        }),
      },
      bankAccount: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(bankAccountsStore.filter((b) => b.accountId === where.accountId).length);
        }),
      },
      cashAccount: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(cashAccountsStore.filter((c) => c.accountId === where.accountId).length);
        }),
      },
      expenseCategory: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            expenseCategoriesStore.filter((e) => {
              if (where.OR) {
                return where.OR.some(
                  (cond: any) =>
                    (cond.accountId && e.accountId === cond.accountId) ||
                    (cond.defaultInputTaxAccountId && e.defaultInputTaxAccountId === cond.defaultInputTaxAccountId)
                );
              }
              return false;
            }).length
          );
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      incomeCategory: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(incomeCategoriesStore.filter((i) => i.accountId === where.accountId).length);
        }),
      },
      receipt: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(receiptsStore.filter((r) => r.accountId === where.accountId).length);
        }),
      },
      receiptPayment: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(receiptPaymentsStore.filter((rp) => rp.accountId === where.accountId).length);
        }),
      },
      product: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            productsStore.filter((p) => {
              if (where.OR) {
                return where.OR.some(
                  (cond: any) =>
                    (cond.salesAccountId && p.salesAccountId === cond.salesAccountId) ||
                    (cond.purchaseAccountId && p.purchaseAccountId === cond.purchaseAccountId) ||
                    (cond.inventoryAccountId && p.inventoryAccountId === cond.inventoryAccountId)
                );
              }
              return false;
            }).length
          );
        }),
      },
      invoiceCategory: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            invoiceCategoriesStore.filter((ic) => ic.defaultSalesAccountId === where.defaultSalesAccountId).length
          );
        }),
      },
      commissionRule: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            commissionRulesStore.filter((cr) => {
              if (where.OR) {
                return where.OR.some(
                  (cond: any) =>
                    (cond.expenseAccountId && cr.expenseAccountId === cond.expenseAccountId) ||
                    (cond.payableAccountId && cr.payableAccountId === cond.payableAccountId) ||
                    (cond.tdsAccountId && cr.tdsAccountId === cond.tdsAccountId)
                );
              }
              return false;
            }).length
          );
        }),
      },
      companySettings: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.companyId === mockCompanyId) {
            return Promise.resolve(companySettingsStore);
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          if (companySettingsStore) {
            Object.assign(companySettingsStore, data);
          }
          return Promise.resolve(companySettingsStore);
        }),
      },
    };

    prisma = {
      ...mockTx,
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        if (typeof callback === 'function') {
          return callback(mockTx);
        }
        return Promise.all(callback);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Scenario 1: Delete an unused custom account', () => {
    it('should successfully delete an unused custom account with zero balance and no dependencies', async () => {
      const result = await service.remove('acc-custom-unused');
      expect(result).toBeDefined();
      expect(result.id).toBe('acc-custom-unused');
      expect(accountsStore.find((a) => a.id === 'acc-custom-unused')).toBeUndefined();
    });
  });

  describe('Scenario 2: Delete an account with posted journal entries', () => {
    it('should block deletion of an account that has posted journal entries', async () => {
      await expect(service.remove('acc-with-transactions')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-with-transactions')).rejects.toThrow(
        /recorded journal ledger transaction/
      );
      expect(accountsStore.find((a) => a.id === 'acc-with-transactions')).toBeDefined();
    });
  });

  describe('Scenario 3: Delete an account with linked receipts / financial documents', () => {
    it('should block deletion of an account linked to receipts', async () => {
      receiptsStore.push({
        id: 'rcpt-1',
        accountId: 'acc-custom-unused',
        companyId: mockCompanyId,
      });

      await expect(service.remove('acc-custom-unused')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(/linked to 1 receipt record/);
    });

    it('should block deletion of an account linked to receipt payments', async () => {
      receiptPaymentsStore.push({
        id: 'rp-1',
        accountId: 'acc-custom-unused',
      });

      await expect(service.remove('acc-custom-unused')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(/linked to 1 receipt payment transaction/);
    });
  });

  describe('Scenario 4: Delete a parent account with child accounts', () => {
    it('should block deletion of a parent account that contains sub-accounts', async () => {
      await expect(service.remove('acc-parent-travel')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-parent-travel')).rejects.toThrow(
        /contains 1 sub-account\(s\)\. Please delete or reassign child accounts first/
      );
      expect(accountsStore.find((a) => a.id === 'acc-parent-travel')).toBeDefined();
    });
  });

  describe('Scenario 5: Delete a protected system root group account', () => {
    it('should block deletion of a root group account (primary chart head)', async () => {
      await expect(service.remove('acc-root-assets')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-root-assets')).rejects.toThrow(
        /Cannot delete root system group account/
      );
    });
  });

  describe('Scenario 6: Delete a protected system / default account', () => {
    it('should block deletion of accounts registered in protectedAccountIds or defaultAccounts', async () => {
      await expect(service.remove('acc-protected-retained-earnings')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-protected-retained-earnings')).rejects.toThrow(
        /protected system account required for core accounting operations/
      );
    });
  });

  describe('Scenario 7: Cross-tenant isolation verification', () => {
    it('should reject deletion of an account belonging to another tenant with ForbiddenException', async () => {
      await expect(service.remove('acc-other-tenant')).rejects.toThrow(ForbiddenException);
      await expect(service.remove('acc-other-tenant')).rejects.toThrow(
        /Access denied: Account belongs to another tenant/
      );
      expect(accountsStore.find((a) => a.id === 'acc-other-tenant')).toBeDefined();
    });

    it('should reject non-existent account with NotFoundException', async () => {
      await expect(service.remove('acc-non-existent-xyz')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Scenario 8: Context verification', () => {
    it('should throw ConflictException if company context is missing', async () => {
      jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(null as any);
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(/Company context is required/);
    });
  });

  describe('Scenario 9: Master data reference dependencies', () => {
    it('should block deletion if linked to a BankAccount master record', async () => {
      bankAccountsStore.push({ id: 'bank-1', accountId: 'acc-custom-unused' });
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(/linked to 1 bank account master record/);
    });

    it('should block deletion if linked to a CashAccount master record', async () => {
      cashAccountsStore.push({ id: 'cash-1', accountId: 'acc-custom-unused' });
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(/linked to 1 cash register master record/);
    });

    it('should block deletion if linked to an ExpenseCategory', async () => {
      expenseCategoriesStore.push({ id: 'exp-cat-1', accountId: 'acc-custom-unused' });
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(/expense category configuration/);
    });

    it('should block deletion if linked to a Product/Service item', async () => {
      productsStore.push({ id: 'prod-1', salesAccountId: 'acc-custom-unused' });
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-custom-unused')).rejects.toThrow(/product or service item/);
    });

    it('should block deletion if account has a non-zero balance', async () => {
      const nonZeroAcc = {
        id: 'acc-nonzero',
        companyId: mockCompanyId,
        name: 'Non Zero Account',
        isGroup: false,
        parentId: 'acc-root-assets',
        category: AccountCategory.EXPENSE,
        balance: 150.75,
      };
      accountsStore.push(nonZeroAcc);
      await expect(service.remove('acc-nonzero')).rejects.toThrow(ConflictException);
      await expect(service.remove('acc-nonzero')).rejects.toThrow(/non-zero balance/);
    });
  });

  describe('Zoho-Style Account Types & Classification Suite', () => {
    it('1. should create an account with detailed type OTHER_CURRENT_ASSET and resolve Debit normal balance', async () => {
      const created = await service.create({
        name: 'Prepaid Insurance Advance',
        code: '1250',
        accountType: 'OTHER_CURRENT_ASSET',
        description: 'Advance annual premium paid to insurance provider',
      });

      expect(created).toBeDefined();
      expect(created.name).toBe('Prepaid Insurance Advance');
      expect(created.category).toBe(AccountCategory.ASSET);
      expect(created.subCategory).toBe(AccountSubCategory.CURRENT_ASSET);
      expect(created.accountType).toBe('OTHER_CURRENT_ASSET');
      expect(created.accountTypeName).toBe('Other Current Asset');
      expect(created.normalBalance).toBe('DEBIT');
      expect(companySettingsStore.defaultAccounts.accountTypes[created.id]).toBe('OTHER_CURRENT_ASSET');
    });

    it('2. should create an account with detailed type CREDIT_CARD under LIABILITY with Credit normal balance', async () => {
      const created = await service.create({
        name: 'Corporate Amex Card',
        code: '2150',
        accountType: 'CREDIT_CARD',
      });

      expect(created.category).toBe(AccountCategory.LIABILITY);
      expect(created.accountType).toBe('CREDIT_CARD');
      expect(created.normalBalance).toBe('CREDIT');
    });

    it('3. should create an account with detailed type COST_OF_GOODS_SOLD under EXPENSE', async () => {
      const created = await service.create({
        name: 'Raw Material Freight Inward',
        code: '5010',
        accountType: 'COST_OF_GOODS_SOLD',
      });

      expect(created.category).toBe(AccountCategory.EXPENSE);
      expect(created.subCategory).toBe(AccountSubCategory.COGS);
      expect(created.accountType).toBe('COST_OF_GOODS_SOLD');
      expect(created.normalBalance).toBe('DEBIT');
    });

    it('4. should block changing main account group for accounts with posted transactions', async () => {
      await expect(
        service.update('acc-with-transactions', {
          accountType: 'OTHER_CURRENT_ASSET', // Target is ASSET, while current is EXPENSE
        })
      ).rejects.toThrow(ConflictException);

      await expect(
        service.update('acc-with-transactions', {
          accountType: 'OTHER_CURRENT_ASSET',
        })
      ).rejects.toThrow(/Cannot change main account classification from EXPENSE to ASSET/);
    });

    it('5. should allow updating detailed account type within the same group for accounts with transactions', async () => {
      const updated = await service.update('acc-with-transactions', {
        accountType: 'OTHER_EXPENSE', // Same group EXPENSE
      });

      expect(updated.category).toBe(AccountCategory.EXPENSE);
      expect(updated.accountType).toBe('OTHER_EXPENSE');
    });

    it('6. should allow changing main account classification if account has ZERO transactions', async () => {
      const updated = await service.update('acc-custom-unused', {
        accountType: 'OTHER_CURRENT_ASSET', // Moving from EXPENSE to ASSET
      });

      expect(updated.category).toBe(AccountCategory.ASSET);
      expect(updated.accountType).toBe('OTHER_CURRENT_ASSET');
      expect(updated.normalBalance).toBe('DEBIT');
    });
  });
});
