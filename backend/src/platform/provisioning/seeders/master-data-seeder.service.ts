import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ChartOfAccountsSeederService } from './chart-of-accounts-seeder.service';

@Injectable()
export class MasterDataSeederService {
  constructor(private readonly coaSeeder: ChartOfAccountsSeederService) {}

  async seedMasterData(tx: Prisma.TransactionClient, companyId: string) {
    // 1. Chart of Accounts
    await this.coaSeeder.seedCOA(tx, companyId);

    // 2. Inventory Masters (Units, Categories, GST Rates)
    await this.seedInventory(tx, companyId);

    // 3. Banking Masters (Covered partially by COA, but can add Cash/Bank Accounts)
    await this.seedBanking(tx, companyId);

    // 4. HR Masters (Departments, Designations)
    await this.seedHR(tx, companyId);

    // 5. CRM Masters (Customer Groups, Vendor Groups)
    await this.seedCRM(tx, companyId);

    // 6. Settings (Sequences, etc.)
    await this.seedSettings(tx, companyId);
  }

  private async seedInventory(tx: Prisma.TransactionClient, companyId: string) {
    const units = ['PCS', 'BOX', 'KG', 'MTR', 'LITRE'];
    for (const u of units) {
      await tx.unit.upsert({
        where: { companyId_code: { companyId, code: u } },
        update: {},
        create: { code: u, name: u, companyId }
      });
    }
  }

  private async seedBanking(tx: Prisma.TransactionClient, companyId: string) {
    const cashAccount = await tx.account.findUnique({ where: { companyId_name: { companyId, name: 'Cash' } } });
    if (cashAccount) {
      await tx.cashAccount.create({
        data: {
          companyId,
          name: 'Main Cash',
          accountId: cashAccount.id,
          isDefault: true
        }
      });
    }
  }

  private async seedHR(tx: Prisma.TransactionClient, companyId: string) {
    const defaultCostCenter = await tx.costCenter.upsert({
      where: { companyId_name: { companyId, name: 'Main Cost Center' } },
      update: {},
      create: { companyId, name: 'Main Cost Center', code: 'CC-MAIN' }
    });

    const dept = await tx.department.upsert({
      where: { companyId_name: { companyId, name: 'General' } },
      update: {},
      create: { companyId, name: 'General', code: 'DEPT-GEN', costCenterId: defaultCostCenter.id }
    });

    await tx.designation.upsert({
      where: { companyId_name: { companyId, name: 'Staff' } },
      update: {},
      create: { companyId, name: 'Staff', code: 'DESIG-STAFF', departmentId: dept.id }
    });
  }

  private async seedCRM(tx: Prisma.TransactionClient, companyId: string) {
    await tx.customerSegment.upsert({
      where: { companyId_name: { companyId, name: 'General Customers' } },
      update: {},
      create: { companyId, name: 'General Customers', isDefault: true }
    });
  }

  private async seedSettings(tx: Prisma.TransactionClient, companyId: string) {
    // Generate Document Sequences
    const docTypes = ['INVOICE', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'QUOTATION', 'DELIVERY_NOTE', 'SALES_ORDER', 'PURCHASE_ORDER'];
    for (const doc of docTypes) {
      await tx.documentSequence.upsert({
        where: { companyId_documentType: { companyId, documentType: doc } },
        update: {},
        create: {
          companyId,
          documentType: doc,
          currentNumber: 0,
          prefix: doc.substring(0, 3) + '-',
          padding: 6
        }
      });
    }
    
    // Default Settings
    await tx.companySettings.upsert({
      where: { companyId },
      update: {},
      create: {
        companyId,
        invoicePrefix: 'INV-',
        quotationPrefix: 'QTN-',
        creditNotePrefix: 'CN-',
        purchasePrefix: 'PO-',
        paymentPrefix: 'PAY-'
      }
    });
  }
}
