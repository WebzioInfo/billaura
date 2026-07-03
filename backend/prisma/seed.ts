import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create Default Roles (System Level)
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Complete system access', isSystem: true },
    { name: 'ADMIN', description: 'Company administration', isSystem: true },
    { name: 'ACCOUNTANT', description: 'Financial management', isSystem: true },
    { name: 'MANAGER', description: 'Operational management', isSystem: true },
    { name: 'OPERATOR', description: 'Data entry', isSystem: true },
    { name: 'SALES', description: 'Sales operations', isSystem: true },
    { name: 'INVENTORY', description: 'Warehouse operations', isSystem: true },
  ];

  for (const r of roles) {
    try {
      await prisma.role.upsert({
        where: { companyId_name: { companyId: '', name: r.name } },
        update: {},
        create: {
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
        }
      });
    } catch (e) {
      // Fallback if companyId is nullable globally
      await prisma.role.create({
        data: {
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
        }
      }).catch(err => { /* already exists */ });
    }
  }

  // 2. Create Super Admin
  const hashedPassword = await bcrypt.hash('ChangeMe@123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@billaura.com' },
    update: {},
    create: {
      email: 'admin@billaura.com',
      name: 'Super Administrator',
      passwordHash: hashedPassword,
      globalRole: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
