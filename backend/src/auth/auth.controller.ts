import { Controller, Post, Body, HttpCode, HttpStatus, Get, Delete, UseGuards, Request, Headers, Ip, Param, Patch, Res, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { BusinessDetailsDto, TaxDetailsDto, BranchSetupDto, SubscriptionDto } from './dto/onboard.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    if (name) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

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
    @Res({ passthrough: true }) res: Response,
  ) {
    const safeUserAgent = userAgent ? userAgent.substring(0, 190) : undefined;
    const safeIp = ip ? ip.substring(0, 45) : undefined;
    const result = await this.authService.login(loginDto, safeUserAgent, safeIp);
    setRefreshCookie(res, result.refresh_token);
    const { refresh_token, ...responseBody } = result;
    return responseBody;
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(verifyEmailDto);
    setRefreshCookie(res, result.refresh_token);
    const { refresh_token, ...responseBody } = result;
    return responseBody;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req: any,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }
    const safeUserAgent = userAgent ? userAgent.substring(0, 190) : undefined;
    const safeIp = ip ? ip.substring(0, 45) : undefined;
    const result = await this.authService.refreshTokens(refreshToken, safeUserAgent, safeIp);
    setRefreshCookie(res, result.refresh_token);
    const { refresh_token, ...responseBody } = result;
    return responseBody;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies['refresh_token'];
    if (refreshToken) {
      await this.sessionService.revokeSessionByToken(refreshToken);
    }
    clearRefreshCookie(res);
    return { success: true, message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.sessionService.revokeAllSessions(req.user.userId);
    clearRefreshCookie(res);
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
