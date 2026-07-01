import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CapitalService } from './capital.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

export class CreateCapitalTransactionDto {
  type: 'INTRODUCED' | 'DRAWING';
  amount: number;
  bankAccountId: string;
  date: string;
  reference?: string;
  notes?: string;
}

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('capital')
export class CapitalController {
  constructor(private readonly capitalService: CapitalService) {}

  @Post()
  async recordCapitalTransaction(@Body() dto: CreateCapitalTransactionDto) {
    return this.capitalService.recordCapitalTransaction(dto);
  }
}
