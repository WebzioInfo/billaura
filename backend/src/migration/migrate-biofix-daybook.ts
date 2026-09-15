import { PrismaClient, Prisma, BusinessPartnerType, CustomerCategory, TaxPreference, DocumentStatus, PaymentMethod } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

interface DayBookRow {
  key: string;
  date: string; // YYYY-MM-DD
  type: 'EXPENSE' | 'SALARY' | 'INCOME' | 'COURSE_FEE' | 'TRANSFER';
  description: string;
  amount: number;
  paymentSource: 'CASH' | 'FEDERAL_BANK';
  departmentCode?: 'BRI' | 'WTLB' | 'BS';
  partnerName?: string;
  employeeCode?: string;
  categoryName: string;
  revenueOrExpenseAccountName: string;
}

export const DAY_BOOK_ROWS: DayBookRow[] = [
  // --- 01-09-2026 (9 rows) ---
  {
    key: 'BIOFIX_20260901_01',
    date: '2026-09-01',
    type: 'EXPENSE',
    description: 'Recharge 946 (351)',
    amount: 201,
    paymentSource: 'FEDERAL_BANK',
    categoryName: 'Communication & Internet',
    revenueOrExpenseAccountName: 'Communication Expense',
  },
  {
    key: 'BIOFIX_20260901_02',
    date: '2026-09-01',
    type: 'EXPENSE',
    description: 'Recharge 947',
    amount: 201,
    paymentSource: 'FEDERAL_BANK',
    categoryName: 'Communication & Internet',
    revenueOrExpenseAccountName: 'Communication Expense',
  },
  {
    key: 'BIOFIX_20260901_03',
    date: '2026-09-01',
    type: 'EXPENSE',
    description: 'Recharge Balaance 946 (351)',
    amount: 150,
    paymentSource: 'CASH',
    categoryName: 'Communication & Internet',
    revenueOrExpenseAccountName: 'Communication Expense',
  },
  {
    key: 'BIOFIX_20260901_04',
    date: '2026-09-01',
    type: 'INCOME',
    description: 'Malappuram FSSAI Probe',
    amount: 83072,
    paymentSource: 'FEDERAL_BANK',
    departmentCode: 'WTLB',
    partnerName: 'Malappuram FSSAI',
    categoryName: 'Water Testing & Analysis',
    revenueOrExpenseAccountName: 'Water Testing Revenue',
  },
  {
    key: 'BIOFIX_20260901_05',
    date: '2026-09-01',
    type: 'COURSE_FEE',
    description: 'COURSE FEE (Anjali)',
    amount: 5000,
    paymentSource: 'FEDERAL_BANK',
    departmentCode: 'BRI',
    partnerName: 'Anjali',
    categoryName: 'Course Fee',
    revenueOrExpenseAccountName: 'Course Fee Revenue',
  },
  {
    key: 'BIOFIX_20260901_06',
    date: '2026-09-01',
    type: 'EXPENSE',
    description: 'Shaheer Commission Probe',
    amount: 11080,
    paymentSource: 'FEDERAL_BANK',
    partnerName: 'Shaheer',
    categoryName: 'Commission',
    revenueOrExpenseAccountName: 'Commission Expense',
  },
  {
    key: 'BIOFIX_20260901_07',
    date: '2026-09-01',
    type: 'EXPENSE',
    description: 'Ismail Kizzisherri Franchse',
    amount: 15000,
    paymentSource: 'FEDERAL_BANK',
    partnerName: 'Ismayil',
    categoryName: 'Franchise & Operations',
    revenueOrExpenseAccountName: 'Operating Expense',
  },
  {
    key: 'BIOFIX_20260901_08',
    date: '2026-09-01',
    type: 'SALARY',
    description: 'Salary (Shadiya)',
    amount: 14516,
    paymentSource: 'FEDERAL_BANK',
    departmentCode: 'BRI',
    employeeCode: 'EMP-002',
    categoryName: 'Salary',
    revenueOrExpenseAccountName: 'Salary Expense',
  },
  {
    key: 'BIOFIX_20260901_09',
    date: '2026-09-01',
    type: 'EXPENSE',
    description: 'Sarath (Onam Video Editing)',
    amount: 1500,
    paymentSource: 'FEDERAL_BANK',
    partnerName: 'Sarath',
    categoryName: 'Marketing & Media',
    revenueOrExpenseAccountName: 'Marketing Expense',
  },

  // --- 02-09-2026 (4 rows) ---
  {
    key: 'BIOFIX_20260902_01',
    date: '2026-09-02',
    type: 'INCOME',
    description: 'Chemical Sale',
    amount: 350,
    paymentSource: 'FEDERAL_BANK',
    departmentCode: 'BS',
    categoryName: 'Chemical & Solutions',
    revenueOrExpenseAccountName: 'Chemical Sales Revenue',
  },
  {
    key: 'BIOFIX_20260902_02',
    date: '2026-09-02',
    type: 'INCOME',
    description: 'Water Test',
    amount: 900,
    paymentSource: 'CASH',
    departmentCode: 'WTLB',
    categoryName: 'Water Testing & Analysis',
    revenueOrExpenseAccountName: 'Water Testing Revenue',
  },
  {
    key: 'BIOFIX_20260902_03',
    date: '2026-09-02',
    type: 'EXPENSE',
    description: 'Building Rent',
    amount: 42000,
    paymentSource: 'FEDERAL_BANK',
    categoryName: 'Rent',
    revenueOrExpenseAccountName: 'Rent Expense',
  },
  {
    key: 'BIOFIX_20260902_04',
    date: '2026-09-02',
    type: 'EXPENSE',
    description: 'Anas Petrol Expense',
    amount: 100,
    paymentSource: 'CASH',
    departmentCode: 'BS',
    employeeCode: 'EMP-003',
    categoryName: 'Travel',
    revenueOrExpenseAccountName: 'Travel & Fuel Expense',
  },

  // --- 03-09-2026 (5 rows) ---
  {
    key: 'BIOFIX_20260903_01',
    date: '2026-09-03',
    type: 'SALARY',
    description: 'Salary (Trainee Shehina Sherin)',
    amount: 4678,
    paymentSource: 'FEDERAL_BANK',
    departmentCode: 'BRI',
    categoryName: 'Salary',
    revenueOrExpenseAccountName: 'Salary Expense',
  },
  {
    key: 'BIOFIX_20260903_02',
    date: '2026-09-03',
    type: 'COURSE_FEE',
    description: 'Course Fee (Jarshana)',
    amount: 5000,
    paymentSource: 'FEDERAL_BANK',
    departmentCode: 'BRI',
    partnerName: 'Jarshana',
    categoryName: 'Course Fee',
    revenueOrExpenseAccountName: 'Course Fee Revenue',
  },
  {
    key: 'BIOFIX_20260903_03',
    date: '2026-09-03',
    type: 'EXPENSE',
    description: 'Alpha DM Water',
    amount: 3500,
    paymentSource: 'CASH',
    departmentCode: 'WTLB',
    categoryName: 'Lab Supplies & Materials',
    revenueOrExpenseAccountName: 'Lab Material Expense',
  },
  {
    key: 'BIOFIX_20260903_04',
    date: '2026-09-03',
    type: 'INCOME',
    description: 'Latheef Perintalmanna Lab',
    amount: 100000,
    paymentSource: 'CASH',
    departmentCode: 'WTLB',
    partnerName: 'Latheef Perintalmanna Lab',
    categoryName: 'Water Testing & Analysis',
    revenueOrExpenseAccountName: 'Water Testing Revenue',
  },
  {
    key: 'BIOFIX_20260903_05',
    date: '2026-09-03',
    type: 'EXPENSE',
    description: 'Edavanna Petrol Expense',
    amount: 150,
    paymentSource: 'CASH',
    categoryName: 'Travel',
    revenueOrExpenseAccountName: 'Travel & Fuel Expense',
  },

  // --- 04-09-2026 (7 rows) ---
  {
    key: 'BIOFIX_20260904_01',
    date: '2026-09-04',
    type: 'EXPENSE',
    description: 'Waypure hose',
    amount: 160,
    paymentSource: 'CASH',
    departmentCode: 'BS',
    partnerName: 'Way Pure Water Treatment Solution',
    categoryName: 'Maintenance & Repairs',
    revenueOrExpenseAccountName: 'Maintenance Expense',
  },
  {
    key: 'BIOFIX_20260904_02',
    date: '2026-09-04',
    type: 'EXPENSE',
    description: 'Stationary',
    amount: 30,
    paymentSource: 'CASH',
    categoryName: 'Office & Stationery',
    revenueOrExpenseAccountName: 'Stationery Expense',
  },
  {
    key: 'BIOFIX_20260904_03',
    date: '2026-09-04',
    type: 'TRANSFER',
    description: 'TRANSFER',
    amount: 15000,
    paymentSource: 'CASH', // Cash -> Federal Bank
    categoryName: 'Contra Transfer',
    revenueOrExpenseAccountName: 'Contra Transfer',
  },
  {
    key: 'BIOFIX_20260904_04',
    date: '2026-09-04',
    type: 'EXPENSE',
    description: 'Thrippananchi Fitting and Labour',
    amount: 3250,
    paymentSource: 'CASH',
    departmentCode: 'BS',
    categoryName: 'Maintenance & Repairs',
    revenueOrExpenseAccountName: 'Labour & Maintenance Expense',
  },
  {
    key: 'BIOFIX_20260904_05',
    date: '2026-09-04',
    type: 'EXPENSE',
    description: 'Perimthalmanna New Lab Visit',
    amount: 625,
    paymentSource: 'CASH',
    departmentCode: 'WTLB',
    categoryName: 'Travel',
    revenueOrExpenseAccountName: 'Travel & Fuel Expense',
  },
  {
    key: 'BIOFIX_20260904_06',
    date: '2026-09-04',
    type: 'EXPENSE',
    description: 'Food Lab EMI',
    amount: 12000,
    paymentSource: 'FEDERAL_BANK',
    departmentCode: 'WTLB',
    categoryName: 'Loan EMI & Financial',
    revenueOrExpenseAccountName: 'EMI & Finance Expense',
  },
  {
    key: 'BIOFIX_20260904_07',
    date: '2026-09-04',
    type: 'EXPENSE',
    description: 'Feroke Visit',
    amount: 120,
    paymentSource: 'CASH',
    categoryName: 'Travel',
    revenueOrExpenseAccountName: 'Travel & Fuel Expense',
  },
];

export async function migrateBiofixDayBook() {
  console.log('================================================================');
  console.log('       BIOFIX TECHNOLOGY LLP — DAY BOOK HISTORICAL MIGRATION      ');
  console.log('================================================================\n');

  // 1. Locate and Verify Biofix Tenant
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { companyName: { contains: 'Biofix', mode: 'insensitive' } },
        { legalName: { contains: 'Biofix', mode: 'insensitive' } },
        { tenantCode: { contains: 'biofix', mode: 'insensitive' } }
      ]
    }
  });

  if (!company) {
    throw new Error('Biofix Technology LLP company record not found!');
  }

  const companyId = company.id;
  console.log(`[TENANT RESOLVED] Company: "${company.companyName}" (ID: ${companyId})`);

  // Locate default branch
  const branch = await prisma.branch.findFirst({
    where: { companyId, isDefault: true }
  }) || await prisma.branch.findFirst({ where: { companyId } });

  const branchId = branch?.id || null;
  console.log(`[BRANCH RESOLVED] Branch: "${branch?.name}" (ID: ${branchId})`);

  // 2. Fetch and Map Departments
  const departments = await prisma.department.findMany({ where: { companyId } });
  const deptMap = new Map<string, string>(); // code/name -> id
  for (const d of departments) {
    if (d.code) deptMap.set(d.code.toUpperCase(), d.id);
    deptMap.set(d.name.toUpperCase(), d.id);
  }

  const instDeptId = deptMap.get('BRI') || deptMap.get('INSTITUTE') || null;
  const waterDeptId = deptMap.get('WTLB') || deptMap.get('WATER LAB') || null;
  const solDeptId = deptMap.get('BS') || deptMap.get('SOLUTIONS') || null;

  console.log(`[DEPARTMENTS MAPPED] Institute: ${instDeptId}, Water Lab: ${waterDeptId}, Solutions: ${solDeptId}`);

  // 3. Ensure Opening Balances & Bank/Cash Accounts
  // Accounts in Chart of Accounts
  let cashLedger = await prisma.account.findFirst({
    where: { companyId, name: 'Cash' }
  });
  if (!cashLedger) {
    const currentAssetGroup = await prisma.account.findFirst({ where: { companyId, name: 'Current Assets' } });
    cashLedger = await prisma.account.create({
      data: {
        companyId,
        name: 'Cash',
        category: 'ASSET',
        subCategory: 'CURRENT_ASSET',
        parentId: currentAssetGroup?.id,
        isGroup: false,
        balance: 0,
      }
    });
  }

  let federalBankLedger = await prisma.account.findFirst({
    where: { companyId, name: 'Federal Bank' }
  });
  if (!federalBankLedger) {
    const currentAssetGroup = await prisma.account.findFirst({ where: { companyId, name: 'Current Assets' } });
    federalBankLedger = await prisma.account.create({
      data: {
        companyId,
        name: 'Federal Bank',
        category: 'ASSET',
        subCategory: 'CURRENT_ASSET',
        parentId: currentAssetGroup?.id,
        isGroup: false,
        balance: 0,
      }
    });
  }

  // Ensure BankAccount and CashAccount operational entities
  let federalBankAccount = await prisma.bankAccount.findFirst({
    where: { companyId, name: { contains: 'Federal', mode: 'insensitive' } }
  });
  if (!federalBankAccount) {
    federalBankAccount = await prisma.bankAccount.create({
      data: {
        companyId,
        branchId,
        accountId: federalBankLedger.id,
        name: 'Federal Bank',
        bankName: 'Federal Bank',
        accountNumber: 'FED-BIOFIX-001',
        accountType: 'CURRENT',
        openingBalance: new Prisma.Decimal(5203.34),
        currentBalance: new Prisma.Decimal(5203.34),
        openingDate: new Date('2026-09-01T00:00:00Z'),
        isDefault: true,
        status: 'ACTIVE',
      }
    });
    console.log(`[BANK ACCOUNT CREATED] Federal Bank ID: ${federalBankAccount.id}`);
  } else {
    console.log(`[BANK ACCOUNT REUSED] Federal Bank ID: ${federalBankAccount.id}`);
  }

  let cashAccount = await prisma.cashAccount.findFirst({
    where: { companyId, name: 'Cash' }
  });
  if (!cashAccount) {
    cashAccount = await prisma.cashAccount.create({
      data: {
        companyId,
        branchId,
        accountId: cashLedger.id,
        name: 'Cash',
        openingBalance: new Prisma.Decimal(8475.00),
        currentBalance: new Prisma.Decimal(8475.00),
        isDefault: true,
      }
    });
    console.log(`[CASH ACCOUNT CREATED] Cash ID: ${cashAccount.id}`);
  } else {
    console.log(`[CASH ACCOUNT REUSED] Cash ID: ${cashAccount.id}`);
  }

  // 4. Ensure Chart of Accounts Ledgers and Categories exist
  const getOrCreateLedger = async (name: string, category: 'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY', subCat: any, parentName: string) => {
    let acc = await prisma.account.findFirst({ where: { companyId, name } });
    if (!acc) {
      const parent = await prisma.account.findFirst({ where: { companyId, name: parentName } });
      acc = await prisma.account.create({
        data: {
          companyId,
          name,
          category,
          subCategory: subCat,
          parentId: parent?.id,
          isGroup: false,
          balance: 0,
        }
      });
      console.log(`  + Created Account Ledger: [${category}] ${name}`);
    }
    return acc;
  };

  const getOrCreateExpenseCategory = async (name: string, accountName: string) => {
    let cat = await prisma.expenseCategory.findFirst({ where: { companyId, name } });
    if (!cat) {
      const ledger = await getOrCreateLedger(accountName, 'EXPENSE', 'OPERATING_EXPENSE', 'Indirect Expenses');
      cat = await prisma.expenseCategory.create({
        data: {
          companyId,
          name,
          description: name,
          accountId: ledger.id,
          type: 'CUSTOM',
          isActive: true,
        }
      });
      console.log(`  + Created Expense Category: ${name} -> ${accountName}`);
    }
    return cat;
  };

  const getOrCreateIncomeCategory = async (name: string, accountName: string) => {
    let cat = await prisma.incomeCategory.findFirst({ where: { companyId, name } });
    if (!cat) {
      const ledger = await getOrCreateLedger(accountName, 'REVENUE', 'SERVICE_REVENUE', 'Revenue Accounts');
      cat = await prisma.incomeCategory.create({
        data: {
          companyId,
          name,
          description: name,
          accountId: ledger.id,
          isActive: true,
        }
      });
      console.log(`  + Created Income Category: ${name} -> ${accountName}`);
    }
    return cat;
  };

  // Ensure common revenue and expense ledgers
  await getOrCreateLedger('Course Fee Revenue', 'REVENUE', 'SERVICE_REVENUE', 'Revenue Accounts');
  await getOrCreateLedger('Water Testing Revenue', 'REVENUE', 'SERVICE_REVENUE', 'Revenue Accounts');
  await getOrCreateLedger('Chemical Sales Revenue', 'REVENUE', 'SALES_REVENUE', 'Revenue Accounts');
  await getOrCreateLedger('Communication Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'Indirect Expenses');
  await getOrCreateLedger('Commission Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'Indirect Expenses');
  await getOrCreateLedger('Operating Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'Indirect Expenses');
  await getOrCreateLedger('Marketing Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'Indirect Expenses');
  await getOrCreateLedger('Travel & Fuel Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'Indirect Expenses');
  await getOrCreateLedger('Lab Material Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'Direct Expenses');
  await getOrCreateLedger('Maintenance Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'Indirect Expenses');
  await getOrCreateLedger('Stationery Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'Indirect Expenses');
  await getOrCreateLedger('Labour & Maintenance Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'Indirect Expenses');
  await getOrCreateLedger('EMI & Finance Expense', 'EXPENSE', 'OTHER_EXPENSE', 'Indirect Expenses');

  // Ensure Customer Department & Customers
  let instituteCustDept = await prisma.customerDepartment.findFirst({
    where: { companyId, name: 'Institute' }
  });
  if (!instituteCustDept) {
    instituteCustDept = await prisma.customerDepartment.create({
      data: {
        companyId,
        name: 'Institute',
        description: 'Institute Students and Course Enrollees',
        customerType: 'B2C',
        isActive: true,
      }
    });
  }

  const waterLabCustDept = await prisma.customerDepartment.findFirst({
    where: { companyId, name: 'Laboratory' }
  });

  const getOrCreateCustomer = async (name: string, deptId?: string | null) => {
    let cust = await prisma.businessPartner.findFirst({
      where: { companyId, name: { equals: name, mode: 'insensitive' } }
    });
    if (!cust) {
      const custCount = await prisma.businessPartner.count({ where: { companyId } });
      const bpCode = `CUST-${String(custCount + 1).padStart(4, '0')}`;
      cust = await prisma.businessPartner.create({
        data: {
          companyId,
          bpCode,
          name,
          bpType: BusinessPartnerType.CUSTOMER,
          customerType: CustomerCategory.B2B,
          taxPreference: TaxPreference.TAXABLE,
          customerDepartmentId: deptId || null,
          receivableBalance: new Prisma.Decimal(0),
          payableBalance: new Prisma.Decimal(0),
        }
      });
      console.log(`  + Created Customer: ${name} (${bpCode})`);
    }
    return cust;
  };

  // Reconcile key business partners
  const anjaliCust = await getOrCreateCustomer('Anjali', instituteCustDept.id);
  await getOrCreateCustomer('Jarshana', instituteCustDept.id);
  await getOrCreateCustomer('Latheef Perintalmanna Lab', waterLabCustDept?.id);
  await getOrCreateCustomer('Malappuram FSSAI', waterLabCustDept?.id);
  await getOrCreateCustomer('Shaheer');
  await getOrCreateCustomer('Ismayil');
  await getOrCreateCustomer('Sarath');
  await getOrCreateCustomer('Way Pure Water Treatment Solution');

  // Employees lookup
  const employees = await prisma.employee.findMany({ where: { companyId } });
  const empMap = new Map<string, string>(); // code -> id
  employees.forEach(e => empMap.set(e.employeeCode, e.id));

  // 5. Check Initial / Opening Balance Journal Entry
  const openingJeRef = 'BIOFIX_OPENING_BALANCES_20260901';
  const openingJe = await prisma.journalEntry.findFirst({
    where: { companyId, reference: openingJeRef }
  });

  if (!openingJe) {
    console.log('\n[POSTING OPENING BALANCES] Cash: ₹8,475.00, Federal Bank: ₹5,203.34');
    let openingBalEquity = await prisma.account.findFirst({
      where: { companyId, name: 'Opening Balance Equity' }
    });
    if (!openingBalEquity) {
      const equityGroup = await prisma.account.findFirst({ where: { companyId, name: 'Equity Accounts' } });
      openingBalEquity = await prisma.account.create({
        data: {
          companyId,
          name: 'Opening Balance Equity',
          category: 'EQUITY',
          subCategory: 'EQUITY',
          parentId: equityGroup?.id,
          balance: 0,
        }
      });
    }

    await prisma.journalEntry.create({
      data: {
        companyId,
        date: new Date('2026-09-01T00:00:00.000Z'),
        reference: openingJeRef,
        description: 'Biofix Technology LLP — Opening Balances as on 01-09-2026',
        lines: {
          create: [
            {
              accountId: cashLedger.id,
              debit: new Prisma.Decimal(8475.00),
              credit: new Prisma.Decimal(0),
              description: 'Cash Opening Balance',
            },
            {
              accountId: federalBankLedger.id,
              debit: new Prisma.Decimal(5203.34),
              credit: new Prisma.Decimal(0),
              description: 'Federal Bank Opening Balance',
            },
            {
              accountId: openingBalEquity.id,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(13678.34),
              description: 'Opening Balance Equity Offset',
            }
          ]
        }
      }
    });

    await prisma.account.update({
      where: { id: cashLedger.id },
      data: { balance: { increment: 8475.00 } }
    });
    await prisma.account.update({
      where: { id: federalBankLedger.id },
      data: { balance: { increment: 5203.34 } }
    });
    await prisma.account.update({
      where: { id: openingBalEquity.id },
      data: { balance: { decrement: 13678.34 } }
    });
    console.log('✓ Opening balance journal entry posted.');
  } else {
    console.log('\n[OPENING BALANCES] Already verified and recorded.');
  }

  // 6. Idempotent Migration of the 25 Day Book Rows
  console.log('\n--- PROCESSING 25 DAY BOOK TRANSACTIONS ---');
  let exactMatches = 0;
  let newRecords = 0;

  for (let i = 0; i < DAY_BOOK_ROWS.length; i++) {
    const row = DAY_BOOK_ROWS[i];
    const rowNum = String(i + 1).padStart(2, '0');
    const transDate = new Date(`${row.date}T10:00:00.000Z`);

    // Check if this row was already processed
    const existingJe = await prisma.journalEntry.findFirst({
      where: { companyId, reference: row.key }
    });

    if (existingJe) {
      exactMatches++;
      console.log(`[${rowNum}/25] EXACT MATCH (Idempotent Skip): ${row.date} | ${row.description} | ₹${row.amount}`);
      continue;
    }

    // Resolve payment ledger and accounts
    const isCash = row.paymentSource === 'CASH';
    const paymentLedgerId = isCash ? cashLedger.id : federalBankLedger.id;
    const paymentMethod: PaymentMethod = isCash ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER;

    // Resolve Department
    let deptId: string | null = null;
    if (row.departmentCode === 'BRI') deptId = instDeptId;
    else if (row.departmentCode === 'WTLB') deptId = waterDeptId;
    else if (row.departmentCode === 'BS') deptId = solDeptId;

    // Resolve Partner
    let partnerId: string | null = null;
    if (row.partnerName) {
      const p = await prisma.businessPartner.findFirst({
        where: { companyId, name: { equals: row.partnerName, mode: 'insensitive' } }
      });
      partnerId = p?.id || null;
    }

    // Resolve Employee
    let empId: string | null = null;
    if (row.employeeCode) {
      empId = empMap.get(row.employeeCode) || null;
    }

    // Execute within interactive transaction
    await prisma.$transaction(async (tx) => {
      if (row.type === 'TRANSFER') {
        // Internal Transfer: Cash -> Federal Bank ₹15,000
        await tx.internalTransfer.create({
          data: {
            companyId,
            transferNumber: `TRF-${row.date.replace(/-/g, '')}-001`,
            date: transDate,
            amount: new Prisma.Decimal(row.amount),
            fromCashId: cashAccount.id,
            toBankId: federalBankAccount.id,
            reference: row.key,
            description: row.description,
          }
        });

        // Journal Entry: Debit Federal Bank, Credit Cash
        await tx.journalEntry.create({
          data: {
            companyId,
            date: transDate,
            reference: row.key,
            description: `Internal Transfer Cash to Federal Bank [${row.description}]`,
            lines: {
              create: [
                {
                  accountId: federalBankLedger.id,
                  debit: new Prisma.Decimal(row.amount),
                  credit: new Prisma.Decimal(0),
                  description: 'Transfer received from Cash',
                },
                {
                  accountId: cashLedger.id,
                  debit: new Prisma.Decimal(0),
                  credit: new Prisma.Decimal(row.amount),
                  description: 'Transfer sent to Federal Bank',
                }
              ]
            }
          }
        });

        // Update Operational Balances
        await tx.cashAccount.update({
          where: { id: cashAccount.id },
          data: { currentBalance: { decrement: row.amount } }
        });
        await tx.bankAccount.update({
          where: { id: federalBankAccount.id },
          data: { currentBalance: { increment: row.amount } }
        });

        // Update Account Balances
        await tx.account.update({ where: { id: cashLedger.id }, data: { balance: { decrement: row.amount } } });
        await tx.account.update({ where: { id: federalBankLedger.id }, data: { balance: { increment: row.amount } } });

        // Cash Transaction & Bank Transaction records
        await tx.cashTransaction.create({
          data: {
            companyId,
            cashAccountId: cashAccount.id,
            date: transDate,
            type: 'TRANSFER_OUT',
            amount: new Prisma.Decimal(row.amount),
            balanceAfter: new Prisma.Decimal(0),
            reference: row.key,
            description: row.description,
          }
        });

        await tx.bankTransaction.create({
          data: {
            companyId,
            bankAccountId: federalBankAccount.id,
            date: transDate,
            type: 'TRANSFER_IN',
            amount: new Prisma.Decimal(row.amount),
            balanceAfter: new Prisma.Decimal(0),
            reference: row.key,
            description: row.description,
          }
        });

      } else if (row.type === 'COURSE_FEE') {
        // Universal Document: FEE_RECEIPT
        const feeRevenueLedger = await tx.account.findFirst({
          where: { companyId, name: 'Course Fee Revenue' }
        });

        const invoiceNo = `FEE-${row.date.replace(/-/g, '')}-${rowNum}`;
        await tx.invoice.create({
          data: {
            companyId,
            businessPartnerId: partnerId || anjaliCust.id,
            invoiceNo,
            invoiceType: 'BILL_OF_SUPPLY' as any,
            date: transDate,
            status: DocumentStatus.PAID,
            subTotal: new Prisma.Decimal(row.amount),
            taxTotal: new Prisma.Decimal(0),
            grandTotal: new Prisma.Decimal(row.amount),
            amountPaid: new Prisma.Decimal(row.amount),
            totalTaxAmount: new Prisma.Decimal(0),
            placeOfSupply: 'Kerala',
            gstBreakup: {
              sourceReference: row.key,
              sourceSystem: 'BIOFIX_DAYBOOK',
              description: row.description,
              department: 'Institute',
            },
            items: {
              create: [
                {
                  description: row.description,
                  qty: new Prisma.Decimal(1),
                  rate: new Prisma.Decimal(row.amount),
                  taxPercent: new Prisma.Decimal(0),
                  taxAmount: new Prisma.Decimal(0),
                  total: new Prisma.Decimal(row.amount),
                }
              ]
            }
          }
        });

        // Journal Entry: Debit Payment Ledger (Federal Bank), Credit Course Fee Revenue
        await tx.journalEntry.create({
          data: {
            companyId,
            date: transDate,
            reference: row.key,
            description: `${row.description} [${invoiceNo}]`,
            lines: {
              create: [
                {
                  accountId: paymentLedgerId,
                  departmentId: deptId || undefined,
                  debit: new Prisma.Decimal(row.amount),
                  credit: new Prisma.Decimal(0),
                  description: `${row.description} - Received`,
                },
                {
                  accountId: feeRevenueLedger?.id || paymentLedgerId,
                  departmentId: deptId || undefined,
                  debit: new Prisma.Decimal(0),
                  credit: new Prisma.Decimal(row.amount),
                  description: `${row.description} - Course Fee Revenue`,
                }
              ]
            }
          }
        });

        // Update balances
        if (isCash) {
          await tx.cashAccount.update({ where: { id: cashAccount.id }, data: { currentBalance: { increment: row.amount } } });
          await tx.account.update({ where: { id: cashLedger.id }, data: { balance: { increment: row.amount } } });
        } else {
          await tx.bankAccount.update({ where: { id: federalBankAccount.id }, data: { currentBalance: { increment: row.amount } } });
          await tx.account.update({ where: { id: federalBankLedger.id }, data: { balance: { increment: row.amount } } });
        }
        if (feeRevenueLedger) {
          await tx.account.update({ where: { id: feeRevenueLedger.id }, data: { balance: { decrement: row.amount } } });
        }

      } else if (row.type === 'INCOME') {
        // Other Income / Service Sales
        const incomeCategory = await getOrCreateIncomeCategory(row.categoryName, row.revenueOrExpenseAccountName);
        const incomeLedger = incomeCategory.accountId;

        const incomeNo = `INC-${row.date.replace(/-/g, '')}-${rowNum}`;
        await tx.otherIncome.create({
          data: {
            companyId,
            branchId,
            departmentId: deptId,
            businessPartnerId: partnerId,
            incomeNo,
            date: transDate,
            incomeType: 'SERVICE' as any,
            description: row.description,
            reference: row.key,
            taxMode: 'NO_TAX' as any,
            subTotal: new Prisma.Decimal(row.amount),
            taxTotal: new Prisma.Decimal(0),
            grandTotal: new Prisma.Decimal(row.amount),
            status: DocumentStatus.PAID,
            paymentStatus: 'PAID',
            paymentMethod,
            bankAccountId: isCash ? null : federalBankAccount.id,
            categoryId: incomeCategory.id,
          }
        });

        // Journal Entry: Debit Payment Ledger, Credit Revenue Ledger
        await tx.journalEntry.create({
          data: {
            companyId,
            date: transDate,
            reference: row.key,
            description: `${row.description} [${incomeNo}]`,
            lines: {
              create: [
                {
                  accountId: paymentLedgerId,
                  departmentId: deptId || undefined,
                  debit: new Prisma.Decimal(row.amount),
                  credit: new Prisma.Decimal(0),
                  description: `${row.description} - Received`,
                },
                {
                  accountId: incomeLedger || paymentLedgerId,
                  departmentId: deptId || undefined,
                  debit: new Prisma.Decimal(0),
                  credit: new Prisma.Decimal(row.amount),
                  description: `${row.description} - Revenue`,
                }
              ]
            }
          }
        });

        // Update balances
        if (isCash) {
          await tx.cashAccount.update({ where: { id: cashAccount.id }, data: { currentBalance: { increment: row.amount } } });
          await tx.account.update({ where: { id: cashLedger.id }, data: { balance: { increment: row.amount } } });
        } else {
          await tx.bankAccount.update({ where: { id: federalBankAccount.id }, data: { currentBalance: { increment: row.amount } } });
          await tx.account.update({ where: { id: federalBankLedger.id }, data: { balance: { increment: row.amount } } });
        }
        if (incomeLedger) {
          await tx.account.update({ where: { id: incomeLedger }, data: { balance: { decrement: row.amount } } });
        }

      } else {
        // EXPENSE / SALARY
        const expenseCategory = await getOrCreateExpenseCategory(row.categoryName, row.revenueOrExpenseAccountName);
        const expenseLedgerId = expenseCategory.accountId;

        const expenseNo = `EXP-${row.date.replace(/-/g, '')}-${rowNum}`;
        await tx.expense.create({
          data: {
            companyId,
            branchId,
            departmentId: deptId,
            categoryId: expenseCategory.id,
            bankAccountId: isCash ? null : federalBankAccount.id,
            cashAccountId: isCash ? cashAccount.id : null,
            employeeId: empId,
            vendorId: partnerId,
            expenseNo,
            date: transDate,
            amount: new Prisma.Decimal(row.amount),
            taxAmount: new Prisma.Decimal(0),
            totalAmount: new Prisma.Decimal(row.amount),
            taxApplicable: false,
            paymentMethod,
            paidFromType: isCash ? 'CASH' : 'BANK',
            paidFromId: isCash ? cashAccount.id : federalBankAccount.id,
            status: 'APPROVED',
            approvalStatus: 'APPROVED',
            reference: row.key,
            description: row.description,
          }
        });

        // Journal Entry: Debit Expense Ledger, Credit Payment Ledger
        await tx.journalEntry.create({
          data: {
            companyId,
            date: transDate,
            reference: row.key,
            description: `${row.description} [${expenseNo}]`,
            lines: {
              create: [
                {
                  accountId: expenseLedgerId || paymentLedgerId,
                  departmentId: deptId || undefined,
                  debit: new Prisma.Decimal(row.amount),
                  credit: new Prisma.Decimal(0),
                  description: `${row.description} - Expense`,
                },
                {
                  accountId: paymentLedgerId,
                  departmentId: deptId || undefined,
                  debit: new Prisma.Decimal(0),
                  credit: new Prisma.Decimal(row.amount),
                  description: `${row.description} - Paid Out`,
                }
              ]
            }
          }
        });

        // Update balances
        if (isCash) {
          await tx.cashAccount.update({ where: { id: cashAccount.id }, data: { currentBalance: { decrement: row.amount } } });
          await tx.account.update({ where: { id: cashLedger.id }, data: { balance: { decrement: row.amount } } });
        } else {
          await tx.bankAccount.update({ where: { id: federalBankAccount.id }, data: { currentBalance: { decrement: row.amount } } });
          await tx.account.update({ where: { id: federalBankLedger.id }, data: { balance: { decrement: row.amount } } });
        }
        if (expenseLedgerId) {
          await tx.account.update({ where: { id: expenseLedgerId }, data: { balance: { increment: row.amount } } });
        }
      }
    });

    newRecords++;
    console.log(`[${rowNum}/25] IMPORTED: ${row.date} | ${row.description} | ₹${row.amount} (${row.type} -> ${row.paymentSource})`);
  }

  // 7. Balance Reconciliation and Verification
  console.log('\n================================================================');
  console.log('                 FINAL BALANCE RECONCILIATION                   ');
  console.log('================================================================');

  // Query actual ledger balances
  const cashAcc = await prisma.cashAccount.findUnique({ where: { id: cashAccount.id } });
  const fedAcc = await prisma.bankAccount.findUnique({ where: { id: federalBankAccount.id } });

  // Calculate day-by-day running balances from authoritative journal lines
  const dailyJournals = await prisma.journalLine.findMany({
    where: {
      journalEntry: { companyId },
      accountId: { in: [cashLedger.id, federalBankLedger.id] },
    },
    include: { journalEntry: true },
    orderBy: { journalEntry: { date: 'asc' } },
  });

  const expectedMatrix = [
    { date: '01-09-2026', expectedCash: 8325.00, expectedBank: 50777.34 },
    { date: '02-09-2026', expectedCash: 9125.00, expectedBank: 9127.34 },
    { date: '03-09-2026', expectedCash: 105475.00, expectedBank: 9449.34 },
    { date: '04-09-2026', expectedCash: 86290.00, expectedBank: 12449.34 },
  ];

  console.log('\nDaily Balance Trace from General Ledger:');
  console.log('Date        | Cash Balance (Actual / Expected) | Federal Bank (Actual / Expected) | Status');
  console.log('------------|-----------------------------------|-----------------------------------|-------');

  for (const day of expectedMatrix) {
    // Balances up to the end of that day
    const dayEnd = new Date(`${day.date.split('-').reverse().join('-')}T23:59:59.999Z`);
    
    const cashLines = dailyJournals.filter(l => l.accountId === cashLedger.id && l.journalEntry.date <= dayEnd);
    const bankLines = dailyJournals.filter(l => l.accountId === federalBankLedger.id && l.journalEntry.date <= dayEnd);

    const cashBal = cashLines.reduce((acc, l) => acc + Number(l.debit) - Number(l.credit), 0);
    const bankBal = bankLines.reduce((acc, l) => acc + Number(l.debit) - Number(l.credit), 0);

    const cashMatch = Math.abs(cashBal - day.expectedCash) < 0.01;
    const bankMatch = Math.abs(bankBal - day.expectedBank) < 0.01;
    const pass = cashMatch && bankMatch;

    console.log(
      `${day.date}  | ₹${cashBal.toFixed(2).padStart(10)} / ₹${day.expectedCash.toFixed(2).padStart(10)} | ₹${bankBal.toFixed(2).padStart(10)} / ₹${day.expectedBank.toFixed(2).padStart(10)} | ${pass ? 'PASS ✓' : 'FAIL ✗'}`
    );
  }

  const actualClosingCash = Number(cashAcc?.currentBalance || 0);
  const actualClosingBank = Number(fedAcc?.currentBalance || 0);

  const finalCashPass = Math.abs(actualClosingCash - 86290.00) < 0.01;
  const finalBankPass = Math.abs(actualClosingBank - 12449.34) < 0.01;

  console.log('\n----------------------------------------------------------------');
  console.log(`Expected Final Cash:         ₹86,290.00 | Actual: ₹${actualClosingCash.toFixed(2)} [${finalCashPass ? 'PASS ✓' : 'FAIL ✗'}]`);
  console.log(`Expected Final Federal Bank: ₹12,449.34 | Actual: ₹${actualClosingBank.toFixed(2)} [${finalBankPass ? 'PASS ✓' : 'FAIL ✗'}]`);
  console.log('----------------------------------------------------------------');

  console.log(`\nMigration Summary:`);
  console.log(`Total Source Rows:     ${DAY_BOOK_ROWS.length}`);
  console.log(`Existing Matches:      ${exactMatches}`);
  console.log(`Newly Imported:        ${newRecords}`);
  console.log(`Overall Status:        ${finalCashPass && finalBankPass ? 'COMPLETED SUCCESSFULLY ✓' : 'RECONCILIATION FAILED ✗'}\n`);

  return {
    success: finalCashPass && finalBankPass,
    totalRows: DAY_BOOK_ROWS.length,
    exactMatches,
    newRecords,
    actualClosingCash,
    actualClosingBank,
  };
}

if (require.main === module) {
  migrateBiofixDayBook()
    .catch((err) => {
      console.error('[MIGRATION ERROR]', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
