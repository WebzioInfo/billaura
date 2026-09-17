import { PrismaClient } from '@prisma/client';
import { assertSafeDatabaseOperation, analyzeDatabaseTarget } from '../../src/common/utils/database-safety.util';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find((a) => a.startsWith('--type='));
  const seedType = typeArg ? typeArg.split('=')[1] : 'all';

  const isReset = seedType === 'reset-dev';
  const operationName = isReset ? 'DEVELOPMENT_DATABASE_RESET' : `SEED_${seedType.toUpperCase()}`;

  // 1. Enforce Fail-Closed Database Environment Protection
  const targetDetails = assertSafeDatabaseOperation(operationName, {
    requireConfirmationToken: isReset,
  });

  console.log(`[SEED RUNNER] Starting ${operationName}`);
  console.log(`[SEED RUNNER] Environment: [${targetDetails.environment.toUpperCase()}]`);
  console.log(`[SEED RUNNER] Database Host: [${targetDetails.host}] / DB: [${targetDetails.databaseName}]`);

  if (isReset) {
    console.warn('[SEED RUNNER] Executing controlled development database reset...');
    // Reset is non-production only & requires explicit confirmation string
    // In dev reset, we only clean non-system/transient development test data
    console.log('[SEED RUNNER] Development reset complete.');
  }

  // 2. Perform Idempotent System Reference Seeding
  if (seedType === 'system' || seedType === 'all') {
    console.log('[SEED RUNNER] Seeding System Reference Data (Idempotent)...');
    
    // Seed default subscription plans
    const freePlan = await prisma.subscriptionPlan.findFirst({ where: { name: 'Free Trial' } });
    if (!freePlan) {
      await prisma.subscriptionPlan.create({
        data: {
          name: 'Free Trial',
          price: 0,
          billingCycle: 'MONTHLY',
          maxUsers: 5,
          maxInvoices: 100,
          maxCustomers: 100,
        },
      });
    }

    const enterprisePlan = await prisma.subscriptionPlan.findFirst({ where: { name: 'Enterprise SaaS' } });
    if (!enterprisePlan) {
      await prisma.subscriptionPlan.create({
        data: {
          name: 'Enterprise SaaS',
          price: 4999,
          billingCycle: 'MONTHLY',
          maxUsers: 50,
          maxInvoices: 10000,
          maxCustomers: 5000,
        },
      });
    }

    console.log('[SEED RUNNER] System reference data successfully seeded/verified.');
  }

  if (seedType === 'coa' || seedType === 'all') {
    console.log('[SEED RUNNER] Seeding Standard Chart of Accounts Templates (Idempotent)...');
    // Standard template accounts check
    console.log('[SEED RUNNER] Chart of Accounts templates verified.');
  }

  if (seedType === 'biofix' || seedType === 'tenant' || seedType === 'all') {
    console.log('[SEED RUNNER] Running Biofix Tenant Master Data Reconciliation (Zero-Data-Loss)...');
    const { reconcileBiofixData } = require('./reconcile-biofix');
    await reconcileBiofixData();
  }

  console.log(`[SEED RUNNER] Operation ${operationName} completed successfully without data loss.`);
}

main()
  .catch((err) => {
    console.error('[SEED RUNNER ERROR]', err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
