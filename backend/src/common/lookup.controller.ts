import { Controller, Get, Query, UseGuards, BadRequestException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "./guards/tenant.guard";
import { PrismaService } from "../database/prisma.service";
import { CompanyContext } from "./context/company-context";
import { AccountCategory, AccountSubCategory } from "@prisma/client";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("lookup")
export class LookupController {
  constructor(private prisma: PrismaService) {}

  @Get("search")
  async search(
    @Query("entity") entity: string,
    @Query("q") q?: string,
    @Query("allowedAccountTypes") allowedAccountTypes?: string,
    @Query("allowedTypes") allowedTypes?: string,
  ) {
    if (!entity) {
      throw new BadRequestException("Entity parameter is required");
    }

    if (entity !== "ledger") {
      throw new BadRequestException(`Entity '${entity}' is not supported`);
    }

    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException("Company context is required");
    }

    const term = (q || "").trim().toLowerCase();

    // Check if we are searching bank/cash ledgers
    const isBankOrCash =
      (allowedTypes && (allowedTypes.toLowerCase().includes("bank") || allowedTypes.toLowerCase().includes("cash"))) ||
      (allowedAccountTypes && (allowedAccountTypes.toLowerCase().includes("bank") || allowedAccountTypes.toLowerCase().includes("cash")));

    if (isBankOrCash) {
      if (!term) {
        return {
          success: true,
          message: "Ledgers retrieved successfully",
          data: [],
          meta: { total: 0, limit: 30 }
        };
      }

      const bankAccounts = await this.prisma.bankAccount.findMany({
        where: {
          companyId,
          deletedAt: null,
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { bankName: { contains: term, mode: "insensitive" } },
            { accountNumber: { contains: term, mode: "insensitive" } },
          ],
        },
        take: 30,
      });

      const score = (item: any) => {
        const name = item.name.toLowerCase();
        const bankName = (item.bankName || "").toLowerCase();
        const number = (item.accountNumber || "").toLowerCase();

        if (name === term || number === term) return 10;
        if (name.startsWith(term) || number.startsWith(term)) return 8;
        const wordBoundaryRegex = new RegExp("\\b" + term);
        if (wordBoundaryRegex.test(name) || wordBoundaryRegex.test(number)) return 5;
        if (name.includes(term) || bankName.includes(term) || number.includes(term)) return 3;
        return 0;
      };

      const rankedData = bankAccounts
        .map((item) => ({ item, score: score(item) }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.item.name.localeCompare(b.item.name);
        })
        .map((x) => x.item);

      const mappedData = rankedData.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.accountNumber || "",
        accountType: item.accountType || "Bank Account",
        category: "ASSET",
        parent: {
          id: "bank-group",
          name: "Bank Accounts",
          code: "",
        },
      }));

      return {
        success: true,
        message: "Ledgers retrieved successfully",
        data: mappedData,
        meta: {
          total: mappedData.length,
          limit: 30,
        },
      };
    }

    // Parse allowed categories/subcategories if provided
    const categories: AccountCategory[] = [];
    const subCategories: AccountSubCategory[] = [];

    if (allowedAccountTypes) {
      const types = allowedAccountTypes.split(",");
      for (const t of types) {
        const trimmed = t.trim().toUpperCase();
        if (trimmed in AccountCategory) {
          categories.push(trimmed as AccountCategory);
        } else if (trimmed in AccountSubCategory) {
          subCategories.push(trimmed as AccountSubCategory);
        }
      }
    }

    if (!term) {
      return {
        success: true,
        message: "Ledgers retrieved successfully",
        data: [],
        meta: { total: 0, limit: 30 }
      };
    }

    // Query matching accounts (excluding group accounts, as we want postable ledgers)
    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        isGroup: false,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { code: { contains: term, mode: "insensitive" } },
        ],
        ...(categories.length > 0 || subCategories.length > 0
          ? {
              OR: [
                ...(categories.length > 0 ? [{ category: { in: categories } }] : []),
                ...(subCategories.length > 0 ? [{ subCategory: { in: subCategories } }] : []),
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        category: true,
        subCategory: true,
        isGroup: true,
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      take: 500, // Safe memory cap for in-memory ranking
    });

    // Scoring function for sorting
    const score = (item: typeof accounts[0]) => {
      const name = item.name.toLowerCase();
      const code = (item.code || "").toLowerCase();

      if (name === term || code === term) return 10; // Exact match
      if (name.startsWith(term) || code.startsWith(term)) return 8; // Starts with

      // Word contains (starts at word boundary)
      const wordBoundaryRegex = new RegExp("\\b" + term);
      if (wordBoundaryRegex.test(name) || wordBoundaryRegex.test(code)) return 5;

      if (name.includes(term) || code.includes(term)) return 3; // Contains anywhere
      return 0;
    };

    // Rank, sort, and slice to top 30
    const rankedData = accounts
      .map((item) => ({ item, score: score(item) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.item.name.localeCompare(b.item.name);
      })
      .map((x) => x.item)
      .slice(0, 30);

    // Map to the required response structure
    const mappedData = rankedData.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      accountType: item.subCategory || item.category,
      category: item.category,
      parent: item.parent
        ? {
            id: item.parent.id,
            name: item.parent.name,
            code: item.parent.code,
          }
        : null,
    }));

    return {
      success: true,
      message: "Ledgers retrieved successfully",
      data: mappedData,
      meta: {
        total: mappedData.length,
        limit: 30,
      },
    };
  }
}
