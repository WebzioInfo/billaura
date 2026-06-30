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
exports.SessionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const crypto = __importStar(require("crypto"));
function parseUserAgent(userAgent) {
    if (!userAgent) {
        return { deviceName: 'Unknown Device', browser: 'Unknown Browser', os: 'Unknown OS' };
    }
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';
    let deviceName = 'Desktop';
    if (userAgent.includes('Windows'))
        os = 'Windows';
    else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS'))
        os = 'macOS';
    else if (userAgent.includes('Linux'))
        os = 'Linux';
    else if (userAgent.includes('Android')) {
        os = 'Android';
        deviceName = 'Mobile';
    }
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        os = 'iOS';
        deviceName = 'Mobile';
    }
    if (userAgent.includes('Firefox'))
        browser = 'Firefox';
    else if (userAgent.includes('Chrome') && !userAgent.includes('Chromium'))
        browser = 'Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
        browser = 'Safari';
    else if (userAgent.includes('Edge'))
        browser = 'Edge';
    else if (userAgent.includes('Trident') || userAgent.includes('MSIE'))
        browser = 'Internet Explorer';
    if (userAgent.includes('Mobile')) {
        deviceName = 'Mobile Device';
    }
    else if (userAgent.includes('Tablet')) {
        deviceName = 'Tablet';
    }
    return { deviceName, browser, os };
}
let SessionService = class SessionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateToken() {
        return crypto.randomBytes(40).toString('hex');
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    async createSession(userId, userAgent, ipAddress, companyId) {
        const rawToken = this.generateToken();
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const { deviceName, browser, os } = parseUserAgent(userAgent);
        await this.prisma.session.create({
            data: {
                userId,
                companyId: companyId || null,
                tokenHash,
                userAgent,
                deviceName,
                browser,
                os,
                ipAddress,
                expiresAt,
                isRevoked: false,
            },
        });
        return rawToken;
    }
    async rotateSession(rawToken, userAgent, ipAddress) {
        const tokenHash = this.hashToken(rawToken);
        const session = await this.prisma.session.findUnique({
            where: { tokenHash },
            include: { user: true },
        });
        if (!session || session.isRevoked || session.expiresAt < new Date() || !session.user.isActive) {
            if (session && !session.isRevoked) {
                await this.prisma.session.update({
                    where: { id: session.id },
                    data: { isRevoked: true, revokedAt: new Date() },
                });
            }
            throw new common_1.UnauthorizedException('Invalid or expired session');
        }
        const newRawToken = this.generateToken();
        const newTokenHash = this.hashToken(newRawToken);
        const { deviceName, browser, os } = parseUserAgent(userAgent);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await this.prisma.session.update({
            where: { id: session.id },
            data: {
                tokenHash: newTokenHash,
                lastUsedAt: new Date(),
                expiresAt,
                ipAddress: ipAddress || session.ipAddress,
                userAgent: userAgent || session.userAgent,
                deviceName: deviceName || session.deviceName,
                browser: browser || session.browser,
                os: os || session.os,
            },
        });
        return {
            newRefreshToken: newRawToken,
            userId: session.userId,
            companyId: session.companyId,
        };
    }
    async revokeSessionByToken(rawToken) {
        const tokenHash = this.hashToken(rawToken);
        await this.prisma.session.updateMany({
            where: { tokenHash },
            data: { isRevoked: true, revokedAt: new Date() },
        });
    }
    async listActiveSessions(userId) {
        return this.prisma.session.findMany({
            where: {
                userId,
                isRevoked: false,
                expiresAt: { gt: new Date() },
            },
            select: {
                id: true,
                deviceName: true,
                browser: true,
                os: true,
                ipAddress: true,
                createdAt: true,
                expiresAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async revokeSessionById(userId, sessionId) {
        await this.prisma.session.updateMany({
            where: {
                id: sessionId,
                userId,
            },
            data: { isRevoked: true, revokedAt: new Date() },
        });
    }
    async revokeAllSessions(userId) {
        await this.prisma.session.updateMany({
            where: {
                userId,
                isRevoked: false,
            },
            data: { isRevoked: true, revokedAt: new Date() },
        });
    }
};
exports.SessionService = SessionService;
exports.SessionService = SessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SessionService);
//# sourceMappingURL=session.service.js.map