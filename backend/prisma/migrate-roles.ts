import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating legacy global roles to new model...');
  
  // SUPER_ADMIN stays SUPER_ADMIN
  // PLATFORM_MANAGER -> SUPER_ADMIN
  // SUPPORT_AGENT -> SUPER_ADMIN
  
  await prisma.user.updateMany({
    where: { globalRole: { in: ['PLATFORM_MANAGER', 'SUPPORT_AGENT'] } as any },
    data: { globalRole: 'SUPER_ADMIN' as any },
  });

  // ADMIN, COMPANY_OWNER, COMPANY_ADMIN, MANAGER -> ADMIN
  await prisma.user.updateMany({
    where: { globalRole: { in: ['COMPANY_OWNER', 'COMPANY_ADMIN', 'MANAGER'] } as any },
    data: { globalRole: 'ADMIN' as any },
  });

  // Everything else to ACCOUNTANT
  await prisma.user.updateMany({
    where: { 
      globalRole: { 
        notIn: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'CUSTOM_ROLE'] 
      } as any 
    },
    data: { globalRole: 'ACCOUNTANT' as any },
  });

  console.log('Migrating legacy CompanyUser roles to new model...');

  await prisma.companyUser.updateMany({
    where: { role: { in: ['COMPANY_OWNER', 'COMPANY_ADMIN', 'MANAGER'] } as any },
    data: { role: 'ADMIN' as any },
  });

  await prisma.companyUser.updateMany({
    where: { 
      role: { 
        notIn: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'CUSTOM_ROLE'] 
      } as any 
    },
    data: { role: 'ACCOUNTANT' as any },
  });

  console.log('Roles successfully migrated to V2 architecture!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
