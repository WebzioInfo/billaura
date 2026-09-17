import * as dotenv from 'dotenv';
dotenv.config();

import {
  PrismaClient,
  Prisma,
  BusinessPartnerType,
  CustomerCategory,
  GSTRegistrationStatus,
  TaxPreference,
  BankAccountType,
  ItemType,
} from '@prisma/client';

const prisma = new PrismaClient();

export async function reconcileBiofixData() {
  console.log('===============================================================');
  console.log('[BIOFIX RECONCILIATION] Starting zero-data-loss master data sync');
  console.log('===============================================================');

  // 1. Identify Existing Tenant
  let company = await prisma.company.findFirst({
    where: {
      OR: [
        { gstin: '32ABDFB4446M1ZG' },
        { companyName: 'BIOFIX TECHNOLOGY LLP' },
        { legalName: 'BIOFIX TECHNOLOGY LLP' },
        { id: 'cmrzvh2kk0005i36g39z408xv' },
      ],
    },
  });

  if (!company) {
    throw new Error('[BIOFIX RECONCILIATION] FATAL: Biofix Technology LLP tenant not found in database!');
  }

  const companyId = company.id;
  console.log(`[BIOFIX RECONCILIATION] Identified Tenant: ${company.companyName} (ID: ${companyId})`);

  // 2. Reconcile Company Profile (Non-destructive: preserves existing fields not in source)
  company = await prisma.company.update({
    where: { id: companyId },
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
    },
  });
  console.log('[BIOFIX RECONCILIATION] Company profile synchronized successfully.');

  // 3. Reconcile Company Settings (Bank details, default currency)
  await prisma.companySettings.upsert({
    where: { companyId },
    update: {
      bankDetails: 'Bank: FEDERAL BANK\nA/C: 25150200002107\nIFSC: FDRI0002515\nBranch: KIZHISSERI BRANCH',
      defaultCurrency: 'INR',
    },
    create: {
      companyId,
      bankDetails: 'Bank: FEDERAL BANK\nA/C: 25150200002107\nIFSC: FDRI0002515\nBranch: KIZHISSERI BRANCH',
      defaultCurrency: 'INR',
    },
  });
  console.log('[BIOFIX RECONCILIATION] Company settings and bank details synchronized.');

  // 4. Reconcile Bank Account (Federal Bank - 25150200002107)
  let federalBank = await prisma.bankAccount.findFirst({
    where: { companyId, accountNumber: '25150200002107' },
  });

  if (federalBank) {
    await prisma.bankAccount.update({
      where: { id: federalBank.id },
      data: {
        name: 'Federal Bank (Kizhisseri)',
        accountName: 'BIOFIX TECHNOLOGY',
        bankName: 'Federal Bank',
        ifsc: 'FDRI0002515',
        accountType: BankAccountType.CURRENT,
        isDefault: true,
        status: 'ACTIVE',
      },
    });
    console.log(`[BIOFIX RECONCILIATION] Bank account verified: ${federalBank.accountNumber} (${federalBank.id})`);
  } else {
    federalBank = await prisma.bankAccount.create({
      data: {
        companyId,
        name: 'Federal Bank (Kizhisseri)',
        accountName: 'BIOFIX TECHNOLOGY',
        accountNumber: '25150200002107',
        ifsc: 'FDRI0002515',
        bankName: 'Federal Bank',
        accountType: BankAccountType.CURRENT,
        isDefault: true,
        status: 'ACTIVE',
      },
    });
    console.log(`[BIOFIX RECONCILIATION] Bank account created: ${federalBank.accountNumber} (${federalBank.id})`);
  }

  // 5. Reconcile Units Master Data
  const masterUnits = [
    { code: 'PCS', name: 'Piece', abbreviation: 'pcs', symbol: 'pcs', category: 'Count', decimals: 0 },
    { code: 'KG', name: 'Kilogram', abbreviation: 'kg', symbol: 'kg', category: 'Weight', decimals: 2 },
    { code: 'LTR', name: 'Liter', abbreviation: 'L', symbol: 'L', category: 'Volume', decimals: 2 },
    { code: 'BTL', name: 'Bottle', abbreviation: 'btl', symbol: 'btl', category: 'Packaging', decimals: 0 },
    { code: 'SET', name: 'Set', abbreviation: 'set', symbol: 'set', category: 'Count', decimals: 0 },
    { code: 'TEST', name: 'Test / Analysis', abbreviation: 'test', symbol: 'test', category: 'Service', decimals: 0 },
    { code: 'STUDENT', name: 'Student', abbreviation: 'std', symbol: 'std', category: 'Education', decimals: 0 },
    { code: 'NOS', name: 'Numbers', abbreviation: 'nos', symbol: 'nos', category: 'Count', decimals: 0 },
  ];

  for (const u of masterUnits) {
    await prisma.unit.upsert({
      where: {
        companyId_code: {
          companyId,
          code: u.code,
        },
      },
      update: {
        name: u.name,
        abbreviation: u.abbreviation,
        symbol: u.symbol,
        category: u.category,
        decimals: u.decimals,
        isActive: true,
      },
      create: {
        companyId,
        code: u.code,
        name: u.name,
        abbreviation: u.abbreviation,
        symbol: u.symbol,
        category: u.category,
        decimals: u.decimals,
        isActive: true,
      },
    });
  }
  console.log(`[BIOFIX RECONCILIATION] Master Units catalog verified (${masterUnits.length} units).`);

  // 6. Reconcile B2B Customers Master Data
  const sourceB2BCustomers = [
    {
      code: 'CUST-EKM',
      name: 'EKM TRADING COMPANY',
      gstin: '32BOKPA9538J1ZS',
      address: '751/4, CHERUKODE-MALAKKAL ROAD, CHATHANGOTTUPURAM PO, 679328',
      pinCode: '679328',
      state: 'Kerala',
      stateCode: '32',
      phone: null,
    },
    {
      code: 'CUST-EFF',
      name: 'EFF TRADING LLP',
      gstin: '32AAKFE3588M1ZZ',
      address: 'EFF TOWER, WEST SILK STREET, NEAR COCONUT BAZAR, SOUTH BEACH, KOZHIKODE, 673032',
      pinCode: '673032',
      state: 'Kerala',
      stateCode: '32',
      phone: '8281047064',
    },
    {
      code: 'CUST-EXOTIC',
      name: 'EXOTIC GENERAL TRADING COMPANY',
      gstin: '32AAHFE2076M1ZD',
      address: 'KAITHAPPURAM, SREEKANDAPURAM, KANNUR, 670631',
      pinCode: '670631',
      state: 'Kerala',
      stateCode: '32',
      phone: '+919447977342',
    },
    {
      code: 'CUST-GANGOTHRI',
      name: 'GANGOTHRI AQUA PROCESSING UNIT',
      gstin: '32BPWPP4597K1ZW',
      address: 'KOKKUR PO, CHANGARAMKULAM, MALAPPURAM DIST, 679591',
      pinCode: '679591',
      state: 'Kerala',
      stateCode: '32',
      phone: '8884677772',
    },
    {
      code: 'CUST-ASPIRA',
      name: 'ASPIRA MINERALS & FOODS',
      gstin: '32CEAPM3612N1ZN',
      address: 'ELAMBRAKKODE, POREDUM PO, CHADAYAMANGALAM, KOLLAM, 691534',
      pinCode: '691534',
      state: 'Kerala',
      stateCode: '32',
      phone: null,
    },
    {
      code: 'CUST-INSTAPANI',
      name: 'INSTAPANI BEVERAGES INDIA',
      gstin: '32AJXPK1786B2Z2',
      address: 'Kerala, India',
      pinCode: null,
      state: 'Kerala',
      stateCode: '32',
      phone: '9567478383',
    },
    {
      code: 'CUST-PUREWATER',
      name: 'PURE WATER AND PURIFIERS',
      gstin: '32FYAPS8076P2ZK',
      address: '12/432 A, 12/432 B, ANGADIPPURAM, MALAPPURAM, PERINTHALMANNA, 679321',
      pinCode: '679321',
      state: 'Kerala',
      stateCode: '32',
      phone: null,
    },
    {
      code: 'CUST-MIZUTECH',
      name: 'MIZUTECH WATER TECHNOLOGY',
      gstin: '32DRLPS3438F1ZN',
      address: 'Door No:5/428, Thelappilly, Irinjalakuda, Thrissur, Kerala, 680712',
      pinCode: '680712',
      state: 'Kerala',
      stateCode: '32',
      phone: null,
      notes: 'Default Ship-To: ASIAN AQUA WATER, C/O Abdulla Kunhi NP, 14-97/B, Kundamkuzhy, Chattanchal, Kasaragod - 671541',
    },
    {
      code: 'CUST-VIDYUL',
      name: 'VIDYUL AGENCIES - QUILON DROPS',
      gstin: '32BQQPB9980D1ZO',
      address: 'JALADHARA, MUNDAKKAL EAST, KOLLAM, 691001',
      pinCode: '691001',
      state: 'Kerala',
      stateCode: '32',
      phone: '+91-9946717403',
    },
    {
      code: 'CUST-ERANAD',
      name: 'ERANAD BEVERAGES PVT LTD',
      gstin: '32AAECE2265N1ZL',
      address: 'PAVANNA, POOVATHIKKAL PO, AREEKODE, MALAPPURAM, 673639',
      pinCode: '673639',
      state: 'Kerala',
      stateCode: '32',
      phone: '7558093155',
    },
    {
      code: 'CUST-DAISMAN',
      name: 'DAISMAN AYURVEDIC HOSPITAL',
      gstin: null,
      address: 'Kondotty, Malappuram, Kerala',
      pinCode: null,
      state: 'Kerala',
      stateCode: '32',
      phone: null,
    },
    {
      code: 'CUST-DRINKING',
      name: 'DRINKING DROPS',
      gstin: '32CGMPR9872H1ZP',
      address: 'DOOR NO: 22/730, THETTAYIL BUILDING, SEA PORT AIRPORT ROAD, HMT COLONY PO, ERNAKULAM, 683503',
      pinCode: '683503',
      state: 'Kerala',
      stateCode: '32',
      phone: null,
    },
    {
      code: 'CUST-HIMALAYA',
      name: 'HIMALAYA',
      gstin: '32HRJPS9731K1Z2',
      address: 'KP 1/58 A, PUTHIYAVILLA, PATTOLIMARKET, ALAPPUZHA, 690531',
      pinCode: '690531',
      state: 'Kerala',
      stateCode: '32',
      phone: null,
    },
  ];

  let matchedCustomersCount = 0;
  let createdCustomersCount = 0;

  for (const cust of sourceB2BCustomers) {
    // Strategy: Search by GSTIN first, then fallback to normalized name
    let existing = cust.gstin
      ? await prisma.businessPartner.findFirst({
          where: { companyId, gstin: cust.gstin },
        })
      : null;

    if (!existing) {
      existing = await prisma.businessPartner.findFirst({
        where: {
          companyId,
          name: { equals: cust.name, mode: Prisma.QueryMode.insensitive },
        },
      });
    }

    if (!existing && cust.code) {
      existing = await prisma.businessPartner.findFirst({
        where: { companyId, bpCode: cust.code },
      });
    }

    if (existing) {
      matchedCustomersCount++;
      // Reconcile missing/differing fields safely without overwriting historical relationships
      await prisma.businessPartner.update({
        where: { id: existing.id },
        data: {
          name: existing.name || cust.name,
          bpType: BusinessPartnerType.CUSTOMER,
          customerType: CustomerCategory.B2B,
          gstRegistrationStatus: cust.gstin ? GSTRegistrationStatus.REGISTERED : existing.gstRegistrationStatus,
          gstin: existing.gstin || cust.gstin || null,
          phone: existing.phone || cust.phone || null,
          address: existing.address || cust.address,
          pinCode: cust.pinCode || existing.pinCode || null,
          state: existing.state || cust.state,
          stateCode: existing.stateCode || cust.stateCode,
          notes: cust.notes
            ? (existing.notes && !existing.notes.includes(cust.notes) ? `${existing.notes}\n${cust.notes}` : (existing.notes || cust.notes))
            : existing.notes,
        },
      });
      console.log(`[BIOFIX RECONCILIATION] Reconciled B2B Customer: ${cust.name} (${existing.id})`);
    } else {
      createdCustomersCount++;
      const created = await prisma.businessPartner.create({
        data: {
          companyId,
          bpCode: cust.code,
          name: cust.name,
          bpType: BusinessPartnerType.CUSTOMER,
          customerType: CustomerCategory.B2B,
          gstRegistrationStatus: cust.gstin ? GSTRegistrationStatus.REGISTERED : GSTRegistrationStatus.UNREGISTERED,
          taxPreference: TaxPreference.TAXABLE,
          gstin: cust.gstin || null,
          phone: cust.phone || null,
          address: cust.address,
          pinCode: cust.pinCode || null,
          state: cust.state,
          stateCode: cust.stateCode,
          placeOfSupply: 'Kerala (32)',
          notes: cust.notes || null,
        },
      });
      console.log(`[BIOFIX RECONCILIATION] Created Missing B2B Customer: ${cust.name} (${created.id})`);
    }
  }

  console.log(`[BIOFIX RECONCILIATION] Customers reconciliation: ${matchedCustomersCount} reconciled, ${createdCustomersCount} created.`);

  // 7. Reconcile Distinct Shipping Address on Invoice B2BF/58/26-27 (Non-destructive: does not modify totals/rates)
  const inv58 = await prisma.invoice.findFirst({
    where: { companyId, invoiceNo: 'B2BF/58/26-27' },
  });
  if (inv58) {
    await prisma.invoice.update({
      where: { id: inv58.id },
      data: {
        billingAddress: 'Door No:5/428, Thelappilly, Irinjalakuda, Thrissur, Kerala, 680712',
        shippingAddress: 'ASIAN AQUA WATER, C/O Abdulla Kunhi NP, 14-97/B, Kundamkuzhy, Chattanchal, Kasaragod, 671541',
      },
    });
    console.log('[BIOFIX RECONCILIATION] Invoice B2BF/58/26-27 Bill-To / Ship-To preserved correctly.');
  }

  // 8. Reconcile Product Catalog Master Data
  const sourceProducts = [
    { name: '20 LTR JAR', hsnCode: '22011010', unit: 'PCS', sellingPrice: 170.0, gstRate: 18.0 },
    { name: 'GENESOL 80', hsnCode: '29319090', unit: 'LTR', sellingPrice: 510.0, gstRate: 18.0, altName: 'GENESOL' },
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
  ];

  let matchedProductsCount = 0;
  let createdProductsCount = 0;

  for (const prod of sourceProducts) {
    let existing = await prisma.product.findFirst({
      where: {
        companyId,
        OR: [
          { name: { equals: prod.name, mode: Prisma.QueryMode.insensitive } },
          ...(prod.altName ? [{ name: { equals: prod.altName, mode: Prisma.QueryMode.insensitive } }] : []),
        ],
      },
    });

    if (existing) {
      matchedProductsCount++;
      // Reconcile HSN and Unit safely without touching transactional prices or invoice items
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          hsnCode: existing.hsnCode || prod.hsnCode,
          unit: existing.unit || prod.unit,
          gstRate: prod.gstRate,
          taxPreference: prod.gstRate > 0 ? TaxPreference.TAXABLE : TaxPreference.NIL_RATED,
          itemType: ItemType.FINISHED_GOOD,
          isInventoryItem: true,
          isActive: true,
        },
      });
      console.log(`[BIOFIX RECONCILIATION] Reconciled Product: ${prod.name} (${existing.id})`);
    } else {
      createdProductsCount++;
      const created = await prisma.product.create({
        data: {
          companyId,
          name: prod.name,
          hsnCode: prod.hsnCode,
          unit: prod.unit,
          sellingPrice: prod.sellingPrice,
          gstRate: prod.gstRate,
          itemType: ItemType.FINISHED_GOOD,
          isInventoryItem: true,
          isPurchasable: true,
          isSellable: true,
          isTaxable: true,
          taxPreference: prod.gstRate > 0 ? TaxPreference.TAXABLE : TaxPreference.NIL_RATED,
          isActive: true,
        },
      });
      console.log(`[BIOFIX RECONCILIATION] Created Missing Product: ${prod.name} (${created.id})`);
    }
  }

  console.log(`[BIOFIX RECONCILIATION] Product reconciliation: ${matchedProductsCount} reconciled, ${createdProductsCount} created.`);
  console.log('===============================================================');
  console.log('[BIOFIX RECONCILIATION] COMPLETED SUCCESSFULLY WITHOUT DATA LOSS');
  console.log('===============================================================');
}

if (require.main === module) {
  reconcileBiofixData()
    .catch((e) => {
      console.error('[BIOFIX RECONCILIATION ERROR]', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
