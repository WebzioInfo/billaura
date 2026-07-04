import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { TaxGroupsService } from "./tax-groups.service";
import { CreateTaxGroupDto } from "./dto/tax-group.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";

@Controller("tax-groups")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaxGroupsController {
  constructor(private readonly taxGroupsService: TaxGroupsService) {}

  @Get()
  findAll() {
    return this.taxGroupsService.findAll();
  }

  @Post()
  create(@Body() createTaxGroupDto: CreateTaxGroupDto) {
    return this.taxGroupsService.create(createTaxGroupDto);
  }
}
