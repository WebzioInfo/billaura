const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { id: 'cmrzvh2kk0005i36g39z408xv' }
  });
  console.log('Company:', company ? company.name : 'Not found');

  const accounts = await prisma.account.findMany({
    where: { companyId: 'cmrzvh2kk0005i36g39z408xv' },
    select: { id: true, name: true, code: true, category: true, balance: true }
  });
  console.log(`Found ${accounts.length} accounts:`);
  accounts.forEach(a => {
    if (a.name.toLowerCase().includes('tax') || a.name.toLowerCase().includes('gst') || a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('cash') || a.category === 'EXPENSE') {
      console.log(`- [${a.category}] ${a.name} (${a.code || 'no code'}) id: ${a.id}`);
    }
  });

  const categories = await prisma.expenseCategory.findMany({
    where: { companyId: 'cmrzvh2kk0005i36g39z408xv' },
    include: { account: true }
  });
  console.log(`\nFound ${categories.length} expense categories:`);
  categories.forEach(c => console.log(`- ${c.name} (id: ${c.id}) -> Account: ${c.account?.name} (${c.accountId})`));

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { companyId: 'cmrzvh2kk0005i36g39z408xv' }
  });
  console.log(`\nFound ${bankAccounts.length} bank accounts:`);
  bankAccounts.forEach(b => console.log(`- ${b.name} (${b.accountNumber}) bal: ${b.currentBalance} accountId: ${b.accountId}`));

  const cashAccounts = await prisma.cashAccount.findMany({
    where: { companyId: 'cmrzvh2kk0005i36g39z408xv' }
  });
  console.log(`\nFound ${cashAccounts.length} cash accounts:`);
  cashAccounts.forEach(c => console.log(`- ${c.name} bal: ${c.currentBalance} accountId: ${c.accountId}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
