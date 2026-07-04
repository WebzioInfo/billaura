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
import { CrmActivitiesService } from "./crm-activities.service";
import { CreateActivityDto, UpdateActivityDto } from "./dto/activity.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("crm/activities")
export class CrmActivitiesController {
  constructor(private readonly crmActivitiesService: CrmActivitiesService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.crmActivitiesService.findAll(query);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.crmActivitiesService.findOne(id);
  }

  @Post()
  async create(@Body() createActivityDto: CreateActivityDto) {
    return this.crmActivitiesService.create(createActivityDto);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return this.crmActivitiesService.update(id, updateActivityDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.crmActivitiesService.remove(id);
  }
}
