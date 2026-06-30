import { Controller, Post, Body, HttpCode, HttpStatus, Get, Delete, UseGuards, Request, Headers, Ip, Param, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { BusinessDetailsDto, TaxDetailsDto, BranchSetupDto, SubscriptionDto } from './dto/onboard.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.login(loginDto, userAgent, ip);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refresh_token') refreshToken: string) {
    await this.sessionService.revokeSessionByToken(refreshToken);
    return { success: true, message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async listSessions(@Request() req: any) {
    return this.sessionService.listActiveSessions(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/revoke/:id')
  async revokeSession(@Request() req: any, @Param('id') sessionId: string) {
    await this.sessionService.revokeSessionById(req.user.userId, sessionId);
    return { success: true, message: 'Device session revoked' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboard/business')
  @HttpCode(HttpStatus.OK)
  async onboardBusiness(@Request() req: any, @Body() dto: BusinessDetailsDto) {
    return this.authService.onboardBusinessDetails(req.user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboard/tax')
  @HttpCode(HttpStatus.OK)
  async onboardTax(@Request() req: any, @Body() dto: TaxDetailsDto) {
    return this.authService.onboardTaxDetails(req.user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboard/branch')
  @HttpCode(HttpStatus.OK)
  async onboardBranch(@Request() req: any, @Body() dto: BranchSetupDto) {
    return this.authService.onboardBranchSetup(req.user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboard/subscription')
  @HttpCode(HttpStatus.OK)
  async onboardSubscription(@Request() req: any, @Body() dto: SubscriptionDto) {
    return this.authService.onboardSubscription(req.user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('onboard/status')
  async getOnboardStatus(@Request() req: any) {
    return this.authService.getOnboardingStatus(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return this.authService.getProfileWithCompany(req.user.userId, req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('company')
  async updateCompany(@Request() req: any, @Body() dto: any) {
    return this.authService.updateCompany(req.user.tenantId, dto);
  }
}
