import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import { GSTEngine } from '../common/utils/gst-engine.util';
import type { Prisma } from '@prisma/client';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { CommissionsService } from '../commissions/commissions.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingEngine: AccountingEngineService,
    private readonly commissionsService: CommissionsService
  ) {}

  async findAll(query: PaginationQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(query.search
        ? {
            OR: [
              { invoiceNo: { contains: query.search } },
              { businessPartner: { name: { contains: query.search } } },
            ],
          }
        : {}),
      ...((query as any).customerId ? { businessPartnerId: (query as any).customerId } : {}),
      ...((query as any).status ? { status: (query as any).status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true, items: { include: { product: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id },
      include: { 
        businessPartner: true, 
        items: { include: { product: true } },
        receiptAllocations: { include: { receipt: true } }
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async create(dto: CreateInvoiceDto, txClient?: Prisma.TransactionClient) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Check customer exists
    const customer = await this.prisma.businessPartner.findFirst({
      where: { id: dto.customerId, companyId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    const execute = async (tx: Prisma.TransactionClient) => {
      let invoiceNo = dto.invoiceNo;
      if (invoiceNo) {
        // Validate uniqueness
        const existing = await tx.invoice.findFirst({
          where: { companyId, invoiceNo, deletedAt: null },
        });
        if (existing) {
          throw new BadRequestException('Invoice number already exists');
        }

        // If user accepted/matched the next auto sequence number, increment the sequence to keep it synchronized
        let sequence = await tx.documentSequence.findFirst({
          where: { companyId, documentType: 'INVOICE' },
        });
        if (!sequence) {
          sequence = await tx.documentSequence.create({
            data: { companyId, documentType: 'INVOICE', currentNumber: 0 },
          });
        }
        const nextNumber = sequence.currentNumber + 1;
        const expectedAuto = `INV-${String(nextNumber).padStart(5, '0')}`;
        if (invoiceNo === expectedAuto) {
          await tx.documentSequence.update({
            where: { id: sequence.id },
            data: { currentNumber: nextNumber },
          });
        }
      } else {
        // 1. Generate invoice number using DocumentSequence
        let sequence = await tx.documentSequence.findFirst({
          where: { companyId, documentType: 'INVOICE' },
        });

        if (!sequence) {
          sequence = await tx.documentSequence.create({
            data: {
              companyId,
              documentType: 'INVOICE',
              currentNumber: 0,
            },
          });
        }

        const nextNumber = sequence.currentNumber + 1;
        await tx.documentSequence.update({
          where: { id: sequence.id },
          data: { currentNumber: nextNumber },
        });

        invoiceNo = `INV-${String(nextNumber).padStart(5, '0')}`;
      }

      // Fetch company profile to verify placeOfSupply relative to companyState for GST routing
      const company = await tx.company.findUnique({
        where: { id: companyId },
      });
      const companyState = company?.state?.trim().toLowerCase() || '';
      const supplyState = dto.placeOfSupply?.trim().toLowerCase() || '';
      const isInterState = supplyState && companyState && supplyState !== companyState;

      const customer = await tx.businessPartner.findUnique({ where: { id: dto.customerId } });
      const bpTaxPreference = customer?.taxPreference || 'TAXABLE';

      // 2. Fetch products and calculate totals
      let subTotal = 0;
      let taxTotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      let totalCogs = 0;
      const itemsToCreate = [];

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, companyId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const rate = Number(item.rate);
        const qty = Number(item.qty);
        const lineTotal = rate * qty;
        
        const taxRate = item.taxPercent !== undefined ? Number(item.taxPercent) : Number(product.gstRate || 18);
        const nonGstTypes = ['BILL_OF_SUPPLY', 'EXEMPT_SUPPLY', 'NIL_RATED_INVOICE', 'EXPORT_INVOICE'];
        
        let activeTaxPref = bpTaxPreference;
        if (nonGstTypes.includes(dto.invoiceType as string)) {
          activeTaxPref = 'NON_GST';
        }

        const gstResult = GSTEngine.calculate({
           taxableAmount: lineTotal,
           gstRate: taxRate,
           taxPreference: activeTaxPref as any,
           companyStateCode: companyState,
           customerStateCode: supplyState
        });

        subTotal += gstResult.taxableAmount;
        taxTotal += gstResult.totalTax;
        totalCgst += gstResult.cgstAmount;
        totalSgst += gstResult.sgstAmount;
        totalIgst += gstResult.igstAmount;

        if (product.itemType === 'FINISHED_GOOD' || product.itemType === 'RAW_MATERIAL') {
          totalCogs += (Number(product.purchasePrice || 0) * qty);
        }

        itemsToCreate.push({
          productId: product.id,
          description: item.description || product.name,
          qty,
          rate,
          taxPercent: taxRate,
          taxAmount: gstResult.totalTax,
          total: gstResult.grandTotal,
          cgstAmount: gstResult.cgstAmount,
          sgstAmount: gstResult.sgstAmount,
          igstAmount: gstResult.igstAmount,
        });
      }

      const grandTotal = subTotal + taxTotal;

      // Determine Enums
      const invoiceTypeEnum = (dto.invoiceType as any) || 'TAX_INVOICE';
      
      // Evaluate Commission if requested
      let commissionRecordId: string | null = null;
      if (dto.referralSourceType) {
        const commission = await this.commissionsService.evaluateCommission({
          companyId,
          referenceType: 'INVOICE',
          referenceId: invoiceNo,
          referralSourceType: dto.referralSourceType as any,
          employeeId: dto.employeeId,
          businessPartnerId: dto.referralPartnerId,
          baseAmount: subTotal
        });
        if (commission) {
          commissionRecordId = commission.id;
        }
      }

      // 3. Create Invoice record
      const invoice = await tx.invoice.create({
        data: {
          companyId,
          businessPartnerId: (dto.businessPartnerId || dto.customerId) as string,
          commissionRecordId,
          invoiceNo,
          invoiceType: invoiceTypeEnum,
          placeOfSupply: dto.placeOfSupply,
          date: new Date(dto.date),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          status: (dto as any).status || 'SENT', // Use status from DTO or default to SENT
          subTotal,
          taxTotal,
          grandTotal,
          amountPaid: 0,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          cessAmount: 0,
          totalTaxAmount: taxTotal,
          gstBreakup: {
            notes: dto.notes,
            termsConditions: dto.termsConditions,
          },
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });

      // 4. Update customer outstanding balance
      if (invoiceTypeEnum !== 'PROFORMA_INVOICE') {
        if (customer) {
          await tx.businessPartner.update({
            where: { id: dto.customerId },
            data: {
              receivableBalance: {
                increment: grandTotal,
              },
            },
          });
        }
      }

      // Update commission record with actual invoice ID
      if (commissionRecordId) {
        await tx.commissionRecord.update({
          where: { id: commissionRecordId },
          data: { referenceId: invoice.id }
        });
      }

      // 5. Create Customer Statement record
      if (invoiceTypeEnum !== 'PROFORMA_INVOICE') {
        await tx.customerStatement.create({
          data: {
            companyId,
            businessPartnerId: (dto.businessPartnerId || dto.customerId) as string,
            date: new Date(dto.date),
            type: 'INVOICE',
            reference: invoiceNo,
            debit: grandTotal,
            credit: 0,
            balance: Number(customer?.receivableBalance || 0) + grandTotal,
          },
        });
      }

      // 6. Reduce stock quantities and create movement logs
      if (invoiceTypeEnum !== 'PROFORMA_INVOICE') {
        for (const item of itemsToCreate) {
          // Find default warehouse stock
          const defaultWh = await tx.warehouse.findFirst({
            where: { companyId, isDefault: true },
          });

          if (defaultWh) {
            const stock = await tx.stock.findFirst({
              where: { companyId, productId: item.productId, warehouseId: defaultWh.id },
            });

            const currentQty = stock ? Number(stock.quantity) : 0;
            const newQty = currentQty - item.qty;

            if (stock) {
              await tx.stock.update({
                where: { id: stock.id },
                data: {
                  quantity: newQty,
                  availableQuantity: newQty,
                },
              });
            } else {
              await tx.stock.create({
                data: {
                  companyId,
                  productId: item.productId,
                  warehouseId: defaultWh.id,
                  quantity: newQty,
                  availableQuantity: newQty,
                },
              });
            }

            // Stock ledger entry
            await tx.stockLedger.create({
              data: {
                companyId,
                productId: item.productId,
                type: 'SALE',
                quantityBefore: currentQty,
                quantityChange: -item.qty,
                quantityAfter: newQty,
                notes: `Issued via Invoice ${invoiceNo}`,
                referenceId: invoice.id,
                referenceType: 'INVOICE'
              },
            });
          }
        }
      }

      // 7. Post automatic journal entry to General Ledger
      if (invoiceTypeEnum !== 'PROFORMA_INVOICE') {
        let arAccount = await tx.account.findFirst({
          where: { companyId, name: 'Accounts Receivable' },
        });
        if (!arAccount) {
          arAccount = await tx.account.create({
            data: { companyId, name: 'Accounts Receivable', category: 'ASSET', balance: 0 },
          });
        }

        let salesAccount = await tx.account.findFirst({
          where: { companyId, name: 'Sales Revenue' },
        });
        if (!salesAccount) {
          salesAccount = await tx.account.create({
            data: { companyId, name: 'Sales Revenue', category: 'REVENUE', balance: 0 },
          });
        }

        // Find or create Tax Accounts
        const getTaxAccount = async (name: string) => {
          let acc = await tx.account.findFirst({ where: { companyId, name } });
          if (!acc) {
            acc = await tx.account.create({
              data: { companyId, name, category: 'LIABILITY', subCategory: 'CURRENT_LIABILITY', balance: 0 },
            });
          }
          return acc;
        };

        const cgstAccount = isInterState ? null : await getTaxAccount('Output CGST');
        const sgstAccount = isInterState ? null : await getTaxAccount('Output SGST');
        const igstAccount = isInterState ? await getTaxAccount('Output IGST') : null;

        const journalLines = [
          { accountId: arAccount.id, debit: grandTotal, credit: 0 },
          { accountId: salesAccount.id, debit: 0, credit: subTotal },
        ];

        const cgstAmt = totalCgst;
        const sgstAmt = totalSgst;
        const igstAmt = totalIgst;

        if (!isInterState && cgstAmt > 0 && cgstAccount && sgstAccount) {
          journalLines.push({ accountId: cgstAccount.id, debit: 0, credit: cgstAmt });
          journalLines.push({ accountId: sgstAccount.id, debit: 0, credit: sgstAmt });
        }
        if (isInterState && igstAmt > 0 && igstAccount) {
          journalLines.push({ accountId: igstAccount.id, debit: 0, credit: igstAmt });
        }

        await this.accountingEngine.postTransaction({
          companyId,
          date: new Date(dto.date),
          reference: invoiceNo,
          description: `Automatic invoice posting ${invoiceNo}`,
          lines: journalLines,
        }, tx);

        // 8. Post automatic COGS journal entry
        if (totalCogs > 0) {
          let cogsAccount = await tx.account.findFirst({ where: { companyId, name: 'Cost of Goods Sold' } });
          if (!cogsAccount) {
            cogsAccount = await tx.account.create({
              data: { companyId, name: 'Cost of Goods Sold', category: 'EXPENSE', subCategory: 'COGS', balance: 0 },
            });
          }
          let invAccount = await tx.account.findFirst({ where: { companyId, name: 'Inventory' } });
          if (!invAccount) {
            invAccount = await tx.account.create({
              data: { companyId, name: 'Inventory', category: 'ASSET', subCategory: 'CURRENT_ASSET', balance: 0 },
            });
          }

          await this.accountingEngine.postTransaction({
            companyId,
            date: new Date(dto.date),
            reference: invoiceNo,
            description: `Automatic COGS posting ${invoiceNo}`,
            lines: [
              { accountId: cogsAccount.id, debit: totalCogs, credit: 0 },
              { accountId: invAccount.id, debit: 0, credit: totalCogs },
            ],
          }, tx);
        }
      }

      return invoice;
    };

    if (txClient) {
      return execute(txClient);
    }
    return this.prisma.$transaction(execute, { timeout: 20000 });
  }

  async remove(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot delete a fully paid invoice');
    }

    return this.prisma.$transaction(async (tx) => {
      // Revert customer outstanding balance
      await tx.businessPartner.update({
        where: { id: invoice.businessPartnerId },
        data: {
          receivableBalance: {
            decrement: invoice.grandTotal,
          },
        },
      });

      // Find original journal entries and create reversals using AccountingEngineService
      const originalEntries = await tx.journalEntry.findMany({
        where: { reference: invoice.invoiceNo, companyId: invoice.companyId },
      });

      for (const entry of originalEntries) {
        await this.accountingEngine.reverseTransaction(entry.id, invoice.companyId, tx, `Reversal for deleted invoice ${invoice.invoiceNo}`);
      }

      // Revert Stock Ledger
      const stockLedgers = await tx.stockLedger.findMany({
        where: { referenceId: invoice.id, referenceType: 'INVOICE' },
      });

      for (const ledger of stockLedgers) {
        const changeQty = Number(ledger.quantityChange) * -1; // reverse the change

        // Restore stock qty
        const stock = await tx.stock.findFirst({
          where: { companyId: invoice.companyId, productId: ledger.productId },
        });

        if (stock) {
          const currentQty = Number(stock.quantity);
          const newQty = currentQty + changeQty;
          
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: newQty, availableQuantity: newQty },
          });

          await tx.stockLedger.create({
            data: {
              companyId: invoice.companyId,
              productId: ledger.productId,
              type: 'ADJUSTMENT',
              quantityBefore: currentQty,
              quantityChange: changeQty,
              quantityAfter: newQty,
              notes: `Reversal of Invoice ${invoice.invoiceNo}`,
              referenceId: invoice.id,
              referenceType: 'INVOICE_REVERSAL',
            }
          });
        }
      }

      // Soft delete invoice
      return tx.invoice.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async getNextInvoiceNumber(type?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    let prefix = 'INV';
    let docType = 'INVOICE';

    if (type === 'PROFORMA') {
      prefix = 'PF';
      docType = 'PROFORMA_INVOICE';
    } else if (type === 'QUOTATION') {
      prefix = 'QT';
      docType = 'QUOTATION';
    } else if (type === 'CREDIT_NOTE') {
      prefix = 'CN';
      docType = 'CREDIT_NOTE';
    } else if (type === 'DEBIT_NOTE') {
      prefix = 'DN';
      docType = 'DEBIT_NOTE';
    } else if (type === 'DELIVERY_CHALLAN') {
      prefix = 'DC';
      docType = 'DELIVERY_CHALLAN';
    }

    const sequence = await this.prisma.documentSequence.findFirst({
      where: { companyId, documentType: docType as any },
    });

    if (!sequence) {
      return { nextNumber: `${prefix}-00001` };
    }

    const nextNum = sequence.currentNumber + 1;
    return { nextNumber: `${prefix}-${String(nextNum).padStart(5, '0')}` };
  }
}
