const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS "description" TEXT, ADD COLUMN IF NOT EXISTS "purchaseDescription" TEXT;'
  );
  console.log('Columns description and purchaseDescription added successfully to products table');
}

main().catch(console.error).finally(() => prisma.$disconnect());
