import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('tableName') tableName?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
  ) {
    return this.auditLogsService.findAll({
      page: Number(page),
      limit: Number(limit),
      tableName,
      userId,
      action,
    });
  }
}
