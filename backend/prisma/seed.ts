import { assertSafeDatabaseOperation } from '../src/common/utils/database-safety.util';

async function main() {
  assertSafeDatabaseOperation('PRISMA_DB_SEED');
  console.log('[PRISMA SEED] Running safe idempotent database seed...');
  // Delegates to runner.ts
  require('./seeds/runner');
}

main().catch((e) => {
  console.error('[PRISMA SEED ERROR]', e.message || e);
  process.exit(1);
});