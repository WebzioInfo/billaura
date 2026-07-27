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
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("inventory/categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.categoriesService.findAll(Object.keys(query).length > 0 ? query : undefined);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.create(body);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: UpdateCategoryDto) {
    return this.categoriesService.update(id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.categoriesService.remove(id);
  }

  @Post(":id/restore")
  async restore(@Param("id") id: string) {
    return this.categoriesService.restore(id);
  }
}
