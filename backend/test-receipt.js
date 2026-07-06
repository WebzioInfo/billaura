const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock CompanyContext implementation to avoid loading NestJS modules
class CompanyContextMock {
  static companyId = null;
  static userId = null;
  static getCompanyId() { return this.companyId; }
  static getUserId() { return this.userId; }
}

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log("No company found");
    return;
  }
  const user = await prisma.user.findFirst();
  const customer = await prisma.businessPartner.findFirst({
    where: { companyId: company.id }
  });

  if (!customer) {
    console.log("No customer found for company", company.id);
    return;
  }

  console.log("Found Company:", company.id, company.name);
  console.log("Found User:", user?.id, user?.email);
  console.log("Found Customer:", customer.id, customer.name);

  // Now, simulate the receipts service create transaction
  const companyId = company.id;
  const userId = user.id;

  const paymentMethod = 'BANK_TRANSFER';
  const amount = 100.00;

  // 1. Resolve Account
  const isCash = paymentMethod === 'CASH';
  const ledgerName = isCash ? 'Cash' : 'Bank Accounts';
  let resolvedAccount = await prisma.account.findFirst({
    where: { companyId, name: ledgerName },
  });
  if (!resolvedAccount) {
    console.log("Creating default account:", ledgerName);
    resolvedAccount = await prisma.account.create({
      data: { companyId, name: ledgerName, category: 'ASSET', subCategory: 'CURRENT_ASSET', balance: 0 },
    });
  }
  const targetAccountId = resolvedAccount.id;
  console.log("Resolved Account ID:", targetAccountId, resolvedAccount.name);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate receipt number
      let sequence = await tx.documentSequence.findFirst({
        where: { companyId, documentType: 'RECEIPT' },
      });

      if (!sequence) {
        sequence = await tx.documentSequence.create({
          data: {
            companyId,
            documentType: 'RECEIPT',
            currentNumber: 0,
          },
        });
      }

      const nextNumber = sequence.currentNumber + 1;
      await tx.documentSequence.update({
        where: { id: sequence.id },
        data: { currentNumber: nextNumber },
      });

      const receiptNo = `REC-${String(nextNumber).padStart(5, '0')}`;
      console.log("Generated Receipt No:", receiptNo);

      // 2. Create Receipt record
      const receipt = await tx.receipt.create({
        data: {
          companyId,
          receiptNo,
          date: new Date(),
          businessPartnerId: customer.id,
          accountId: targetAccountId,
          paymentMethod,
          amount,
          referenceNo: null,
          chequeNo: null,
          transactionId: null,
          clearanceDate: null,
          bankCharges: 0,
          cashier: null,
          notes: "Test manual script receipt",
          currency: 'INR',
          exchangeRate: 1.0,
          receivedById: userId,
          status: 'COMPLETED',
        },
      });

      console.log("Created Receipt ID:", receipt.id);

      // FIFO Auto allocation
      const invoices = await tx.invoice.findMany({
        where: {
          companyId,
          businessPartnerId: customer.id,
          NOT: { status: 'PAID' },
        },
        orderBy: { date: 'asc' },
      });

      let remainingAmount = amount;
      for (const inv of invoices) {
        if (remainingAmount <= 0) break;

        const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
        const allocate = Math.min(remainingAmount, unpaid);

        if (allocate > 0) {
          const newPaid = Number(inv.amountPaid) + allocate;
          const status = newPaid >= Number(inv.grandTotal) ? 'PAID' : 'PARTIAL';

          await tx.invoice.update({
            where: { id: inv.id },
            data: { amountPaid: newPaid, status },
          });

          await tx.receiptAllocation.create({
            data: {
              receiptId: receipt.id,
              invoiceId: inv.id,
              amount: allocate,
            },
          });

          remainingAmount -= allocate;
        }
      }

      // 4. Update Customer Receivable balance
      await tx.businessPartner.update({
        where: { id: customer.id },
        data: {
          receivableBalance: {
            decrement: amount,
          },
        },
      });

      // 5. Update Cash/Bank Account balance
      await tx.account.update({
        where: { id: targetAccountId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // 6. Write Customer Statement
      await tx.customerStatement.create({
        data: {
          companyId,
          businessPartnerId: customer.id,
          date: new Date(),
          type: 'PAYMENT',
          reference: receiptNo,
          debit: 0,
          credit: amount,
          balance: Number(customer.receivableBalance) - amount,
        },
      });

      // 7. Write Double Entry Journal Post
      let arAccount = await tx.account.findFirst({
        where: { companyId, name: 'Accounts Receivable' },
      });
      if (!arAccount) {
        arAccount = await tx.account.create({
          data: { companyId, name: 'Accounts Receivable', category: 'ASSET', balance: 0 },
        });
      }

      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(),
          reference: receiptNo,
          description: `Automatic receipt posting ${receiptNo}`,
          lines: {
            create: [
              { accountId: targetAccountId, debit: amount, credit: 0 },
              { accountId: arAccount.id, debit: 0, credit: amount },
            ],
          },
        },
      });

      // Credit accounts receivable balance
      await tx.account.update({
        where: { id: arAccount.id },
        data: { balance: { decrement: amount } },
      });

      // Create Audit Log
      await tx.receiptAudit.create({
        data: {
          receiptId: receipt.id,
          userId,
          action: 'CREATE',
          details: {},
        },
      });

      console.log("Prisma transaction completed successfully!");
      return receipt;
    });
  } catch (error) {
    console.error("Prisma transaction failed with error:", error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
