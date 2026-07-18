import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { BrandsService, CreateBrandDto, UpdateBrandDto } from "./brands.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("inventory/brands")
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.brandsService.findAll(Object.keys(query).length > 0 ? query : undefined);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.brandsService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateBrandDto) {
    return this.brandsService.create(body);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: UpdateBrandDto) {
    return this.brandsService.update(id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.brandsService.remove(id);
  }

  @Post(":id/restore")
  async restore(@Param("id") id: string) {
    return this.brandsService.restore(id);
  }
}
