import { Controller, Get, UseGuards } from '@nestjs/common';
import { BankService } from './bank.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('finance/bank')
@UseGuards(JwtAuthGuard)
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get('accounts')
  findAllAccounts() {
    return this.bankService.findAllAccounts();
  }

  @Get('transactions')
  findAllTransactions() {
    return this.bankService.findAllTransactions();
  }

  @Get('stats')
  getDashboardStats() {
    return this.bankService.getDashboardStats();
  }
}
