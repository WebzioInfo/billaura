import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { BatchesService } from "./batches.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@Controller("batches")
@UseGuards(JwtAuthGuard, TenantGuard)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  create(@Body() createBatchDto: any) {
    return this.batchesService.create(createBatchDto);
  }

  @Get()
  findAll() {
    return this.batchesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.batchesService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateBatchDto: any) {
    return this.batchesService.update(id, updateBatchDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.batchesService.remove(id);
  }
}
