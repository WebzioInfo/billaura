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
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { CreateAccountDto, UpdateAccountDto, AccountLookupQueryDto } from "./dto/account.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("accounts")
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get("tree")
  async getTree() {
    return this.accountsService.getTree();
  }

  @Get("trial-balance")
  async getTrialBalance() {
    return this.accountsService.getTrialBalance();
  }

  @Get("profit-loss")
  async getProfitLoss() {
    return this.accountsService.getProfitLoss();
  }

  @Get("balance-sheet")
  async getBalanceSheet() {
    return this.accountsService.getBalanceSheet();
  }

  @Get("cash-flow")
  async getCashFlow() {
    return this.accountsService.getCashFlow();
  }

  @Get("lookup")
  async lookup(@Query() query: AccountLookupQueryDto) {
    return this.accountsService.lookup(query);
  }

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.accountsService.findAll(query);
  }

  @Get(":id/inquiry")
  async getLedgerInquiry(@Param("id") id: string, @Query() query: any) {
    return this.accountsService.getLedgerInquiry(id, query);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.accountsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.accountsService.remove(id);
  }
}
