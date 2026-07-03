import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { FixedAssetsService } from './fixed-assets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('accounting/fixed-assets')
@UseGuards(JwtAuthGuard)
export class FixedAssetsController {
  constructor(private readonly fixedAssetsService: FixedAssetsService) {}

  @Get()
  findAll() {
    return this.fixedAssetsService.findAll();
  }

  @Post()
  create(@Body() dto: any) {
    return this.fixedAssetsService.create(dto);
  }
}
