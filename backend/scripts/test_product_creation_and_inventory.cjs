const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const companyId = 'cmrzvh2kk0005i36g39z408xv';
const userId = 'cmrzvh2h70004i36gh6csbbne';
const JWT_SECRET = process.env.JWT_SECRET || '053739a262bb48d6553e41ff7cbf1eba89e5b21647971e27316c4ddce50269e6';

const token = jwt.sign(
  {
    sub: userId,
    userId,
    tenantId: companyId,
    companyId,
    email: 'info@biofixtechnology.com',
    role: 'ADMIN',
    globalRole: 'ADMIN',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function request(method, path, body) {
  const res = await fetch(`http://localhost:4000/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-company-id': companyId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return { status: res.status, data };
}

async function main() {
  console.log('=== TESTING PRODUCT CREATE VALIDATION & INVENTORY TRACKING ===\n');

  const RUN_KEY = 'TEST-' + Date.now();

  // Test 1: Tracked Item with Opening Stock
  console.log('1. Creating tracked item with opening stock and descriptions...');
  const trackedPayload = {
    name: `BAQA-${RUN_KEY}-TRACKED`,
    itemType: 'FINISHED_GOOD',
    unit: 'PCS',
    hsnCode: '847130',
    taxPreference: 'TAXABLE',
    gstRate: 18,
    sellingPrice: 2500,
    purchasePrice: 1500,
    description: 'High performance testing unit sales description',
    purchaseDescription: 'Raw component test purchase description',
    isTrackStock: true,
    isInventoryItem: true,
    isService: false,
    reorderLevel: 10,
    openingStock: 50,
    openingStockRate: 1500,
    valuationMethod: 'AVERAGE',
  };

  const res1 = await request('POST', '/products', trackedPayload);
  console.log('Tracked Item Created: Status =', res1.status, 'ID =', res1.data?.id || res1.data?.data?.id);
  const trackedId = res1.data?.id || res1.data?.data?.id;

  // DB verification for Tracked Item
  const dbTracked = await prisma.product.findUnique({
    where: { id: trackedId },
    include: { stocks: true },
  });
  console.log('- Persisted Name:', dbTracked.name);
  console.log('- Persisted Description:', dbTracked.description);
  console.log('- Persisted Purchase Description:', dbTracked.purchaseDescription);
  console.log('- Persisted isTrackStock:', dbTracked.isTrackStock);
  console.log('- Stock record quantity:', Number(dbTracked.stocks[0]?.quantity || 0));
  console.log('- Stock record averageCost:', Number(dbTracked.stocks[0]?.averageCost || 0));

  const stockLedgerEntry = await prisma.stockLedger.findFirst({
    where: { productId: trackedId, type: 'OPENING_STOCK' },
  });
  console.log('- StockLedger OPENING_STOCK entry found:', !!stockLedgerEntry, 'QtyChange:', Number(stockLedgerEntry?.quantityChange || 0));

  // Test 2: Non-Tracked Item (Service / Untracked)
  console.log('\n2. Creating non-tracked item (isTrackStock: false)...');
  const untrackedPayload = {
    name: `BAQA-${RUN_KEY}-SERVICE`,
    itemType: 'SERVICE',
    unit: 'HOURS',
    hsnCode: '998313',
    taxPreference: 'TAXABLE',
    gstRate: 18,
    sellingPrice: 5000,
    purchasePrice: 0,
    description: 'Consulting service description',
    purchaseDescription: '',
    isTrackStock: false,
    isInventoryItem: false,
    isService: true,
    reorderLevel: 0,
    openingStock: 0,
    openingStockRate: 0,
    valuationMethod: 'NONE',
  };

  const res2 = await request('POST', '/products', untrackedPayload);
  console.log('Non-Tracked Item Created: Status =', res2.status, 'ID =', res2.data?.id || res2.data?.data?.id);
  const untrackedId = res2.data?.id || res2.data?.data?.id;

  const dbUntracked = await prisma.product.findUnique({
    where: { id: untrackedId },
    include: { stocks: true },
  });
  console.log('- Persisted isTrackStock:', dbUntracked.isTrackStock);
  console.log('- Stocks count (expected 0):', dbUntracked.stocks.length);

  const untrackedLedger = await prisma.stockLedger.findMany({
    where: { productId: untrackedId },
  });
  console.log('- StockLedger entries count (expected 0):', untrackedLedger.length);

  // Test 3: Attempt to disable tracking when transactions exist
  console.log('\n3. Testing protection against toggling tracking on item with stock ledger...');
  try {
    await request('PUT', `/products/${trackedId}`, {
      ...trackedPayload,
      isTrackStock: false,
    });
    console.error('ERROR: Toggling tracking was NOT blocked!');
  } catch (err) {
    console.log('SUCCESS: Blocked toggling with status', err.status, 'Message:', err.message);
  }

  // Cleanup test records
  console.log('\n4. Cleaning up test records...');
  await prisma.stockLedger.deleteMany({ where: { productId: { in: [trackedId, untrackedId] } } });
  await prisma.stock.deleteMany({ where: { productId: { in: [trackedId, untrackedId] } } });
  await prisma.product.deleteMany({ where: { id: { in: [trackedId, untrackedId] } } });
  console.log('Cleanup complete!');
}

main().catch(err => {
  console.error('Test script failed:', err.response?.data || err.message);
}).finally(() => prisma.$disconnect());
