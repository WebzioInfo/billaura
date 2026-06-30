import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Enterprise Accounting Seed...');

  // 1. Core Structure
  console.log('Seeding core company structure...');
  const company = await prisma.company.create({
    data: {
      companyName: 'Webzio Accounting Demo',
      legalName: 'Webzio Ltd',
      gstin: '27AAAAA1111A1Z1',
      pan: 'AAAAA1111A',
      email: 'admin@webzio.com',
      phone: '1234567890',
      address: '123 Wall Street',
      state: 'New York',
      country: 'USA',
      currency: 'USD',
      status: 'ACTIVE',
      onboardingStep: 'COMPLETED',
      businessType: 'SERVICE',
      settings: {
        create: {
          invoicePrefix: 'INV',
          defaultCurrency: 'USD',
          useLogoOnDocuments: false
        },
      },
    },
  });

  const branch = await prisma.branch.create({
    data: {
      companyId: company.id,
      name: 'HQ - Global Accounting Base',
      code: 'HQ-001',
      address: '123 Wall Street, NY',
      phone: '1234567890',
      email: 'hq@webzio.com',
      isActive: true,
      isDefault: true,
    },
  });

  const fiscalYear = await prisma.financialYear.create({
    data: {
      companyId: company.id,
      name: 'FY 2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isActive: true,
      isClosed: false,
    },
  });

  // 2. Roles & Matrix
  console.log('Seeding Role Matrices...');
  const superAdminRole = await prisma.role.create({
    data: { companyId: company.id, name: 'Super Admin', description: 'Full system access', isSystem: true },
  });
  const adminRole = await prisma.role.create({
    data: { companyId: company.id, name: 'Admin', description: 'Administrative access', isSystem: true },
  });
  const accountantRole = await prisma.role.create({
    data: { companyId: company.id, name: 'Accountant', description: 'Financial & Ledger access', isSystem: true },
  });
  const salesRole = await prisma.role.create({
    data: { companyId: company.id, name: 'Sales Manager', description: 'Sales & Invoicing access', isSystem: true },
  });
  const purchaseRole = await prisma.role.create({
    data: { companyId: company.id, name: 'Purchase Manager', description: 'Procurement access', isSystem: true },
  });
  const hrRole = await prisma.role.create({
    data: { companyId: company.id, name: 'HR Manager', description: 'HR & Payroll access', isSystem: true },
  });

  const allModules = ['accounting', 'sales', 'purchases', 'inventory', 'hr', 'payroll', 'settings'];
  const actions = ['create', 'read', 'update', 'delete'];
  
  const superAdminPerms = [];
  for (const mod of allModules) {
    for (const act of actions) {
      superAdminPerms.push({ roleId: superAdminRole.id, resource: mod, action: act });
    }
  }
  await prisma.rolePermission.createMany({ data: superAdminPerms });

  // 3. Users
  console.log('Seeding Demo Users...');
  const passwordHash = await bcrypt.hash('Demo@123!', 10);
  
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@webzio.com',
      passwordHash,
      name: 'Webzio Admin',
      isActive: true,
      emailVerified: true,
      globalRole: 'SUPER_ADMIN',
      companies: {
        create: {
          companyId: company.id,
          role: 'SUPER_ADMIN',
          customRoleId: superAdminRole.id,
        }
      }
    }
  });

  // 4. Accounting - Chart of Accounts (COA)
  console.log('Seeding Chart of Accounts (COA)...');
  
  const assetCoa = await prisma.account.create({ data: { companyId: company.id, name: 'Assets', category: 'ASSET', balance: 150000.0 } });
  const liabilityCoa = await prisma.account.create({ data: { companyId: company.id, name: 'Liabilities', category: 'LIABILITY', balance: 25000.0 } });
  const equityCoa = await prisma.account.create({ data: { companyId: company.id, name: 'Equity', category: 'EQUITY', balance: 0 } });
  const incomeCoa = await prisma.account.create({ data: { companyId: company.id, name: 'Income', category: 'REVENUE', balance: 500000.0 } });
  const expenseCoa = await prisma.account.create({ data: { companyId: company.id, name: 'Expenses', category: 'EXPENSE', balance: 120000.0 } });

  // 5. Bank Accounts
  console.log('Seeding Bank Accounts...');
  await prisma.bankAccount.createMany({
    data: [
      { companyId: company.id, name: 'Chase Corporate Checking', bankName: 'Chase Bank', accountNumber: '123456789', currentBalance: 145000 },
      { companyId: company.id, name: 'Petty Cash', bankName: 'Cash', accountNumber: 'CASH-001', currentBalance: 5000 },
    ]
  });
  
  const banks = await prisma.bankAccount.findMany({ where: { companyId: company.id } });

  // 6. Customers & Vendors
  console.log('Seeding Customers & Vendors...');
  const customers = [];
  const vendors = [];
  for(let i=1; i<=10; i++) {
    customers.push({ companyId: company.id, name: `Demo Customer ${i}`, customerCode: `CUST-00${i}`, email: `customer${i}@example.com`, creditLimit: 10000, outstandingAmount: 1000 * i });
    vendors.push({ companyId: company.id, name: `Demo Vendor ${i}`, vendorCode: `VEND-00${i}`, payableBalance: 500 * i });
  }
  await prisma.customer.createMany({ data: customers });
  await prisma.vendor.createMany({ data: vendors });
  
  const createdCustomers = await prisma.customer.findMany({ where: { companyId: company.id } });

  // 7. Products & Services
  console.log('Seeding Products & Services...');
  const category = await prisma.category.create({ data: { companyId: company.id, name: 'Software Licenses' } });
  
  const products: any[] = [];
  for(let i=1; i<=20; i++) {
    products.push({
      companyId: company.id,
      categoryId: category.id,
      name: `Accounting SaaS License v${i}`,
      sku: `ASL-00${i}`,
      itemType: 'SERVICE',
      sellingPrice: 299.0 + (i*10),
      purchasePrice: 0,
      taxCategory: 'TAXABLE'
    });
  }
  await prisma.product.createMany({ data: products });

  // 8. Dummy Invoices (Dashboard Telemetry)
  console.log('Seeding Invoices for Telemetry...');
  for(let i=0; i<10; i++) {
    const inv = await prisma.invoice.create({
      data: {
        companyId: company.id,
        customerId: createdCustomers[i].id,
        invoiceNo: `INV-2026-${i+1000}`,
        date: new Date(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 15)),
        subTotal: 5000.0,
        taxTotal: 500.0,
        grandTotal: 5500.0,
        amountPaid: i % 2 === 0 ? 5500.0 : 0, 
        status: i % 2 === 0 ? 'PAID' : 'SENT',
      }
    });

    if (i % 2 === 0 && banks.length > 0) {
      await prisma.payment.create({
        data: {
          companyId: company.id,
          customerId: createdCustomers[i].id,
          bankAccountId: banks[0].id,
          paymentNo: `PAY-2026-${i+1000}`,
          date: new Date(),
          amount: 5500.0,
          method: 'BANK_TRANSFER',
          allocations: {
            create: { invoiceId: inv.id, amount: 5500.0 }
          }
        }
      });
    }
  }

  console.log('✅ Enterprise Accounting Seed completed successfully.');
  console.log(`Demo login: admin@webzio.com / Demo@123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
