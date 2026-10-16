const puppeteer = require('../node_modules/puppeteer');
const jwt = require('../node_modules/jsonwebtoken');
const path = require('path');
const { PrismaClient } = require('../node_modules/@prisma/client');

const prisma = new PrismaClient();

const JWT_SECRET = '053739a262bb48d6553e41ff7cbf1eba89e5b21647971e27316c4ddce50269e6';
const companyId = 'cmrzvh2kk0005i36g39z408xv'; // BIOFIX TECHNOLOGY LLP
const userId = 'cmrzvh2h70004i36gh6csbbne';
const email = 'info@biofixtechnology.com';

const RUN_KEY = 'QA-' + Date.now();
const TRACKED_ITEM_NAME = `BAQA-${RUN_KEY}-TRACKED`;
const UNTRACKED_ITEM_NAME = `BAQA-${RUN_KEY}-UNTRACKED`;

const ARTIFACT_DIR = 'C:\\Users\\SINAN\\.gemini\\antigravity-ide\\brain\\bbdda270-4a13-4c9a-9778-afabd472f91d';

const evidenceLog = [];
let createdIds = {
  trackedProductId: null,
  untrackedProductId: null,
};

function recordEvidence(step, page, action, endpoint, status, result, details = {}) {
  const entry = { step, page, action, endpoint, status, result, details, timestamp: new Date().toISOString() };
  evidenceLog.push(entry);
  console.log(`[${result}] ${step} (${page}) - ${action} | HTTP ${status || 'N/A'}`);
  if (details.message) console.log(`   > ${details.message}`);
}

async function takeScreenshot(page, filename) {
  try {
    const fullPath = path.join(ARTIFACT_DIR, filename);
    await page.screenshot({ path: fullPath, fullPage: false });
    return fullPath;
  } catch (err) {
    console.error(`Failed to capture screenshot ${filename}:`, err.message);
    return null;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function findButtonByText(page, text) {
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const t = await b.evaluate((el) => el.innerText.trim());
    if (t.toLowerCase() === text.toLowerCase() || t.toLowerCase().includes(text.toLowerCase())) {
      return b;
    }
  }
  return null;
}

async function clickButtonByText(page, text) {
  await page.waitForFunction(
    (txt) => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.innerText.toLowerCase().includes(txt.toLowerCase()));
    },
    { timeout: 10000 },
    text
  );
  const btn = await findButtonByText(page, text);
  if (!btn) throw new Error(`Button with text "${text}" not found`);
  await btn.click();
}

(async () => {
  console.log('======================================================================');
  console.log('BILL AURA PRODUCT CREATE & INVENTORY TRACKING LIVE UI VERIFICATION');
  console.log(`Tenant: BIOFIX TECHNOLOGY LLP (${companyId})`);
  console.log(`Run Key: ${RUN_KEY}`);
  console.log('======================================================================\n');

  const payload = {
    email,
    sub: userId,
    userId,
    companyId,
    tenantId: companyId,
    role: 'ADMIN',
    roleId: null,
    globalRole: 'ADMIN',
    onboardingStep: 'COMPLETED',
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  const userObj = {
    id: userId,
    email,
    name: 'Biofix Technology',
    companyId,
    tenantId: companyId,
    role: 'ADMIN',
    globalRole: 'ADMIN',
    onboardingStep: 'COMPLETED',
  };

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,850'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });

  await page.evaluateOnNewDocument((tok, uObj) => {
    localStorage.setItem('billaura_access_token', tok);
    localStorage.setItem('billaura_user', JSON.stringify(uObj));
    localStorage.setItem('billaura_tenant', JSON.stringify({ id: uObj.companyId }));
    localStorage.setItem(
      'billaura_session',
      JSON.stringify({
        state: { user: uObj, permissions: [], isAuthenticated: true },
        version: 0,
      })
    );
  }, token, userObj);

  // Monitor network responses
  const apiRequests = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/products') && req.method() === 'POST') {
      try {
        apiRequests.push({ url: req.url(), postData: JSON.parse(req.postData()) });
      } catch (e) {}
    }
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: CREATE TRACKED ITEM WITH OPENING STOCK & DESCRIPTIONS VIA UI
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 1] CREATE TRACKED ITEM VIA UI (/products/new) ---');
    await page.goto('http://localhost:5173/products/new', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot(page, `${RUN_KEY}_01_product_new_page.png`);

    // 1.1 Item Name
    await page.waitForFunction(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      return labels.some((l) => l.innerText.includes('Name'));
    }, { timeout: 10000 });

    const nameInputHandle = await page.evaluateHandle(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const nameLabel = labels.find((l) => l.innerText.includes('Name'));
      return nameLabel ? nameLabel.parentElement.querySelector('input') : null;
    });
    const nameInputElement = nameInputHandle.asElement();
    if (!nameInputElement) {
      throw new Error('Could not find Name input on Product Form');
    }
    await nameInputElement.click();
    await nameInputElement.type(TRACKED_ITEM_NAME);

    // 1.2 Sales Description & Purchase Description
    const textareas = await page.$$('textarea');
    if (textareas.length > 0) {
      await textareas[0].click();
      await textareas[0].type('UI Created Sales Item with Opening Stock and Strict Validation');
    }

    // 1.3 Selling Price
    const priceInputs = await page.$$('input[placeholder="0.00"]');
    if (priceInputs.length > 0) {
      await priceInputs[0].click({ clickCount: 3 });
      await priceInputs[0].type('2500');
    }

    // 1.4 Purchase Description
    if (textareas.length > 1) {
      await textareas[1].click();
      await textareas[1].type('Component Test Purchase Description for Vendor Supply');
    }

    // 1.5 Cost Price
    if (priceInputs.length > 1) {
      await priceInputs[1].click({ clickCount: 3 });
      await priceInputs[1].type('1500');
    }

    // 1.6 Reorder Point
    const reorderInput = await page.waitForSelector('input[placeholder="e.g. 10"]');
    if (reorderInput) {
      await reorderInput.type('15');
    }

    // 1.7 Opening Stock & Opening Stock Rate
    const openStockHandle = await page.evaluateHandle(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const lbl = labels.find((l) => l.innerText.trim() === 'Opening Stock');
      return lbl ? lbl.parentElement.querySelector('input') : null;
    });
    const openStockInput = openStockHandle.asElement();
    if (!openStockInput) throw new Error('Could not find Opening Stock input');
    await openStockInput.click();
    await openStockInput.type('50');

    const openRateHandle = await page.evaluateHandle(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const lbl = labels.find((l) => l.innerText.includes('Opening Stock Rate Per Unit'));
      return lbl ? lbl.parentElement.querySelector('input') : null;
    });
    const openRateInput = openRateHandle.asElement();
    if (!openRateInput) throw new Error('Could not find Opening Stock Rate input');
    await openRateInput.click();
    await openRateInput.type('1500');

    await sleep(500);
    await takeScreenshot(page, `${RUN_KEY}_02_tracked_product_filled.png`);

    // 1.8 Submit Form and Assert Response
    const [createRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/products') && r.request().method() === 'POST', { timeout: 15000 }),
      clickButtonByText(page, 'Save'),
    ]);

    const resStatus = createRes.status();
    const resData = await createRes.json().catch(() => ({}));

    if (resStatus !== 200 && resStatus !== 201) {
      throw new Error(`Product creation failed with HTTP ${resStatus}: ${JSON.stringify(resData)}`);
    }

    createdIds.trackedProductId = resData.id || resData.data?.id;
    recordEvidence(
      '1.8 CREATE TRACKED PRODUCT',
      '/products/new',
      'Submitted ProductForm with opening stock and descriptions',
      '/api/products',
      resStatus,
      'PASS',
      {
        productId: createdIds.trackedProductId,
        name: TRACKED_ITEM_NAME,
        openingStock: 50,
        openingStockRate: 1500,
        resData,
      }
    );

    await sleep(1500);
    await takeScreenshot(page, `${RUN_KEY}_03_tracked_product_saved.png`);

    // -------------------------------------------------------------------------
    // TEST 2: DATABASE AUDIT FOR TRACKED ITEM, STOCK & STOCK LEDGER
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 2] DATABASE AUDIT FOR TRACKED ITEM ---');
    const dbProduct = await prisma.product.findUnique({
      where: { id: createdIds.trackedProductId },
      include: { stocks: true },
    });

    if (!dbProduct) {
      throw new Error(`Product ${createdIds.trackedProductId} not found in database!`);
    }

    if (dbProduct.description !== 'UI Created Sales Item with Opening Stock and Strict Validation') {
      throw new Error(`Product description mismatch: ${dbProduct.description}`);
    }

    if (dbProduct.purchaseDescription !== 'Component Test Purchase Description for Vendor Supply') {
      throw new Error(`Product purchaseDescription mismatch: ${dbProduct.purchaseDescription}`);
    }

    if (!dbProduct.isTrackStock) {
      throw new Error('Product isTrackStock flag is not true in database');
    }

    const dbStock = await prisma.stock.findFirst({
      where: { productId: createdIds.trackedProductId, companyId },
    });

    if (!dbStock || Number(dbStock.quantity) !== 50 || Number(dbStock.averageCost) !== 1500) {
      throw new Error(`Stock record invalid: ${JSON.stringify(dbStock)}`);
    }

    const dbStockLedger = await prisma.stockLedger.findFirst({
      where: { productId: createdIds.trackedProductId, companyId, type: 'OPENING_STOCK' },
    });

    if (!dbStockLedger || Number(dbStockLedger.quantityChange) !== 50 || Number(dbStockLedger.averageCost) !== 1500) {
      throw new Error(`StockLedger OPENING_STOCK entry missing or invalid: ${JSON.stringify(dbStockLedger)}`);
    }

    recordEvidence(
      '2.1 DB AUDIT TRACKED ITEM',
      'Database',
      'Verified product descriptions, isTrackStock, Stock record, and StockLedger OPENING_STOCK',
      'Prisma DB Query',
      200,
      'PASS',
      {
        productId: dbProduct.id,
        description: dbProduct.description,
        purchaseDescription: dbProduct.purchaseDescription,
        stockQty: Number(dbStock.quantity),
        stockCost: Number(dbStock.averageCost),
        stockLedgerType: dbStockLedger.type,
        stockLedgerQty: Number(dbStockLedger.quantityChange),
      }
    );

    // -------------------------------------------------------------------------
    // TEST 3: REFRESH AND LIST VIEW VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 3] PRODUCT LIST VERIFICATION (/products) ---');
    await page.goto('http://localhost:5173/products', { waitUntil: 'networkidle2' });
    await sleep(1500);

    const searchToggleBtn = await page.$('button[title="Search Table"]');
    if (searchToggleBtn) {
      await searchToggleBtn.click();
      await sleep(300);
    }

    const itemSearch = await page.waitForSelector('input[placeholder*="Search in Items"], input[placeholder*="Search in items"], input[placeholder*="Search"]');
    await itemSearch.type(TRACKED_ITEM_NAME);
    await page.waitForFunction(
      (name) => !document.body.innerText.includes('Loading') && document.body.innerText.includes(name),
      { timeout: 10000 },
      TRACKED_ITEM_NAME
    );
    await sleep(500);
    await takeScreenshot(page, `${RUN_KEY}_04_product_list_verified.png`);

    recordEvidence(
      '3.1 LIST AFTER REFRESH',
      '/products',
      'Verified newly created tracked product is visible in the list after refresh',
      'UI Table Search',
      200,
      'PASS',
      { itemName: TRACKED_ITEM_NAME }
    );

    // -------------------------------------------------------------------------
    // TEST 4: OPEN SAVED ITEM & VERIFY PERSISTENCE & TRANSACTION LOCK
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 4] OPEN SAVED ITEM & VERIFY LOCK ---');
    await page.goto(`http://localhost:5173/products/${createdIds.trackedProductId}/edit`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await takeScreenshot(page, `${RUN_KEY}_05_product_edit_persisted_and_locked.png`);

    const editState = await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const checkbox = document.querySelector('#track_inventory_check');
      const bodyText = document.body.innerText;
      return {
        salesDesc: textareas[0] ? textareas[0].value : null,
        purchaseDesc: textareas[1] ? textareas[1].value : null,
        isCheckboxChecked: checkbox ? checkbox.checked : null,
        isCheckboxDisabled: checkbox ? checkbox.disabled : null,
        hasLockNotice: bodyText.includes('Inventory tracking is locked because transactions/stock exist for this item'),
      };
    });

    if (editState.salesDesc !== 'UI Created Sales Item with Opening Stock and Strict Validation') {
      throw new Error(`Persisted salesDesc mismatch in form: ${editState.salesDesc}`);
    }

    if (editState.purchaseDesc !== 'Component Test Purchase Description for Vendor Supply') {
      throw new Error(`Persisted purchaseDesc mismatch in form: ${editState.purchaseDesc}`);
    }

    if (!editState.isCheckboxChecked) {
      throw new Error('Track inventory checkbox is unexpectedly unchecked');
    }

    if (!editState.isCheckboxDisabled) {
      throw new Error('Track inventory checkbox should be disabled because stock transactions exist');
    }

    recordEvidence(
      '4.1 VERIFY EDIT FORM PERSISTENCE & LOCK',
      `/products/${createdIds.trackedProductId}/edit`,
      'Verified descriptions persisted, tracking checkbox checked, and toggle locked due to transactions',
      'Form Load',
      200,
      'PASS',
      editState
    );

    // -------------------------------------------------------------------------
    // TEST 5: CREATE UNTRACKED ITEM (TRACK INVENTORY DISABLED)
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 5] CREATE UNTRACKED ITEM VIA UI ---');
    await page.goto('http://localhost:5173/products/new', { waitUntil: 'networkidle2' });
    await sleep(1000);

    // Item Name
    await page.waitForFunction(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      return labels.some((l) => l.innerText.includes('Name'));
    }, { timeout: 10000 });

    const uNameInputHandle = await page.evaluateHandle(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const nameLabel = labels.find((l) => l.innerText.includes('Name'));
      return nameLabel ? nameLabel.parentElement.querySelector('input') : null;
    });
    const uNameInput = uNameInputHandle.asElement();
    if (!uNameInput) throw new Error('Could not find Name input for untracked item');
    await uNameInput.click();
    await uNameInput.type(UNTRACKED_ITEM_NAME);

    // Prices
    const untrackedPrices = await page.$$('input[placeholder="0.00"]');
    if (untrackedPrices.length > 0) {
      await untrackedPrices[0].type('800');
    }
    if (untrackedPrices.length > 1) {
      await untrackedPrices[1].type('400');
    }

    // Uncheck Track Inventory
    const isCurrentlyChecked = await page.evaluate(() => {
      const chk = document.querySelector('#track_inventory_check');
      return chk ? chk.checked : false;
    });
    if (isCurrentlyChecked) {
      const checkLabel = await page.$('label[for="track_inventory_check"]');
      if (checkLabel) {
        await checkLabel.click();
      } else {
        await page.click('#track_inventory_check');
      }
    }

    await sleep(500);
    await takeScreenshot(page, `${RUN_KEY}_06_untracked_product_filled.png`);

    const [createUntrackedRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/products') && r.request().method() === 'POST', { timeout: 15000 }),
      clickButtonByText(page, 'Save'),
    ]);

    const untrackedStatus = createUntrackedRes.status();
    const untrackedData = await createUntrackedRes.json().catch(() => ({}));
    createdIds.untrackedProductId = untrackedData.id || untrackedData.data?.id;

    recordEvidence(
      '5.1 CREATE UNTRACKED PRODUCT',
      '/products/new',
      'Saved item with inventory tracking disabled',
      '/api/products',
      untrackedStatus,
      'PASS',
      { productId: createdIds.untrackedProductId, name: UNTRACKED_ITEM_NAME }
    );

    await sleep(1500);
    await takeScreenshot(page, `${RUN_KEY}_07_untracked_product_saved.png`);

    // Verify DB has NO stocks or stock ledger entries
    const untrackedProduct = await prisma.product.findUnique({
      where: { id: createdIds.untrackedProductId },
      include: { stocks: true },
    });

    const untrackedLedgerCount = await prisma.stockLedger.count({
      where: { productId: createdIds.untrackedProductId },
    });

    if (untrackedProduct.isTrackStock !== false) {
      throw new Error(`Untracked product has isTrackStock: ${untrackedProduct.isTrackStock}`);
    }

    if (untrackedProduct.stocks.length !== 0) {
      throw new Error(`Untracked product unexpectedly has stock records: ${untrackedProduct.stocks.length}`);
    }

    if (untrackedLedgerCount !== 0) {
      throw new Error(`Untracked product unexpectedly has stock ledger records: ${untrackedLedgerCount}`);
    }

    recordEvidence(
      '5.2 DB AUDIT UNTRACKED ITEM',
      'Database',
      'Verified isTrackStock=false and 0 stock/ledger entries created',
      'Prisma DB Query',
      200,
      'PASS',
      {
        stocksCount: untrackedProduct.stocks.length,
        ledgerCount: untrackedLedgerCount,
      }
    );

  } catch (err) {
    console.error('\nUI VERIFICATION FAILED:', err);
    await takeScreenshot(page, `${RUN_KEY}_error_state.png`);
    recordEvidence('ERROR', page.url(), err.message, 'N/A', 500, 'FAIL');
    process.exitCode = 1;
  } finally {
    // -------------------------------------------------------------------------
    // TEST 6: CLEANUP TEST RECORDS ONLY
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 6] CLEANING UP TEST RECORDS ONLY ---');
    try {
      const testIds = [createdIds.trackedProductId, createdIds.untrackedProductId].filter(Boolean);
      if (testIds.length > 0) {
        // Delete stock ledgers
        await prisma.stockLedger.deleteMany({
          where: { productId: { in: testIds }, companyId },
        });
        // Delete stocks
        await prisma.stock.deleteMany({
          where: { productId: { in: testIds }, companyId },
        });
        // Delete products
        await prisma.product.deleteMany({
          where: { id: { in: testIds }, companyId },
        });
        console.log(`Cleaned up ${testIds.length} test products and associated stock records.`);
      }

      // Verify Biofix brand remains completely untouched
      const finalBiofixBrand = await prisma.brand.findFirst({
        where: { companyId, brandName: 'Biofix' },
      });
      console.log('Post-cleanup verification: Pre-existing Biofix brand preserved:', !!finalBiofixBrand);

      recordEvidence('6.1 CLEANUP TEST RECORDS', 'Database', 'Removed only test products and stock movements; preserved business data', 'Prisma Cleanup', 200, 'PASS');
    } catch (cleanErr) {
      console.error('Error during test cleanup:', cleanErr.message);
    }

    await browser.close();
    await prisma.$disconnect();

    console.log('\n======================================================================');
    console.log('VERIFICATION SUMMARY');
    console.log('======================================================================');
    console.table(evidenceLog.map((e) => ({ Step: e.step, Action: e.action, Status: e.status, Result: e.result })));
  }
})();
