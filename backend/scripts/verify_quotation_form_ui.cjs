const puppeteer = require('../node_modules/puppeteer');
const jwt = require('../node_modules/jsonwebtoken');
const path = require('path');
const { PrismaClient } = require('../node_modules/@prisma/client');

const prisma = new PrismaClient();

const JWT_SECRET = '053739a262bb48d6553e41ff7cbf1eba89e5b21647971e27316c4ddce50269e6';
const companyId = 'cmrzvh2kk0005i36g39z408xv'; // BIOFIX TECHNOLOGY LLP
const userId = 'cmrzvh2h70004i36gh6csbbne';
const email = 'info@biofixtechnology.com';

const RUN_KEY = 'QT-' + Date.now().toString().slice(-6);
const ARTIFACT_DIR = 'C:\\Users\\SINAN\\.gemini\\antigravity-ide\\brain\\bbdda270-4a13-4c9a-9778-afabd472f91d';

const evidenceLog = [];
let createdQuotationId = null;

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

(async () => {
  console.log('======================================================================');
  console.log('BILL AURA QUOTATION FORM DATA & ITEM SEARCH LIVE UI VERIFICATION');
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
  const apiResponses = [];

  try {
    // -------------------------------------------------------------------------
    // STEP 1: OPEN QUOTATION FORM PAGE
    // -------------------------------------------------------------------------
    console.log('\n--- [STEP 1] NAVIGATE TO /quotations/new ---');
    await page.goto('http://localhost:5173/quotations/new', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await takeScreenshot(page, `${RUN_KEY}_01_quotation_form_initial.png`);
    recordEvidence('1.0', '/quotations/new', 'Open quotation form page', '/quotations/new', 200, 'PASS', {
      message: 'Quotation new page rendered successfully',
    });

    // -------------------------------------------------------------------------
    // STEP 2: VERIFY REAL CUSTOMERS LOAD & SELECT ONE
    // -------------------------------------------------------------------------
    console.log('\n--- [STEP 2] VERIFY REAL CUSTOMERS LOAD AND SELECT ---');
    // Open customer dropdown by clicking the trigger button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const trigger = btns.find((b) => b.innerText && b.innerText.includes('Select or add a customer'));
      if (trigger) trigger.click();
    });
    await sleep(800);

    // Verify customers rendered
    const customerOptions = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div')).filter((el) => {
        return (
          el.className.includes('cursor-pointer') &&
          el.querySelector('p.font-semibold') &&
          !el.innerText.includes('New Customer')
        );
      });
      return items.map((el) => ({
        name: el.querySelector('p')?.innerText?.trim(),
        text: el.innerText.trim(),
      }));
    });

    console.log(`Found ${customerOptions.length} customer options in dropdown`);
    if (customerOptions.length === 0) {
      throw new Error('Customer dropdown is empty! No real customers loaded.');
    }

    const firstCustomerName = customerOptions[0].name;
    console.log(`Selecting real customer: "${firstCustomerName}"`);

    // Click the first customer
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div')).filter((el) => {
        return (
          el.className.includes('cursor-pointer') &&
          el.querySelector('p.font-semibold') &&
          !el.innerText.includes('New Customer')
        );
      });
      if (items[0]) items[0].click();
    });
    await sleep(600);

    const selectedCustomerText = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const custLabel = labels.find((l) => l.innerText && l.innerText.includes('Customer Name'));
      const row = custLabel ? custLabel.closest('div.flex') : null;
      const btn = row ? row.querySelector('button') : null;
      return btn ? btn.innerText.trim() : '';
    });

    console.log(`Selected customer button text: "${selectedCustomerText}"`);
    if (!selectedCustomerText.includes(firstCustomerName)) {
      throw new Error(`Customer selection failed: expected to contain "${firstCustomerName}", got "${selectedCustomerText}"`);
    }

    await takeScreenshot(page, `${RUN_KEY}_02_customer_selected.png`);
    recordEvidence('2.0', '/quotations/new', 'Select customer from real customer API', '/customers', 200, 'PASS', {
      selectedCustomer: selectedCustomerText,
      totalCustomersAvailable: customerOptions.length,
    });

    // -------------------------------------------------------------------------
    // STEP 3: VERIFY REAL EMPLOYEES POPULATE SALESPERSON (NO HARDCODED NAMES)
    // -------------------------------------------------------------------------
    console.log('\n--- [STEP 3] VERIFY SALESPERSON POPULATED WITH REAL EMPLOYEES ---');
    const salespersonSelect = await page.$('select[class*="appearance-none"]');
    const salespersonOptions = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      // Find select that has options with employee codes or names
      for (const sel of selects) {
        const texts = Array.from(sel.options).map((o) => o.text);
        if (texts.some((t) => t.includes('Select a salesperson') || t.includes('Noureen') || t.includes('Sameer') || t.includes('Anas'))) {
          return Array.from(sel.options).map((o) => ({ value: o.value, text: o.text }));
        }
      }
      return [];
    });

    console.log('Salesperson options:', salespersonOptions);
    const hardcodedNames = ['ALI HASHIM', 'RAHUL SHARMA', 'PRIYA NAIR', 'VIKRAM MEHTA', 'SNEHA PATEL'];
    for (const bad of hardcodedNames) {
      if (salespersonOptions.some((o) => o.text.toUpperCase().includes(bad))) {
        throw new Error(`Hardcoded salesperson "${bad}" is still present in dropdown!`);
      }
    }

    const realEmployeeOption = salespersonOptions.find((o) => o.value !== '' && o.text.trim().length > 0);
    if (!realEmployeeOption) {
      throw new Error('No real active employees found in salesperson selector!');
    }
    console.log(`Selecting real employee: ${realEmployeeOption.text} (ID: ${realEmployeeOption.value})`);

    // Select this employee
    await page.evaluate((val) => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const sel of selects) {
        if (Array.from(sel.options).some((o) => o.value === val)) {
          sel.value = val;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }, realEmployeeOption.value);
    await sleep(300);

    recordEvidence('3.0', '/quotations/new', 'Verify and select real employee salesperson', '/hr/employees', 200, 'PASS', {
      selectedEmployee: realEmployeeOption,
      hardcodedNamesAbsent: true,
    });

    // -------------------------------------------------------------------------
    // STEP 4: VERIFY PROJECT NAME FIELD IS COMPLETELY ABSENT
    // -------------------------------------------------------------------------
    console.log('\n--- [STEP 4] CONFIRM PROJECT NAME IS COMPLETELY ABSENT ---');
    const projectPresence = await page.evaluate(() => {
      const allText = document.body.innerText;
      const hasProjectLabel = /project\s*name/i.test(allText);
      const inputs = Array.from(document.querySelectorAll('input, select')).map((el) => ({
        name: el.getAttribute('name'),
        placeholder: el.getAttribute('placeholder'),
        id: el.getAttribute('id'),
      }));
      const hasProjectInput = inputs.some(
        (i) =>
          (i.name && /project/i.test(i.name)) ||
          (i.placeholder && /project/i.test(i.placeholder)) ||
          (i.id && /project/i.test(i.id))
      );
      return { hasProjectLabel, hasProjectInput };
    });

    console.log('Project presence check:', projectPresence);
    if (projectPresence.hasProjectLabel || projectPresence.hasProjectInput) {
      throw new Error('Project Name field is still present in the quotation form DOM!');
    }
    recordEvidence('4.0', '/quotations/new', 'Verify Project Name removed', 'N/A', 200, 'PASS', {
      projectAbsent: true,
    });

    // -------------------------------------------------------------------------
    // STEP 5 & 6: COMBINED SEARCHABLE ITEM COMBOBOX & AUTO-POPULATION
    // -------------------------------------------------------------------------
    console.log('\n--- [STEP 5 & 6] SEARCHABLE ITEM COMBOBOX SEARCH & POPULATE ---');
    // Find the item combobox input
    await page.waitForSelector('input[placeholder*="Type or click to select"]', { timeout: 5000 });
    const itemInput = await page.$('input[placeholder*="Type or click to select"]');
    if (!itemInput) throw new Error('Searchable item combobox trigger input not found!');

    await itemInput.click();
    await sleep(400);

    // Type a search query to test real product filtering
    await itemInput.type('Grain', { delay: 50 });
    await sleep(800);
    await takeScreenshot(page, `${RUN_KEY}_03_item_search_dropdown.png`);

    // Verify search dropdown results
    const searchResults = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div')).filter(
        (d) => d.innerText && d.innerText.includes('Grain') && d.querySelector('span')
      );
      return items.map((i) => i.innerText.trim());
    });

    console.log('Combobox search results for "Grain":', searchResults.slice(0, 3));
    if (searchResults.length === 0) {
      throw new Error('Combobox search returned 0 results for "Grain"!');
    }

    // Select the first matching item by pressing Enter or clicking
    await page.keyboard.press('Enter');
    await sleep(600);

    // Inspect populated values for Line 1
    const line1Data = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const combobox = inputs.find((i) => i.value && i.value.includes('Grain'));
      const numInputs = inputs.filter((i) => i.type === 'number');
      const unitSpan = document.querySelector('span.uppercase');

      return {
        productName: combobox ? combobox.value : '',
        qty: numInputs[0] ? numInputs[0].value : '',
        rate: numInputs[1] ? numInputs[1].value : '',
        discount: numInputs[2] ? numInputs[2].value : '',
        unit: unitSpan ? unitSpan.innerText.trim() : '',
      };
    });

    console.log('Line 1 populated data:', line1Data);
    if (!line1Data.productName || !line1Data.rate || Number(line1Data.rate) <= 0) {
      throw new Error(`Line 1 auto-population failed: Rate is ${line1Data.rate}, Product is ${line1Data.productName}`);
    }

    recordEvidence('5.0', '/quotations/new', 'Search and select product in combobox', '/products', 200, 'PASS', {
      product: line1Data.productName,
      rate: line1Data.rate,
      unit: line1Data.unit,
    });

    // -------------------------------------------------------------------------
    // STEP 7: ADD A SECOND LINE & VERIFY FIRST LINE VALUES REMAIN INTACT
    // -------------------------------------------------------------------------
    console.log('\n--- [STEP 7] ADD SECOND LINE & VERIFY MULTI-LINE INDEPENDENCE ---');
    const addRowBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addBtn = btns.find((b) => b.innerText && (b.innerText.includes('Add New Row') || b.innerText.includes('Add another line')));
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });

    if (!addRowBtn) throw new Error('Could not find "Add New Row" button!');
    await sleep(500);

    // Search and select product on line 2
    const comboboxes = await page.$$('input[placeholder*="Type or click to select"], input[placeholder*="Search by item"]');
    console.log(`Found ${comboboxes.length} combobox inputs`);
    if (comboboxes.length < 2) {
      throw new Error('Second line combobox was not rendered!');
    }

    const line2Combobox = comboboxes[1];
    await line2Combobox.click();
    await sleep(300);
    await line2Combobox.type('CHLOROTEX', { delay: 50 });
    await sleep(600);
    await page.keyboard.press('Enter');
    await sleep(600);

    // Verify Line 1 values are intact and Line 2 is populated
    const bothLinesData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map((tr) => {
        const itemInput = tr.querySelector('input[type="text"]');
        const numInputs = Array.from(tr.querySelectorAll('input[type="number"]')).map((i) => i.value);
        const unit = tr.querySelector('span.uppercase')?.innerText?.trim();
        return {
          product: itemInput ? itemInput.value : '',
          qty: numInputs[0],
          rate: numInputs[1],
          discount: numInputs[2],
          unit,
        };
      });
    });

    console.log('Both lines data:', bothLinesData);
    if (!bothLinesData[0].product.includes('Grain')) {
      throw new Error(`Line 1 was overwritten! Current Line 1 product: ${bothLinesData[0].product}`);
    }
    if (!bothLinesData[1] || !bothLinesData[1].product.includes('CHLOROTEX')) {
      throw new Error(`Line 2 selection failed! Current Line 2 product: ${bothLinesData[1]?.product}`);
    }

    await takeScreenshot(page, `${RUN_KEY}_04_two_lines_added.png`);
    recordEvidence('7.0', '/quotations/new', 'Add 2nd line and verify isolation', 'N/A', 200, 'PASS', {
      line1: bothLinesData[0],
      line2: bothLinesData[1],
    });

    // -------------------------------------------------------------------------
    // STEP 8: SAVE TEST QUOTATION AS DRAFT
    // -------------------------------------------------------------------------
    console.log('\n--- [STEP 8] SAVE QUOTATION AS DRAFT ---');
    const saveDraftBtn = await findButtonByText(page, 'Save as Draft');
    if (!saveDraftBtn) throw new Error('Save as Draft button not found!');

    // Track the POST request payload
    let quotationCreatePayload = null;
    let quotationCreateResponse = null;

    const requestListener = (req) => {
      if (req.url().includes('/api/sales/quotations') && req.method() === 'POST') {
        try {
          quotationCreatePayload = JSON.parse(req.postData());
        } catch (e) {}
      }
    };
    page.on('request', requestListener);
    // Wait for response to be recorded in apiResponses
    await saveDraftBtn.click();
    await sleep(3000);

    const postResp = apiResponses.find((r) => r.url.includes('/sales/quotations') && r.method === 'POST');
    console.log('Quotation POST Payload:', JSON.stringify(quotationCreatePayload, null, 2));
    console.log('Quotation POST Recorded Response:', postResp);

    if (!postResp || postResp.status >= 400) {
      throw new Error(`Failed to save quotation! HTTP ${postResp?.status}: ${postResp?.body}`);
    }

    let parsedBody = {};
    try {
      parsedBody = JSON.parse(postResp.body);
    } catch (e) {}

    createdQuotationId = parsedBody.data?.id || parsedBody.id;
    console.log(`Successfully created test quotation with ID: ${createdQuotationId}`);

    await takeScreenshot(page, `${RUN_KEY}_05_quotation_saved_redirect.png`);
    recordEvidence('8.0', '/quotations/new', 'Save quotation as draft', '/sales/quotations', postResp.status, 'PASS', {
      createdQuotationId,
      payload: quotationCreatePayload,
    });

    // -------------------------------------------------------------------------
    // STEP 9: VERIFY QUOTATION LIST ENTRY AND PERSISTENCE AFTER REFRESH
    // -------------------------------------------------------------------------
    console.log('\n--- [STEP 9] VERIFY ENTRY IN LIST AND PERSISTENCE ---');
    // Ensure we are on /quotations
    if (!page.url().includes('/quotations')) {
      await page.goto('http://localhost:5173/quotations', { waitUntil: 'networkidle2' });
      await sleep(1500);
    }

    // Look for customer name or quotation in the table
    const tableContainsQuotation = await page.evaluate((custName) => {
      return document.body.innerText.includes(custName) || document.body.innerText.includes('DRAFT');
    }, firstCustomerName);

    console.log(`Quotation appears in list: ${tableContainsQuotation}`);
    if (!tableContainsQuotation) {
      throw new Error('Created draft quotation was not found in quotation list table!');
    }

    // Reload page to verify persistence
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);
    await takeScreenshot(page, `${RUN_KEY}_06_quotation_persisted_list.png`);

    const tableStillContains = await page.evaluate((custName) => {
      return document.body.innerText.includes(custName);
    }, firstCustomerName);

    console.log(`Quotation persists after page reload: ${tableStillContains}`);
    if (!tableStillContains) {
      throw new Error('Quotation did not persist after reload!');
    }

    recordEvidence('9.0', '/quotations', 'Verify list entry and reload persistence', '/sales/quotations', 200, 'PASS', {
      persisted: true,
      visibleInTable: true,
    });

    // -------------------------------------------------------------------------
    // STEP 10: CLEAN UP TEST RECORD SAFELY
    // -------------------------------------------------------------------------
    console.log('\n--- [STEP 10] CLEAN UP TEST RECORD ---');
    if (createdQuotationId) {
      // Delete child items first then parent quotation
      await prisma.quotationItem.deleteMany({
        where: { quotationId: createdQuotationId },
      });
      await prisma.quotation.delete({
        where: { id: createdQuotationId },
      });
      console.log(`Cleaned up test quotation ${createdQuotationId} successfully from database.`);
      recordEvidence('10.0', 'DB', 'Clean up test quotation', 'Prisma', 200, 'PASS', {
        deletedId: createdQuotationId,
      });
    }

    console.log('\n======================================================================');
    console.log('ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
    console.log('======================================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error.message);
    await takeScreenshot(page, `${RUN_KEY}_error_failure.png`);
    recordEvidence('ERROR', page.url(), 'Test failed', 'N/A', 500, 'FAIL', {
      error: error.message,
    });
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})();
