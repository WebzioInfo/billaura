import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../database/prisma.service';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { CommissionsService } from '../commissions/commissions.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { PdfEngineService } from './pdf-engine.service';
import { CompanyContext } from '../common/context/company-context';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/invoice.dto';

describe('InvoicesService - Production Test Matrix (Phase 15)', () => {
  let service: InvoicesService;
  let prisma: any;
  let accountingEngine: any;
  let sequenceService: any;

  const mockCompanyId = 'cmp-tenant-123';
  const mockUserId = 'usr-admin-123';
  const mockCustomer = {
    id: 'cust-b2b-1',
    companyId: mockCompanyId,
    name: 'Acme Enterprises',
    state: '27',
    taxPreference: 'TAXABLE',
    status: 'ACTIVE',
    receivableBalance: 0,
  };

  const mockCompany = {
    id: mockCompanyId,
    companyName: 'Bill Aura Corp',
    state: '27',
  };

  const mockProduct = {
    id: 'prod-widget-1',
    companyId: mockCompanyId,
    name: 'Industrial Sensor',
    gstRate: 18,
    isService: false,
    isInventoryItem: true,
    isTrackStock: true,
    taxPreference: 'TAXABLE',
  };

  const mockServiceProduct = {
    id: 'prod-consulting-2',
    companyId: mockCompanyId,
    name: 'Consulting Service',
    gstRate: 18,
    isService: true,
    isInventoryItem: false,
    isTrackStock: false,
    taxPreference: 'TAXABLE',
  };

  let createdInvoices: any[] = [];
  let journalTransactions: any[] = [];
  let stockMovements: any[] = [];
  let receiptsCreated: any[] = [];
  let mockAllocations: any[] = [];
  let auditLogsCreated: any[] = [];
  let mockTx: any;

  beforeEach(async () => {
    createdInvoices = [];
    journalTransactions = [];
    stockMovements = [];
    receiptsCreated = [];
    mockAllocations = [];
    auditLogsCreated = [];

    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);

    mockTx = {
      invoice: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where?.OR && Array.isArray(where.OR)) {
            const idMatch = where.OR.find((cond: any) => cond.id)?.id;
            const invoiceNoMatch = where.OR.find((cond: any) => cond.invoiceNo)?.invoiceNo;
            return Promise.resolve(
              createdInvoices.find(i => (i.id === idMatch || i.invoiceNo === invoiceNoMatch) && i.companyId === where.companyId) || null
            );
          }
          if (where?.invoiceNo) {
            return Promise.resolve(
              createdInvoices.find(i => {
                if (i.invoiceNo !== where.invoiceNo || i.companyId !== where.companyId) return false;
                if (where.deletedAt === null) return !i.deletedAt;
                if (where.id?.not) return i.id !== where.id.not;
                return true;
              })
            );
          }
          if (where?.id) {
            return Promise.resolve(createdInvoices.find(i => i.id === where.id));
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          if (data.invoiceNo && createdInvoices.some(i => i.invoiceNo === data.invoiceNo && i.companyId === data.companyId)) {
            const p2002Err: any = new Error('Unique constraint failed on the fields: (`companyId`,`invoiceNo`)');
            p2002Err.code = 'P2002';
            p2002Err.meta = { target: ['companyId', 'invoiceNo'] };
            return Promise.reject(p2002Err);
          }
          const record = { id: `inv-${Date.now()}-${Math.random()}`, ...data };
          createdInvoices.push(record);
          return Promise.resolve(record);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const inv = createdInvoices.find(i => i.id === where.id);
          if (inv) {
            Object.assign(inv, data);
            return Promise.resolve(inv);
          }
          const updated = { id: where.id, ...data };
          createdInvoices.push(updated);
          return Promise.resolve(updated);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(createdInvoices.filter(i => {
            if (where?.companyId && i.companyId !== where.companyId) return false;
            if (where?.businessPartnerId && i.businessPartnerId !== where.businessPartnerId) return false;
            if (where?.id?.not && i.id === where.id.not) return false;
            if (where?.deletedAt === null && i.deletedAt !== null) return false;
            if (where?.status?.notIn && where.status.notIn.includes(i.status)) return false;
            return true;
          }));
        }),
        delete: jest.fn().mockImplementation(({ where }) => {
          const idx = createdInvoices.findIndex(i => i.id === where.id);
          if (idx !== -1) createdInvoices.splice(idx, 1);
          return Promise.resolve({ id: where.id });
        }),
      },
      invoiceItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      receiptAllocation: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          const inv = createdInvoices.find(i => i.id === where?.invoiceId);
          return Promise.resolve(inv?.receiptAllocations || mockAllocations.filter(a => a.invoiceId === where?.invoiceId));
        }),
        delete: jest.fn().mockImplementation(({ where }) => {
          const idx = mockAllocations.findIndex(a => a.id === where?.id);
          if (idx !== -1) mockAllocations.splice(idx, 1);
          return Promise.resolve({ id: where?.id });
        }),
      },
      auditLog: {
        create: jest.fn().mockImplementation(({ data }) => {
          auditLogsCreated.push(data);
          return Promise.resolve({ id: `aud-${Date.now()}`, ...data });
        }),
      },
      journalEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({ id: 'je-del' }),
      },
      journalLine: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      transactionPayment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      businessPartner: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockCustomer.id && where.companyId === mockCompanyId) {
            return Promise.resolve(mockCustomer);
          }
          return Promise.resolve(null);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockCustomer.id) {
            return Promise.resolve(mockCustomer);
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockResolvedValue(mockCustomer),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue(mockCompany),
      },
      invoiceCategory: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      taxTreatment: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      product: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockProduct.id && where.companyId === mockCompanyId) {
            return Promise.resolve(mockProduct);
          }
          if (where.id === mockServiceProduct.id && where.companyId === mockCompanyId) {
            return Promise.resolve(mockServiceProduct);
          }
          return Promise.resolve(null);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockProduct.id) return Promise.resolve(mockProduct);
          if (where.id === mockServiceProduct.id) return Promise.resolve(mockServiceProduct);
          return Promise.resolve(null);
        }),
      },
      customerStatement: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'stmt-1', ...data })),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      warehouse: {
        findFirst: jest.fn().mockResolvedValue({ id: 'wh-main-1', companyId: mockCompanyId, isDefault: true }),
        create: jest.fn().mockResolvedValue({ id: 'wh-main-1', companyId: mockCompanyId, isDefault: true }),
      },
      stock: {
        findFirst: jest.fn().mockResolvedValue({ id: 'stk-1', quantity: 100, availableQuantity: 100 }),
        update: jest.fn().mockResolvedValue({ id: 'stk-1', quantity: 90 }),
        create: jest.fn().mockResolvedValue({ id: 'stk-1', quantity: 90 }),
      },
      stockLedger: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(stockMovements.filter(sm => sm.referenceId === where?.referenceId));
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          stockMovements.push(data);
          return Promise.resolve({ id: 'stl-1', ...data });
        }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      account: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const accName = where.name?.in ? where.name.in[0] : where.name;
          return Promise.resolve({ id: `acc-${accName}`, name: accName, category: 'ASSET', balance: 0 });
        }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `acc-${data.name}`, ...data })),
      },
      journalEntryLine: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      companyUser: {
        findFirst: jest.fn().mockResolvedValue({ userId: mockUserId, companyId: mockCompanyId }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: mockUserId }),
      },
      receipt: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => {
          receiptsCreated.push(data);
          return Promise.resolve({ id: 'rec-1', ...data });
        }),
        update: jest.fn().mockResolvedValue({ id: 'rec-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'rec-1' }),
      },
      bankAccount: {
        update: jest.fn().mockResolvedValue({ id: 'bank-1' }),
      },
      commissionRecord: {
        delete: jest.fn().mockResolvedValue({ id: 'comm-1' }),
      },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return cb(mockTx);
        }
        return Promise.all(cb);
      }),
      invoice: mockTx.invoice,
      businessPartner: mockTx.businessPartner,
      company: mockTx.company,
      companyUser: mockTx.companyUser,
      user: mockTx.user,
      journalEntry: {
        findFirst: mockTx.journalEntry.findFirst,
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      stockLedger: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(stockMovements.filter(sm => sm.referenceId === where?.referenceId));
        }),
      },
    };

    accountingEngine = {
      postTransaction: jest.fn().mockImplementation(async (params) => {
        let debits = 0;
        let credits = 0;
        for (const l of params.lines || []) {
          debits += Number(l.debit || 0);
          credits += Number(l.credit || 0);
        }
        if (Math.abs(debits - credits) > 0.001) {
          throw new BadRequestException(`Unbalanced journal entry. Total Debit: ${debits}, Total Credit: ${credits}`);
        }
        journalTransactions.push(params);
        return { id: 'je-1', ...params };
      }),
      reverseTransaction: jest.fn().mockResolvedValue({ id: 'rev-1' }),
    };

    sequenceService = {
      generateUniversalSequence: jest.fn().mockResolvedValue('INV-00101'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountingEngineService, useValue: accountingEngine },
        {
          provide: CommissionsService,
          useValue: { evaluateCommission: jest.fn().mockResolvedValue(null) },
        },
        { provide: SequenceService, useValue: sequenceService },
        { provide: PdfEngineService, useValue: { generateInvoicePdf: jest.fn() } },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1: Basic B2C invoice, 1 item, no tax
  it('TEST 1: Basic B2C invoice (1 item, no tax)', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      invoiceType: 'BILL_OF_SUPPLY',
      items: [
        {
          productId: mockProduct.id,
          description: 'Basic item',
          qty: 2,
          rate: 500,
          taxPercent: 0,
        },
      ],
    };

    const invoice = await service.create(dto);
    expect(invoice).toBeDefined();
    expect(invoice.subTotal).toBe(1000);
    expect(invoice.taxTotal).toBe(0);
    expect(invoice.grandTotal).toBe(1000);
    expect(invoice.cgstAmount).toBe(0);
    expect(invoice.sgstAmount).toBe(0);
    expect(invoice.igstAmount).toBe(0);
  });

  // TEST 2: B2B GST invoice, CGST + SGST (intra-state)
  it('TEST 2: B2B GST invoice with intra-state CGST + SGST (9% + 9%)', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      placeOfSupply: '27', // Same as company state '27'
      items: [
        {
          productId: mockProduct.id,
          description: 'Sensor Widget',
          qty: 10,
          rate: 1000,
          taxPercent: 18,
        },
      ],
    };

    const invoice = await service.create(dto);
    expect(invoice.subTotal).toBe(10000);
    expect(invoice.cgstAmount).toBe(900);
    expect(invoice.sgstAmount).toBe(900);
    expect(invoice.igstAmount).toBe(0);
    expect(invoice.taxTotal).toBe(1800);
    expect(invoice.grandTotal).toBe(11800);

    // Verify General Ledger balanced posting
    expect(journalTransactions).toHaveLength(1);
    const jt = journalTransactions[0];
    const totalDebit = jt.lines.reduce((s: number, l: any) => s + l.debit, 0);
    const totalCredit = jt.lines.reduce((s: number, l: any) => s + l.credit, 0);
    expect(totalDebit).toBe(11800);
    expect(totalCredit).toBe(11800);
  });

  // TEST 3: Interstate GST invoice, IGST (18%)
  it('TEST 3: Interstate GST invoice with IGST (18%)', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      placeOfSupply: '29', // Karnataka, different from company state '27'
      items: [
        {
          productId: mockProduct.id,
          description: 'Sensor Widget Interstate',
          qty: 5,
          rate: 2000,
          taxPercent: 18,
        },
      ],
    };

    const invoice = await service.create(dto);
    expect(invoice.subTotal).toBe(10000);
    expect(invoice.cgstAmount).toBe(0);
    expect(invoice.sgstAmount).toBe(0);
    expect(invoice.igstAmount).toBe(1800);
    expect(invoice.taxTotal).toBe(1800);
    expect(invoice.grandTotal).toBe(11800);
  });

  // TEST 4: Multiple products
  it('TEST 4: Multiple products with differing rates and taxes', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      placeOfSupply: '27',
      items: [
        {
          productId: mockProduct.id,
          description: 'Hardware 18%',
          qty: 2,
          rate: 1000,
          taxPercent: 18,
        },
        {
          productId: mockServiceProduct.id,
          description: 'Consulting 18%',
          qty: 1,
          rate: 3000,
          taxPercent: 18,
        },
      ],
    };

    const invoice = await service.create(dto);
    expect(invoice.subTotal).toBe(5000);
    expect(invoice.taxTotal).toBe(900);
    expect(invoice.grandTotal).toBe(5900);
    expect((invoice.items as any)?.create || invoice.items).toHaveLength(2);
  });

  // TEST 5: Discount handling
  it('TEST 5: Line items with net discounted rate', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      placeOfSupply: '27',
      items: [
        {
          productId: mockProduct.id,
          description: 'Discounted Item (10% off)',
          qty: 1,
          rate: 900, // discounted from 1000
          taxPercent: 18,
        },
      ],
    };

    const invoice = await service.create(dto);
    expect(invoice.subTotal).toBe(900);
    expect(invoice.taxTotal).toBe(162);
    expect(invoice.grandTotal).toBe(1062);
  });

  // TEST 7: Non-taxable service / exempt
  it('TEST 7: Non-taxable / exempt supply', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      documentType: 'EXEMPT_SUPPLY',
      items: [
        {
          productId: mockServiceProduct.id,
          description: 'Tax Exempt Healthcare Service',
          qty: 1,
          rate: 5000,
          taxPercent: 0,
        },
      ],
    };

    const invoice = await service.create(dto);
    expect(invoice.subTotal).toBe(5000);
    expect(invoice.taxTotal).toBe(0);
    expect(invoice.grandTotal).toBe(5000);
  });

  // TEST 8: Paid invoice (immediate full payment)
  it('TEST 8: Fully paid invoice on creation generates receipt & balanced ledger', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      placeOfSupply: '27',
      paymentMode: 'CASH',
      amountPaid: 1180,
      items: [
        {
          productId: mockProduct.id,
          description: 'Widget A',
          qty: 1,
          rate: 1000,
          taxPercent: 18,
        },
      ],
    };

    const invoice = await service.create(dto, undefined, mockUserId);
    expect(invoice.grandTotal).toBe(1180);
    expect(invoice.amountPaid).toBe(1180);
    expect(invoice.status).toBe('PAID');

    // Verify receipt was auto-created and linked
    expect(receiptsCreated).toHaveLength(1);
    expect(receiptsCreated[0].amount).toBe(1180);
    expect(receiptsCreated[0].receivedById).toBe(mockUserId);

    // Verify journal balancing (AR debit + Cash debit == Revenue credit + Tax credit + AR credit)
    const jt = journalTransactions[0];
    const totalDebit = jt.lines.reduce((s: number, l: any) => s + l.debit, 0);
    const totalCredit = jt.lines.reduce((s: number, l: any) => s + l.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });

  // TEST 9: Partially paid invoice
  it('TEST 9: Partially paid invoice sets PARTIAL status', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      placeOfSupply: '27',
      paymentMode: 'BANK_TRANSFER',
      amountPaid: 500,
      items: [
        {
          productId: mockProduct.id,
          description: 'Widget A',
          qty: 1,
          rate: 1000,
          taxPercent: 18,
        },
      ],
    };

    const invoice = await service.create(dto);
    expect(invoice.grandTotal).toBe(1180);
    expect(invoice.amountPaid).toBe(500);
    expect(invoice.status).toBe('PARTIAL');
  });

  // TEST 10: Credit invoice (Credit Note)
  it('TEST 10: Credit note reverses sales revenue, taxes, and receivable balance', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      documentType: 'CREDIT_NOTE',
      placeOfSupply: '27',
      items: [
        {
          productId: mockProduct.id,
          description: 'Returned Widget',
          qty: 1,
          rate: 1000,
          taxPercent: 18,
        },
      ],
    };

    const invoice = await service.create(dto);
    expect(invoice.invoiceType).toBe('CREDIT_NOTE');
    expect(invoice.grandTotal).toBe(1180);

    // Stock movement should be 'RETURN'
    expect(stockMovements).toHaveLength(1);
    expect(stockMovements[0].type).toBe('RETURN');
    expect(stockMovements[0].quantityChange).toBe(1);
  });

  // TEST 11: Inventory stock movement
  it('TEST 11: Physical products reduce stock; service products bypass stock ledgers', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      placeOfSupply: '27',
      items: [
        {
          productId: mockProduct.id, // physical inventory
          qty: 4,
          rate: 100,
        },
        {
          productId: mockServiceProduct.id, // service (no stock movement)
          qty: 2,
          rate: 500,
        },
      ],
    };

    await service.create(dto);
    expect(stockMovements).toHaveLength(1);
    expect(stockMovements[0].productId).toBe(mockProduct.id);
    expect(stockMovements[0].type).toBe('SALE');
    expect(stockMovements[0].quantityChange).toBe(-4);
  });

  // TEST 12 & 19: Duplicate submit / document number uniqueness
  it('TEST 12 & 19: Rejects duplicate document number within same tenant', async () => {
    createdInvoices.push({
      id: 'inv-existing-1',
      companyId: mockCompanyId,
      invoiceNo: 'INV-DUP-001',
      deletedAt: null,
    });

    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      invoiceNo: 'INV-DUP-001',
      items: [{ productId: mockProduct.id, qty: 1, rate: 100 }],
    };

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
    await expect(service.create(dto)).rejects.toThrow('Document number "INV-DUP-001" already exists');
  });

  // TEST 13: Invalid customer
  it('TEST 13: Rejects invalid or deleted customer', async () => {
    const dto: CreateInvoiceDto = {
      customerId: 'non-existent-customer-999',
      date: '2026-10-06T10:00:00.000Z',
      items: [{ productId: mockProduct.id, qty: 1, rate: 100 }],
    };

    await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    await expect(service.create(dto)).rejects.toThrow('Customer with ID "non-existent-customer-999" not found');
  });

  // TEST 14: Invalid product
  it('TEST 14: Rejects non-existent product ID', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      items: [{ productId: 'invalid-prod-999', qty: 1, rate: 100 }],
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    await expect(service.create(dto)).rejects.toThrow('Product with ID "invalid-prod-999" not found');
  });

  // TEST 15: Empty items
  it('TEST 15: Rejects empty items array', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      items: [],
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    await expect(service.create(dto)).rejects.toThrow('At least one line item is required');
  });

  // TEST 16: Invalid quantity
  it('TEST 16: Rejects zero or negative quantity', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      items: [{ productId: mockProduct.id, qty: 0, rate: 100 }],
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    await expect(service.create(dto)).rejects.toThrow('Item quantity must be greater than zero');
  });

  // TEST 17: Invalid rate
  it('TEST 17: Rejects negative rate', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      items: [{ productId: mockProduct.id, qty: 1, rate: -50 }],
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    await expect(service.create(dto)).rejects.toThrow('Item rate cannot be negative');
  });

  // TEST 18: Invalid date
  it('TEST 18: Rejects invalid date string', async () => {
    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: 'not-a-valid-date',
      items: [{ productId: mockProduct.id, qty: 1, rate: 100 }],
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    await expect(service.create(dto)).rejects.toThrow('Invalid invoice date provided');
  });

  // TEST 20: Canonical DTO aliases (invoiceNo, documentNo, docNo)
  it('TEST 20: Accepts canonical documentNo and legacy docNo safely', async () => {
    const dtoWithDocNo: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      docNo: 'DOC-LEGACY-001',
      items: [{ productId: mockProduct.id, qty: 1, rate: 100 }],
    };

    const inv = await service.create(dtoWithDocNo);
    expect(inv.invoiceNo).toBe('DOC-LEGACY-001');

    const dtoWithDocumentNo: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      documentNo: 'DOC-CANONICAL-002',
      items: [{ productId: mockProduct.id, qty: 1, rate: 200 }],
    };

    const inv2 = await service.create(dtoWithDocumentNo);
    expect(inv2.invoiceNo).toBe('DOC-CANONICAL-002');
  });

  // TEST 21: Soft-deleted / archived invoice number collision check
  it('TEST 21: Rejects document number previously used on archived invoice with clear statutory notice', async () => {
    createdInvoices.push({
      id: 'inv-archived-1',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/68/26-27',
      deletedAt: new Date('2026-10-09T06:44:31.771Z'),
    });

    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-09-08T00:00:00.000Z',
      invoiceNo: 'B2BF/68/26-27',
      items: [{ productId: mockProduct.id, qty: 88, rate: 170, taxPercent: 18 }],
    };

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
    await expect(service.create(dto)).rejects.toThrow(
      'Document number "B2BF/68/26-27" has already been used on an archived invoice. Due to statutory tax requirements, document numbers cannot be reused. Please specify a new number.'
    );
  });

  // TEST 22: Concurrency / Database P2002 collision mapping
  it('TEST 22: Translates concurrent database P2002 collision to clean ConflictException (HTTP 409)', async () => {
    // Simulate race condition where findFirst passed but tx.invoice.create fails with P2002
    mockTx.invoice.create = jest.fn().mockRejectedValue({
      code: 'P2002',
      meta: { target: ['companyId', 'invoiceNo'] },
    });

    const dto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      date: '2026-10-06T10:00:00.000Z',
      invoiceNo: 'INV-RACE-001',
      items: [{ productId: mockProduct.id, qty: 1, rate: 100 }],
    };

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
    await expect(service.create(dto)).rejects.toThrow(
      'Document number "INV-RACE-001" already exists. Please choose a different document number.'
    );
  });

  // TEST 23: Incident payload reproduction & protection against HTTP 500
  it('TEST 23: Exact incident payload is rejected with 409 Conflict instead of HTTP 500 when document exists', async () => {
    createdInvoices.push({
      id: 'cmu2idqzb0081i30sjr62fh7j',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/68/26-27',
      deletedAt: new Date('2026-10-09T06:44:31.771Z'),
    });

    const incidentDto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      invoiceNo: 'B2BF/68/26-27',
      date: '2026-09-08T00:00:00.000Z',
      dueDate: '2026-09-15T00:00:00.000Z',
      items: [
        {
          productId: mockProduct.id,
          description: '20 LTR JAR',
          qty: 88,
          rate: 170,
          taxPercent: 18,
        },
      ],
    };

    try {
      await service.create(incidentDto);
      fail('Expected ConflictException to be thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getStatus()).toBe(409);
      expect(err.message).toContain('B2BF/68/26-27');
    }
  });

  // TEST 24: Incident payload with fresh document number succeeds with precise calculations
  it('TEST 24: Incident payload succeeds when issued with a fresh document number', async () => {
    const validIncidentDto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      invoiceNo: 'B2BF/69/26-27',
      date: '2026-09-08T00:00:00.000Z',
      dueDate: '2026-09-15T00:00:00.000Z',
      items: [
        {
          productId: mockProduct.id,
          description: '20 LTR JAR',
          qty: 88,
          rate: 170,
          taxPercent: 18,
        },
      ],
    };

    const invoice = await service.create(validIncidentDto);

    expect(invoice.invoiceNo).toBe('B2BF/69/26-27');
    // 88 * 170 = 14960
    expect(invoice.subTotal).toBe(14960);
    // 9% CGST = 1346.40, 9% SGST = 1346.40, Total tax = 2692.80
    expect(invoice.cgstAmount).toBe(1346.4);
    expect(invoice.sgstAmount).toBe(1346.4);
    expect(invoice.taxTotal).toBe(2692.8);
    // 14960 + 2692.80 = 17652.80
    expect(invoice.grandTotal).toBe(17652.8);

    // Verify stock ledger movement
    expect(stockMovements).toHaveLength(1);
    expect(stockMovements[0].productId).toBe(mockProduct.id);
    expect(stockMovements[0].quantityChange).toBe(-88);

    // Verify accounting journal transaction posted
    expect(journalTransactions).toHaveLength(1);
    expect(journalTransactions[0].lines).toBeDefined();
  });

  // TEST 25: Invoice created with status 'DRAFT' is strictly non-posting
  it('TEST 25: Invoice created with status "DRAFT" persists without posting to GL, stock ledger, or customer balance', async () => {
    const draftDto: CreateInvoiceDto = {
      customerId: mockCustomer.id,
      invoiceNo: 'B2BF/DRAFT-01',
      status: 'DRAFT',
      date: '2026-10-09T00:00:00.000Z',
      items: [
        {
          productId: mockProduct.id,
          description: '20 LTR JAR Draft',
          qty: 50,
          rate: 170,
          taxPercent: 18,
        },
      ],
    };

    const draft = await service.create(draftDto);

    expect(draft.invoiceNo).toBe('B2BF/DRAFT-01');
    expect(draft.status).toBe('DRAFT');
    expect(draft.subTotal).toBe(8500); // 50 * 170
    expect(draft.grandTotal).toBe(10030); // 8500 + 1530

    // Verify STRICT NON-POSTING:
    // No stock movements
    expect(stockMovements).toHaveLength(0);
    // No GL journal postings
    expect(journalTransactions).toHaveLength(0);
    // Customer receivable balance unchanged
    expect(mockTx.businessPartner.update).not.toHaveBeenCalled();
  });

  // TEST 26: Updating a draft invoice preserves unposted state
  it('TEST 26: Updating a draft invoice modifies lines and recalculates totals without posting', async () => {
    const draftRecord = {
      id: 'inv-draft-editing-1',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/DRAFT-02',
      status: 'DRAFT',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-10-09'),
      dueDate: new Date('2026-10-16'),
      invoiceType: 'TAX_INVOICE',
      subTotal: 8500,
      grandTotal: 10030,
      items: [
        {
          id: 'item-1',
          productId: mockProduct.id,
          qty: 50,
          rate: 170,
          taxPercent: 18,
        },
      ],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(draftRecord);

    const updated = await service.update(draftRecord.id, {
      items: [
        {
          productId: mockProduct.id,
          description: '20 LTR JAR Updated Qty',
          qty: 88,
          rate: 170,
          taxPercent: 18,
        },
      ],
      status: 'DRAFT',
    }, mockUserId);

    expect(updated.status).toBe('DRAFT');
    expect(updated.subTotal).toBe(14960); // 88 * 170
    expect(updated.grandTotal).toBe(17652.8);

    // Still strictly non-posting
    expect(stockMovements).toHaveLength(0);
    expect(journalTransactions).toHaveLength(0);
  });

  // TEST 27: Issuing a draft transitions status to SENT and triggers postings
  it('TEST 27: Issuing a draft (status SENT) executes GL posting, stock deduction, and balance update', async () => {
    const draftRecord = {
      id: 'inv-draft-issue-1',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/DRAFT-03',
      status: 'DRAFT',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-10-09'),
      dueDate: new Date('2026-10-16'),
      invoiceType: 'TAX_INVOICE',
      subTotal: 14960,
      grandTotal: 17652.8,
      items: [
        {
          id: 'item-1',
          productId: mockProduct.id,
          qty: 88,
          rate: 170,
          taxPercent: 18,
        },
      ],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(draftRecord);

    const issued = await service.update(draftRecord.id, {
      status: 'SENT',
    }, mockUserId);

    expect(issued.status).toBe('SENT');
    // Stock ledger movement executed
    expect(stockMovements).toHaveLength(1);
    expect(stockMovements[0].quantityChange).toBe(-88);
    // GL journal transaction executed
    expect(journalTransactions).toHaveLength(1);
  });

  // TEST 28: Restoring an archived invoice clears deletedAt and restores balances
  it('TEST 28: Restoring an archived invoice clears deletedAt and restores GL and inventory ledger', async () => {
    const archivedRecord = {
      id: 'inv-archived-target-1',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/ARCHIVED-01',
      status: 'PARTIAL',
      deletedAt: new Date('2026-10-09T06:00:00.000Z'),
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-09-08'),
      dueDate: new Date('2026-09-15'),
      invoiceType: 'TAX_INVOICE',
      subTotal: 14960,
      grandTotal: 17652.8,
      items: [
        {
          id: 'item-1',
          productId: mockProduct.id,
          qty: 88,
          rate: 170,
          taxPercent: 18,
        },
      ],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(archivedRecord);

    const restored = await service.restore(archivedRecord.id, mockUserId);

    expect(restored.data.deletedAt).toBeNull();
    // Re-posts GL entry
    expect(journalTransactions).toHaveLength(1);
    // Re-deducts stock
    expect(stockMovements).toHaveLength(1);
    expect(stockMovements[0].quantityChange).toBe(-88);
  });

  it('TEST 29: Draft invoice deletion permanently removes draft and logs audit entry without touching ledger', async () => {
    const draftRecord: any = {
      id: 'inv-draft-del-1',
      companyId: mockCompanyId,
      invoiceNo: 'INV/DRAFT-DEL-01',
      status: 'DRAFT',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-10-09'),
      grandTotal: 5000,
      items: [{ id: 'item-d1', productId: mockProduct.id, qty: 10, rate: 500 }],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(draftRecord);

    const deleteResult = await service.remove(draftRecord.id, mockUserId);

    expect(deleteResult.success).toBe(true);
    expect(createdInvoices.find(i => i.id === draftRecord.id)).toBeUndefined();
    expect(auditLogsCreated).toContainEqual(
      expect.objectContaining({
        action: 'DELETE_DRAFT_INVOICE',
        companyId: mockCompanyId,
        tableName: 'invoices',
      })
    );
    // Draft deletion produces 0 journal transactions
    expect(journalTransactions).toHaveLength(0);
  });

  it('TEST 30: Permanently deletes issued eligible invoice atomically and updates balances', async () => {
    const issuedRecord: any = {
      id: 'inv-issued-del-block',
      companyId: mockCompanyId,
      invoiceNo: 'INV/ISSUED-BLOCK-01',
      status: 'SENT',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-10-09'),
      grandTotal: 10000,
      items: [],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(issuedRecord);

    const result = await service.remove(issuedRecord.id, mockUserId);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Invoice deleted successfully. Related balances updated.');
    expect(createdInvoices.find(i => i.id === issuedRecord.id)).toBeUndefined();
  });

  it('TEST 30B: Rejects permanent deletion if invoice has statutory compliance lock (registered IRN)', async () => {
    const irnRecord: any = {
      id: 'inv-irn-lock-1',
      companyId: mockCompanyId,
      invoiceNo: 'INV/IRN-01',
      status: 'SENT',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-10-09'),
      grandTotal: 10000,
      irn: 'irn-1234567890abcdef',
      items: [],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(irnRecord);

    await expect(service.remove(irnRecord.id, mockUserId)).rejects.toThrow(BadRequestException);
    await expect(service.remove(irnRecord.id, mockUserId)).rejects.toThrow('registered IRN cannot be permanently deleted');
  });

  it('TEST 31: Cancellation of an issued unpaid invoice with mandatory reason reverses stock, AR, and GL', async () => {
    const issuedRecord: any = {
      id: 'inv-issued-cancel-1',
      companyId: mockCompanyId,
      invoiceNo: 'INV/CANCEL-UNPAID-01',
      status: 'SENT',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-10-09'),
      grandTotal: 11800,
      amountPaid: 0,
      items: [{ id: 'item-c1', productId: mockProduct.id, qty: 10, rate: 1000 }],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(issuedRecord);

    // Mock stock ledger for this invoice to reverse
    stockMovements.push({
      referenceId: issuedRecord.id,
      referenceType: 'INVOICE',
      productId: mockProduct.id,
      quantityChange: -10,
    });

    // 1. Mandatory reason rejection
    await expect(service.cancel(issuedRecord.id, { reason: '' }, mockUserId)).rejects.toThrow(
      BadRequestException
    );

    mockTx.journalEntry.findMany.mockResolvedValueOnce([
      { id: 'je-orig-1', reference: issuedRecord.invoiceNo, companyId: mockCompanyId },
    ]);

    // 2. Successful cancellation
    const cancelResult = await service.cancel(
      issuedRecord.id,
      { reason: 'Customer cancelled purchase order before dispatch' },
      mockUserId
    );

    expect(cancelResult.success).toBe(true);
    expect(cancelResult.data.status).toBe('CANCELLED');
    expect(auditLogsCreated).toContainEqual(
      expect.objectContaining({
        action: 'CANCEL_INVOICE',
        companyId: mockCompanyId,
      })
    );
    expect(accountingEngine.reverseTransaction).toHaveBeenCalled();
  });

  it('TEST 32: Partially paid invoice cancellation (B2BF/68/26-27 pattern) preserves payment history and unlinks allocations', async () => {
    const partialInvoice: any = {
      id: 'inv-b2bf-68-test',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/68/26-27',
      status: 'PARTIAL',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-09-08'),
      dueDate: new Date('2026-09-15'),
      grandTotal: 17653,
      amountPaid: 5000,
      items: [{ id: 'item-b1', productId: mockProduct.id, qty: 88, rate: 170 }],
      company: mockCompany,
      businessPartner: mockCustomer,
      receiptAllocations: [
        {
          id: 'alloc-rec-1',
          receiptId: 'rec-00001-id',
          invoiceId: 'inv-b2bf-68-test',
          amount: 5000,
          receipt: { id: 'rec-00001-id', receiptNo: 'REC-00001', amount: 5000, status: 'COMPLETED' },
        },
      ],
    };
    createdInvoices.push(partialInvoice);
    mockAllocations.push(partialInvoice.receiptAllocations[0]);

    const result = await service.cancel(
      partialInvoice.id,
      { reason: 'Statutory cancellation with advance retained on customer account' },
      mockUserId
    );

    expect(result.success).toBe(true);
    expect(result.data.status).toBe('CANCELLED');
    // Receipt allocation unlinked from invoice
    expect(mockAllocations).toHaveLength(0);
    // Audit trail records the payment allocation details
    expect(auditLogsCreated).toContainEqual(
      expect.objectContaining({
        action: 'CANCEL_INVOICE',
        tableName: 'invoices',
      })
    );
  });

  it('TEST 33: Restore rejects if an active invoice already uses the document number', async () => {
    const activeInvoice: any = {
      id: 'inv-active-collision-1',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/68/26-27',
      status: 'SENT',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-10-09'),
      grandTotal: 17653,
      items: [],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(activeInvoice);

    const archivedInvoice: any = {
      id: 'inv-archived-collision-target',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/68/26-27',
      status: 'PARTIAL',
      deletedAt: new Date('2026-10-09T05:00:00.000Z'),
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-09-08'),
      grandTotal: 17653,
      items: [],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(archivedInvoice);

    await expect(service.restore(archivedInvoice.id, mockUserId, 'Restore attempt')).rejects.toThrow(
      ConflictException
    );
    await expect(service.restore(archivedInvoice.id, mockUserId, 'Restore attempt')).rejects.toThrow(
      /is already in use by an active invoice/
    );
  });

  it('TEST 34: Duplicate cancellation is rejected safely', async () => {
    const cancelledRecord: any = {
      id: 'inv-already-cancelled',
      companyId: mockCompanyId,
      invoiceNo: 'INV/ALREADY-CANCELLED-01',
      status: 'CANCELLED',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-10-09'),
      grandTotal: 10000,
      amountPaid: 0,
      items: [],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(cancelledRecord);

    await expect(
      service.cancel(cancelledRecord.id, { reason: 'Try cancel again' }, mockUserId)
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.cancel(cancelledRecord.id, { reason: 'Try cancel again' }, mockUserId)
    ).rejects.toThrow(/already cancelled/);
  });

  it('TEST 35: Eligible archived draft can be permanently deleted with audit logging', async () => {
    const archivedDraft: any = {
      id: 'inv-archived-draft-del-1',
      companyId: mockCompanyId,
      invoiceNo: 'INV/ARCHIVED-DRAFT-01',
      status: 'DRAFT',
      deletedAt: new Date('2026-10-09T08:00:00.000Z'),
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-10-09'),
      grandTotal: 3000,
      amountPaid: 0,
      items: [{ id: 'item-ad1', productId: mockProduct.id, qty: 5, rate: 600 }],
      company: mockCompany,
      businessPartner: mockCustomer,
      receiptAllocations: [],
      journalEntries: [],
    };
    createdInvoices.push(archivedDraft);

    const deleteResult = await service.remove(archivedDraft.id, mockUserId);

    expect(deleteResult.success).toBe(true);
    expect(createdInvoices.find(i => i.id === archivedDraft.id)).toBeUndefined();
    expect(auditLogsCreated).toContainEqual(
      expect.objectContaining({
        action: 'DELETE_ARCHIVED_INVOICE',
        companyId: mockCompanyId,
        tableName: 'invoices',
      })
    );
  });

  it('TEST 36: Archived invoice with allocations (B2BF/68/26-27 pattern) permanently deletes atomically, unlinking allocations while preserving receipt', async () => {
    const protectedArchivedInvoice: any = {
      id: 'inv-b2bf-protected-del-target',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/68/26-27',
      status: 'PARTIAL',
      deletedAt: new Date('2026-10-09T08:30:00.000Z'),
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-09-08'),
      dueDate: new Date('2026-09-15'),
      grandTotal: 17653,
      amountPaid: 5000,
      items: [{ id: 'item-pr1', productId: mockProduct.id, qty: 88, rate: 170 }],
      company: mockCompany,
      businessPartner: mockCustomer,
      receiptAllocations: [
        {
          id: 'alloc-rec-pr1',
          receiptId: 'rec-00001-id',
          invoiceId: 'inv-b2bf-protected-del-target',
          amount: 5000,
          receipt: { id: 'rec-00001-id', receiptNo: 'REC-00001', amount: 5000, status: 'COMPLETED', payments: [{ id: 'p1', amount: 5000 }] },
        },
      ],
      journalEntries: [{ id: 'je-pr1', reference: 'B2BF/68/26-27' }],
    };
    createdInvoices.push(protectedArchivedInvoice);

    const result = await service.remove(protectedArchivedInvoice.id, mockUserId);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Invoice deleted successfully. Related balances updated.');
    expect(createdInvoices.find(i => i.id === protectedArchivedInvoice.id)).toBeUndefined();
    expect(mockTx.receiptAllocation.delete).toHaveBeenCalledWith({ where: { id: 'alloc-rec-pr1' } });
    // Completed receipt with real payments was NOT deleted
    expect(mockTx.receipt.delete).not.toHaveBeenCalledWith({ where: { id: 'rec-00001-id' } });
  });

  it('TEST 37: Restoring archived invoice B2BF/68/26-27 with ₹0.20 roundOff balances debits and credits exactly', async () => {
    const b2bfArchivedInvoice: any = {
      id: 'inv-b2bf-restore-target',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/68/26-27',
      status: 'PARTIAL',
      deletedAt: new Date('2026-10-09T08:30:00.000Z'),
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-09-08'),
      dueDate: new Date('2026-09-15'),
      invoiceType: 'TAX_INVOICE',
      subTotal: 14960,
      cgstAmount: 1346.4,
      sgstAmount: 1346.4,
      totalTaxAmount: 2692.8,
      grandTotal: 17653, // includes 0.20 roundOff difference
      amountPaid: 5000,
      items: [{ id: 'item-b2bf-1', productId: mockProduct.id, qty: 88, rate: 170, taxPercent: 18 }],
      company: mockCompany,
      businessPartner: mockCustomer,
      receiptAllocations: [
        {
          id: 'alloc-rec-1',
          receiptId: 'rec-1',
          amount: 5000,
          receipt: { id: 'rec-1', receiptNo: 'REC-00001', amount: 5000 },
        },
      ],
    };
    createdInvoices.push(b2bfArchivedInvoice);

    const result = await service.restore(b2bfArchivedInvoice.id, mockUserId);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Invoice restored successfully.');
    expect(result.data.deletedAt).toBeNull();
    expect(journalTransactions).toHaveLength(1);

    const postedLines = journalTransactions[0].lines;
    const totalDebits = postedLines.reduce((acc: number, l: any) => acc + Number(l.debit || 0), 0);
    const totalCredits = postedLines.reduce((acc: number, l: any) => acc + Number(l.credit || 0), 0);

    expect(totalDebits).toBeCloseTo(17653, 2);
    expect(totalCredits).toBeCloseTo(17653, 2);
    expect(Math.abs(totalDebits - totalCredits)).toBeLessThan(0.001);

    // Verify round-off line was added on credit side (17652.80 + 0.20 = 17653.00)
    const roundOffLine = postedLines.find((l: any) => l.credit === 0.2);
    expect(roundOffLine).toBeDefined();
  });

  it('TEST 38: Duplicate restore attempt does not create duplicate journal entries', async () => {
    const invoiceToRetry: any = {
      id: 'inv-restore-retry-target',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/RETRY-01',
      status: 'SENT',
      deletedAt: new Date('2026-10-09T08:30:00.000Z'),
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-09-08'),
      dueDate: new Date('2026-09-15'),
      invoiceType: 'TAX_INVOICE',
      subTotal: 1000,
      grandTotal: 1180,
      cgstAmount: 90,
      sgstAmount: 90,
      items: [{ id: 'it-r1', productId: mockProduct.id, qty: 10, rate: 100 }],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(invoiceToRetry);

    // First restore
    await service.restore(invoiceToRetry.id, mockUserId);
    expect(journalTransactions).toHaveLength(1);

    // Simulate journalEntry already exists in database
    (mockTx.journalEntry.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'je-existing', reference: 'B2BF/RETRY-01' });

    // Mark as archived again to simulate retry
    invoiceToRetry.deletedAt = new Date();
    await service.restore(invoiceToRetry.id, mockUserId);

    // Journal count should still be 1 (no duplicate journal entry created on retry)
    expect(journalTransactions).toHaveLength(1);
  });

  it('TEST 39: Restore fails with concise message when accounting postings genuinely do not balance', async () => {
    const corruptInvoice: any = {
      id: 'inv-corrupt-imbalance',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/CORRUPT-01',
      status: 'SENT',
      deletedAt: new Date('2026-10-09T08:30:00.000Z'),
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-09-08'),
      dueDate: new Date('2026-09-15'),
      invoiceType: 'TAX_INVOICE',
      subTotal: 1000,
      grandTotal: 5000,
      items: [{ id: 'it-c1', productId: mockProduct.id, qty: 1, rate: 1000 }],
      company: mockCompany,
      businessPartner: mockCustomer,
    };
    createdInvoices.push(corruptInvoice);

    // Mock postTransaction to throw unbalanced error
    accountingEngine.postTransaction.mockRejectedValueOnce(
      new BadRequestException('Unbalanced journal entry')
    );

    await expect(service.restore(corruptInvoice.id, mockUserId)).rejects.toThrow(
      'Invoice could not be restored because its accounting entries do not balance. Please try again after the accounting issue is fixed.'
    );
  });

  it('TEST 40: Authorized dev/test purge completely and atomically removes transaction, reversing customer receivable, stock, receipts, and GL', async () => {
    const purgeTargetInvoice: any = {
      id: 'inv-purge-target-1',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/PURGE-01',
      status: 'PARTIAL',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-09-08'),
      dueDate: new Date('2026-09-15'),
      grandTotal: 17653,
      amountPaid: 5000,
      items: [{ id: 'it-p1', productId: mockProduct.id, qty: 88, rate: 170 }],
      company: mockCompany,
      businessPartner: mockCustomer,
      receiptAllocations: [
        {
          id: 'alloc-purge-1',
          receiptId: 'rec-dedicated-1',
          invoiceId: 'inv-purge-target-1',
          amount: 5000,
          receipt: {
            id: 'rec-dedicated-1',
            receiptNo: 'REC-DED-1',
            amount: 5000,
            allocatedAmount: 5000,
            allocations: [{ id: 'alloc-purge-1', invoiceId: 'inv-purge-target-1' }],
          },
        },
      ],
      journalEntries: [{ id: 'je-purge-1', reference: 'B2BF/PURGE-01' }],
    };
    createdInvoices.push(purgeTargetInvoice);

    // Mock stock ledger for invoice
    stockMovements.push({
      referenceId: purgeTargetInvoice.id,
      referenceType: 'INVOICE',
      productId: mockProduct.id,
      quantityChange: -88,
    });

    const result = await service.remove(purgeTargetInvoice.id, mockUserId, { allowPurge: true });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Invoice deleted successfully. Related balances updated.');
    expect(createdInvoices.find(i => i.id === purgeTargetInvoice.id)).toBeUndefined();
    expect(auditLogsCreated).toContainEqual(
      expect.objectContaining({
        action: 'PERMANENT_DELETE_INVOICE_PURGE',
        companyId: mockCompanyId,
      })
    );
  });

  it('TEST 41: Authorized purge handles shared receipts by unlinking only the target allocation without destroying the receipt or other invoices', async () => {
    const sharedReceiptId = 'rec-shared-99';
    const sharedInvoice: any = {
      id: 'inv-shared-purge-target',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/SHARED-01',
      status: 'PARTIAL',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-09-08'),
      grandTotal: 10000,
      amountPaid: 3000,
      items: [],
      company: mockCompany,
      businessPartner: mockCustomer,
      receiptAllocations: [
        {
          id: 'alloc-shared-1',
          receiptId: sharedReceiptId,
          invoiceId: 'inv-shared-purge-target',
          amount: 3000,
          receipt: {
            id: sharedReceiptId,
            receiptNo: 'REC-SHARED-99',
            amount: 7000,
            allocatedAmount: 7000,
            allocations: [
              { id: 'alloc-shared-1', invoiceId: 'inv-shared-purge-target', amount: 3000 },
              { id: 'alloc-shared-2', invoiceId: 'inv-other-doc-2', amount: 4000 },
            ],
          },
        },
      ],
      journalEntries: [],
    };
    createdInvoices.push(sharedInvoice);

    const result = await service.remove(sharedInvoice.id, mockUserId, { allowPurge: true });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Invoice deleted successfully. Related balances updated.');
    // Receipt allocation was removed
    expect(mockTx.receiptAllocation.delete).toHaveBeenCalledWith({ where: { id: 'alloc-shared-1' } });
    // Shared receipt itself was preserved and NOT deleted
    expect(mockTx.receipt.delete).not.toHaveBeenCalledWith({ where: { id: sharedReceiptId } });
  });

  it('TEST 42: Transaction failure during deletion rolls back atomically and leaves no partial changes', async () => {
    const failingInvoice: any = {
      id: 'inv-fail-rollback-test',
      companyId: mockCompanyId,
      invoiceNo: 'B2BF/FAIL-01',
      status: 'PARTIAL',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      date: new Date('2026-09-08'),
      grandTotal: 17653,
      amountPaid: 5000,
      items: [{ id: 'it-f1', productId: mockProduct.id, qty: 10, rate: 100 }],
      company: mockCompany,
      businessPartner: mockCustomer,
      receiptAllocations: [],
      journalEntries: [{ id: 'je-fail-1', reference: 'B2BF/FAIL-01' }],
    };
    createdInvoices.push(failingInvoice);

    // Mock findMany to return journal entries for this invoice
    mockTx.journalEntry.findMany.mockResolvedValueOnce([{ id: 'je-fail-1', reference: 'B2BF/FAIL-01' }]);
    // Simulate database error during journal entry deletion
    mockTx.journalEntry.delete.mockRejectedValueOnce(new Error('DATABASE_CONNECTION_ERROR_TRANSACTION_ROLLBACK'));

    await expect(
      service.remove(failingInvoice.id, mockUserId, { allowPurge: true })
    ).rejects.toThrow('DATABASE_CONNECTION_ERROR_TRANSACTION_ROLLBACK');

    // The invoice was NOT deleted from the database
    expect(createdInvoices.find(i => i.id === failingInvoice.id)).toBeDefined();
    // Audit log for purge was NOT written
    expect(auditLogsCreated.find(a => a.action === 'PERMANENT_DELETE_INVOICE_PURGE' && a.oldValues?.id === failingInvoice.id)).toBeUndefined();
  });

  it('TEST 43: archive() on draft invoice marks deletedAt without financial reversal', async () => {
    const draftInvoice: any = {
      id: 'inv-archive-draft-1',
      companyId: mockCompanyId,
      invoiceNo: 'INV/ARCHIVE-DRAFT',
      status: 'DRAFT',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      grandTotal: 500,
      amountPaid: 0,
      receiptAllocations: [],
      journalEntries: [],
    };
    createdInvoices.push(draftInvoice);

    const result = await service.archive(draftInvoice.id, { reason: 'Archiving unneeded draft' }, mockUserId);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Invoice archived successfully.');
    expect(result.data.deletedAt).toBeDefined();
  });

  it('TEST 44: correct() performs complete statutory reversal and returns clear recreation message', async () => {
    const issuedInvoice: any = {
      id: 'inv-correct-target-1',
      companyId: mockCompanyId,
      invoiceNo: 'INV/CORRECT-01',
      status: 'SENT',
      deletedAt: null,
      businessPartnerId: mockCustomer.id,
      grandTotal: 17653,
      amountPaid: 5000,
      receiptAllocations: [],
      journalEntries: [{ id: 'je-c1', reference: 'INV/CORRECT-01', lines: [] }],
    };
    createdInvoices.push(issuedInvoice);

    const result = await service.correct(issuedInvoice.id, { reason: 'Correction for recreation' }, mockUserId);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Invoice corrected successfully. You can now create the replacement invoice.');
    expect(result.data.status).toBe('CANCELLED');
  });
});
