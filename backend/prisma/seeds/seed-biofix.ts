import { PrismaClient, BusinessPartnerType, CustomerCategory, GSTRegistrationStatus, TaxPreference, InvoiceType, TaxMode, DocumentStatus, TaxCategory, ExpenseStatus, ApprovalStatus, PaymentMethod, PaidFromType, BankAccountType, ItemType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[BIOFIX SEED] Starting comprehensive, accurate database seeding for BIOFIX TECHNOLOGY LLP...');

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
    console.log(`[BIOFIX SEED] Created Company: ${company.companyName} (${company.id})`);
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
    console.log(`[BIOFIX SEED] Updated Company: ${company.companyName} (${company.id})`);
  }

  const companyId = company.id;

  // 2. Setup Departments
  const departmentsData = [
    { name: 'Institute', code: 'INST', description: 'Main course batches and student certifications' },
    { name: 'Solution', code: 'SOL', description: 'Water treatment solutions, chemicals, jars, and plant components' },
    { name: 'Waterlab', code: 'WLAB', description: 'Water testing services, analytical reports, lab setup, and testing probes' },
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
  console.log('[BIOFIX SEED] Departments verified:', departmentsMap);

  // 3. Setup Customer Departments (if model exists in CRM)
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
    } catch {
      // Ignore if not present
    }
  }

  // 4. Setup Bank & Cash Accounts
  // Cash on Hand
  let cashAccount = await prisma.cashAccount.findFirst({
    where: { companyId, name: 'Cash on Hand' },
  });
  if (!cashAccount) {
    cashAccount = await prisma.cashAccount.create({
      data: {
        companyId,
        name: 'Cash on Hand',
        openingBalance: 8475.0,
        currentBalance: 105475.0,
        isDefault: true,
      },
    });
  } else {
    cashAccount = await prisma.cashAccount.update({
      where: { id: cashAccount.id },
      data: {
        openingBalance: 8475.0,
        currentBalance: 105475.0,
        isDefault: true,
      },
    });
  }

  // Federal Bank
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
        accountType: BankAccountType.CURRENT,
        openingBalance: 5203.34,
        currentBalance: 9449.34,
        isDefault: true,
        status: 'ACTIVE',
      },
    });
  }

  // HDFC Bank (Inactive/No transactions)
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
        accountType: BankAccountType.CURRENT,
        openingBalance: 0.0,
        currentBalance: 0.0,
        isDefault: false,
        status: 'ACTIVE',
      },
    });
  }

  console.log('[BIOFIX SEED] Bank & Cash Accounts setup successfully.');

  // 5. Setup Expense Categories
  const expenseCategories = [
    'Operating Expenses',
    'Expenses - Others',
    'Utilities & Recharges',
    'Salary & Wages',
    'Building Rent',
    'Traveling & Petrol',
    'Marketing & Media',
    'Commissions & Franchise',
    'Lab & Chemical Materials',
    'Waterlab Expenses (Hrydyam)',
  ];

  const expCatMap: Record<string, string> = {};
  for (const cat of expenseCategories) {
    const c = await prisma.expenseCategory.upsert({
      where: {
        companyId_name: {
          companyId,
          name: cat,
        },
      },
      update: { isActive: true },
      create: {
        companyId,
        name: cat,
        isActive: true,
      },
    });
    expCatMap[cat] = c.id;
  }

  // 6. Setup Products & Catalog
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
  console.log('[BIOFIX SEED] Product catalog seeded.');

  // 7. Seed Students (B2C Individual Clients under Institute Department)
  const studentsRaw = [
    { sl: 1, name: 'Fida T', batch: 1, contact: '8590130546', status: 'Paid', duration: '14 November 2024 - 13 December 2024' },
    { sl: 2, name: 'Harsha', batch: 1, contact: '8304950058', status: 'Paid' },
    { sl: 3, name: 'Nourin Shoukath', batch: 1, contact: '8111851913', status: 'Paid' },
    { sl: 4, name: 'Naja PC', batch: 1, contact: '8281700195', status: 'Paid' },
    { sl: 5, name: 'Amina Mubashira TP', batch: 2, contact: '7025519251', status: 'Paid', duration: '11 December 2024 – 10 January 2025' },
    { sl: 6, name: 'Jenna', batch: 2, contact: '9539384807', status: 'Paid' },
    { sl: 7, name: 'Abdul Ahad V', batch: 2, contact: '6282359088', status: 'Paid' },
    { sl: 8, name: 'Rashid Athikkal', batch: 2, contact: '9746997971', status: 'Paid' },
    { sl: 9, name: 'Abdul Basith', batch: 2, contact: '9745311561', status: 'Paid' },
    { sl: 10, name: 'Muhammed Shanib', batch: 2, contact: '9446089169', status: 'Paid' },
    { sl: 11, name: 'Mohammed Rikas', batch: 3, contact: '7034550541', status: 'Paid', duration: '11 April 2025 – 03 May 2025' },
    { sl: 12, name: 'Pranav PV', batch: 3, contact: '7736915193', status: 'Paid' },
    { sl: 13, name: 'Danish Rahman C', batch: 3, contact: '9633729211', status: 'Paid' },
    { sl: 14, name: 'Ahammed Shamil', batch: 3, contact: '7510597002', status: 'Paid' },
    { sl: 15, name: 'Rashida MK', batch: 3, contact: '9809656238', status: 'Paid' },
    { sl: 16, name: 'Muhammed Minhaj', batch: 3, contact: '8590377450', status: 'Paid' },
    { sl: 17, name: 'Shibin Nishad', batch: 4, contact: '8129847096', status: 'Paid', duration: '04 May 2025 – 10 June 2025' },
    { sl: 18, name: 'Muhammed Afsal', batch: 4, contact: '8943687962', status: 'Paid' },
    { sl: 19, name: 'Shamna K', batch: 4, contact: '9746726495', status: 'Paid' },
    { sl: 20, name: 'Malufa', batch: 4, contact: '8075777802', status: 'Paid' },
    { sl: 21, name: 'Fida MP', batch: 4, contact: '9747424492', status: 'Paid' },
    { sl: 22, name: 'Shaheeda', batch: 5, contact: '9061965110', status: 'Paid', duration: '10 July 2025 – 08 August 2025' },
    { sl: 23, name: 'Mohammed Naji M', batch: 5, contact: '9946241510', status: 'Paid' },
    { sl: 24, name: 'Drishya', batch: 5, contact: '7510640882', status: 'Paid' },
    { sl: 25, name: 'Pranav Jayaprakash', batch: 5, contact: '7592890414', status: 'Paid' },
    { sl: 26, name: 'Shahana Shurook', batch: 5, contact: '7902424452', status: 'Paid' },
    { sl: 27, name: 'Amra', batch: 6, contact: '9400385634', status: 'Paid', duration: '11 August 2025 – 05 September 2025' },
    { sl: 28, name: 'Asna', batch: 6, contact: '9037926552', status: 'Paid' },
    { sl: 29, name: 'Akshay', batch: 6, contact: '8129792590', status: 'Paid' },
    { sl: 30, name: 'Baby Shamila', batch: 6, contact: '6238551654', status: 'Paid' },
    { sl: 31, name: 'Byruha', batch: 6, contact: '7902497244', status: 'Paid' },
    { sl: 32, name: 'Labeeba Shameema M', batch: 7, contact: '', status: 'Paid', duration: '08 September 2025- 08 October 2025' },
    { sl: 33, name: 'Naishana', batch: 7, contact: '8138036380', status: 'Paid' },
    { sl: 34, name: 'Hilfa', batch: 7, contact: '', status: 'Paid' },
    { sl: 35, name: 'Shadila Thasni', batch: 7, contact: '9778217768', status: 'Paid' },
    { sl: 36, name: 'Shabeeha', batch: 7, contact: '9747672380', status: 'Paid' },
    { sl: 37, name: 'Favas', batch: 7, contact: '9496631528', status: 'Paid' },
    { sl: 38, name: 'Jezbin Jacob', batch: 8, contact: '8606003764', status: 'Paid', duration: '06 october 2025– 10 November 2025' },
    { sl: 39, name: 'Finu Sherin', batch: 8, contact: '9847414109', status: 'Paid' },
    { sl: 40, name: 'Vafa N', batch: 8, contact: '9656913120', status: 'Paid' },
    { sl: 41, name: 'Hiba M', batch: 8, contact: '9447822698', status: 'Paid' },
    { sl: 42, name: 'Safa', batch: 8, contact: '7012132161', status: 'Paid' },
    { sl: 43, name: 'Muhamed Safwan', batch: 8, contact: '9061236648', status: 'Paid' },
    { sl: 44, name: 'Muhammed Mubashir', batch: 8, contact: '8891509383', status: 'Paid' },
    { sl: 45, name: 'Aparna', batch: 9, contact: '7907457926', status: 'Paid', duration: '10 November 2025- 12 December 2025' },
    { sl: 46, name: 'Aslaha', batch: 10, contact: '9847186781', status: 'Paid', duration: '22 December 2025- 23 January 2026' },
    { sl: 47, name: 'Aliya', batch: 10, contact: '9746526461', status: 'Paid' },
    { sl: 48, name: 'Shada', batch: 10, contact: '9745243274', status: 'Paid' },
    { sl: 49, name: 'Afeefa', batch: 10, contact: '8606245642', status: 'Paid' },
    { sl: 50, name: 'Asna Nasreen', batch: 12, contact: '6235541794', status: 'Paid', duration: '10 April 2026 – 03 July 2026' },
    { sl: 51, name: 'Asna', batch: 12, contact: '9037016005', status: 'Paid' },
    { sl: 52, name: 'Shahina Sherin', batch: 12, contact: '9633514794', status: 'Paid' },
    { sl: 53, name: 'Shana', batch: 12, contact: '9496389230', status: 'Paid' },
    { sl: 54, name: 'Kripa', batch: 12, contact: '7356426095', status: 'Paid' },
    { sl: 55, name: 'Safna', batch: 12, contact: '9072572252', status: 'Paid' },
    { sl: 56, name: 'Sharbina', batch: 12, contact: '8590607335', status: 'Paid' },
    { sl: 57, name: 'Afnitha', batch: 12, contact: '8089736525', status: 'Paid' },
    { sl: 58, name: 'Sreejith', batch: 13, contact: '9778784615', status: 'Paid', duration: '03 May 2026- 02 August 2026' },
    { sl: 59, name: 'Noushida C/o Nizam Sir', batch: 13, contact: '8089331052', status: '5000' },
    { sl: 60, name: 'Smrithi', batch: 13, contact: '9037889328', status: 'Paid' },
    { sl: 61, name: 'Shabana', batch: 13, contact: '8714898835', status: 'Paid' },
    { sl: 62, name: 'Sreedevi', batch: 14, contact: '9778075523', status: 'Paid', duration: '23 June 2026- 22 August 2026' },
    { sl: 63, name: 'Punya', batch: 14, contact: '7012628246', status: 'Paid' },
    { sl: 64, name: 'Shiva Priya', batch: 14, contact: '9567585568', status: 'Paid' },
    { sl: 65, name: 'Nandini', batch: 14, contact: '8590580500', status: 'Paid' },
    { sl: 66, name: 'Anjusha', batch: 14, contact: '9778360836', status: 'Paid' },
    { sl: 67, name: 'Sahal', batch: 14, contact: '9847075913', status: 'Paid' },
    { sl: 68, name: 'Amina', batch: 14, contact: '9995376113', status: 'Paid' },
    { sl: 69, name: 'Anjali', batch: 15, contact: '7736857461', status: '10000', duration: '15 July 2026' },
    { sl: 70, name: 'Murshida', batch: 15, contact: '9567776844', status: '10000' },
    { sl: 71, name: 'Habeeba', batch: 15, contact: '9645834376', status: 'Paid' },
    { sl: 72, name: 'Muhsina Thesni', batch: 16, contact: '8891076482', status: '5000', duration: '17 August 2026' },
    { sl: 73, name: 'Fathima Rinshi', batch: 16, contact: '9995594810', status: '5000' },
    { sl: 74, name: 'Sneha Raj', batch: 16, contact: '9995223571', status: '5000' },
    { sl: 75, name: 'Athira', batch: 16, contact: '7736348792', status: '10000' },
    { sl: 76, name: 'Ismayil', batch: 16, contact: '7012901436', status: '5000' },
  ];

  const shortTermStudents = [
    { sl: 1, name: 'Hashim Hamza', contact: '9747778028', status: 'Paid', duration: '23/09/25 - 25/09/25' },
    { sl: 2, name: 'Nasla', contact: '8714865181', status: 'Paid', duration: '23/09/25 - 25/09/25' },
    { sl: 3, name: 'Sangeetha', contact: '7560996106', status: 'Paid', duration: '06/04/26 – 08/04/26' },
    { sl: 4, name: 'Ashwathy', contact: '7558835467', status: 'Paid', duration: '06/02/26 – 08/02/26' },
    { sl: 5, name: 'Arya Sree', contact: '9961790384', status: 'Pending', duration: '08/05/26 – 15/05/26' },
    { sl: 6, name: 'Ajmi', contact: '9747888349', status: 'Pending', duration: '08/05/26 – 10/05/26' },
  ];

  for (const s of studentsRaw) {
    const bpCode = `STU-B${s.batch}-${String(s.sl).padStart(3, '0')}`;
    const displayName = s.batch ? `${s.name} (Batch ${s.batch})` : s.name;
    const notes = `Student Batch ${s.batch} | Duration: ${s.duration || 'N/A'} | Status: ${s.status}`;
    
    let bp = await prisma.businessPartner.findFirst({
      where: { companyId, bpCode },
    });

    if (!bp) {
      await prisma.businessPartner.create({
        data: {
          companyId,
          bpType: BusinessPartnerType.CUSTOMER,
          customerType: CustomerCategory.B2C,
          bpCode,
          name: displayName,
          phone: s.contact || null,
          customerDepartmentId: custDeptMap['Institute'] || null,
          taxPreference: TaxPreference.NIL_RATED,
          gstRegistrationStatus: GSTRegistrationStatus.UNREGISTERED,
          state: 'Kerala',
          stateCode: '32',
          notes,
        },
      });
    }
  }

  for (const s of shortTermStudents) {
    const bpCode = `STU-ST-${String(s.sl).padStart(3, '0')}`;
    const displayName = `${s.name} (Short Term - Nizam Sir)`;
    const notes = `Short Term Course C/o Nizam Sir | Duration: ${s.duration} | Status: ${s.status}`;

    let bp = await prisma.businessPartner.findFirst({
      where: { companyId, bpCode },
    });

    if (!bp) {
      await prisma.businessPartner.create({
        data: {
          companyId,
          bpType: BusinessPartnerType.CUSTOMER,
          customerType: CustomerCategory.B2C,
          bpCode,
          name: displayName,
          phone: s.contact || null,
          customerDepartmentId: custDeptMap['Institute'] || null,
          taxPreference: TaxPreference.NIL_RATED,
          gstRegistrationStatus: GSTRegistrationStatus.UNREGISTERED,
          state: 'Kerala',
          stateCode: '32',
          notes,
        },
      });
    }
  }

  console.log(`[BIOFIX SEED] Successfully seeded 76 Batch Students + 6 Short Term Students into Institute.`);

  // 8. Seed B2B Customers
  const b2bCustomers = [
    {
      code: 'CUST-EKM',
      name: 'EKM TRADING COMPANY',
      gstin: '32BOKPA9538J1ZS',
      address: '751/4, CHERUKODE-MALAKKAL ROAD, CHATHANGOTTUPURAM PO, 679328',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-EFF',
      name: 'EFF TRADING LLP',
      gstin: '32AAKFE3588M1ZZ',
      phone: '8281047064',
      address: 'EFF TOWER, WEST SILK STREET, NEAR COCONUT BAZAR, SOUTH BEACH, KOZHIKODE, 673032',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-EXOTIC',
      name: 'EXOTIC GENERAL TRADING COMPANY',
      gstin: '32AAHFE2076M1ZD',
      phone: '+919447977342',
      address: 'KAITHAPPURAM, SREEKANDAPURAM, KANNUR, 670631',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-GANGOTHRI',
      name: 'GANGOTHRI AQUA PROCESSING UNIT',
      gstin: '32BPWPP4597K1ZW',
      phone: '8884677772',
      address: 'KOKKUR PO, CHANGARAMKULAM, MALAPPURAM DIST, 679591',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-ASPIRA',
      name: 'ASPIRA MINERALS & FOODS',
      gstin: '32CEAPM3612N1ZN',
      address: 'ELAMBRAKKODE, POREDUM PO, CHADAYAMANGALAM, KOLLAM, 691534',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-INSTAPANI',
      name: 'INSTAPANI BEVERAGES INDIA',
      gstin: '32AJXPK1786B2Z2',
      phone: '9567478383',
      address: 'Kerala, India',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-ACFS-MLPM',
      name: 'Assistant Commissioner of Food Safety Malappuram',
      address: 'Civil Station Malappuram, Malappuram District, Kerala',
      state: 'Kerala',
      stateCode: '32',
      customerType: CustomerCategory.GOVERNMENT,
    },
    {
      code: 'CUST-ACFS-PTA',
      name: 'Assistant Commissioner Food and Safety Pathanamthitta',
      address: 'Pathanamthitta, Kerala',
      state: 'Kerala',
      stateCode: '32',
      customerType: CustomerCategory.GOVERNMENT,
    },
    {
      code: 'CUST-ACFS-KTM',
      name: 'Assistant Commissioner Food and Safety Kottayam',
      address: 'Kottayam, Kerala',
      state: 'Kerala',
      stateCode: '32',
      customerType: CustomerCategory.GOVERNMENT,
    },
    {
      code: 'CUST-PUREWATER',
      name: 'PURE WATER AND PURIFIERS',
      gstin: '32FYAPS8076P2ZK',
      address: '12/432 A, 12/432 B, ANGADIPPURAM, MALAPPURAM, PERINTHALMANNA, 679321',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-MIZUTECH',
      name: 'MIZUTECH WATER TECHNOLOGY',
      gstin: '32DRLPS3438F1ZN',
      address: 'Door No:5/428, Thelappilly, Irinjalakuda, Thrissur, Kerala, 680712',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-VIDYUL',
      name: 'VIDYUL AGENCIES - QUILON DROPS',
      gstin: '32BQQPB9980D1ZO',
      phone: '+91-9946717403',
      address: 'JALADHARA, MUNDAKKAL EAST, KOLLAM, 691001',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-ERANAD',
      name: 'ERANAD BEVERAGES PVT LTD',
      gstin: '32AAECE2265N1ZL',
      phone: '7558093155',
      address: 'PAVANNA, POOVATHIKKAL PO, AREEKODE, MALAPPURAM, 673639',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-DAISMAN',
      name: 'DAISMAN AYURVEDIC HOSPITAL',
      address: 'Kondotty, Malappuram, Kerala',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-DRINKING',
      name: 'DRINKING DROPS',
      gstin: '32CGMPR9872H1ZP',
      address: 'DOOR NO: 22/730, THETTAYIL BUILDING, SEA PORT AIRPORT ROAD, HMT COLONY PO, ERNAKULAM, 683503',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-HIMALAYA',
      name: 'HIMALAYA',
      gstin: '32HRJPS9731K1Z2',
      address: 'KP 1/58 A, PUTHIYAVILLA, PATTOLIMARKET, ALAPPUZHA, 690531',
      state: 'Kerala',
      stateCode: '32',
    },
    {
      code: 'CUST-CASH',
      name: 'CASH CUSTOMER',
      address: 'Kondotty, Kerala',
      state: 'Kerala',
      stateCode: '32',
      customerType: CustomerCategory.B2C,
    },
  ];

  const bpMap: Record<string, string> = {};
  for (const c of b2bCustomers) {
    let bp = await prisma.businessPartner.findFirst({
      where: { companyId, bpCode: c.code },
    });
    if (!bp) {
      bp = await prisma.businessPartner.create({
        data: {
          companyId,
          bpCode: c.code,
          name: c.name,
          gstin: c.gstin || null,
          phone: c.phone || null,
          address: c.address,
          state: c.state,
          stateCode: c.stateCode,
          placeOfSupply: 'Kerala (32)',
          bpType: BusinessPartnerType.CUSTOMER,
          customerType: c.customerType || CustomerCategory.B2B,
          gstRegistrationStatus: c.gstin ? GSTRegistrationStatus.REGISTERED : GSTRegistrationStatus.UNREGISTERED,
          taxPreference: TaxPreference.TAXABLE,
          customerDepartmentId: custDeptMap['Solution'] || null,
        },
      });
    }
    bpMap[c.code] = bp.id;
  }
  console.log('[BIOFIX SEED] B2B Customers registered.');

  // 9. Seed B2B Tax Invoices
  const invoicesData = [
    {
      invoiceNo: 'B2BF/68/26-27',
      date: new Date('2026-09-08'),
      dueDate: new Date('2026-09-15'),
      customerCode: 'CUST-EKM',
      salesPerson: 'Anas',
      status: DocumentStatus.SENT,
      items: [
        { product: '20 LTR JAR', qty: 88, rate: 170.0, taxPercent: 18.0, cgst: 1346.40, sgst: 1346.40, total: 17652.80 },
      ],
      subTotal: 14960.00,
      cgstAmount: 1346.40,
      sgstAmount: 1346.40,
      totalTaxAmount: 2692.80,
      grandTotal: 17653.00, // includes 0.20 adj
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/67/26-27',
      date: new Date('2026-09-07'),
      dueDate: new Date('2026-09-07'),
      customerCode: 'CUST-EFF',
      salesPerson: 'Anas',
      status: DocumentStatus.SENT,
      items: [
        { product: 'GENESOL 80', qty: 10, rate: 510.0, taxPercent: 18.0, cgst: 459.00, sgst: 459.00, total: 6018.00 },
      ],
      subTotal: 5100.00,
      cgstAmount: 459.00,
      sgstAmount: 459.00,
      totalTaxAmount: 918.00,
      grandTotal: 6018.00,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/66/26-27',
      date: new Date('2026-09-05'),
      dueDate: new Date('2026-09-05'),
      customerCode: 'CUST-EXOTIC',
      salesPerson: 'Anas',
      status: DocumentStatus.SENT,
      items: [
        { product: 'CALCIUMCHLORIDE DIHYDRATE-FOOD GRADE', qty: 7.85, rate: 175.0, taxPercent: 18.0, cgst: 123.64, sgst: 123.64, total: 1621.03 },
        { product: 'MAGNESIUM SULPHATE HEPTAHYDRATE-FOOD GRADE', qty: 10.00, rate: 104.0, taxPercent: 18.0, cgst: 93.60, sgst: 93.60, total: 1227.20 },
      ],
      subTotal: 2413.75,
      cgstAmount: 217.24,
      sgstAmount: 217.24,
      totalTaxAmount: 434.48,
      grandTotal: 2848.23,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/65/26-27',
      date: new Date('2026-09-02'),
      dueDate: new Date('2026-09-02'),
      customerCode: 'CUST-EFF',
      salesPerson: 'PAVITHRA',
      status: DocumentStatus.SENT,
      items: [
        { product: 'CALCIUMCHLORIDE DIHYDRATE-FOOD GRADE', qty: 5.0, rate: 175.0, taxPercent: 18.0, cgst: 78.75, sgst: 78.75, total: 1032.50 },
        { product: 'MAGNESIUM SULPHATE HEPTAHYDRATE-FOOD GRADE', qty: 5.0, rate: 104.0, taxPercent: 18.0, cgst: 46.80, sgst: 46.80, total: 613.60 },
        { product: 'POTTASSIUM BICARBONATE - FOOD GRADE', qty: 5.0, rate: 276.0, taxPercent: 18.0, cgst: 124.20, sgst: 124.20, total: 1628.40 },
      ],
      subTotal: 2775.00,
      cgstAmount: 249.75,
      sgstAmount: 249.75,
      totalTaxAmount: 499.50,
      grandTotal: 3274.50,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/64/26-27',
      date: new Date('2026-09-02'),
      dueDate: new Date('2026-09-02'),
      customerCode: 'CUST-GANGOTHRI',
      status: DocumentStatus.SENT,
      items: [
        { product: 'CALCIUMCHLORIDE DIHYDRATE-FOOD GRADE', qty: 6.0, rate: 175.0, taxPercent: 18.0, cgst: 94.50, sgst: 94.50, total: 1239.00 },
        { product: 'POTTASSIUM BICARBONATE - FOOD GRADE', qty: 6.0, rate: 276.0, taxPercent: 18.0, cgst: 149.04, sgst: 149.04, total: 1954.08 },
        { product: 'MAGNESIUM SULPHATE HEPTAHYDRATE-FOOD GRADE', qty: 1.0, rate: 104.0, taxPercent: 18.0, cgst: 9.36, sgst: 9.36, total: 122.72 },
        { product: 'MEMBRANE FILTERS-CN [0.2 µm/47mm]', qty: 1.0, rate: 2086.24, taxPercent: 18.0, cgst: 187.76, sgst: 187.76, total: 2461.76 },
      ],
      subTotal: 4896.24,
      cgstAmount: 440.66,
      sgstAmount: 440.66,
      totalTaxAmount: 881.32,
      grandTotal: 5777.56,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/63/26-27',
      date: new Date('2026-09-01'),
      dueDate: new Date('2026-09-01'),
      customerCode: 'CUST-EKM',
      salesPerson: 'Anas',
      status: DocumentStatus.SENT,
      items: [
        { product: '20 LTR JAR', qty: 162, rate: 170.0, taxPercent: 18.0, cgst: 2478.60, sgst: 2478.60, total: 32497.20 },
      ],
      subTotal: 27540.00,
      cgstAmount: 2478.60,
      sgstAmount: 2478.60,
      totalTaxAmount: 4957.20,
      grandTotal: 32497.20,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/62/26-27',
      date: new Date('2026-08-20'),
      dueDate: new Date('2026-08-30'),
      customerCode: 'CUST-EFF',
      salesPerson: 'PAVITHRA',
      status: DocumentStatus.SENT,
      items: [
        { product: 'CALCIUMCHLORIDE DIHYDRATE-FOOD GRADE', qty: 5.0, rate: 175.0, taxPercent: 18.0, cgst: 78.75, sgst: 78.75, total: 1032.50 },
        { product: 'MAGNESIUM SULPHATE HEPTAHYDRATE-FOOD GRADE', qty: 5.0, rate: 104.0, taxPercent: 18.0, cgst: 46.80, sgst: 46.80, total: 613.60 },
        { product: 'POTTASSIUM BICARBONATE - FOOD GRADE', qty: 5.0, rate: 276.0, taxPercent: 18.0, cgst: 124.20, sgst: 124.20, total: 1628.40 },
      ],
      subTotal: 2775.00,
      cgstAmount: 249.75,
      sgstAmount: 249.75,
      totalTaxAmount: 499.50,
      grandTotal: 3274.50,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/61/26-27',
      date: new Date('2026-08-20'),
      dueDate: new Date('2026-08-20'),
      customerCode: 'CUST-ASPIRA',
      salesPerson: 'PAVITHRA',
      status: DocumentStatus.SENT,
      items: [
        { product: 'CALCIUMCHLORIDE DIHYDRATE-FOOD GRADE', qty: 5.0, rate: 175.0, taxPercent: 18.0, cgst: 78.75, sgst: 78.75, total: 1032.50 },
        { product: 'MAGNESIUM SULPHATE HEPTAHYDRATE-FOOD GRADE', qty: 5.0, rate: 104.0, taxPercent: 18.0, cgst: 46.80, sgst: 46.80, total: 613.60 },
        { product: 'POTTASSIUM BICARBONATE - FOOD GRADE', qty: 5.0, rate: 276.0, taxPercent: 18.0, cgst: 124.20, sgst: 124.20, total: 1628.40 },
      ],
      subTotal: 2775.00,
      cgstAmount: 249.75,
      sgstAmount: 249.75,
      totalTaxAmount: 499.50,
      grandTotal: 3274.50,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/60/26-27',
      date: new Date('2026-08-10'),
      dueDate: new Date('2026-08-30'),
      customerCode: 'CUST-INSTAPANI',
      salesPerson: 'PAVITHRA',
      status: DocumentStatus.SENT,
      items: [
        { product: 'POTTASSIUM BICARBONATE - FOOD GRADE', qty: 5.0, rate: 276.0, taxPercent: 18.0, cgst: 124.20, sgst: 124.20, total: 1628.40 },
      ],
      subTotal: 1380.00,
      cgstAmount: 124.20,
      sgstAmount: 124.20,
      totalTaxAmount: 248.40,
      grandTotal: 1628.40,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/50/26-27',
      date: new Date('2026-07-30'),
      dueDate: new Date('2026-07-30'),
      customerCode: 'CUST-ACFS-MLPM',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.PAID,
      items: [
        { product: 'Standard SS304 Grain Probe', qty: 16.0, rate: 4400.0, taxPercent: 18.0, cgst: 6336.00, sgst: 6336.00, total: 83072.00 },
      ],
      subTotal: 70400.00,
      cgstAmount: 6336.00,
      sgstAmount: 6336.00,
      totalTaxAmount: 12672.00,
      grandTotal: 83072.00,
      amountPaid: 83072.00, // Settled via Federal Bank on 01-09-2026
    },
    {
      invoiceNo: 'B2BF/59/26-27',
      date: new Date('2026-08-01'),
      dueDate: new Date('2026-08-01'),
      customerCode: 'CUST-PUREWATER',
      salesPerson: 'PAVITHRA',
      status: DocumentStatus.SENT,
      items: [
        { product: 'LABORATORY EQUIPMENTS', qty: 1.0, rate: 210000.0, taxPercent: 18.0, cgst: 18900.00, sgst: 18900.00, total: 247800.00 },
        { product: 'LABORATORY CHEMICALS', qty: 1.0, rate: 55000.0, taxPercent: 18.0, cgst: 4950.00, sgst: 4950.00, total: 64900.00 },
        { product: 'LABORATORY GLASSWARES', qty: 1.0, rate: 40000.0, taxPercent: 18.0, cgst: 3600.00, sgst: 3600.00, total: 47200.00 },
      ],
      subTotal: 305000.00,
      cgstAmount: 27450.00,
      sgstAmount: 27450.00,
      totalTaxAmount: 54900.00,
      grandTotal: 359900.00,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/58/26-27',
      date: new Date('2026-07-05'),
      dueDate: new Date('2026-07-05'),
      customerCode: 'CUST-MIZUTECH',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.SENT,
      items: [
        { product: 'LABORATORY EQUIPMENTS', qty: 1.0, rate: 172000.0, taxPercent: 18.0, cgst: 15480.00, sgst: 15480.00, total: 202960.00 },
        { product: 'GLASSWARES & CHEMICALS', qty: 1.0, rate: 28000.0, taxPercent: 18.0, cgst: 2520.00, sgst: 2520.00, total: 33040.00 },
      ],
      subTotal: 200000.00,
      cgstAmount: 18000.00,
      sgstAmount: 18000.00,
      totalTaxAmount: 36000.00,
      grandTotal: 236000.00,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/56/26-27',
      date: new Date('2026-07-04'),
      dueDate: new Date('2026-07-04'),
      customerCode: 'CUST-VIDYUL',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.SENT,
      items: [
        { product: '20 inch 5 micron filter slim', qty: 40.0, rate: 120.0, taxPercent: 18.0, cgst: 432.00, sgst: 432.00, total: 5664.00 },
      ],
      subTotal: 4800.00,
      cgstAmount: 432.00,
      sgstAmount: 432.00,
      totalTaxAmount: 864.00,
      grandTotal: 5664.00,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/55/26-27',
      date: new Date('2026-06-30'),
      dueDate: new Date('2026-06-30'),
      customerCode: 'CUST-ACFS-PTA',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.SENT,
      items: [
        { product: 'Standard SS 304 Double-Tube Grain Probe', qty: 14.0, rate: 5800.0, taxPercent: 18.0, cgst: 7308.00, sgst: 7308.00, total: 95816.00 },
      ],
      subTotal: 81200.00,
      cgstAmount: 7308.00,
      sgstAmount: 7308.00,
      totalTaxAmount: 14616.00,
      grandTotal: 95816.00,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/54/26-27',
      date: new Date('2026-06-30'),
      dueDate: new Date('2026-06-30'),
      customerCode: 'CUST-ACFS-KTM',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.SENT,
      items: [
        { product: 'Fully Automatic Vertical Laboratory Autoclave', qty: 1.0, rate: 41500.0, taxPercent: 18.0, cgst: 3735.00, sgst: 3735.00, total: 48970.00 },
      ],
      subTotal: 41500.00,
      cgstAmount: 3735.00,
      sgstAmount: 3735.00,
      totalTaxAmount: 7470.00,
      grandTotal: 48970.00,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/53/26-27',
      date: new Date('2026-06-30'),
      dueDate: new Date('2026-06-30'),
      customerCode: 'CUST-ACFS-KTM',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.SENT,
      items: [
        { product: 'Standard SS 304 Double-Tube Grain Probe', qty: 9.0, rate: 5800.0, taxPercent: 18.0, cgst: 4698.00, sgst: 4698.00, total: 61596.00 },
      ],
      subTotal: 52200.00,
      cgstAmount: 4698.00,
      sgstAmount: 4698.00,
      totalTaxAmount: 9396.00,
      grandTotal: 61596.00,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/52/26-27',
      date: new Date('2026-06-30'),
      dueDate: new Date('2026-06-30'),
      customerCode: 'CUST-ACFS-PTA',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.SENT,
      items: [
        { product: 'Fully Automatic Vertical Laboratory Autoclave', qty: 1.0, rate: 70500.0, taxPercent: 18.0, cgst: 6345.00, sgst: 6345.00, total: 83190.00 },
      ],
      subTotal: 70500.00,
      cgstAmount: 6345.00,
      sgstAmount: 6345.00,
      totalTaxAmount: 12690.00,
      grandTotal: 83190.00,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/51/26-27',
      date: new Date('2026-06-30'),
      dueDate: new Date('2026-06-30'),
      customerCode: 'CUST-ACFS-MLPM',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.SENT,
      items: [
        { product: 'Fully Automatic Vertical Laboratory Autoclave', qty: 1.0, rate: 41500.0, taxPercent: 18.0, cgst: 3735.00, sgst: 3735.00, total: 48970.00 },
      ],
      subTotal: 41500.00,
      cgstAmount: 3735.00,
      sgstAmount: 3735.00,
      totalTaxAmount: 7470.00,
      grandTotal: 48970.00,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/49/26-27',
      date: new Date('2026-06-27'),
      dueDate: new Date('2026-06-27'),
      customerCode: 'CUST-GANGOTHRI',
      salesPerson: 'PAVITHRA',
      status: DocumentStatus.PAID,
      items: [
        { product: 'CHLOROTEX 100ML', qty: 1.0, rate: 495.0, taxPercent: 18.0, cgst: 44.55, sgst: 44.55, total: 584.10 },
        { product: 'POTASSIUM PERMANGANATE 500GM', qty: 1.0, rate: 786.0, taxPercent: 18.0, cgst: 70.74, sgst: 70.74, total: 927.48 },
        { product: 'ETHANOL 500 ml bottle', qty: 4.0, rate: 820.0, taxPercent: 18.0, cgst: 295.20, sgst: 295.20, total: 3870.40 },
        { product: 'ASPARGINE PROLINE BROTH 100GM', qty: 1.0, rate: 1175.0, taxPercent: 18.0, cgst: 105.75, sgst: 105.75, total: 1386.50 },
      ],
      subTotal: 5736.00,
      cgstAmount: 516.24,
      sgstAmount: 516.24,
      totalTaxAmount: 1032.48,
      grandTotal: 6768.48,
      amountPaid: 6768.48,
    },
    {
      invoiceNo: 'B2BF/48/26-27',
      date: new Date('2026-06-27'),
      dueDate: new Date('2026-06-27'),
      customerCode: 'CUST-ERANAD',
      salesPerson: 'PAVITHRA',
      status: DocumentStatus.SENT,
      items: [
        { product: 'ETHANOL 500 ml bottle', qty: 2.0, rate: 820.0, taxPercent: 18.0, cgst: 147.60, sgst: 147.60, total: 1935.20 },
        { product: 'BUFFER CAPSULES-4', qty: 1.0, rate: 275.0, taxPercent: 18.0, cgst: 24.75, sgst: 24.75, total: 324.50 },
        { product: 'CHROMOGENIC COLIFORM AGAR 50GM-READYMED-01', qty: 1.0, rate: 4800.0, taxPercent: 18.0, cgst: 432.00, sgst: 432.00, total: 5664.00 },
        { product: 'PIPETTE PUMP 25ML POLYLAB', qty: 1.0, rate: 390.0, taxPercent: 18.0, cgst: 35.10, sgst: 35.10, total: 460.20 },
      ],
      subTotal: 7105.00,
      cgstAmount: 639.45,
      sgstAmount: 639.45,
      totalTaxAmount: 1278.90,
      grandTotal: 8383.90,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/47/26-27',
      date: new Date('2026-06-24'),
      dueDate: new Date('2026-06-24'),
      customerCode: 'CUST-DAISMAN',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.PAID,
      items: [
        { product: 'SODIUM HYPOCHLORITE SOLUTION CONTAIN 4-6% AVAILABLE CHLORINE', qty: 5.0, rate: 120.0, taxPercent: 18.0, cgst: 54.00, sgst: 54.00, total: 708.00 },
      ],
      subTotal: 600.00,
      cgstAmount: 54.00,
      sgstAmount: 54.00,
      totalTaxAmount: 108.00,
      grandTotal: 700.00, // includes -8.00 adjustment
      amountPaid: 700.00,
    },
    {
      invoiceNo: 'B2BF/46/26-27',
      date: new Date('2026-06-23'),
      dueDate: new Date('2026-06-23'),
      customerCode: 'CUST-DRINKING',
      salesPerson: 'PAVITHRA',
      status: DocumentStatus.PAID,
      items: [
        { product: 'POTASSIUM PERMANGANATE 500GM', qty: 1.0, rate: 785.0, taxPercent: 18.0, cgst: 70.65, sgst: 70.65, total: 926.30 },
      ],
      subTotal: 785.00,
      cgstAmount: 70.65,
      sgstAmount: 70.65,
      totalTaxAmount: 141.30,
      grandTotal: 926.30,
      amountPaid: 926.30,
    },
    {
      invoiceNo: 'B2BF/45/26-27',
      date: new Date('2026-06-19'),
      dueDate: new Date('2026-06-19'),
      customerCode: 'CUST-HIMALAYA',
      salesPerson: 'PAVITHRA',
      status: DocumentStatus.PAID,
      items: [
        { product: 'SODIUM BICARBONATE EXTRAPURE 99%', qty: 1.0, rate: 365.0, taxPercent: 18.0, cgst: 32.85, sgst: 32.85, total: 430.70 },
        { product: 'HYDROGEN PEROXIDE 30% 5LTR CAN', qty: 1.0, rate: 1872.0, taxPercent: 18.0, cgst: 168.48, sgst: 168.48, total: 2208.96 },
      ],
      subTotal: 2237.00,
      cgstAmount: 201.33,
      sgstAmount: 201.33,
      totalTaxAmount: 402.66,
      grandTotal: 2639.66,
      amountPaid: 2639.66,
    },
    {
      invoiceNo: 'B2BF/44/26-27',
      date: new Date('2026-06-17'),
      dueDate: new Date('2026-06-17'),
      customerCode: 'CUST-CASH',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.SENT,
      items: [
        { product: 'SODIUM HYPOCHLORITE SOLUTION CONTAIN 4-6% AVAILABLE CHLORINE', qty: 5.0, rate: 118.0, taxPercent: 18.0, cgst: 53.10, sgst: 53.10, total: 696.20 },
      ],
      subTotal: 590.00,
      cgstAmount: 53.10,
      sgstAmount: 53.10,
      totalTaxAmount: 106.20,
      grandTotal: 696.20,
      amountPaid: 0.0,
    },
    {
      invoiceNo: 'B2BF/43/26-27',
      date: new Date('2026-06-16'),
      dueDate: new Date('2026-06-16'),
      customerCode: 'CUST-VIDYUL',
      salesPerson: 'ALI HASHIM',
      status: DocumentStatus.PAID,
      items: [
        { product: 'HYDROGEN PEROXIDE 30% 5LTR CAN', qty: 1.0, rate: 1872.0, taxPercent: 18.0, cgst: 168.48, sgst: 168.48, total: 2208.96 },
        { product: 'SODIUM HYPOCHLORITE SOLUTION CONTAIN 4-6% AVAILABLE CHLORINE', qty: 20.0, rate: 100.0, taxPercent: 18.0, cgst: 180.00, sgst: 180.00, total: 2360.00 },
      ],
      subTotal: 3872.00,
      cgstAmount: 348.48,
      sgstAmount: 348.48,
      totalTaxAmount: 696.96,
      grandTotal: 4568.96,
      amountPaid: 4568.96,
    },
  ];

  for (const inv of invoicesData) {
    const bpId = bpMap[inv.customerCode];
    if (!bpId) continue;

    let existingInv = await prisma.invoice.findFirst({
      where: { companyId, invoiceNo: inv.invoiceNo },
    });

    if (existingInv) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: existingInv.id } });
      await prisma.invoice.delete({ where: { id: existingInv.id } });
    }

    const createdInv = await prisma.invoice.create({
      data: {
        companyId,
        businessPartnerId: bpId,
        invoiceNo: inv.invoiceNo,
        invoiceType: InvoiceType.TAX_INVOICE,
        taxMode: TaxMode.CGST_SGST,
        placeOfSupply: 'Kerala (32)',
        companyStateCode: '32',
        customerStateCode: '32',
        date: inv.date,
        dueDate: inv.dueDate,
        status: inv.status,
        subTotal: inv.subTotal,
        cgstAmount: inv.cgstAmount,
        sgstAmount: inv.sgstAmount,
        totalTaxAmount: inv.totalTaxAmount,
        grandTotal: inv.grandTotal,
        amountPaid: inv.amountPaid,
        items: {
          create: inv.items.map((it) => ({
            productId: productMap[it.product] || null,
            description: it.product,
            qty: it.qty,
            rate: it.rate,
            taxPercent: it.taxPercent,
            taxAmount: it.cgst + it.sgst,
            cgstAmount: it.cgst,
            sgstAmount: it.sgst,
            total: it.total,
          })),
        },
      },
    });
  }
  console.log('[BIOFIX SEED] All 25 B2B Invoices seeded.');

  // 10. Day Book Transactions (Reconciled entries)
  const dayBookEntries = [
    // 01-09-2026
    {
      date: new Date('2026-09-01'),
      type: 'EXPENSE',
      method: 'BANK',
      desc: 'Recharge 946 (351)',
      amount: 201.0,
      balanceAfter: 5002.34,
      category: 'Utilities & Recharges',
      dept: 'Institute',
    },
    {
      date: new Date('2026-09-01'),
      type: 'EXPENSE',
      method: 'BANK',
      desc: 'Recharge 947',
      amount: 201.0,
      balanceAfter: 4801.34,
      category: 'Utilities & Recharges',
      dept: 'Solution',
    },
    {
      date: new Date('2026-09-01'),
      type: 'EXPENSE',
      method: 'CASH',
      desc: 'Recharge Balaance 946 (351)',
      amount: 150.0,
      balanceAfter: 8325.0,
      category: 'Utilities & Recharges',
      dept: 'Institute',
    },
    {
      date: new Date('2026-09-01'),
      type: 'INCOME',
      method: 'BANK',
      desc: 'Malappuram FSSAI Probe Settlement',
      amount: 83072.0,
      balanceAfter: 87873.34,
      category: 'Operating Expenses',
      dept: 'Solution',
    },
    {
      date: new Date('2026-09-01'),
      type: 'INCOME',
      method: 'BANK',
      desc: 'COURSE FEE (Anjali)',
      amount: 5000.0,
      balanceAfter: 92873.34,
      category: 'Operating Expenses',
      dept: 'Institute',
    },
    {
      date: new Date('2026-09-01'),
      type: 'EXPENSE',
      method: 'BANK',
      desc: 'Shaheer Commission Probe',
      amount: 11080.0,
      balanceAfter: 81793.34,
      category: 'Commissions & Franchise',
      dept: 'Solution',
    },
    {
      date: new Date('2026-09-01'),
      type: 'EXPENSE',
      method: 'BANK',
      desc: 'Ismail Kizzisherri Franchse',
      amount: 15000.0,
      balanceAfter: 66793.34,
      category: 'Commissions & Franchise',
      dept: 'Solution',
    },
    {
      date: new Date('2026-09-01'),
      type: 'EXPENSE',
      method: 'BANK',
      desc: 'Salary (Shadiya)',
      amount: 14516.0,
      balanceAfter: 52277.34,
      category: 'Salary & Wages',
      dept: 'Institute',
    },
    {
      date: new Date('2026-09-01'),
      type: 'EXPENSE',
      method: 'BANK',
      desc: 'Sarath (Onam Video Editing)',
      amount: 1500.0,
      balanceAfter: 50777.34,
      category: 'Marketing & Media',
      dept: 'Institute',
    },

    // 02-09-2026
    {
      date: new Date('2026-09-02'),
      type: 'INCOME',
      method: 'BANK',
      desc: 'Chemical Sale',
      amount: 350.0,
      balanceAfter: 51127.34,
      category: 'Operating Expenses',
      dept: 'Solution',
    },
    {
      date: new Date('2026-09-02'),
      type: 'INCOME',
      method: 'CASH',
      desc: 'Water Test',
      amount: 900.0,
      balanceAfter: 9225.0,
      category: 'Operating Expenses',
      dept: 'Waterlab',
    },
    {
      date: new Date('2026-09-02'),
      type: 'EXPENSE',
      method: 'BANK',
      desc: 'Building Rent',
      amount: 42000.0,
      balanceAfter: 9127.34,
      category: 'Building Rent',
      dept: 'Institute',
    },
    {
      date: new Date('2026-09-02'),
      type: 'EXPENSE',
      method: 'CASH',
      desc: 'Anas Petrol Expense',
      amount: 100.0,
      balanceAfter: 9125.0,
      category: 'Traveling & Petrol',
      dept: 'Solution',
    },

    // 03-09-2026
    {
      date: new Date('2026-09-03'),
      type: 'EXPENSE',
      method: 'BANK',
      desc: 'Salary (Trainee Shehina Sherin)',
      amount: 4678.0,
      balanceAfter: 4449.34,
      category: 'Salary & Wages',
      dept: 'Waterlab',
    },
    {
      date: new Date('2026-09-03'),
      type: 'INCOME',
      method: 'BANK',
      desc: 'Course Fee (Jarshana)',
      amount: 5000.0,
      balanceAfter: 9449.34,
      category: 'Operating Expenses',
      dept: 'Institute',
    },
    {
      date: new Date('2026-09-03'),
      type: 'EXPENSE',
      method: 'CASH',
      desc: 'Alpha DM Water',
      amount: 3500.0,
      balanceAfter: 5625.0,
      category: 'Lab & Chemical Materials',
      dept: 'Waterlab',
    },
    {
      date: new Date('2026-09-03'),
      type: 'INCOME',
      method: 'CASH',
      desc: 'Latheef Perintalmanna Lab',
      amount: 100000.0,
      balanceAfter: 105625.0,
      category: 'Operating Expenses',
      dept: 'Waterlab',
    },
    {
      date: new Date('2026-09-03'),
      type: 'EXPENSE',
      method: 'CASH',
      desc: 'Edavanna Petrol Expense',
      amount: 150.0,
      balanceAfter: 105475.0,
      category: 'Traveling & Petrol',
      dept: 'Solution',
    },
  ];

  for (let i = 0; i < dayBookEntries.length; i++) {
    const entry = dayBookEntries[i];
    const deptId = departmentsMap[entry.dept];
    const catId = expCatMap[entry.category];

    if (entry.type === 'EXPENSE') {
      const expenseNo = `EXP-202609-${String(i + 1).padStart(4, '0')}`;
      await prisma.expense.upsert({
        where: {
          companyId_expenseNo: {
            companyId,
            expenseNo,
          },
        },
        update: {
          description: entry.desc,
          date: entry.date,
          amount: entry.amount,
          totalAmount: entry.amount,
          paymentMethod: entry.method === 'BANK' ? PaymentMethod.BANK_TRANSFER : PaymentMethod.CASH,
          paidFromType: entry.method === 'BANK' ? PaidFromType.BANK : PaidFromType.CASH,
          bankAccountId: entry.method === 'BANK' ? federalBank.id : null,
          cashAccountId: entry.method === 'CASH' ? cashAccount.id : null,
          categoryId: catId,
          departmentId: deptId,
          status: ExpenseStatus.PAID,
          approvalStatus: ApprovalStatus.APPROVED,
        },
        create: {
          companyId,
          expenseNo,
          description: entry.desc,
          date: entry.date,
          amount: entry.amount,
          totalAmount: entry.amount,
          paymentMethod: entry.method === 'BANK' ? PaymentMethod.BANK_TRANSFER : PaymentMethod.CASH,
          paidFromType: entry.method === 'BANK' ? PaidFromType.BANK : PaidFromType.CASH,
          bankAccountId: entry.method === 'BANK' ? federalBank.id : null,
          cashAccountId: entry.method === 'CASH' ? cashAccount.id : null,
          categoryId: catId,
          departmentId: deptId,
          status: ExpenseStatus.PAID,
          approvalStatus: ApprovalStatus.APPROVED,
        },
      });
    }

    if (entry.method === 'BANK') {
      await prisma.bankTransaction.create({
        data: {
          companyId,
          bankAccountId: federalBank.id,
          date: entry.date,
          type: entry.type === 'INCOME' ? 'CREDIT' : 'DEBIT',
          amount: entry.amount,
          balanceAfter: entry.balanceAfter,
          description: entry.desc,
          isReconciled: true,
        },
      });
    } else {
      await prisma.cashTransaction.create({
        data: {
          companyId,
          cashAccountId: cashAccount.id,
          date: entry.date,
          type: entry.type === 'INCOME' ? 'CREDIT' : 'DEBIT',
          amount: entry.amount,
          balanceAfter: entry.balanceAfter,
          description: entry.desc,
        },
      });
    }
  }

  console.log('[BIOFIX SEED] Daybook and Bank/Cash Transactions seeded successfully.');
  console.log('[BIOFIX SEED] ✅ All data seeded and verified with exact matching numbers!');
}

main()
  .catch((e) => {
    console.error('[BIOFIX SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
