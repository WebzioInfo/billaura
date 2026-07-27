import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { UnitsService, CreateUnitDto, CreateUnitConversionDto } from './units.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  async findAll() {
    return this.unitsService.findAll();
  }

  @Post()
  async create(@Body() body: CreateUnitDto) {
    return this.unitsService.create(body);
  }

  @Get('conversions')
  async getConversions() {
    return this.unitsService.getConversions();
  }

  @Post('conversions')
  async createConversion(@Body() body: CreateUnitConversionDto) {
    return this.unitsService.createConversion(body);
  }

  @Post('convert')
  async convertQuantity(
    @Body() body: { qty: number; fromUnit: string; toUnit: string }
  ) {
    const converted = await this.unitsService.convertQuantity(
      Number(body.qty),
      body.fromUnit,
      body.toUnit
    );
    return {
      qty: body.qty,
      fromUnit: body.fromUnit,
      toUnit: body.toUnit,
      convertedQty: converted,
    };
  }
}
