const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { ReceiptsService } = require('./dist/sales/receipts.service');
const { CompanyContext } = require('./dist/common/context/company-context');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const receiptsService = app.get(ReceiptsService);
  const prisma = app.get(PrismaClient || 'PrismaService'); // or query prisma directly

  const company = await prisma.company.findFirst();
  const user = await prisma.user.findFirst();
  const bp = await prisma.businessPartner.findFirst({ where: { companyId: company.id } });

  console.log("Found Company:", company.id);
  console.log("Found User:", user.id);
  console.log("Found Customer:", bp.id);

  const dto = {
    date: new Date().toISOString().split('T')[0],
    businessPartnerId: bp.id,
    paymentMethod: "BANK_TRANSFER",
    amount: 150.50,
    notes: "NestJS diagnostic receipt"
  };

  try {
    await CompanyContext.run(company.id, user.id, async () => {
      const res = await receiptsService.create(dto, user.id);
      console.log("Successfully created receipt:", res.id);
    });
  } catch (error) {
    console.error("NestJS receiptsService.create failed!");
    console.error(error);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
