import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { CreateInvoiceDto, InvoiceQueryDto } from './dto/invoice.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import { GSTEngine } from '../common/utils/gst-engine.util';
import type { Prisma } from '@prisma/client';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { CommissionsService } from '../commissions/commissions.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { PdfEngineService } from './pdf-engine.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingEngine: AccountingEngineService,
    private readonly commissionsService: CommissionsService,
    private readonly sequenceService: SequenceService,
    private readonly pdfEngineService: PdfEngineService,
  ) { }

  private buildInvoiceWhere(companyId: string, query: InvoiceQueryDto): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      deletedAt: null,
    };

    // 1. Full-text search across invoice number, customer name, phone, and GSTIN
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { invoiceNo: { contains: term, mode: 'insensitive' } },
        { businessPartner: { name: { contains: term, mode: 'insensitive' } } },
        { businessPartner: { phone: { contains: term, mode: 'insensitive' } } },
        { businessPartner: { gstin: { contains: term, mode: 'insensitive' } } },
      ];
    }

    // 2. Specific customer filter
    if (query.customerId && query.customerId.trim()) {
      where.businessPartnerId = query.customerId.trim();
    }

    // 3. Document / Invoice type filter
    const docType = query.invoiceType || query.documentType;
    if (docType && docType.trim()) {
      where.invoiceType = docType.trim() as any;
    }

    // 4. Tax mode filter
    if (query.taxMode && query.taxMode.trim()) {
      where.taxMode = query.taxMode.trim() as any;
    }

    // 5. Document status filter
    if (query.status && query.status.trim()) {
      where.status = query.status.trim() as any;
    }

    // 6. Payment status filter
    if (query.paymentStatus && query.paymentStatus.trim()) {
      const ps = query.paymentStatus.trim().toUpperCase();
      const now = new Date();
      if (ps === 'PAID') {
        where.status = 'PAID';
      } else if (ps === 'PARTIAL' || ps === 'PARTIALLY_PAID') {
        where.status = 'PARTIAL';
      } else if (ps === 'UNPAID') {
        where.amountPaid = 0;
        where.status = { notIn: ['PAID', 'CANCELLED'] as any };
      } else if (ps === 'OVERDUE') {
        where.dueDate = { lt: now };
        where.status = { notIn: ['PAID', 'CANCELLED'] as any };
      }
    }

    // 7. Date range filter
    if (query.fromDate || query.toDate) {
      where.date = {};
      if (query.fromDate) {
        where.date.gte = new Date(`${query.fromDate}T00:00:00.000Z`);
      }
      if (query.toDate) {
        where.date.lte = new Date(`${query.toDate}T23:59:59.999Z`);
      }
    }

    // 8. Amount range filter
    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      where.grandTotal = {};
      if (query.minAmount !== undefined && !isNaN(Number(query.minAmount))) {
        where.grandTotal.gte = Number(query.minAmount);
      }
      if (query.maxAmount !== undefined && !isNaN(Number(query.maxAmount))) {
        where.grandTotal.lte = Number(query.maxAmount);
      }
    }

    return where;
  }

  private buildInvoiceOrderBy(query: InvoiceQueryDto): Prisma.InvoiceOrderByWithRelationInput {
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const sortBy = query.sortBy || 'date';

    switch (sortBy) {
      case 'invoiceNo':
        return { invoiceNo: sortOrder };
      case 'customer':
      case 'customerName':
        return { businessPartner: { name: sortOrder } };
      case 'subTotal':
        return { subTotal: sortOrder };
      case 'taxTotal':
        return { taxTotal: sortOrder };
      case 'grandTotal':
        return { grandTotal: sortOrder };
      case 'dueDate':
        return { dueDate: sortOrder };
      case 'status':
        return { status: sortOrder };
      case 'createdAt':
        return { createdAt: sortOrder };
      case 'date':
      default:
        return { date: sortOrder };
    }
  }

  async findAll(query: InvoiceQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);
    const where = this.buildInvoiceWhere(companyId, query);
    const orderBy = this.buildInvoiceOrderBy(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true, items: { include: { product: true } } },
        orderBy,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async getSummary(query: InvoiceQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const where = this.buildInvoiceWhere(companyId, query);

    const invoices = await this.prisma.invoice.findMany({
      where,
      select: {
        id: true,
        grandTotal: true,
        amountPaid: true,
        dueDate: true,
        status: true,
      },
    });

    const now = new Date();
    let totalInvoices = invoices.length;
    let totalAmount = 0;
    let paidAmount = 0;
    let unpaidAmount = 0;
    let overdueCount = 0;

    for (const inv of invoices) {
      const g = Number(inv.grandTotal || 0);
      const p = Number(inv.amountPaid || 0);
      const balance = Math.max(0, g - p);

      totalAmount += g;
      paidAmount += p;
      unpaidAmount += balance;

      if (inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.dueDate && new Date(inv.dueDate) < now) {
        overdueCount++;
      }
    }

    return {
      totalInvoices,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      unpaidAmount: Math.round(unpaidAmount * 100) / 100,
      overdueCount,
    };
  }

  async getExportData(query: InvoiceQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const where = this.buildInvoiceWhere(companyId, query);
    const orderBy = this.buildInvoiceOrderBy(query);

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { businessPartner: true },
      orderBy,
      take: 2000,
    });

    const headers = [
      'Invoice No',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Customer GSTIN',
      'Document Type',
      'Tax Mode',
      'Subtotal (INR)',
      'Tax Total (INR)',
      'Grand Total (INR)',
      'Amount Paid (INR)',
      'Balance Due (INR)',
      'Status',
      'Due Date',
    ];

    const escapeCsv = (val: any) => {
      if (val == null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = invoices.map((inv) => {
      const g = Number(inv.grandTotal || 0);
      const p = Number(inv.amountPaid || 0);
      const balance = Math.max(0, g - p);
      const dateStr = inv.date ? new Date(inv.date).toISOString().split('T')[0] : '';
      const dueStr = inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '';

      return [
        escapeCsv(inv.invoiceNo),
        escapeCsv(dateStr),
        escapeCsv(inv.businessPartner?.name || ''),
        escapeCsv(inv.businessPartner?.phone || ''),
        escapeCsv(inv.businessPartner?.gstin || ''),
        escapeCsv(inv.invoiceType),
        escapeCsv(inv.taxMode),
        escapeCsv(Number(inv.subTotal || 0).toFixed(2)),
        escapeCsv(Number(inv.taxTotal || 0).toFixed(2)),
        escapeCsv(g.toFixed(2)),
        escapeCsv(p.toFixed(2)),
        escapeCsv(balance.toFixed(2)),
        escapeCsv(inv.status),
        escapeCsv(dueStr),
      ].join(',');
    });

    // Return with UTF-8 BOM for Microsoft Excel compatibility
    return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  }

  async bulkDownloadPdf(invoiceIds: string[], companyId: string, res: Response) {
    if (!invoiceIds || invoiceIds.length === 0) {
      throw new BadRequestException('At least one invoice ID must be specified');
    }
    if (invoiceIds.length > 100) {
      throw new BadRequestException('Maximum 100 invoices can be exported in a single bulk request');
    }

    // Tenant isolation: fetch only invoices belonging to the authenticated companyId
    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        companyId,
        deletedAt: null,
      },
      select: { id: true, invoiceNo: true },
    });

    if (invoices.length === 0) {
      throw new NotFoundException('No valid invoices found for current tenant');
    }

    // Single invoice download: direct PDF stream
    if (invoices.length === 1) {
      const inv = invoices[0];
      const pdfBuffer = await this.pdfEngineService.generateInvoicePdf(inv.id, companyId);
      const safeNo = (inv.invoiceNo || inv.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice_${safeNo}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      });
      res.end(pdfBuffer);
      return;
    }

    // Multiple invoices: stream ZIP archive
    const archiverModule: any = await import('archiver');
    const archiverFactory = archiverModule.default || archiverModule;
    const archive = archiverFactory('zip', { zlib: { level: 6 } });

    const todayStr = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="BillAura_Invoices_${todayStr}.zip"`,
    });

    archive.pipe(res);

    archive.on('error', (err: any) => {
      console.error('Error during ZIP generation:', err);
      if (!res.headersSent) {
        res.status(500).send({ success: false, message: 'Failed to generate ZIP archive' });
      }
    });

    for (const inv of invoices) {
      try {
        const pdfBuffer = await this.pdfEngineService.generateInvoicePdf(inv.id, companyId);
        const safeNo = (inv.invoiceNo || inv.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        archive.append(pdfBuffer, { name: `Invoice_${safeNo}.pdf` });
      } catch (err) {
        console.error(`Failed to generate PDF for invoice ${inv.id}:`, err);
      }
    }

    await archive.finalize();
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

    const partnerId = (dto.businessPartnerId || dto.customerId) as string;
    if (!partnerId) {
      throw new BadRequestException('Customer / Business Partner ID is required');
    }

    // Check customer exists
    const customer = await this.prisma.businessPartner.findFirst({
      where: { id: partnerId, companyId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${partnerId} not found`);
    }

    const execute = async (tx: Prisma.TransactionClient) => {
      const docType = (dto.documentType || dto.invoiceType || 'TAX_INVOICE') as any;

      // 1. Concurrency-Safe Document Sequence Allocation
      let invoiceNo = dto.documentNo || dto.invoiceNo;
      if (!invoiceNo) {
        invoiceNo = await this.sequenceService.generateUniversalSequence(
          companyId,
          docType,
          { seriesId: dto.numberingSeriesId },
          tx
        );
      } else {
        // Validate uniqueness if manually provided
        const existing = await tx.invoice.findFirst({
          where: { companyId, invoiceNo, deletedAt: null },
        });
        if (existing) {
          throw new BadRequestException(`Document number "${invoiceNo}" already exists`);
        }
      }

      // 2. Fetch category & tax treatment configurations
      let categorySnapshot = null;
      let taxSnapshot = null;
      let overrideTaxPref = dto.taxPreference;

      if (dto.invoiceCategoryId) {
        const category = await tx.invoiceCategory.findUnique({
          where: { id: dto.invoiceCategoryId },
          include: { taxTreatment: true, numberingSeries: true },
        });
        if (category) {
          categorySnapshot = category;
          if (category.taxTreatment?.treatmentType && !overrideTaxPref) {
            overrideTaxPref = category.taxTreatment.treatmentType;
          }
        }
      }

      if (dto.taxTreatmentId) {
        const taxTreatment = await tx.taxTreatment.findUnique({
          where: { id: dto.taxTreatmentId },
        });
        if (taxTreatment) {
          taxSnapshot = taxTreatment;
          overrideTaxPref = taxTreatment.treatmentType;
        }
      }

      // Fetch company profile for GST state routing
      const company = await tx.company.findUnique({
        where: { id: companyId },
      });
      const companyState = company?.state?.trim().toLowerCase() || '';
      const supplyState = dto.placeOfSupply?.trim().toLowerCase() || companyState;
      const isInterState = supplyState && companyState && supplyState !== companyState;

      const bpTaxPreference = customer?.taxPreference || 'TAXABLE';

      // Document Type Policy: Define capabilities
      const isNonPosting = ['QUOTATION', 'ESTIMATE', 'PROFORMA_INVOICE', 'DELIVERY_CHALLAN'].includes(docType);
      const isReceipt = ['FEE_RECEIPT', 'PAYMENT_RECEIPT', 'OTHER_RECEIPT'].includes(docType);
      const isCreditNote = docType === 'CREDIT_NOTE';

      // 3. Process items and calculate authoritative totals via GSTEngine
      let subTotal = 0;
      let taxTotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      let totalCess = 0;
      const itemsToCreate = [];

      for (const item of dto.items || []) {
        let product: any = null;
        if (item.productId) {
          product = await tx.product.findFirst({
            where: { id: item.productId, companyId },
          });
        }

        const qty = Number(item.qty || 1);
        const rate = Number(item.rate || 0);
        const lineTotal = qty * rate;

        // Resolve item-level tax preference
        let lineTaxPref = item.taxPreference || overrideTaxPref || product?.taxPreference || bpTaxPreference;
        if (docType === 'BILL_OF_SUPPLY') {
          lineTaxPref = 'EXEMPT';
        } else if (docType === 'FEE_RECEIPT' && !item.taxPreference && !overrideTaxPref) {
          lineTaxPref = 'NOT_APPLICABLE';
        }

        const taxRate =
          item.taxPercent !== undefined
            ? Number(item.taxPercent)
            : product?.gstRate !== undefined
            ? Number(product.gstRate)
            : lineTaxPref === 'NOT_APPLICABLE' || lineTaxPref === 'EXEMPT' || lineTaxPref === 'NON_GST'
            ? 0
            : 18;

        const cessRate = item.cessPercent !== undefined ? Number(item.cessPercent) : 0;

        const gstResult = GSTEngine.calculate({
          taxableAmount: lineTotal,
          gstRate: taxRate,
          cessRate,
          taxPreference: lineTaxPref as any,
          companyStateCode: companyState,
          customerStateCode: supplyState,
        });

        subTotal += gstResult.taxableAmount;
        taxTotal += gstResult.totalTax;
        totalCgst += gstResult.cgstAmount;
        totalSgst += gstResult.sgstAmount;
        totalIgst += gstResult.igstAmount;
        totalCess += gstResult.cessAmount;

        itemsToCreate.push({
          productId: product?.id || null,
          description: item.description || product?.name || 'Item',
          qty,
          rate,
          taxPercent: taxRate,
          taxAmount: gstResult.totalTax,
          total: gstResult.grandTotal,
          cgstAmount: gstResult.cgstAmount,
          sgstAmount: gstResult.sgstAmount,
          igstAmount: gstResult.igstAmount,
          cessAmount: gstResult.cessAmount,
        });
      }

      const grandTotal = Number((subTotal + taxTotal).toFixed(2));
      const amountPaid = Number(dto.amountPaid || (isReceipt ? grandTotal : 0));

      // 4. Commission evaluation if requested
      let commissionRecordId: string | null = null;
      if (dto.referralSourceType && !isNonPosting) {
        const commission = await this.commissionsService.evaluateCommission({
          companyId,
          referenceType: 'INVOICE',
          referenceId: invoiceNo || '',
          referralSourceType: dto.referralSourceType as any,
          employeeId: dto.employeeId,
          businessPartnerId: dto.referralPartnerId,
          baseAmount: subTotal,
        });
        if (commission) {
          commissionRecordId = commission.id;
        }
      }

      // 5. Create Document record in Invoice table
      const invoice = await tx.invoice.create({
        data: {
          companyId,
          businessPartnerId: partnerId,
          commissionRecordId,
          invoiceNo: invoiceNo || '',
          invoiceType: docType,
          placeOfSupply: dto.placeOfSupply || company?.state || '',
          date: new Date(dto.date),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          status: (dto.status as any) || (isReceipt ? 'PAID' : isNonPosting ? 'DRAFT' : 'SENT'),
          subTotal: Number(subTotal.toFixed(2)),
          taxTotal: Number(taxTotal.toFixed(2)),
          grandTotal,
          amountPaid,
          cgstAmount: Number(totalCgst.toFixed(2)),
          sgstAmount: Number(totalSgst.toFixed(2)),
          igstAmount: Number(totalIgst.toFixed(2)),
          cessAmount: Number(totalCess.toFixed(2)),
          totalTaxAmount: Number(taxTotal.toFixed(2)),
          gstBreakup: {
            notes: dto.notes,
            termsConditions: dto.termsConditions,
            documentType: docType,
            paymentMode: dto.paymentMode,
            paymentReference: dto.paymentReference,
            sourceDocumentId: dto.sourceDocumentId,
            sourceDocumentType: dto.sourceDocumentType,
          },
          invoiceCategoryId: dto.invoiceCategoryId || null,
          taxTreatmentId: dto.taxTreatmentId || null,
          numberingSeriesId: dto.numberingSeriesId || null,
          taxExemptionReason: dto.taxExemptionReason || null,
          categorySnapshot: categorySnapshot as unknown as Prisma.InputJsonValue,
          taxSnapshot: (taxSnapshot || {
            taxPreference: overrideTaxPref || bpTaxPreference,
            subTotal,
            taxTotal,
          }) as unknown as Prisma.InputJsonValue,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      });

      // 6. Execute Accounting Policy per Document Type
      if (!isNonPosting) {
        const netReceivableDelta = isCreditNote ? -grandTotal : isReceipt ? grandTotal - amountPaid : grandTotal;

        // A. Update customer outstanding balance
        if (customer && netReceivableDelta !== 0) {
          await tx.businessPartner.update({
            where: { id: partnerId },
            data: {
              receivableBalance: {
                increment: netReceivableDelta,
              },
            },
          });
        }

        // B. Create Customer Statement record
        await tx.customerStatement.create({
          data: {
            companyId,
            businessPartnerId: partnerId,
            date: new Date(dto.date),
            type: docType,
            reference: invoiceNo || '',
            debit: isCreditNote ? 0 : grandTotal,
            credit: isCreditNote ? grandTotal : amountPaid,
            balance: Number(customer?.receivableBalance || 0) + netReceivableDelta,
          },
        });

        // C. Update stock ledger if physical inventory items exist
        for (const item of itemsToCreate) {
          if (item.productId) {
            const prod = await tx.product.findUnique({ where: { id: item.productId } });
            if (prod && (prod.isService || !prod.isInventoryItem || !prod.isTrackStock)) {
              continue; // Services and non-inventory items strictly bypass stock ledgers & warehouse updates
            }

            const defaultWh = await tx.warehouse.findFirst({
              where: { companyId, isDefault: true },
            });

            if (defaultWh) {
              const stock = await tx.stock.findFirst({
                where: { companyId, productId: item.productId, warehouseId: defaultWh.id },
              });

              const currentQty = stock ? Number(stock.quantity) : 0;
              const qtyDelta = isCreditNote ? item.qty : -item.qty;
              const newQty = currentQty + qtyDelta;

              if (stock) {
                await tx.stock.update({
                  where: { id: stock.id },
                  data: { quantity: newQty, availableQuantity: newQty },
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

              await tx.stockLedger.create({
                data: {
                  companyId,
                  productId: item.productId,
                  type: isCreditNote ? 'RETURN' : 'SALE',
                  quantityBefore: currentQty,
                  quantityChange: qtyDelta,
                  quantityAfter: newQty,
                  notes: `Issued via ${docType} ${invoiceNo}`,
                  referenceId: invoice.id,
                  referenceType: 'INVOICE',
                },
              });
            }
          }
        }

        // D. Post Journal Entry to General Ledger
        let arAccount = await tx.account.findFirst({
          where: { companyId, name: 'Accounts Receivable' },
        });
        if (!arAccount) {
          arAccount = await tx.account.create({
            data: { companyId, name: 'Accounts Receivable', category: 'ASSET', balance: 0 },
          });
        }

        const defaultRevenueName = docType === 'FEE_RECEIPT' ? 'Fee Revenue' : 'Sales Revenue';
        let revenueAccount = await tx.account.findFirst({
          where: { companyId, name: defaultRevenueName },
        });

        if (categorySnapshot?.defaultSalesAccountId) {
          const catAccount = await tx.account.findUnique({
            where: { id: categorySnapshot.defaultSalesAccountId },
          });
          if (catAccount) revenueAccount = catAccount;
        }

        if (!revenueAccount) {
          revenueAccount = await tx.account.create({
            data: { companyId, name: defaultRevenueName, category: 'REVENUE', balance: 0 },
          });
        }

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

        const journalLines = isCreditNote
          ? [
              { accountId: revenueAccount.id, debit: subTotal, credit: 0 },
              { accountId: arAccount.id, debit: 0, credit: grandTotal },
            ]
          : [
              { accountId: arAccount.id, debit: grandTotal, credit: 0 },
              { accountId: revenueAccount.id, debit: 0, credit: subTotal },
            ];

        if (!isInterState && totalCgst > 0 && cgstAccount && sgstAccount) {
          journalLines.push({
            accountId: cgstAccount.id,
            debit: isCreditNote ? totalCgst : 0,
            credit: isCreditNote ? 0 : totalCgst,
          });
          journalLines.push({
            accountId: sgstAccount.id,
            debit: isCreditNote ? totalSgst : 0,
            credit: isCreditNote ? 0 : totalSgst,
          });
        }
        if (isInterState && totalIgst > 0 && igstAccount) {
          journalLines.push({
            accountId: igstAccount.id,
            debit: isCreditNote ? totalIgst : 0,
            credit: isCreditNote ? 0 : totalIgst,
          });
        }

        await this.accountingEngine.postTransaction(
          {
            companyId,
            date: new Date(dto.date),
            reference: invoiceNo,
            description: `Automatic ${docType} posting ${invoiceNo}`,
            lines: journalLines,
          },
          tx
        );
      }

      // Update commission record with actual invoice ID
      if (commissionRecordId) {
        await tx.commissionRecord.update({
          where: { id: commissionRecordId },
          data: { referenceId: invoice.id },
        });
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

    const docType = (type || 'TAX_INVOICE').toUpperCase();
    const typePrefixes: Record<string, string> = {
      TAX_INVOICE: 'INV',
      INVOICE: 'INV',
      BILL_OF_SUPPLY: 'BOS',
      RETAIL_INVOICE: 'RET',
      PROFORMA: 'PI',
      PROFORMA_INVOICE: 'PI',
      QUOTATION: 'QT',
      ESTIMATE: 'EST',
      CREDIT_NOTE: 'CN',
      DEBIT_NOTE: 'DN',
      DELIVERY_CHALLAN: 'DC',
      FEE_RECEIPT: 'FEE',
      PAYMENT_RECEIPT: 'REC',
      OTHER_RECEIPT: 'OREC',
    };

    const prefix = typePrefixes[docType] || docType.substring(0, 3);

    const sequence = await this.prisma.documentSequence.findFirst({
      where: { companyId, documentType: docType as any },
    });

    if (!sequence) {
      return { nextNumber: `${prefix}-00001` };
    }

    const nextNum = sequence.currentNumber + 1;
    return { nextNumber: `${prefix}-${String(nextNum).padStart(sequence.padding || 5, '0')}` };
  }
}
