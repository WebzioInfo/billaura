import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class TaxesService {
  constructor(private readonly prisma: PrismaService) {}

  async getGstr1() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Outward Supplies (Invoices)
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, deletedAt: null },
      include: { businessPartner: true, items: { include: { product: true } } },
    });

    return invoices.map((inv) => ({
      invoiceNo: inv.invoiceNo,
      customerName: inv.businessPartner?.name,
      gstin: inv.businessPartner?.gstin || 'Unregistered',
      date: inv.date,
      taxableValue: Number(inv.subTotal),
      cgst: Number(inv.cgstAmount || 0),
      sgst: Number(inv.sgstAmount || 0),
      igst: Number(inv.igstAmount || 0),
      cess: Number(inv.cessAmount || 0),
      totalTax: Number(inv.totalTaxAmount || 0),
      totalValue: Number(inv.grandTotal),
    }));
  }

  async getGstr2() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Inward Supplies (Purchases/Bills)
    const purchases = await this.prisma.purchase.findMany({
      where: { companyId, deletedAt: null },
      include: { businessPartner: true, items: { include: { product: true } } },
    });

    return purchases.map((pur) => ({
      purchaseNo: pur.purchaseNo,
      vendorName: pur.businessPartner?.name,
      gstin: pur.businessPartner?.gstin || 'Unregistered',
      date: pur.date,
      taxableValue: Number(pur.subTotal),
      cgst: Number(pur.cgstAmount || 0),
      sgst: Number(pur.sgstAmount || 0),
      igst: Number(pur.igstAmount || 0),
      cess: Number(pur.cessAmount || 0),
      totalTax: Number(pur.totalTaxAmount || 0),
      totalValue: Number(pur.grandTotal),
    }));
  }

  async getTaxSummary() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const [invoices, purchases] = await Promise.all([
      this.prisma.invoice.findMany({ where: { companyId, deletedAt: null } }),
      this.prisma.purchase.findMany({ where: { companyId, deletedAt: null } }),
    ]);

    // Outward tax liability
    let liabilityCgst = 0;
    let liabilitySgst = 0;
    let liabilityIgst = 0;
    let outwardTaxable = 0;

    invoices.forEach((inv) => {
      liabilityCgst += Number(inv.cgstAmount || 0);
      liabilitySgst += Number(inv.sgstAmount || 0);
      liabilityIgst += Number(inv.igstAmount || 0);
      outwardTaxable += Number(inv.subTotal);
    });

    // Inward Input Tax Credit (ITC)
    let itcCgst = 0;
    let itcSgst = 0;
    let itcIgst = 0;
    let inwardTaxable = 0;

    purchases.forEach((pur) => {
      itcCgst += Number(pur.cgstAmount || 0);
      itcSgst += Number(pur.sgstAmount || 0);
      itcIgst += Number(pur.igstAmount || 0);
      inwardTaxable += Number(pur.subTotal);
    });

    const netCgst = liabilityCgst - itcCgst;
    const netSgst = liabilitySgst - itcSgst;
    const netIgst = liabilityIgst - itcIgst;

    return {
      outwardTaxable,
      inwardTaxable,
      liability: {
        cgst: liabilityCgst,
        sgst: liabilitySgst,
        igst: liabilityIgst,
        total: liabilityCgst + liabilitySgst + liabilityIgst,
      },
      itc: {
        cgst: itcCgst,
        sgst: itcSgst,
        igst: itcIgst,
        total: itcCgst + itcSgst + itcIgst,
      },
      netPayable: {
        cgst: netCgst,
        sgst: netSgst,
        igst: netIgst,
        total: netCgst + netSgst + netIgst,
      },
    };
  }
}
