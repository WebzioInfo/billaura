import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaService } from '../database/prisma.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { CompanyContext } from '../common/context/company-context';

describe('Purchase Order & Goods Receipt Stock Integration Test Suite', () => {
  let goodsReceiptsService: GoodsReceiptsService;
  let purchaseOrdersService: PurchaseOrdersService;

  const mockCompanyId = 'cmp-tenant-po-123';
  const mockUserId = 'usr-admin-test';

  const mockWarehouse = {
    id: 'wh-main-1',
    companyId: mockCompanyId,
    name: 'Main Warehouse',
    isDefault: true,
  };

  const mockProductGoods = {
    id: 'prod-item-1',
    companyId: mockCompanyId,
    name: 'Industrial Valve 2-inch',
    unit: 'PCS',
    purchasePrice: 500,
    isService: false,
    isInventoryItem: true,
    isTrackStock: true,
  };

  const mockProductService = {
    id: 'prod-service-1',
    companyId: mockCompanyId,
    name: 'Installation & Calibration Service',
    unit: 'HRS',
    purchasePrice: 1500,
    isService: true,
    isInventoryItem: false,
    isTrackStock: false,
  };

  const mockProductGoods2 = {
    id: 'prod-item-2',
    companyId: mockCompanyId,
    name: 'Flange Gasket 2-inch',
    unit: 'PCS',
    purchasePrice: 50,
    isService: false,
    isInventoryItem: true,
    isTrackStock: true,
  };

  let inMemoryDb: {
    purchaseOrders: any[];
    purchaseOrderItems: any[];
    goodsReceipts: any[];
    goodsReceiptItems: any[];
    stocks: any[];
    stockLedgers: any[];
    warehouses: any[];
    products: any[];
    auditLogs: any[];
  };

  let mockPrisma: any;
  let mockSequenceService: any;

  beforeEach(async () => {
    // Reset in-memory storage for each test
    inMemoryDb = {
      purchaseOrders: [],
      purchaseOrderItems: [],
      goodsReceipts: [],
      goodsReceiptItems: [],
      stocks: [],
      stockLedgers: [],
      warehouses: [mockWarehouse],
      products: [mockProductGoods, mockProductService, mockProductGoods2],
      auditLogs: [],
    };

    mockSequenceService = {
      getConfig: jest.fn().mockResolvedValue({ currentNumber: 1, prefix: 'GRN-', padding: 5 }),
      generateNextSequence: jest.fn().mockImplementation((companyId, docType) => {
        if (docType === 'PURCHASE_ORDER') return Promise.resolve('PO-00001');
        return Promise.resolve('GRN-00001');
      }),
    };

    const createTxMock = () => ({
      purchaseOrder: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const po = inMemoryDb.purchaseOrders.find(p => {
            if (where.id && p.id !== where.id) return false;
            if (where.companyId && p.companyId !== where.companyId) return false;
            if (where.orderNo && p.orderNo !== where.orderNo) return false;
            return true;
          });
          if (!po) return null;
          const items = inMemoryDb.purchaseOrderItems.filter(i => i.orderId === po.id);
          return { ...po, items };
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newPo = {
            id: `po-${Date.now()}-${Math.random()}`,
            ...data,
          };
          inMemoryDb.purchaseOrders.push(newPo);
          if (data.items?.create) {
            data.items.create.forEach((it: any) => {
              inMemoryDb.purchaseOrderItems.push({
                id: `poi-${Date.now()}-${Math.random()}`,
                orderId: newPo.id,
                ...it,
              });
            });
          }
          const items = inMemoryDb.purchaseOrderItems.filter(i => i.orderId === newPo.id);
          return { ...newPo, items };
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const index = inMemoryDb.purchaseOrders.findIndex(p => p.id === where.id);
          if (index === -1) return null;
          inMemoryDb.purchaseOrders[index] = { ...inMemoryDb.purchaseOrders[index], ...data };
          const items = inMemoryDb.purchaseOrderItems.filter(i => i.orderId === where.id);
          return { ...inMemoryDb.purchaseOrders[index], items };
        }),
        delete: jest.fn().mockImplementation(({ where }) => {
          const index = inMemoryDb.purchaseOrders.findIndex(p => p.id === where.id);
          if (index !== -1) {
            const removed = inMemoryDb.purchaseOrders.splice(index, 1)[0];
            return removed;
          }
          return null;
        }),
      },
      purchaseOrderItem: {
        deleteMany: jest.fn().mockImplementation(({ where }) => {
          inMemoryDb.purchaseOrderItems = inMemoryDb.purchaseOrderItems.filter(i => i.orderId !== where.orderId);
          return { count: 1 };
        }),
      },
      goodsReceipt: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const gr = inMemoryDb.goodsReceipts.find(g => {
            if (where.id && g.id !== where.id) return false;
            if (where.companyId && g.companyId !== where.companyId) return false;
            if (where.receiptNo && g.receiptNo !== where.receiptNo) return false;
            return true;
          });
          if (!gr) return null;
          const items = inMemoryDb.goodsReceiptItems.filter(i => i.goodsReceiptId === gr.id);
          return { ...gr, items };
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newGr = {
            id: `gr-${Date.now()}-${Math.random()}`,
            ...data,
          };
          inMemoryDb.goodsReceipts.push(newGr);
          const createdItems: any[] = [];
          if (data.items?.create) {
            data.items.create.forEach((it: any) => {
              const item = {
                id: `gri-${Date.now()}-${Math.random()}`,
                goodsReceiptId: newGr.id,
                ...it,
              };
              inMemoryDb.goodsReceiptItems.push(item);
              createdItems.push(item);
            });
          }
          return { ...newGr, items: createdItems };
        }),
        delete: jest.fn().mockImplementation(({ where }) => {
          const index = inMemoryDb.goodsReceipts.findIndex(g => g.id === where.id);
          if (index !== -1) return inMemoryDb.goodsReceipts.splice(index, 1)[0];
          return null;
        }),
      },
      goodsReceiptItem: {
        deleteMany: jest.fn().mockImplementation(({ where }) => {
          inMemoryDb.goodsReceiptItems = inMemoryDb.goodsReceiptItems.filter(i => i.goodsReceiptId !== where.goodsReceiptId);
          return { count: 1 };
        }),
      },
      warehouse: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return inMemoryDb.warehouses.find(w => {
            if (where.id && w.id !== where.id) return false;
            if (where.companyId && w.companyId !== where.companyId) return false;
            if (where.isDefault !== undefined && w.isDefault !== where.isDefault) return false;
            return true;
          }) || null;
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newW = { id: `wh-${Date.now()}`, ...data };
          inMemoryDb.warehouses.push(newW);
          return newW;
        }),
      },
      product: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return inMemoryDb.products.find(p => p.id === where.id && p.companyId === where.companyId) || null;
        }),
      },
      stock: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return inMemoryDb.stocks.find(s =>
            s.companyId === where.companyId &&
            s.productId === where.productId &&
            (!where.warehouseId || s.warehouseId === where.warehouseId)
          ) || null;
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newStock = { id: `stk-${Date.now()}-${Math.random()}`, ...data };
          inMemoryDb.stocks.push(newStock);
          return newStock;
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const index = inMemoryDb.stocks.findIndex(s => s.id === where.id);
          if (index === -1) return null;
          inMemoryDb.stocks[index] = { ...inMemoryDb.stocks[index], ...data };
          return inMemoryDb.stocks[index];
        }),
      },
      stockLedger: {
        create: jest.fn().mockImplementation(({ data }) => {
          const entry = { id: `stk-led-${Date.now()}-${Math.random()}`, ...data };
          inMemoryDb.stockLedgers.push(entry);
          return entry;
        }),
        deleteMany: jest.fn().mockImplementation(({ where }) => {
          inMemoryDb.stockLedgers = inMemoryDb.stockLedgers.filter(l => l.referenceId !== where.referenceId);
          return { count: 1 };
        }),
      },
      auditLog: {
        create: jest.fn().mockImplementation(({ data }) => {
          const log = { id: `log-${Date.now()}`, ...data };
          inMemoryDb.auditLogs.push(log);
          return log;
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: mockUserId, name: 'Admin User' }),
      },
    });

    const txMock = createTxMock();

    mockPrisma = {
      ...txMock,
      $transaction: jest.fn().mockImplementation(async (callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          return callbackOrArray(txMock);
        }
        return Promise.all(callbackOrArray);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsReceiptsService,
        PurchaseOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SequenceService, useValue: mockSequenceService },
      ],
    }).compile();

    goodsReceiptsService = module.get<GoodsReceiptsService>(GoodsReceiptsService);
    purchaseOrdersService = module.get<PurchaseOrdersService>(PurchaseOrdersService);

    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. Saving an unreceived Purchase Order does NOT change stock or stock ledgers', async () => {
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-001',
      date: '2026-10-15',
      items: [
        {
          productId: mockProductGoods.id,
          description: mockProductGoods.name,
          qty: 50,
          rate: 500,
          taxPercent: 18,
          discount: 5,
        },
      ],
    });

    expect(po).toBeDefined();
    expect(po.orderNo).toBe('PO-2026-001');
    expect(inMemoryDb.stocks.length).toBe(0);
    expect(inMemoryDb.stockLedgers.length).toBe(0);
  });

  it('2. Receiving physical goods increases stock by exact received quantity and records StockLedger', async () => {
    // 1. Create PO for 20 units
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-002',
      date: '2026-10-15',
      items: [
        {
          productId: mockProductGoods.id,
          description: mockProductGoods.name,
          qty: 20,
          rate: 500,
          taxPercent: 18,
        },
      ],
    });

    // 2. Receive 10 units via Goods Receipt
    const gr = await goodsReceiptsService.create({
      businessPartnerId: 'bp-vendor-1',
      receiptNo: 'GRN-0001',
      purchaseOrderId: po.id,
      date: '2026-10-15',
      items: [
        {
          productId: mockProductGoods.id,
          description: mockProductGoods.name,
          qty: 10,
        },
      ],
    });

    expect(gr).toBeDefined();

    // Check Stock
    const stock = inMemoryDb.stocks.find(s => s.productId === mockProductGoods.id);
    expect(stock).toBeDefined();
    expect(stock.quantity).toBe(10);
    expect(stock.availableQuantity).toBe(10);

    // Check Stock Ledger
    const ledger = inMemoryDb.stockLedgers.find(l => l.productId === mockProductGoods.id);
    expect(ledger).toBeDefined();
    expect(ledger.type).toBe('PURCHASE');
    expect(ledger.quantityChange).toBe(10);
    expect(ledger.quantityAfter).toBe(10);
    expect(ledger.referenceType).toBe('GOODS_RECEIPT');

    // Check PO status is PARTIAL
    const updatedPo = inMemoryDb.purchaseOrders.find(p => p.id === po.id);
    expect(updatedPo.status).toBe('PARTIAL');
    expect(updatedPo.gstBreakup.receivedQty[po.items[0].id]).toBe(10);
  });

  it('3. Completing remaining receipt updates PO status to CONVERTED (Fully Received)', async () => {
    // 1. Create PO for 100 units
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-003',
      date: '2026-10-15',
      items: [
        {
          productId: mockProductGoods.id,
          description: mockProductGoods.name,
          qty: 100,
          rate: 500,
          taxPercent: 18,
        },
      ],
    });

    // 2. First receipt: 60 units
    await goodsReceiptsService.create({
      businessPartnerId: 'bp-vendor-1',
      receiptNo: 'GRN-PARTIAL-1',
      purchaseOrderId: po.id,
      date: '2026-10-15',
      items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 60 }],
    });

    let stock = inMemoryDb.stocks.find(s => s.productId === mockProductGoods.id);
    expect(stock.quantity).toBe(60);

    let updatedPo = inMemoryDb.purchaseOrders.find(p => p.id === po.id);
    expect(updatedPo.status).toBe('PARTIAL');

    // 3. Second receipt: remaining 40 units
    await goodsReceiptsService.create({
      businessPartnerId: 'bp-vendor-1',
      receiptNo: 'GRN-FINAL-1',
      purchaseOrderId: po.id,
      date: '2026-10-16',
      items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 40 }],
    });

    stock = inMemoryDb.stocks.find(s => s.productId === mockProductGoods.id);
    expect(stock.quantity).toBe(100);

    updatedPo = inMemoryDb.purchaseOrders.find(p => p.id === po.id);
    expect(updatedPo.status).toBe('CONVERTED');
    expect(updatedPo.gstBreakup.receivedQty[po.items[0].id]).toBe(100);
  });

  it('4. Over-receipt is strictly rejected with ConflictException', async () => {
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-004',
      date: '2026-10-15',
      items: [
        {
          productId: mockProductGoods.id,
          description: mockProductGoods.name,
          qty: 10,
          rate: 500,
          taxPercent: 18,
        },
      ],
    });

    // Attempt to receive 15 units when only 10 were ordered
    await expect(
      goodsReceiptsService.create({
        businessPartnerId: 'bp-vendor-1',
        receiptNo: 'GRN-OVER-1',
        purchaseOrderId: po.id,
        date: '2026-10-15',
        items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 15 }],
      })
    ).rejects.toThrow(ConflictException);

    // Stock must remain zero
    expect(inMemoryDb.stocks.length).toBe(0);
  });

  it('5. Cannot receive goods against a CANCELLED Purchase Order', async () => {
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-005',
      date: '2026-10-15',
      items: [
        {
          productId: mockProductGoods.id,
          description: mockProductGoods.name,
          qty: 25,
          rate: 500,
          taxPercent: 18,
        },
      ],
    });

    // Cancel PO
    await purchaseOrdersService.update(po.id, { status: 'CANCELLED' });

    // Attempt to receive goods
    await expect(
      goodsReceiptsService.create({
        businessPartnerId: 'bp-vendor-1',
        receiptNo: 'GRN-CANC-1',
        purchaseOrderId: po.id,
        date: '2026-10-15',
        items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 10 }],
      })
    ).rejects.toThrow(ConflictException);

    expect(inMemoryDb.stocks.length).toBe(0);
  });

  it('6. Cannot cancel a Purchase Order that has already received goods', async () => {
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-006',
      date: '2026-10-15',
      items: [
        {
          productId: mockProductGoods.id,
          description: mockProductGoods.name,
          qty: 50,
          rate: 500,
          taxPercent: 18,
        },
      ],
    });

    // Receive 20 units
    await goodsReceiptsService.create({
      businessPartnerId: 'bp-vendor-1',
      receiptNo: 'GRN-0006',
      purchaseOrderId: po.id,
      date: '2026-10-15',
      items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 20 }],
    });

    // Attempt to cancel PO
    await expect(
      purchaseOrdersService.update(po.id, { status: 'CANCELLED' })
    ).rejects.toThrow(ConflictException);
  });

  it('7. Service items do NOT increase physical inventory or stock ledgers', async () => {
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-007',
      date: '2026-10-15',
      items: [
        {
          productId: mockProductService.id,
          description: mockProductService.name,
          qty: 5, // 5 hours of service
          rate: 1500,
          taxPercent: 18,
        },
      ],
    });

    // Receive service line
    await goodsReceiptsService.create({
      businessPartnerId: 'bp-vendor-1',
      receiptNo: 'GRN-SRV-1',
      purchaseOrderId: po.id,
      date: '2026-10-15',
      items: [{ productId: mockProductService.id, description: mockProductService.name, qty: 5 }],
    });

    // Physical stock must NOT be created for service!
    expect(inMemoryDb.stocks.length).toBe(0);
    expect(inMemoryDb.stockLedgers.length).toBe(0);

    // But PO status should be CONVERTED (fulfilled)
    const updatedPo = inMemoryDb.purchaseOrders.find(p => p.id === po.id);
    expect(updatedPo.status).toBe('CONVERTED');
  });

  it('8. Multiple products in one PO update their own stock balances independently', async () => {
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-008',
      date: '2026-10-15',
      items: [
        {
          productId: mockProductGoods.id,
          description: mockProductGoods.name,
          qty: 30,
          rate: 500,
          taxPercent: 18,
        },
        {
          productId: mockProductGoods2.id,
          description: mockProductGoods2.name,
          qty: 60,
          rate: 50,
          taxPercent: 18,
        },
      ],
    });

    // Receive 15 valves and 40 gaskets
    await goodsReceiptsService.create({
      businessPartnerId: 'bp-vendor-1',
      receiptNo: 'GRN-MULTI-1',
      purchaseOrderId: po.id,
      date: '2026-10-15',
      items: [
        { productId: mockProductGoods.id, description: mockProductGoods.name, qty: 15 },
        { productId: mockProductGoods2.id, description: mockProductGoods2.name, qty: 40 },
      ],
    });

    const stockValve = inMemoryDb.stocks.find(s => s.productId === mockProductGoods.id);
    const stockGasket = inMemoryDb.stocks.find(s => s.productId === mockProductGoods2.id);

    expect(stockValve.quantity).toBe(15);
    expect(stockGasket.quantity).toBe(40);

    const updatedPo = inMemoryDb.purchaseOrders.find(p => p.id === po.id);
    expect(updatedPo.status).toBe('PARTIAL');
  });

  it('9. Duplicate receipt number is rejected to prevent double-posting stock', async () => {
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-009',
      date: '2026-10-15',
      items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 10, rate: 500, taxPercent: 18 }],
    });

    await goodsReceiptsService.create({
      businessPartnerId: 'bp-vendor-1',
      receiptNo: 'GRN-DUP-TEST',
      purchaseOrderId: po.id,
      date: '2026-10-15',
      items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 5 }],
    });

    // Second request with exact same receipt number
    await expect(
      goodsReceiptsService.create({
        businessPartnerId: 'bp-vendor-1',
        receiptNo: 'GRN-DUP-TEST',
        purchaseOrderId: po.id,
        date: '2026-10-15',
        items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 5 }],
      })
    ).rejects.toThrow(ConflictException);

    // Stock should only be 5, NOT 10!
    const stock = inMemoryDb.stocks.find(s => s.productId === mockProductGoods.id);
    expect(stock.quantity).toBe(5);
  });

  it('10. Deleting a Goods Receipt reverses stock and updates PO status safely', async () => {
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-010',
      date: '2026-10-15',
      items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 20, rate: 500, taxPercent: 18 }],
    });

    const gr = await goodsReceiptsService.create({
      businessPartnerId: 'bp-vendor-1',
      receiptNo: 'GRN-REV-1',
      purchaseOrderId: po.id,
      date: '2026-10-15',
      items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 20 }],
    });

    expect(inMemoryDb.stocks[0].quantity).toBe(20);
    expect(inMemoryDb.purchaseOrders[0].status).toBe('CONVERTED');

    // Delete GR
    await goodsReceiptsService.remove(gr.id, mockUserId);

    // Stock must be reversed back to 0
    expect(inMemoryDb.stocks[0].quantity).toBe(0);
    expect(inMemoryDb.purchaseOrders[0].status).toBe('DRAFT');
  });

  it('11. Decimal quantities are accurately handled with unit precision', async () => {
    const po = await purchaseOrdersService.create({
      businessPartnerId: 'bp-vendor-1',
      orderNo: 'PO-2026-011',
      date: '2026-10-15',
      items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 12.75, rate: 500, taxPercent: 18 }],
    });

    await goodsReceiptsService.create({
      businessPartnerId: 'bp-vendor-1',
      receiptNo: 'GRN-DEC-1',
      purchaseOrderId: po.id,
      date: '2026-10-15',
      items: [{ productId: mockProductGoods.id, description: mockProductGoods.name, qty: 5.25 }],
    });

    const stock = inMemoryDb.stocks.find(s => s.productId === mockProductGoods.id);
    expect(stock.quantity).toBe(5.25);

    const updatedPo = inMemoryDb.purchaseOrders.find(p => p.id === po.id);
    expect(updatedPo.status).toBe('PARTIAL');
  });
});
