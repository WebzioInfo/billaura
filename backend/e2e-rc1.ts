import assert from 'assert';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let token = '';
const baseUrl = 'http://localhost:4000/api';

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  
  let data: any;
  try {
    data = await res.json();
  } catch (e) {
    data = await res.text();
  }
  
  return { status: res.status, data };
}

function getId(resData: any) {
    return resData?.id || resData?.data?.id || resData?.item?.id;
}

async function runTests() {
  try {
    console.log('=== STARTING BILL AURA V1.0 RC1 E2E ACCEPTANCE TESTS ===');
    
    const email = `rc1admin_${Date.now()}@billaura.com`;
    console.log(`\n[SETUP] Registering new tenant admin: ${email}`);
    
    let res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstName: 'QA', lastName: 'Admin', email, password: 'Password123!' })
    });
    assert(res.status === 201, `Register failed: ${JSON.stringify(res.data)}`);
    
    // Automatically extract OTP and verify
    const dbUser = await prisma.user.findUnique({ where: { email } });
    const otp = dbUser?.otpCode;
    
    res = await api('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
    console.log(`[SETUP] OTP Verification:`, res.status);

    res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'Password123!' })
    });
    console.log('Login Response:', res.status, res.data);
    token = res.data?.access_token || res.data?.data?.access_token;
    assert(token, 'Failed to retrieve access token');
    
    console.log('[SETUP] Completing Onboarding...');
    await api('/auth/onboard/business', { method: 'POST', body: JSON.stringify({ companyName: 'QA Global Ltd', businessType: 'IT Services' }) });
    await api('/auth/onboard/tax', { method: 'POST', body: JSON.stringify({ taxNumber: 'GSTIN-QA-99' }) });
    await api('/auth/onboard/branch', { method: 'POST', body: JSON.stringify({ currency: 'USD', fiscalYearStart: '2024-01-01T00:00:00Z', fiscalYearEnd: '2024-12-31T00:00:00Z', branchName: 'Main HQ' }) });
    await api('/auth/onboard/subscription', { method: 'POST', body: JSON.stringify({ planName: 'ENTERPRISE' }) });
    
    // ---------------------------------------------------------
    console.log('\n--- PHASE 1: ACCOUNTING CORE (SALES WORKFLOW) ---');
    
    res = await api('/bank-accounts', {
      method: 'POST',
      body: JSON.stringify({ name: 'HDFC Corp', bankName: 'HDFC', accountNumber: '1234567890', ifsc: 'HDFC0001', openingBalance: 100000 })
    });
    assert(res.status === 201, `Bank Account creation failed: ${JSON.stringify(res.data)}`);
    const bankAccountId = getId(res.data);
    
    res = await api('/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Enterprise SaaS License', sku: `LIC-${Date.now()}`, sellingPrice: 5000, purchasePrice: 0, itemType: 'SERVICE', taxRate: 18 })
    });
    assert(res.status === 201, `Product creation failed: ${JSON.stringify(res.data)}`);
    const productId = getId(res.data);
    
    res = await api('/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme Corp', customerCode: 'CUST-001', email: 'billing@acme.com', customerType: 'UNREGISTERED' })
    });
    assert(res.status === 201, `Customer creation failed: ${JSON.stringify(res.data)}`);
    const customerId = getId(res.data);
    
    res = await api('/sales/invoices', {
      method: 'POST',
      body: JSON.stringify({
        customerId, date: new Date().toISOString(),
        items: [{ productId, qty: 2, rate: 5000 }] // Total 10000 + 18% tax = 11800
      })
    });
    assert(res.status === 201, `Invoice creation failed: ${JSON.stringify(res.data)}`);
    const invoiceId = getId(res.data);
    const invoiceNo = res.data?.invoiceNo || res.data?.data?.invoiceNo;
    const invoiceTotal = res.data?.grandTotal || res.data?.data?.grandTotal;
    console.log(`✅ Sales Invoice Created: ${invoiceNo} (Total: ${invoiceTotal})`);
    
    res = await api('/sales/payments', {
      method: 'POST',
      body: JSON.stringify({ customerId, bankAccountId, date: new Date().toISOString(), amount: invoiceTotal, method: 'BANK_TRANSFER' })
    });
    assert(res.status === 201, `Payment failed: ${JSON.stringify(res.data)}`);
    console.log(`✅ Sales Payment Received: ${invoiceTotal}`);

    // ---------------------------------------------------------
    console.log('\n--- PHASE 2: PURCHASES WORKFLOW ---');
    
    res = await api('/vendors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tech Supplier Inc', vendorCode: 'VEND-001' })
    });
    assert(res.status === 201 || res.status === 200, `Vendor creation failed: ${JSON.stringify(res.data)}`);
    const vendorId = getId(res.data);
    
    res = await api('/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Server Hardware', sku: `HW-${Date.now()}`, sellingPrice: 0, purchasePrice: 2000, itemType: 'FINISHED_GOOD', taxRate: 18 })
    });
    const hwProductId = getId(res.data);

    res = await api('/purchases', {
      method: 'POST',
      body: JSON.stringify({
        vendorId, date: new Date().toISOString(),
        items: [{ productId: hwProductId, qty: 5, rate: 2000 }] // Total 10000 + 18% tax = 11800
      })
    });
    assert(res.status === 201 || res.status === 200, `Purchase creation failed: ${JSON.stringify(res.data)}`);
    const purchaseTotal = res.data?.grandTotal || res.data?.data?.grandTotal;
    const purchaseId = getId(res.data);
    console.log(`✅ Purchase Bill Logged (Total: ${purchaseTotal})`);
    
    res = await api('/purchases/payments', {
      method: 'POST',
      body: JSON.stringify({ vendorId, bankAccountId, purchaseId, amount: purchaseTotal, date: new Date().toISOString(), method: 'BANK_TRANSFER' })
    });
    assert(res.status === 201 || res.status === 200, `Vendor payment failed: ${JSON.stringify(res.data)}`);
    console.log(`✅ Vendor Payout Processed`);

    // ---------------------------------------------------------
    console.log('\n--- PHASE 5: EXPENSES ---');
    res = await api('/expenses/categories');
    assert(res.status === 200, `Expense categories fetch failed: ${JSON.stringify(res.data)}`);
    const categories = res.data?.data || res.data;
    const categoryId = getId(categories[0]) || categories[0]?.id;

    res = await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({ categoryId, bankAccountId, date: new Date().toISOString(), amount: 1500, reference: 'EXP-123', description: 'Office Supplies', paymentMethod: 'CASH' })
    });
    assert(res.status === 201 || res.status === 200, `Expense logging failed: ${JSON.stringify(res.data)}`);
    console.log(`✅ Expense Logged (Amount: 1500)`);

    // ---------------------------------------------------------
    console.log('\n--- PHASE 7: HR & PAYROLL ---');
    res = await api('/departments', { method: 'POST', body: JSON.stringify({ name: 'Sales' }) });
    const deptId = getId(res.data);
    res = await api('/designations', { method: 'POST', body: JSON.stringify({ name: 'Sales Executive' }) });
    const desigId = getId(res.data);
    
    res = await api('/employees', {
      method: 'POST',
      body: JSON.stringify({ employeeCode: `EMP-001`, name: 'Jane Smith', basicSalary: 4000, departmentId: deptId, designationId: desigId })
    });
    assert(res.status === 201 || res.status === 200, `Employee creation failed: ${JSON.stringify(res.data)}`);
    console.log(`✅ HR: Employee registered`);

    // ---------------------------------------------------------
    console.log('\n--- PHASE 8: REPORTS & RECONCILIATION ---');
    res = await api('/accounts/profit-loss');
    assert(res.status === 200, `P&L Fetch Failed`);
    const netProfit = res.data?.netProfit || res.data?.data?.netProfit;
    console.log(`✅ Profit & Loss Calculated. Net Profit: ${netProfit}`);
    
    res = await api('/accounts/trial-balance');
    assert(res.status === 200, `Trial Balance Fetch Failed`);
    console.log(`✅ Trial Balance Extracted.`);

    console.log('\n=== ALL AUTOMATED TESTS PASSED ===');

  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED!');
    console.error(error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
