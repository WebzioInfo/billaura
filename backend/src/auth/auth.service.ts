import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { BusinessDetailsDto, TaxDetailsDto, BranchSetupDto, SubscriptionDto } from './dto/onboard.dto';
import { BusinessType } from '@prisma/client';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    
    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (isMatch) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { email: loginDto.email },
      include: { companies: { include: { company: true } } }
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60 / 1000);
      throw new UnauthorizedException(`Account is temporarily locked. Try again in ${remainingTime} minutes.`);
    }
    
    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      // Record failed attempt
      const attempts = user.failedLoginAttempts + 1;
      const data: any = { failedLoginAttempts: attempts };
      
      if (attempts >= 5) {
        data.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data,
      });

      // Record to history
      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress,
          userAgent,
          status: 'FAILED',
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified. Please verify your OTP first.');
    }

    // Reset login failures on success
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    // Record login history
    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      },
    });

    // Create session & refresh token
    const refreshToken = await this.sessionService.createSession(user.id, userAgent, ipAddress);

    const firstCompanyUser = user.companies[0];
    const companyId = firstCompanyUser?.companyId || null;
    const companyRole = firstCompanyUser?.role || null;
    const onboardingStep = firstCompanyUser?.company?.onboardingStep || 'BUSINESS_DETAILS';

    const payload = { 
      email: user.email, 
      sub: user.id, 
      companyId: companyId,
      tenantId: companyId, // legacy support
      role: companyRole,
      onboardingStep: onboardingStep,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: companyId,
        tenantId: companyId,
        role: companyRole,
        onboardingStep: payload.onboardingStep,
      }
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: registerDto.email } });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    console.log(`\n======================================================`);
    console.log(`[OTP VERIFICATION] OTP for ${registerDto.email}: ${otp}`);
    console.log(`======================================================\n`);

    // Create the User first
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        name: `${registerDto.firstName} ${registerDto.lastName}`,
        emailVerified: false,
        otpCode: otp,
        otpExpiresAt,
        globalRole: 'COMPANY_OWNER',
      },
    });

    // Create the Company
    const domainPart = registerDto.email.split('@')[1];
    const uniqueId = Math.random().toString(36).substring(2, 7);
    const company = await this.prisma.company.create({
      data: {
        companyName: `${registerDto.firstName}'s Enterprise`,
        onboardingStep: 'BUSINESS_DETAILS',
      }
    });

    // Link user to company in CompanyUser table
    await this.prisma.companyUser.create({
      data: {
        companyId: company.id,
        userId: user.id,
        role: 'COMPANY_OWNER',
      }
    });

    return {
      message: 'Registration successful. Verification OTP sent.',
      email: user.email,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({ 
      where: { email: verifyEmailDto.email },
      include: { companies: { include: { company: true } } }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (!user.otpCode || user.otpCode !== verifyEmailDto.otp) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP code has expired');
    }

    // Mark verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      }
    });

    // Create session & refresh token
    const refreshToken = await this.sessionService.createSession(user.id);

    // Get the first linked company
    const firstCompanyUser = user.companies[0];
    const companyId = firstCompanyUser?.companyId || null;
    const companyRole = firstCompanyUser?.role || null;
    const onboardingStep = firstCompanyUser?.company?.onboardingStep || 'BUSINESS_DETAILS';

    // Sign first token
    const payload = { 
      email: user.email, 
      sub: user.id, 
      companyId: companyId,
      tenantId: companyId, // legacy support
      role: companyRole,
      onboardingStep,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId,
        tenantId: companyId,
        role: companyRole,
        onboardingStep,
      }
    };
  }

  async refreshTokens(refreshToken: string) {
    const userId = await this.sessionService.validateRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companies: { include: { company: true } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid session owner');
    }

    const firstCompanyUser = user.companies[0];
    const companyId = firstCompanyUser?.companyId || null;
    const companyRole = firstCompanyUser?.role || null;
    const onboardingStep = firstCompanyUser?.company?.onboardingStep || 'BUSINESS_DETAILS';

    const payload = { 
      email: user.email, 
      sub: user.id, 
      companyId: companyId,
      tenantId: companyId,
      role: companyRole,
      onboardingStep,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId,
        tenantId: companyId,
        role: companyRole,
        onboardingStep,
      }
    };
  }

  async onboardBusinessDetails(companyId: string, dto: BusinessDetailsDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        companyName: dto.companyName,
        businessType: dto.businessType as BusinessType,
        onboardingStep: 'TAX_DETAILS',
      }
    });

    return { onboardingStep: updated.onboardingStep };
  }

  async onboardTaxDetails(companyId: string, dto: TaxDetailsDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        gstin: dto.taxNumber,
        pan: dto.taxNumber.length === 15 ? dto.taxNumber.substring(2, 12) : null,
        onboardingStep: 'BRANCH_SETUP',
      }
    });

    return { onboardingStep: updated.onboardingStep };
  }

  async onboardBranchSetup(companyId: string, dto: BranchSetupDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        currency: dto.currency,
        onboardingStep: 'SUBSCRIPTION',
      }
    });

    // Create default financial year
    await this.prisma.financialYear.upsert({
      where: {
        companyId_name: {
          companyId: companyId,
          name: dto.branchName,
        }
      },
      update: {},
      create: {
        companyId: companyId,
        name: dto.branchName,
        startDate: new Date(dto.fiscalYearStart),
        endDate: new Date(dto.fiscalYearEnd),
        isActive: true,
      }
    });

    // Create a default Warehouse
    await this.prisma.warehouse.upsert({
      where: {
        companyId_name: {
          companyId: companyId,
          name: 'Main Warehouse',
        }
      },
      update: {},
      create: {
        companyId: companyId,
        name: 'Main Warehouse',
        isDefault: true,
      }
    });

    return { onboardingStep: updated.onboardingStep };
  }

  async onboardSubscription(companyId: string, dto: SubscriptionDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        status: 'ACTIVE',
        onboardingStep: 'COMPLETED',
      }
    });

    return { onboardingStep: updated.onboardingStep };
  }

  async getOnboardingStatus(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    return { onboardingStep: company.onboardingStep };
  }

  async getProfileWithCompany(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, globalRole: true, emailVerified: true },
    });
    const company = await this.prisma.company.findUnique({
      where: { id: tenantId },
    });
    return {
      ...user,
      companyId: tenantId,
      company,
    };
  }

  async updateCompany(companyId: string, data: any) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        companyName: data.companyName,
        legalName: data.legalName,
        gstin: data.gstin,
        pan: data.pan,
        email: data.email,
        phone: data.phone,
        address: data.address,
        state: data.state,
        country: data.country,
        currency: data.currency,
      },
    });
  }
}
