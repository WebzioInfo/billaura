import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  UseGuards,
  Request,
  Headers,
  Ip,
  Param,
  Patch,
  UnauthorizedException,
  BadRequestException,
  Res,
  Req,
} from "@nestjs/common";
import { Response, Request as ExpressRequest } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { SessionService } from "./session.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import {
  BusinessDetailsDto,
  TaxDetailsDto,
  BranchSetupDto,
  SubscriptionDto,
} from "./dto/onboard.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { RefreshTokenDto } from "./dto/refresh.dto";

import { ConfigService } from "@nestjs/config";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  private getCookie(request: ExpressRequest, name: string): string | undefined {
    const prefix = `${name}=`;
    const cookie = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
  }

  private setSessionCookies(response: Response, refreshToken: string): void {
    const isProduction = this.configService.get<string>("NODE_ENV") === "production";
    const domain = this.configService.get<string>("COOKIE_DOMAIN") || undefined;
    const authPath = `/${this.configService.getOrThrow<string>("API_PREFIX")}/auth`;
    
    // Refresh token is locked to auth endpoint path for security
    response.cookie("ba_refresh", refreshToken, {
      secure: isProduction,
      sameSite: "lax" as const,
      path: authPath,
      domain,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true
    });
    
    // CSRF token is set on root path so frontend JavaScript can read it
    response.cookie("ba_csrf", require("crypto").randomBytes(32).toString("hex"), {
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/",
      domain,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: false
    });
  }

  private clearSessionCookies(response: Response): void {
    const domain = this.configService.get<string>("COOKIE_DOMAIN") || undefined;
    const authPath = `/${this.configService.getOrThrow<string>("API_PREFIX")}/auth`;
    response.clearCookie("ba_refresh", { path: authPath, domain });
    response.clearCookie("ba_csrf", { path: "/", domain });
  }

  private assertCsrf(request: ExpressRequest): void {
    const cookieToken = this.getCookie(request, "ba_csrf");
    const headerToken = request.headers["x-csrf-token"];
    if (!cookieToken || typeof headerToken !== "string" || cookieToken !== headerToken) {
      throw new BadRequestException("Invalid session request");
    }
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const safeUserAgent = userAgent ? userAgent.substring(0, 190) : undefined;
    const safeIp = ip ? ip.substring(0, 45) : undefined;
    const result = await this.authService.login(loginDto, safeUserAgent, safeIp);
    this.setSessionCookies(response, result.refreshToken);
    return result;
  }

  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.verifyEmail(verifyEmailDto);
    this.setSessionCookies(response, result.refreshToken);
    return result;
  }

  @Post("refresh")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: ExpressRequest,
    @Body() body: RefreshTokenDto,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.assertCsrf(request);
    
    // Accept refresh token from body OR cookie
    const refreshToken = body.refreshToken || this.getCookie(request, "ba_refresh");
    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token provided");
    }
    const safeUserAgent = userAgent ? userAgent.substring(0, 190) : undefined;
    const safeIp = ip ? ip.substring(0, 45) : undefined;
    const result = await this.authService.refreshTokens(refreshToken, safeUserAgent, safeIp);
    this.setSessionCookies(response, result.refreshToken);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: ExpressRequest, @Res({ passthrough: true }) response: Response) {
    this.assertCsrf(request);
    const refreshToken = this.getCookie(request, "ba_refresh");
    if (refreshToken) {
      await this.sessionService.revokeSessionByToken(refreshToken);
    }
    this.clearSessionCookies(response);
    return { success: true, message: "Session ended" };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Request() req: any) {
    await this.sessionService.revokeAllSessions(req.user.userId);
    return {
      success: true,
      message: "Logged out from all devices successfully",
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  async listSessions(@Request() req: any) {
    return this.sessionService.listActiveSessions(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("sessions/revoke/:id")
  async revokeSession(@Request() req: any, @Param("id") sessionId: string) {
    await this.sessionService.revokeSessionById(req.user.userId, sessionId);
    return { success: true, message: "Device session revoked" };
  }

  @UseGuards(JwtAuthGuard)
  @Post("onboard/business")
  @HttpCode(HttpStatus.OK)
  async onboardBusiness(@Request() req: any, @Body() dto: BusinessDetailsDto) {
    return this.authService.onboardBusinessDetails(req.user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("onboard/tax")
  @HttpCode(HttpStatus.OK)
  async onboardTax(@Request() req: any, @Body() dto: TaxDetailsDto) {
    return this.authService.onboardTaxDetails(req.user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("onboard/branch")
  @HttpCode(HttpStatus.OK)
  async onboardBranch(@Request() req: any, @Body() dto: BranchSetupDto) {
    return this.authService.onboardBranchSetup(req.user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("onboard/subscription")
  @HttpCode(HttpStatus.OK)
  async onboardSubscription(@Request() req: any, @Body() dto: SubscriptionDto) {
    return this.authService.onboardSubscription(req.user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("onboard/status")
  async getOnboardStatus(@Request() req: any) {
    return this.authService.getOnboardingStatus(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getProfile(@Request() req: any) {
    return this.authService.getProfileWithCompany(
      req.user.userId,
      req.user.tenantId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch("company")
  async updateCompany(@Request() req: any, @Body() dto: UpdateCompanyDto) {
    return this.authService.updateCompany(req.user.tenantId, dto);
  }

  @Post("resend-otp")
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body("email") email: string) {
    return this.authService.resendVerificationOtp(email);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body("email") email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post("verify-reset-otp")
  @HttpCode(HttpStatus.OK)
  async verifyResetOtp(@Body("email") email: string, @Body("otp") otp: string) {
    return this.authService.verifyResetOtp(email, otp);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
