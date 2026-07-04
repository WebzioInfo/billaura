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
import { CostCentersService } from "./cost-centers.service";
import {
  CreateCostCenterDto,
  UpdateCostCenterDto,
} from "./dto/cost-center.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("cost-centers")
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.costCentersService.findAll(query);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.costCentersService.findOne(id);
  }

  @Post()
  async create(@Body() createCostCenterDto: CreateCostCenterDto) {
    return this.costCentersService.create(createCostCenterDto);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateCostCenterDto: UpdateCostCenterDto,
  ) {
    return this.costCentersService.update(id, updateCostCenterDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.costCentersService.remove(id);
  }
}
