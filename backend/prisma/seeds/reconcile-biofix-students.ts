import * as dotenv from 'dotenv';
dotenv.config();

import {
  PrismaClient,
  BusinessPartnerType,
  CustomerCategory,
  GSTRegistrationStatus,
  TaxPreference,
  ItemType,
} from '@prisma/client';

const prisma = new PrismaClient();

export async function reconcileBiofixStudentsAndService() {
  console.log('======================================================================');
  console.log('[BIOFIX STUDENTS & SERVICE] Starting B2C & Non-Tax Service Sync');
  console.log('======================================================================');

  // 1. Resolve Biofix Tenant
  const tenant = await prisma.company.findFirst({
    where: {
      OR: [
        { gstin: '32ABDFB4446M1ZG' },
        { companyName: 'BIOFIX TECHNOLOGY LLP' },
        { id: 'cmrzvh2kk0005i36g39z408xv' },
      ],
    },
  });

  if (!tenant) {
    throw new Error('[BIOFIX STUDENTS & SERVICE] FATAL: Biofix Technology LLP tenant not found!');
  }

  const companyId = tenant.id;
  console.log(`[BIOFIX STUDENTS & SERVICE] Resolved Tenant: ${tenant.companyName} (${companyId})`);

  // 2. Reconcile Food and Water QC Service Master
  // Canonical active product: cms336qi20003i3js8fs94guu (or active Food and Water QC)
  let fwqcProduct = await prisma.product.findFirst({
    where: {
      companyId,
      name: 'Food and Water QC',
      deletedAt: null,
    },
  });

  if (!fwqcProduct) {
    // If not found active, check if cms336qi20003i3js8fs94guu exists
    fwqcProduct = await prisma.product.findUnique({
      where: { id: 'cms336qi20003i3js8fs94guu' },
    });
  }

  if (fwqcProduct) {
    fwqcProduct = await prisma.product.update({
      where: { id: fwqcProduct.id },
      data: {
        name: 'Food and Water QC',
        itemType: ItemType.SERVICE,
        isService: true,
        isInventoryItem: false,
        isTrackStock: false,
        isPurchasable: false,
        isSellable: true,
        isTaxable: false,
        sellingPrice: 20000.0,
        taxPreference: TaxPreference.NON_GST,
        gstRate: 0.0,
        unit: 'STUDENT',
        isActive: true,
        deletedAt: null,
      },
    });
    console.log(`[BIOFIX SERVICE] Food and Water QC reconciled: ID ${fwqcProduct.id}, Price: ₹20,000, Type: SERVICE, TaxPreference: NON_GST`);
  } else {
    fwqcProduct = await prisma.product.create({
      data: {
        companyId,
        name: 'Food and Water QC',
        itemType: ItemType.SERVICE,
        isService: true,
        isInventoryItem: false,
        isTrackStock: false,
        isPurchasable: false,
        isSellable: true,
        isTaxable: false,
        sellingPrice: 20000.0,
        taxPreference: TaxPreference.NON_GST,
        gstRate: 0.0,
        unit: 'STUDENT',
        isActive: true,
      },
    });
    console.log(`[BIOFIX SERVICE] Food and Water QC created: ID ${fwqcProduct.id}, Price: ₹20,000, Type: SERVICE, TaxPreference: NON_GST`);
  }

  // 3. Ensure Customer Department for Institute (B2C) exists
  const instituteDept = await prisma.customerDepartment.upsert({
    where: {
      companyId_name: {
        companyId,
        name: 'Institute',
      },
    },
    update: {
      description: 'Course training, student certifications, and workshops',
      customerType: 'B2C',
      isActive: true,
    },
    create: {
      companyId,
      name: 'Institute',
      description: 'Course training, student certifications, and workshops',
      customerType: 'B2C',
      isActive: true,
    },
  });
  const customerDepartmentId = instituteDept.id;

  // 4. Source Data: 76 Batch Students + 6 Short Term Students
  const studentsRaw = [
    // Batch 1
    { sl: 1, name: 'Fida T', batch: 1, contact: '8590130546', status: 'Paid', duration: '14 November 2024 - 13 December 2024' },
    { sl: 2, name: 'Harsha', batch: 1, contact: '8304950058', status: 'Paid' },
    { sl: 3, name: 'Nourin Shoukath', batch: 1, contact: '8111851913', status: 'Paid' },
    { sl: 4, name: 'Naja PC', batch: 1, contact: '8281700195', status: 'Paid' },
    // Batch 2
    { sl: 5, name: 'Amina Mubashira TP', batch: 2, contact: '7025519251', status: 'Paid', duration: '11 December 2024 – 10 January 2025' },
    { sl: 6, name: 'Jenna', batch: 2, contact: '9539384807', status: 'Paid' },
    { sl: 7, name: 'Abdul Ahad V', batch: 2, contact: '6282359088', status: 'Paid' },
    { sl: 8, name: 'Rashid Athikkal', batch: 2, contact: '9746997971', status: 'Paid' },
    { sl: 9, name: 'Abdul Basith', batch: 2, contact: '9745311561', status: 'Paid' },
    { sl: 10, name: 'Muhammed Shanib', batch: 2, contact: '9446089169', status: 'Paid' },
    // Batch 3
    { sl: 11, name: 'Mohammed Rikas', batch: 3, contact: '7034550541', status: 'Paid', duration: '11 April 2025 – 03 May 2025' },
    { sl: 12, name: 'Pranav PV', batch: 3, contact: '7736915193', status: 'Paid' },
    { sl: 13, name: 'Danish Rahman C', batch: 3, contact: '9633729211', status: 'Paid' },
    { sl: 14, name: 'Ahammed Shamil', batch: 3, contact: '7510597002', status: 'Paid' },
    { sl: 15, name: 'Rashida MK', batch: 3, contact: '9809656238', status: 'Paid' },
    { sl: 16, name: 'Muhammed Minhaj', batch: 3, contact: '8590377450', status: 'Paid' },
    // Batch 4
    { sl: 17, name: 'Shibin Nishad', batch: 4, contact: '8129847096', status: 'Paid', duration: '04 May 2025 – 10 June 2025' },
    { sl: 18, name: 'Muhammed Afsal', batch: 4, contact: '8943687962', status: 'Paid' },
    { sl: 19, name: 'Shamna K', batch: 4, contact: '9746726495', status: 'Paid' },
    { sl: 20, name: 'Malufa', batch: 4, contact: '8075777802', status: 'Paid' },
    { sl: 21, name: 'Fida MP', batch: 4, contact: '9747424492', status: 'Paid' },
    // Batch 5
    { sl: 22, name: 'Shaheeda', batch: 5, contact: '9061965110', status: 'Paid', duration: '10 July 2025 – 08 August 2025' },
    { sl: 23, name: 'Mohammed Naji M', batch: 5, contact: '9946241510', status: 'Paid' },
    { sl: 24, name: 'Drishya', batch: 5, contact: '7510640882', status: 'Paid' },
    { sl: 25, name: 'Pranav Jayaprakash', batch: 5, contact: '7592890414', status: 'Paid' },
    { sl: 26, name: 'Shahana Shurook', batch: 5, contact: '7902424452', status: 'Paid' },
    // Batch 6
    { sl: 27, name: 'Amra', batch: 6, contact: '9400385634', status: 'Paid', duration: '11 August 2025 – 05 September 2025' },
    { sl: 28, name: 'Asna', batch: 6, contact: '9037926552', status: 'Paid' },
    { sl: 29, name: 'Akshay', batch: 6, contact: '8129792590', status: 'Paid' },
    { sl: 30, name: 'Baby Shamila', batch: 6, contact: '6238551654', status: 'Paid' },
    { sl: 31, name: 'Byruha', batch: 6, contact: '7902497244', status: 'Paid' },
    // Batch 7
    { sl: 32, name: 'Labeeba Shameema M', batch: 7, contact: '', status: 'Paid', duration: '08 September 2025- 08 October 2025' },
    { sl: 33, name: 'Naishana', batch: 7, contact: '8138036380', status: 'Paid' },
    { sl: 34, name: 'Hilfa', batch: 7, contact: '', status: 'Paid' },
    { sl: 35, name: 'Shadila Thasni', batch: 7, contact: '9778217768', status: 'Paid' },
    { sl: 36, name: 'Shabeeha', batch: 7, contact: '9747672380', status: 'Paid' },
    { sl: 37, name: 'Favas', batch: 7, contact: '9496631528', status: 'Paid' },
    // Batch 8
    { sl: 38, name: 'Jezbin Jacob', batch: 8, contact: '8606003764', status: 'Paid', duration: '06 october 2025– 10 November 2025' },
    { sl: 39, name: 'Finu Sherin', batch: 8, contact: '9847414109', status: 'Paid' },
    { sl: 40, name: 'Vafa N', batch: 8, contact: '9656913120', status: 'Paid' },
    { sl: 41, name: 'Hiba M', batch: 8, contact: '9447822698', status: 'Paid' },
    { sl: 42, name: 'Safa', batch: 8, contact: '7012132161', status: 'Paid' },
    { sl: 43, name: 'Muhamed Safwan', batch: 8, contact: '9061236648', status: 'Paid' },
    { sl: 44, name: 'Muhammed Mubashir', batch: 8, contact: '8891509383', status: 'Paid' },
    // Batch 9
    { sl: 45, name: 'Aparna', batch: 9, contact: '7907457926', status: 'Paid', duration: '10 November 2025- 12 December 2025' },
    // Batch 10
    { sl: 46, name: 'Aslaha', batch: 10, contact: '9847186781', status: 'Paid', duration: '22 December 2025- 23 January 2026' },
    { sl: 47, name: 'Aliya', batch: 10, contact: '9746526461', status: 'Paid' },
    { sl: 48, name: 'Shada', batch: 10, contact: '9745243274', status: 'Paid' },
    { sl: 49, name: 'Afeefa', batch: 10, contact: '8606245642', status: 'Paid' },
    // Batch 12
    { sl: 50, name: 'Asna Nasreen', batch: 12, contact: '6235541794', status: 'Paid', duration: '10 April 2026 – 03 July 2026' },
    { sl: 51, name: 'Asna', batch: 12, contact: '9037016005', status: 'Paid' },
    { sl: 52, name: 'Shahina Sherin', batch: 12, contact: '9633514794', status: 'Paid' },
    { sl: 53, name: 'Shana', batch: 12, contact: '9496389230', status: 'Paid' },
    { sl: 54, name: 'Kripa', batch: 12, contact: '7356426095', status: 'Paid' },
    { sl: 55, name: 'Safna', batch: 12, contact: '9072572252', status: 'Paid' },
    { sl: 56, name: 'Sharbina', batch: 12, contact: '8590607335', status: 'Paid' },
    { sl: 57, name: 'Afnitha', batch: 12, contact: '8089736525', status: 'Paid' },
    // Batch 13
    { sl: 58, name: 'Sreejith', batch: 13, contact: '9778784615', status: 'Paid', duration: '03 May 2026- 02 August 2026' },
    { sl: 59, name: 'Noushida C/o Nizam Sir', batch: 13, contact: '8089331052', status: '5000' },
    { sl: 60, name: 'Smrithi', batch: 13, contact: '9037889328', status: 'Paid' },
    { sl: 61, name: 'Shabana', batch: 13, contact: '8714898835', status: 'Paid' },
    // Batch 14
    { sl: 62, name: 'Sreedevi', batch: 14, contact: '9778075523', status: 'Paid', duration: '23 June 2026- 22 August 2026' },
    { sl: 63, name: 'Punya', batch: 14, contact: '7012628246', status: 'Paid' },
    { sl: 64, name: 'Shiva Priya', batch: 14, contact: '9567585568', status: 'Paid' },
    { sl: 65, name: 'Nandini', batch: 14, contact: '8590580500', status: 'Paid' },
    { sl: 66, name: 'Anjusha', batch: 14, contact: '9778360836', status: 'Paid' },
    { sl: 67, name: 'Sahal', batch: 14, contact: '9847075913', status: 'Paid' },
    { sl: 68, name: 'Amina', batch: 14, contact: '9995376113', status: 'Paid' },
    // Batch 15
    { sl: 69, name: 'Anjali', batch: 15, contact: '7736857461', status: '10000', duration: '15 July 2026' },
    { sl: 70, name: 'Murshida', batch: 15, contact: '9567776844', status: '10000' },
    { sl: 71, name: 'Habeeba', batch: 15, contact: '9645834376', status: 'Paid' },
    // Batch 16
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

  let batchStudentsReconciled = 0;
  let shortTermStudentsReconciled = 0;

  // 4A. Reconcile 76 Main Course Batch Students
  for (const s of studentsRaw) {
    const bpCode = `STU-B${s.batch}-${String(s.sl).padStart(3, '0')}`;
    const displayName = s.name.trim();
    const phone = s.contact ? s.contact.trim() : null;

    let paymentText = s.status;
    if (s.status === '5000') paymentText = 'Partial Paid: ₹5,000';
    if (s.status === '10000') paymentText = 'Partial Paid: ₹10,000';

    const notes = `Course: Food and Water QC | Batch: ${s.batch} | Duration: ${s.duration || 'N/A'} | Payment Status: ${paymentText}`;

    let bp = await prisma.businessPartner.findFirst({
      where: { companyId, bpCode },
    });

    if (bp) {
      await prisma.businessPartner.update({
        where: { id: bp.id },
        data: {
          name: displayName,
          bpType: BusinessPartnerType.CUSTOMER,
          customerType: CustomerCategory.B2C,
          phone: phone || bp.phone,
          customerDepartmentId,
          taxPreference: TaxPreference.NON_GST,
          gstRegistrationStatus: GSTRegistrationStatus.UNREGISTERED,
          state: 'Kerala',
          stateCode: '32',
          notes,
          deletedAt: null,
        },
      });
    } else {
      await prisma.businessPartner.create({
        data: {
          companyId,
          bpType: BusinessPartnerType.CUSTOMER,
          customerType: CustomerCategory.B2C,
          bpCode,
          name: displayName,
          phone,
          customerDepartmentId,
          taxPreference: TaxPreference.NON_GST,
          gstRegistrationStatus: GSTRegistrationStatus.UNREGISTERED,
          state: 'Kerala',
          stateCode: '32',
          notes,
        },
      });
    }
    batchStudentsReconciled++;
  }

  // 4B. Reconcile 6 Short Term Students
  for (const s of shortTermStudents) {
    const bpCode = `STU-ST-${String(s.sl).padStart(3, '0')}`;
    const displayName = s.name.trim();
    const phone = s.contact ? s.contact.trim() : null;
    const notes = `Course: Food and Water QC (Short Term C/o Nizam Sir) | Batch: Short Term Nizam Sir | Duration: ${s.duration} | Payment Status: ${s.status}`;

    let bp = await prisma.businessPartner.findFirst({
      where: { companyId, bpCode },
    });

    if (bp) {
      await prisma.businessPartner.update({
        where: { id: bp.id },
        data: {
          name: displayName,
          bpType: BusinessPartnerType.CUSTOMER,
          customerType: CustomerCategory.B2C,
          phone: phone || bp.phone,
          customerDepartmentId,
          taxPreference: TaxPreference.NON_GST,
          gstRegistrationStatus: GSTRegistrationStatus.UNREGISTERED,
          state: 'Kerala',
          stateCode: '32',
          notes,
          deletedAt: null,
        },
      });
    } else {
      await prisma.businessPartner.create({
        data: {
          companyId,
          bpType: BusinessPartnerType.CUSTOMER,
          customerType: CustomerCategory.B2C,
          bpCode,
          name: displayName,
          phone,
          customerDepartmentId,
          taxPreference: TaxPreference.NON_GST,
          gstRegistrationStatus: GSTRegistrationStatus.UNREGISTERED,
          state: 'Kerala',
          stateCode: '32',
          notes,
        },
      });
    }
    shortTermStudentsReconciled++;
  }

  console.log(`[BIOFIX STUDENTS] Successfully verified & reconciled: ${batchStudentsReconciled} batch students + ${shortTermStudentsReconciled} short-term students.`);

  // 5. Reclassify the 16 legacy student records from B2B to B2C (Zero-data-loss: preserve IDs, codes, and invoice links)
  const legacyStudentIds = [
    'cms2ui13e0005i37orfm2iq9n', // Sheshina Sherin
    'cmth6wmhx0009i3soi4rchnwy', // Sreedevi
    'cmth7noxo0001jx044p0k1bpl', // Shiva Priya
    'cmth7oyy00001l1049fhc2b1p', // Nandini
    'cmth7q8xd0001jm046zy99wl9', // Anjusha
    'cmth7r9af0001l6045ams8p97', // Sahal
    'cmth7u9cm0003l1040ydec2ab', // Amina
    'cmth7v70n0001kz04phsccbo3', // Muhsina Thasni
    'cmth7wr720001jv04h4wn6ofh', // Fathima Rinshi
    'cmth7xd0g0003jm040zjt22ly', // Sneha Raj
    'cmth7yk7m0003kz04ocdn4vkn', // Athira
    'cmth7zcxz0003l604yskcfhzv', // Ismayil
    'cmth805qb0005l104nggupyft', // Anjali (has FEE-20260901-05)
    'cmth80t7q0005jm04ulrrl979', // Murshida
    'cmth82lxt0009kz04p9zdvp2j', // Habeeba
    'cmty32cpi000xi3dciy6480lr', // Jarshana (has FEE-20260903-15)
  ];

  const updateResult = await prisma.businessPartner.updateMany({
    where: {
      companyId,
      id: { in: legacyStudentIds },
    },
    data: {
      customerType: CustomerCategory.B2C,
      bpType: BusinessPartnerType.CUSTOMER,
      customerDepartmentId,
      taxPreference: TaxPreference.NON_GST,
      gstRegistrationStatus: GSTRegistrationStatus.UNREGISTERED,
    },
  });

  console.log(`[BIOFIX STUDENTS] Reclassified ${updateResult.count} legacy student records from B2B to B2C (invoices & IDs preserved).`);
  console.log('======================================================================');
  console.log('[BIOFIX STUDENTS & SERVICE] RECONCILIATION COMPLETED WITH ZERO DATA LOSS');
  console.log('======================================================================');
}

if (require.main === module) {
  reconcileBiofixStudentsAndService()
    .catch((e) => {
      console.error('[BIOFIX STUDENTS RECONCILIATION ERROR]', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
