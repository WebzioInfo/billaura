import { Injectable } from "@nestjs/common";
import { AccountCategory } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class BankAccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, term?: string, take: number = 50, type?: string) {
    // Fetch inactive or soft-deleted backing bank accounts to exclude
    const inactiveOrDeletedBanks = await this.prisma.bankAccount.findMany({
      where: {
        companyId,
        OR: [
          { status: { not: "ACTIVE" } },
          { deletedAt: { not: null } }
        ]
      },
      select: { name: true, bankName: true, accountNumber: true }
    });

    const excludedNames = new Set(
      inactiveOrDeletedBanks.flatMap(b => [
        b.name?.toLowerCase(),
        b.bankName?.toLowerCase(),
      ].filter(Boolean))
    );
    const excludedNumbers = new Set(
      inactiveOrDeletedBanks.map(b => b.accountNumber?.toLowerCase()).filter(Boolean)
    );

    const paymentLedgerFilter: Prisma.AccountWhereInput = {
      companyId,
      deletedAt: null,
      isGroup: false,
      category: AccountCategory.ASSET,
      OR: [
        { name: { contains: "cash", mode: "insensitive" } },
        { name: { contains: "bank", mode: "insensitive" } },
        { name: { contains: "hdfc", mode: "insensitive" } },
        { name: { contains: "sbi", mode: "insensitive" } },
        { name: { contains: "icici", mode: "insensitive" } },
        { name: { contains: "axis", mode: "insensitive" } },
        { name: { contains: "kotak", mode: "insensitive" } },
        { name: { contains: "savings", mode: "insensitive" } },
        { name: { contains: "current account", mode: "insensitive" } },
        { parent: { name: { contains: "cash", mode: "insensitive" } } },
        { parent: { name: { contains: "bank", mode: "insensitive" } } },
      ],
    };

    const where: Prisma.AccountWhereInput = {
      ...paymentLedgerFilter,
      ...(term
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: term, mode: "insensitive" } },
                  { code: { contains: term, mode: "insensitive" } },
                  { parent: { name: { contains: term, mode: "insensitive" } } },
                ],
              },
            ],
          }
        : {}),
    };

    const accounts = await this.prisma.account.findMany({
      where,
      take,
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Fetch the actual default cash and bank accounts for this company
    const [defaultCashAccount, defaultBankAccount, cashRegisters, directBanks] = await Promise.all([
      this.prisma.cashAccount.findFirst({
        where: { companyId, isDefault: true, deletedAt: null },
        select: { id: true, accountId: true, name: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.bankAccount.findFirst({
        where: { companyId, isDefault: true, deletedAt: null, status: 'ACTIVE' },
        select: { id: true, accountId: true, name: true, bankName: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.cashAccount.findMany({
        where: { companyId, deletedAt: null },
      }),
      this.prisma.bankAccount.findMany({
        where: { companyId, deletedAt: null, status: 'ACTIVE' },
      }),
    ]);

    let items = accounts
      .filter((account) => {
        const nameLower = account.name.toLowerCase();
        const codeLower = account.code?.toLowerCase() || "";
        if (excludedNames.has(nameLower) || (codeLower && excludedNumbers.has(codeLower))) {
          return false;
        }
        return true;
      })
      .map((account) => {
        const parentName = account.parent?.name?.toLowerCase() || "";
        const accountName = account.name.toLowerCase();
        const isCash = accountName.includes("cash") || parentName.includes("cash");
        const accountType = isCash ? "CASH" : accountName.includes("saving") ? "SAVINGS" : "CURRENT";

        const isDefault = isCash
          ? (defaultCashAccount ? defaultCashAccount.accountId === account.id : accountName === "cash")
          : (defaultBankAccount ? defaultBankAccount.accountId === account.id : false);

        return {
          id: account.id,
          ledgerId: account.id,
          source: "ACCOUNT_LEDGER",
          name: account.name,
          accountName: account.name,
          bankName: account.name,
          accountNumber: account.code || "",
          accountType,
          currentBalance: account.balance,
          isDefault: Boolean(isDefault),
          parent: account.parent,
        };
      });

    // Merge dedicated cashRegisters and directBanks with intelligent deduplication
    const existingIds = new Set(items.map((i) => i.id));

    for (const c of cashRegisters) {
      const cName = (c.name || '').trim().toLowerCase();
      // Match by accountId or matching name
      const existingItem = items.find(
        (i) => (c.accountId && i.id === c.accountId) || (i.name || '').trim().toLowerCase() === cName
      );
      if (existingItem) {
        existingItem.id = c.id; // use direct CashAccount id so relational links work
        existingItem.ledgerId = c.accountId || existingItem.ledgerId;
        existingItem.source = "CASH_ACCOUNT";
        existingItem.accountType = "CASH";
      } else if (!existingIds.has(c.id)) {
        items.push({
          id: c.id,
          ledgerId: c.accountId || c.id,
          source: "CASH_ACCOUNT",
          name: c.name,
          accountName: c.name,
          bankName: c.name,
          accountNumber: "",
          accountType: "CASH",
          currentBalance: c.currentBalance,
          isDefault: Boolean(c.isDefault),
          parent: null as any,
        });
        existingIds.add(c.id);
      }
    }

    for (const b of directBanks) {
      const bName = (b.name || b.bankName || '').trim().toLowerCase();
      // Match by accountId or matching bank name
      const existingItem = items.find(
        (i) =>
          (b.accountId && i.id === b.accountId) ||
          (i.name || '').trim().toLowerCase() === bName ||
          (i.bankName || '').trim().toLowerCase() === bName
      );
      if (existingItem) {
        existingItem.id = b.id; // use direct BankAccount id
        existingItem.ledgerId = b.accountId || existingItem.ledgerId;
        existingItem.source = "BANK_ACCOUNT";
        existingItem.name = b.name;
        existingItem.bankName = b.bankName || b.name;
        existingItem.accountNumber = b.accountNumber || existingItem.accountNumber;
        existingItem.accountType = b.accountType || "CURRENT";
      } else if (!existingIds.has(b.id)) {
        items.push({
          id: b.id,
          ledgerId: b.accountId || b.id,
          source: "BANK_ACCOUNT",
          name: b.name,
          accountName: b.accountName || b.name,
          bankName: b.bankName || b.name,
          accountNumber: b.accountNumber || "",
          accountType: b.accountType || "CURRENT",
          currentBalance: b.currentBalance,
          isDefault: Boolean(b.isDefault),
          parent: null as any,
        });
        existingIds.add(b.id);
      }
    }

    // Final safety deduplication by normalized name and account number
    const seenKeys = new Set<string>();
    const deduplicatedItems: typeof items = [];
    for (const it of items) {
      const key = `${(it.name || '').toLowerCase().trim()}_${(it.accountNumber || '').toLowerCase().trim()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        deduplicatedItems.push(it);
      }
    }
    items = deduplicatedItems;

    if (type === "CASH") {
      items = items.filter(item => item.accountType === "CASH");
    } else if (type === "BANK") {
      items = items.filter(item => item.accountType !== "CASH");
    }

    return items;
  }

  async create(companyId: string, data: any) {
    return this.prisma.bankAccount.create({
      data: { ...data, companyId },
    });
  }
}
