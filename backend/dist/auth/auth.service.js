"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../database/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const session_service_1 = require("./session.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    sessionService;
    constructor(prisma, jwtService, sessionService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.sessionService = sessionService;
    }
    async validateUser(email, pass) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            return null;
        const isMatch = await bcrypt.compare(pass, user.passwordHash);
        if (isMatch) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }
    async login(loginDto, userAgent, ipAddress) {
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email },
            include: { companies: { include: { company: true } } }
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            const remainingTime = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60 / 1000);
            throw new common_1.UnauthorizedException(`Account is temporarily locked. Try again in ${remainingTime} minutes.`);
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('User account is disabled');
        }
        const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isMatch) {
            const attempts = user.failedLoginAttempts + 1;
            const data = { failedLoginAttempts: attempts };
            if (attempts >= 5) {
                data.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
            }
            await this.prisma.user.update({
                where: { id: user.id },
                data,
            });
            await this.prisma.loginHistory.create({
                data: {
                    userId: user.id,
                    ipAddress,
                    userAgent,
                    status: 'FAILED',
                },
            });
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.emailVerified) {
            throw new common_1.UnauthorizedException('Email not verified. Please verify your OTP first.');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockoutUntil: null,
            },
        });
        await this.prisma.loginHistory.create({
            data: {
                userId: user.id,
                ipAddress,
                userAgent,
                status: 'SUCCESS',
            },
        });
        const refreshToken = await this.sessionService.createSession(user.id, userAgent, ipAddress);
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
    async register(registerDto) {
        const existingUser = await this.prisma.user.findUnique({ where: { email: registerDto.email } });
        if (existingUser) {
            throw new common_1.ConflictException('User already exists');
        }
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(registerDto.password, salt);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        console.log(`\n======================================================`);
        console.log(`[OTP VERIFICATION] OTP for ${registerDto.email}: ${otp}`);
        console.log(`======================================================\n`);
        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                passwordHash,
                name: `${registerDto.firstName} ${registerDto.lastName}`,
                emailVerified: false,
                otpCode: otp,
                otpExpiresAt,
                globalRole: 'ADMIN',
            },
        });
        const domainPart = registerDto.email.split('@')[1];
        const uniqueId = Math.random().toString(36).substring(2, 7);
        const company = await this.prisma.company.create({
            data: {
                companyName: `${registerDto.firstName}'s Enterprise`,
                onboardingStep: 'BUSINESS_DETAILS',
            }
        });
        await this.prisma.companyUser.create({
            data: {
                companyId: company.id,
                userId: user.id,
                role: 'ADMIN',
            }
        });
        return {
            message: 'Registration successful. Verification OTP sent.',
            email: user.email,
        };
    }
    async verifyEmail(verifyEmailDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: verifyEmailDto.email },
            include: { companies: { include: { company: true } } }
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.emailVerified) {
            throw new common_1.BadRequestException('Email already verified');
        }
        if (!user.otpCode || user.otpCode !== verifyEmailDto.otp) {
            throw new common_1.BadRequestException('Invalid OTP code');
        }
        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            throw new common_1.BadRequestException('OTP code has expired');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                otpCode: null,
                otpExpiresAt: null,
            }
        });
        const refreshToken = await this.sessionService.createSession(user.id);
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
    async refreshTokens(refreshToken) {
        const userId = await this.sessionService.validateRefreshToken(refreshToken);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { companies: { include: { company: true } } },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid session owner');
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
    async onboardBusinessDetails(companyId, dto) {
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        const updated = await this.prisma.company.update({
            where: { id: companyId },
            data: {
                companyName: dto.companyName,
                businessType: dto.businessType,
                onboardingStep: 'TAX_DETAILS',
            }
        });
        return { onboardingStep: updated.onboardingStep };
    }
    async onboardTaxDetails(companyId, dto) {
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
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
    async onboardBranchSetup(companyId, dto) {
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        const updated = await this.prisma.company.update({
            where: { id: companyId },
            data: {
                currency: dto.currency,
                onboardingStep: 'SUBSCRIPTION',
            }
        });
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
    async onboardSubscription(companyId, dto) {
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        const updated = await this.prisma.company.update({
            where: { id: companyId },
            data: {
                status: 'ACTIVE',
                onboardingStep: 'COMPLETED',
            }
        });
        return { onboardingStep: updated.onboardingStep };
    }
    async getOnboardingStatus(companyId) {
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        return { onboardingStep: company.onboardingStep };
    }
    async getProfileWithCompany(userId, tenantId) {
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
    async updateCompany(companyId, data) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        session_service_1.SessionService])
], AuthService);
//# sourceMappingURL=auth.service.js.map