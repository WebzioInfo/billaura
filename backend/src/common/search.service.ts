import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(companyId: string, query: string) {
    if (!query || query.length < 2) return [];

    const q = query.toLowerCase();

    // Run parallel searches across entities
    const [customers, vendors, invoices, products, accounts] =
      await Promise.all([
        this.prisma.businessPartner.findMany({
          where: {
            companyId,
            deletedAt: null,
            bpType: "CUSTOMER",
            name: { contains: q },
          },
          take: 5,
        }),
        this.prisma.businessPartner.findMany({
          where: {
            companyId,
            deletedAt: null,
            bpType: "VENDOR",
            name: { contains: q },
          },
          take: 5,
        }),
        this.prisma.invoice.findMany({
          where: { companyId, deletedAt: null, invoiceNo: { contains: q } },
          take: 5,
        }),
        this.prisma.product.findMany({
          where: { companyId, deletedAt: null, name: { contains: q } },
          take: 5,
        }),
        this.prisma.account.findMany({
          where: { companyId, name: { contains: q } },
          take: 5,
        }),
      ]);

    const results = [
      ...customers.map((c) => ({
        id: c.id,
        title: c.name,
        type: "Customer",
        url: "/crm",
      })),
      ...vendors.map((v) => ({
        id: v.id,
        title: v.name,
        type: "Vendor",
        url: "/vendors",
      })),
      ...invoices.map((i) => ({
        id: i.id,
        title: `Invoice #${i.invoiceNo}`,
        type: "Invoice",
        url: "/invoices",
      })),
      ...products.map((p) => ({
        id: p.id,
        title: p.name,
        type: "Product",
        url: "/inventory",
      })),
      ...accounts.map((a) => ({
        id: a.id,
        title: a.name,
        type: "Account",
        url: "/chart-of-accounts",
      })),
    ];

    return results;
  }
}
