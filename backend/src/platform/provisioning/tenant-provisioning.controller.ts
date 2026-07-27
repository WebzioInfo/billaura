import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { PlatformGuard } from '../platform.guard'; // Assume this exists and checks SUPER_ADMIN

@Controller('platform/tenants')
@UseGuards(PlatformGuard)
export class TenantProvisioningController {
  constructor(private readonly tenantProvisioningService: TenantProvisioningService) {}

  @Post('provision')
  async provisionTenant(@Body() dto: CreateTenantDto, @Req() req: any) {
    // Assuming the user is attached to req.user by an AuthGuard that runs before PlatformGuard
    const superAdminId = req.user?.userId || 'SYSTEM';
    
    const company = await this.tenantProvisioningService.provisionTenant(dto, superAdminId);
    
    return {
      success: true,
      message: 'Tenant and company provisioned successfully',
      data: company,
    };
  }
}
