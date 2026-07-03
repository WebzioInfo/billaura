import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SerialsService } from './serials.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('serials')
@UseGuards(JwtAuthGuard)
export class SerialsController {
  constructor(private readonly serialsService: SerialsService) {}

  @Post()
  create(@Body() createSerialDto: any) {
    return this.serialsService.create(createSerialDto);
  }

  @Get()
  findAll() {
    return this.serialsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serialsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSerialDto: any) {
    return this.serialsService.update(id, updateSerialDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serialsService.remove(id);
  }
}
