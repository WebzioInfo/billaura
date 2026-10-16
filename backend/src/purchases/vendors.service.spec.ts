import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../database/prisma.service';
import { SequenceService } from '../shared/sequence/sequence.service';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';

describe('VendorsService - Zoho Vendor Management Integrity', () => {
  let service: VendorsService;
  let prisma: any;
  let sequenceService: any;
  let accountingEngine: any;

  const mockCompanyId = 'cmp-vendor-tenant-123';
  let businessPartnersStore: any[] = [];
  let contactsStore: any[] = [];
  let purchasesStore: any[] = [];
  let purchaseOrdersStore: any[] = [];
  let transactionPaymentsStore: any[] = [];
  let invoicesStore: any[] = [];

  beforeEach(async () => {
    businessPartnersStore = [];
    contactsStore = [];
    purchasesStore = [];
    purchaseOrdersStore = [];
    transactionPaymentsStore = [];
    invoicesStore = [];

    const mockTx = {
      businessPartner: {
        create: jest.fn().mockImplementation(({ data }) => {
          const rec = { id: `bp-${Date.now()}-${Math.random()}`, deletedAt: null, ...data };
          businessPartnersStore.push(rec);
          return Promise.resolve(rec);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            businessPartnersStore.find((bp) => {
              if (where.companyId && bp.companyId !== where.companyId) return false;
              if (where.id && bp.id !== where.id) return false;
              if (where.deletedAt === null && bp.deletedAt != null) return false;
              if (where.gstin && bp.gstin !== where.gstin) return false;
              if (where.id?.not && bp.id === where.id.not) return false;
              return true;
            }) || null
          );
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const item = businessPartnersStore.find((bp) => bp.id === where.id);
          if (item) {
            Object.assign(item, data);
            return Promise.resolve(item);
          }
          return Promise.resolve({ id: where.id, ...data });
        }),
      },
      contact: {
        create: jest.fn().mockImplementation(({ data }) => {
          const c = { id: `ct-${Date.now()}-${Math.random()}`, ...data };
          contactsStore.push(c);
          return Promise.resolve(c);
        }),
        deleteMany: jest.fn().mockImplementation(({ where }) => {
          const prevCount = contactsStore.length;
          contactsStore = contactsStore.filter((c) => c.businessPartnerId !== where.businessPartnerId);
          return Promise.resolve({ count: prevCount - contactsStore.length });
        }),
      },
      account: {
        findFirst: jest.fn().mockResolvedValue({ id: 'acc-ap-1', name: 'Accounts Payable' }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `acc-${Date.now()}`, ...data })),
      },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return cb(mockTx);
        }
        return Promise.all(cb);
      }),
      businessPartner: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            businessPartnersStore.filter((bp) => {
              if (where.companyId && bp.companyId !== where.companyId) return false;
              if (where.deletedAt === null && bp.deletedAt !== null) return false;
              return true;
            })
          );
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            businessPartnersStore.filter((bp) => {
              if (where.companyId && bp.companyId !== where.companyId) return false;
              if (where.deletedAt === null && bp.deletedAt !== null) return false;
              return true;
            }).length
          );
        }),
        findFirst: mockTx.businessPartner.findFirst,
        update: mockTx.businessPartner.update,
      },
      purchase: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            purchasesStore.filter((p) => p.businessPartnerId === where.businessPartnerId && p.deletedAt === null).length
          );
        }),
      },
      invoice: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            invoicesStore.filter((i) => i.businessPartnerId === where.businessPartnerId && i.deletedAt === null).length
          );
        }),
      },
      purchaseOrder: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            purchaseOrdersStore.filter((po) => po.businessPartnerId === where.businessPartnerId && po.deletedAt === null).length
          );
        }),
      },
      transactionPayment: {
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            transactionPaymentsStore.filter((tp) => tp.businessPartnerId === where.businessPartnerId).length
          );
        }),
      },
    };

    sequenceService = {
      generateNextSequence: jest.fn().mockResolvedValue('VEND-0001'),
    };

    accountingEngine = {
      postTransaction: jest.fn().mockResolvedValue({ id: 'je-ob-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SequenceService, useValue: sequenceService },
        { provide: AccountingEngineService, useValue: accountingEngine },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  describe('Vendor Creation', () => {
    it('creates a vendor with minimal required fields', async () => {
      const dto: CreateVendorDto = {
        name: 'Apex Industrial Supplies',
      };

      const result = await service.create(mockCompanyId, dto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Apex Industrial Supplies');
      expect(result.bpCode).toBe('VEND-0001');
      expect(result.bpType).toBe('VENDOR');
      expect(result.balance).toBe(0);
    });

    it('rejects vendor creation when name is empty', async () => {
      const dto = { name: '   ' } as any;
      await expect(service.create(mockCompanyId, dto)).rejects.toThrow(BadRequestException);
    });

    it('creates a comprehensive vendor with all Zoho tabs and nested entities', async () => {
      const dto: CreateVendorDto = {
        name: 'Omni Steel Fabricators',
        companyName: 'Omni Steel Pvt Ltd',
        salutation: 'Mr.',
        firstName: 'Rajesh',
        lastName: 'Sharma',
        email: 'rajesh@omnisteel.com',
        workPhone: '022-28490000',
        mobile: '9820011223',
        gstTreatment: 'Registered Business - Regular',
        gstin: '27AABCO1234F1Z5',
        sourceOfSupply: 'Maharashtra',
        msmeRegistered: true,
        msmeRegNo: 'UDYAM-MH-01-0001234',
        paymentTerms: 'Net 30',
        openingBalanceType: 'CREDIT_BALANCE',
        openingBalanceAmount: 25000,
        billingAddress: {
          attention: 'Accounts Dept',
          country: 'India',
          street1: 'Plot 42, MIDC Industrial Area',
          street2: 'Andheri East',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400093',
          phone: '9820011223',
        },
        shippingAddress: {
          attention: 'Warehouse Incharge',
          country: 'India',
          street1: 'Warehouse Shed 7, MIDC',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400093',
        },
        contactPersons: [
          {
            salutation: 'Ms.',
            firstName: 'Pooja',
            lastName: 'Mehta',
            email: 'pooja@omnisteel.com',
            mobile: '9820099887',
          },
        ],
        bankAccounts: [
          {
            accountHolderName: 'Omni Steel Pvt Ltd',
            bankName: 'HDFC Bank',
            accountNumber: '50200012345678',
            ifsc: 'HDFC0000123',
            branch: 'Andheri East',
            isDefault: true,
          },
        ],
        remarks: 'Preferred steel supplier with volume discounts',
      };

      const result = await service.create(mockCompanyId, dto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Omni Steel Fabricators');
      expect(result.companyName).toBe('Omni Steel Pvt Ltd');
      expect(result.gstin).toBe('27AABCO1234F1Z5');
      expect(result.panNumber).toBe('AABCO1234F');
      expect(result.msmeRegistered).toBe(true);
      expect(result.billingAddress.city).toBe('Mumbai');
      expect(result.shippingAddress.street1).toContain('Warehouse Shed 7');
      expect(result.contactPersons).toHaveLength(1);
      expect(result.contactPersons[0].firstName).toBe('Pooja');
      expect(result.bankAccounts).toHaveLength(1);
      expect(result.bankAccounts[0].bankName).toBe('HDFC Bank');
      expect(result.remarks).toBe('Preferred steel supplier with volume discounts');
      expect(result.balance).toBe(25000);

      // Verify contact was synced to relational table
      expect(contactsStore).toHaveLength(1);
      expect(contactsStore[0].firstName).toBe('Pooja');

      // Verify accounting opening balance posting
      expect(accountingEngine.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: mockCompanyId,
          reference: expect.stringContaining('VOB-'),
          lines: expect.arrayContaining([
            expect.objectContaining({ debit: 25000, credit: 0 }),
            expect.objectContaining({ debit: 0, credit: 25000 }),
          ]),
        }),
        expect.anything()
      );
    });

    it('rejects duplicate GSTIN within the same tenant', async () => {
      const firstDto: CreateVendorDto = {
        name: 'Vendor A',
        gstin: '27AABCT1234F1Z5',
      };
      await service.create(mockCompanyId, firstDto);

      const duplicateDto: CreateVendorDto = {
        name: 'Vendor B',
        gstin: '27AABCT1234F1Z5',
      };
      await expect(service.create(mockCompanyId, duplicateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Vendor Deletion Safety Checks', () => {
    it('prevents deletion of vendor with non-zero outstanding balance', async () => {
      const vendor = await service.create(mockCompanyId, {
        name: 'Vendor with Balance',
        openingBalanceType: 'CREDIT_BALANCE',
        openingBalanceAmount: 5000,
      });

      await expect(service.remove(vendor.id, mockCompanyId)).rejects.toThrow(
        /active outstanding balance/
      );
    });

    it('prevents deletion of vendor with existing purchase bills or purchase orders', async () => {
      const vendor = await service.create(mockCompanyId, {
        name: 'Vendor with Purchases',
      });

      purchasesStore.push({
        id: 'pur-1',
        businessPartnerId: vendor.id,
        companyId: mockCompanyId,
        deletedAt: null,
      });

      await expect(service.remove(vendor.id, mockCompanyId)).rejects.toThrow(
        /preserve financial audit integrity/
      );
    });

    it('allows clean soft deletion when vendor has no financial records', async () => {
      const vendor = await service.create(mockCompanyId, {
        name: 'Clean Vendor',
      });

      await service.remove(vendor.id, mockCompanyId);

      const itemInStore = businessPartnersStore.find((bp) => bp.id === vendor.id);
      expect(itemInStore.deletedAt).toBeInstanceOf(Date);
    });
  });
});
