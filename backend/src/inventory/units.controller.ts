import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { UnitsService } from "./units.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("units")
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  async findAll() {
    return this.unitsService.findAll();
  }

  @Post()
  async create(
    @Body() body: { name: string; abbreviation: string; decimals?: number },
  ) {
    return this.unitsService.create(
      body.name,
      body.abbreviation,
      body.decimals ?? 2,
    );
  }
}
