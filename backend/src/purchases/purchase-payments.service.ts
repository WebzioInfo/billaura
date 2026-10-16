import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreatePurchasePaymentDto,
  UpdatePurchasePaymentDto,
} from './dto/purchase-payment.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, toPaginatedResult } from '../common/pagination';
import { CompanyContext } from '../common/context/company-context';
import type { Prisma } from '@prisma/client';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { SequenceService } from '../shared/sequence/sequence.service';

export interface PaymentMetadata {
  status?: 'DRAFT' | 'PAID';
  type?: 'BILL_PAYMENT' | 'VENDOR_ADVANCE';
  sourceOfSupply?: string;
  destinationOfSupply?: string;
  descriptionOfSupply?: string;
  isRcm?: boolean;
  tdsTaxId?: string;
  tdsRate?: number;
  tdsAmount?: number;
  depositToAccountId?: string;
  attachedFiles?: any[];
  notes?: string;
}

function parsePaymentMetadata(payment: any) {
  if (!payment) return null;
  let meta: PaymentMetadata = {};
  let cleanNotes = payment.notes || '';
  if (payment.notes && typeof payment.notes === 'string') {
    try {
      if (payment.notes.startsWith('{') && payment.notes.endsWith('}')) {
        meta = JSON.parse(payment.notes);
        cleanNotes = meta.notes || '';
      }
    } catch (_) {
      // plain text note
    }
  }

  const allocations = payment.allocations || [];
  const allocatedTotal = allocations.reduce(
    (sum: number, a: any) => sum + Number(a.amount || 0),
    0
  );
  const amountNum = Number(payment.amount || 0);
  const unusedAmount =
    meta.type === 'VENDOR_ADVANCE'
      ? amountNum
      : Math.max(0, Number((amountNum - allocatedTotal).toFixed(2)));

  return {
    ...payment,
    paymentNumber: payment.paymentNo,
    paymentMode: payment.method,
    status: meta.status || 'PAID',
    type: meta.type || 'BILL_PAYMENT',
    sourceOfSupply: meta.sourceOfSupply || null,
    destinationOfSupply: meta.destinationOfSupply || null,
    descriptionOfSupply: meta.descriptionOfSupply || null,
    isRcm: meta.isRcm ?? false,
    tdsTaxId: meta.tdsTaxId || null,
    tdsRate: meta.tdsRate || 0,
    tdsAmount: meta.tdsAmount || 0,
    depositToAccountId: meta.depositToAccountId || null,
    attachedFiles: meta.attachedFiles || [],
    unusedAmount,
    allocatedAmount: allocatedTotal,
    billNo:
      allocations
        .map((a: any) => a.purchase?.purchaseNo)
        .filter(Boolean)
        .join(', ') || undefined,
    notes: cleanNotes,
  };
}

@Injectable()
export class PurchasePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingEngine: AccountingEngineService,
    private readonly sequenceService: SequenceService
  ) {}

  async getNextNumber() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }
    const nextNumber = await this.sequenceService.previewNextSequence(
      companyId,
      'PAYMENT'
    );
    return { nextNumber };
  }

  async findAll(query: PaginationQueryDto & { vendorId?: string; status?: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.TransactionPaymentWhereInput = {
      companyId,
      deletedAt: null,
      paymentType: 'OUTBOUND',
      ...(query.vendorId ? { businessPartnerId: query.vendorId } : {}),
      ...(query.search
        ? {
            OR: [
              { paymentNo: { contains: query.search } },
              { reference: { contains: query.search } },
              { businessPartner: { name: { contains: query.search } } },
              {
                allocations: {
                  some: {
                    purchase: { purchaseNo: { contains: query.search } },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transactionPayment.findMany({
        where,
        skip,
        take,
        include: {
          businessPartner: true,
          bankAccount: true,
          allocations: {
            include: { purchase: true },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.transactionPayment.count({ where }),
    ]);

    const enriched = data.map((p) => parsePaymentMetadata(p));

    // Optional in-memory status filter if query specifies
    const filtered = query.status
      ? enriched.filter(
          (p) =>
            (p?.status || 'PAID').toUpperCase() === query.status?.toUpperCase()
        )
      : enriched;

    return toPaginatedResult(filtered, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const payment = await this.prisma.transactionPayment.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        businessPartner: true,
        bankAccount: true,
        allocations: { include: { purchase: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Purchase Payment with ID ${id} not found`);
    }

    return parsePaymentMetadata(payment);
  }

  async create(
    dto: CreatePurchasePaymentDto,
    txClient?: Prisma.TransactionClient
  ) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const vendor = await this.prisma.businessPartner.findFirst({
      where: { id: dto.vendorId, companyId },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
    }

    const isDraft = dto.status === 'DRAFT';
    const isVendorAdvance = dto.type === 'VENDOR_ADVANCE';

    // 1. Resolve Bank and Ledger Account
    const isCashPayment = dto.method === 'CASH';
    let ledgerId = dto.bankAccountId?.trim() || undefined;

    let bank: any = null;
    let ledger: any = null;

    if (ledgerId) {
      // Check if ID is a BankAccount
      bank = await this.prisma.bankAccount.findFirst({
        where: { id: ledgerId, companyId, deletedAt: null },
      });
      if (bank) {
        ledger = bank.accountId
          ? await this.prisma.account.findFirst({
              where: { id: bank.accountId, companyId },
            })
          : await this.prisma.account.findFirst({
              where: { companyId, name: bank.name },
            });
      } else {
        // ID may be an Account ID from Chart of Accounts
        ledger = await this.prisma.account.findFirst({
          where: { id: ledgerId, companyId },
        });
        if (ledger) {
          bank = await this.prisma.bankAccount.findFirst({
            where: {
              companyId,
              deletedAt: null,
              OR: [
                { name: ledger.name },
                { bankName: ledger.name },
                ...(ledger.code ? [{ accountNumber: ledger.code }] : []),
              ],
            },
          });
        }
      }
    }

    if (!ledger) {
      // Fallback for Cash
      ledger = await this.prisma.account.findFirst({
        where: {
          companyId,
          isGroup: false,
          category: 'ASSET',
          OR: [
            { name: { contains: 'cash', mode: 'insensitive' } },
            { parent: { name: { contains: 'cash', mode: 'insensitive' } } },
          ],
        },
        orderBy: { name: 'asc' },
      });
      if (!ledger) {
        ledger = await this.prisma.account.create({
          data: {
            companyId,
            name: 'Petty Cash',
            category: 'ASSET',
            balance: 0,
          },
        });
      }
    }

    if (!bank) {
      bank = await this.prisma.bankAccount.create({
        data: {
          companyId,
          name: ledger.name,
          accountName: ledger.name,
          bankName: ledger.name,
          accountNumber: ledger.code || null,
          accountType: isCashPayment ? 'CURRENT' : 'CURRENT',
          openingBalance: 0,
          currentBalance: 0,
          status: 'ACTIVE',
          isDefault: isCashPayment,
        },
      });
    }

    // 2. Prepare allocations (for BILL_PAYMENT)
    const rawAllocations = Array.isArray(dto.allocations) && dto.allocations.length > 0
      ? dto.allocations
      : dto.purchaseId && dto.amount > 0
      ? [{ purchaseId: dto.purchaseId, amount: dto.amount }]
      : [];

    const execute = async (tx: Prisma.TransactionClient) => {
      // 3. Payment Number: Custom or auto-generated
      let paymentNo = (dto.paymentNumber || dto.paymentNo)?.trim();
      if (paymentNo) {
        const existing = await tx.transactionPayment.findFirst({
          where: { companyId, paymentNo, deletedAt: null },
        });
        if (existing) {
          throw new ConflictException(
            `Payment number "${paymentNo}" already exists in this company`
          );
        }
      } else {
        paymentNo = await this.sequenceService.generateNextSequence(
          companyId,
          'PAYMENT',
          tx
        );
      }

      // Metadata packing into notes JSON
      const metadataPayload: PaymentMetadata = {
        status: isDraft ? 'DRAFT' : 'PAID',
        type: isVendorAdvance ? 'VENDOR_ADVANCE' : 'BILL_PAYMENT',
        sourceOfSupply: dto.sourceOfSupply,
        destinationOfSupply: dto.destinationOfSupply,
        descriptionOfSupply: dto.descriptionOfSupply,
        isRcm: dto.isRcm,
        tdsTaxId: dto.tdsTaxId,
        tdsRate: dto.tdsRate,
        tdsAmount: dto.tdsAmount,
        depositToAccountId: dto.depositToAccountId,
        attachedFiles: dto.attachedFiles,
        notes: dto.notes,
      };

      // 4. Create TransactionPayment record
      const payment = await tx.transactionPayment.create({
        data: {
          companyId,
          businessPartnerId: dto.vendorId,
          bankAccountId: bank.id,
          paymentNo,
          paymentType: 'OUTBOUND',
          date: new Date(dto.date),
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference || null,
          chequeNumber: dto.chequeNumber || null,
          notes: JSON.stringify(metadataPayload),
        },
      });

      // 5. IF DRAFT: Do not update balances, bills, or ledgers
      if (isDraft) {
        // Save unposted allocations for draft editing
        if (rawAllocations.length > 0) {
          for (const alloc of rawAllocations) {
            if (alloc.amount > 0) {
              await tx.paymentAllocation.create({
                data: {
                  transactionPaymentId: payment.id,
                  purchaseId: alloc.purchaseId,
                  amount: alloc.amount,
                },
              });
            }
          }
        }
        return parsePaymentMetadata({ ...payment, allocations: [] });
      }

      // 6. IF PAID:
      if (isVendorAdvance) {
        // --- VENDOR ADVANCE WORKFLOW ---
        const tdsAmt = Number(dto.tdsAmount || 0);
        const netCashPayout = Math.max(0, Number(dto.amount) - tdsAmt);

        // Update Bank Balance
        await tx.bankAccount.update({
          where: { id: bank.id },
          data: {
            currentBalance: { decrement: netCashPayout },
          },
        });

        // Determine Deposit To account (Prepaid Expenses / Vendor Advances asset)
        let advanceAccount: any = null;
        if (dto.depositToAccountId) {
          advanceAccount = await tx.account.findFirst({
            where: { id: dto.depositToAccountId, companyId },
          });
        }
        if (!advanceAccount) {
          advanceAccount = await tx.account.findFirst({
            where: {
              companyId,
              name: { in: ['Vendor Advances', 'Prepaid Expenses', 'Advance to Vendors'] },
            },
          });
          if (!advanceAccount) {
            advanceAccount = await tx.account.create({
              data: {
                companyId,
                name: 'Vendor Advances',
                category: 'ASSET',
                balance: 0,
              },
            });
          }
        }

        // Post balanced Journal Entries for Vendor Advance
        const journalLines: Array<{ accountId: string; debit: number; credit: number }> = [];
        // Debit: Vendor Advances (Full amount)
        journalLines.push({ accountId: advanceAccount.id, debit: Number(dto.amount), credit: 0 });

        // If TDS: Credit TDS Payable
        if (tdsAmt > 0) {
          let tdsPayable = await tx.account.findFirst({
            where: { companyId, name: 'TDS Payable' },
          });
          if (!tdsPayable) {
            tdsPayable = await tx.account.create({
              data: {
                companyId,
                name: 'TDS Payable',
                category: 'LIABILITY',
                balance: 0,
              },
            });
          }
          journalLines.push({ accountId: tdsPayable.id, debit: 0, credit: tdsAmt });
        }

        // Credit: Bank / Cash (Net payout)
        journalLines.push({ accountId: ledger.id, debit: 0, credit: netCashPayout });

        await this.accountingEngine.postTransaction(
          {
            companyId,
            date: new Date(dto.date),
            reference: paymentNo,
            description: `Vendor Advance Payment ${paymentNo} - ${vendor.name}`,
            lines: journalLines,
          },
          tx
        );

        return parsePaymentMetadata(payment);
      }

      // --- BILL PAYMENT WORKFLOW ---
      let totalAllocated = 0;
      const validAllocations: Array<{ purchaseId: string; amount: number }> = [];

      for (const alloc of rawAllocations) {
        const allocAmt = Number(alloc.amount) || 0;
        if (allocAmt <= 0) continue;

        const purchase = await tx.purchase.findFirst({
          where: { id: alloc.purchaseId, companyId, businessPartnerId: dto.vendorId },
        });

        if (!purchase) {
          throw new BadRequestException(
            `Bill with ID ${alloc.purchaseId} not found for this vendor`
          );
        }

        const remainingDue = Math.max(
          0,
          Number(purchase.grandTotal) - Number(purchase.amountPaid)
        );
        if (allocAmt > remainingDue + 0.05) {
          throw new BadRequestException(
            `Allocation ₹${allocAmt} exceeds balance due ₹${remainingDue} on bill ${purchase.purchaseNo || purchase.id}`
          );
        }

        const newPaid = Number((Number(purchase.amountPaid) + allocAmt).toFixed(2));
        const newStatus =
          newPaid >= Number(purchase.grandTotal) - 0.01 ? 'PAID' : 'PARTIAL';

        await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            amountPaid: newPaid,
            status: newStatus,
          },
        });

        await tx.paymentAllocation.create({
          data: {
            transactionPaymentId: payment.id,
            purchaseId: purchase.id,
            amount: allocAmt,
          },
        });

        totalAllocated += allocAmt;
        validAllocations.push({ purchaseId: purchase.id, amount: allocAmt });
      }

      const totalPaidNum = Number(dto.amount);
      const unusedAmount = Math.max(0, Number((totalPaidNum - totalAllocated).toFixed(2)));

      // Update Vendor Payable Balance
      await tx.businessPartner.update({
        where: { id: dto.vendorId },
        data: {
          payableBalance: {
            decrement: totalAllocated,
          },
        },
      });

      // Update Bank Account Balance
      await tx.bankAccount.update({
        where: { id: bank.id },
        data: {
          currentBalance: {
            decrement: totalPaidNum,
          },
        },
      });

      // Post balanced General Ledger Journal Entry
      let apAccount = await tx.account.findFirst({
        where: { companyId, name: 'Accounts Payable' },
      });
      if (!apAccount) {
        apAccount = await tx.account.create({
          data: { companyId, name: 'Accounts Payable', category: 'LIABILITY', balance: 0 },
        });
      }

      const glLines: Array<{ accountId: string; debit: number; credit: number }> = [];

      if (totalAllocated > 0) {
        glLines.push({ accountId: apAccount.id, debit: totalAllocated, credit: 0 });
      }

      if (unusedAmount > 0) {
        let advAccount = await tx.account.findFirst({
          where: { companyId, name: 'Vendor Advances' },
        });
        if (!advAccount) {
          advAccount = await tx.account.create({
            data: { companyId, name: 'Vendor Advances', category: 'ASSET', balance: 0 },
          });
        }
        glLines.push({ accountId: advAccount.id, debit: unusedAmount, credit: 0 });
      }

      // Credit: Cash/Bank Account (Full payment amount)
      glLines.push({ accountId: ledger.id, debit: 0, credit: totalPaidNum });

      await this.accountingEngine.postTransaction(
        {
          companyId,
          date: new Date(dto.date),
          reference: paymentNo,
          description: `Vendor Bill Payment ${paymentNo} - ${vendor.name}`,
          lines: glLines,
        },
        tx
      );

      return parsePaymentMetadata({
        ...payment,
        allocations: validAllocations,
      });
    };

    if (txClient) {
      return execute(txClient);
    }
    return this.prisma.$transaction(execute, { timeout: 25000 });
  }

  async update(id: string, dto: UpdatePurchasePaymentDto) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // If existing was paid, first reverse its effects
    if (existing.status === 'PAID') {
      await this.remove(id);
    } else {
      // Clean up previous allocations for draft
      await this.prisma.paymentAllocation.deleteMany({
        where: { transactionPaymentId: id },
      });
      await this.prisma.transactionPayment.delete({
        where: { id },
      });
    }

    // Re-create payment with new data
    return this.create(dto);
  }

  async remove(id: string) {
    const payment = await this.findOne(id);
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Only revert financial records if the payment was actually posted (PAID)
      if (payment.status === 'PAID') {
        const allocations = payment.allocations || [];
        for (const alloc of allocations) {
          if (!alloc.purchaseId) continue;
          const pur = await tx.purchase.findFirst({
            where: { id: alloc.purchaseId },
          });
          if (pur) {
            const revertedPaid = Math.max(
              0,
              Number((Number(pur.amountPaid) - Number(alloc.amount)).toFixed(2))
            );
            const status = revertedPaid <= 0 ? 'SENT' : 'PARTIAL';
            await tx.purchase.update({
              where: { id: pur.id },
              data: { amountPaid: revertedPaid, status },
            });
          }
        }

        const allocatedTotal = payment.allocatedAmount || 0;
        if (allocatedTotal > 0) {
          await tx.businessPartner.update({
            where: { id: payment.businessPartnerId },
            data: {
              payableBalance: {
                increment: allocatedTotal,
              },
            },
          });
        }

        const netPaid = Number(payment.amount) - (payment.tdsAmount || 0);
        await tx.bankAccount.update({
          where: { id: payment.bankAccountId },
          data: {
            currentBalance: {
              increment: netPaid,
            },
          },
        });

        // Reverse Journal Entries
        const originalEntries = await tx.journalEntry.findMany({
          where: { reference: payment.paymentNo, companyId: payment.companyId },
        });

        for (const entry of originalEntries) {
          await this.accountingEngine.reverseTransaction(
            entry.id,
            payment.companyId,
            tx,
            `Reversal for deleted payment ${payment.paymentNo}`
          );
        }
      }

      // Soft delete payment
      return tx.transactionPayment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
