import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { SequenceService } from "../shared/sequence/sequence.service";
import { AccountingEngineService } from "../accounting/accounting-engine.service";
import { CreateVendorDto, UpdateVendorDto } from "./dto/vendor.dto";

/**
 * Map frontend customerType / gstTreatment labels to valid Prisma CustomerType enum values.
 */
function toCustomerType(value?: string): string {
  const allowed = ['B2B', 'B2C', 'GOVERNMENT', 'EXPORT'];
  if (value && allowed.includes(value.toUpperCase())) return value.toUpperCase();
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

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
    private accountingEngine: AccountingEngineService,
  ) {}

  private parseVendorNotes(notes?: string | null): Record<string, any> {
    if (!notes) return {};
    try {
      const parsed = JSON.parse(notes);
      return typeof parsed === 'object' && parsed !== null ? parsed : { remarks: notes };
    } catch {
      return { remarks: notes };
    }
  }

  private formatVendorResponse(partner: any, metadataOverride?: Record<string, any>) {
    const meta = metadataOverride || this.parseVendorNotes(partner.notes);
    return {
      ...partner,
      companyName: meta.companyName || partner.tradeName || '',
      salutation: meta.salutation || '',
      firstName: meta.firstName || '',
      lastName: meta.lastName || '',
      workPhone: meta.workPhone || '',
      mobile: meta.mobile || partner.phone || '',
      msmeRegistered: Boolean(meta.msmeRegistered),
      msmeRegNo: meta.msmeRegNo || '',
      currency: meta.currency || 'INR',
      paymentTerms: meta.paymentTerms || 'Due on Receipt',
      tdsTaxId: meta.tdsTaxId || '',
      billingAddress: meta.billingAddress || (partner.address ? {
        attention: '',
        country: 'India',
        street1: partner.address,
        street2: '',
        city: '',
        state: partner.state || '',
        pinCode: partner.pinCode || '',
        phone: partner.phone || '',
        fax: '',
      } : null),
      shippingAddress: meta.shippingAddress || null,
      contactPersons: Array.isArray(meta.contactPersons) && meta.contactPersons.length > 0
        ? meta.contactPersons
        : (partner.contacts || []).map((c: any) => ({
            salutation: '',
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email || '',
            workPhone: '',
            mobile: c.phone || '',
          })),
      bankAccounts: Array.isArray(meta.bankAccounts) ? meta.bankAccounts : [],
      customFields: meta.customFields || {},
      reportingTags: Array.isArray(meta.reportingTags) ? meta.reportingTags : [],
      remarks: meta.remarks || '',
      documents: Array.isArray(meta.documents) ? meta.documents : [],
      balance: Number(partner.payableBalance || 0),
      sourceOfSupply: partner.placeOfSupply || partner.state || '',
    };
  }

  async findAll(companyId: string, search?: string, page?: string, limit?: string) {
    const take = Math.min(parseInt(limit || "50", 10), 200);
    const skip = (Math.max(parseInt(page || "1", 10), 1) - 1) * take;

    const normalizedSearch = search?.trim();
    const where: any = {
      companyId,
      deletedAt: null,
      bpType: { in: ["VENDOR", "CUSTOMER_VENDOR"] },
    };
    if (normalizedSearch) {
      const containsSearch = { contains: normalizedSearch, mode: "insensitive" as const };
      where.OR = [
        { name: containsSearch },
        { tradeName: containsSearch },
        { bpCode: containsSearch },
        { email: containsSearch },
        { phone: containsSearch },
        { gstin: containsSearch },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.businessPartner.findMany({
        where,
        skip,
        take,
        orderBy: [{ name: "asc" }, { bpCode: "asc" }],
        include: {
          contacts: {
            where: { deletedAt: null },
          },
        },
      }),
      this.prisma.businessPartner.count({ where }),
    ]);

    const formattedItems = items.map((p) => this.formatVendorResponse(p));

    return {
      items: formattedItems,
      total,
      page: Math.max(parseInt(page || "1", 10), 1),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: { in: ["VENDOR", "CUSTOMER_VENDOR"] } },
      include: {
        contacts: {
          where: { deletedAt: null },
        },
      },
    });
    if (!item) {
      throw new NotFoundException("Vendor not found");
    }
    return this.formatVendorResponse(item);
  }

  async create(companyId: string, data: CreateVendorDto) {
    const {
      name,
      companyName,
      tradeName,
      vendorCode,
      salutation,
      firstName,
      lastName,
      email,
      phone,
      workPhone,
      mobile,
      gstTreatment,
      gstRegistrationStatus,
      customerType,
      taxPreference,
      gstin,
      panNumber,
      placeOfSupply,
      sourceOfSupply,
      state,
      pinCode,
      address,
      msmeRegistered,
      msmeRegNo,
      currency,
      openingBalanceType,
      openingBalanceAmount,
      openingBalanceDate,
      paymentTerms,
      tdsTaxId,
      billingAddress,
      shippingAddress,
      contactPersons,
      bankAccounts,
      customFields,
      reportingTags,
      remarks,
      notes,
      documents,
    } = data;

    // --- Validation ---
    if (!name || !String(name).trim()) {
      throw new BadRequestException("Vendor display name is required");
    }

    const trimmedGstin = gstin?.trim()?.toUpperCase() || null;
    const trimmedPan = panNumber?.trim()?.toUpperCase() || (trimmedGstin ? trimmedGstin.substring(2, 12) : null);

    if (trimmedGstin) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trimmedGstin)) {
        throw new BadRequestException("Invalid GSTIN format (must be 15 characters, e.g. 27AAAAA0000A1Z5)");
      }
      const duplicate = await this.prisma.businessPartner.findFirst({
        where: {
          companyId,
          gstin: trimmedGstin,
          deletedAt: null,
          bpType: "VENDOR",
        },
      });
      if (duplicate) {
        throw new BadRequestException(`A vendor with GSTIN "${trimmedGstin}" already exists`);
      }
    }

    if (trimmedPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmedPan)) {
      throw new BadRequestException("Invalid PAN format (must be 10 characters, e.g. ABCDE1234F)");
    }

    const effectivePin = (pinCode || billingAddress?.pinCode)?.trim() || null;
    if (effectivePin && !/^\d{6}$/.test(effectivePin)) {
      throw new BadRequestException("PIN Code must be exactly 6 digits");
    }

    const bpCode =
      vendorCode?.trim()?.toUpperCase() ||
      (await this.sequenceService.generateNextSequence(companyId, "VENDOR"));

    const effectiveCompanyName = (companyName || tradeName)?.trim() || null;
    const effectivePhone = (workPhone || mobile || phone)?.trim() || null;
    const effectivePlaceOfSupply = (placeOfSupply || sourceOfSupply || state || billingAddress?.state)?.trim() || null;
    const effectiveState = (state || billingAddress?.state)?.trim() || null;
    const effectiveAddress = (address || (billingAddress?.street1 ? `${billingAddress.street1}${billingAddress.street2 ? ', ' + billingAddress.street2 : ''}` : null))?.trim() || null;

    const obAmount = openingBalanceAmount ? Number(openingBalanceAmount) : 0;
    const obType = openingBalanceType || 'NONE';
    const initialPayableBalance = obType === 'CREDIT_BALANCE' || obType === 'PAYABLE'
      ? obAmount
      : obType === 'DEBIT_BALANCE' || obType === 'ADVANCE_PAID'
      ? -obAmount
      : 0;

    const metadata: Record<string, any> = {
      salutation: salutation || null,
      firstName: firstName || null,
      lastName: lastName || null,
      companyName: effectiveCompanyName,
      workPhone: workPhone || null,
      mobile: mobile || null,
      msmeRegistered: Boolean(msmeRegistered),
      msmeRegNo: msmeRegNo || null,
      currency: currency || 'INR',
      paymentTerms: paymentTerms || 'Due on Receipt',
      tdsTaxId: tdsTaxId || null,
      billingAddress: billingAddress || null,
      shippingAddress: shippingAddress || null,
      contactPersons: Array.isArray(contactPersons) ? contactPersons : [],
      bankAccounts: Array.isArray(bankAccounts) ? bankAccounts : [],
      customFields: customFields || {},
      reportingTags: Array.isArray(reportingTags) ? reportingTags : [],
      remarks: remarks || notes || null,
      documents: Array.isArray(documents) ? documents : [],
    };

    return this.prisma.$transaction(async (tx) => {
      const partner = await tx.businessPartner.create({
        data: {
          name: String(name).trim(),
          bpCode,
          bpType: "VENDOR",
          tradeName: effectiveCompanyName,
          email: email?.trim() || null,
          phone: effectivePhone,
          whatsapp: mobile?.trim() || null,
          gstin: trimmedGstin,
          panNumber: trimmedPan,
          gstRegistrationStatus: toGSTRegistrationStatus(gstRegistrationStatus || gstTreatment || customerType) as any,
          customerType: toCustomerType(customerType) as any,
          taxPreference: (taxPreference as any) || "TAXABLE",
          address: effectiveAddress,
          state: effectiveState,
          stateCode: trimmedGstin ? trimmedGstin.substring(0, 2) : null,
          placeOfSupply: effectivePlaceOfSupply,
          pinCode: effectivePin,
          notes: JSON.stringify(metadata),
          openingBalanceType: obType,
          openingBalanceAmount: obAmount,
          openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null,
          payableBalance: initialPayableBalance,
          companyId,
        },
      });

      // Synchronize Contact Persons to relational table
      if (Array.isArray(contactPersons) && contactPersons.length > 0) {
        for (const cp of contactPersons) {
          if (cp.firstName || cp.lastName || cp.email || cp.mobile || cp.workPhone) {
            await tx.contact.create({
              data: {
                companyId,
                businessPartnerId: partner.id,
                firstName: cp.firstName?.trim() || '',
                lastName: cp.lastName?.trim() || '',
                email: cp.email?.trim() || null,
                phone: (cp.mobile || cp.workPhone)?.trim() || null,
              },
            });
          }
        }
      }

      // Opening balance accounting entry
      if (obType !== 'NONE' && obAmount > 0) {
        await this.postVendorOpeningBalance(tx, companyId, partner);
      }

      return this.formatVendorResponse(partner, metadata);
    });
  }

  async update(id: string, companyId: string, data: UpdateVendorDto) {
    const existing = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: "VENDOR" },
      include: { contacts: true },
    });
    if (!existing) {
      throw new NotFoundException("Vendor not found");
    }

    const {
      name,
      companyName,
      tradeName,
      vendorCode,
      salutation,
      firstName,
      lastName,
      email,
      phone,
      workPhone,
      mobile,
      gstTreatment,
      gstRegistrationStatus,
      customerType,
      taxPreference,
      gstin,
      panNumber,
      placeOfSupply,
      sourceOfSupply,
      state,
      pinCode,
      address,
      msmeRegistered,
      msmeRegNo,
      currency,
      openingBalanceType,
      openingBalanceAmount,
      openingBalanceDate,
      paymentTerms,
      tdsTaxId,
      billingAddress,
      shippingAddress,
      contactPersons,
      bankAccounts,
      customFields,
      reportingTags,
      remarks,
      notes,
      documents,
    } = data;

    const trimmedGstin = gstin !== undefined ? (gstin?.trim()?.toUpperCase() || null) : existing.gstin;
    const trimmedPan = panNumber !== undefined
      ? (panNumber?.trim()?.toUpperCase() || null)
      : (trimmedGstin ? trimmedGstin.substring(2, 12) : existing.panNumber);

    if (trimmedGstin && trimmedGstin !== existing.gstin) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trimmedGstin)) {
        throw new BadRequestException("Invalid GSTIN format (must be 15 characters, e.g. 27AAAAA0000A1Z5)");
      }
      const duplicate = await this.prisma.businessPartner.findFirst({
        where: {
          companyId,
          gstin: trimmedGstin,
          deletedAt: null,
          bpType: "VENDOR",
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new BadRequestException(`A vendor with GSTIN "${trimmedGstin}" already exists`);
      }
    }

    if (trimmedPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmedPan)) {
      throw new BadRequestException("Invalid PAN format (must be 10 characters, e.g. ABCDE1234F)");
    }

    const effectivePin = (pinCode !== undefined ? pinCode : billingAddress?.pinCode)?.trim() || existing.pinCode;
    if (effectivePin && !/^\d{6}$/.test(effectivePin)) {
      throw new BadRequestException("PIN Code must be exactly 6 digits");
    }

    const existingMeta = this.parseVendorNotes(existing.notes);
    const effectiveCompanyName = (companyName || tradeName)?.trim() || existing.tradeName;
    const effectivePhone = (workPhone || mobile || phone)?.trim() || existing.phone;
    const effectivePlaceOfSupply = (placeOfSupply || sourceOfSupply || state || billingAddress?.state)?.trim() || existing.placeOfSupply;
    const effectiveState = (state || billingAddress?.state)?.trim() || existing.state;
    const effectiveAddress = (address || (billingAddress?.street1 ? `${billingAddress.street1}${billingAddress.street2 ? ', ' + billingAddress.street2 : ''}` : null))?.trim() || existing.address;

    const updatedMetadata: Record<string, any> = {
      ...existingMeta,
      salutation: salutation !== undefined ? salutation : existingMeta.salutation,
      firstName: firstName !== undefined ? firstName : existingMeta.firstName,
      lastName: lastName !== undefined ? lastName : existingMeta.lastName,
      companyName: effectiveCompanyName,
      workPhone: workPhone !== undefined ? workPhone : existingMeta.workPhone,
      mobile: mobile !== undefined ? mobile : existingMeta.mobile,
      msmeRegistered: msmeRegistered !== undefined ? Boolean(msmeRegistered) : existingMeta.msmeRegistered,
      msmeRegNo: msmeRegNo !== undefined ? msmeRegNo : existingMeta.msmeRegNo,
      currency: currency !== undefined ? currency : existingMeta.currency || 'INR',
      paymentTerms: paymentTerms !== undefined ? paymentTerms : existingMeta.paymentTerms || 'Due on Receipt',
      tdsTaxId: tdsTaxId !== undefined ? tdsTaxId : existingMeta.tdsTaxId,
      billingAddress: billingAddress !== undefined ? billingAddress : existingMeta.billingAddress,
      shippingAddress: shippingAddress !== undefined ? shippingAddress : existingMeta.shippingAddress,
      contactPersons: contactPersons !== undefined ? contactPersons : existingMeta.contactPersons || [],
      bankAccounts: bankAccounts !== undefined ? bankAccounts : existingMeta.bankAccounts || [],
      customFields: customFields !== undefined ? customFields : existingMeta.customFields || {},
      reportingTags: reportingTags !== undefined ? reportingTags : existingMeta.reportingTags || [],
      remarks: remarks !== undefined ? remarks : (notes !== undefined ? notes : existingMeta.remarks),
      documents: documents !== undefined ? documents : existingMeta.documents || [],
    };

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        name: name !== undefined ? String(name).trim() : existing.name,
        tradeName: effectiveCompanyName,
        email: email !== undefined ? (email?.trim() || null) : existing.email,
        phone: effectivePhone,
        whatsapp: mobile !== undefined ? (mobile?.trim() || null) : existing.whatsapp,
        gstin: trimmedGstin,
        panNumber: trimmedPan,
        address: effectiveAddress,
        state: effectiveState,
        stateCode: trimmedGstin ? trimmedGstin.substring(0, 2) : existing.stateCode,
        placeOfSupply: effectivePlaceOfSupply,
        pinCode: effectivePin,
        notes: JSON.stringify(updatedMetadata),
      };

      if (vendorCode !== undefined) {
        updateData.bpCode = vendorCode?.trim()?.toUpperCase() || existing.bpCode;
      }
      if (gstRegistrationStatus !== undefined || gstTreatment !== undefined) {
        updateData.gstRegistrationStatus = toGSTRegistrationStatus(gstRegistrationStatus || gstTreatment) as any;
      }
      if (customerType !== undefined) {
        updateData.customerType = toCustomerType(customerType) as any;
      }
      if (taxPreference !== undefined) {
        updateData.taxPreference = taxPreference as any;
      }
      if (openingBalanceType !== undefined) {
        updateData.openingBalanceType = openingBalanceType;
      }
      if (openingBalanceAmount !== undefined) {
        updateData.openingBalanceAmount = Number(openingBalanceAmount);
      }
      if (openingBalanceDate !== undefined) {
        updateData.openingBalanceDate = openingBalanceDate ? new Date(openingBalanceDate) : null;
      }

      const partner = await tx.businessPartner.update({
        where: { id },
        data: updateData,
      });

      // Synchronize Contact Persons
      if (Array.isArray(contactPersons)) {
        await tx.contact.deleteMany({
          where: { businessPartnerId: id, companyId },
        });
        for (const cp of contactPersons) {
          if (cp.firstName || cp.lastName || cp.email || cp.mobile || cp.workPhone) {
            await tx.contact.create({
              data: {
                companyId,
                businessPartnerId: id,
                firstName: cp.firstName?.trim() || '',
                lastName: cp.lastName?.trim() || '',
                email: cp.email?.trim() || null,
                phone: (cp.mobile || cp.workPhone)?.trim() || null,
              },
            });
          }
        }
      }

      return this.formatVendorResponse(partner, updatedMetadata);
    });
  }

  async remove(id: string, companyId: string) {
    const existing = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: "VENDOR" },
    });
    if (!existing) {
      throw new NotFoundException("Vendor not found");
    }

    // Safety checks against deleting vendors with existing financial transactions or balances
    const payableBal = Number(existing.payableBalance || 0);
    if (Math.abs(payableBal) > 0.01) {
      throw new BadRequestException(
        `Cannot delete vendor "${existing.name}" because they have an active outstanding balance of ₹${payableBal.toFixed(2)}. Please settle this balance before deleting.`
      );
    }

    const [purchaseCount, invoiceCount, poCount, paymentCount] = await Promise.all([
      this.prisma.purchase.count({
        where: { businessPartnerId: id, companyId, deletedAt: null },
      }),
      this.prisma.invoice.count({
        where: { businessPartnerId: id, companyId, deletedAt: null },
      }),
      this.prisma.purchaseOrder.count({
        where: { businessPartnerId: id, companyId, deletedAt: null },
      }),
      this.prisma.transactionPayment.count({
        where: { businessPartnerId: id, companyId },
      }),
    ]);

    if (purchaseCount > 0 || invoiceCount > 0 || poCount > 0 || paymentCount > 0) {
      const reasons: string[] = [];
      if (purchaseCount > 0 || invoiceCount > 0) reasons.push(`${purchaseCount + invoiceCount} bill(s)`);
      if (poCount > 0) reasons.push(`${poCount} purchase order(s)`);
      if (paymentCount > 0) reasons.push(`${paymentCount} payment record(s)`);

      throw new BadRequestException(
        `Cannot delete vendor "${existing.name}" because they are referenced in ${reasons.join(', ')}. To preserve financial audit integrity, please void or reassign related documents first.`
      );
    }

    await this.prisma.businessPartner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async postVendorOpeningBalance(tx: any, companyId: string, partner: any) {
    const amount = Number(partner.openingBalanceAmount || 0);
    if (amount <= 0) return;

    let apAccount = await tx.account.findFirst({
      where: { companyId, name: { in: ['Accounts Payable', 'Trade Creditors'] } },
    });
    if (!apAccount) {
      apAccount = await tx.account.create({
        data: { companyId, name: 'Accounts Payable', category: 'LIABILITY', balance: 0 },
      });
    }

    let obAccount = await tx.account.findFirst({
      where: { companyId, name: { in: ['Opening Balance Equity', 'Opening Balance Offset'] } },
    });
    if (!obAccount) {
      obAccount = await tx.account.create({
        data: { companyId, name: 'Opening Balance Equity', category: 'EQUITY', balance: 0 },
      });
    }

    const isCredit = partner.openingBalanceType === 'CREDIT_BALANCE' || partner.openingBalanceType === 'PAYABLE';
    const isDebit = partner.openingBalanceType === 'DEBIT_BALANCE' || partner.openingBalanceType === 'ADVANCE_PAID';

    if (isCredit) {
      await this.accountingEngine.postTransaction({
        companyId,
        date: partner.openingBalanceDate || new Date(),
        reference: `VOB-${partner.bpCode}`,
        description: `Opening Balance (Payable) for ${partner.name}`,
        lines: [
          { accountId: obAccount.id, debit: amount, credit: 0 },
          { accountId: apAccount.id, debit: 0, credit: amount },
        ],
      }, tx);
    } else if (isDebit) {
      await this.accountingEngine.postTransaction({
        companyId,
        date: partner.openingBalanceDate || new Date(),
        reference: `VOB-${partner.bpCode}`,
        description: `Opening Balance (Advance) for ${partner.name}`,
        lines: [
          { accountId: apAccount.id, debit: amount, credit: 0 },
          { accountId: obAccount.id, debit: 0, credit: amount },
        ],
      }, tx);
    }
  }
}
