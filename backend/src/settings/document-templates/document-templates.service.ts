import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export const SUPPORTED_DOC_TYPES = [
  { key: 'invoice', label: 'Invoices', title: 'TAX INVOICE' },
  { key: 'quote', label: 'Quotes', title: 'QUOTATION' },
  { key: 'sales_order', label: 'Sales Orders', title: 'SALES ORDER' },
  { key: 'credit_note', label: 'Credit Notes', title: 'CREDIT NOTE' },
  { key: 'receipt', label: 'Payment Receipts', title: 'PAYMENT RECEIPT' },
  { key: 'purchase_order', label: 'Purchase Orders', title: 'PURCHASE ORDER' },
  { key: 'bill', label: 'Bills', title: 'BILL' },
  { key: 'delivery_challan', label: 'Delivery Challans', title: 'DELIVERY CHALLAN' },
];

@Injectable()
export class DocumentTemplatesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ensures that every supported document type has at least one built-in starter template.
   */
  async ensureStarterTemplates(companyId: string) {
    if (!companyId) return;

    for (const dt of SUPPORTED_DOC_TYPES) {
      const existing = await this.prisma.documentTemplate.findFirst({
        where: {
          companyId,
          OR: [{ docType: dt.key }, { type: dt.key }],
        },
      });

      if (dt.key === 'quote') {
        const spreadsheetExisting = await this.prisma.documentTemplate.findFirst({
          where: {
            companyId,
            OR: [{ docType: 'quote' }, { type: 'quote' }],
            name: 'Spreadsheet Template',
          },
        });

        if (!spreadsheetExisting) {
          // Unset any other quote default to make Spreadsheet Template the default
          await this.prisma.documentTemplate.updateMany({
            where: {
              companyId,
              OR: [{ docType: 'quote' }, { type: 'quote' }],
            },
            data: { isDefault: false },
          });

          await this.prisma.documentTemplate.create({
            data: {
              companyId,
              name: 'Spreadsheet Template',
              docType: 'quote',
              type: 'quote',
              isDefault: true,
              isSystem: true,
              theme: 'spreadsheet',
              colors: {
                primary: '#111827',
                secondary: '#374151',
                text: '#000000',
                background: '#ffffff',
                tableHeaderBg: '#d9d9d9',
                tableHeaderText: '#000000',
              },
              typography: {
                fontFamily: 'Times New Roman, serif',
                fontSize: '9pt',
              },
              layout: {
                orientation: 'PORTRAIT',
                pageSize: 'A4',
                margins: '12mm',
              },
              elements: {
                showLogo: true,
                showGstin: true,
                showPan: true,
                showBankDetails: true,
                showTerms: true,
                showSignature: true,
                showTaxBreakup: true,
                showHsn: true,
              },
              logoSettings: {
                showLogo: true,
                useOrgLogo: true,
                position: 'left',
                width: 140,
              },
              config: {
                documentTitle: 'Quote',
                numberingLabel: 'Quote No',
                showStatusRibbon: true,
                showDueDate: true,
                showPlaceOfSupply: true,
                showPoNumber: true,
                showBillTo: true,
                showShipTo: true,
                tableHeaderBg: '#d9d9d9',
                tableHeaderText: '#000000',
                columns: {
                  item: { visible: true, label: 'Item & Description' },
                  hsn: { visible: true, label: 'HSN/SAC' },
                  qty: { visible: true, label: 'Qty' },
                  rate: { visible: true, label: 'Rate' },
                  discount: { visible: true, label: 'Discount' },
                  tax: { visible: true, label: 'Tax %' },
                  amount: { visible: true, label: 'Amount' },
                },
                totals: {
                  showSubTotal: true,
                  showDiscount: true,
                  showTaxBreakup: true,
                  showRoundOff: true,
                  showTotalInWords: true,
                },
                footer: {
                  showNotes: true,
                  showTerms: true,
                  showBankDetails: true,
                  showSignature: true,
                  showPoweredBy: false,
                },
              },
              terms:
                'Transportation Charges extra.\nGoods once sold are not returnable or exchangeable.\nAny complaint or damages should be informed within four days after material received.',
              notes:
                'We Hope this offer is favorable to you and expect your valuable order at the earliest. please feel free to contact us.',
            },
          });
          continue;
        }
        continue;
      }

      if (!existing) {
        await this.prisma.documentTemplate.create({
          data: {
            companyId,
            name: `Standard ${dt.label.replace(/s$/, '')}`,
            docType: dt.key,
            type: dt.key,
            isDefault: true,
            isSystem: true,
            theme: 'classic',
            colors: {
              primary: '#408dfb',
              secondary: '#1e293b',
              text: '#333333',
              background: '#ffffff',
              tableHeaderBg: '#f8fafc',
              tableHeaderText: '#1e293b',
            },
            typography: {
              fontFamily: 'Inter',
              fontSize: '13px',
            },
            layout: {
              orientation: 'PORTRAIT',
              pageSize: 'A4',
              margins: '20px',
            },
            elements: {
              showLogo: true,
              showGstin: true,
              showPan: true,
              showBankDetails: true,
              showTerms: true,
              showSignature: true,
              showTaxBreakup: true,
              showHsn: true,
            },
            logoSettings: {
              showLogo: true,
              useOrgLogo: true,
              position: 'left',
              width: 140,
            },
            config: {
              documentTitle: dt.title,
              numberingLabel: `${dt.label.replace(/s$/, '')}#`,
              showDueDate: true,
              showPlaceOfSupply: true,
              showPoNumber: true,
              showBillTo: true,
              showShipTo: true,
              columns: {
                item: { visible: true, label: 'Item & Description' },
                hsn: { visible: true, label: 'HSN/SAC' },
                qty: { visible: true, label: 'Qty' },
                rate: { visible: true, label: 'Rate' },
                discount: { visible: true, label: 'Discount' },
                tax: { visible: true, label: 'Tax %' },
                amount: { visible: true, label: 'Amount' },
              },
              totals: {
                showSubTotal: true,
                showDiscount: true,
                showTaxBreakup: true,
                showRoundOff: true,
                showTotalInWords: true,
              },
              footer: {
                showNotes: true,
                showTerms: true,
                showBankDetails: true,
                showSignature: true,
                showPoweredBy: false,
              },
            },
            terms: '1. Payment due upon receipt.\n2. Goods once sold will not be taken back.\n3. Subject to local jurisdiction.',
            notes: 'Thank you for your business.',
          },
        });
      }
    }
  }

  async findAll(companyId: string, docType?: string) {
    await this.ensureStarterTemplates(companyId);

    const where: Prisma.DocumentTemplateWhereInput = { companyId };
    if (docType) {
      where.OR = [{ docType }, { type: docType }];
    }

    return this.prisma.documentTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { isSystem: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(companyId: string, id: string) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: { id, companyId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async findDefault(companyId: string, docType: string) {
    await this.ensureStarterTemplates(companyId);

    const template = await this.prisma.documentTemplate.findFirst({
      where: {
        companyId,
        OR: [{ docType }, { type: docType }],
        isDefault: true,
      },
    });

    if (template) return template;

    return this.prisma.documentTemplate.findFirst({
      where: {
        companyId,
        OR: [{ docType }, { type: docType }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, data: any) {
    const docType = data.docType || data.type || 'invoice';
    const name = data.name?.trim();

    if (!name) {
      throw new BadRequestException('Template name is required');
    }

    // Check name uniqueness for this docType in the company
    const existingName = await this.prisma.documentTemplate.findFirst({
      where: {
        companyId,
        OR: [{ docType }, { type: docType }],
        name: { equals: name },
      },
    });
    if (existingName) {
      throw new BadRequestException(`A template named "${name}" already exists for this document type`);
    }

    // If setting as default, unset others of same docType
    if (data.isDefault) {
      await this.prisma.documentTemplate.updateMany({
        where: {
          companyId,
          OR: [{ docType }, { type: docType }],
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentTemplate.create({
      data: {
        companyId,
        name,
        docType,
        type: docType,
        htmlContent: data.htmlContent,
        isSystem: false,
        isDefault: Boolean(data.isDefault),
        theme: data.theme || 'classic',
        colors: data.colors ?? Prisma.DbNull,
        typography: data.typography ?? Prisma.DbNull,
        layout: data.layout ?? Prisma.DbNull,
        elements: data.elements ?? Prisma.DbNull,
        logoUrl: data.logoUrl || null,
        logoSettings: data.logoSettings ?? Prisma.DbNull,
        config: data.config ?? Prisma.DbNull,
        terms: data.terms,
        notes: data.notes,
      },
    });
  }

  async update(companyId: string, id: string, data: any) {
    const existing = await this.findOne(companyId, id);
    const docType = data.docType || existing.docType || existing.type || 'invoice';

    if (data.name) {
      const name = data.name.trim();
      const duplicate = await this.prisma.documentTemplate.findFirst({
        where: {
          companyId,
          id: { not: id },
          OR: [{ docType }, { type: docType }],
          name: { equals: name },
        },
      });
      if (duplicate) {
        throw new BadRequestException(`A template named "${name}" already exists for this document type`);
      }
    }

    // If setting as default, unset others of same docType
    if (data.isDefault) {
      await this.prisma.documentTemplate.updateMany({
        where: {
          companyId,
          id: { not: id },
          OR: [{ docType }, { type: docType }],
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentTemplate.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        docType: data.docType || undefined,
        type: data.docType || data.type || undefined,
        htmlContent: data.htmlContent,
        isDefault: data.isDefault !== undefined ? Boolean(data.isDefault) : undefined,
        theme: data.theme,
        colors: data.colors ?? undefined,
        typography: data.typography ?? undefined,
        layout: data.layout ?? undefined,
        elements: data.elements ?? undefined,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : undefined,
        logoSettings: data.logoSettings ?? undefined,
        config: data.config ?? undefined,
        terms: data.terms,
        notes: data.notes,
      },
    });
  }

  async setDefault(companyId: string, id: string) {
    const template = await this.findOne(companyId, id);
    const docType = template.docType || template.type || 'invoice';

    await this.prisma.documentTemplate.updateMany({
      where: {
        companyId,
        OR: [{ docType }, { type: docType }],
      },
      data: { isDefault: false },
    });

    return this.prisma.documentTemplate.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async clone(companyId: string, id: string) {
    const original = await this.findOne(companyId, id);
    const docType = original.docType || original.type || 'invoice';

    // Generate unique clone name: "<Name> (Copy)"
    let cloneName = `${original.name} (Copy)`;
    let counter = 1;
    while (
      await this.prisma.documentTemplate.findFirst({
        where: {
          companyId,
          OR: [{ docType }, { type: docType }],
          name: cloneName,
        },
      })
    ) {
      counter++;
      cloneName = `${original.name} (Copy ${counter})`;
    }

    return this.prisma.documentTemplate.create({
      data: {
        companyId,
        name: cloneName,
        docType,
        type: docType,
        htmlContent: original.htmlContent,
        isSystem: false,
        isDefault: false, // Never default automatically
        theme: original.theme,
        colors: original.colors ?? Prisma.DbNull,
        typography: original.typography ?? Prisma.DbNull,
        layout: original.layout ?? Prisma.DbNull,
        elements: original.elements ?? Prisma.DbNull,
        logoUrl: original.logoUrl,
        logoSettings: original.logoSettings ?? Prisma.DbNull,
        config: original.config ?? Prisma.DbNull,
        terms: original.terms,
        notes: original.notes,
      },
    });
  }

  async remove(companyId: string, id: string) {
    const template = await this.findOne(companyId, id);

    if (template.isSystem) {
      throw new BadRequestException('Built-in system templates cannot be deleted.');
    }

    const docType = template.docType || template.type || 'invoice';
    const totalCount = await this.prisma.documentTemplate.count({
      where: {
        companyId,
        OR: [{ docType }, { type: docType }],
      },
    });

    if (totalCount <= 1) {
      throw new BadRequestException('Cannot delete the last remaining template of this document type.');
    }

    if (template.isDefault) {
      throw new BadRequestException('Cannot delete the default template. Please set another template as default first.');
    }

    return this.prisma.documentTemplate.delete({
      where: { id },
    });
  }
}

