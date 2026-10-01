import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function testPdfEndpoint() {
  const API_URL = 'http://localhost:4000/api';
  console.log('--- Testing PDF Generation Endpoint ---');

  try {
    const companyId = 'cmrzvh2kk0005i36g39z408xv'; // BIOFIX TECHNOLOGY LLP
    const companyUser = await prisma.companyUser.findFirst({
      where: { companyId },
      include: { user: true },
    });

    if (!companyUser) {
      console.error('No user found for company');
      process.exit(1);
    }

    const secret = process.env.JWT_SECRET || '053739a262bb48d6553e41ff7cbf1eba89e5b21647971e27316c4ddce50269e6';
    const token = jwt.sign(
      {
        sub: companyUser.userId,
        userId: companyUser.userId,
        email: companyUser.user.email,
        companyId: companyId,
        tenantId: companyId,
        role: companyUser.role,
      },
      secret,
      { expiresIn: '1h' },
    );

    console.log(`Generated JWT token for user: ${companyUser.user.email}`);

    // Request PDF export
    console.log('Requesting PDF export for invoice B2BF/68/26-27...');
    const pdfRes = await fetch(`${API_URL}/documents/standard/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        company: {
          name: 'BIOFIX TECHNOLOGY LLP',
        },
        customer: {
          name: 'TEST CUSTOMER PVT LTD',
          gstin: '27AAAAA0000A1Z5',
          address: 'Mumbai, Maharashtra',
        },
        document: {
          title: 'TAX INVOICE',
          documentNo: 'B2BF/68/26-27',
          date: '2026-09-30',
          dueDate: '2026-10-30',
          type: 'INVOICE',
        },
        items: [
          {
            description: 'Consulting Services',
            hsn: '998311',
            qty: 1,
            rate: 10000,
            taxPercent: 18,
            taxAmount: 1800,
            total: 11800,
          },
        ],
        totals: {
          currency: '₹',
          subTotal: 10000,
          cgstAmount: 900,
          sgstAmount: 900,
          taxTotal: 1800,
          grandTotal: 11800,
        },
      }),
    });

    const contentType = pdfRes.headers.get('content-type');
    console.log(`Received response HTTP Status: ${pdfRes.status}`);
    console.log(`Received response headers: Content-Type = ${contentType}`);

    const arrayBuf = await pdfRes.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuf);
    console.log(`Received PDF buffer size: ${pdfBuffer.length} bytes`);

    // Verify PDF header magic bytes "%PDF-"
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    console.log(`PDF Magic Bytes: "${pdfHeader}"`);

    if (pdfHeader === '%PDF-') {
      console.log('SUCCESS: Valid PDF document generated and returned by NestJS server!');
    } else {
      console.error('ERROR: Returned payload is NOT a valid PDF!');
      console.error('Body preview:', pdfBuffer.slice(0, 500).toString('utf-8'));
      process.exit(1);
    }
  } catch (err: any) {
    console.error('PDF Endpoint test failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPdfEndpoint();
