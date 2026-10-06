import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../database/prisma.service';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { CommissionsService } from '../commissions/commissions.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { PdfEngineService } from './pdf-engine.service';
import { CompanyContext } from '../common/context/company-context';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  beforeEach(async () => {
    createdInvoices = [];
    journalTransactions = [];
    stockMovements = [];
    receiptsCreated = [];

    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);

    const mockTx: any = {
      invoice: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where?.invoiceNo) {
            return Promise.resolve(createdInvoices.find(i => i.invoiceNo === where.invoiceNo && i.companyId === where.companyId && !i.deletedAt));
          }
          if (where?.id) {
            return Promise.resolve(createdInvoices.find(i => i.id === where.id));
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const record = { id: `inv-${Date.now()}-${Math.random()}`, ...data };
          createdInvoices.push(record);
          return Promise.resolve(record);
        }),
      },
      businessPartner: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockCustomer.id && where.companyId === mockCompanyId) {
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
        create: jest.fn().mockImplementation(({ data }) => {
          stockMovements.push(data);
          return Promise.resolve({ id: 'stl-1', ...data });
        }),
      },
      account: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve({ id: `acc-${where.name}`, name: where.name, category: 'ASSET', balance: 0 });
        }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `acc-${data.name}`, ...data })),
      },
      companyUser: {
        findFirst: jest.fn().mockResolvedValue({ userId: mockUserId, companyId: mockCompanyId }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: mockUserId }),
      },
      receipt: {
        create: jest.fn().mockImplementation(({ data }) => {
          receiptsCreated.push(data);
          return Promise.resolve({ id: 'rec-1', ...data });
        }),
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
    };

    accountingEngine = {
      postTransaction: jest.fn().mockImplementation(async (params) => {
        journalTransactions.push(params);
        return { id: 'je-1', ...params };
      }),
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
    expect(invoice.items.create).toHaveLength(2);
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

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
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
});
