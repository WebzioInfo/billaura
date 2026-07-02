import { Controller, Post, Body, HttpCode, HttpStatus, Get, Delete, UseGuards, Request, Headers, Ip, Param, Patch, Res, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { BusinessDetailsDto, TaxDetailsDto, BranchSetupDto, SubscriptionDto } from './dto/onboard.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  private async traceAwait<T>(
    requestId: string,
    name: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const startedAt = performance.now();
    console.log(`[${new Date().toISOString()}] [Req: ${requestId}] START ${name}`);
    try {
      const result = await operation();
      console.log(
        `[${new Date().toISOString()}] [Req: ${requestId}] END ${name} (${(performance.now() - startedAt).toFixed(2)} ms)`,
      );
      return result;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] [Req: ${requestId}] ERROR ${name} (${(performance.now() - startedAt).toFixed(2)} ms)`,
        error,
      );
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
    @Request() req: any,
  ) {
    const startTime = performance.now();
    const requestId = req.headers['x-request-id'] || 'unknown';
    console.log(`[${new Date().toISOString()}] [Req: ${requestId}] Entered auth controller for email: ${loginDto.email}`);

    const safeUserAgent = userAgent ? userAgent.substring(0, 190) : undefined;
    const safeIp = ip ? ip.substring(0, 45) : undefined;
    
    console.log(`[${new Date().toISOString()}] [Req: ${requestId}] Entering auth service (Duration: ${(performance.now() - startTime).toFixed(2)}ms)`);
    const result = await this.traceAwait(
      requestId,
      'AuthService.login',
      () => this.authService.login(loginDto, safeUserAgent, safeIp, requestId),
    );
    
    console.log(`[${new Date().toISOString()}] [Req: ${requestId}] Response sent successfully (Total Duration: ${(performance.now() - startTime).toFixed(2)}ms)`);
    return result;
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ) {
    const result = await this.traceAwait(
      'unknown',
      'AuthService.verifyEmail',
      () => this.authService.verifyEmail(verifyEmailDto),
    );
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const safeUserAgent = userAgent ? userAgent.substring(0, 190) : undefined;
    const safeIp = ip ? ip.substring(0, 45) : undefined;
    const result = await this.traceAwait(
      'unknown',
      'AuthService.refreshTokens',
      () => this.authService.refreshTokens(refreshToken, safeUserAgent, safeIp),
    );
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body('refreshToken') refreshToken: string,
  ) {
    if (refreshToken) {
      await this.traceAwait(
        'unknown',
        'SessionService.revokeSessionByToken',
        () => this.sessionService.revokeSessionByToken(refreshToken),
      );
    }
    return { success: true, message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Request() req: any,
  ) {
    await this.traceAwait(
      req.headers?.['x-request-id'] || 'unknown',
      'SessionService.revokeAllSessions',
      () => this.sessionService.revokeAllSessions(req.user.userId),
    );
    return { success: true, message: 'Logged out from all devices successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async listSessions(@Request() req: any) {
    return this.sessionService.listActiveSessions(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/revoke/:id')
  async revokeSession(@Request() req: any, @Param('id') sessionId: string) {
    await this.traceAwait(
      req.headers?.['x-request-id'] || 'unknown',
      'SessionService.revokeSessionById',
      () => this.sessionService.revokeSessionById(req.user.userId, sessionId),
    );
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

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body('email') email: string) {
    return this.authService.resendVerificationOtp(email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  async verifyResetOtp(@Body('email') email: string, @Body('otp') otp: string) {
    return this.authService.verifyResetOtp(email, otp);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: any) {
    return this.authService.resetPassword(dto);
  }
}
