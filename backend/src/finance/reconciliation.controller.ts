import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('finance/reconciliation')
@UseGuards(JwtAuthGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('statements')
  findAllStatements() {
    return this.reconciliationService.findAllStatements();
  }

  @Get('statements/:id/lines')
  getStatementLines(@Param('id') id: string) {
    return this.reconciliationService.getStatementLines(id);
  }

  @Post('statements/:id/auto-match')
  autoReconcile(@Param('id') id: string) {
    return this.reconciliationService.autoReconcile(id);
  }
}
