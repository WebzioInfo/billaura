import { ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { TenantGuard } from './tenant.guard';
import { PlatformGuard } from '../../platform/platform.guard';
import { TenantContextMiddleware } from '../middleware/tenant-context.middleware';
import { CompanyContext } from '../context/company-context';

describe('Multi-Tenant Security & Context Isolation Suite', () => {
  const JWT_SECRET = 'super-secret-test-key-32-chars-long-security!!';
  let tenantGuard: TenantGuard;
  let platformGuard: PlatformGuard;
  let middleware: TenantContextMiddleware;

  beforeEach(() => {
    tenantGuard = new TenantGuard();
    platformGuard = new PlatformGuard();

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return JWT_SECRET;
        return null;
      }),
    } as unknown as ConfigService;

    middleware = new TenantContextMiddleware(mockConfigService);
  });

  const createMockContext = (user: any, companyId: string | null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('TenantGuard - Cross-Tenant Access Enforcement', () => {
    it('1. Tenant A should successfully access Tenant A data', () => {
      CompanyContext.run('tenant-a', 'user-1', () => {
        const mockContext = createMockContext(
          { userId: 'user-1', tenantId: 'tenant-a', globalRole: 'USER' },
          'tenant-a'
        );
        expect(tenantGuard.canActivate(mockContext)).toBe(true);
      });
    });

    it('2. Tenant A attempting to access Tenant B data should be blocked with ForbiddenException', () => {
      CompanyContext.run('tenant-b', 'user-1', () => {
        const mockContext = createMockContext(
          { userId: 'user-1', tenantId: 'tenant-a', globalRole: 'USER' },
          'tenant-b'
        );
        expect(() => tenantGuard.canActivate(mockContext)).toThrow(ForbiddenException);
      });
    });

    it('3. Request with missing company context should be rejected with BadRequestException', () => {
      CompanyContext.run(null, 'user-1', () => {
        const mockContext = createMockContext(
          { userId: 'user-1', tenantId: 'tenant-a', globalRole: 'USER' },
          null
        );
        expect(() => tenantGuard.canActivate(mockContext)).toThrow(BadRequestException);
      });
    });

    it('4. Request with unauthenticated user (missing request.user) should be rejected with ForbiddenException', () => {
      CompanyContext.run('tenant-a', null, () => {
        const mockContext = createMockContext(null, 'tenant-a');
        expect(() => tenantGuard.canActivate(mockContext)).toThrow(ForbiddenException);
      });
    });

    it('5. SUPER_ADMIN should be authorized to access any tenant context', () => {
      CompanyContext.run('tenant-any', 'super-admin-1', () => {
        const mockContext = createMockContext(
          { userId: 'super-admin-1', tenantId: 'tenant-main', globalRole: 'SUPER_ADMIN' },
          'tenant-any'
        );
        expect(tenantGuard.canActivate(mockContext)).toBe(true);
      });
    });
  });

  describe('PlatformGuard - Administrative Boundary Protection', () => {
    it('6. Regular tenant user attempting to access platform routes should be blocked with ForbiddenException', () => {
      const mockContext = createMockContext(
        { userId: 'user-1', tenantId: 'tenant-a', globalRole: 'USER' },
        'tenant-a'
      );
      expect(() => platformGuard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('7. SUPER_ADMIN user should be permitted access to platform routes', () => {
      const mockContext = createMockContext(
        { userId: 'super-admin-1', tenantId: 'system', globalRole: 'SUPER_ADMIN' },
        null
      );
      expect(platformGuard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('TenantContextMiddleware - Cryptographic JWT Verification', () => {
    it('8. Valid signed JWT should correctly populate CompanyContext', (done) => {
      const token = jwt.sign(
        { sub: 'user-1', tenantId: 'tenant-a', companyId: 'tenant-a', globalRole: 'USER' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const req: any = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const res: any = {};

      middleware.use(req, res, () => {
        expect(CompanyContext.getCompanyId()).toBe('tenant-a');
        expect(CompanyContext.getUserId()).toBe('user-1');
        done();
      });
    });

    it('9. Forged JWT signed with wrong secret should be rejected and leave CompanyContext null', (done) => {
      const forgedToken = jwt.sign(
        { sub: 'attacker', tenantId: 'tenant-victim', companyId: 'tenant-victim', globalRole: 'USER' },
        'wrong-attacker-secret',
        { expiresIn: '1h' }
      );

      const req: any = {
        headers: {
          authorization: `Bearer ${forgedToken}`,
        },
      };
      const res: any = {};

      middleware.use(req, res, () => {
        expect(CompanyContext.getCompanyId()).toBeNull();
        expect(CompanyContext.getUserId()).toBeNull();
        done();
      });
    });

    it('10. Expired JWT should be rejected and leave CompanyContext null', (done) => {
      const expiredToken = jwt.sign(
        { sub: 'user-1', tenantId: 'tenant-a', companyId: 'tenant-a', globalRole: 'USER' },
        JWT_SECRET,
        { expiresIn: -10 } // Expired 10 seconds ago
      );

      const req: any = {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      };
      const res: any = {};

      middleware.use(req, res, () => {
        expect(CompanyContext.getCompanyId()).toBeNull();
        expect(CompanyContext.getUserId()).toBeNull();
        done();
      });
    });

    it('11. Tampered token payload should be rejected and leave CompanyContext null', (done) => {
      const validToken = jwt.sign(
        { sub: 'user-1', tenantId: 'tenant-a', companyId: 'tenant-a', globalRole: 'USER' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Tamper with payload by corrupting string
      const tamperedToken = validToken.slice(0, -6) + 'xxxxxx';

      const req: any = {
        headers: {
          authorization: `Bearer ${tamperedToken}`,
        },
      };
      const res: any = {};

      middleware.use(req, res, () => {
        expect(CompanyContext.getCompanyId()).toBeNull();
        expect(CompanyContext.getUserId()).toBeNull();
        done();
      });
    });
  });
});
