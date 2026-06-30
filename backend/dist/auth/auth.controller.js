"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const session_service_1 = require("./session.service");
const login_dto_1 = require("./dto/login.dto");
const register_dto_1 = require("./dto/register.dto");
const verify_email_dto_1 = require("./dto/verify-email.dto");
const onboard_dto_1 = require("./dto/onboard.dto");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader)
        return cookies;
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
function setRefreshCookie(res, token) {
    res.cookie('refresh_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
    });
}
function clearRefreshCookie(res) {
    res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
}
let AuthController = class AuthController {
    authService;
    sessionService;
    constructor(authService, sessionService) {
        this.authService = authService;
        this.sessionService = sessionService;
    }
    async login(loginDto, userAgent, ip, res) {
        const result = await this.authService.login(loginDto, userAgent, ip);
        setRefreshCookie(res, result.refresh_token);
        const { refresh_token, ...responseBody } = result;
        return responseBody;
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async verifyEmail(verifyEmailDto, res) {
        const result = await this.authService.verifyEmail(verifyEmailDto);
        setRefreshCookie(res, result.refresh_token);
        const { refresh_token, ...responseBody } = result;
        return responseBody;
    }
    async refresh(req, userAgent, ip, res) {
        const cookies = parseCookies(req.headers.cookie);
        const refreshToken = cookies['refresh_token'];
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('No refresh token found');
        }
        const result = await this.authService.refreshTokens(refreshToken, userAgent, ip);
        setRefreshCookie(res, result.refresh_token);
        const { refresh_token, ...responseBody } = result;
        return responseBody;
    }
    async logout(req, res) {
        const cookies = parseCookies(req.headers.cookie);
        const refreshToken = cookies['refresh_token'];
        if (refreshToken) {
            await this.sessionService.revokeSessionByToken(refreshToken);
        }
        clearRefreshCookie(res);
        return { success: true, message: 'Logged out successfully' };
    }
    async logoutAll(req, res) {
        await this.sessionService.revokeAllSessions(req.user.userId);
        clearRefreshCookie(res);
        return { success: true, message: 'Logged out from all devices successfully' };
    }
    async listSessions(req) {
        return this.sessionService.listActiveSessions(req.user.userId);
    }
    async revokeSession(req, sessionId) {
        await this.sessionService.revokeSessionById(req.user.userId, sessionId);
        return { success: true, message: 'Device session revoked' };
    }
    async onboardBusiness(req, dto) {
        return this.authService.onboardBusinessDetails(req.user.tenantId, dto);
    }
    async onboardTax(req, dto) {
        return this.authService.onboardTaxDetails(req.user.tenantId, dto);
    }
    async onboardBranch(req, dto) {
        return this.authService.onboardBranchSetup(req.user.tenantId, dto);
    }
    async onboardSubscription(req, dto) {
        return this.authService.onboardSubscription(req.user.tenantId, dto);
    }
    async getOnboardStatus(req) {
        return this.authService.getOnboardingStatus(req.user.tenantId);
    }
    async getProfile(req) {
        return this.authService.getProfileWithCompany(req.user.userId, req.user.tenantId);
    }
    async updateCompany(req, dto) {
        return this.authService.updateCompany(req.user.tenantId, dto);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('user-agent')),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_email_dto_1.VerifyEmailDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Headers)('user-agent')),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('logout-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('sessions'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "listSessions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('sessions/revoke/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "revokeSession", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('onboard/business'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, onboard_dto_1.BusinessDetailsDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "onboardBusiness", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('onboard/tax'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, onboard_dto_1.TaxDetailsDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "onboardTax", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('onboard/branch'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, onboard_dto_1.BranchSetupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "onboardBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('onboard/subscription'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, onboard_dto_1.SubscriptionDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "onboardSubscription", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('onboard/status'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getOnboardStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('company'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateCompany", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        session_service_1.SessionService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map