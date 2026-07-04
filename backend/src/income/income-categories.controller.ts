import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from "@nestjs/common";
import { IncomeCategoriesService } from "./income-categories.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("income-categories")
@UseGuards(JwtAuthGuard)
export class IncomeCategoriesController {
  constructor(private readonly categoriesService: IncomeCategoriesService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.categoriesService.findAll(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: any, @Param("id") id: string) {
    return this.categoriesService.findOne(req.user.companyId, id);
  }

  @Post()
  create(@Request() req: any, @Body() data: any) {
    return this.categoriesService.create(req.user.companyId, data);
  }

  @Patch(":id")
  update(@Request() req: any, @Param("id") id: string, @Body() data: any) {
    return this.categoriesService.update(req.user.companyId, id, data);
  }

  @Delete(":id")
  remove(@Request() req: any, @Param("id") id: string) {
    return this.categoriesService.remove(req.user.companyId, id);
  }
}
