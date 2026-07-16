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

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("customers")
export class CustomersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query("search") search: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const where: any = { companyId, deletedAt: null, bpType: "CUSTOMER" };
    if (search) {
      where.name = { contains: search };
    }
    const items = await this.prisma.businessPartner.findMany({ 
      where,
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: { items } };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
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
        }
      }
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return { success: true, data: customer };
  }

  @Get(":id/ledger")
  async getLedger(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const customer = await this.prisma.businessPartner.findFirst({
      where: { id, companyId, deletedAt: null, bpType: "CUSTOMER" }
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { businessPartnerId: id, companyId, status: { not: "CANCELLED" } },
      orderBy: { date: 'desc' },
    });

    const payments = await this.prisma.transactionPayment.findMany({
      where: { businessPartnerId: id, companyId },
      orderBy: { date: 'desc' },
    });

    const transactions = [
      ...invoices.map(inv => ({
        id: inv.id,
        date: inv.date,
        type: 'INVOICE',
        reference: inv.invoiceNo,
        amount: Number(inv.grandTotal),
        balanceImpact: Number(inv.grandTotal)
      })),
      ...payments.map(pay => ({
        id: pay.id,
        date: pay.date,
        type: 'PAYMENT',
        reference: pay.paymentNo,
        amount: Number(pay.amount),
        balanceImpact: -Number(pay.amount)
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { 
      success: true, 
      data: {
        transactions,
        receivableBalance: customer.receivableBalance
      } 
    };
  }

  @Get(":id/analytics")
  async getAnalytics(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    
    const invoices = await this.prisma.invoice.findMany({
      where: { businessPartnerId: id, companyId, status: { not: "CANCELLED" } }
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
    const invoiceCount = invoices.length;
    const averageInvoiceValue = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;

    return {
      success: true,
      data: {
        totalRevenue,
        invoiceCount,
        averageInvoiceValue
      }
    };
  }

  @Get(":id/history")
  async getHistory(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const history = await this.prisma.crmActivity.findMany({
      where: { businessPartnerId: id, companyId },
      orderBy: { createdAt: 'desc' }
    });
    
    return { success: true, data: history };
  }

  @Post()
  async create(@Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const {
      name,
      customerCode,
      mobile,
      whatsapp,
      email,
      gstin,
      gstNumber,
      panNumber,
      customerType,
      tradeName,
      address,
      pinCode,
      state,
      stateCode,
      placeOfSupply,
      creditLimit,
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
      finalBpCode = "CUST-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    }

    const item = await this.prisma.businessPartner.create({
      data: {
        name,
        bpCode: finalBpCode,
        bpType: "CUSTOMER",
        phone: mobile,
        whatsapp,
        email,
        gstin: gstin || gstNumber,
        panNumber,
        customerType: customerType || "UNREGISTERED",
        tradeName,
        address,
        pinCode,
        state,
        stateCode,
        placeOfSupply,
        creditLimit: creditLimit ? Number(creditLimit) : 0,
        companyId,
      },
    });
    return { success: true, data: item, id: item.id };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const {
      name,
      customerCode,
      mobile,
      whatsapp,
      email,
      gstin,
      gstNumber,
      panNumber,
      customerType,
      tradeName,
      address,
      pinCode,
      state,
      stateCode,
      placeOfSupply,
      creditLimit,
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

    if (panNumber !== undefined) updateData.panNumber = panNumber;
    if (customerType !== undefined) updateData.customerType = customerType;
    if (tradeName !== undefined) updateData.tradeName = tradeName;
    if (address !== undefined) updateData.address = address;
    if (pinCode !== undefined) updateData.pinCode = pinCode;
    if (state !== undefined) updateData.state = state;
    if (stateCode !== undefined) updateData.stateCode = stateCode;
    if (placeOfSupply !== undefined) updateData.placeOfSupply = placeOfSupply;
    if (creditLimit !== undefined) updateData.creditLimit = Number(creditLimit);

    if (Object.keys(updateData).length > 0) {
      const item = await this.prisma.businessPartner.update({
        where: { id },
        data: updateData,
      });
      return { success: true, data: item };
    }
    
    return { success: true, data: existing };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    await this.prisma.businessPartner.updateMany({
      where: { id, companyId, deletedAt: null, bpType: "CUSTOMER" },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
