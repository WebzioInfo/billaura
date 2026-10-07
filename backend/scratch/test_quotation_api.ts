import { PrismaClient } from '@prisma/client';

async function main() {
  const jwt = await import('jsonwebtoken');
  const token = jwt.sign(
    {
      sub: 'cmu2id5c20002i30s33f81v2d',
      userId: 'cmu2id5c20002i30s33f81v2d',
      companyId: 'cmrzvh2kk0005i36g39z408xv',
      email: 'admin@biofix.com',
      role: 'ADMIN',
      globalRole: 'ADMIN',
    },
    process.env.JWT_SECRET || 'billaura_super_secret_jwt_key_2026',
    { expiresIn: '1h' }
  );

  console.log('Testing GET /api/sales/quotations?limit=200...');
  const res1 = await fetch('http://localhost:3000/api/sales/quotations?limit=200', {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-company-id': 'cmrzvh2kk0005i36g39z408xv',
    },
  });
  console.log('Status with limit=200:', res1.status);
  const json1 = await res1.json();
  console.log('Response with limit=200:', JSON.stringify(json1, null, 2));

  console.log('\nTesting GET /api/sales/quotations?status=DRAFT...');
  const res2 = await fetch('http://localhost:3000/api/sales/quotations?status=DRAFT', {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-company-id': 'cmrzvh2kk0005i36g39z408xv',
    },
  });
  console.log('Status with status=DRAFT:', res2.status);
  const json2 = await res2.json();
  console.log('Response with status=DRAFT:', JSON.stringify(json2, null, 2));
}

main().catch(console.error);
