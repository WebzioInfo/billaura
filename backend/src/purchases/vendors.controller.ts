import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { PrismaService } from "../database/prisma.service";
import { CompanyContext } from "../common/context/company-context";
import { SequenceService } from "../shared/sequence/sequence.service";

/**
 * Map frontend customerType labels to valid Prisma CustomerType enum values.
 * Frontend can send REGULAR / OVERSEAS which don't exist in the enum.
 */
function toCustomerType(value?: string): string {
  const allowed = ['B2B', 'B2C', 'GOVERNMENT', 'EXPORT'];
  if (value && allowed.includes(value.toUpperCase())) return value.toUpperCase();
  return 'B2B';
}

function toGSTRegistrationStatus(value?: string): string {
  const map: Record<string, string> = {
    REGULAR: "REGISTERED",
    OVERSEAS: "EXPORT",
    REGISTERED: "REGISTERED",
    UNREGISTERED: "UNREGISTERED",
    COMPOSITION: "COMPOSITION",
    SEZ: "SEZ",
    EXPORT: "EXPORT",
  };
  return map[value?.toUpperCase?.() || ""] || "UNREGISTERED";
}

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("vendors")
export class VendorsController {
  constructor(private prisma: PrismaService, private sequenceService: SequenceService) {}

  @Get()
  async findAll(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const companyId = CompanyContext.getCompanyId() as string;
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
      }),
      this.prisma.businessPartner.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        page: Math.max(parseInt(page || "1", 10), 1),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const item = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: "VENDOR" },
    });
    if (!item) {
      throw new NotFoundException("Vendor not found");
    }
    return { success: true, data: item };
  }

  @Post()
  async create(@Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;

    const {
      name,
      vendorCode,
      tradeName,
      email,
      phone,
      gstin,
      panNumber,
      gstRegistrationStatus,
      customerType,
      taxPreference,
      address,
      state,
      pinCode,
      notes,
    } = data;

    // --- Validation ---
    if (!name || !String(name).trim()) {
      throw new BadRequestException("Vendor name is required");
    }

    if (pinCode && pinCode.trim() && !/^\d{6}$/.test(String(pinCode).trim())) {
      throw new BadRequestException("PIN Code must be exactly 6 digits");
    }

    // Duplicate GSTIN check within tenant
    if (gstin && String(gstin).trim()) {
      const duplicate = await this.prisma.businessPartner.findFirst({
        where: {
          companyId,
          gstin: String(gstin).trim().toUpperCase(),
          deletedAt: null,
          bpType: "VENDOR",
        },
      });
      if (duplicate) {
        throw new BadRequestException(
          `A vendor with GSTIN "${String(gstin).trim().toUpperCase()}" already exists`,
        );
      }
    }

    const bpCode =
      vendorCode?.trim()?.toUpperCase() ||
      (await this.sequenceService.generateNextSequence(companyId, "VENDOR"));

    const item = await this.prisma.businessPartner.create({
      data: {
        name: String(name).trim(),
        bpCode,
        bpType: "VENDOR",
        tradeName: tradeName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        gstin: gstin?.trim()?.toUpperCase() || null,
        panNumber: panNumber?.trim()?.toUpperCase() || null,
        gstRegistrationStatus: toGSTRegistrationStatus(gstRegistrationStatus || customerType) as any,
        customerType: toCustomerType(customerType) as any,
        taxPreference: taxPreference || "TAXABLE",
        address: address?.trim() || null,
        state: state?.trim() || null,
        pinCode: pinCode?.trim() || null,
        notes: notes?.trim() || null,
        payableBalance: 0,
        companyId,
      },
    });

    return {
      success: true,
      data: item,
      message: "Vendor created successfully",
    };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;

    // Tenant ownership check
    const existing = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: "VENDOR" },
    });
    if (!existing) {
      throw new NotFoundException("Vendor not found");
    }

    const {
      name,
      vendorCode,
      tradeName,
      email,
      phone,
      gstin,
      panNumber,
      gstRegistrationStatus,
      customerType,
      taxPreference,
      address,
      state,
      pinCode,
      notes,
    } = data;

    if (pinCode && pinCode.trim() && !/^\d{6}$/.test(String(pinCode).trim())) {
      throw new BadRequestException("PIN Code must be exactly 6 digits");
    }

    // Duplicate GSTIN check (excluding self)
    if (gstin && String(gstin).trim()) {
      const duplicate = await this.prisma.businessPartner.findFirst({
        where: {
          companyId,
          gstin: String(gstin).trim().toUpperCase(),
          deletedAt: null,
          bpType: "VENDOR",
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new BadRequestException(
          `A vendor with GSTIN "${String(gstin).trim().toUpperCase()}" already exists`,
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (vendorCode !== undefined)
      updateData.bpCode = vendorCode?.trim()?.toUpperCase() || existing.bpCode;
    if (tradeName !== undefined) updateData.tradeName = tradeName?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (gstin !== undefined)
      updateData.gstin = gstin?.trim()?.toUpperCase() || null;
    if (panNumber !== undefined)
      updateData.panNumber = panNumber?.trim()?.toUpperCase() || null;
    if (gstRegistrationStatus !== undefined)
      updateData.gstRegistrationStatus = toGSTRegistrationStatus(gstRegistrationStatus) as any;
    if (customerType !== undefined) updateData.customerType = toCustomerType(customerType) as any;
    if (taxPreference !== undefined)
      updateData.taxPreference = taxPreference;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    if (pinCode !== undefined) updateData.pinCode = pinCode?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const item = await this.prisma.businessPartner.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      data: item,
      message: "Vendor updated successfully",
    };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;

    const existing = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: "VENDOR" },
    });
    if (!existing) {
      throw new NotFoundException("Vendor not found");
    }

    await this.prisma.businessPartner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: "Vendor deleted successfully" };
  }
}

