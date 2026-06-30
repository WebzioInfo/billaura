import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  // Generate a random cryptographically secure token
  private generateToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  // Hash the token using SHA-256 for secure storage
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Create an active session and return the raw refresh token
  async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);
    
    // Sessions last 7 days by default
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    return rawToken;
  }

  // Validate a raw refresh token and return the associated userId
  async validateRefreshToken(rawToken: string): Promise<string> {
    const tokenHash = this.hashToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date() || !session.user.isActive) {
      if (session && !session.isRevoked) {
        // Revoke expired sessions to keep DB clean
        await this.prisma.session.update({
          where: { id: session.id },
          data: { isRevoked: true },
        });
      }
      throw new UnauthorizedException('Invalid or expired session');
    }

    return session.userId;
  }

  // Revoke a session by token
  async revokeSessionByToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.session.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
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
        userAgent: true,
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
      data: { isRevoked: true },
    });
  }
}
