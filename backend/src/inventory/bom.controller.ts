import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BomService } from './bom.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bom')
@UseGuards(JwtAuthGuard)
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Post()
  create(@Body() createBomDto: any) {
    return this.bomService.create(createBomDto);
  }

  @Get()
  findAll() {
    return this.bomService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bomService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBomDto: any) {
    return this.bomService.update(id, updateBomDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bomService.remove(id);
  }
}
