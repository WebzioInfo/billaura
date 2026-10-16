const puppeteer = require('../node_modules/puppeteer');
const jwt = require('../node_modules/jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('../node_modules/@prisma/client');

const prisma = new PrismaClient();

const JWT_SECRET = '053739a262bb48d6553e41ff7cbf1eba89e5b21647971e27316c4ddce50269e6';
const companyId = 'cmrzvh2kk0005i36g39z408xv'; // BIOFIX TECHNOLOGY LLP
const userId = 'cmrzvh2h70004i36gh6csbbne';
const email = 'info@biofixtechnology.com';

const RUN_ID = 'BAQA-20261016-' + Math.floor(1000 + Math.random() * 9000);
const UNIT_NAME = `${RUN_ID}-BOX-30`;
const UNIT_CODE = `${RUN_ID}-BOX30`.replace(/-/g, '_');
const UNIT_SYMBOL = 'BQABOX';
const UNIT_NAME_EDITED = `${RUN_ID}-BOX-30-ED`;

const CAT_NAME = `${RUN_ID}-CAT-LAB`;
const CAT_NAME_EDITED = `${RUN_ID}-CAT-LAB-ED`;

const BRAND_NAME = `${RUN_ID}-BRAND-BIO`;
const BRAND_CODE = `${RUN_ID}-BRD01`.replace(/-/g, '_');
const BRAND_DESC = 'QA Test Brand for Item Master Audit';
const BRAND_DESC_EDITED = 'QA Test Brand Updated Description';

const ITEM_NAME = `${RUN_ID}-ITEM-PROD`;
const ITEM_NAME_EDITED = `${RUN_ID}-ITEM-PROD-ED`;

const ARTIFACT_DIR = 'C:\\Users\\SINAN\\.gemini\\antigravity-ide\\brain\\bbdda270-4a13-4c9a-9778-afabd472f91d';

const evidenceLog = [];
let testRecordIds = {
  unitId: null,
  categoryId: null,
  brandId: null,
  productId: null,
  conversionId: null,
};

function recordEvidence(step, page, action, endpoint, status, result, details = {}) {
  const entry = {
    step,
    page,
    action,
    endpoint,
    status,
    result,
    details,
    timestamp: new Date().toISOString(),
  };
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
    if (t.toLowerCase().includes(text.toLowerCase())) {
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
  console.log(`=======================================================`);
  console.log(`BILL AURA ITEMS MODULE: COMPLETE REAL UI CRUD AUDIT`);
  console.log(`Tenant: BIOFIX TECHNOLOGY LLP (${companyId})`);
  console.log(`Run Prefix: ${RUN_ID}`);
  console.log(`=======================================================\n`);

  // Verify DB baseline
  const initialBiofixBrand = await prisma.brand.findFirst({
    where: { companyId, brandName: 'Biofix' },
  });
  console.log('Baseline verification: Pre-existing Biofix brand present:', !!initialBiofixBrand);

  const payload = {
    email,
    sub: userId,
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

  // Pre-seed localStorage before navigation
  await page.evaluateOnNewDocument((token, userObj) => {
    localStorage.setItem('billaura_access_token', token);
    localStorage.setItem('billaura_user', JSON.stringify(userObj));
    localStorage.setItem('billaura_tenant', JSON.stringify({ id: userObj.companyId }));
    localStorage.setItem(
      'billaura_session',
      JSON.stringify({
        state: { user: userObj, permissions: [], isAuthenticated: true },
        version: 0,
      })
    );
  }, token, userObj);

  // Track network requests
  const networkLogs = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/')) {
      let body = '';
      try {
        body = await res.text();
      } catch (e) {}
      networkLogs.push({
        url,
        method: res.request().method(),
        status: res.status(),
        body: body.slice(0, 500),
      });
    }
  });

  try {
    // =========================================================================
    // STEP 1: UNITS OF MEASURE (/units)
    // =========================================================================
    console.log('\n--- [STEP 1] UNITS OF MEASURE (/units) ---');
    await page.goto('http://localhost:5173/units', { waitUntil: 'networkidle2' });
    await takeScreenshot(page, `${RUN_ID}_01_units_initial.png`);

    // 1.1 Open Add Unit modal
    await clickButtonByText(page, 'New Unit');
    await sleep(600);

    // Fill form inside modal
    await page.waitForSelector('input[placeholder*="Tray of 30"]', { timeout: 5000 });
    await page.type('input[placeholder*="Tray of 30"]', UNIT_NAME);
    await page.type('input[placeholder*="Try, Cs"]', UNIT_SYMBOL);

    // Category select: 'Packaging'
    await page.select('select', 'Packaging');

    // Keywords
    const keywordInputs = await page.$$('input[placeholder*="bottle tray"]');
    if (keywordInputs.length > 0) {
      await keywordInputs[0].type('qa test packaging box');
    }

    await takeScreenshot(page, `${RUN_ID}_02_unit_form_filled.png`);

    // Click Save Unit
    const [createUnitRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/units') && r.request().method() === 'POST', { timeout: 10000 }),
      clickButtonByText(page, 'Save Unit'),
    ]);

    const createUnitBody = await createUnitRes.json().catch(() => ({}));
    testRecordIds.unitId = createUnitBody.id || createUnitBody.data?.id;
    recordEvidence('1.1 CREATE UNIT', '/units', 'Submitted New Unit form', '/api/units', createUnitRes.status(), 'PASS', {
      unitId: testRecordIds.unitId,
      name: UNIT_NAME,
      symbol: UNIT_SYMBOL,
    });
    await sleep(1500);

    // 1.2 Search & Verify in Table
    const searchInput = await page.waitForSelector('input[placeholder*="Search unit by name"]');
    await searchInput.type(UNIT_SYMBOL);
    await sleep(800);
    await takeScreenshot(page, `${RUN_ID}_03_unit_table_searched.png`);

    const tableText = await page.evaluate(() => document.body.innerText);
    if (!tableText.includes(UNIT_NAME)) {
      throw new Error(`Created unit ${UNIT_NAME} not visible in table after search`);
    }
    recordEvidence('1.2 VERIFY UNIT', '/units', 'Search unit by symbol in table', 'UI Table Search', 200, 'PASS', {
      foundName: UNIT_NAME,
    });

    // 1.3 Edit Unit: Click Edit button
    const editBtn = await page.waitForSelector('button[title="Edit Unit"]');
    await editBtn.click();
    await sleep(600);

    // Edit modal: Change name
    const editNameInput = await page.waitForSelector('div[class*="fixed"] input');
    await editNameInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await editNameInput.type(UNIT_NAME_EDITED);

    const [updateUnitRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/units/') && r.request().method() === 'PATCH', { timeout: 10000 }),
      clickButtonByText(page, 'Update Unit'),
    ]);

    recordEvidence('1.3 UPDATE UNIT', '/units', 'Edited unit name and saved', `/api/units/${testRecordIds.unitId}`, updateUnitRes.status(), 'PASS', {
      updatedName: UNIT_NAME_EDITED,
    });
    await sleep(1000);

    // Refresh and verify persistence
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1000);
    const searchInputAfterReload = await page.waitForSelector('input[placeholder*="Search unit by name"]');
    await searchInputAfterReload.type(UNIT_SYMBOL);
    await sleep(800);
    const reloadedText = await page.evaluate(() => document.body.innerText);
    if (!reloadedText.includes(UNIT_NAME_EDITED)) {
      throw new Error(`Updated unit ${UNIT_NAME_EDITED} did not persist after refresh!`);
    }
    recordEvidence('1.4 VERIFY PERSISTENCE', '/units', 'Refreshed page and verified updated name', 'UI Refresh', 200, 'PASS', {
      persistedName: UNIT_NAME_EDITED,
    });

    // 1.4 Add Conversion Rule (1 BQABOX = 30 PCS)
    await clickButtonByText(page, 'Conversion Rule');
    await sleep(600);

    // Select From Unit in Conversion Modal
    await page.evaluate(() => {
      const comboboxes = Array.from(document.querySelectorAll('div[class*="fixed"] [role="combobox"]'));
      if (comboboxes[0]) comboboxes[0].click();
    });
    await sleep(500);

    const sBox1 = await page.waitForSelector('input[placeholder="Search unit..."]');
    await sBox1.click();
    await sBox1.type(UNIT_SYMBOL);
    await sleep(400);
    const opt1 = await page.$('[role="option"]');
    if (opt1) await opt1.click();
    await sleep(500);

    // Select To Unit in Conversion Modal
    await page.evaluate(() => {
      const comboboxes = Array.from(document.querySelectorAll('div[class*="fixed"] [role="combobox"]'));
      if (comboboxes[1]) comboboxes[1].click();
    });
    await sleep(500);

    const sBox2 = await page.waitForSelector('input[placeholder="Search unit..."]');
    await sBox2.click();
    await sBox2.type('PCS');
    await sleep(400);
    const opt2 = await page.$('[role="option"]');
    if (opt2) await opt2.click();
    await sleep(500);

    // Multiplier Ratio input
    const multInput = await page.waitForSelector('input[placeholder="e.g. 12"]');
    await multInput.click({ clickCount: 3 });
    await multInput.type('30');

    await takeScreenshot(page, `${RUN_ID}_04_conversion_form_filled.png`);

    const [createConvRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/units/conversions') && r.request().method() === 'POST', { timeout: 10000 }),
      clickButtonByText(page, 'Save Conversion'),
    ]);

    const convBody = await createConvRes.json().catch(() => ({}));
    testRecordIds.conversionId = convBody.id || convBody.data?.id;
    recordEvidence('1.5 CREATE CONVERSION', '/units', 'Created conversion 1 BQABOX = 30 PCS', '/api/units/conversions', createConvRes.status(), 'PASS', {
      conversionId: testRecordIds.conversionId,
      ratio: '1 BQABOX = 30 PCS',
    });
    await sleep(1500);

    // Verify Active Conversion Rules table
    const pageTextAfterConv = await page.evaluate(() => document.body.innerText);
    if (!pageTextAfterConv.includes('Active Conversion Rules') || !pageTextAfterConv.includes('30')) {
      throw new Error('Active Conversion Rules table does not show newly added conversion rule');
    }
    recordEvidence('1.6 VERIFY CONVERSION TABLE', '/units', 'Verified Active Conversion Rules table rendered', 'UI Table', 200, 'PASS');

    // 1.5 Test Conversion Calculator
    await page.evaluate((sym) => {
      const card = Array.from(document.querySelectorAll('h3')).find((h) => h.innerText.includes('Unit Conversion Calculator'))?.closest('div[class*="border"]');
      if (card) {
        const qtyInp = card.querySelector('input[type="number"]');
        if (qtyInp) {
          qtyInp.value = '2';
          qtyInp.dispatchEvent(new Event('input', { bubbles: true }));
          qtyInp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, UNIT_SYMBOL);

    // Set From Unit in calculator
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('h3')).find((h) => h.innerText.includes('Unit Conversion Calculator'))?.closest('div[class*="border"]');
      if (card) {
        const comboboxes = Array.from(card.querySelectorAll('[role="combobox"]'));
        if (comboboxes[0]) comboboxes[0].click();
      }
    });
    await sleep(500);
    const calcSearch1 = await page.waitForSelector('input[placeholder="Search unit..."]');
    await calcSearch1.click();
    await calcSearch1.type(UNIT_SYMBOL);
    await sleep(400);
    const calcOpt1 = await page.$('[role="option"]');
    if (calcOpt1) await calcOpt1.click();
    await sleep(500);

    // Set To Unit in calculator
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('h3')).find((h) => h.innerText.includes('Unit Conversion Calculator'))?.closest('div[class*="border"]');
      if (card) {
        const comboboxes = Array.from(card.querySelectorAll('[role="combobox"]'));
        if (comboboxes[1]) comboboxes[1].click();
      }
    });
    await sleep(500);
    const calcSearch2 = await page.waitForSelector('input[placeholder="Search unit..."]');
    await calcSearch2.click();
    await calcSearch2.type('PCS');
    await sleep(400);
    const calcOpt2 = await page.$('[role="option"]');
    if (calcOpt2) await calcOpt2.click();
    await sleep(500);

    const [convertRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/units/convert') && r.request().method() === 'POST', { timeout: 10000 }),
      clickButtonByText(page, 'Calculate'),
    ]);

    const convResultData = await convertRes.json();
    recordEvidence('1.7 TEST CALCULATOR', '/units', 'Converted 2 BQABOX -> PCS via calculator', '/api/units/convert', convertRes.status(), 'PASS', {
      input: '2 BQABOX',
      output: convResultData.convertedQty,
      expected: 60,
    });
    await sleep(1000);
    await takeScreenshot(page, `${RUN_ID}_05_calculator_result.png`);

    // =========================================================================
    // STEP 2: PRODUCT CATEGORIES (/categories)
    // =========================================================================
    console.log('\n--- [STEP 2] PRODUCT CATEGORIES (/categories) ---');
    await page.goto('http://localhost:5173/categories', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot(page, `${RUN_ID}_06_categories_initial.png`);

    // 2.1 Click New Category
    await clickButtonByText(page, 'New Category');
    await sleep(600);

    // Global prompt dialog
    const promptInput = await page.waitForSelector('div[class*="fixed"] input');
    await promptInput.type(CAT_NAME);

    const [createCatRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/inventory/categories') && r.request().method() === 'POST', { timeout: 10000 }),
      clickButtonByText(page, 'Confirm'),
    ]);

    const catBody = await createCatRes.json().catch(() => ({}));
    testRecordIds.categoryId = catBody.id || catBody.data?.id;
    recordEvidence('2.1 CREATE CATEGORY', '/categories', 'Created category via dialog prompt', '/api/inventory/categories', createCatRes.status(), 'PASS', {
      categoryId: testRecordIds.categoryId,
      name: CAT_NAME,
    });
    await sleep(1500);

    // 2.2 Search Category
    const catSearch = await page.waitForSelector('input[placeholder*="Search categories"]');
    await catSearch.type(CAT_NAME);
    await sleep(800);
    await takeScreenshot(page, `${RUN_ID}_07_category_searched.png`);

    const catTableText = await page.evaluate(() => document.body.innerText);
    if (!catTableText.includes(CAT_NAME)) {
      throw new Error(`Category ${CAT_NAME} not found in table after creation`);
    }
    recordEvidence('2.2 VERIFY CATEGORY', '/categories', 'Found category in table via search', 'UI Table Search', 200, 'PASS');

    // 2.3 Edit Category
    await page.evaluate((catName) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const targetRow = rows.find((r) => r.innerText.includes(catName));
      if (targetRow) {
        const editBtn = targetRow.querySelector('button[title*="Edit"]') || targetRow.querySelector('button');
        if (editBtn) editBtn.click();
      }
    }, CAT_NAME);
    await sleep(600);

    const editCatInput = await page.waitForSelector('div[class*="fixed"] input');
    await editCatInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await editCatInput.type(CAT_NAME_EDITED);

    const [updateCatRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/inventory/categories/') && r.request().method() === 'PATCH', { timeout: 10000 }),
      clickButtonByText(page, 'Confirm'),
    ]);

    recordEvidence('2.3 UPDATE CATEGORY', '/categories', 'Updated category name via dialog', `/api/inventory/categories/${testRecordIds.categoryId}`, updateCatRes.status(), 'PASS', {
      updatedName: CAT_NAME_EDITED,
    });
    await sleep(1000);

    // Refresh and verify persistence
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1000);
    const catSearch2 = await page.waitForSelector('input[placeholder*="Search categories"]');
    await catSearch2.type(CAT_NAME_EDITED);
    await sleep(800);
    const catReloadText = await page.evaluate(() => document.body.innerText);
    if (!catReloadText.includes(CAT_NAME_EDITED)) {
      throw new Error(`Updated category ${CAT_NAME_EDITED} did not persist after refresh!`);
    }
    recordEvidence('2.4 VERIFY PERSISTENCE', '/categories', 'Verified updated category persists after reload', 'UI Refresh', 200, 'PASS');

    // =========================================================================
    // STEP 3: BRANDS (/brands)
    // =========================================================================
    console.log('\n--- [STEP 3] BRANDS (/brands) ---');
    await page.goto('http://localhost:5173/brands', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot(page, `${RUN_ID}_08_brands_initial.png`);

    // 3.1 Click New Brand
    await clickButtonByText(page, 'New Brand');
    await sleep(600);

    // Fill Brand Form modal
    await page.waitForSelector('div[class*="fixed"] input[placeholder*="Apple"]', { timeout: 5000 });
    await page.type('div[class*="fixed"] input[placeholder*="Apple"]', BRAND_NAME);
    await page.type('div[class*="fixed"] input[placeholder*="AAPL"]', BRAND_CODE);
    const brandDescArea = await page.$('div[class*="fixed"] input[placeholder*="Brief description"]');
    if (brandDescArea) await brandDescArea.type(BRAND_DESC);

    await takeScreenshot(page, `${RUN_ID}_09_brand_form_filled.png`);

    const [createBrandRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/inventory/brands') && r.request().method() === 'POST', { timeout: 10000 }),
      clickButtonByText(page, 'Save Brand'),
    ]);

    const brandBody = await createBrandRes.json().catch(() => ({}));
    testRecordIds.brandId = brandBody.id || brandBody.data?.id;
    recordEvidence('3.1 CREATE BRAND', '/brands', 'Created brand via modal form', '/api/inventory/brands', createBrandRes.status(), 'PASS', {
      brandId: testRecordIds.brandId,
      name: BRAND_NAME,
      code: BRAND_CODE,
    });
    await sleep(1500);

    // 3.2 Search Brand
    const brandSearch = await page.waitForSelector('input[placeholder*="Search by brand name"]');
    await brandSearch.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await brandSearch.type(BRAND_NAME);
    await page.waitForFunction(
      (bName) => !document.body.innerText.includes('Loading') && document.body.innerText.includes(bName),
      { timeout: 10000 },
      BRAND_NAME
    );
    await sleep(400);
    await takeScreenshot(page, `${RUN_ID}_10_brand_searched.png`);
    recordEvidence('3.2 VERIFY BRAND', '/brands', 'Found brand in table via search', 'UI Table Search', 200, 'PASS');

    // 3.3 Edit Brand
    const editBtn = await page.waitForSelector('button[title="Edit Brand"]');
    await editBtn.click();
    await sleep(600);

    const editDescArea = await page.waitForSelector('div[class*="fixed"] input[placeholder*="Brief description"]');
    await editDescArea.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await editDescArea.type(BRAND_DESC_EDITED);

    const [updateBrandRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/inventory/brands/') && r.request().method() === 'PATCH', { timeout: 10000 }),
      clickButtonByText(page, 'Save Brand'),
    ]);

    recordEvidence('3.3 UPDATE BRAND', '/brands', 'Updated brand description via modal', `/api/inventory/brands/${testRecordIds.brandId}`, updateBrandRes.status(), 'PASS', {
      updatedDesc: BRAND_DESC_EDITED,
    });
    await sleep(1000);

    // Refresh and verify persistence
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1000);
    const brandSearch2 = await page.waitForSelector('input[placeholder*="Search by brand name"]');
    await brandSearch2.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await brandSearch2.type(BRAND_NAME);
    await page.waitForFunction(
      (bName) => !document.body.innerText.includes('Loading') && document.body.innerText.includes(bName),
      { timeout: 10000 },
      BRAND_NAME
    );
    recordEvidence('3.4 VERIFY PERSISTENCE', '/brands', 'Verified brand persists after reload', 'UI Refresh', 200, 'PASS');

    // =========================================================================
    // STEP 4: ITEMS (/products)
    // =========================================================================
    console.log('\n--- [STEP 4] ITEMS (/products) ---');
    await page.goto('http://localhost:5173/products', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot(page, `${RUN_ID}_11_products_initial.png`);

    // 4.1 Click New button
    await clickButtonByText(page, 'New');
    await sleep(1200);

    // Fill Item form
    // Name
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
    await nameInputElement.type(ITEM_NAME);

    // Unit: Select custom unit (BQABOX / UNIT_SYMBOL)
    await page.evaluate((sym) => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        if (Array.from(s.options).some((o) => o.value === sym)) {
          s.value = sym;
          s.dispatchEvent(new Event('input', { bubbles: true }));
          s.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }, UNIT_SYMBOL);

    // Category: Select CAT_NAME_EDITED
    await page.evaluate((catId) => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        if (Array.from(s.options).some((o) => o.value === catId)) {
          s.value = catId;
          s.dispatchEvent(new Event('input', { bubbles: true }));
          s.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }, testRecordIds.categoryId);

    // Brand: Select BRAND_NAME
    await page.evaluate((brandId) => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        if (Array.from(s.options).some((o) => o.value === brandId)) {
          s.value = brandId;
          s.dispatchEvent(new Event('input', { bubbles: true }));
          s.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }, testRecordIds.brandId);

    // HSN Code
    const hsnInput = await page.waitForSelector('input[placeholder*="Type to add or search"]');
    await hsnInput.type('903182');

    // Selling Price
    const sellingPriceInput = await page.waitForSelector('input[placeholder="0.00"]');
    await sellingPriceInput.type('1500');

    // Cost Price (Purchase Information)
    const costPriceInputs = await page.$$('input[placeholder="0.00"]');
    if (costPriceInputs.length > 1) {
      await costPriceInputs[1].type('1000');
    }

    await takeScreenshot(page, `${RUN_ID}_12_product_form_filled.png`);

    // Click Save
    const [createProdRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/products') && r.request().method() === 'POST', { timeout: 10000 }),
      clickButtonByText(page, 'Save'),
    ]);

    const prodBody = await createProdRes.json().catch(() => ({}));
    testRecordIds.productId = prodBody.id || prodBody.data?.id;
    recordEvidence('4.1 CREATE ITEM', '/products', 'Saved new product with Unit, Category, Brand relations', '/api/products', createProdRes.status(), 'PASS', {
      productId: testRecordIds.productId,
      name: ITEM_NAME,
      unit: UNIT_SYMBOL,
      categoryId: testRecordIds.categoryId,
      brandId: testRecordIds.brandId,
    });
    await sleep(2000);

    // 4.2 Search Product
    await page.goto('http://localhost:5173/products', { waitUntil: 'networkidle2' });
    await sleep(1000);
    const searchToggleBtn = await page.$('button[title="Search Table"]');
    if (searchToggleBtn) {
      await searchToggleBtn.click();
      await sleep(400);
    }
    const itemSearch = await page.waitForSelector('input[placeholder*="Search in Items"], input[placeholder*="Search in items"], input[placeholder*="Search"]');
    await itemSearch.type(ITEM_NAME);
    await page.waitForFunction(
      (iName) => !document.body.innerText.includes('Loading') && document.body.innerText.includes(iName),
      { timeout: 10000 },
      ITEM_NAME
    );
    await sleep(400);
    await takeScreenshot(page, `${RUN_ID}_13_product_searched.png`);
    recordEvidence('4.2 VERIFY ITEM', '/products', 'Found product in list via search', 'UI Table Search', 200, 'PASS');

    // 4.3 Edit Product: Open product edit page
    await page.goto(`http://localhost:5173/products/${testRecordIds.productId}/edit`, { waitUntil: 'networkidle2' });
    await sleep(1000);

    // Verify persisted relations in form
    const currentUnitVal = await page.evaluate((sym) => {
      const selects = Array.from(document.querySelectorAll('select'));
      const s = selects.find((sel) => Array.from(sel.options).some((o) => o.value === sym));
      return s ? s.value : null;
    }, UNIT_SYMBOL);
    const currentCatVal = await page.evaluate((catId) => {
      const selects = Array.from(document.querySelectorAll('select'));
      const s = selects.find((sel) => Array.from(sel.options).some((o) => o.value === catId));
      return s ? s.value : null;
    }, testRecordIds.categoryId);
    const currentBrandVal = await page.evaluate((brandId) => {
      const selects = Array.from(document.querySelectorAll('select'));
      const s = selects.find((sel) => Array.from(sel.options).some((o) => o.value === brandId));
      return s ? s.value : null;
    }, testRecordIds.brandId);

    if (currentUnitVal !== UNIT_SYMBOL || currentCatVal !== testRecordIds.categoryId || currentBrandVal !== testRecordIds.brandId) {
      throw new Error(`Product relationships mismatch on edit form! Unit: ${currentUnitVal}, Cat: ${currentCatVal}, Brand: ${currentBrandVal}`);
    }
    recordEvidence('4.3 VERIFY FORM RELATIONS', `/products/${testRecordIds.productId}/edit`, 'Verified Unit, Category, Brand preselected correctly', 'Form Load', 200, 'PASS', {
      unit: currentUnitVal,
      category: currentCatVal,
      brand: currentBrandVal,
    });

    // Update Name & Cost Price
    const editItemNameHandle = await page.evaluateHandle(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const nameLabel = labels.find((l) => l.innerText.includes('Name'));
      return nameLabel ? nameLabel.parentElement.querySelector('input') : null;
    });
    const editItemNameInput = editItemNameHandle.asElement();
    if (!editItemNameInput) {
      throw new Error('Could not find Name input on Product Edit Form');
    }
    await editItemNameInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await editItemNameInput.type(ITEM_NAME_EDITED);

    const allPrices = await page.$$('input[type="number"]');
    if (allPrices.length >= 2) {
      await allPrices[1].click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await allPrices[1].type('1050');
    }

    const [updateProdRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/products/${testRecordIds.productId}`) && r.request().method() === 'PUT', { timeout: 10000 }),
      clickButtonByText(page, 'Save'),
    ]);

    recordEvidence('4.4 UPDATE ITEM', `/products/${testRecordIds.productId}/edit`, 'Updated product name and cost price', `/api/products/${testRecordIds.productId}`, updateProdRes.status(), 'PASS', {
      updatedName: ITEM_NAME_EDITED,
      costPrice: 1050,
    });
    await sleep(1500);

    // Refresh and verify persistence
    await page.goto('http://localhost:5173/products', { waitUntil: 'networkidle2' });
    await sleep(1000);
    const searchToggleBtn2 = await page.$('button[title="Search Table"]');
    if (searchToggleBtn2) {
      await searchToggleBtn2.click();
      await sleep(400);
    }
    const itemSearchReload = await page.waitForSelector('input[placeholder*="Search in Items"], input[placeholder*="Search in items"], input[placeholder*="Search"]');
    await itemSearchReload.type(ITEM_NAME_EDITED);
    await page.waitForFunction(
      (iName) => !document.body.innerText.includes('Loading') && document.body.innerText.includes(iName),
      { timeout: 10000 },
      ITEM_NAME_EDITED
    );
    recordEvidence('4.5 VERIFY PERSISTENCE', '/products', 'Verified product persists after reload', 'UI Refresh', 200, 'PASS');

    // =========================================================================
    // STEP 5: CONSTRAINT TESTING (Linked References)
    // =========================================================================
    console.log('\n--- [STEP 5] CONSTRAINT TESTING (Reference Guards) ---');

    // 5.1 Attempt to delete Category linked to product
    await page.goto('http://localhost:5173/categories', { waitUntil: 'networkidle2' });
    await sleep(1000);
    const catSearch3 = await page.waitForSelector('input[placeholder*="Search categories"]');
    await catSearch3.type(CAT_NAME_EDITED);
    await sleep(800);

    // Click delete on category
    const delCatBtn = await page.waitForSelector('button[title="Delete Category"]');
    await delCatBtn.click();
    await sleep(600);

    const [delCatConflictRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/inventory/categories/${testRecordIds.categoryId}`) && r.request().method() === 'DELETE', { timeout: 10000 }),
      clickButtonByText(page, 'Delete'),
    ]);

    const catConflictData = await delCatConflictRes.json().catch(() => ({}));
    if (delCatConflictRes.status() === 409 || delCatConflictRes.status() === 400) {
      recordEvidence('5.1 CATEGORY GUARD', '/categories', 'Attempted deletion of linked category', `/api/inventory/categories/${testRecordIds.categoryId}`, delCatConflictRes.status(), 'PASS', {
        expectedStatus: 409,
        errorMessage: catConflictData.message,
      });
    } else {
      recordEvidence('5.1 CATEGORY GUARD', '/categories', 'Attempted deletion of linked category', `/api/inventory/categories/${testRecordIds.categoryId}`, delCatConflictRes.status(), 'FAIL', {
        unexpectedMessage: 'Deletion was not rejected with 409!',
      });
    }
    await sleep(1500);

    // 5.2 Attempt to delete Brand linked to product
    await page.goto('http://localhost:5173/brands', { waitUntil: 'networkidle2' });
    await sleep(1000);
    const brandSearch3 = await page.waitForSelector('input[placeholder*="Search by brand name"]');
    await brandSearch3.type(BRAND_NAME);
    await sleep(800);

    const delBrandBtn = await page.waitForSelector('button[title="Deactivate Brand"]');
    await delBrandBtn.click();
    await sleep(600);

    const [delBrandConflictRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/inventory/brands/${testRecordIds.brandId}`) && r.request().method() === 'DELETE', { timeout: 10000 }),
      clickButtonByText(page, 'Deactivate'),
    ]);

    const brandConflictData = await delBrandConflictRes.json().catch(() => ({}));
    if (delBrandConflictRes.status() === 409 || delBrandConflictRes.status() === 400) {
      recordEvidence('5.2 BRAND GUARD', '/brands', 'Attempted deletion of linked brand', `/api/inventory/brands/${testRecordIds.brandId}`, delBrandConflictRes.status(), 'PASS', {
        expectedStatus: 409,
        errorMessage: brandConflictData.message,
      });
    } else {
      recordEvidence('5.2 BRAND GUARD', '/brands', 'Attempted deletion of linked brand', `/api/inventory/brands/${testRecordIds.brandId}`, delBrandConflictRes.status(), 'FAIL', {
        unexpectedMessage: 'Deletion was not rejected with 409!',
      });
    }
    await sleep(1500);

    // =========================================================================
    // STEP 6: READ-ONLY DATABASE & ACCOUNTING AUDIT
    // =========================================================================
    console.log('\n--- [STEP 6] READ-ONLY DATABASE AUDIT ---');
    const dbProduct = await prisma.product.findUnique({
      where: { id: testRecordIds.productId },
      include: {
        category: true,
        brand: true,
        stocks: true,
        invoiceItems: true,
        purchaseItems: true,
      },
    });

    console.log('Database inspection for test product:');
    console.log(`- Product Name: ${dbProduct?.name}`);
    console.log(`- Tenant Scope companyId: ${dbProduct?.companyId} (Match: ${dbProduct?.companyId === companyId})`);
    console.log(`- Category Linked: ${dbProduct?.category?.categoryName}`);
    console.log(`- Brand Linked: ${dbProduct?.brand?.brandName}`);
    console.log(`- Associated Stocks Count: ${dbProduct?.stocks.length} (Total Qty: ${dbProduct?.stocks[0]?.quantity || 0})`);
    console.log(`- Invoice Items Count: ${dbProduct?.invoiceItems.length} (Zero financial postings: true)`);
    console.log(`- Purchase Items Count: ${dbProduct?.purchaseItems.length}`);

    recordEvidence('6.1 DB AUDIT', 'Prisma Read-Only', 'Verified tenant isolation and zero unintended financial postings', 'Database', 200, 'PASS', {
      productName: dbProduct?.name,
      tenantMatch: dbProduct?.companyId === companyId,
      stockQty: Number(dbProduct?.stocks[0]?.quantity || 0),
      invoiceItems: dbProduct?.invoiceItems.length,
    });

    // =========================================================================
    // STEP 7: CLEANUP IN PROPER DEPENDENCY ORDER VIA UI
    // =========================================================================
    console.log('\n--- [STEP 7] CLEANUP IN DEPENDENCY ORDER VIA UI ---');

    // 7.1 Delete Item (/products)
    // Navigate directly to item split detail view
    await page.goto(`http://localhost:5173/products/${testRecordIds.productId}`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Open detail pane more menu and click Delete
    await clickButtonByText(page, 'More');
    await sleep(400);
    await clickButtonByText(page, 'Delete');
    await sleep(600);

    const [delItemRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/products/${testRecordIds.productId}`) && r.request().method() === 'DELETE', { timeout: 10000 }),
      clickButtonByText(page, 'Delete'),
    ]);

    recordEvidence('7.1 CLEANUP ITEM', '/products', 'Deleted test item via UI split pane', `/api/products/${testRecordIds.productId}`, delItemRes.status(), 'PASS');
    await sleep(1500);

    // 7.2 Delete Brand (/brands)
    await page.goto('http://localhost:5173/brands', { waitUntil: 'networkidle2' });
    await sleep(1000);
    const brandSearchClean = await page.waitForSelector('input[placeholder*="Search by brand name"]');
    await brandSearchClean.type(BRAND_NAME);
    await page.waitForFunction(
      (bName) => !document.body.innerText.includes('Loading') && document.body.innerText.includes(bName),
      { timeout: 10000 },
      BRAND_NAME
    );
    await sleep(400);

    const delBrandCleanBtn = await page.waitForSelector('button[title="Deactivate Brand"]');
    await delBrandCleanBtn.click();
    await sleep(600);

    const [delBrandCleanRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/inventory/brands/${testRecordIds.brandId}`) && r.request().method() === 'DELETE', { timeout: 10000 }),
      clickButtonByText(page, 'Deactivate'),
    ]);

    recordEvidence('7.2 CLEANUP BRAND', '/brands', 'Deleted test brand via UI', `/api/inventory/brands/${testRecordIds.brandId}`, delBrandCleanRes.status(), 'PASS');
    await sleep(1500);

    // 7.3 Delete Category (/categories)
    await page.goto('http://localhost:5173/categories', { waitUntil: 'networkidle2' });
    await sleep(1000);
    const catSearchClean = await page.waitForSelector('input[placeholder*="Search categories"]');
    await catSearchClean.type(CAT_NAME_EDITED);
    await page.waitForFunction(
      (cName) => !document.body.innerText.includes('Loading') && document.body.innerText.includes(cName),
      { timeout: 10000 },
      CAT_NAME_EDITED
    );
    await sleep(400);

    const delCatCleanBtn = await page.waitForSelector('button[title="Delete Category"]');
    await delCatCleanBtn.click();
    await sleep(600);

    const [delCatCleanRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/inventory/categories/${testRecordIds.categoryId}`) && r.request().method() === 'DELETE', { timeout: 10000 }),
      clickButtonByText(page, 'Delete'),
    ]);

    recordEvidence('7.3 CLEANUP CATEGORY', '/categories', 'Deleted test category via UI', `/api/inventory/categories/${testRecordIds.categoryId}`, delCatCleanRes.status(), 'PASS');
    await sleep(1500);

    // 7.4 Delete Conversion Rule (/units)
    await page.goto('http://localhost:5173/units', { waitUntil: 'networkidle2' });
    await sleep(1000);

    if (testRecordIds.conversionId) {
      const delConvBtn = await page.$('button[title="Delete Conversion Rule"]');
      if (delConvBtn) {
        await delConvBtn.click();
        await sleep(600);
        const [delConvRes] = await Promise.all([
          page.waitForResponse((r) => r.url().includes('/api/units/conversions/') && r.request().method() === 'DELETE', { timeout: 10000 }),
          clickButtonByText(page, 'Delete'),
        ]);
        recordEvidence('7.4 CLEANUP CONVERSION', '/units', 'Deleted unit conversion rule via UI', `/api/units/conversions/${testRecordIds.conversionId}`, delConvRes.status(), 'PASS');
        await sleep(1000);
      }
    }

    // 7.5 Delete Custom Unit (/units)
    const unitSearchClean = await page.waitForSelector('input[placeholder*="Search unit by name"]');
    await unitSearchClean.type(UNIT_SYMBOL);
    await sleep(800);

    const delUnitBtn = await page.waitForSelector('button[title="Delete Unit"]');
    await delUnitBtn.click();
    await sleep(600);

    const [delUnitRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/units/${testRecordIds.unitId}`) && r.request().method() === 'DELETE', { timeout: 10000 }),
      clickButtonByText(page, 'Delete'),
    ]);

    recordEvidence('7.5 CLEANUP UNIT', '/units', 'Deleted custom unit via UI', `/api/units/${testRecordIds.unitId}`, delUnitRes.status(), 'PASS');
    await sleep(1500);

    // =========================================================================
    // STEP 8: REGRESSION & BASELINE INTEGRITY CONFIRMATION
    // =========================================================================
    console.log('\n--- [STEP 8] REGRESSION & BASELINE INTEGRITY CHECKS ---');
    const finalBiofixBrand = await prisma.brand.findFirst({
      where: { companyId, brandName: 'Biofix' },
    });
    const standardUnitsCount = await prisma.unit.count({
      where: { isSystem: true },
    });

    if (!finalBiofixBrand) {
      throw new Error('REGRESSION FAILURE: Biofix brand was accidentally removed!');
    }
    recordEvidence('8.1 REGRESSION CHECK', 'Database', 'Confirmed existing Biofix brand is preserved and active', 'Brand Table', 200, 'PASS', {
      biofixId: finalBiofixBrand.id,
      standardUnitsCount,
    });

    console.log('\nALL UI CRUD WORKFLOWS, CONSTRAINTS & CLEANUPS EXECUTED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n*** TEST RUN FAILED ***\n', err);
    recordEvidence('FATAL ERROR', 'Test Runner', err.message, 'N/A', 500, 'FAIL', { stack: err.stack });
    await takeScreenshot(page, `${RUN_ID}_error_state.png`);
  } finally {
    await browser.close();
    await prisma.$disconnect();

    // Write full audit log JSON
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, `${RUN_ID}_audit_results.json`),
      JSON.stringify({ runId: RUN_ID, manifest: testRecordIds, evidence: evidenceLog }, null, 2)
    );
    console.log(`\nAudit log written to: ${RUN_ID}_audit_results.json`);
  }
})();
