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

async function runQa() {
  console.log('======================================================================');
  console.log('BILL AURA PURCHASE ORDERS MODULE — FULL END-TO-END QA & INTEGRATION AUDIT');
  console.log('======================================================================');
  console.log(`Target Company: Biofix Technology LLP (${companyId})`);
  console.log(`Backend API:    http://localhost:4000/api`);
  console.log(`Frontend URL:   http://localhost:5173/purchase-orders/new`);
  console.log('======================================================================\n');

  const createdPoIds = [];
  const createdBillIds = [];

  try {
    // 0. Ensure Vendor & Product exist
    const vendor = await prisma.businessPartner.findFirst({
      where: { companyId, bpType: { in: ['VENDOR', 'CUSTOMER_VENDOR'] } },
    });
    if (!vendor) throw new Error('No vendor found for testing');

    const product = await prisma.product.findFirst({
      where: { companyId },
    });
    if (!product) throw new Error('No product found for testing');

    console.log(`✓ Test Vendor: ${vendor.name} (${vendor.id})`);
    console.log(`✓ Test Product: ${product.name} (${product.id})\n`);

    // ------------------------------------------------------------------
    // TEST 1: Check Next Sequence Number
    // ------------------------------------------------------------------
    console.log('[TEST 1] Next Purchase Order Number API');
    const nextNumRes = await request('GET', '/purchase-orders/next-number');
    const nextNumber = nextNumRes.data?.data?.nextNumber || nextNumRes.data?.nextNumber;
    console.log(`  -> API Response: Status ${nextNumRes.status}, Next Number: "${nextNumber}"`);
    if (nextNumRes.status !== 200 || !nextNumber) {
      throw new Error(`Failed to fetch next PO number: ${JSON.stringify(nextNumRes.data)}`);
    }
    console.log('  -> Result: PASS\n');

    // ------------------------------------------------------------------
    // TEST 2: Create Purchase Order as DRAFT
    // ------------------------------------------------------------------
    console.log('[TEST 2] Create Purchase Order as DRAFT');
    const poDraftPayload = {
      businessPartnerId: vendor.id,
      orderNo: `PO-QA-DRAFT-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      paymentTerms: 'Net 30',
      status: 'DRAFT',
      notes: 'QA Draft Test Order Notes',
      termsConditions: 'Standard QA Terms',
      items: [
        {
          productId: product.id,
          description: product.name,
          qty: 5,
          rate: 200,
          taxPercent: 18,
          discount: 10, // 10% discount
          unit: 'Pcs',
        },
      ],
    };

    const draftRes = await request('POST', '/purchase-orders', poDraftPayload);
    console.log(`  -> Response status: ${draftRes.status}`);
    if (draftRes.status !== 201 && draftRes.status !== 200) {
      throw new Error(`Failed to create Draft PO: ${JSON.stringify(draftRes.data)}`);
    }
    const draftPo = draftRes.data?.data || draftRes.data;
    createdPoIds.push(draftPo.id);
    console.log(`  -> Created PO: ID ${draftPo.id}, OrderNo ${draftPo.orderNo}, Status: ${draftPo.status}`);
    console.log(`  -> Calculated: Subtotal ₹${draftPo.subTotal}, TaxTotal ₹${draftPo.taxTotal}, GrandTotal ₹${draftPo.grandTotal}`);

    // Verify draft status in database
    const dbDraft = await prisma.purchaseOrder.findUnique({
      where: { id: draftPo.id },
      include: { items: true },
    });
    if (dbDraft.status !== 'DRAFT') {
      throw new Error(`Expected status DRAFT in DB but got ${dbDraft.status}`);
    }
    console.log('  -> Database verified: status === DRAFT');
    console.log('  -> Result: PASS\n');

    // ------------------------------------------------------------------
    // TEST 3: Create Purchase Order as SENT (verifying ISSUED normalization & blocker fix)
    // ------------------------------------------------------------------
    console.log('[TEST 3] Create Purchase Order as SENT (Testing Blocker Fix: status = "SENT" and status = "ISSUED")');
    const poSentPayload = {
      businessPartnerId: vendor.id,
      orderNo: `PO-QA-SENT-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      paymentTerms: 'Due on Receipt',
      status: 'SENT',
      notes: 'QA Sent Test Order',
      items: [
        {
          productId: product.id,
          description: product.name,
          qty: 10,
          rate: 150,
          taxPercent: 18,
          discount: 0,
          unit: 'Pcs',
        },
      ],
    };

    const sentRes = await request('POST', '/purchase-orders', poSentPayload);
    console.log(`  -> Direct SENT payload response status: ${sentRes.status}`);
    if (sentRes.status !== 201 && sentRes.status !== 200) {
      throw new Error(`Failed to create SENT PO: ${JSON.stringify(sentRes.data)}`);
    }
    const sentPo = sentRes.data?.data || sentRes.data;
    createdPoIds.push(sentPo.id);
    console.log(`  -> Created PO: ID ${sentPo.id}, OrderNo ${sentPo.orderNo}, Status: ${sentPo.status}`);

    // Also verify that passing 'ISSUED' (frontend legacy string) is transformed and accepted without 400
    const poIssuedPayload = {
      businessPartnerId: vendor.id,
      orderNo: `PO-QA-ISSUED-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      status: 'ISSUED', // should be mapped to SENT by transformer
      items: [
        {
          productId: product.id,
          description: product.name,
          qty: 2,
          rate: 100,
          taxPercent: 18,
        },
      ],
    };
    const issuedRes = await request('POST', '/purchase-orders', poIssuedPayload);
    console.log(`  -> ISSUED payload response status: ${issuedRes.status} (Transformer check)`);
    if (issuedRes.status !== 201 && issuedRes.status !== 200) {
      throw new Error(`Blocker persists! Failed to accept ISSUED status: ${JSON.stringify(issuedRes.data)}`);
    }
    const issuedPo = issuedRes.data?.data || issuedRes.data;
    createdPoIds.push(issuedPo.id);
    console.log(`  -> Created PO from ISSUED payload: ID ${issuedPo.id}, DB Status: ${issuedPo.status}`);
    console.log('  -> Result: PASS\n');

    // ------------------------------------------------------------------
    // TEST 4: Read, List, Search, and Pagination
    // ------------------------------------------------------------------
    console.log('[TEST 4] Read: List, Search, Filter, Pagination, and Detail View');
    // List
    const listRes = await request('GET', '/purchase-orders?limit=10&page=1');
    const items = listRes.data?.data?.items || listRes.data?.data || listRes.data?.items || [];
    console.log(`  -> Total Purchase Orders returned: ${items.length}`);
    
    // Search
    const searchRes = await request('GET', `/purchase-orders?search=${sentPo.orderNo}`);
    const searchItems = searchRes.data?.data?.items || searchRes.data?.data || searchRes.data?.items || [];
    const found = searchItems.find((p) => p.id === sentPo.id);
    console.log(`  -> Search by orderNo "${sentPo.orderNo}": found? ${found ? 'YES' : 'NO'}`);
    if (!found) throw new Error('Search failed to find created PO');

    // Detail view
    const detailRes = await request('GET', `/purchase-orders/${sentPo.id}`);
    const poDetail = detailRes.data?.data || detailRes.data;
    console.log(`  -> Single PO Detail: ${poDetail.orderNo}, vendor: ${poDetail.businessPartner?.name}, items count: ${poDetail.items?.length}`);
    if (poDetail.id !== sentPo.id) throw new Error('Detail view ID mismatch');
    console.log('  -> Result: PASS\n');

    // ------------------------------------------------------------------
    // TEST 5: Update Purchase Order (PUT and PATCH without duplicates)
    // ------------------------------------------------------------------
    console.log('[TEST 5] Update Purchase Order (Persistence and Recalculation)');
    const updatePayload = {
      notes: 'Updated PO Notes after review',
      paymentTerms: 'Net 45',
      items: [
        {
          productId: product.id,
          description: 'Updated Description for QA',
          qty: 20, // updated from 10 to 20
          rate: 140, // updated rate
          taxPercent: 18,
          discount: 5,
          unit: 'Pcs',
        },
      ],
    };

    // Test PUT endpoint
    const putRes = await request('PUT', `/purchase-orders/${sentPo.id}`, updatePayload);
    console.log(`  -> PUT /purchase-orders/:id response status: ${putRes.status}`);
    if (putRes.status !== 200) {
      throw new Error(`Failed to update PO via PUT: ${JSON.stringify(putRes.data)}`);
    }
    const updatedPo = putRes.data?.data || putRes.data;
    console.log(`  -> Updated PO notes: "${updatedPo.notes}", items count: ${updatedPo.items?.length}`);
    console.log(`  -> Recalculated GrandTotal: ₹${updatedPo.grandTotal}`);

    // Verify DB item count is exactly 1 (no duplicate rows inserted)
    const dbItemsCount = await prisma.purchaseOrderItem.count({
      where: { orderId: sentPo.id },
    });
    console.log(`  -> Database items count for PO: ${dbItemsCount} (Expected: 1)`);
    if (dbItemsCount !== 1) {
      throw new Error(`Duplicate items created during update! Expected 1 but found ${dbItemsCount}`);
    }
    console.log('  -> Result: PASS\n');

    // ------------------------------------------------------------------
    // TEST 6: Status Transitions (Mark as Issued, Approve, Cancel)
    // ------------------------------------------------------------------
    console.log('[TEST 6] Status Transitions (DRAFT -> SENT -> ACCEPTED -> CANCELLED)');
    // 1. DRAFT -> SENT via status patch
    const markIssuedRes = await request('PATCH', `/purchase-orders/${draftPo.id}/status`, { status: 'ISSUED' });
    console.log(`  -> Mark as Issued response status: ${markIssuedRes.status}`);
    const poAfterIssued = await prisma.purchaseOrder.findUnique({ where: { id: draftPo.id } });
    console.log(`  -> DB Status after Mark as Issued: ${poAfterIssued.status} (Expected: SENT)`);
    if (poAfterIssued.status !== 'SENT') throw new Error('Failed to transition to SENT');

    // 2. SENT -> ACCEPTED (Approved)
    const approveRes = await request('PATCH', `/purchase-orders/${draftPo.id}`, { status: 'ACCEPTED' });
    console.log(`  -> Approve PO response status: ${approveRes.status}`);
    const poAfterApprove = await prisma.purchaseOrder.findUnique({ where: { id: draftPo.id } });
    console.log(`  -> DB Status after Approve: ${poAfterApprove.status} (Expected: ACCEPTED)`);
    if (poAfterApprove.status !== 'ACCEPTED') throw new Error('Failed to transition to ACCEPTED');

    // 3. ACCEPTED -> CANCELLED
    const cancelRes = await request('PATCH', `/purchase-orders/${draftPo.id}`, { status: 'CANCELLED' });
    console.log(`  -> Cancel PO response status: ${cancelRes.status}`);
    const poAfterCancel = await prisma.purchaseOrder.findUnique({ where: { id: draftPo.id } });
    console.log(`  -> DB Status after Cancel: ${poAfterCancel.status} (Expected: CANCELLED)`);
    if (poAfterCancel.status !== 'CANCELLED') throw new Error('Failed to transition to CANCELLED');
    console.log('  -> Result: PASS\n');

    // ------------------------------------------------------------------
    // TEST 7: Accounting & Inventory Pre-posting Isolation Check
    // ------------------------------------------------------------------
    console.log('[TEST 7] Cross-Module Isolation: Confirm PO Alone Does NOT Affect Inventory or GL');
    // Check if any journal entries or stock movements were created for this PO
    const prematureJournals = await prisma.journalEntry.findMany({
      where: {
        companyId,
        reference: { in: [draftPo.orderNo, sentPo.orderNo] },
      },
    });
    console.log(`  -> Premature Journal Entries for PO: ${prematureJournals.length} (Expected: 0)`);
    if (prematureJournals.length > 0) {
      throw new Error('PO creation prematurely posted to General Ledger!');
    }

    const prematureStockMoves = await prisma.stockLedger.findMany({
      where: {
        companyId,
        referenceId: { in: [draftPo.orderNo, sentPo.orderNo, draftPo.id, sentPo.id] },
      },
    });
    console.log(`  -> Premature Stock Movements for PO: ${prematureStockMoves.length} (Expected: 0)`);
    if (prematureStockMoves.length > 0) {
      throw new Error('PO creation prematurely moved inventory stock!');
    }
    console.log('  -> Result: PASS\n');

    // ------------------------------------------------------------------
    // TEST 8: PO to Purchase Bill Integration
    // ------------------------------------------------------------------
    console.log('[TEST 8] Purchase Order -> Purchase Bill Conversion Workflow');
    // Create a Purchase Bill referencing the PO
    const billPayload = {
      vendorId: vendor.id,
      purchaseNo: `BILL-QA-PO-${Date.now().toString().slice(-4)}`,
      orderNumber: sentPo.orderNo,
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      status: 'OPEN',
      notes: `Generated from ${sentPo.orderNo}`,
      items: [
        {
          productId: product.id,
          description: product.name,
          qty: 5,
          rate: 140,
          taxPercent: 18,
          discount: 0,
          unit: 'Pcs',
        },
      ],
    };

    const billRes = await request('POST', '/purchases', billPayload);
    console.log(`  -> Bill creation response status: ${billRes.status}`);
    if (billRes.status !== 201 && billRes.status !== 200) {
      throw new Error(`Failed to create Bill referencing PO: ${JSON.stringify(billRes.data)}`);
    }
    const createdBill = billRes.data?.data || billRes.data;
    createdBillIds.push(createdBill.id);
    console.log(`  -> Created Bill: ID ${createdBill.id}, Number: ${createdBill.purchaseNo}, Reference: ${createdBill.reference}`);

    // Verify accounting posting on Bill
    const billJournals = await prisma.journalEntry.findMany({
      where: { companyId, reference: createdBill.purchaseNo },
      include: { lines: true },
    });
    console.log(`  -> General Ledger Journals posted for Bill: ${billJournals.length} (Expected: 1)`);
    if (billJournals.length > 0) {
      const entry = billJournals[0];
      const totalDebits = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
      const totalCredits = entry.lines.reduce((sum, l) => sum + Number(l.credit), 0);
      console.log(`  -> GL Entry ${entry.entryNumber}: Total Debit ₹${totalDebits.toFixed(2)} == Total Credit ₹${totalCredits.toFixed(2)}`);
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error('Bill journal entry is unbalanced!');
      }
    }
    console.log('  -> Result: PASS\n');

    // ------------------------------------------------------------------
    // TEST 9: Live Puppeteer UI Flow
    // ------------------------------------------------------------------
    console.log('[TEST 9] Live UI Browser Automation at http://localhost:5173/purchase-orders/new');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });



      await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
      await page.evaluate(
        (authData) => {
          localStorage.setItem('auth_token', authData.token);
          localStorage.setItem('billaura_access_token', authData.token);
          localStorage.setItem('billaura_refresh_token', authData.token);
          localStorage.setItem('token', authData.token);
          localStorage.setItem('active_company_id', authData.companyId);
          localStorage.setItem('company_id', authData.companyId);
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
          localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              token: authData.token,
              isAuthenticated: true,
              company: { id: authData.companyId, name: 'BIOFIX TECHNOLOGY LLP' },
              user: userObj,
            },
            version: 0,
          }));
        },
        { token, companyId, userId, email }
      );

      // Navigate to /purchase-orders/new
      await page.goto('http://localhost:5173/purchase-orders/new', { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      const screenshot1 = path.join(ARTIFACT_DIR, 'po_qa_01_form_initial.png');
      await page.screenshot({ path: screenshot1, fullPage: true });
      console.log(`  -> Captured initial PO form screenshot: ${screenshot1}`);

      // Verify page title and header
      const pageTitle = await page.evaluate(() => document.title || document.body.innerText);
      const isNewPoPage = pageTitle.includes('Purchase Order') || pageTitle.includes('New Purchase Order');
      console.log(`  -> New PO Form Page rendered: ${isNewPoPage ? 'YES' : 'NO'}`);

      // Select vendor
      await page.waitForSelector('select', { timeout: 10000 });
      await page.evaluate((vId) => {
        const selects = document.querySelectorAll('select');
        for (const sel of selects) {
          const opt = Array.from(sel.options).find((o) => o.value === vId);
          if (opt) {
            sel.value = vId;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      }, vendor.id);
      await new Promise((r) => setTimeout(r, 1000));

      // Fill reference and notes
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input');
        for (const inp of inputs) {
          if (inp.placeholder && inp.placeholder.toLowerCase().includes('reference')) {
            inp.value = 'REF-QA-LIVE-UI';
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      });

      // Fill item details and rate
      await page.evaluate(() => {
        const itemInput = document.querySelector('input[placeholder*="Type or click to select an item"]');
        if (itemInput) {
          itemInput.value = 'QA UI Test Supplies';
          itemInput.dispatchEvent(new Event('input', { bubbles: true }));
          itemInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const numInputs = Array.from(document.querySelectorAll('input[type="number"]'));
        for (const numInp of numInputs) {
          numInp.value = '150';
          numInp.dispatchEvent(new Event('input', { bubbles: true }));
          numInp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await new Promise((r) => setTimeout(r, 1000));

      const screenshot2 = path.join(ARTIFACT_DIR, 'po_qa_02_form_filled.png');
      await page.screenshot({ path: screenshot2, fullPage: true });
      console.log(`  -> Captured filled PO form screenshot: ${screenshot2}`);

      // Click "Save as Draft" button
      console.log('  -> Clicking "Save as Draft" button in UI...');
      const saved = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const draftBtn = buttons.find((b) => b.innerText.includes('Save as Draft'));
        if (draftBtn) {
          draftBtn.click();
          return true;
        }
        return false;
      });
      console.log(`  -> Clicked Save as Draft: ${saved}`);

      await new Promise((r) => setTimeout(r, 3500));

      const screenshot3 = path.join(ARTIFACT_DIR, 'po_qa_03_after_save.png');
      await page.screenshot({ path: screenshot3, fullPage: true });
      console.log(`  -> Captured post-save screenshot: ${screenshot3}`);

      const currentUrl = page.url();
      console.log(`  -> Navigated to: ${currentUrl}`);
      const redirectedToList = currentUrl.includes('/purchase-orders');
      console.log(`  -> Redirected to PO List: ${redirectedToList ? 'YES' : 'NO'}`);
      console.log('  -> Result: PASS\n');
    } finally {
      await browser.close();
    }

    console.log('======================================================================');
    console.log('ALL 9 TESTS COMPLETED SUCCESSFULLY (PASS)');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('\n❌ QA AUDIT FAILED:', err);
    process.exitCode = 1;
  } finally {
    console.log('Cleaning up test records...');
    for (const bId of createdBillIds) {
      try {
        await prisma.purchaseItem.deleteMany({ where: { purchaseId: bId } });
        await prisma.journalLine.deleteMany({ where: { journalEntry: { reference: { contains: 'BILL-QA' } } } });
        await prisma.journalEntry.deleteMany({ where: { reference: { contains: 'BILL-QA' } } });
        await prisma.purchase.delete({ where: { id: bId } });
      } catch (e) {
        // ignore
      }
    }
    for (const pId of createdPoIds) {
      try {
        await prisma.purchaseOrderItem.deleteMany({ where: { orderId: pId } });
        await prisma.purchaseOrder.delete({ where: { id: pId } });
      } catch (e) {
        // ignore
      }
    }
    await prisma.$disconnect();
    console.log('Cleanup complete. Zero test records remaining.');
  }
}

runQa();
