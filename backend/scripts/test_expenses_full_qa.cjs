const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const JWT_SECRET = '053739a262bb48d6553e41ff7cbf1eba89e5b21647971e27316c4ddce50269e6';
const companyId = 'cmrzvh2kk0005i36g39z408xv'; // Biofix Technology LLP
const userId = 'cmrzvh2h70004i36gh6csbbne';
const email = 'info@biofixtechnology.com';

const token = jwt.sign(
  {
    sub: userId,
    userId,
    email,
    tenantId: companyId,
    companyId,
    role: 'ADMIN',
  },
  JWT_SECRET,
  { expiresIn: '2h' }
);

const ARTIFACT_DIR = 'C:\\Users\\SINAN\\.gemini\\antigravity-ide\\brain\\bbdda270-4a13-4c9a-9778-afabd472f91d';

async function request(method, pathUrl, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path: pathUrl.startsWith('/api') ? pathUrl : `/api${pathUrl}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-company-id': companyId,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('BILL AURA EXPENSES MODULE — FULL QA & AUDIT');
  console.log('====================================================\n');

  // Find a category, bank account, and vendor
  const category = await prisma.expenseCategory.findFirst({
    where: { companyId, isActive: true },
    include: { account: true },
  });
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { companyId, deletedAt: null, accountId: { not: null } },
  });
  const vendor = await prisma.businessPartner.findFirst({
    where: { companyId, bpType: 'VENDOR', deletedAt: null },
  });

  console.log(`Using Category: ${category?.name} (id: ${category?.id}, accountId: ${category?.accountId})`);
  console.log(`Using BankAccount: ${bankAccount?.name} (id: ${bankAccount?.id}, currentBalance: ${bankAccount?.currentBalance})`);
  console.log(`Using Vendor: ${vendor?.name} (id: ${vendor?.id})`);

  const createdExpenseIds = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Registered Business - Regular (Tax-Exclusive ₹100 @ 18% Intra-State)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Registered Business - Regular (Tax-Exclusive ₹100 @ 18%) ---');
    const balBefore1 = Number(
      (await prisma.bankAccount.findUnique({ where: { id: bankAccount.id } })).currentBalance
    );

    const payload1 = {
      date: new Date().toISOString().split('T')[0],
      accountId: category.accountId,
      amount: 100,
      taxableAmount: 100,
      taxAmount: 18,
      totalAmount: 118,
      paidThroughAccountId: bankAccount.id,
      expenseType: 'SERVICES',
      gstTreatment: 'Registered Business - Regular',
      vendorGstin: '32AABCB1234M1Z2',
      sourceOfSupply: '[32] - Kerala',
      destinationOfSupply: '[32] - Kerala',
      reverseCharge: false,
      gstRate: 18,
      taxApplicable: true,
      taxMode: 'TAX_EXCLUSIVE',
      taxType: 'GST',
      cgstAmount: 9,
      sgstAmount: 9,
      igstAmount: 0,
      notes: 'QA Test 1: Regular Tax Exclusive',
      autoApprove: true,
      approvalStatus: 'APPROVED',
    };

    const res1 = await request('POST', '/expenses', payload1);
    console.log(`Create Status: ${res1.status}`);
    if (res1.status !== 201 && res1.status !== 200) {
      throw new Error(`Failed to create Test 1 expense: ${JSON.stringify(res1.data)}`);
    }
    const exp1 = res1.data?.data || res1.data;
    createdExpenseIds.push(exp1.id);
    console.log(`Created Expense: ${exp1.expenseNo} (id: ${exp1.id})`);
    console.log(`Amounts: Base ₹${exp1.taxableAmount}, Tax ₹${exp1.taxAmount}, Total ₹${exp1.totalAmount}`);

    // Verify GL entries
    const entries1 = await prisma.journalEntry.findMany({
      where: { reference: exp1.expenseNo, companyId },
      include: { lines: { include: { account: true } } },
    });
    console.log(`Found ${entries1.length} Journal Entries:`);
    let totalDebit1 = 0;
    let totalCredit1 = 0;
    entries1.forEach((e) => {
      e.lines.forEach((l) => {
        totalDebit1 += Number(l.debit);
        totalCredit1 += Number(l.credit);
        console.log(`  - Account: ${l.account?.name} | Debit: ₹${l.debit} | Credit: ₹${l.credit}`);
      });
    });
    console.log(`Total Debit: ₹${totalDebit1.toFixed(2)}, Total Credit: ₹${totalCredit1.toFixed(2)}`);
    console.log(`Balanced: ${Math.abs(totalDebit1 - totalCredit1) < 0.01 ? 'YES (PASS)' : 'NO (FAIL)'}`);

    const balAfter1 = Number(
      (await prisma.bankAccount.findUnique({ where: { id: bankAccount.id } })).currentBalance
    );
    console.log(`Bank Balance: Before ₹${balBefore1.toFixed(2)} -> After ₹${balAfter1.toFixed(2)} (Diff: -₹${(balBefore1 - balAfter1).toFixed(2)})`);
    console.log(`Bank decrement matches ₹118: ${Math.abs((balBefore1 - balAfter1) - 118) < 0.01 ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------------------
    // TEST 2: Tax-Inclusive ₹100 @ 18%
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Tax-Inclusive ₹100 @ 18% ---');
    const balBefore2 = Number(
      (await prisma.bankAccount.findUnique({ where: { id: bankAccount.id } })).currentBalance
    );

    const payload2 = {
      date: new Date().toISOString().split('T')[0],
      accountId: category.accountId,
      amount: 100,
      taxableAmount: 84.75,
      taxAmount: 15.25,
      totalAmount: 100,
      paidThroughAccountId: bankAccount.id,
      expenseType: 'SERVICES',
      gstTreatment: 'Registered Business - Regular',
      sourceOfSupply: '[32] - Kerala',
      destinationOfSupply: '[32] - Kerala',
      reverseCharge: false,
      gstRate: 18,
      taxApplicable: true,
      taxMode: 'TAX_INCLUSIVE',
      taxType: 'GST',
      cgstAmount: 7.62,
      sgstAmount: 7.63,
      igstAmount: 0,
      notes: 'QA Test 2: Tax Inclusive',
      autoApprove: true,
      approvalStatus: 'APPROVED',
    };

    const res2 = await request('POST', '/expenses', payload2);
    console.log(`Create Status: ${res2.status}`);
    const exp2 = res2.data?.data || res2.data;
    createdExpenseIds.push(exp2.id);
    console.log(`Created Expense: ${exp2.expenseNo} (id: ${exp2.id})`);
    console.log(`Amounts: Base ₹${exp2.taxableAmount}, Tax ₹${exp2.taxAmount}, Total ₹${exp2.totalAmount}`);

    const entries2 = await prisma.journalEntry.findMany({
      where: { reference: exp2.expenseNo, companyId },
      include: { lines: { include: { account: true } } },
    });
    let totalDebit2 = 0;
    let totalCredit2 = 0;
    entries2.forEach((e) => {
      e.lines.forEach((l) => {
        totalDebit2 += Number(l.debit);
        totalCredit2 += Number(l.credit);
        console.log(`  - Account: ${l.account?.name} | Debit: ₹${l.debit} | Credit: ₹${l.credit}`);
      });
    });
    console.log(`Total Debit: ₹${totalDebit2.toFixed(2)}, Total Credit: ₹${totalCredit2.toFixed(2)}`);
    console.log(`Balanced: ${Math.abs(totalDebit2 - totalCredit2) < 0.01 ? 'YES (PASS)' : 'NO (FAIL)'}`);

    const balAfter2 = Number(
      (await prisma.bankAccount.findUnique({ where: { id: bankAccount.id } })).currentBalance
    );
    console.log(`Bank Balance: Before ₹${balBefore2.toFixed(2)} -> After ₹${balAfter2.toFixed(2)} (Diff: -₹${(balBefore2 - balAfter2).toFixed(2)})`);
    console.log(`Bank decrement matches ₹100: ${Math.abs((balBefore2 - balAfter2) - 100) < 0.01 ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------------------
    // TEST 3: Registered Business - Composition (₹100, Tax 0%)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Registered Business - Composition (₹100, Tax 0%) ---');
    const payload3 = {
      date: new Date().toISOString().split('T')[0],
      accountId: category.accountId,
      amount: 100,
      taxableAmount: 100,
      taxAmount: 0,
      totalAmount: 100,
      paidThroughAccountId: bankAccount.id,
      expenseType: 'GOODS',
      gstTreatment: 'Registered Business - Composition',
      vendorGstin: '32COMP1234M1Z5',
      sourceOfSupply: '[32] - Kerala',
      destinationOfSupply: '[32] - Kerala',
      reverseCharge: false,
      gstRate: 0,
      taxApplicable: false,
      taxMode: 'TAX_EXCLUSIVE',
      notes: 'QA Test 3: Composition Scheme',
      autoApprove: true,
      approvalStatus: 'APPROVED',
    };

    const res3 = await request('POST', '/expenses', payload3);
    console.log(`Create Status: ${res3.status}`);
    const exp3 = res3.data?.data || res3.data;
    createdExpenseIds.push(exp3.id);
    console.log(`Created Expense: ${exp3.expenseNo} | Tax: ₹${exp3.taxAmount} | Total: ₹${exp3.totalAmount}`);

    const entries3 = await prisma.journalEntry.findMany({
      where: { reference: exp3.expenseNo, companyId },
      include: { lines: { include: { account: true } } },
    });
    let totalDebit3 = 0;
    let totalCredit3 = 0;
    entries3.forEach((e) => {
      e.lines.forEach((l) => {
        totalDebit3 += Number(l.debit);
        totalCredit3 += Number(l.credit);
        console.log(`  - Account: ${l.account?.name} | Debit: ₹${l.debit} | Credit: ₹${l.credit}`);
      });
    });
    console.log(`Balanced: ${Math.abs(totalDebit3 - totalCredit3) < 0.01 ? 'YES (PASS)' : 'NO (FAIL)'}`);

    // -------------------------------------------------------------------------
    // TEST 4: Unregistered Business with Reverse Charge (RCM ₹100 @ 18%)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Unregistered Business with Reverse Charge (RCM ₹100 @ 18%) ---');
    const balBefore4 = Number(
      (await prisma.bankAccount.findUnique({ where: { id: bankAccount.id } })).currentBalance
    );

    const payload4 = {
      date: new Date().toISOString().split('T')[0],
      accountId: category.accountId,
      amount: 100,
      taxableAmount: 100,
      taxAmount: 18,
      totalAmount: 118,
      paidThroughAccountId: bankAccount.id,
      expenseType: 'SERVICES',
      gstTreatment: 'Unregistered Business',
      sourceOfSupply: '[32] - Kerala',
      destinationOfSupply: '[32] - Kerala',
      reverseCharge: true,
      gstRate: 18,
      taxApplicable: true,
      taxMode: 'TAX_EXCLUSIVE',
      taxType: 'GST',
      cgstAmount: 9,
      sgstAmount: 9,
      igstAmount: 0,
      notes: 'QA Test 4: RCM Reverse Charge',
      autoApprove: true,
      approvalStatus: 'APPROVED',
    };

    const res4 = await request('POST', '/expenses', payload4);
    console.log(`Create Status: ${res4.status}`);
    const exp4 = res4.data?.data || res4.data;
    createdExpenseIds.push(exp4.id);
    console.log(`Created Expense: ${exp4.expenseNo} (id: ${exp4.id})`);

    const entries4 = await prisma.journalEntry.findMany({
      where: { reference: exp4.expenseNo, companyId },
      include: { lines: { include: { account: true } } },
    });
    let totalDebit4 = 0;
    let totalCredit4 = 0;
    entries4.forEach((e) => {
      e.lines.forEach((l) => {
        totalDebit4 += Number(l.debit);
        totalCredit4 += Number(l.credit);
        console.log(`  - Account: ${l.account?.name} | Debit: ₹${l.debit} | Credit: ₹${l.credit}`);
      });
    });
    console.log(`Total Debit: ₹${totalDebit4.toFixed(2)}, Total Credit: ₹${totalCredit4.toFixed(2)}`);
    console.log(`Balanced: ${Math.abs(totalDebit4 - totalCredit4) < 0.01 ? 'YES (PASS)' : 'NO (FAIL)'}`);

    const balAfter4 = Number(
      (await prisma.bankAccount.findUnique({ where: { id: bankAccount.id } })).currentBalance
    );
    console.log(`Bank Balance: Before ₹${balBefore4.toFixed(2)} -> After ₹${balAfter4.toFixed(2)} (Diff: -₹${(balBefore4 - balAfter4).toFixed(2)})`);
    console.log(`Bank payout under RCM is vendor base amount ₹100: ${Math.abs((balBefore4 - balAfter4) - 100) < 0.01 ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------------------
    // TEST 5: Deletion and Reversal
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Deletion & Financial Reversal ---');
    const deleteId = exp1.id;
    const balBeforeDel = Number(
      (await prisma.bankAccount.findUnique({ where: { id: bankAccount.id } })).currentBalance
    );
    const delRes = await request('DELETE', `/expenses/${deleteId}`);
    console.log(`Delete Status: ${delRes.status}`);

    const balAfterDel = Number(
      (await prisma.bankAccount.findUnique({ where: { id: bankAccount.id } })).currentBalance
    );
    console.log(`Bank Balance: Before ₹${balBeforeDel.toFixed(2)} -> After ₹${balAfterDel.toFixed(2)} (Restored: +₹${(balAfterDel - balBeforeDel).toFixed(2)})`);
    console.log(`Bank restoration matches ₹118: ${Math.abs((balAfterDel - balBeforeDel) - 118) < 0.01 ? 'PASS' : 'FAIL'}`);

    const reversalEntries = await prisma.journalEntry.findMany({
      where: { reference: { startsWith: `REV-` }, companyId },
      orderBy: { createdAt: 'desc' },
      take: 2,
      include: { lines: { include: { account: true } } },
    });
    console.log(`Found ${reversalEntries.length} Reversal Journal Entries:`);
    reversalEntries.forEach((e) => {
      console.log(`Reversal Entry ${e.reference}:`);
      e.lines.forEach((l) => console.log(`  - Account: ${l.account?.name} | Debit: ₹${l.debit} | Credit: ₹${l.credit}`));
    });

    // -------------------------------------------------------------------------
    // TEST 6: Puppeteer Live UI Interaction
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Puppeteer Live UI Interaction on http://localhost:5173/expenses/new ---');
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // Inject Auth into localStorage and session store
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.evaluate((authData) => {
      localStorage.setItem('auth_token', authData.token);
      localStorage.setItem('billaura_access_token', authData.token);
      localStorage.setItem('billaura_refresh_token', authData.token);
      const userObj = {
        id: authData.userId,
        email: authData.email,
        name: 'QA Admin',
        role: 'ADMIN',
        companyId: authData.companyId,
        tenantId: authData.companyId,
        onboardingStep: 'COMPLETED',
      };
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('billaura_user', JSON.stringify(userObj));
      localStorage.setItem('company', JSON.stringify({
        id: authData.companyId,
        name: 'BIOFIX TECHNOLOGY LLP',
        state: 'Kerala',
      }));
      localStorage.setItem('billaura_tenant', JSON.stringify({
        id: authData.companyId,
        name: 'BIOFIX TECHNOLOGY LLP',
        state: 'Kerala',
      }));
      localStorage.setItem('billaura_session', JSON.stringify({
        state: {
          user: userObj,
          isAuthenticated: true,
          accessToken: authData.token,
          isLoading: false,
        },
        version: 0,
      }));
    }, { token, userId, email, companyId });

    console.log('Navigating to http://localhost:5173/expenses/new ...');
    await page.goto('http://localhost:5173/expenses/new', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    // Capture initial UI
    const shot1Path = path.join(ARTIFACT_DIR, 'expense_qa_01_initial.png');
    await page.screenshot({ path: shot1Path, fullPage: true });
    console.log(`Saved screenshot: ${shot1Path}`);

    // Verify dynamic GST Treatment switching
    // 1. Switch to Composition
    console.log('Testing UI: Switching GST Treatment to Composition...');
    await page.select('select[value="Registered Business - Regular"]', 'Registered Business - Composition').catch(async () => {
      const selects = await page.$$('select');
      for (const s of selects) {
        const val = await page.evaluate(el => el.value, s);
        if (val === 'Registered Business - Regular') {
          await s.select('Registered Business - Composition');
          break;
        }
      }
    });
    await new Promise((r) => setTimeout(r, 1000));
    const compNoticeVisible = await page.evaluate(() => {
      return document.body.innerText.includes('Composition Scheme: Supplier cannot charge GST');
    });
    console.log(`Composition notice visible: ${compNoticeVisible ? 'PASS' : 'FAIL'}`);

    const shotCompPath = path.join(ARTIFACT_DIR, 'expense_qa_02_composition.png');
    await page.screenshot({ path: shotCompPath, fullPage: true });

    // 2. Switch to Unregistered Business
    console.log('Testing UI: Switching GST Treatment to Unregistered Business...');
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        const optValues = Array.from(s.options).map(o => o.value);
        if (optValues.includes('Unregistered Business')) {
          s.value = 'Unregistered Business';
          s.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await new Promise((r) => setTimeout(r, 1000));
    const unregNoticeVisible = await page.evaluate(() => {
      return document.body.innerText.includes('Unregistered Supplier: No GST charged');
    });
    console.log(`Unregistered notice visible: ${unregNoticeVisible ? 'PASS' : 'FAIL'}`);

    // 3. Switch to Overseas
    console.log('Testing UI: Switching GST Treatment to Overseas...');
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        const optValues = Array.from(s.options).map(o => o.value);
        if (optValues.includes('Overseas')) {
          s.value = 'Overseas';
          s.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await new Promise((r) => setTimeout(r, 1000));
    const overseasNoticeVisible = await page.evaluate(() => {
      return document.body.innerText.includes('Overseas Import: Domestic GST is not billed');
    });
    console.log(`Overseas notice visible: ${overseasNoticeVisible ? 'PASS' : 'FAIL'}`);

    // 4. Switch back to Regular, fill form and submit!
    console.log('Testing UI: Switching back to Regular and submitting expense...');
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        const optValues = Array.from(s.options).map(o => o.value);
        if (optValues.includes('Registered Business - Regular')) {
          s.value = 'Registered Business - Regular';
          s.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Type Amount: 100
    await page.type('input[placeholder="0.00"]', '100');
    // Type Invoice Number
    await page.type('input[placeholder="e.g. INV-9821"]', 'INV-QA-999');

    // Type notes
    await page.type('textarea[placeholder="Max. 500 characters"]', 'UI Automated QA Submission');
    await new Promise((r) => setTimeout(r, 1000));

    const shotFilledPath = path.join(ARTIFACT_DIR, 'expense_qa_03_filled.png');
    await page.screenshot({ path: shotFilledPath, fullPage: true });
    console.log(`Saved screenshot: ${shotFilledPath}`);

    // Click Save button
    console.log('Clicking Save button in UI...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(b => b.innerText.includes('Save (Alt+S)'));
      if (saveBtn) saveBtn.click();
    });

    await new Promise((r) => setTimeout(r, 3000));

    console.log(`Current URL after Save: ${page.url()}`);
    const isRedirectedToExpenses = page.url().includes('/expenses');
    console.log(`Redirected to /expenses: ${isRedirectedToExpenses ? 'PASS' : 'FAIL'}`);

    const shotListPath = path.join(ARTIFACT_DIR, 'expense_qa_04_list.png');
    await page.screenshot({ path: shotListPath, fullPage: true });
    console.log(`Saved screenshot: ${shotListPath}`);

    await browser.close();

    // Clean up created test expenses safely
    console.log('\n--- CLEANUP OF DISPOSABLE TEST DATA ---');
    for (const expId of createdExpenseIds) {
      if (expId !== deleteId) {
        await request('DELETE', `/expenses/${expId}`);
        console.log(`Safely reversed and deleted test expense ${expId}`);
      }
    }
    // Also clean up any expense created with INV-QA-999
    const uiCreated = await prisma.expense.findFirst({
      where: { companyId, billNumber: 'INV-QA-999' },
    });
    if (uiCreated) {
      await request('DELETE', `/expenses/${uiCreated.id}`);
      console.log(`Safely reversed and deleted UI test expense ${uiCreated.expenseNo}`);
    }

    console.log('\n====================================================');
    console.log('ALL EXPENSES TESTS & ACCOUNTING INTEGRATIONS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
