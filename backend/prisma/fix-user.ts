import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.user.update({
    where: { email: 'admin@webzio.com' },
    data: { emailVerified: true }
  });
  console.log('User verified successfully.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
