const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe("DELETE FROM _prisma_migrations WHERE migration_name = '20260803000000_reconcile_baseline'");
    console.log('Deleted migration history entry using Prisma.');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
