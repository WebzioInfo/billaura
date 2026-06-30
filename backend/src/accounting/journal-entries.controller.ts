import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JournalEntriesService } from './journal-entries.service';
import { CreateJournalEntryDto } from './dto/journal-entry.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.journalEntriesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.journalEntriesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateJournalEntryDto) {
    return this.journalEntriesService.create(dto);
  }
}
