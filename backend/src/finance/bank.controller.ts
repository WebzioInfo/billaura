import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { BankService } from "./bank.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("finance/bank")
@UseGuards(JwtAuthGuard)
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get("accounts")
  findAllAccounts() {
    return this.bankService.findAllAccounts();
  }

  @Get("transactions")
  findAllTransactions() {
    return this.bankService.findAllTransactions();
  }

  @Get("stats")
  getDashboardStats() {
    return this.bankService.getDashboardStats();
  }

  @Post("accounts")
  createAccount(@Body() data: any) {
    return this.bankService.createAccount(data);
  }

  @Patch("accounts/:id")
  updateAccount(@Param("id") id: string, @Body() data: any) {
    return this.bankService.updateAccount(id, data);
  }

  @Delete("accounts/:id")
  deleteAccount(@Param("id") id: string) {
    return this.bankService.deleteAccount(id);
  }
}
