import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { SequenceService } from "../shared/sequence/sequence.service";
import { AccountingEngineService } from "../accounting/accounting-engine.service";

function toCustomerType(value?: string): string {
  const v = value?.toUpperCase?.() || '';
  if (['B2C', 'INDIVIDUAL', 'CONSUMER'].includes(v)) return 'B2C';
  if (['GOVERNMENT', 'GOVT'].includes(v)) return 'GOVERNMENT';
  if (['EXPORT', 'OVERSEAS'].includes(v)) return 'EXPORT';
  if (['B2B', 'BUSINESS'].includes(v)) return 'B2B';
  return 'B2B';
}

function toGSTRegistrationStatus(value?: string): string {
  const map: Record<string, string> = {
    REGULAR: "REGISTERED",
    REGISTERED: "REGISTERED",
    "REGISTERED BUSINESS - REGULAR": "REGISTERED",
    "REGISTERED BUSINESS - COMPOSITION": "COMPOSITION",
    COMPOSITION: "COMPOSITION",
    "UNREGISTERED BUSINESS": "UNREGISTERED",
    UNREGISTERED: "UNREGISTERED",
    CONSUMER: "UNREGISTERED",
    OVERSEAS: "EXPORT",
    EXPORT: "EXPORT",
    "DEEMED EXPORT": "EXPORT",
    "SPECIAL ECONOMIC ZONE": "SEZ",
    SEZ: "SEZ",
  };
  return map[value?.toUpperCase?.() || ""] || "UNREGISTERED";
}

function toTaxPreference(value?: string): string {
  const v = value?.toUpperCase?.() || '';
  if (v === 'TAX_EXEMPT' || v === 'EXEMPT') return 'EXEMPT';
  if (v === 'NON_TAXABLE' || v === 'NON_GST') return 'NON_GST';
  if (v === 'NIL_RATED') return 'NIL_RATED';
  if (v === 'ZERO_RATED') return 'ZERO_RATED';
  if (v === 'COMPOSITION') return 'COMPOSITION';
  if (v === 'REVERSE_CHARGE') return 'REVERSE_CHARGE';
  if (v === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  return 'TAXABLE';
}

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
    private accountingEngine: AccountingEngineService
  ) {}

  async findAll(companyId: string, search?: string) {
    const where: any = { companyId, deletedAt: null, bpType: "CUSTOMER" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { tradeName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { gstin: { contains: search, mode: "insensitive" } },
      ];
    }
    const items = await this.prisma.businessPartner.findMany({ 
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customerSegment: true,
        customerDepartment: true
      }
    });
    return items;
  }

  async findOne(id: string, companyId: string) {
    const customer = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: "CUSTOMER" },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        transactionPayments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        customerSegment: true,
        customerDepartment: true
      }
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return customer;
  }

  async getLedger(id: string, companyId: string) {
    const customer = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: "CUSTOMER" }
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessPartnerId: id,
        companyId,
        status: { notIn: ["CANCELLED", "DRAFT"] },
        deletedAt: null,
      },
      orderBy: { date: 'desc' },
    });

    const payments = await this.prisma.transactionPayment.findMany({
      where: { businessPartnerId: id, companyId, deletedAt: null },
      orderBy: { date: 'desc' },
    });

    const receipts = await this.prisma.receipt.findMany({
      where: { businessPartnerId: id, companyId, deletedAt: null, NOT: { status: 'VOID' } },
      orderBy: { date: 'desc' },
    });

    let openingBal = 0;
    if (customer.openingBalanceType === 'DEBIT') {
      openingBal = Number(customer.openingBalanceAmount || 0);
    } else if (customer.openingBalanceType === 'CREDIT') {
      openingBal = -Number(customer.openingBalanceAmount || 0);
    }

    const totalInvoiced = invoices.reduce((sum, inv) => {
      const isCredit = inv.invoiceType === 'CREDIT_NOTE';
      return isCredit ? sum - Number(inv.grandTotal) : sum + Number(inv.grandTotal);
    }, 0);
    const totalReceipts = receipts.reduce((sum, rec) => sum + Number(rec.amount), 0);
    const totalPayments = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);
    const calculatedBalance = Number((openingBal + totalInvoiced - (totalReceipts + totalPayments)).toFixed(2));

    if (Math.abs(Number(customer.receivableBalance) - calculatedBalance) > 0.01) {
      await this.prisma.businessPartner.update({
        where: { id },
        data: { receivableBalance: calculatedBalance },
      });
      customer.receivableBalance = calculatedBalance as any;
    }

    const transactions = [
      ...(openingBal !== 0 ? [{
        id: `opening-${customer.id}`,
        date: customer.createdAt,
        type: 'OPENING_BALANCE',
        reference: 'Opening Balance',
        amount: Math.abs(openingBal),
        balanceImpact: openingBal,
      }] : []),
      ...invoices.map(inv => {
        const isCredit = inv.invoiceType === 'CREDIT_NOTE';
        return {
          id: inv.id,
          date: inv.date,
          type: inv.invoiceType || 'INVOICE',
          reference: inv.invoiceNo,
          amount: Number(inv.grandTotal),
          balanceImpact: isCredit ? -Number(inv.grandTotal) : Number(inv.grandTotal),
        };
      }),
      ...receipts.map(rec => ({
        id: rec.id,
        date: rec.date,
        type: 'RECEIPT',
        reference: rec.receiptNo,
        amount: Number(rec.amount),
        balanceImpact: -Number(rec.amount),
      })),
      ...payments.map(pay => ({
        id: pay.id,
        date: pay.date,
        type: 'PAYMENT',
        reference: pay.paymentNo,
        amount: Number(pay.amount),
        balanceImpact: -Number(pay.amount),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      transactions,
      receivableBalance: customer.receivableBalance,
      totalInvoiced,
      totalReceived: totalReceipts + totalPayments,
    };
  }

  async getAnalytics(id: string, companyId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessPartnerId: id,
        companyId,
        status: { notIn: ["CANCELLED", "DRAFT"] },
        deletedAt: null,
      },
    });

    const totalRevenue = invoices.reduce((sum, inv) => {
      const isCredit = inv.invoiceType === 'CREDIT_NOTE';
      return isCredit ? sum - Number(inv.grandTotal) : sum + Number(inv.grandTotal);
    }, 0);
    const invoiceCount = invoices.length;
    const averageInvoiceValue = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;

    return {
      totalRevenue,
      invoiceCount,
      averageInvoiceValue
    };
  }

  async getHistory(id: string, companyId: string) {
    return this.prisma.crmActivity.findMany({
      where: { businessPartnerId: id, companyId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(companyId: string, data: any) {
    const {
      name,
      customerCode,
      mobile,
      whatsapp,
      email,
      gstin,
      gstNumber,
      panNumber,
      gstRegistrationStatus,
      customerType,
      taxPreference,
      tradeName,
      address,
      pinCode,
      state,
      stateCode,
      placeOfSupply,
      creditLimit,
      customerSegmentId,
      customerDepartmentId,
      openingBalanceType,
      openingBalanceAmount,
      openingBalanceDate,
      migrationReferenceNo,
      migrationNotes,
      previousSoftware,
      previousLedgerCode,
      isMigrated,
      historicalInvoices,
    } = data;
    const finalGstin = gstin || gstNumber;
    if (finalGstin) {
      const existingGst = await this.prisma.businessPartner.findFirst({
        where: { companyId, gstin: finalGstin, deletedAt: null, bpType: "CUSTOMER" }
      });
      if (existingGst) throw new BadRequestException("GSTIN already exists for another customer");
    }

    let finalBpCode = customerCode;
    if (finalBpCode) {
      const existingCode = await this.prisma.businessPartner.findFirst({
        where: { companyId, bpCode: finalBpCode, deletedAt: null, bpType: "CUSTOMER" }
      });
      if (existingCode) throw new BadRequestException("Customer Code already exists");
    } else {
      finalBpCode = await this.sequenceService.generateNextSequence(companyId, "CUSTOMER");
    }

    const effectiveGstStatus = toGSTRegistrationStatus(gstRegistrationStatus || gstNumber || customerType);
    const effectiveCustomerType = (gstRegistrationStatus?.toUpperCase?.() === 'CONSUMER' || customerType?.toUpperCase?.() === 'INDIVIDUAL')
      ? 'B2C'
      : toCustomerType(customerType);

    const item = await this.prisma.businessPartner.create({
      data: {
        name,
        bpCode: finalBpCode,
        bpType: "CUSTOMER",
        phone: mobile?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        email: email?.trim() || null,
        gstin: finalGstin && finalGstin.trim() ? finalGstin.trim() : null,
        panNumber: panNumber && panNumber.trim() ? panNumber.trim() : null,
        gstRegistrationStatus: effectiveGstStatus as any,
        customerType: effectiveCustomerType as any,
        taxPreference: toTaxPreference(taxPreference) as any,
        tradeName: tradeName?.trim() || null,
        address,
        pinCode,
        state,
        stateCode,
        placeOfSupply,
        creditLimit: creditLimit ? Number(creditLimit) : 0,
        customerSegmentId: customerSegmentId && customerSegmentId.trim() ? customerSegmentId.trim() : null,
        customerDepartmentId: customerDepartmentId && customerDepartmentId.trim() ? customerDepartmentId.trim() : null,
        companyId,
        openingBalanceType: openingBalanceType || 'NONE',
        openingBalanceAmount: openingBalanceAmount ? Number(openingBalanceAmount) : 0,
        openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null,
        migrationReferenceNo,
        migrationNotes,
        previousSoftware,
        previousLedgerCode,
        isMigrated: isMigrated === true,
      },
    });

    if (item.openingBalanceType !== 'NONE' && Number(item.openingBalanceAmount) > 0) {
      await this.prisma.$transaction(async (tx) => {
        let arAccount = await tx.account.findFirst({
          where: {
            companyId,
            isGroup: false,
            deletedAt: null,
            name: { in: ['Accounts Receivable', 'Trade Receivables', 'Sundry Debtors'] }
          }
        });
        if (!arAccount) {
          arAccount = await tx.account.findFirst({
            where: { companyId, category: 'ASSET', isGroup: false, deletedAt: null, name: { contains: 'Receivable', mode: 'insensitive' } }
          });
        }
        if (!arAccount) {
          arAccount = await tx.account.create({
            data: { companyId, name: 'Accounts Receivable', category: 'ASSET', balance: 0, isGroup: false }
          });
        }

        let obAccount = await tx.account.findFirst({
          where: {
            companyId,
            isGroup: false,
            deletedAt: null,
            name: { in: ['Opening Balance Equity', 'Owner Equity', 'Retained Earnings'] }
          }
        });
        if (!obAccount) {
          obAccount = await tx.account.create({
            data: { companyId, name: 'Opening Balance Equity', category: 'EQUITY', balance: 0, isGroup: false }
          });
        }

        let debit = 0;
        let credit = 0;
        const amount = Number(item.openingBalanceAmount);

        if (item.openingBalanceType === 'RECEIVABLE' || item.openingBalanceType === 'DEBIT_BALANCE') {
          debit = amount;
        } else if (item.openingBalanceType === 'ADVANCE_RECEIVED' || item.openingBalanceType === 'CREDIT_BALANCE') {
          credit = amount;
        } else if (item.openingBalanceType === 'ON_ACCOUNT') {
          debit = amount; // Assuming default to debit for customers
        }

        if (debit > 0 || credit > 0) {
          await this.accountingEngine.postTransaction({
            companyId,
            date: item.openingBalanceDate || new Date(),
            reference: item.migrationReferenceNo || `OB-${item.bpCode}`,
            description: `Opening Balance for ${item.name}`,
            lines: [
              { accountId: arAccount.id, debit: debit > 0 ? debit : 0, credit: credit > 0 ? credit : 0 },
              { accountId: obAccount.id, debit: credit > 0 ? credit : 0, credit: debit > 0 ? debit : 0 },
            ]
          }, tx);
        }
      });
    }

    if (historicalInvoices && Array.isArray(historicalInvoices) && historicalInvoices.length > 0) {
      await this.prisma.historicalInvoice.createMany({
        data: historicalInvoices.map((inv: any) => ({
          companyId,
          businessPartnerId: item.id,
          invoiceNo: inv.invoiceNo,
          date: new Date(inv.date),
          dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
          totalAmount: Number(inv.totalAmount),
          amountPaid: Number(inv.amountPaid || 0),
          status: inv.status || 'UNPAID',
          reference: inv.reference,
          remarks: inv.remarks,
        }))
      });
    }

    return item;
  }

  async update(id: string, companyId: string, data: any) {
    const {
      name,
      customerCode,
      mobile,
      whatsapp,
      email,
      gstin,
      gstNumber,
      panNumber,
      gstRegistrationStatus,
      customerType,
      taxPreference,
      tradeName,
      address,
      pinCode,
      state,
      stateCode,
      placeOfSupply,
      creditLimit,
      customerSegmentId,
      customerDepartmentId,
    } = data;
    const existing = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: "CUSTOMER" }
    });
    
    if (!existing) {
      throw new NotFoundException("Customer not found");
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    
    if (customerCode !== undefined && customerCode !== existing.bpCode) {
      const existingCode = await this.prisma.businessPartner.findFirst({
        where: { companyId, bpCode: customerCode, deletedAt: null, bpType: "CUSTOMER", id: { not: id } }
      });
      if (existingCode) throw new BadRequestException("Customer Code already exists");
      updateData.bpCode = customerCode;
    }

    if (mobile !== undefined) updateData.phone = mobile;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (email !== undefined) updateData.email = email;
    
    const finalGstin = gstin !== undefined ? gstin : (gstNumber !== undefined ? gstNumber : undefined);
    if (finalGstin !== undefined && finalGstin !== existing.gstin && finalGstin !== null && finalGstin !== "") {
      const existingGst = await this.prisma.businessPartner.findFirst({
        where: { companyId, gstin: finalGstin, deletedAt: null, bpType: "CUSTOMER", id: { not: id } }
      });
      if (existingGst) throw new BadRequestException("GSTIN already exists for another customer");
      updateData.gstin = finalGstin;
    } else if (finalGstin === "" || finalGstin === null) {
      updateData.gstin = null;
    }

    if (panNumber !== undefined) updateData.panNumber = panNumber && panNumber.trim() ? panNumber.trim() : null;
    if (gstRegistrationStatus !== undefined) {
      updateData.gstRegistrationStatus = toGSTRegistrationStatus(gstRegistrationStatus);
      if (gstRegistrationStatus?.toUpperCase?.() === 'CONSUMER') {
        updateData.customerType = 'B2C';
      }
    }
    if (customerType !== undefined) {
      updateData.customerType = toCustomerType(customerType);
    }
    if (customerSegmentId !== undefined) {
      updateData.customerSegmentId = customerSegmentId && customerSegmentId.trim() ? customerSegmentId.trim() : null;
    }
    if (customerDepartmentId !== undefined) {
      updateData.customerDepartmentId = customerDepartmentId && customerDepartmentId.trim() ? customerDepartmentId.trim() : null;
    }
    if (taxPreference !== undefined) updateData.taxPreference = toTaxPreference(taxPreference) as any;
    if (tradeName !== undefined) updateData.tradeName = tradeName;
    if (address !== undefined) updateData.address = address;
    if (pinCode !== undefined) updateData.pinCode = pinCode;
    if (state !== undefined) updateData.state = state;
    if (stateCode !== undefined) updateData.stateCode = stateCode;
    if (placeOfSupply !== undefined) updateData.placeOfSupply = placeOfSupply;
    if (creditLimit !== undefined) updateData.creditLimit = Number(creditLimit);
    if (customerSegmentId !== undefined) updateData.customerSegmentId = customerSegmentId;
    if (customerDepartmentId !== undefined) updateData.customerDepartmentId = customerDepartmentId;

    if (Object.keys(updateData).length > 0) {
      const item = await this.prisma.businessPartner.update({
        where: { id },
        data: updateData,
      });
      return item;
    }
    
    return existing;
  }

  async remove(id: string, companyId: string) {
    const existing = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: "CUSTOMER" },
    });
    if (!existing) {
      throw new NotFoundException("Customer not found");
    }

    await this.prisma.businessPartner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
