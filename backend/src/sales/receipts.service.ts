import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateReceiptDto, UpdateReceiptDto, ReceiptQueryDto } from './dto/receipt.dto';
import { CompanyContext } from '../common/context/company-context';
import { getPagination, toPaginatedResult } from '../common/pagination';
import type { Prisma } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { PurchasesService } from '../purchases/purchases.service';
import { PurchasePaymentsService } from '../purchases/purchase-payments.service';
import { ExpensesService } from '../expenses/expenses.service';
import { AccountingEngineService } from '../accounting/accounting-engine.service';
import { SequenceService } from '../shared/sequence/sequence.service';

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
    private readonly purchasesService: PurchasesService,
    private readonly purchasePaymentsService: PurchasePaymentsService,
    private readonly expensesService: ExpensesService,
    private readonly accountingEngine: AccountingEngineService,
    private readonly sequenceService: SequenceService,
  ) {}

  async findAll(query: ReceiptQueryDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const { skip, take } = getPagination(query);

    const where: Prisma.ReceiptWhereInput = {
      companyId,
      ...(query.search
        ? {
            OR: [
              { receiptNo: { contains: query.search } },
              { businessPartner: { name: { contains: query.search } } },
              { payments: { some: { referenceNo: { contains: query.search } } } },
            ],
          }
        : {}),
      ...(query.customerId ? { businessPartnerId: query.customerId } : {}),
      ...(query.paymentMethod ? { payments: { some: { paymentMethod: query.paymentMethod } } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.startDate && query.endDate
        ? {
            date: {
              gte: new Date(query.startDate),
              lte: new Date(query.endDate),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.receipt.findMany({
        where,
        skip,
        take,
        include: { businessPartner: true, payments: { include: { account: true } }, receivedBy: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.receipt.count({ where }),
    ]);

    return toPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const receipt = await this.prisma.receipt.findFirst({
      where: { id },
      include: {
        businessPartner: true,
        receivedBy: true,
        payments: { include: { account: true } },
        allocations: { include: { invoice: true } },
        attachments: true,
        audits: { include: { user: true } },
      },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    return receipt;
  }

  async getSummary() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const activeWhere = { companyId, status: 'COMPLETED' };

    const totalReceipts = await this.prisma.receipt.count({ where: activeWhere });

    const totalAmountRes = await this.prisma.receipt.aggregate({
      where: activeWhere,
      _sum: { amount: true },
    });

    const paymentMethodsGroup = await this.prisma.receiptPayment.groupBy({
      where: { receipt: activeWhere },
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: { id: true },
    });

    const recent = await this.prisma.receipt.findMany({
      where: { companyId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { businessPartner: true },
    });

    return {
      totalReceipts,
      totalAmount: totalAmountRes._sum.amount || 0,
      paymentMethods: paymentMethodsGroup.map((g) => ({
        method: g.paymentMethod,
        amount: g._sum.amount || 0,
        count: g._count.id,
      })),
      recent,
    };
  }

  async create(dto: CreateReceiptDto, userId: string, txClient?: Prisma.TransactionClient) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const customer = await this.prisma.businessPartner.findFirst({
      where: { id: dto.businessPartnerId, companyId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.businessPartnerId} not found`);
    }

    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        businessPartnerId: dto.businessPartnerId,
        NOT: { status: { in: ['PAID', 'DRAFT', 'CANCELLED'] } },
      },
    });
    const totalOutstanding = unpaidInvoices.reduce(
      (sum, inv) => sum + (Number(inv.grandTotal) - Number(inv.amountPaid)),
      0,
    );

    if (Number(dto.amount) > totalOutstanding) {
      throw new BadRequestException('Receipt amount exceeds outstanding balance');
    }

    const normalizedSplits = dto.splitPayments && dto.splitPayments.length > 0
      ? dto.splitPayments
      : [
          {
            paymentMethod: dto.paymentMethod,
            amount: dto.amount,
            accountId: dto.accountId,
            referenceNo: dto.referenceNo,
            chequeNo: dto.chequeNo,
            transactionId: dto.transactionId,
            clearanceDate: dto.clearanceDate,
            bankCharges: dto.bankCharges,
          }
        ];

    const sumSplits = normalizedSplits.reduce((sum, sp) => sum + Number(sp.amount), 0);
    if (Math.abs(sumSplits - Number(dto.amount)) > 0.01) {
      throw new BadRequestException('Sum of split payments must equal total receipt amount');
    }

    for (const split of normalizedSplits) {
      if (!split.accountId) {
        const isCash = split.paymentMethod === 'CASH';
        const ledgerName = isCash ? 'Cash' : 'Bank Accounts';
        let resolvedAccount = await this.prisma.account.findFirst({
          where: { companyId, name: ledgerName },
        });
        if (!resolvedAccount) {
          resolvedAccount = await this.prisma.account.create({
            data: { companyId, name: ledgerName, category: 'ASSET', subCategory: 'CURRENT_ASSET', balance: 0 },
          });
        }
        split.accountId = resolvedAccount.id;
      } else {
        const account = await this.prisma.account.findFirst({
          where: { id: split.accountId, companyId },
        });
        if (!account) {
          throw new NotFoundException(`Account with ID ${split.accountId} not found`);
        }
      }
    }

    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Generate receipt number
      const receiptNo = await this.sequenceService.generateNextSequence(companyId, 'RECEIPT', tx);

      // 2. Create Receipt record and Payments
      const receipt = await tx.receipt.create({
        data: {
          companyId,
          receiptNo,
          date: new Date(dto.date),
          businessPartnerId: dto.businessPartnerId,
          amount: dto.amount,
          currency: dto.currency || 'INR',
          exchangeRate: dto.exchangeRate || 1.0,
          receivedById: userId,
          status: 'COMPLETED',
          payments: {
            create: normalizedSplits.map(split => ({
              account: { connect: { id: split.accountId! } },
              paymentMethod: split.paymentMethod || 'CASH',
              amount: split.amount,
              referenceNo: split.referenceNo || null,
              chequeNo: split.chequeNo || null,
              transactionId: split.transactionId || null,
              clearanceDate: split.clearanceDate ? new Date(split.clearanceDate) : null,
              bankCharges: split.bankCharges || 0,
              notes: dto.notes || null
            }))
          }
        },
      });

      // 3. Invoice Allocation
      let remainingAmount = Number(dto.amount);

      if (dto.allocations && dto.allocations.length > 0) {
        // Manual allocation
        for (const alloc of dto.allocations) {
          const inv = await tx.invoice.findFirst({
            where: { id: alloc.invoiceId, companyId },
          });
          if (!inv) throw new NotFoundException(`Invoice with ID ${alloc.invoiceId} not found`);

          const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
          if (alloc.amount > unpaid) {
            throw new BadRequestException(`Allocation amount ${alloc.amount} exceeds unpaid invoice balance ${unpaid}`);
          }

          const newPaid = Number(inv.amountPaid) + alloc.amount;
          const status = newPaid >= Number(inv.grandTotal) ? 'PAID' : 'PARTIAL';

          await tx.invoice.update({
            where: { id: inv.id },
            data: { amountPaid: newPaid, status },
          });

          await tx.receiptAllocation.create({
            data: {
              receiptId: receipt.id,
              invoiceId: inv.id,
              amount: alloc.amount,
            },
          });
        }
      } else {
        // FIFO Auto allocation
        const invoices = await tx.invoice.findMany({
          where: {
            companyId,
            businessPartnerId: dto.businessPartnerId,
            NOT: { status: { in: ['PAID', 'DRAFT', 'CANCELLED'] } },
          },
          orderBy: { date: 'asc' },
        });

        for (const inv of invoices) {
          if (remainingAmount <= 0) break;

          const unpaid = Number(inv.grandTotal) - Number(inv.amountPaid);
          const allocate = Math.min(remainingAmount, unpaid);

          if (allocate > 0) {
            const newPaid = Number(inv.amountPaid) + allocate;
            const status = newPaid >= Number(inv.grandTotal) ? 'PAID' : 'PARTIAL';

            await tx.invoice.update({
              where: { id: inv.id },
              data: { amountPaid: newPaid, status },
            });

            await tx.receiptAllocation.create({
              data: {
                receiptId: receipt.id,
                invoiceId: inv.id,
                amount: allocate,
              },
            });

            remainingAmount -= allocate;
          }
        }
      }

      // 4. Update Customer Receivable balance
      await tx.businessPartner.update({
        where: { id: dto.businessPartnerId },
        data: {
          receivableBalance: {
            decrement: dto.amount,
          },
        },
      });

      // 5. Update Cash/Bank Account balances
      for (const split of normalizedSplits) {
        await tx.account.update({
          where: { id: split.accountId! },
          data: {
            balance: {
              increment: split.amount,
            },
          },
        });
      }

      // 6. Write Customer Statement
      await tx.customerStatement.create({
        data: {
          companyId,
          businessPartnerId: dto.businessPartnerId,
          date: new Date(dto.date),
          type: 'PAYMENT',
          reference: receiptNo,
          debit: 0,
          credit: dto.amount,
          balance: Number(customer.receivableBalance) - dto.amount,
        },
      });

      // 7. Write Double Entry Journal Post
      let arAccount = await tx.account.findFirst({
        where: { companyId, name: 'Accounts Receivable' },
      });
      if (!arAccount) {
        arAccount = await tx.account.create({
          data: { companyId, name: 'Accounts Receivable', category: 'ASSET', balance: 0 },
        });
      }

      const journalLines = [
        ...normalizedSplits.map(split => ({
          accountId: split.accountId!,
          debit: split.amount,
          credit: 0
        })),
        { accountId: arAccount.id, debit: 0, credit: dto.amount }
      ];

      await this.accountingEngine.postTransaction({
        companyId,
        date: new Date(dto.date),
        reference: receiptNo,
        description: `Automatic receipt posting ${receiptNo}`,
        lines: journalLines,
      }, tx);

      // Create Audit Log
      await tx.receiptAudit.create({
        data: {
          receiptId: receipt.id,
          userId,
          action: 'CREATE',
          details: JSON.parse(JSON.stringify({ dto })),
        },
      });

      return receipt;
    };

    if (txClient) {
      return execute(txClient);
    }
    return this.prisma.$transaction(execute, { timeout: 30000 });
  }

  async update(id: string, dto: UpdateReceiptDto, userId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const receipt = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.receipt.update({
        where: { id },
        data: {
          status: dto.status !== undefined ? dto.status : receipt.status,
        },
      });

      await tx.receiptAudit.create({
        data: {
          receiptId: id,
          userId,
          action: 'UPDATE',
          details: JSON.parse(JSON.stringify({ dto })),
        },
      });

      return updated;
    });
  }

  async remove(id: string, userId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const receipt = await this.findOne(id);
    if (receipt.deletedAt) {
      throw new BadRequestException('Receipt already deleted');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Revert Allocations on Invoices
      for (const alloc of receipt.allocations) {
        const inv = await tx.invoice.findFirst({
          where: { id: alloc.invoiceId, companyId },
        });

        if (inv) {
          const revertedPaid = Number(inv.amountPaid) - Number(alloc.amount);
          const status = revertedPaid <= 0 ? 'SENT' : 'PARTIAL'; // Set back to SENT or partial

          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              amountPaid: Math.max(0, revertedPaid),
              status,
            },
          });
        }
      }

      // 2. Revert Customer outstanding balance
      await tx.businessPartner.update({
        where: { id: receipt.businessPartnerId },
        data: {
          receivableBalance: {
            increment: receipt.amount,
          },
        },
      });

      // 3. Revert Cash/Bank Account balances
      for (const payment of receipt.payments) {
        await tx.account.update({
          where: { id: payment.accountId },
          data: {
            balance: {
              decrement: payment.amount,
            },
          },
        });
      }

      // 4. Revert Customer Statement (create contra entry or delete)
      await tx.customerStatement.create({
        data: {
          companyId,
          businessPartnerId: receipt.businessPartnerId,
          date: new Date(),
          type: 'REFUND',
          reference: `REV-${receipt.receiptNo}`,
          debit: receipt.amount,
          credit: 0,
          balance: Number(receipt.businessPartner.receivableBalance) + Number(receipt.amount),
        },
      });

      // 5. Revert General Ledger Journal entries using AccountingEngineService
      const originalEntries = await tx.journalEntry.findMany({
        where: { reference: receipt.receiptNo, companyId: receipt.companyId },
      });

      for (const entry of originalEntries) {
        await this.accountingEngine.reverseTransaction(entry.id, receipt.companyId, tx, `Reversal entry for receipt void ${receipt.receiptNo}`);
      }

      // Soft delete receipt
      await tx.receipt.update({
        where: { id },
        data: {
          status: 'VOID',
          deletedAt: new Date(),
        },
      });

      await tx.receiptAudit.create({
        data: {
          receiptId: id,
          userId,
          action: 'DELETE',
          details: { reason: 'Void Receipt' },
        },
      });

      return { success: true };
    }, { timeout: 30000 });
  }

  async createUnifiedSales(dto: any, userId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Invoice
      const invoiceDto = {
        customerId: dto.businessPartnerId,
        date: dto.date,
        invoiceType: 'TAX_INVOICE',
        placeOfSupply: dto.placeOfSupply || null,
        notes: dto.notes || null,
        items: dto.items.map((item: any) => ({
          productId: item.productId,
          qty: item.qty,
          rate: item.rate,
          taxPercent: item.taxPercent
        }))
      };
      
      const invoice = await this.invoicesService.create(invoiceDto, tx);

      // 2. If paid, create receipt allocation
      if (dto.paymentMethod !== 'CREDIT') {
        const receiptDto = {
          date: dto.date,
          businessPartnerId: dto.businessPartnerId,
          amount: Number(invoice.grandTotal),
          splitPayments: [
            {
              paymentMethod: dto.paymentMethod,
              amount: Number(invoice.grandTotal),
              accountId: dto.accountId,
              referenceNo: dto.referenceNo,
              chequeNo: dto.chequeNo,
              transactionId: dto.transactionId,
              clearanceDate: dto.clearanceDate,
              bankCharges: dto.bankCharges
            }
          ],
          cashier: dto.cashier,
          notes: dto.notes,
          allocations: [
            {
              invoiceId: invoice.id,
              amount: Number(invoice.grandTotal)
            }
          ]
        };

        await this.create(receiptDto, userId, tx);
      }

      return invoice;
    }, { timeout: 40000 });
  }

  async createUnifiedPurchase(dto: any, _userId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Purchase Bill
      const purchaseDto = {
        vendorId: dto.businessPartnerId,
        date: dto.date,
        reference: dto.referenceNo || null,
        placeOfSupply: dto.placeOfSupply || null,
        items: dto.items.map((item: any) => ({
          productId: item.productId,
          qty: item.qty,
          rate: item.rate,
          taxPercent: item.taxPercent
        }))
      };

      const purchase = await this.purchasesService.create(purchaseDto, tx);

      // 2. If paid, create purchase payment
      if (dto.paymentMethod !== 'CREDIT') {
        // Map payment method enum
        let method = 'BANK_TRANSFER';
        if (dto.paymentMethod === 'CASH') method = 'CASH';
        else if (dto.paymentMethod === 'UPI') method = 'UPI';
        else if (dto.paymentMethod === 'CHEQUE') method = 'CHEQUE';
        else if (dto.paymentMethod === 'CREDIT_CARD') method = 'CREDIT_CARD';

        const paymentDto = {
          vendorId: dto.businessPartnerId,
          purchaseId: purchase.id,
          bankAccountId: dto.accountId,
          date: dto.date,
          amount: Number(purchase.grandTotal),
          method: method as any,
          reference: dto.referenceNo || null
        };

        await this.purchasePaymentsService.create(paymentDto, tx);
      }

      return purchase;
    }, { timeout: 40000 });
  }

  async createUnifiedExpense(dto: any, userId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve default branch
      const defaultBranch = await tx.branch.findFirst({
        where: { companyId, isDefault: true }
      });
      const branchId = defaultBranch?.id || null;

      // 2. Create Expense claim (Net Amount becomes the base amount, tax is 0)
      const expenseDto = {
        categoryId: dto.categoryId,
        subCategory: undefined,
        date: dto.date,
        amount: Number(dto.amount),
        taxAmount: 0,
        paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
        paidFromType: (dto.paymentMethod === 'CASH' ? 'CASH' : 'BANK') as any,
        paidFromId: dto.accountId,
        bankAccountId: dto.paymentMethod !== 'CASH' ? dto.accountId : undefined,
        cashAccountId: dto.paymentMethod === 'CASH' ? dto.accountId : undefined,
        employeeId: undefined,
        vendorId: dto.businessPartnerId || null,
        billNumber: dto.referenceNo || null,
        description: dto.notes || null,
        notes: dto.notes || null,
        branchId
      };

      const expense = await this.expensesService.create(expenseDto, tx);

      // 3. Approve Expense immediately to post ledger entries
      await this.expensesService.updateApproval(expense.id, { approvalStatus: 'APPROVED' }, userId, tx);

      return expense;
    }, { timeout: 40000 });
  }

  async getNextNumber(type: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    let docType: string;
    let prefix: string;
    if (type === 'SALES') {
      docType = 'INVOICE';
      prefix = 'INV';
    } else if (type === 'PURCHASE') {
      docType = 'PURCHASE';
      prefix = 'PUR';
    } else if (type === 'EXPENSE') {
      docType = 'EXPENSE';
      prefix = 'EXP';
    } else {
      throw new BadRequestException('Invalid receipt type');
    }

    // Generate receipt number preview without actually consuming it
    // Wait, generateNextSequence actually consumes it!
    // Since this is a preview function, we should use getConfig.
    const config = await this.sequenceService.getConfig(companyId, docType);
    if (config) {
      const nextNumber = config.currentNumber + 1;
      return `${config.prefix || prefix + '-'}${String(nextNumber).padStart(config.padding || 5, '0')}`;
    }
    return `${prefix}-00001`;
  }

  async preview(dto: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const previewLines: { ledgerName: string; debit: number; credit: number }[] = [];
    const paymentMethod = dto.paymentMethod || 'CREDIT';
    
    let targetAccountName = 'Cash/Bank Account';
    if (dto.accountId) {
      const acc = await this.prisma.account.findFirst({
        where: { id: dto.accountId, companyId }
      });
      if (acc) targetAccountName = acc.name;
    }

    if (dto.type === 'SALES') {
      let subTotal = 0;
      let taxTotal = 0;
      if (dto.items && Array.isArray(dto.items)) {
        for (const item of dto.items) {
          const rate = Number(item.rate || 0);
          const qty = Number(item.qty || 0);
          const lineTotal = rate * qty;
          const taxRate = Number(item.taxPercent || 18);
          const taxAmount = (lineTotal * taxRate) / 100;
          subTotal += lineTotal;
          taxTotal += taxAmount;
        }
      }
      const grandTotal = subTotal + taxTotal;

      const debitAccount = paymentMethod === 'CREDIT' ? 'Accounts Receivable' : targetAccountName;
      previewLines.push({ ledgerName: debitAccount, debit: grandTotal, credit: 0 });
      previewLines.push({ ledgerName: 'Sales Revenue', debit: 0, credit: subTotal });

      if (taxTotal > 0) {
        previewLines.push({ ledgerName: 'Output GST', debit: 0, credit: taxTotal });
      }
    } else if (dto.type === 'PURCHASE') {
      let subTotal = 0;
      let taxTotal = 0;
      if (dto.items && Array.isArray(dto.items)) {
        for (const item of dto.items) {
          const rate = Number(item.rate || 0);
          const qty = Number(item.qty || 0);
          const lineTotal = rate * qty;
          const taxRate = Number(item.taxPercent || 18);
          const taxAmount = (lineTotal * taxRate) / 100;
          subTotal += lineTotal;
          taxTotal += taxAmount;
        }
      }
      const grandTotal = subTotal + taxTotal;

      let purchaseAccountName = 'Purchases';
      if (dto.accountId) {
        const acc = await this.prisma.account.findFirst({
          where: { id: dto.accountId, companyId }
        });
        if (acc) purchaseAccountName = acc.name;
      }
      previewLines.push({ ledgerName: purchaseAccountName, debit: subTotal, credit: 0 });

      if (taxTotal > 0) {
        previewLines.push({ ledgerName: 'Input GST', debit: taxTotal, credit: 0 });
      }

      const creditAccount = paymentMethod === 'CREDIT' ? 'Accounts Payable' : targetAccountName;
      previewLines.push({ ledgerName: creditAccount, debit: 0, credit: grandTotal });
    } else if (dto.type === 'EXPENSE') {
      const amount = Number(dto.amount || 0);
      const taxAmount = Number(dto.taxAmount || 0);
      const totalAmount = amount + taxAmount;

      let expenseAccountName = 'Expense Ledger';
      if (dto.categoryId) {
        const cat = await this.prisma.expenseCategory.findFirst({
          where: { id: dto.categoryId, companyId }
        });
        if (cat) {
          if (cat.accountId) {
            const acc = await this.prisma.account.findFirst({ where: { id: cat.accountId, companyId } });
            if (acc) expenseAccountName = acc.name;
          } else {
            expenseAccountName = cat.name;
          }
        }
      }

      previewLines.push({ ledgerName: expenseAccountName, debit: totalAmount, credit: 0 });

      const creditAccount = paymentMethod === 'CREDIT' ? 'Accounts Payable' : targetAccountName;
      previewLines.push({ ledgerName: creditAccount, debit: 0, credit: totalAmount });
    }

    return {
      success: true,
      data: {
        lines: previewLines
      }
    };
  }

  async findAllUnified(query: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const type = query.type; // 'SALES' | 'PURCHASE' | 'EXPENSE'
    const search = query.search || '';
    const status = query.status;
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const minAmount = query.minAmount ? Number(query.minAmount) : undefined;
    const maxAmount = query.maxAmount ? Number(query.maxAmount) : undefined;

    const unified: any[] = [];

    // 1. Fetch Sales Receipts (Receipt table)
    if (!type || type === 'SALES') {
      const sales = await this.prisma.receipt.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(status ? { status } : {}),
          ...(startDate || endDate ? {
            date: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            }
          } : {}),
          ...(minAmount || maxAmount ? {
            amount: {
              ...(minAmount ? { gte: minAmount } : {}),
              ...(maxAmount ? { lte: maxAmount } : {}),
            }
          } : {}),
        },
        include: {
          businessPartner: true,
          account: true,
        }
      });

      sales.forEach((s: any) => {
        unified.push({
          id: `SALES-${s.id}`,
          rawId: s.id,
          type: 'SALES',
          receiptNo: s.receiptNo,
          date: s.date,
          partyName: s.businessPartner?.name || 'N/A',
          paymentLedgerName: s.account?.name || 'N/A',
          expenseLedgerName: '—',
          amount: Number(s.amount),
          status: s.status,
          notes: s.notes || s.description || '—',
          createdBy: 'System'
        });
      });
    }

    // 2. Fetch Purchase Payments (TransactionPayment table)
    if (!type || type === 'PURCHASE') {
      const purchases = await this.prisma.transactionPayment.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(startDate || endDate ? {
            date: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            }
          } : {}),
          ...(minAmount || maxAmount ? {
            amount: {
              ...(minAmount ? { gte: minAmount } : {}),
              ...(maxAmount ? { lte: maxAmount } : {}),
            }
          } : {}),
        },
        include: {
          businessPartner: true,
          bankAccount: true,
        }
      });

      purchases.forEach((p: any) => {
        unified.push({
          id: `PURCHASE-${p.id}`,
          rawId: p.id,
          type: 'PURCHASE',
          receiptNo: p.paymentNo,
          date: p.date,
          partyName: p.businessPartner?.name || 'N/A',
          paymentLedgerName: p.bankAccount?.name || 'N/A',
          expenseLedgerName: '—',
          amount: Number(p.amount),
          status: p.deletedAt ? 'VOID' : 'COMPLETED',
          notes: p.notes || p.reference || '—',
          createdBy: 'System'
        });
      });
    }

    // 3. Fetch Expenses (Expense table)
    if (!type || type === 'EXPENSE') {
      const expenses = await this.prisma.expense.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'APPROVED',
          ...(startDate || endDate ? {
            date: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            }
          } : {}),
          ...(minAmount || maxAmount ? {
            amount: {
              ...(minAmount ? { gte: minAmount } : {}),
              ...(maxAmount ? { lte: maxAmount } : {}),
            }
          } : {}),
        },
        include: {
          category: true,
          bankAccount: true,
          cashAccount: true,
          vendor: true,
          employee: true,
        }
      });

      expenses.forEach((e: any) => {
        const paymentLedgerName = e.bankAccount?.name || e.cashAccount?.name || 'N/A';
        const partyName = e.vendor?.name || e.employee?.name || '—';
        unified.push({
          id: `EXPENSE-${e.id}`,
          rawId: e.id,
          type: 'EXPENSE',
          receiptNo: e.expenseNo,
          date: e.date,
          partyName,
          paymentLedgerName,
          expenseLedgerName: e.category?.name || 'N/A',
          amount: Number(e.amount),
          status: 'COMPLETED',
          notes: e.notes || e.description || '—',
          createdBy: 'System'
        });
      });
    }

    // Apply global text search in-memory
    let filtered = unified;
    if (search) {
      const q = search.toLowerCase();
      filtered = unified.filter((u: any) =>
        u.receiptNo.toLowerCase().includes(q) ||
        u.partyName.toLowerCase().includes(q) ||
        u.paymentLedgerName.toLowerCase().includes(q) ||
        u.expenseLedgerName.toLowerCase().includes(q) ||
        u.notes.toLowerCase().includes(q)
      );
    }

    // Sort by date desc
    filtered.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = filtered.length;
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }
}
