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
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformGuard } from "./platform.guard";
import { PlatformService } from "./platform.service";

@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller("platform")
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get("companies")
  async getCompanies() {
    return this.platformService.getCompanies();
  }

  @Post("companies/:id/suspend")
  async toggleSuspend(@Param("id") id: string) {
    const status = await this.platformService.toggleSuspend(id);
    return { success: true, status };
  }

  @Delete("companies/:id")
  async deleteCompany(@Param("id") id: string) {
    await this.platformService.deleteCompany(id);
    return { success: true };
  }

  @Get("subscriptions")
  async getSubscriptions() {
    return this.platformService.getSubscriptions();
  }

  @Get("plans")
  async getPlans() {
    return this.platformService.getPlans();
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
    return this.platformService.createPlan(body);
  }

  @Get("users")
  async getUsers() {
    return this.platformService.getUsers();
  }

  @Put("users/:id")
  async updateUser(@Param("id") id: string, @Body() data: any) {
    return this.platformService.updateUser(id, data);
  }

  @Delete("users/:id")
  async deleteUser(@Param("id") id: string) {
    await this.platformService.deleteUser(id);
    return { success: true };
  }

  @Get("revenue")
  async getRevenue() {
    return this.platformService.getRevenue();
  }

  @Get("logs")
  async getLogs() {
    return this.platformService.getLogs();
  }

  @Get("settings")
  async getSettings() {
    return this.platformService.getSettings();
  }

  @Post("settings")
  async updateSettings(@Body() body: Record<string, string>) {
    await this.platformService.updateSettings(body);
    return { success: true };
  }
}

