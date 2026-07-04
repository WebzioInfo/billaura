import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Delete,
  Put,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformGuard } from "./platform.guard";
import { SubscriptionStatus } from "@prisma/client";

@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller("platform")
export class PlatformController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("companies")
  async getCompanies() {
    const companies = await this.prisma.company.findMany({
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        subscriptions: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return companies.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      legalName: c.legalName,
      status: c.status,
      createdAt: c.createdAt,
      userCount: c.users.length,
      users: c.users.map((u) => u.user),
      activePlan:
        c.subscriptions.find((s) => s.status === "ACTIVE")?.plan?.name ||
        "Free Trial",
    }));
  }

  @Post("companies/:id/suspend")
  async toggleSuspend(@Param("id") id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new Error("Company not found");
    }

    const newStatus = company.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    await this.prisma.company.update({
      where: { id },
      data: { status: newStatus as SubscriptionStatus },
    });

    // Also update subscriptions
    await this.prisma.subscription.updateMany({
      where: {
        companyId: id,
        status: company.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
      },
      data: { status: company.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" },
    });

    return { success: true, status: newStatus };
  }

  @Delete("companies/:id")
  async deleteCompany(@Param("id") id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new Error("Company not found");
    }

    // Relying on Prisma onDelete: Cascade to remove associated records
    await this.prisma.company.delete({
      where: { id },
    });

    return { success: true };
  }

  @Get("subscriptions")
  async getSubscriptions() {
    const subs = await this.prisma.subscription.findMany({
      include: {
        company: true,
        plan: true,
      },
      orderBy: { startDate: "desc" },
    });

    return subs.map((s) => ({
      id: s.id,
      companyName: s.company.companyName,
      planName: s.plan.name,
      price: Number(s.plan.price),
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
    }));
  }

  @Get("plans")
  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { price: "asc" },
    });
  }

  @Post("plans")
  async createPlan(
    @Body()
    body: {
      name: string;
      price: number;
      billingCycle: string;
      maxUsers: number;
      maxInvoices: number;
      maxCustomers: number;
    },
  ) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: body.name,
        price: body.price,
        billingCycle: body.billingCycle,
        maxUsers: body.maxUsers || 5,
        maxInvoices: body.maxInvoices || 100,
        maxCustomers: body.maxCustomers || 100,
      },
    });
  }

  @Get("users")
  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        globalRole: true,
        isActive: true,
        createdAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return users;
  }

  @Put("users/:id")
  async updateUser(@Param("id") id: string, @Body() data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");

    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        globalRole: data.globalRole,
      },
    });
  }

  @Delete("users/:id")
  async deleteUser(@Param("id") id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");

    if (user.globalRole === "SUPER_ADMIN") {
      const superAdmins = await this.prisma.user.count({
        where: { globalRole: "SUPER_ADMIN" },
      });
      if (superAdmins <= 1) {
        throw new Error("Cannot delete the last Super Admin");
      }
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  @Get("revenue")
  async getRevenue() {
    const invoices = await this.prisma.invoice.findMany({
      where: { status: "PAID", deletedAt: null },
      select: { grandTotal: true, date: true },
    });

    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.grandTotal),
      0,
    );
    const activeSubs = await this.prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true },
    });

    const mrr = activeSubs.reduce(
      (sum, sub) => sum + Number(sub.plan.price),
      0,
    );

    return {
      mrr,
      totalRevenue,
      transactionCount: invoices.length,
      monthlyHistory: [
        { month: "Jan", revenue: mrr * 0.8 },
        { month: "Feb", revenue: mrr * 0.9 },
        { month: "Mar", revenue: mrr * 0.95 },
        { month: "Apr", revenue: mrr },
        { month: "May", revenue: mrr * 1.05 },
        { month: "Jun", revenue: mrr * 1.1 },
      ],
    };
  }

  @Get("logs")
  async getLogs() {
    const logs = await this.prisma.platformActivityLog.findMany({
      include: {
        user: { select: { name: true, email: true } },
        company: { select: { companyName: true } },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return logs.map((l) => ({
      id: l.id,
      userName: l.user?.name || "System",
      userEmail: l.user?.email || "system@billaura.com",
      companyName: l.company?.companyName || "Platform",
      action: l.action,
      description: l.description,
      createdAt: l.createdAt,
    }));
  }

  @Get("settings")
  async getSettings() {
    const settings = await this.prisma.systemSetting.findMany();
    return settings.reduce(
      (acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  @Post("settings")
  async updateSettings(@Body() body: Record<string, string>) {
    for (const [key, value] of Object.entries(body)) {
      await this.prisma.systemSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
    return { success: true };
  }
}
