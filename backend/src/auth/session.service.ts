import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as crypto from 'crypto';

function parseUserAgent(userAgent?: string): { deviceName: string; browser: string; os: string } {
  if (!userAgent) {
    return { deviceName: 'Unknown Device', browser: 'Unknown Browser', os: 'Unknown OS' };
  }

  let os = 'Unknown OS';
  let browser = 'Unknown Browser';
  let deviceName = 'Desktop';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) { os = 'Android'; deviceName = 'Mobile'; }
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) { os = 'iOS'; deviceName = 'Mobile'; }

  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome') && !userAgent.includes('Chromium')) browser = 'Chrome';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Trident') || userAgent.includes('MSIE')) browser = 'Internet Explorer';
  
  if (userAgent.includes('Mobile')) {
    deviceName = 'Mobile Device';
  } else if (userAgent.includes('Tablet')) {
    deviceName = 'Tablet';
  }

  return { deviceName, browser, os };
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private generateToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createSession(userId: string, userAgent?: string, ipAddress?: string, companyId?: string, rememberMe: boolean = false): Promise<string> {
    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);
    
    // Sessions last 30 days if rememberMe, else 24 hours
    const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs);
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

  // Validate raw token, rotate token hash, update telemetry, and return new token + metadata
  async rotateSession(rawToken: string, userAgent?: string, ipAddress?: string): Promise<{ newRefreshToken: string; userId: string; companyId: string | null }> {
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
      throw new UnauthorizedException('Invalid or expired session');
    }

    const newRawToken = this.generateToken();
    const newTokenHash = this.hashToken(newRawToken);
    const { deviceName, browser, os } = parseUserAgent(userAgent);

    // Refresh extends session lifespan based on original duration
    const durationMs = (session.expiresAt.getTime() - session.createdAt.getTime()) > (24 * 60 * 60 * 1000) 
      ? 30 * 24 * 60 * 60 * 1000 
      : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs);

    // Compare-and-swap makes refresh rotation single-use even when two requests race.
    // A replayed token cannot overwrite the token produced by the first request.
    const rotated = await this.prisma.session.updateMany({
      where: { id: session.id, tokenHash, isRevoked: false },
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

    if (rotated.count !== 1) {
      throw new UnauthorizedException('Refresh token has already been used');
    }

    return {
      newRefreshToken: newRawToken,
      userId: session.userId,
      companyId: session.companyId,
    };
  }

  // Revoke a session by token
  async revokeSessionByToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.session.updateMany({
      where: { tokenHash },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  // List all active sessions for a user
  async listActiveSessions(userId: string) {
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

  // Revoke specific session by ID
  async revokeSessionById(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
      },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  // Revoke all active sessions for a user
  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }
}
