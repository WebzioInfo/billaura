import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.quotation.count();
  console.log('Total quotations in database (all tenants):', count);

  const quotations = await prisma.quotation.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      businessPartner: true,
      company: { select: { id: true, companyName: true } }
    }
  });

  console.log('Sample quotations:', JSON.stringify(quotations, null, 2));

  // Also check if any invoices are of type QUOTATION or ESTIMATE or PROFORMA
  const quoteInvoices = await prisma.invoice.count({
    where: { invoiceType: { in: ['QUOTATION', 'ESTIMATE', 'PROFORMA_INVOICE'] } }
  });
  console.log('Total invoices with invoiceType QUOTATION/ESTIMATE/PROFORMA:', quoteInvoices);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
