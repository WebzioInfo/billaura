import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "./guards/tenant.guard";
import { PrismaService } from "../database/prisma.service";
import { CompanyContext } from "./context/company-context";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("search")
export class SearchController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async search(@Query("q") query: string) {
    if (!query || query.length < 2) return { success: true, results: [] };

    const companyId = CompanyContext.getCompanyId() as string;
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

    return { success: true, results };
  }
}
