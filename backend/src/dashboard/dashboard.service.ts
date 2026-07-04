import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Run queries in parallel
    const [
      salesSum,
      purchaseSum,
      expenseSum,
      customerCount,
      vendorCount,
      lowStockProducts,
      recentInvoices,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {},
        _sum: { grandTotal: true },
      }),
      this.prisma.purchase.aggregate({
        where: {},
        _sum: { grandTotal: true },
      }),
      this.prisma.expense.aggregate({
        where: {},
        _sum: { amount: true },
      }),
      this.prisma.businessPartner.count({
        where: { companyId, bpType: 'CUSTOMER' },
      }),
      this.prisma.businessPartner.count({
        where: { companyId, bpType: 'VENDOR' },
      }),
      // Low stock count (selling price/reorder)
      this.prisma.product.findMany({
        where: {
          companyId,
          reorderLevel: { gt: 0 },
        },
        take: 5,
        orderBy: { name: 'asc' },
      }),
      this.prisma.invoice.findMany({
        where: {},
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { businessPartner: true },
      }),
    ]);

    return {
      metrics: {
        salesTotal: salesSum._sum?.grandTotal ? Number(salesSum._sum.grandTotal) : 0,
        purchaseTotal: purchaseSum._sum?.grandTotal ? Number(purchaseSum._sum.grandTotal) : 0,
        expenseTotal: expenseSum._sum?.amount ? Number(expenseSum._sum.amount) : 0,
        customerCount,
        vendorCount,
      },
      lowStock: lowStockProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || 'N/A',
        reorderLevel: Number(p.reorderLevel),
      })),
      recentActivity: recentInvoices.map((inv: any) => ({
        id: inv.id,
        type: 'INVOICE',
        reference: inv.invoiceNo,
        description: `Tax invoice issued to ${inv.businessPartner?.name}`,
        amount: Number(inv.grandTotal),
        date: inv.date,
        status: inv.status,
      })),
    };
  }
}
