import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { CreateInvoiceDto, InvoiceQueryDto, UpdateInvoiceDto, CancelInvoiceDto } from './dto/invoice.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import { GSTEngine } from '../common/utils/gst-engine.util';
import { InvoiceType, Prisma } from '@prisma/client';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { CommissionsService } from '../commissions/commissions.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { PdfEngineService } from './pdf-engine.service';
import { analyzeDatabaseTarget } from '../common/utils/database-safety.util';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingEngine: AccountingEngineService,
    private readonly commissionsService: CommissionsService,
    private readonly sequenceService: SequenceService,
    private readonly pdfEngineService: PdfEngineService,
  ) { }

  private buildInvoiceWhere(companyId: string, query: InvoiceQueryDto): Prisma.InvoiceWhereInput {
    const isArchived = query.status === 'ARCHIVED' || query.archived === 'true' || query.archived === '1';
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      deletedAt: isArchived ? { not: null } : null,
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
      const upper = docType.trim().toUpperCase();
      if (upper === 'INVOICE') {
        where.invoiceType = { in: ['TAX_INVOICE', 'RETAIL_INVOICE', 'BILL_OF_SUPPLY'] };
      } else {
        where.invoiceType = this.normalizeInvoiceType(upper);
      }
    }

    // 4. Tax mode filter
    if (query.taxMode && query.taxMode.trim()) {
      where.taxMode = query.taxMode.trim() as any;
    }

    // 5. Document status filter
    if (query.status && query.status.trim() && query.status !== 'ARCHIVED') {
      const s = query.status.trim().toUpperCase();
      if (s === 'OVERDUE') {
        where.dueDate = { lt: new Date() };
        where.status = { notIn: ['PAID', 'CANCELLED'] as any };
      } else {
        where.status = s as any;
      }
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

    const isArchived = query.status === 'ARCHIVED' || query.archived === 'true' || query.archived === '1';
    if (isArchived && data.length > 0) {
      const auditLogs = await this.prisma.auditLog.findMany({
        where: {
          companyId,
          tableName: 'invoices',
          action: { in: ['DELETE_INVOICE', 'ARCHIVE_INVOICE'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const userIds = Array.from(new Set(auditLogs.map((l) => l.userId).filter(Boolean)));
      const users = userIds.length > 0 ? await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }) : [];
      const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

      const enriched = data.map((inv) => {
        const log = auditLogs.find((l) => {
          const oldV = l.oldValues as any;
          const newV = l.newValues as any;
          return oldV?.id === inv.id || oldV?.invoiceNo === inv.invoiceNo || newV?.id === inv.id;
        });
        const actorName = log?.userId ? (userMap.get(log.userId) || log.userId) : null;
        return {
          ...inv,
          archivedAt: log?.createdAt || inv.deletedAt,
          archiveReason: (log?.newValues as any)?.reason || (log?.oldValues as any)?.reason || null,
          archiveActor: actorName,
        };
      });

      return toPaginatedResult(enriched, total, query);
    }

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

    // Compute live status counts across active documents for quick tabs
    const tabWhere = this.buildInvoiceWhere(companyId, { ...query, status: undefined, archived: undefined });
    const archivedWhere = this.buildInvoiceWhere(companyId, { ...query, status: 'ARCHIVED' });

    const [allActiveInvoices, archivedCount] = await Promise.all([
      this.prisma.invoice.findMany({
        where: tabWhere,
        select: {
          id: true,
          grandTotal: true,
          amountPaid: true,
          dueDate: true,
          status: true,
        },
      }),
      this.prisma.invoice.count({ where: archivedWhere }),
    ]);

    const statusCounts = {
      ALL: allActiveInvoices.length,
      SENT: 0,
      PARTIAL: 0,
      PAID: 0,
      OVERDUE: 0,
      DRAFT: 0,
      ARCHIVED: archivedCount,
    };

    for (const inv of allActiveInvoices) {
      const g = Number(inv.grandTotal || 0);
      const p = Number(inv.amountPaid || 0);

      if (inv.status === 'SENT') statusCounts.SENT++;
      else if (inv.status === 'PARTIAL') statusCounts.PARTIAL++;
      else if (inv.status === 'PAID') statusCounts.PAID++;
      else if (inv.status === 'DRAFT') statusCounts.DRAFT++;

      if (inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.dueDate && new Date(inv.dueDate) < now && p < g) {
        statusCounts.OVERDUE++;
      }
    }

    return {
      totalInvoices,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      unpaidAmount: Math.round(unpaidAmount * 100) / 100,
      overdueCount,
      statusCounts,
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

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const companyFolder = (company?.companyName || 'Company').replace(/[\\/:*?"<>|]/g, '').trim() || 'Company';

    // Tenant isolation: fetch only invoices belonging to the authenticated companyId
    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        companyId,
        deletedAt: null,
      },
      include: { businessPartner: true },
    });

    if (invoices.length === 0) {
      throw new NotFoundException('No valid invoices found for current tenant');
    }

    // Single invoice download: direct PDF stream
    if (invoices.length === 1) {
      const inv = invoices[0];
      const pdfBuffer = await this.pdfEngineService.generateInvoicePdf(inv.id, companyId);
      const safeNo = (inv.invoiceNo || inv.id).replace(/[\\/:*?"<>|]/g, '_').trim();
      const safeCustomer = (inv.businessPartner?.name || 'Customer').replace(/[\\/:*?"<>|]/g, '_').trim();
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeNo} - ${safeCustomer}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      });
      res.end(pdfBuffer);
      return;
    }

    // Multiple invoices: stream ZIP archive with folder structure <CompanyName>/Invoices/<InvoiceNo - CustomerName>.pdf
    const archiverModule: any = await import('archiver');
    const archiverFactory = archiverModule.default || archiverModule;
    const archive = archiverFactory('zip', { zlib: { level: 6 } });

    const todayStr = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${companyFolder}_Invoices_${todayStr}.zip"`,
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
        const safeNo = (inv.invoiceNo || inv.id).replace(/[\\/:*?"<>|]/g, '_').trim();
        const safeCustomer = (inv.businessPartner?.name || 'Customer').replace(/[\\/:*?"<>|]/g, '_').trim();
        const entryPath = `${companyFolder}/Invoices/${safeNo} - ${safeCustomer}.pdf`;
        archive.append(pdfBuffer, { name: entryPath });
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
      where: {
        companyId,
        OR: [{ id }, { invoiceNo: id }],
      },
      include: {
        company: true,
        businessPartner: true,
        items: {
          include: { product: true },
          orderBy: { createdAt: 'asc' },
        },
        receiptAllocations: {
          include: { receipt: true },
          orderBy: { createdAt: 'asc' },
        },
        taxTreatment: true,
        numberingSeries: true,
        salesReturns: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    // Authoritative double-entry ledger journals for this invoice
    const journalEntries = await this.prisma.journalEntry.findMany({
      where: {
        companyId,
        OR: [
          { reference: invoice.invoiceNo },
          { description: { contains: invoice.invoiceNo } },
        ],
      },
      include: {
        lines: {
          include: { account: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Audit trail records for this invoice
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        companyId,
        OR: [
          { tableName: 'invoices' },
          { tableName: 'INVOICES' },
          { tableName: 'Invoice' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const relatedAuditLogs = auditLogs.filter((log: any) => {
      const newV = log.newValues as any;
      const oldV = log.oldValues as any;
      return (
        newV?.id === invoice.id ||
        newV?.invoiceNo === invoice.invoiceNo ||
        oldV?.id === invoice.id ||
        oldV?.invoiceNo === invoice.invoiceNo
      );
    });

    let archiveInfo: any = {};
    if (invoice.deletedAt) {
      const archiveLog = relatedAuditLogs.find((l: any) => 
        l.action === 'DELETE_INVOICE' || l.action === 'ARCHIVE_INVOICE'
      );
      let actorName = archiveLog?.userId || null;
      if (archiveLog?.userId && archiveLog.userId !== 'system') {
        const user = await this.prisma.user.findUnique({
          where: { id: archiveLog.userId },
          select: { name: true, email: true },
        });
        if (user) actorName = user.name || user.email;
      }
      archiveInfo = {
        archivedAt: archiveLog?.createdAt || invoice.deletedAt,
        archiveReason: (archiveLog?.newValues as any)?.reason || (archiveLog?.oldValues as any)?.reason || null,
        archiveActor: actorName,
      };
    }

    return {
      ...invoice,
      ...archiveInfo,
      journalEntries,
      auditLogs: relatedAuditLogs,
    };
  }

  async create(dto: CreateInvoiceDto, txClient?: Prisma.TransactionClient, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const partnerId = (dto.businessPartnerId || dto.customerId)?.trim();
    if (!partnerId) {
      throw new BadRequestException('Customer / Business Partner ID is required');
    }

    // Validate customer exists, belongs to tenant, and is active
    const customer = await this.prisma.businessPartner.findFirst({
      where: { id: partnerId, companyId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${partnerId}" not found`);
    }
    if ((customer as any).status === 'INACTIVE') {
      throw new BadRequestException(`Customer "${customer.name}" is inactive`);
    }

    // Validate date format
    const invoiceDate = new Date(dto.date);
    if (isNaN(invoiceDate.getTime())) {
      throw new BadRequestException('Invalid invoice date provided');
    }
    let dueDate: Date | null = null;
    if (dto.dueDate) {
      dueDate = new Date(dto.dueDate);
      if (isNaN(dueDate.getTime())) {
        throw new BadRequestException('Invalid due date provided');
      }
    }

    // Validate line items
    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    const execute = async (tx: Prisma.TransactionClient) => {
      const docType = this.normalizeInvoiceType(dto.invoiceType || dto.documentType);

      // 1. Concurrency-Safe Document Sequence Allocation
      let invoiceNo = (dto.invoiceNo || dto.documentNo || dto.docNo)?.trim();
      if (!invoiceNo) {
        invoiceNo = await this.sequenceService.generateUniversalSequence(
          companyId,
          docType,
          { seriesId: dto.numberingSeriesId },
          tx
        );
        while (await tx.invoice.findFirst({ where: { companyId, invoiceNo } })) {
          invoiceNo = await this.sequenceService.generateUniversalSequence(
            companyId,
            docType,
            { seriesId: dto.numberingSeriesId },
            tx
          );
        }
      } else {
        // Validate uniqueness if manually provided (including archived/soft-deleted records due to statutory audit trail)
        const existing = await tx.invoice.findFirst({
          where: { companyId, invoiceNo },
        });
        if (existing) {
          if (existing.deletedAt) {
            throw new ConflictException(
              `Document number "${invoiceNo}" has already been used on an archived invoice. Due to statutory tax requirements, document numbers cannot be reused. Please specify a new number.`
            );
          }
          throw new ConflictException(`Document number "${invoiceNo}" already exists`);
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
      const isNonPostingDocType = ['QUOTATION', 'ESTIMATE', 'PROFORMA_INVOICE', 'DELIVERY_CHALLAN'].includes(docType);
      const isReceipt = ['FEE_RECEIPT', 'PAYMENT_RECEIPT', 'OTHER_RECEIPT'].includes(docType);
      const isCreditNote = docType === 'CREDIT_NOTE';

      // 3. Process items and calculate authoritative totals via GSTEngine
      let subTotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      let totalCess = 0;
      const itemsToCreate = [];

      for (const item of dto.items) {
        if (!item || typeof item !== 'object') {
          throw new BadRequestException('Invalid item payload');
        }

        const qty = Number(item.qty);
        if (isNaN(qty) || qty <= 0) {
          throw new BadRequestException(`Item quantity must be greater than zero. Received: ${item.qty}`);
        }

        const rate = Number(item.rate);
        if (isNaN(rate) || rate < 0) {
          throw new BadRequestException(`Item rate cannot be negative. Received: ${item.rate}`);
        }

        let product: any = null;
        if (item.productId) {
          product = await tx.product.findFirst({
            where: { id: item.productId, companyId, deletedAt: null },
          });
          if (!product) {
            throw new BadRequestException(`Product with ID "${item.productId}" not found or has been deleted`);
          }
        }

        const lineTotal = Number((qty * rate).toFixed(2));

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

      subTotal = Number(subTotal.toFixed(2));
      totalCgst = Number(totalCgst.toFixed(2));
      totalSgst = Number(totalSgst.toFixed(2));
      totalIgst = Number(totalIgst.toFixed(2));
      totalCess = Number(totalCess.toFixed(2));
      const taxTotal = isInterState
        ? Number((totalIgst + totalCess).toFixed(2))
        : Number((totalCgst + totalSgst + totalCess).toFixed(2));
      const exactGrandTotal = Number((subTotal + taxTotal).toFixed(2));
      let grandTotal = exactGrandTotal;
      if (dto.grandTotal !== undefined && !isNaN(Number(dto.grandTotal))) {
        const diff = Math.abs(Number(dto.grandTotal) - exactGrandTotal);
        if (diff <= 1.0) {
          grandTotal = Number(Number(dto.grandTotal).toFixed(2));
        }
      } else if (dto.roundOff !== undefined && !isNaN(Number(dto.roundOff))) {
        grandTotal = Number((exactGrandTotal + Number(dto.roundOff)).toFixed(2));
      }

      // Validate payment amount
      let amountPaid = Number(dto.amountPaid || (isReceipt ? grandTotal : 0));
      if (isNaN(amountPaid) || amountPaid < 0) {
        throw new BadRequestException('Amount paid cannot be negative');
      }
      if (amountPaid > grandTotal + 0.01) {
        throw new BadRequestException(`Amount paid (₹${amountPaid.toFixed(2)}) cannot exceed grand total (₹${grandTotal.toFixed(2)})`);
      }
      amountPaid = Math.min(grandTotal, Number(amountPaid.toFixed(2)));

      // Authoritative status calculation
      let invoiceStatus = (dto.status as any);
      if (!invoiceStatus) {
        if (isReceipt || (amountPaid >= grandTotal && grandTotal > 0)) {
          invoiceStatus = 'PAID';
        } else if (amountPaid > 0) {
          invoiceStatus = 'PARTIAL';
        } else if (isNonPostingDocType) {
          invoiceStatus = 'DRAFT';
        } else {
          invoiceStatus = 'SENT';
        }
      } else if (invoiceStatus === 'SENT' && amountPaid >= grandTotal && grandTotal > 0) {
        invoiceStatus = 'PAID';
      } else if (invoiceStatus === 'SENT' && amountPaid > 0) {
        invoiceStatus = 'PARTIAL';
      }

      const isNonPosting = isNonPostingDocType || invoiceStatus === 'DRAFT';

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

      let invoice;
      try {
        invoice = await tx.invoice.create({
          data: {
            companyId,
            businessPartnerId: partnerId,
            commissionRecordId,
            invoiceNo: invoiceNo || '',
            invoiceType: docType,
            placeOfSupply: dto.placeOfSupply || company?.state || '',
            date: invoiceDate,
            dueDate: dueDate,
            status: invoiceStatus,
            subTotal,
            taxTotal,
            grandTotal,
            amountPaid,
            cgstAmount: totalCgst,
            sgstAmount: totalSgst,
            igstAmount: totalIgst,
            cessAmount: totalCess,
            totalTaxAmount: taxTotal,
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
      } catch (err: any) {
        if (err.code === 'P2002') {
          throw new ConflictException(
            `Document number "${invoiceNo}" already exists. Please choose a different document number.`
          );
        }
        throw err;
      }

      // 6. Execute Accounting Policy per Document Type
      if (!isNonPosting) {
        const netReceivableDelta = isCreditNote
          ? -grandTotal
          : Number((grandTotal - amountPaid).toFixed(2));

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
            date: invoiceDate,
            type: docType,
            reference: invoiceNo || '',
            debit: isCreditNote ? 0 : grandTotal,
            credit: isCreditNote ? grandTotal : amountPaid,
            balance: Number((Number(customer?.receivableBalance || 0) + netReceivableDelta).toFixed(2)),
          },
        });

        // C. Update stock ledger if physical inventory items exist
        for (const item of itemsToCreate) {
          if (item.productId) {
            const prod = await tx.product.findUnique({ where: { id: item.productId } });
            if (prod && (prod.isService || !prod.isInventoryItem || !prod.isTrackStock)) {
              continue; // Services and non-inventory items strictly bypass stock ledgers & warehouse updates
            }

            let wh = await tx.warehouse.findFirst({
              where: { companyId, isDefault: true },
            });
            if (!wh) {
              wh = await tx.warehouse.findFirst({
                where: { companyId },
              });
            }
            if (!wh) {
              wh = await tx.warehouse.create({
                data: { companyId, name: 'Main Warehouse', isDefault: true },
              });
            }

            const stock = await tx.stock.findFirst({
              where: { companyId, productId: item.productId, warehouseId: wh.id },
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
                  warehouseId: wh.id,
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

        // D. Post Balanced Journal Entry to General Ledger
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
        const cessAccount = totalCess > 0 ? await getTaxAccount('Output Cess') : null;

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
        if (totalCess > 0 && cessAccount) {
          journalLines.push({
            accountId: cessAccount.id,
            debit: isCreditNote ? totalCess : 0,
            credit: isCreditNote ? 0 : totalCess,
          });
        }

        const exactTaxSum = isInterState ? totalIgst + totalCess : totalCgst + totalSgst + totalCess;
        const exactSum = Number((subTotal + exactTaxSum).toFixed(2));
        const roundOff = Number((grandTotal - exactSum).toFixed(2));

        if (roundOff !== 0) {
          let roundOffAcc = await tx.account.findFirst({
            where: { companyId, name: { in: ['Round Off', 'Rounding Off', 'Round Off Account', 'Rounding Adjustment'] } },
          });
          if (!roundOffAcc) {
            roundOffAcc = await tx.account.create({
              data: { companyId, name: 'Round Off', category: 'EXPENSE', subCategory: 'OTHER_EXPENSE' as any, balance: 0 },
            });
          }
          if (roundOff > 0) {
            journalLines.push({
              accountId: roundOffAcc.id,
              debit: isCreditNote ? roundOff : 0,
              credit: isCreditNote ? 0 : roundOff,
            });
          } else {
            journalLines.push({
              accountId: roundOffAcc.id,
              debit: isCreditNote ? 0 : Math.abs(roundOff),
              credit: isCreditNote ? Math.abs(roundOff) : 0,
            });
          }
        }

        // If paid immediately, record payment receipt and cash/bank accounting entry
        if (amountPaid > 0 && !isCreditNote) {
          const isCash = (dto.paymentMode || '').toUpperCase() === 'CASH';
          const defaultPaymentAccName = isCash ? 'Cash' : 'Bank Accounts';
          let paymentAccount = await tx.account.findFirst({
            where: { companyId, name: defaultPaymentAccName },
          });
          if (!paymentAccount) {
            paymentAccount = await tx.account.create({
              data: {
                companyId,
                name: defaultPaymentAccName,
                category: 'ASSET',
                subCategory: 'CURRENT_ASSET',
                balance: 0,
              },
            });
          }

          journalLines.push({
            accountId: paymentAccount.id,
            debit: amountPaid,
            credit: 0,
          });
          journalLines.push({
            accountId: arAccount.id,
            debit: 0,
            credit: amountPaid,
          });

          // Create Receipt and Allocation record for payment history traceability
          const receiptNo = await this.sequenceService.generateUniversalSequence(
            companyId,
            'PAYMENT_RECEIPT',
            {},
            tx
          );

          let validUserId = userId;
          if (!validUserId) {
            const companyUser = await tx.companyUser.findFirst({ where: { companyId } });
            validUserId = companyUser?.userId;
          }
          if (!validUserId) {
            const fallbackUser = await tx.user.findFirst();
            validUserId = fallbackUser?.id;
          }

          if (validUserId) {
            await tx.receipt.create({
              data: {
                companyId,
                receiptNo,
                date: invoiceDate,
                businessPartnerId: partnerId,
                amount: amountPaid,
                currency: 'INR',
                exchangeRate: 1.0,
                receivedById: validUserId,
                status: 'COMPLETED',
                payments: {
                  create: [
                    {
                      account: { connect: { id: paymentAccount.id } },
                      paymentMethod: (dto.paymentMode as any) || (isCash ? 'CASH' : 'BANK_TRANSFER'),
                      amount: amountPaid,
                      referenceNo: dto.paymentReference || null,
                      notes: `Payment for invoice ${invoiceNo}`,
                    },
                  ],
                },
                allocations: {
                  create: [
                    {
                      invoiceId: invoice.id,
                      amount: amountPaid,
                    },
                  ],
                },
              },
            });
          }
        }

        await this.accountingEngine.postTransaction(
          {
            companyId,
            date: invoiceDate,
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

  async remove(id: string, userId?: string, options?: { allowPurge?: boolean }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }

    if (invoice.companyId !== companyId) {
      throw new ForbiddenException('Unauthorized access to invoice of another tenant.');
    }

    // Statutory compliance lock: Check if IRN is registered on the invoice
    if ((invoice as any).irn) {
      throw new BadRequestException(
        'Statutory tax invoice with registered IRN cannot be permanently deleted. Please issue a Credit Note according to GST compliance regulations.'
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Payment allocations & Receipts
      const allocations = await tx.receiptAllocation.findMany({
        where: { invoiceId: invoice.id },
        include: {
          receipt: {
            include: {
              allocations: true,
              payments: true,
            },
          },
        },
      });

      for (const alloc of allocations) {
        const receipt = alloc.receipt;
        const otherAllocations = (receipt?.allocations || []).filter((a: any) => a.id !== alloc.id);

        // Delete allocation link
        await tx.receiptAllocation.delete({
          where: { id: alloc.id },
        });

        // Do not delete shared receipts or receipts where real money was received.
        // If money was received, preserving the receipt preserves real bank movements
        // and leaves the funds credited as unallocated customer advance on the customer's account.
        const hasRealMoney = Boolean((receipt?.payments && receipt.payments.length > 0) || Number(receipt?.amount || 0) > 0);

        if (receipt && otherAllocations.length === 0 && !hasRealMoney) {
          // Pure dummy / unfunded receipt without money movements
          await tx.customerStatement.deleteMany({
            where: {
              companyId: invoice.companyId,
              reference: receipt.receiptNo,
            },
          });
          await tx.receipt.delete({ where: { id: receipt.id } });
        }
      }

      // 2. Customer statements & Authoritative Receivable Recalculation
      await tx.customerStatement.deleteMany({
        where: {
          companyId: invoice.companyId,
          reference: invoice.invoiceNo,
        },
      });

      if (invoice.businessPartnerId) {
        const remainingInvoices = await tx.invoice.findMany({
          where: {
            businessPartnerId: invoice.businessPartnerId,
            companyId: invoice.companyId,
            deletedAt: null,
            id: { not: invoice.id },
            status: { not: 'CANCELLED' },
          },
        });
        const totalInvoiced = remainingInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);

        const receipts = await tx.receipt.findMany({
          where: {
            businessPartnerId: invoice.businessPartnerId,
            companyId: invoice.companyId,
            deletedAt: null,
            status: { not: 'VOID' },
          },
        });
        const totalReceipts = receipts.reduce((sum, rec) => sum + Number(rec.amount), 0);

        const payments = await tx.transactionPayment.findMany({
          where: {
            businessPartnerId: invoice.businessPartnerId,
            companyId: invoice.companyId,
          },
        });
        const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);

        const bp = await tx.businessPartner.findUnique({
          where: { id: invoice.businessPartnerId },
        });

        let openingBal = 0;
        if (bp?.openingBalanceType === 'DEBIT') {
          openingBal = Number(bp.openingBalanceAmount || 0);
        } else if (bp?.openingBalanceType === 'CREDIT') {
          openingBal = -Number(bp.openingBalanceAmount || 0);
        }

        const authoritativeReceivable = Number(
          (openingBal + totalInvoiced - (totalReceipts + totalPayments)).toFixed(2)
        );

        await tx.businessPartner.update({
          where: { id: invoice.businessPartnerId },
          data: { receivableBalance: authoritativeReceivable },
        });
      }

      // 3. General Ledger Journal entries
      const journalEntries = await tx.journalEntry.findMany({
        where: {
          companyId: invoice.companyId,
          OR: [
            { reference: invoice.invoiceNo },
            { description: { contains: invoice.invoiceNo } },
          ],
        },
        include: { lines: true },
      });

      // Compute net account balance impacts across all lines of these entries
      const accountDeltas = new Map<string, number>();
      for (const je of journalEntries) {
        for (const line of je.lines || []) {
          const current = accountDeltas.get(line.accountId) || 0;
          const delta = Number(line.debit || 0) - Number(line.credit || 0);
          accountDeltas.set(line.accountId, current + delta);
        }
      }

      // Undo net unreversed debits/credits on general ledger accounts
      for (const [accountId, netImpact] of accountDeltas.entries()) {
        if (Math.abs(netImpact) > 0.001) {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { decrement: netImpact } },
          });
        }
      }

      for (const je of journalEntries) {
        await tx.journalLine.deleteMany({ where: { journalEntryId: je.id } });
        await tx.journalEntry.delete({ where: { id: je.id } });
      }

      // 4. Stock ledger & Physical inventory
      const stockLedgers = await tx.stockLedger.findMany({
        where: { referenceId: invoice.id },
      });

      for (const ledger of stockLedgers) {
        if (ledger.referenceType === 'INVOICE' || ledger.referenceType === 'SALE') {
          const qtyToRestore = Number(ledger.quantityChange) * -1;
          const stock = await tx.stock.findFirst({
            where: { companyId: invoice.companyId, productId: ledger.productId },
          });
          if (stock) {
            const newQty = Number(stock.quantity) + qtyToRestore;
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: newQty, availableQuantity: newQty },
            });
          }
        }
      }

      await tx.stockLedger.deleteMany({
        where: { referenceId: invoice.id },
      });

      // 5. Commission record
      if (invoice.commissionRecordId) {
        await tx.commissionRecord.delete({
          where: { id: invoice.commissionRecordId },
        }).catch(() => {});
      }

      // 6. Invoice items & Invoice header row
      await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });

      // 7. Audit Log
      const auditAction = options?.allowPurge
        ? 'PERMANENT_DELETE_INVOICE_PURGE'
        : invoice.status === 'DRAFT'
        ? (invoice.deletedAt ? 'DELETE_ARCHIVED_INVOICE' : 'DELETE_DRAFT_INVOICE')
        : 'PERMANENT_DELETE_INVOICE';

      await tx.auditLog.create({
        data: {
          companyId: invoice.companyId,
          userId: userId || 'system',
          action: auditAction,
          tableName: 'invoices',
          oldValues: {
            id: invoice.id,
            invoiceNo: invoice.invoiceNo,
            grandTotal: Number(invoice.grandTotal || 0),
            amountPaid: Number(invoice.amountPaid || 0),
            status: invoice.status,
            deletedAt: invoice.deletedAt,
          },
          newValues: Prisma.DbNull,
        },
      });

      await tx.invoice.delete({ where: { id: invoice.id } });

      return {
        success: true,
        message: 'Invoice deleted successfully. Related balances updated.',
      };
    }, { timeout: 35000, maxWait: 10000 });
  }

  async cancel(id: string, dto: CancelInvoiceDto, userId?: string, archiveOnComplete: boolean = false) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }

    if (invoice.status === 'CANCELLED' && !archiveOnComplete) {
      throw new BadRequestException(`Invoice ${invoice.invoiceNo} is already cancelled.`);
    }

    if (!dto?.reason || !dto.reason.trim()) {
      throw new BadRequestException('A mandatory reason is required to cancel an issued invoice.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Unlink payment allocations without deleting receipts or refunding money silently
      const allocations = await tx.receiptAllocation.findMany({
        where: { invoiceId: invoice.id },
        include: { receipt: true },
      });

      for (const alloc of allocations) {
        await tx.receiptAllocation.delete({
          where: { id: alloc.id },
        });
      }

      // 2. Revert customer receivable balance:
      // Decrementing by invoice.grandTotal reverses the invoice receivable.
      // Any payments made remain on the customer ledger as unallocated credit / advance.
      if (invoice.businessPartnerId) {
        const customer = await tx.businessPartner.findUnique({
          where: { id: invoice.businessPartnerId },
        });
        const currentBal = Number(customer?.receivableBalance || 0);
        const newBal = Number((currentBal - Number(invoice.grandTotal)).toFixed(2));

        await tx.businessPartner.update({
          where: { id: invoice.businessPartnerId },
          data: {
            receivableBalance: {
              decrement: Number(invoice.grandTotal),
            },
          },
        });

        await tx.customerStatement.create({
          data: {
            companyId: invoice.companyId,
            businessPartnerId: invoice.businessPartnerId,
            date: new Date(),
            type: 'INVOICE_CANCELLATION',
            reference: invoice.invoiceNo,
            debit: 0,
            credit: Number(invoice.grandTotal),
            balance: newBal,
          },
        });
      }

      // 3. Find original journal entries and create reversals using AccountingEngineService
      const originalEntries = await tx.journalEntry.findMany({
        where: { reference: invoice.invoiceNo, companyId: invoice.companyId },
      });

      for (const entry of originalEntries) {
        // Prevent duplicate reversals
        const alreadyReversed = await tx.journalEntry.findFirst({
          where: { companyId: invoice.companyId, reference: `REV-${entry.id}` },
        });
        if (!alreadyReversed) {
          await this.accountingEngine.reverseTransaction(
            entry.id,
            invoice.companyId,
            tx,
            `Cancellation reversal for invoice ${invoice.invoiceNo}: ${dto.reason.trim()}`
          );
        }
      }

      // 4. Revert Stock Ledger / physical stock
      const stockLedgers = await tx.stockLedger.findMany({
        where: {
          referenceId: invoice.id,
          referenceType: { in: ['INVOICE', 'INVOICE_RESTORE', 'SALE'] },
        },
      });

      for (const ledger of stockLedgers) {
        const changeQty = Number(ledger.quantityChange) * -1; // reverse the decrement

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
              notes: `Cancellation of Invoice ${invoice.invoiceNo}: ${dto.reason.trim()}`,
              referenceId: invoice.id,
              referenceType: 'INVOICE_CANCELLATION',
            },
          });
        }
      }

      // 5. Update invoice record (preserve document number and history)
      const invoiceDataToUpdate: any = {
        amountPaid: 0,
      };
      if (archiveOnComplete) {
        invoiceDataToUpdate.deletedAt = new Date();
      } else {
        invoiceDataToUpdate.status = 'CANCELLED';
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: invoiceDataToUpdate,
      });

      // 6. Record in Audit Log
      await tx.auditLog.create({
        data: {
          companyId: invoice.companyId,
          userId: userId || 'system',
          action: archiveOnComplete ? 'ARCHIVE_INVOICE' : 'CANCEL_INVOICE',
          tableName: 'invoices',
          oldValues: {
            id: invoice.id,
            invoiceNo: invoice.invoiceNo,
            grandTotal: Number(invoice.grandTotal),
            amountPaid: Number(invoice.amountPaid),
            status: invoice.status,
            receiptAllocations: allocations.map((a) => ({
              receiptId: a.receiptId,
              receiptNo: a.receipt?.receiptNo,
              amount: Number(a.amount),
            })),
          },
          newValues: {
            id: updated.id,
            status: updated.status,
            deletedAt: updated.deletedAt,
            reason: dto.reason.trim(),
            ...(archiveOnComplete
              ? { archivedAt: new Date().toISOString() }
              : { cancelledAt: new Date().toISOString() }),
          },
        },
      });

      return {
        success: true,
        message: archiveOnComplete
          ? 'Invoice archived successfully. Document number is preserved.'
          : 'Invoice corrected successfully. You can now create the replacement invoice.',
        data: updated,
      };
    }, { timeout: 35000, maxWait: 10000 });
  }

  async correct(id: string, dto?: { reason?: string; archiveOnComplete?: boolean }, userId?: string) {
    return this.cancel(
      id,
      { reason: dto?.reason || 'Invoice correction and financial reversal' },
      userId,
      Boolean(dto?.archiveOnComplete)
    );
  }

  async archive(id: string, dto?: { reason?: string }, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }

    if (invoice.deletedAt) {
      throw new BadRequestException('Invoice is already archived.');
    }

    const amountPaid = Number(invoice.amountPaid || 0);
    const hasAllocations = Boolean(invoice.receiptAllocations && invoice.receiptAllocations.length > 0);
    const hasJournals = Boolean(invoice.journalEntries && invoice.journalEntries.length > 0);
    const hasFinancialRecords = amountPaid > 0 || hasAllocations || hasJournals || (invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED');

    if (!hasFinancialRecords) {
      return this.prisma.$transaction(async (tx) => {
        const archived = await tx.invoice.update({
          where: { id },
          data: { deletedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            companyId,
            userId: userId || 'system',
            action: 'ARCHIVE_INVOICE',
            tableName: 'invoices',
            oldValues: { id: invoice.id, invoiceNo: invoice.invoiceNo, status: invoice.status },
            newValues: { id: invoice.id, deletedAt: archived.deletedAt, reason: dto?.reason || 'Archived draft' },
          },
        });

        return {
          success: true,
          message: 'Invoice archived successfully.',
          data: archived,
        };
      });
    }

    // For issued invoices with financial records, perform statutory correction and archive
    return this.cancel(id, { reason: dto?.reason || 'Archived by user' }, userId, true);
  }

  async update(id: string, dto: UpdateInvoiceDto, userId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }

    if (invoice.deletedAt) {
      throw new BadRequestException('Cannot edit an archived invoice. Please restore it first.');
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only draft invoices can be edited. Issued invoices are legally locked.');
    }

    const partnerId = (dto.businessPartnerId || dto.customerId || invoice.businessPartnerId)?.trim();
    const customer = await this.prisma.businessPartner.findFirst({
      where: { id: partnerId, companyId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${partnerId}" not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const docType = this.normalizeInvoiceType(dto.invoiceType || dto.documentType || invoice.invoiceType);
      const invoiceDate = dto.date ? new Date(dto.date) : invoice.date;
      const dueDate = dto.dueDate ? new Date(dto.dueDate) : invoice.dueDate;

      // Category & Tax Treatment
      let categorySnapshot = invoice.categorySnapshot;
      let taxSnapshot = invoice.taxSnapshot;
      let overrideTaxPref = dto.taxPreference;

      if (dto.invoiceCategoryId) {
        const category = await tx.invoiceCategory.findUnique({
          where: { id: dto.invoiceCategoryId },
          include: { taxTreatment: true, numberingSeries: true },
        });
        if (category) {
          categorySnapshot = category as any;
          if (category.taxTreatment?.treatmentType && !overrideTaxPref) {
            overrideTaxPref = category.taxTreatment.treatmentType;
          }
        }
      }

      const company = await tx.company.findUnique({ where: { id: companyId } });
      const companyState = company?.state?.trim().toLowerCase() || '';
      const supplyState = (dto.placeOfSupply || invoice.placeOfSupply || companyState).trim().toLowerCase();
      const isInterState = supplyState && companyState && supplyState !== companyState;
      const bpTaxPreference = customer?.taxPreference || 'TAXABLE';

      // Process Items
      const itemsSource = dto.items || (invoice.items?.map((it: any) => ({
        productId: it.productId,
        description: it.description,
        qty: Number(it.qty),
        rate: Number(it.rate),
        taxPercent: Number(it.taxPercent),
        taxPreference: it.taxPreference,
      }))) || [];

      if (!itemsSource || itemsSource.length === 0) {
        throw new BadRequestException('At least one line item is required');
      }

      const itemsToCreate: any[] = [];
      let subTotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      let totalCess = 0;

      for (const item of itemsSource) {
        const qty = Number(item.qty);
        if (isNaN(qty) || qty <= 0) {
          throw new BadRequestException(`Item quantity must be greater than zero. Received: ${item.qty}`);
        }
        const rate = Number(item.rate);
        if (isNaN(rate) || rate < 0) {
          throw new BadRequestException(`Item rate cannot be negative. Received: ${item.rate}`);
        }

        let product: any = null;
        if (item.productId) {
          product = await tx.product.findFirst({
            where: { id: item.productId, companyId, deletedAt: null },
          });
        }

        const lineTotal = Number((qty * rate).toFixed(2));
        let lineTaxPref = item.taxPreference || overrideTaxPref || product?.taxPreference || bpTaxPreference;
        if (docType === 'BILL_OF_SUPPLY') {
          lineTaxPref = 'EXEMPT';
        }

        const taxRate = item.taxPercent !== undefined
          ? Number(item.taxPercent)
          : product?.gstRate !== undefined
          ? Number(product.gstRate)
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

      subTotal = Number(subTotal.toFixed(2));
      totalCgst = Number(totalCgst.toFixed(2));
      totalSgst = Number(totalSgst.toFixed(2));
      totalIgst = Number(totalIgst.toFixed(2));
      totalCess = Number(totalCess.toFixed(2));
      const taxTotal = isInterState
        ? Number((totalIgst + totalCess).toFixed(2))
        : Number((totalCgst + totalSgst + totalCess).toFixed(2));
      const grandTotal = Number((subTotal + taxTotal).toFixed(2));

      let targetStatus = dto.status || invoice.status;
      let amountPaid = Number(dto.amountPaid !== undefined ? dto.amountPaid : invoice.amountPaid);
      if (targetStatus === 'SENT') {
        if (amountPaid >= grandTotal && grandTotal > 0) {
          targetStatus = 'PAID';
        } else if (amountPaid > 0) {
          targetStatus = 'PARTIAL';
        }
      }

      // Replace items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          businessPartnerId: partnerId,
          placeOfSupply: dto.placeOfSupply || invoice.placeOfSupply,
          date: invoiceDate,
          dueDate: dueDate,
          status: targetStatus as any,
          subTotal,
          taxTotal,
          grandTotal,
          amountPaid,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          cessAmount: totalCess,
          totalTaxAmount: taxTotal,
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
        include: { items: true, businessPartner: true },
      });

      // If transitioning to an issued status, execute accounting and inventory policies
      if (targetStatus !== 'DRAFT') {
        const netReceivableDelta = Number((grandTotal - amountPaid).toFixed(2));

        if (customer && netReceivableDelta !== 0) {
          await tx.businessPartner.update({
            where: { id: partnerId },
            data: { receivableBalance: { increment: netReceivableDelta } },
          });
        }

        await tx.customerStatement.create({
          data: {
            companyId,
            businessPartnerId: partnerId,
            date: invoiceDate,
            type: docType,
            reference: invoice.invoiceNo,
            debit: grandTotal,
            credit: amountPaid,
            balance: Number((Number(customer?.receivableBalance || 0) + netReceivableDelta).toFixed(2)),
          },
        });

        // Stock deduction
        for (const item of itemsToCreate) {
          if (item.productId) {
            const prod = await tx.product.findUnique({ where: { id: item.productId } });
            if (prod && (prod.isService || !prod.isInventoryItem || !prod.isTrackStock)) continue;

            let wh = await tx.warehouse.findFirst({ where: { companyId, isDefault: true } })
              || await tx.warehouse.findFirst({ where: { companyId } })
              || await tx.warehouse.create({ data: { companyId, name: 'Main Warehouse', isDefault: true } });

            const stock = await tx.stock.findFirst({ where: { companyId, productId: item.productId, warehouseId: wh.id } });
            const currentQty = stock ? Number(stock.quantity) : 0;
            const newQty = currentQty - item.qty;

            if (stock) {
              await tx.stock.update({ where: { id: stock.id }, data: { quantity: newQty, availableQuantity: newQty } });
            } else {
              await tx.stock.create({ data: { companyId, productId: item.productId, warehouseId: wh.id, quantity: newQty, availableQuantity: newQty } });
            }

            await tx.stockLedger.create({
              data: {
                companyId,
                productId: item.productId,
                type: 'SALE',
                quantityBefore: currentQty,
                quantityChange: -item.qty,
                quantityAfter: newQty,
                notes: `Issued via ${docType} ${invoice.invoiceNo}`,
                referenceId: invoice.id,
                referenceType: 'INVOICE',
              },
            });
          }
        }

        // Post balanced Journal Entry
        let arAccount = await tx.account.findFirst({ where: { companyId, name: { in: ['Accounts Receivable', 'Trade Receivables'] } } })
          || await tx.account.create({ data: { companyId, name: 'Accounts Receivable', category: 'ASSET', subCategory: 'CURRENT_ASSET' as any, balance: 0 } });
        
        const defaultRevenueName = updated.invoiceType === 'FEE_RECEIPT' ? 'Fee Revenue' : 'Sales Revenue';
        let revenueAccount = await tx.account.findFirst({ where: { companyId, name: { in: [defaultRevenueName, 'Sales Revenue'] } } })
          || await tx.account.create({ data: { companyId, name: defaultRevenueName, category: 'REVENUE', subCategory: 'SALES_REVENUE' as any, balance: 0 } });

        const finalGrandTotal = Number(Number(updated.grandTotal || 0).toFixed(2));
        const finalSubTotal = Number(Number(updated.subTotal || 0).toFixed(2));
        const cgst = Number(Number(totalCgst || updated.cgstAmount || 0).toFixed(2));
        const sgst = Number(Number(totalSgst || updated.sgstAmount || 0).toFixed(2));
        const igst = Number(Number(totalIgst || updated.igstAmount || 0).toFixed(2));
        const cess = Number(Number(totalCess || updated.cessAmount || 0).toFixed(2));
        const totalTax = Number((cgst + sgst + igst + cess).toFixed(2));

        const exactSum = Number((finalSubTotal + totalTax).toFixed(2));
        const roundOff = Number((finalGrandTotal - exactSum).toFixed(2));

        const journalLines: any[] = [
          { accountId: arAccount.id, debit: finalGrandTotal, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: finalSubTotal },
        ];

        const getTaxAccount = async (name: string, altName?: string) => {
          let acc = await tx.account.findFirst({ where: { companyId, name: { in: [name, altName || ''].filter(Boolean) } } });
          if (!acc) acc = await tx.account.create({ data: { companyId, name, category: 'LIABILITY', subCategory: 'CURRENT_LIABILITY' as any, balance: 0 } });
          return acc;
        };

        if (cgst > 0) journalLines.push({ accountId: (await getTaxAccount('Output CGST', 'CGST Output Payable')).id, debit: 0, credit: cgst });
        if (sgst > 0) journalLines.push({ accountId: (await getTaxAccount('Output SGST', 'SGST Output Payable')).id, debit: 0, credit: sgst });
        if (igst > 0) journalLines.push({ accountId: (await getTaxAccount('Output IGST', 'IGST Output Payable')).id, debit: 0, credit: igst });
        if (cess > 0) journalLines.push({ accountId: (await getTaxAccount('Output Cess')).id, debit: 0, credit: cess });

        if (roundOff !== 0) {
          let roundOffAcc = await tx.account.findFirst({
            where: { companyId, name: { in: ['Round Off', 'Rounding Off', 'Round Off Account', 'Rounding Adjustment'] } },
          });
          if (!roundOffAcc) {
            roundOffAcc = await tx.account.create({
              data: { companyId, name: 'Round Off', category: 'EXPENSE', subCategory: 'OTHER_EXPENSE' as any, balance: 0 },
            });
          }
          if (roundOff > 0) {
            journalLines.push({ accountId: roundOffAcc.id, debit: 0, credit: roundOff });
          } else {
            journalLines.push({ accountId: roundOffAcc.id, debit: Math.abs(roundOff), credit: 0 });
          }
        }

        await this.accountingEngine.postTransaction(
          {
            companyId,
            date: invoiceDate,
            reference: invoice.invoiceNo,
            description: `Invoice ${invoice.invoiceNo} issued`,
            lines: journalLines,
          },
          tx
        );
      }

      return updated;
    });
  }

  async restore(id: string, userId?: string, reason?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }

    if (!invoice.deletedAt) {
      throw new BadRequestException('Invoice is not archived.');
    }

    // Check whether another record conflicts with its document number
    const activeConflict = await this.prisma.invoice.findFirst({
      where: {
        companyId,
        invoiceNo: invoice.invoiceNo,
        deletedAt: null,
        id: { not: id },
      },
    });
    if (activeConflict) {
      throw new ConflictException(
        `Cannot restore invoice: Document number "${invoice.invoiceNo}" is already in use by an active invoice. Due to statutory tax requirements, document numbers cannot be duplicated.`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const restored = await tx.invoice.update({
        where: { id },
        data: { deletedAt: null },
        include: { items: true, businessPartner: true },
      });

      // If it was an issued invoice prior to deletion, restore accounting and stock
      if (invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED') {
        const netReceivableDelta = Number((Number(invoice.grandTotal) - Number(invoice.amountPaid)).toFixed(2));
        if (invoice.businessPartnerId && netReceivableDelta !== 0) {
          await tx.businessPartner.update({
            where: { id: invoice.businessPartnerId },
            data: { receivableBalance: { increment: netReceivableDelta } },
          });
        }

        // Re-deduct physical inventory
        for (const item of invoice.items) {
          if (item.productId) {
            const prod = await tx.product.findUnique({ where: { id: item.productId } });
            if (prod && (prod.isService || !prod.isInventoryItem || !prod.isTrackStock)) continue;

            const wh = await tx.warehouse.findFirst({ where: { companyId, isDefault: true } })
              || await tx.warehouse.findFirst({ where: { companyId } });

            if (wh) {
              const stock = await tx.stock.findFirst({ where: { companyId, productId: item.productId, warehouseId: wh.id } });
              const currentQty = stock ? Number(stock.quantity) : 0;
              const newQty = currentQty - Number(item.qty);

              if (stock) {
                await tx.stock.update({ where: { id: stock.id }, data: { quantity: newQty, availableQuantity: newQty } });
              }

              await tx.stockLedger.create({
                data: {
                  companyId,
                  productId: item.productId,
                  type: 'SALE',
                  quantityBefore: currentQty,
                  quantityChange: -Number(item.qty),
                  quantityAfter: newQty,
                  notes: `Restoration of Invoice ${invoice.invoiceNo}`,
                  referenceId: invoice.id,
                  referenceType: 'INVOICE_RESTORE',
                },
              });
            }
          }
        }

        // Check if journal entry already exists for this invoice (prevent duplicate entries on retries)
        const existingJournal = await tx.journalEntry.findFirst({
          where: { companyId, reference: invoice.invoiceNo },
        });

        if (!existingJournal) {
          // Re-post General Ledger
          let arAccount = await tx.account.findFirst({ where: { companyId, name: { in: ['Accounts Receivable', 'Trade Receivables'] } } })
            || await tx.account.create({ data: { companyId, name: 'Accounts Receivable', category: 'ASSET', subCategory: 'CURRENT_ASSET' as any, balance: 0 } });
          
          const defaultRevenueName = invoice.invoiceType === 'FEE_RECEIPT' ? 'Fee Revenue' : 'Sales Revenue';
          let revenueAccount = await tx.account.findFirst({ where: { companyId, name: { in: [defaultRevenueName, 'Sales Revenue'] } } })
            || await tx.account.create({ data: { companyId, name: defaultRevenueName, category: 'REVENUE', subCategory: 'SALES_REVENUE' as any, balance: 0 } });

          const grandTotal = Number(Number(invoice.grandTotal || 0).toFixed(2));
          const subTotal = Number(Number(invoice.subTotal || 0).toFixed(2));
          const cgst = Number(Number(invoice.cgstAmount || 0).toFixed(2));
          const sgst = Number(Number(invoice.sgstAmount || 0).toFixed(2));
          const igst = Number(Number(invoice.igstAmount || 0).toFixed(2));
          const cess = Number(Number(invoice.cessAmount || 0).toFixed(2));
          const totalTax = Number((cgst + sgst + igst + cess).toFixed(2));

          const exactSum = Number((subTotal + totalTax).toFixed(2));
          const roundOff = Number((grandTotal - exactSum).toFixed(2));

          const journalLines: any[] = [
            { accountId: arAccount.id, debit: grandTotal, credit: 0 },
            { accountId: revenueAccount.id, debit: 0, credit: subTotal },
          ];

          const getTaxAccount = async (name: string, altName?: string) => {
            let acc = await tx.account.findFirst({ where: { companyId, name: { in: [name, altName || ''].filter(Boolean) } } });
            if (!acc) acc = await tx.account.create({ data: { companyId, name, category: 'LIABILITY', subCategory: 'CURRENT_LIABILITY' as any, balance: 0 } });
            return acc;
          };

          if (cgst > 0) journalLines.push({ accountId: (await getTaxAccount('Output CGST', 'CGST Output Payable')).id, debit: 0, credit: cgst });
          if (sgst > 0) journalLines.push({ accountId: (await getTaxAccount('Output SGST', 'SGST Output Payable')).id, debit: 0, credit: sgst });
          if (igst > 0) journalLines.push({ accountId: (await getTaxAccount('Output IGST', 'IGST Output Payable')).id, debit: 0, credit: igst });
          if (cess > 0) journalLines.push({ accountId: (await getTaxAccount('Output Cess')).id, debit: 0, credit: cess });

          if (roundOff !== 0) {
            let roundOffAcc = await tx.account.findFirst({
              where: { companyId, name: { in: ['Round Off', 'Rounding Off', 'Round Off Account', 'Rounding Adjustment'] } },
            });
            if (!roundOffAcc) {
              roundOffAcc = await tx.account.create({
                data: { companyId, name: 'Round Off', category: 'EXPENSE', subCategory: 'OTHER_EXPENSE' as any, balance: 0 },
              });
            }
            if (roundOff > 0) {
              journalLines.push({ accountId: roundOffAcc.id, debit: 0, credit: roundOff });
            } else {
              journalLines.push({ accountId: roundOffAcc.id, debit: Math.abs(roundOff), credit: 0 });
            }
          }

          try {
            await this.accountingEngine.postTransaction(
              {
                companyId,
                date: invoice.date,
                reference: invoice.invoiceNo,
                description: `Restored invoice ${invoice.invoiceNo}`,
                lines: journalLines,
              },
              tx
            );
          } catch (postErr: any) {
            this.logger.error(
              `Failed to post balanced journal for restored invoice ${invoice.invoiceNo}: ${postErr?.message}`,
              postErr?.stack
            );
            throw new BadRequestException(
              'Invoice could not be restored because its accounting entries do not balance. Please try again after the accounting issue is fixed.'
            );
          }
        }
      }

      // Record in Audit Log
      await tx.auditLog.create({
        data: {
          companyId,
          userId: userId || 'system',
          action: 'RESTORE_INVOICE',
          tableName: 'invoices',
          oldValues: {
            id: invoice.id,
            invoiceNo: invoice.invoiceNo,
            deletedAt: invoice.deletedAt,
          },
          newValues: {
            id: restored.id,
            deletedAt: null,
            reason: reason || 'Restored by user',
            restoredAt: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: 'Invoice restored successfully.',
        data: restored,
      };
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
      let candidate = `${prefix}-00001`;
      let count = 1;
      while (await this.prisma.invoice.findFirst({ where: { companyId, invoiceNo: candidate } })) {
        count++;
        candidate = `${prefix}-${String(count).padStart(5, '0')}`;
      }
      return { nextNumber: candidate };
    }

    let nextNum = sequence.currentNumber + 1;
    let candidate = `${prefix}-${String(nextNum).padStart(sequence.padding || 5, '0')}`;
    while (await this.prisma.invoice.findFirst({ where: { companyId, invoiceNo: candidate } })) {
      nextNum++;
      candidate = `${prefix}-${String(nextNum).padStart(sequence.padding || 5, '0')}`;
    }
    return { nextNumber: candidate };
  }

  normalizeInvoiceType(raw?: string): InvoiceType {
    if (!raw) return 'TAX_INVOICE';
    const norm = raw.trim().toUpperCase();
    switch (norm) {
      case 'INVOICE':
      case 'TAX_INVOICE':
        return 'TAX_INVOICE';
      case 'RETAIL_INVOICE':
      case 'B2C':
        return 'RETAIL_INVOICE';
      case 'BILL_OF_SUPPLY':
      case 'NO_TAX':
      case 'EXEMPT_SUPPLY':
      case 'NIL_RATED_INVOICE':
      case 'EXPORT_INVOICE':
      case 'SEZ_INVOICE':
        return 'BILL_OF_SUPPLY';
      case 'PROFORMA':
      case 'PROFORMA_INVOICE':
        return 'PROFORMA_INVOICE';
      case 'CREDIT_NOTE':
        return 'CREDIT_NOTE';
      case 'DEBIT_NOTE':
        return 'DEBIT_NOTE';
      case 'DELIVERY_CHALLAN':
      case 'DELIVERY_NOTE':
        return 'DELIVERY_CHALLAN';
      case 'QUOTATION':
        return 'QUOTATION';
      case 'ESTIMATE':
        return 'ESTIMATE';
      case 'PURCHASE_INVOICE':
        return 'PURCHASE_INVOICE';
      case 'PURCHASE_RETURN':
        return 'PURCHASE_RETURN';
      case 'FEE_RECEIPT':
        return 'FEE_RECEIPT';
      case 'PAYMENT_RECEIPT':
      case 'RECEIPT':
        return 'PAYMENT_RECEIPT';
      case 'OTHER_RECEIPT':
        return 'OTHER_RECEIPT';
      default:
        return 'TAX_INVOICE';
    }
  }
}
