import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runE2eTests() {
  console.log("=== STARTING E2E VERIFICATION FOR BIOFIX TECHNOLOGY LLP ===");

  const companyId = "cmrzvh2kk0005i36g39z408xv";
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { settings: true }
  });

  if (!company) {
    console.error(`Company ${companyId} not found in database!`);
    process.exit(1);
  }

  console.log("Company found:", company.companyName);

  const companyUser = await prisma.companyUser.findFirst({
    where: { companyId },
    include: { user: true }
  });

  if (!companyUser) {
    console.error("No user found for company");
    process.exit(1);
  }

  console.log("Found User:", companyUser.user.email);

  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || "053739a262bb48d6553e41ff7cbf1eba89e5b21647971e27316c4ddce50269e6";
  const token = jwt.sign(
    {
      sub: companyUser.userId,
      userId: companyUser.userId,
      email: companyUser.user.email,
      companyId: companyId,
      tenantId: companyId,
      role: companyUser.role
    },
    secret,
    { expiresIn: '1h' }
  );

  const baseUrl = "http://localhost:4000/api";

  // Test 1: GET /api/auth/me
  console.log("\n--- Test 1: GET /api/auth/me ---");
  const meRes = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meJson = await meRes.json();
  console.log("GET /me status:", meRes.status);
  console.log("Company logo in GET /me:", meJson.data?.company?.logo);

  // Test 2: Valid multipart image upload (1x1 valid PNG)
  console.log("\n--- Test 2: Valid multipart image upload (1x1 PNG) ---");
  const validPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const validFile = new File([validPngBuffer], 'test_logo.png', { type: 'image/png' });

  const formData1 = new FormData();
  formData1.append('logo', validFile);
  formData1.append('companyName', 'BIOFIX TECHNOLOGY LLP');

  const uploadRes1 = await fetch(`${baseUrl}/auth/company`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: formData1,
  });
  const uploadJson1 = await uploadRes1.json();
  console.log("PATCH /company status:", uploadRes1.status);
  console.log("Response data logo:", uploadJson1.data?.logo);
  console.log("Response settings logoBase64:", uploadJson1.data?.settings?.logoBase64);

  // Test 3: Verify GET /me returns Cloudinary logo URL
  console.log("\n--- Test 3: Verify GET /me returns updated Cloudinary logo URL ---");
  const meRes2 = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meJson2 = await meRes2.json();
  console.log("Updated Company logo in GET /me:", meJson2.data?.company?.logo);

  // Test 4: Oversized file test (>5MB)
  console.log("\n--- Test 4: Oversized file (>5MB) should return 413 Payload Too Large ---");
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
  pngHeader.copy(oversizedBuffer);
  const oversizedFile = new File([oversizedBuffer], 'huge_logo.png', { type: 'image/png' });

  const formData2 = new FormData();
  formData2.append('logo', oversizedFile);

  const uploadRes2 = await fetch(`${baseUrl}/auth/company`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: formData2,
  });
  const uploadJson2 = await uploadRes2.json();
  console.log("Oversized Upload HTTP Status:", uploadRes2.status);
  console.log("Oversized Upload Response:", JSON.stringify(uploadJson2, null, 2));

  // Test 5: Invalid file type test
  console.log("\n--- Test 5: Invalid file signature (.exe / text) ---");
  const textFile = new File(["NOT AN IMAGE"], 'script.sh', { type: 'text/plain' });
  const formData3 = new FormData();
  formData3.append('logo', textFile);

  const uploadRes3 = await fetch(`${baseUrl}/auth/company`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: formData3,
  });
  const uploadJson3 = await uploadRes3.json();
  console.log("Invalid file HTTP Status:", uploadRes3.status);
  console.log("Invalid file Response:", JSON.stringify(uploadJson3, null, 2));

  // Test 6: Cross-tenant upload attempt
  console.log("\n--- Test 6: Cross-tenant payload protection ---");
  const fakeTenantToken = jwt.sign(
    {
      sub: "fake_user_id",
      userId: "fake_user_id",
      email: "attacker@othercompany.com",
      companyId: "other_company_id_123",
      tenantId: "other_company_id_123",
      role: "ADMIN"
    },
    secret,
    { expiresIn: '1h' }
  );

  const formData4 = new FormData();
  formData4.append('logo', validFile);
  formData4.append('companyId', companyId);

  const uploadRes4 = await fetch(`${baseUrl}/auth/company`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${fakeTenantToken}` },
    body: formData4,
  });
  const uploadJson4 = await uploadRes4.json();
  console.log("Cross-tenant attempt HTTP Status:", uploadRes4.status);
  console.log("Cross-tenant response:", uploadJson4);

  const afterCompany = await prisma.company.findUnique({ where: { id: companyId } });
  console.log("BIOFIX logo after cross-tenant attack check:", afterCompany?.logo);

  await prisma.$disconnect();
  console.log("\n=== E2E VERIFICATION COMPLETED ===");
}

runE2eTests().catch((err) => {
  console.error("E2E Test Failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
