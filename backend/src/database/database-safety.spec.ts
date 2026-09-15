import {
  classifyEnvironment,
  analyzeDatabaseTarget,
  assertSafeDatabaseOperation,
} from '../common/utils/database-safety.util';

describe('DatabaseSafety Utility', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('classifyEnvironment', () => {
    it('should classify production when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_ENV = '';
      expect(classifyEnvironment()).toBe('production');
    });

    it('should classify production when DATABASE_ENV is production', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_ENV = 'production';
      expect(classifyEnvironment()).toBe('production');
    });

    it('should classify development when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_ENV;
      expect(classifyEnvironment()).toBe('development');
    });

    it('should return unknown when environment is unconfigured', () => {
      delete process.env.NODE_ENV;
      delete process.env.DATABASE_ENV;
      expect(classifyEnvironment()).toBe('unknown');
    });
  });

  describe('analyzeDatabaseTarget', () => {
    it('should detect cloud production database host patterns (e.g. prisma.io)', () => {
      process.env.NODE_ENV = 'development';
      const result = analyzeDatabaseTarget(
        'postgres://user:pass@pooled.db.prisma.io:5432/postgres?sslmode=require'
      );
      expect(result.isProduction).toBe(true);
      expect(result.reason).toContain('matches known production infrastructure pattern');
    });

    it('should detect custom protected database host from env variable', () => {
      process.env.NODE_ENV = 'development';
      process.env.PROTECTED_DATABASE_HOSTS = 'my-custom-prod-db.internal';
      const result = analyzeDatabaseTarget('postgres://user:pass@my-custom-prod-db.internal:5432/billaura');
      expect(result.isProduction).toBe(true);
      expect(result.reason).toContain('PROTECTED_DATABASE_HOSTS');
    });

    it('should fail closed when database URL is missing', () => {
      const result = analyzeDatabaseTarget('');
      expect(result.isProduction).toBe(true);
      expect(result.reason).toContain('No DATABASE_URL configured');
    });
  });

  describe('assertSafeDatabaseOperation', () => {
    it('should throw and block destructive operations when targeting a production database', () => {
      process.env.NODE_ENV = 'production';
      expect(() => {
        assertSafeDatabaseOperation('SEED_ALL');
      }).toThrow('DatabaseSafetyError: Operation "SEED_ALL" blocked on production database.');
    });

    it('should require exact confirmation string for reset operations in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/billaura_dev';

      // Attempting without confirmation token should throw
      delete process.env.DATABASE_RESET_CONFIRM;
      expect(() => {
        assertSafeDatabaseOperation('DB_RESET', { requireConfirmationToken: true });
      }).toThrow('Set DATABASE_RESET_CONFIRM="I_UNDERSTAND_DATA_WILL_BE_DELETED"');

      // Attempting with 'yes' or '1' or 'true' should also throw
      process.env.DATABASE_RESET_CONFIRM = 'yes';
      expect(() => {
        assertSafeDatabaseOperation('DB_RESET', { requireConfirmationToken: true });
      }).toThrow('Confirmation token required');

      // With exact token, it should pass
      process.env.DATABASE_RESET_CONFIRM = 'I_UNDERSTAND_DATA_WILL_BE_DELETED';
      const analysis = assertSafeDatabaseOperation('DB_RESET', { requireConfirmationToken: true });
      expect(analysis.isProduction).toBe(false);
    });
  });
});
