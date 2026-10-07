import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JournalEntriesService } from "./journal-entries.service";
import { CreateJournalEntryDto } from "./dto/journal-entry.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("journal-entries")
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.journalEntriesService.findAll(query);
    return {
      success: true,
      message: "Journal entries retrieved successfully",
      ...result,
    };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.journalEntriesService.findOne(id);
    return {
      success: true,
      message: "Journal entry retrieved successfully",
      data,
    };
  }

  @Post()
  async create(@Body() dto: CreateJournalEntryDto) {
    const data = await this.journalEntriesService.create(dto);
    return {
      success: true,
      message: "Journal voucher posted successfully",
      data,
    };
  }
}
