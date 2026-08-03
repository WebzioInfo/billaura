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
          isDefault: isCash,
          parent: account.parent,
        };
      });

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
