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
import { OtherIncomesService } from "./other-incomes.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("other-incomes")
@UseGuards(JwtAuthGuard)
export class OtherIncomesController {
  constructor(private readonly otherIncomesService: OtherIncomesService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.otherIncomesService.findAll(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: any, @Param("id") id: string) {
    return this.otherIncomesService.findOne(req.user.companyId, id);
  }

  @Post()
  create(@Request() req: any, @Body() data: any) {
    return this.otherIncomesService.create(req.user.companyId, data);
  }

  @Patch(":id")
  update(@Request() req: any, @Param("id") id: string, @Body() data: any) {
    return this.otherIncomesService.update(req.user.companyId, id, data);
  }

  @Delete(":id")
  remove(@Request() req: any, @Param("id") id: string) {
    return this.otherIncomesService.remove(req.user.companyId, id);
  }
}
