import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<CreateUnitDto>) {
    return this.unitsService.update(id, body);
  }

  @Delete('conversions/:id')
  async removeConversion(@Param('id') id: string) {
    return this.unitsService.removeConversion(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
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

