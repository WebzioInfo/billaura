import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { CapitalService } from "./capital.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

export class CreateCapitalTransactionDto {
  @IsIn(["INTRODUCED", "DRAWING"])
  @IsNotEmpty()
  type: "INTRODUCED" | "DRAWING";

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  bankAccountId: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("capital")
export class CapitalController {
  constructor(private readonly capitalService: CapitalService) {}

  @Get()
  async getCapitalOverview() {
    return this.capitalService.getCapitalOverview();
  }

  @Post()
  async recordCapitalTransaction(@Body() dto: CreateCapitalTransactionDto) {
    return this.capitalService.recordCapitalTransaction(dto);
  }
}
