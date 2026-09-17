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

    // Outward Supplies (Invoices) - active non-cancelled
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      include: { businessPartner: true, items: { include: { product: true } } },
    });

    return invoices.map((inv) => {
      const isNonGstOrExempt = inv.invoiceType === 'BILL_OF_SUPPLY';
      const hasTax = Number(inv.totalTaxAmount || inv.taxTotal || 0) > 0;

      let taxableValue = 0;
      if (!isNonGstOrExempt && hasTax) {
        taxableValue = Number(inv.subTotal);
      } else if (!isNonGstOrExempt) {
        taxableValue = (inv.items || [])
          .filter((it: any) => Number(it.taxAmount || 0) > 0 || (it.product?.isTaxable && Number(it.taxPercent || 0) > 0))
          .reduce((sum: number, it: any) => sum + Number(it.qty || 1) * Number(it.rate || 0), 0);
      }

      return {
        invoiceNo: inv.invoiceNo,
        customerName: inv.businessPartner?.name,
        gstin: inv.businessPartner?.gstin || 'Unregistered',
        date: inv.date,
        taxableValue,
        cgst: Number(inv.cgstAmount || 0),
        sgst: Number(inv.sgstAmount || 0),
        igst: Number(inv.igstAmount || 0),
        cess: Number(inv.cessAmount || 0),
        totalTax: Number(inv.totalTaxAmount || 0),
        totalValue: Number(inv.grandTotal),
      };
    });
  }

  async getGstr2() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Inward Supplies (Purchases/Bills) - active non-cancelled
    const purchases = await this.prisma.purchase.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      include: { businessPartner: true, items: { include: { product: true } } },
    });

    return purchases.map((pur) => {
      const hasTax = Number(pur.totalTaxAmount || 0) > 0;
      let taxableValue = 0;
      if (hasTax) {
        taxableValue = Number(pur.subTotal);
      } else {
        taxableValue = (pur.items || [])
          .filter((it: any) => Number(it.taxAmount || 0) > 0 || (it.product?.isTaxable && Number(it.taxPercent || 0) > 0))
          .reduce((sum: number, it: any) => sum + Number(it.qty || 1) * Number(it.rate || 0), 0);
      }

      return {
        purchaseNo: pur.purchaseNo,
        vendorName: pur.businessPartner?.name,
        gstin: pur.businessPartner?.gstin || 'Unregistered',
        date: pur.date,
        taxableValue,
        cgst: Number(pur.cgstAmount || 0),
        sgst: Number(pur.sgstAmount || 0),
        igst: Number(pur.igstAmount || 0),
        cess: Number(pur.cessAmount || 0),
        totalTax: Number(pur.totalTaxAmount || 0),
        totalValue: Number(pur.grandTotal),
      };
    });
  }

  async getTaxSummary() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const [invoices, purchases] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { not: 'CANCELLED' },
        },
        include: { items: { include: { product: true } } },
      }),
      this.prisma.purchase.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { not: 'CANCELLED' },
        },
        include: { items: { include: { product: true } } },
      }),
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

      const isNonGstOrExempt = inv.invoiceType === 'BILL_OF_SUPPLY';
      const hasTax = Number(inv.totalTaxAmount || inv.taxTotal || 0) > 0;

      // Only supplies subject to GST calculation contribute to outwardTaxable turnover
      if (!isNonGstOrExempt && hasTax) {
        outwardTaxable += Number(inv.subTotal);
      } else if (!isNonGstOrExempt) {
        const taxableItemsTotal = (inv.items || [])
          .filter((it: any) => Number(it.taxAmount || 0) > 0 || (it.product?.isTaxable && Number(it.taxPercent || 0) > 0))
          .reduce((sum: number, it: any) => sum + Number(it.qty || 1) * Number(it.rate || 0), 0);
        outwardTaxable += taxableItemsTotal;
      }
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

      const hasTax = Number(pur.totalTaxAmount || 0) > 0;
      if (hasTax) {
        inwardTaxable += Number(pur.subTotal);
      } else {
        const taxableItemsTotal = (pur.items || [])
          .filter((it: any) => Number(it.taxAmount || 0) > 0 || (it.product?.isTaxable && Number(it.taxPercent || 0) > 0))
          .reduce((sum: number, it: any) => sum + Number(it.qty || 1) * Number(it.rate || 0), 0);
        inwardTaxable += taxableItemsTotal;
      }
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
