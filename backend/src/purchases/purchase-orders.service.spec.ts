import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaService } from '../database/prisma.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { CompanyContext } from '../common/context/company-context';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('PurchaseOrdersService - Zoho Purchase Order Functionality', () => {
  let service: PurchaseOrdersService;
  let prisma: PrismaService;
  let sequenceService: SequenceService;

  const mockCompanyId = 'comp-zoho-test-123';
  const mockUserId = 'user-admin-456';

  const mockPrisma = {
    $transaction: jest.fn(async (cb) => {
      if (typeof cb === 'function') {
        return cb(mockPrisma);
      }
      return cb;
    }),
    purchaseOrder: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    purchaseOrderItem: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: mockUserId, name: 'Admin User', email: 'admin@billaura.com' }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };

  const mockSequenceService = {
    getConfig: jest.fn().mockResolvedValue({ currentNumber: 5, prefix: 'PO-', padding: 5 }),
    generateNextSequence: jest.fn().mockResolvedValue('PO-00006'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(CompanyContext, 'getCompanyId').mockReturnValue(mockCompanyId);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SequenceService, useValue: mockSequenceService },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    sequenceService = module.get<SequenceService>(SequenceService);
  });

  describe('Purchase Order Numbering', () => {
    it('1. should generate the next sequence number based on company configuration', async () => {
      const res = await service.getNextNumber();
      expect(res).toEqual({ nextNumber: 'PO-00006' });
      expect(mockSequenceService.getConfig).toHaveBeenCalledWith(mockCompanyId, 'PURCHASE_ORDER');
    });

    it('2. should reject creating a purchase order with duplicate orderNo', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValueOnce({ id: 'existing-po', orderNo: 'PO-00001' });

      await expect(
        service.create({
          businessPartnerId: 'vendor-1',
          orderNo: 'PO-00001',
          date: '2026-10-16',
          items: [{ description: 'Test Item', qty: 1, rate: 100, taxPercent: 18 }],
        } as any)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Item Calculations & Financial Totals', () => {
    it('3. should create a PO with valid items and accurately compute gross, tax, and grand total', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValueOnce(null);
      mockPrisma.purchaseOrder.create.mockImplementationOnce((args) => Promise.resolve({ id: 'po-new-1', ...args.data }));

      const res = await service.create({
        businessPartnerId: 'vendor-1',
        orderNo: 'PO-00006',
        date: '2026-10-16',
        deliveryAddressType: 'ORGANIZATION',
        items: [
          { description: 'Widget A', qty: 10, rate: 100, taxPercent: 18, discount: 10 }, // Gross: 1000, Disc: 100, Taxable: 900, Tax: 162
          { description: 'Service B', qty: 2, rate: 500, taxPercent: 18, discount: 0 },    // Gross: 1000, Disc: 0, Taxable: 1000, Tax: 180
        ],
      } as any);

      // Subtotal = 900 + 1000 = 1900 taxable
      // TaxTotal = 162 + 180 = 342
      // GrandTotal = 1900 + 342 = 2242
      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: mockCompanyId,
            businessPartnerId: 'vendor-1',
            orderNo: 'PO-00006',
            subTotal: 2000, // Gross sum (1000 + 1000)
            taxTotal: 342,
            grandTotal: 2242,
          }),
        })
      );
    });

    it('4. should require at least one item and throw BadRequestException if items are empty', async () => {
      await expect(
        service.create({
          businessPartnerId: 'vendor-1',
          orderNo: 'PO-00006',
          date: '2026-10-16',
          items: [],
        } as any)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('TDS and TCS Accounting Handling', () => {
    it('5. should accurately calculate TDS deduction (subtracted from grand total)', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValueOnce(null);
      mockPrisma.purchaseOrder.create.mockImplementationOnce((args) => Promise.resolve({ id: 'po-tds', ...args.data }));

      // 10 qty * 1000 rate = 10,000 taxable. Tax (18%) = 1,800.
      // TDS 2% (Sec 194I) on 10,000 = 200 deduction
      // Grand Total = 10,000 + 1,800 - 200 = 11,600
      await service.create({
        businessPartnerId: 'vendor-1',
        orderNo: 'PO-00007',
        date: '2026-10-16',
        tdsTcsType: 'TDS',
        tdsTcsRate: 2,
        tdsTcsAmount: 200,
        tdsTcsTaxId: 'tds-2',
        items: [{ description: 'Heavy Machinery Lease', qty: 10, rate: 1000, taxPercent: 18 }],
      } as any);

      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            grandTotal: 11600,
            gstBreakup: expect.objectContaining({
              tdsTcsType: 'TDS',
              tdsTcsRate: 2,
              tdsTcsAmount: 200,
            }),
          }),
        })
      );
    });

    it('6. should accurately calculate TCS addition (added to grand total)', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValueOnce(null);
      mockPrisma.purchaseOrder.create.mockImplementationOnce((args) => Promise.resolve({ id: 'po-tcs', ...args.data }));

      // 10 qty * 1000 rate = 10,000 taxable. Tax (18%) = 1,800.
      // TCS 1% (Sec 206C) on 10,000 = 100 addition
      // Grand Total = 10,000 + 1,800 + 100 = 11,900
      await service.create({
        businessPartnerId: 'vendor-1',
        orderNo: 'PO-00008',
        date: '2026-10-16',
        tdsTcsType: 'TCS',
        tdsTcsRate: 1,
        tdsTcsAmount: 100,
        tdsTcsTaxId: 'tcs-1',
        items: [{ description: 'Scrap Metal', qty: 10, rate: 1000, taxPercent: 18 }],
      } as any);

      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            grandTotal: 11900,
            gstBreakup: expect.objectContaining({
              tdsTcsType: 'TCS',
              tdsTcsRate: 1,
              tdsTcsAmount: 100,
            }),
          }),
        })
      );
    });
  });

  describe('Delivery Address Persistence (Organization vs Customer)', () => {
    it('7. should persist customer delivery address destination and helper metadata', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValueOnce(null);
      mockPrisma.purchaseOrder.create.mockImplementationOnce((args) => Promise.resolve({ id: 'po-cust', ...args.data }));

      await service.create({
        businessPartnerId: 'vendor-1',
        orderNo: 'PO-00009',
        date: '2026-10-16',
        deliveryAddressType: 'CUSTOMER',
        deliveryCustomerId: 'cust-999',
        deliveryCustomerName: 'Apex Logistics',
        deliveryCustomerAddress: 'Dock 4, Industrial Area, Mumbai',
        items: [{ description: 'Drop Ship Goods', qty: 5, rate: 200, taxPercent: 18 }],
      } as any);

      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gstBreakup: expect.objectContaining({
              deliveryAddressType: 'CUSTOMER',
              deliveryCustomerId: 'cust-999',
              deliveryCustomerName: 'Apex Logistics',
            }),
          }),
        })
      );
    });
  });
});
