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
import { DeliveryNotesService } from "./delivery-notes.service";
import {
  CreateDeliveryNoteDto,
  UpdateDeliveryNoteDto,
} from "./dto/delivery-note.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("delivery-notes")
export class DeliveryNotesController {
  constructor(private readonly deliveryNotesService: DeliveryNotesService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.deliveryNotesService.findAll(query);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.deliveryNotesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateDeliveryNoteDto) {
    return this.deliveryNotesService.create(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateDeliveryNoteDto) {
    return this.deliveryNotesService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.deliveryNotesService.remove(id);
  }
}
