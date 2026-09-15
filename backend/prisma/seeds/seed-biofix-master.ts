import { 
  PrismaClient, 
  BusinessPartnerType, 
  CustomerCategory, 
  GSTRegistrationStatus, 
  TaxPreference, 
  InvoiceType, 
  TaxMode, 
  DocumentStatus, 
  ExpenseStatus, 
  ApprovalStatus, 
  PaymentMethod, 
  PaidFromType, 
  BankAccountType, 
  ItemType,
  AccountCategory,
  AccountSubCategory,
  AccountNature,
  AccountBalanceType,
  PaymentType
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[BIOFIX MASTER SEED] Executing 100% complete seed for BIOFIX TECHNOLOGY LLP...');

  // 1. Find or Create Company
  let company = await prisma.company.findFirst({
    where: {
      OR: [
        { gstin: '32ABDFB4446M1ZG' },
        { companyName: 'BIOFIX TECHNOLOGY LLP' },
        { companyName: 'BIOFIX TECHNOLOGY' },
      ],
    },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        companyName: 'BIOFIX TECHNOLOGY LLP',
        legalName: 'BIOFIX TECHNOLOGY LLP',
        gstin: '32ABDFB4446M1ZG',
        email: 'biofixofficial@gmail.com',
        phone: '91-7510510947',
        address: 'MC BUILDING, BYPASS ROAD, KONDOTTY, MALAPPURAM',
        state: 'Kerala',
        pinCode: '673638',
        country: 'India',
        currency: 'INR',
      },
    });
  } else {
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        companyName: 'BIOFIX TECHNOLOGY LLP',
        legalName: 'BIOFIX TECHNOLOGY LLP',
        gstin: '32ABDFB4446M1ZG',
        email: 'biofixofficial@gmail.com',
        phone: '91-7510510947',
        address: 'MC BUILDING, BYPASS ROAD, KONDOTTY, MALAPPURAM',
        state: 'Kerala',
        pinCode: '673638',
        country: 'India',
        currency: 'INR',
      },
    });
  }

  const companyId = company.id;

  // 2. Financial Year Setup (2026-2027)
  const financialYear = await prisma.financialYear.upsert({
    where: {
      companyId_name: {
        companyId,
        name: 'FY 2026-27',
      },
    },
    update: {
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isActive: true,
      isClosed: false,
    },
    create: {
      companyId,
      name: 'FY 2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isActive: true,
      isClosed: false,
    },
  });
  console.log('[BIOFIX SEED] Financial Year 2026-27 configured.');

  // 3. Departments
  const departmentsData = [
    { name: 'Institute', code: 'INST', description: 'Main student training course batches and certifications' },
    { name: 'Solution', code: 'SOL', description: 'Water treatment solutions, chemicals, jars, and plant equipment' },
    { name: 'Waterlab', code: 'WLAB', description: 'Water testing lab, testing analysis, grain probes, and Hrydyam expense' },
  ];

  const departmentsMap: Record<string, string> = {};
  for (const dept of departmentsData) {
    const d = await prisma.department.upsert({
      where: {
        companyId_name: {
          companyId,
          name: dept.name,
        },
      },
      update: { code: dept.code, description: dept.description, isActive: true },
      create: {
        companyId,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        isActive: true,
      },
    });
    departmentsMap[dept.name] = d.id;
  }

  const custDeptMap: Record<string, string> = {};
  for (const dept of departmentsData) {
    try {
      const cd = await prisma.customerDepartment.upsert({
        where: {
          companyId_name: {
            companyId,
            name: dept.name,
          },
        },
        update: { description: dept.description, isActive: true, customerType: dept.name === 'Institute' ? 'B2C' : 'B2B' },
        create: {
          companyId,
          name: dept.name,
          description: dept.description,
          customerType: dept.name === 'Institute' ? 'B2C' : 'B2B',
          isActive: true,
        },
      });
      custDeptMap[dept.name] = cd.id;
    } catch {}
  }

  // 4. Chart of Accounts Tree
  const accountsToCreate = [
    // Assets
    { name: 'Cash on Hand (Biofix)', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, nature: AccountNature.DEBIT, balance: 105475.0 },
    { name: 'Federal Bank A/c 2107', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, nature: AccountNature.DEBIT, balance: 9449.34 },
    { name: 'HDFC Bank A/c', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, nature: AccountNature.DEBIT, balance: 0.0 },
    { name: 'Accounts Receivable (Debtors)', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, nature: AccountNature.DEBIT, balance: 0.0 },
    
    // Revenues
    { name: 'Course Fees Income (Institute)', category: AccountCategory.REVENUE, subCategory: AccountSubCategory.SERVICE_REVENUE, nature: AccountNature.CREDIT, balance: 0.0 },
    { name: 'Water Testing Revenue (Waterlab)', category: AccountCategory.REVENUE, subCategory: AccountSubCategory.SERVICE_REVENUE, nature: AccountNature.CREDIT, balance: 0.0 },
    { name: 'Chemical & Solution Sales (Solution)', category: AccountCategory.REVENUE, subCategory: AccountSubCategory.SALES_REVENUE, nature: AccountNature.CREDIT, balance: 0.0 },
    { name: 'Lab Setup & Service Income', category: AccountCategory.REVENUE, subCategory: AccountSubCategory.SERVICE_REVENUE, nature: AccountNature.CREDIT, balance: 0.0 },
    
    // Expenses
    { name: 'Staff Salaries & Stipends', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, nature: AccountNature.DEBIT, balance: 0.0 },
    { name: 'Building Rent Expense', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, nature: AccountNature.DEBIT, balance: 0.0 },
    { name: 'Utilities & Mobile Recharges', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, nature: AccountNature.DEBIT, balance: 0.0 },
    { name: 'Travelling & Petrol Expenses', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, nature: AccountNature.DEBIT, balance: 0.0 },
    { name: 'Marketing & Media Production', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, nature: AccountNature.DEBIT, balance: 0.0 },
    { name: 'Commissions & Franchise Expense', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, nature: AccountNature.DEBIT, balance: 0.0 },
    { name: 'Lab Chemicals & Materials Purchase', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.COGS, nature: AccountNature.DEBIT, balance: 0.0 },
    { name: 'Hrydyam Waterlab Operational Expenses', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, nature: AccountNature.DEBIT, balance: 0.0 },
    { name: 'Expenses - Others', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, nature: AccountNature.DEBIT, balance: 0.0 },
  ];

  const coaMap: Record<string, string> = {};
  for (const acc of accountsToCreate) {
    const a = await prisma.account.upsert({
      where: {
        companyId_name: {
          companyId,
          name: acc.name,
        },
      },
      update: {
        category: acc.category,
        subCategory: acc.subCategory,
        nature: acc.nature,
        balanceType: acc.nature === AccountNature.DEBIT ? AccountBalanceType.DEBIT : AccountBalanceType.CREDIT,
        balance: acc.balance,
      },
      create: {
        companyId,
        name: acc.name,
        category: acc.category,
        subCategory: acc.subCategory,
        nature: acc.nature,
        balanceType: acc.nature === AccountNature.DEBIT ? AccountBalanceType.DEBIT : AccountBalanceType.CREDIT,
        balance: acc.balance,
      },
    });
    coaMap[acc.name] = a.id;
  }
  console.log('[BIOFIX SEED] Chart of Accounts created and mapped.');

  // 5. Setup Bank & Cash Accounts linked to Chart of Accounts
  let cashAccount = await prisma.cashAccount.findFirst({
    where: { companyId, name: 'Cash on Hand' },
  });
  if (!cashAccount) {
    cashAccount = await prisma.cashAccount.create({
      data: {
        companyId,
        name: 'Cash on Hand',
        accountId: coaMap['Cash on Hand (Biofix)'],
        openingBalance: 8475.0,
        currentBalance: 105475.0,
        isDefault: true,
      },
    });
  } else {
    cashAccount = await prisma.cashAccount.update({
      where: { id: cashAccount.id },
      data: {
        accountId: coaMap['Cash on Hand (Biofix)'],
        openingBalance: 8475.0,
        currentBalance: 105475.0,
        isDefault: true,
      },
    });
  }

  let federalBank = await prisma.bankAccount.findFirst({
    where: { companyId, accountNumber: '25150200002107' },
  });
  if (!federalBank) {
    federalBank = await prisma.bankAccount.create({
      data: {
        companyId,
        name: 'Federal Bank (Kizhisseri)',
        accountName: 'BIOFIX TECHNOLOGY',
        accountNumber: '25150200002107',
        ifsc: 'FDRI0002515',
        bankName: 'Federal Bank',
        accountId: coaMap['Federal Bank A/c 2107'],
        accountType: BankAccountType.CURRENT,
        openingBalance: 5203.34,
        currentBalance: 9449.34,
        isDefault: true,
        status: 'ACTIVE',
      },
    });
  } else {
    federalBank = await prisma.bankAccount.update({
      where: { id: federalBank.id },
      data: {
        name: 'Federal Bank (Kizhisseri)',
        accountName: 'BIOFIX TECHNOLOGY',
        accountNumber: '25150200002107',
        ifsc: 'FDRI0002515',
        bankName: 'Federal Bank',
        accountId: coaMap['Federal Bank A/c 2107'],
        accountType: BankAccountType.CURRENT,
        openingBalance: 5203.34,
        currentBalance: 9449.34,
        isDefault: true,
        status: 'ACTIVE',
      },
    });
  }

  let hdfcBank = await prisma.bankAccount.findFirst({
    where: { companyId, name: { contains: 'HDFC' } },
  });
  if (!hdfcBank) {
    hdfcBank = await prisma.bankAccount.create({
      data: {
        companyId,
        name: 'HDFC Bank',
        accountName: 'BIOFIX TECHNOLOGY',
        accountNumber: '50200098765432',
        ifsc: 'HDFC0000123',
        bankName: 'HDFC Bank',
        accountId: coaMap['HDFC Bank A/c'],
        accountType: BankAccountType.CURRENT,
        openingBalance: 0.0,
        currentBalance: 0.0,
        isDefault: false,
        status: 'ACTIVE',
      },
    });
  }

  // 6. Expense Categories
  const expenseCategories = [
    { name: 'Operating Expenses', acc: 'Expenses - Others' },
    { name: 'Expenses - Others', acc: 'Expenses - Others' },
    { name: 'Utilities & Recharges', acc: 'Utilities & Mobile Recharges' },
    { name: 'Salary & Wages', acc: 'Staff Salaries & Stipends' },
    { name: 'Building Rent', acc: 'Building Rent Expense' },
    { name: 'Traveling & Petrol', acc: 'Travelling & Petrol Expenses' },
    { name: 'Marketing & Media', acc: 'Marketing & Media Production' },
    { name: 'Commissions & Franchise', acc: 'Commissions & Franchise Expense' },
    { name: 'Lab & Chemical Materials', acc: 'Lab Chemicals & Materials Purchase' },
    { name: 'Waterlab Expenses (Hrydyam)', acc: 'Hrydyam Waterlab Operational Expenses' },
  ];

  const expCatMap: Record<string, string> = {};
  for (const cat of expenseCategories) {
    const c = await prisma.expenseCategory.upsert({
      where: {
        companyId_name: {
          companyId,
          name: cat.name,
        },
      },
      update: { 
        isActive: true,
        accountId: coaMap[cat.acc] || null,
      },
      create: {
        companyId,
        name: cat.name,
        isActive: true,
        accountId: coaMap[cat.acc] || null,
      },
    });
    expCatMap[cat.name] = c.id;
  }

  // 7. Product Catalog
  const products = [
    { name: '20 LTR JAR', hsnCode: '22011010', unit: 'PCS', sellingPrice: 170.0, gstRate: 18.0 },
    { name: 'GENESOL 80', hsnCode: '29319090', unit: 'LTR', sellingPrice: 510.0, gstRate: 18.0 },
    { name: 'CALCIUMCHLORIDE DIHYDRATE-FOOD GRADE', hsnCode: '28272000', unit: 'KG', sellingPrice: 175.0, gstRate: 18.0 },
    { name: 'MAGNESIUM SULPHATE HEPTAHYDRATE-FOOD GRADE', hsnCode: '28332100', unit: 'KG', sellingPrice: 104.0, gstRate: 18.0 },
    { name: 'POTTASSIUM BICARBONATE - FOOD GRADE', hsnCode: '28369990', unit: 'KG', sellingPrice: 276.0, gstRate: 18.0 },
    { name: 'MEMBRANE FILTERS-CN [0.2 µm/47mm]', hsnCode: '84212900', unit: 'PCS', sellingPrice: 2086.24, gstRate: 18.0 },
    { name: 'Standard SS304 Grain Probe', hsnCode: '90318205', unit: 'PCS', sellingPrice: 4400.0, gstRate: 18.0 },
    { name: 'Standard SS 304 Double-Tube Grain Probe', hsnCode: '90318205', unit: 'PCS', sellingPrice: 5800.0, gstRate: 18.0 },
    { name: 'Fully Automatic Vertical Laboratory Autoclave', hsnCode: '84192010', unit: 'PCS', sellingPrice: 41500.0, gstRate: 18.0 },
    { name: 'LABORATORY EQUIPMENTS', hsnCode: '84198990', unit: 'SET', sellingPrice: 210000.0, gstRate: 18.0 },
    { name: 'LABORATORY CHEMICALS', hsnCode: '98020000', unit: 'SET', sellingPrice: 55000.0, gstRate: 18.0 },
    { name: 'LABORATORY GLASSWARES', hsnCode: '70172000', unit: 'SET', sellingPrice: 40000.0, gstRate: 18.0 },
    { name: 'GLASSWARES & CHEMICALS', hsnCode: '85141000', unit: 'SET', sellingPrice: 28000.0, gstRate: 18.0 },
    { name: '20 inch 5 micron filter slim', hsnCode: '842121', unit: 'PCS', sellingPrice: 120.0, gstRate: 18.0 },
    { name: 'CHLOROTEX 100ML', hsnCode: '38220090', unit: 'BTL', sellingPrice: 495.0, gstRate: 18.0 },
    { name: 'POTASSIUM PERMANGANATE 500GM', hsnCode: '28416100', unit: 'BTL', sellingPrice: 786.0, gstRate: 18.0 },
    { name: 'ETHANOL 500 ml bottle', hsnCode: '22072000', unit: 'PCS', sellingPrice: 820.0, gstRate: 18.0 },
    { name: 'ASPARGINE PROLINE BROTH 100GM', hsnCode: '38210000', unit: 'PCS', sellingPrice: 1175.0, gstRate: 18.0 },
    { name: 'BUFFER CAPSULES-4', hsnCode: '38229090', unit: 'BTL', sellingPrice: 275.0, gstRate: 18.0 },
    { name: 'CHROMOGENIC COLIFORM AGAR 50GM-READYMED-01', hsnCode: '28332990', unit: 'BTL', sellingPrice: 4800.0, gstRate: 18.0 },
    { name: 'PIPETTE PUMP 25ML POLYLAB', hsnCode: '39269099', unit: 'PCS', sellingPrice: 390.0, gstRate: 18.0 },
    { name: 'SODIUM HYPOCHLORITE SOLUTION CONTAIN 4-6% AVAILABLE CHLORINE', hsnCode: '28289019', unit: 'LTR', sellingPrice: 120.0, gstRate: 18.0 },
    { name: 'SODIUM BICARBONATE EXTRAPURE 99%', hsnCode: '28363000', unit: 'BTL', sellingPrice: 365.0, gstRate: 18.0 },
    { name: 'HYDROGEN PEROXIDE 30% 5LTR CAN', hsnCode: '28470000', unit: 'PCS', sellingPrice: 1872.0, gstRate: 18.0 },
    { name: 'Water Testing Service', hsnCode: '998346', unit: 'TEST', sellingPrice: 900.0, gstRate: 18.0, isService: true },
    { name: 'Institute Course Fee', hsnCode: '999293', unit: 'STUDENT', sellingPrice: 5000.0, gstRate: 0.0, isService: true },
  ];

  const productMap: Record<string, string> = {};
  for (const p of products) {
    let prod = await prisma.product.findFirst({
      where: { companyId, name: p.name },
    });
    if (!prod) {
      prod = await prisma.product.create({
        data: {
          companyId,
          name: p.name,
          hsnCode: p.hsnCode,
          unit: p.unit,
          sellingPrice: p.sellingPrice,
          gstRate: p.gstRate,
          isService: p.isService ?? false,
          isInventoryItem: !p.isService,
          itemType: p.isService ? ItemType.SERVICE : ItemType.FINISHED_GOOD,
          taxPreference: p.gstRate > 0 ? TaxPreference.TAXABLE : TaxPreference.NIL_RATED,
        },
      });
    }
    productMap[p.name] = prod.id;
  }

  // 8. Balanced Double-Entry Journal Entries for Day Book Transactions
  // Clean prior journal entries for daybook dates
  await prisma.journalEntry.deleteMany({
    where: {
      companyId,
      date: {
        gte: new Date('2026-09-01'),
        lte: new Date('2026-09-03T23:59:59'),
      },
    },
  });

  const journalTransactions = [
    // 01-09-2026
    {
      date: new Date('2026-09-01'),
      desc: 'Recharge 946 (351)',
      ref: 'DAYBOOK-20260901-01',
      dept: 'Institute',
      debitAcc: 'Utilities & Mobile Recharges',
      creditAcc: 'Federal Bank A/c 2107',
      amount: 201.0,
    },
    {
      date: new Date('2026-09-01'),
      desc: 'Recharge 947',
      ref: 'DAYBOOK-20260901-02',
      dept: 'Solution',
      debitAcc: 'Utilities & Mobile Recharges',
      creditAcc: 'Federal Bank A/c 2107',
      amount: 201.0,
    },
    {
      date: new Date('2026-09-01'),
      desc: 'Recharge Balaance 946 (351)',
      ref: 'DAYBOOK-20260901-03',
      dept: 'Institute',
      debitAcc: 'Utilities & Mobile Recharges',
      creditAcc: 'Cash on Hand (Biofix)',
      amount: 150.0,
    },
    {
      date: new Date('2026-09-01'),
      desc: 'Malappuram FSSAI Probe Settlement',
      ref: 'DAYBOOK-20260901-04',
      dept: 'Solution',
      debitAcc: 'Federal Bank A/c 2107',
      creditAcc: 'Accounts Receivable (Debtors)',
      amount: 83072.0,
    },
    {
      date: new Date('2026-09-01'),
      desc: 'COURSE FEE (Anjali)',
      ref: 'DAYBOOK-20260901-05',
      dept: 'Institute',
      debitAcc: 'Federal Bank A/c 2107',
      creditAcc: 'Course Fees Income (Institute)',
      amount: 5000.0,
    },
    {
      date: new Date('2026-09-01'),
      desc: 'Shaheer Commission Probe',
      ref: 'DAYBOOK-20260901-06',
      dept: 'Solution',
      debitAcc: 'Commissions & Franchise Expense',
      creditAcc: 'Federal Bank A/c 2107',
      amount: 11080.0,
    },
    {
      date: new Date('2026-09-01'),
      desc: 'Ismail Kizzisherri Franchse',
      ref: 'DAYBOOK-20260901-07',
      dept: 'Solution',
      debitAcc: 'Commissions & Franchise Expense',
      creditAcc: 'Federal Bank A/c 2107',
      amount: 15000.0,
    },
    {
      date: new Date('2026-09-01'),
      desc: 'Salary (Shadiya)',
      ref: 'DAYBOOK-20260901-08',
      dept: 'Institute',
      debitAcc: 'Staff Salaries & Stipends',
      creditAcc: 'Federal Bank A/c 2107',
      amount: 14516.0,
    },
    {
      date: new Date('2026-09-01'),
      desc: 'Sarath (Onam Video Editing)',
      ref: 'DAYBOOK-20260901-09',
      dept: 'Institute',
      debitAcc: 'Marketing & Media Production',
      creditAcc: 'Federal Bank A/c 2107',
      amount: 1500.0,
    },

    // 02-09-2026
    {
      date: new Date('2026-09-02'),
      desc: 'Chemical Sale',
      ref: 'DAYBOOK-20260902-01',
      dept: 'Solution',
      debitAcc: 'Federal Bank A/c 2107',
      creditAcc: 'Chemical & Solution Sales (Solution)',
      amount: 350.0,
    },
    {
      date: new Date('2026-09-02'),
      desc: 'Water Test Revenue',
      ref: 'DAYBOOK-20260902-02',
      dept: 'Waterlab',
      debitAcc: 'Cash on Hand (Biofix)',
      creditAcc: 'Water Testing Revenue (Waterlab)',
      amount: 900.0,
    },
    {
      date: new Date('2026-09-02'),
      desc: 'Building Rent',
      ref: 'DAYBOOK-20260902-03',
      dept: 'Institute',
      debitAcc: 'Building Rent Expense',
      creditAcc: 'Federal Bank A/c 2107',
      amount: 42000.0,
    },
    {
      date: new Date('2026-09-02'),
      desc: 'Anas Petrol Expense',
      ref: 'DAYBOOK-20260902-04',
      dept: 'Solution',
      debitAcc: 'Travelling & Petrol Expenses',
      creditAcc: 'Cash on Hand (Biofix)',
      amount: 100.0,
    },

    // 03-09-2026
    {
      date: new Date('2026-09-03'),
      desc: 'Salary (Trainee Shehina Sherin)',
      ref: 'DAYBOOK-20260903-01',
      dept: 'Waterlab',
      debitAcc: 'Staff Salaries & Stipends',
      creditAcc: 'Federal Bank A/c 2107',
      amount: 4678.0,
    },
    {
      date: new Date('2026-09-03'),
      desc: 'Course Fee (Jarshana)',
      ref: 'DAYBOOK-20260903-02',
      dept: 'Institute',
      debitAcc: 'Federal Bank A/c 2107',
      creditAcc: 'Course Fees Income (Institute)',
      amount: 5000.0,
    },
    {
      date: new Date('2026-09-03'),
      desc: 'Alpha DM Water',
      ref: 'DAYBOOK-20260903-03',
      dept: 'Waterlab',
      debitAcc: 'Lab Chemicals & Materials Purchase',
      creditAcc: 'Cash on Hand (Biofix)',
      amount: 3500.0,
    },
    {
      date: new Date('2026-09-03'),
      desc: 'Latheef Perintalmanna Lab',
      ref: 'DAYBOOK-20260903-04',
      dept: 'Waterlab',
      debitAcc: 'Cash on Hand (Biofix)',
      creditAcc: 'Lab Setup & Service Income',
      amount: 100000.0,
    },
    {
      date: new Date('2026-09-03'),
      desc: 'Edavanna Petrol Expense',
      ref: 'DAYBOOK-20260903-05',
      dept: 'Solution',
      debitAcc: 'Travelling & Petrol Expenses',
      creditAcc: 'Cash on Hand (Biofix)',
      amount: 150.0,
    },
  ];

  for (const j of journalTransactions) {
    const debitAccountId = coaMap[j.debitAcc];
    const creditAccountId = coaMap[j.creditAcc];
    const deptId = departmentsMap[j.dept];

    if (!debitAccountId || !creditAccountId) continue;

    await prisma.journalEntry.create({
      data: {
        companyId,
        date: j.date,
        reference: j.ref,
        description: j.desc,
        lines: {
          create: [
            {
              accountId: debitAccountId,
              departmentId: deptId,
              debit: j.amount,
              credit: 0,
              description: `Debit: ${j.desc}`,
            },
            {
              accountId: creditAccountId,
              departmentId: deptId,
              debit: 0,
              credit: j.amount,
              description: `Credit: ${j.desc}`,
            },
          ],
        },
      },
    });
  }
  console.log('[BIOFIX SEED] Double-entry balanced General Ledgers & Journal Entries posted.');

  // 9. Payment Allocation for Paid Invoices
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: DocumentStatus.PAID,
    },
    include: { businessPartner: true },
  });

  for (const inv of paidInvoices) {
    let payment = await prisma.transactionPayment.findFirst({
      where: {
        companyId,
        reference: inv.invoiceNo,
      },
    });

    if (!payment) {
      payment = await prisma.transactionPayment.create({
        data: {
          companyId,
          businessPartnerId: inv.businessPartnerId,
          bankAccountId: federalBank.id,
          paymentNo: `PAY-${inv.invoiceNo.replace(/\//g, '-')}`,
          paymentType: PaymentType.INBOUND,
          date: inv.date,
          amount: inv.grandTotal,
          method: PaymentMethod.BANK_TRANSFER,
          reference: inv.invoiceNo,
          notes: `Full payment settlement for invoice ${inv.invoiceNo}`,
          allocations: {
            create: {
              invoiceId: inv.id,
              amount: inv.grandTotal,
            },
          },
        },
      });
    }
  }
  console.log(`[BIOFIX SEED] Payment allocations linked for ${paidInvoices.length} paid B2B invoices.`);
  console.log('[BIOFIX SEED] 🌟 100% COMPLETE SEEDING EXECUTED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error('[BIOFIX SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
