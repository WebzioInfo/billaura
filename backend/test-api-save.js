const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function main() {
  // 1. Fetch user and company from DB
  const company = await prisma.company.findFirst();
  const user = await prisma.user.findFirst();
  const bp = await prisma.businessPartner.findFirst({ where: { companyId: company.id } });

  console.log("Using User:", user.email);
  console.log("Using CompanyId:", company.id);
  console.log("Using CustomerId:", bp.id);

  // 2. Generate a JWT Token
  const secret = "053739a262bb48d6553e41ff7cbf1eba89e5b21647971e27316c4ddce50269e6"; // JWT_SECRET from .env
  const payload = {
    email: user.email,
    sub: user.id,
    companyId: company.id,
    tenantId: company.id,
    role: "ADMIN",
    globalRole: "ADMIN"
  };

  const token = jwt.sign(payload, secret);
  console.log("Generated Token:", token.slice(0, 30) + "...");

  // 3. Make POST request to receipts API
  // Mimic the payload sent by frontend
  const data = {
    date: new Date().toISOString().split('T')[0],
    businessPartnerId: bp.id,
    paymentMethod: "BANK_TRANSFER",
    amount: 150.50,
    referenceNo: undefined,
    chequeNo: undefined,
    transactionId: undefined,
    clearanceDate: undefined,
    bankCharges: undefined,
    cashier: undefined,
    notes: "Manual API test receipt"
  };

  console.log("Sending payload:", JSON.stringify(data, null, 2));

  try {
    const res = await fetch('http://localhost:4000/api/receipts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-company-id': company.id,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log("Response Status:", res.status);
    const body = await res.json();
    console.log("Response Body:", JSON.stringify(body, null, 2));
  } catch (error) {
    console.error("API Call Failed:", error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
