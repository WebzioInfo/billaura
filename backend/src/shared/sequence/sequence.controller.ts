import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SequenceService } from './sequence.service';

@UseGuards(JwtAuthGuard)
@Controller('sequences')
export class SequenceController {
  constructor(private readonly sequenceService: SequenceService) {}

  @Get('next/:documentType')
  async getNextSequence(@Request() req, @Param('documentType') documentType: string) {
    const nextSeq = await this.sequenceService.generateNextSequence(req.user.companyId, documentType);
    return { success: true, data: { nextSequence: nextSeq } };
  }

  @Get('config/:documentType')
  async getConfig(@Request() req, @Param('documentType') documentType: string) {
    const config = await this.sequenceService.getConfig(req.user.companyId, documentType);
    return { success: true, data: config };
  }

  @Post('config/:documentType')
  async updateConfig(@Request() req, @Param('documentType') documentType: string, @Body() data: any) {
    const config = await this.sequenceService.updateConfig(req.user.companyId, documentType, data);
    return { success: true, data: config };
  }
}
