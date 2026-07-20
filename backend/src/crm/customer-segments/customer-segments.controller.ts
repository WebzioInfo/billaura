import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CustomerSegmentsService } from './customer-segments.service';
import { CreateCustomerSegmentDto } from './dto/create-customer-segment.dto';
import { UpdateCustomerSegmentDto } from './dto/update-customer-segment.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('customer-segments')
@UseGuards(JwtAuthGuard)
export class CustomerSegmentsController {
  constructor(private readonly customerSegmentsService: CustomerSegmentsService) {}

  @Post()
  create(@Body() createDto: CreateCustomerSegmentDto, @Req() req: any) {
    return this.customerSegmentsService.create(req.user.companyId, req.user.id, createDto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.customerSegmentsService.findAll(req.user.companyId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.customerSegmentsService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerSegmentDto,
    @Req() req: any,
  ) {
    return this.customerSegmentsService.update(id, req.user.companyId, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.customerSegmentsService.remove(id, req.user.companyId);
  }
}
